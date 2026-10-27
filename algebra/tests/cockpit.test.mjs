// Operating Cockpit: admin-only access, margin method, alerts, no financial or supplier data in the public build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../worker/src/index.js';
import { COST_MODEL, orderEconomics, sumEconomics, unitCost } from '../worker/src/cockpit/margin.js';
import { alertsOf, FILTERS, period } from '../worker/src/cockpit/api.js';
import { ASSUMPTIONS, unit } from '../scripts/economics.mjs';
import { productById, allVariants } from '../data/catalog.mjs';
import { memoryD1 } from './d1.mjs';
import { SCHEMA } from '../worker/src/schema.js';

const freshDb = () => { const d = memoryD1(null); for (const q of SCHEMA) d.raw.exec(q); return d; };
const TOKEN = 'cockpit-admin-token-0123456789';
const env = (extra = {}) => ({ DB: freshDb(), SITE_ORIGIN: 'https://algebra.test', SITE_MODE: 'preview', SUPPLIER_MODE: 'mock', ADMIN_TOKEN: TOKEN, STRIPE_WEBHOOK_SECRET: 'whsec_x', ...extra });
const ctx = { waitUntil: () => {} };
const get = (e, path, auth = `Bearer ${TOKEN}`) => worker.fetch(new Request(`https://algebra.test/api/admin/${path}`, { headers: auth ? { authorization: auth } : {} }), e, ctx);
const POLO = allVariants().find((v) => v.productId === 'ALG-M-POLO' && v.size === 'M').sku;

const order = (o = {}) => ({
  id: 'o1', number: 'ALG-261027-AAAA', status: 'submitted', lang: 'de', country: 'DE', email: 'a@b.de', name: 'A B',
  items_json: JSON.stringify([{ sku: POLO, qty: 1, price: 89, productId: 'ALG-M-POLO' }]), subtotal: 89, shipping: 4.9, total: 93.9,
  stripe_payment_intent: 'pi_1', supplier_order_id: 'sup_1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...o,
});
async function insert(db, o) {
  const cols = Object.keys(o);
  await db.prepare(`INSERT INTO alg_orders (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map((c) => o[c])).run();
}

test('cost model equals the one documented in docs/ECONOMICS.md (scripts/economics.mjs)', () => {
  assert.equal(COST_MODEL.paymentPct, ASSUMPTIONS.paymentPct);
  assert.equal(COST_MODEL.paymentFixed, ASSUMPTIONS.paymentFixed);
  assert.equal(COST_MODEL.neckLabelNet, ASSUMPTIONS.neckLabelNet);
});

test('margin: one polo to Germany under § 19 = economics contribution before the return provision', () => {
  const e = orderEconomics(order());
  const u = unit(productById('ALG-M-POLO'), null, 'K', 'DE');
  assert.equal(e.vat, 0);
  assert.equal(e.netSales, 93.9);
  assert.equal(e.estimate, true, 'reference costs are flagged');
  assert.equal(e.contribution, Math.round((u.contribution + u.returns) * 100) / 100);
  assert.equal(e.grossMargin, Math.round((93.9 - e.product - e.label) * 100) / 100);
});

test('margin: regular VAT, refunds, unproduced orders, real costs, unknown costs', () => {
  const v = orderEconomics(order(), { vatMode: 'regular' });
  assert.equal(v.vat, Math.round((93.9 - 93.9 / 1.19) * 100) / 100);
  const oss = orderEconomics(order({ country: 'FR', shipping: 7.9, total: 96.9 }), { vatMode: 'regular', vatOss: true });
  assert.equal(oss.vat, Math.round((96.9 - 96.9 / 1.2) * 100) / 100);
  const notMade = orderEconomics(order({ status: 'paid', supplier_order_id: null }));
  assert.equal(notMade.product, 0, 'nothing is paid to the supplier before production');
  assert.equal(notMade.shippingCost, 0);
  const refunded = orderEconomics(order({ status: 'refunded', supplier_order_id: null }));
  assert.equal(refunded.refunds, refunded.netSales);
  assert.ok(refunded.contribution < 0, 'the payment fee stays lost on a refund');
  const real = orderEconomics(order(), { costs: { supplier_cost: 30, shipping_cost: 6, payment_fee: 1.5, source: 'provider_invoice' } });
  assert.equal(real.estimate, false);
  assert.equal(real.contribution, Math.round((93.9 - 30 - real.label - 6 - 1.5) * 100) / 100);
  assert.equal(unitCost('ALG-W-POLO').net, null);
  const unknown = orderEconomics(order({ items_json: JSON.stringify([{ sku: 'ALG-W-POLO-DNV-M', qty: 1, price: 89, productId: 'ALG-W-POLO' }]) }));
  assert.equal(unknown.contribution, null, 'an unknown cost is never invented');
  assert.equal(sumEconomics([unknown, orderEconomics(order())]).contribution, null);
  assert.equal(orderEconomics(order({ status: 'pending_payment', stripe_payment_intent: null, supplier_order_id: null })).gross, 0, 'unpaid orders are not sales');
});

test('every cockpit view is admin only: 403 without or with a wrong token, 200 with the right one', async () => {
  const views = ['overview', 'orders', 'finance', 'products', 'graphic-series', 'inventory', 'customers', 'circle', 'analytics', 'alerts', 'fulfillment/status', 'settings', 'fulfillment'];
  const e = env();
  for (const v of views) {
    assert.equal((await get(e, v, null)).status, 403, `${v} without token`);
    assert.equal((await get(e, v, 'Bearer wrong')).status, 403, `${v} wrong token`);
    assert.equal((await get(e, v)).status, 200, `${v} with token`);
  }
  assert.equal((await get(env({ ADMIN_TOKEN: '' }), 'overview', 'Bearer ')).status, 403, 'no token configured = closed');
});

test('overview: real figures only, unavailable metrics are null with a reason', async () => {
  const e = env();
  await insert(e.DB, order());
  await insert(e.DB, order({ id: 'o2', number: 'ALG-261027-BBBB', status: 'pending_payment', stripe_payment_intent: null, supplier_order_id: null }));
  const d = await (await get(e, 'overview?range=30d')).json();
  assert.equal(d.business.revenue, 93.9);
  assert.equal(d.business.orders, 1);
  assert.equal(d.business.checkoutConversion, 50);
  assert.equal(d.business.conversion, null);
  assert.ok(d.business.conversionReason);
  assert.equal(d.business.estimate, true);
  assert.equal(d.operations.production, 1);
  assert.equal(d.circle.members, 0);
  const o = await (await get(e, 'orders/ALG-261027-AAAA')).json();
  assert.equal(o.economics.gross, 93.9);
});

test('alerts are actionable and catch intervention, missing tracking, negative margin and live risks', () => {
  const old = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  const mk = (o) => ({ ...order(o), econ: orderEconomics(order(o)) });
  const list = [
    mk({ number: 'N1', status: 'needs_attention', last_error: 'address' }),
    mk({ number: 'N2', status: 'shipped', tracking_number: null }),
    mk({ number: 'N3', status: 'paid', supplier_order_id: null, updated_at: old }),
  ];
  list.push({ ...order({ number: 'N4' }), econ: { ...orderEconomics(order()), contribution: -3 } });
  const codes = alertsOf(list, { STRIPE_WEBHOOK_SECRET: 'x' }).map((a) => `${a.code}:${a.ref || ''}`);
  for (const c of ['order_attention:N1', 'missing_tracking:N2', 'paid_not_submitted:N3', 'negative_margin:N4']) assert.ok(codes.includes(c), c);
  const live = alertsOf([], { SITE_MODE: 'live', STRIPE_WEBHOOK_SECRET: 'x' }).map((a) => a.code);
  assert.ok(live.includes('variant_not_confirmed') && live.includes('provider_sandbox') && live.includes('print_master_missing'));
  assert.ok(alertsOf([], {}).some((a) => a.code === 'webhook_missing'));
  assert.ok(alertsOf([], { STRIPE_WEBHOOK_SECRET: 'x' }).every((a) => a.action));
});

test('EU distance-sales threshold alert (§ 19): warning from 8,000 €, error from 10,000 € outside Germany', () => {
  const mk = (n, country, total) => { const o = order({ number: n, country, total, created_at: new Date().toISOString() }); return { ...o, econ: orderEconomics(o) }; };
  const warn = alertsOf([mk('E1', 'FR', 8500), mk('E2', 'DE', 50000)], { STRIPE_WEBHOOK_SECRET: 'x' }).find((a) => a.code === 'eu_distance_threshold');
  assert.equal(warn.level, 'warning');
  const err = alertsOf([mk('E1', 'FR', 6000), mk('E3', 'AT', 4500)], { STRIPE_WEBHOOK_SECRET: 'x' }).find((a) => a.code === 'eu_distance_threshold');
  assert.equal(err.level, 'error');
  assert.ok(!alertsOf([mk('E1', 'FR', 9000)], { STRIPE_WEBHOOK_SECRET: 'x', VAT_MODE: 'regular' }).some((a) => a.code === 'eu_distance_threshold'));
});

test('order filters and periods', () => {
  assert.ok(FILTERS.attention(order({ status: 'fulfillment_failed' })));
  assert.ok(FILTERS.attention(order({ status: 'shipped', tracking_number: null })));
  assert.ok(!FILTERS.attention(order()));
  const p = period(new URLSearchParams('range=custom&from=2026-10-01&to=2026-10-10'), new Date('2026-10-27T12:00:00Z'));
  assert.equal(p.from, '2026-10-01T00:00:00.000Z');
  assert.equal(p.to, '2026-10-10T23:59:59.000Z');
});

test('real costs can be recorded by the admin only, with a valid source', async () => {
  const e = env();
  await insert(e.DB, order());
  const post = (data, auth = `Bearer ${TOKEN}`) => worker.fetch(new Request('https://algebra.test/api/admin/orders/o1/costs', { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(data) }), e, ctx);
  assert.equal((await post({ productionCost: 25, source: 'manual' }, 'Bearer no')).status, 403);
  assert.equal((await post({ productionCost: -1, source: 'manual' })).status, 400);
  assert.equal((await post({ productionCost: 25, source: 'guess' })).status, 400);
  assert.equal((await post({ productionCost: 25, shippingCost: 6, paymentFee: 1.6, source: 'provider_invoice' })).status, 200);
  const o = await (await get(e, 'orders/o1')).json();
  assert.equal(o.economics.sources.product, 'provider_invoice');
});

test('no cost, margin or supplier data in the public build (shop + admin shell)', () => {
  const dist = join(import.meta.dirname, '..', 'dist');
  if (!existsSync(dist)) return;
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(join(d, x.name)) : [join(d, x.name)]));
  for (const f of walk(dist).filter((x) => /\.(html|js|json|css)$/.test(x))) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/legacy_reference|supplierCost|17\.06|valadio|\ba61\b/i.test(s), f);
  }
  const shell = readFileSync(join(dist, 'admin', 'index.html'), 'utf8');
  assert.match(shell, /noindex/);
  const headers = readFileSync(join(dist, '_headers'), 'utf8');
  assert.match(headers, /\/admin\/\*\n {2}X-Robots-Tag: noindex, nofollow\n {2}Cache-Control: no-store/);
});
