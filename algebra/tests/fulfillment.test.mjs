// Fulfillment provider layer: Valadio sandbox scenarios from the migration brief (no real order is ever sent).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../worker/src/index.js';
import { getOrder, priceCart, sweep, fulfill } from '../worker/src/orders.js';
import { providerFor, normaliseStatus, FulfillmentError } from '../worker/src/fulfillment/provider.js';
import { verifySignature, parseWebhook } from '../worker/src/fulfillment/valadio.js';
import { allVariants } from '../data/catalog.mjs';
import { memoryD1 } from './d1.mjs';
import { SCHEMA } from '../worker/src/schema.js';

const root = join(import.meta.dirname, '..');
const freshDb = () => { const d = memoryD1(null); for (const q of SCHEMA) d.raw.exec(q); return d; };
const SECRET = 'whsec_valadio_test';
const env = (extra = {}) => ({ DB: freshDb(), SITE_ORIGIN: 'https://algebra.test', SITE_MODE: 'preview', FULFILLMENT_PROVIDER: 'valadio', VALADIO_SANDBOX: 'true', VALADIO_WEBHOOK_SECRET: SECRET, MOCK_PAYMENTS: '1', ...extra });
const ctx = { waitUntil: () => {} };
const post = (path, data, headers = {}) => new Request(`https://algebra.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof data === 'string' ? data : JSON.stringify(data) });
const sku = (pred) => allVariants().find(pred).sku;
const POLO_M = sku((v) => v.productId === 'ALG-M-POLO' && v.size === 'M');
const POLO_L_BLACK = sku((v) => v.productId === 'ALG-M-POLO' && v.size === 'L' && v.color === 'black');
const POLO_W = sku((v) => v.productId === 'ALG-W-POLO');

async function hmac(secret, body) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function order(e, items, extra = {}) {
  const r = await worker.fetch(post('/api/checkout', { lang: 'de', country: 'DE', items, mockEmail: 'k@algebra.test', ...extra }), e, ctx);
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  const sid = new URL(j.url).searchParams.get('session_id');
  return e.DB.prepare('SELECT * FROM alg_orders WHERE stripe_session_id = ?').bind(sid).first();
}

test('without credentials Valadio runs as sandbox: polo men order is accepted, nothing real is sent', async () => {
  const e = env();
  assert.equal(providerFor(e).name, 'valadio-sandbox');
  const o = await order(e, [{ sku: POLO_M, qty: 1 }]);
  assert.equal(o.status, 'submitted');
  assert.match(o.supplier_order_id, /^SBX-ALG-/);
});

test('several sizes and colours in one order', async () => {
  const e = env();
  const o = await order(e, [{ sku: POLO_M, qty: 2 }, { sku: POLO_L_BLACK, qty: 1 }]);
  const items = JSON.parse(o.items_json);
  assert.equal(items.length, 2);
  assert.equal(items.reduce((s, i) => s + i.qty, 0), 3);
  assert.ok(items.every((i) => !('supplierArticleId' in i)), 'order lines carry Algebra SKUs only');
});

test('polo women (not confirmed yet) and unknown SKUs are refused at checkout', () => {
  assert.throws(() => priceCart({ country: 'DE', items: [{ sku: POLO_W, qty: 1 }] }), /NOT_PURCHASABLE/);
  assert.throws(() => priceCart({ country: 'DE', items: [{ sku: 'ALG-M-POLO-XXX-M', qty: 1 }] }), /UNKNOWN_SKU/);
});

test('live shop sells only variants with a confirmed supplier SKU', () => {
  assert.throws(() => priceCart({ country: 'DE', items: [{ sku: POLO_M, qty: 1 }] }, { live: true }), /NOT_PURCHASABLE/);
});

test('real Valadio mode refuses variants without a confirmed SKU (goes to the admin, not to production)', async () => {
  const e = env({ VALADIO_SANDBOX: 'false', VALADIO_API_BASE_URL: 'https://api.example', VALADIO_API_KEY: 'k' });
  const p = providerFor(e);
  assert.equal(p.name, 'valadio');
  const fake = { number: 'ALG-1', items_json: JSON.stringify([{ sku: POLO_M, qty: 1 }]), address_json: JSON.stringify({ line1: 'Weg 1', postal_code: '10115', city: 'Berlin', country: 'DE' }) };
  await assert.rejects(() => p.createOrder(fake), (err) => err instanceof FulfillmentError && err.kind === 'sku');
});

test('real Valadio mode never calls an undocumented endpoint', async () => {
  const p = providerFor(env({ VALADIO_SANDBOX: 'false', VALADIO_API_BASE_URL: 'https://api.example', VALADIO_API_KEY: 'k' }));
  await assert.rejects(() => p.getProducts(), (err) => err.kind === 'not_configured');
});

test('API down → retried, then fulfillment_failed; out of stock → needs_attention', async () => {
  const e = env();
  const o = await order(e, [{ sku: POLO_M, qty: 1 }], { mockAddress: { line1: 'test-api-down 1', postal_code: '10115', city: 'Berlin', country: 'DE' } });
  assert.equal(o.status, 'paid');
  const p = providerFor(e);
  for (let i = 0; i < 6; i++) await fulfill(e, await getOrder(e.DB, o.id), p);
  assert.equal((await getOrder(e.DB, o.id)).status, 'fulfillment_failed');
  const o2 = await order(e, [{ sku: POLO_M, qty: 1 }], { mockAddress: { line1: 'test-out-of-stock 1', postal_code: '10115', city: 'Berlin', country: 'DE' } });
  assert.equal(o2.status, 'needs_attention');
});

test('webhook: shipped with tracking, duplicate ignored, bad signature refused', async () => {
  const e = env();
  const o = await order(e, [{ sku: POLO_M, qty: 1 }]);
  const body = JSON.stringify({ id: 'evt_1', orderId: o.supplier_order_id, status: 'SHIPPED', trackingNumber: '00340434', trackingUrl: 'https://track.example/00340434', carrier: 'PPL' });
  const sig = await hmac(SECRET, body);
  const r1 = await worker.fetch(post('/api/webhooks/valadio', body, { 'x-valadio-signature': sig }), e, ctx);
  assert.equal(r1.status, 200);
  const after = await getOrder(e.DB, o.id);
  assert.equal(after.status, 'shipped');
  assert.equal(after.tracking_number, '00340434');
  const r2 = await worker.fetch(post('/api/webhooks/valadio', body, { 'x-valadio-signature': sig }), e, ctx);
  assert.equal((await r2.json()).duplicate, true);
  const bad = await worker.fetch(post('/api/webhooks/valadio', body, { 'x-valadio-signature': 'deadbeef' }), e, ctx);
  assert.equal(bad.status, 401);
  const noSecret = await worker.fetch(post('/api/webhooks/valadio', body, { 'x-valadio-signature': sig }), env({ VALADIO_WEBHOOK_SECRET: '' }), ctx);
  assert.equal(noSecret.status, 503);
  // the customer only ever sees Algebra statuses
  const look = await (await worker.fetch(post('/api/orders/lookup', { order: o.number, email: 'k@algebra.test' }), e, ctx)).json();
  assert.equal(look.status, 'shipped');
  assert.equal(JSON.stringify(look).includes('SHIPPED'), false);
});

test('sandbox sweep walks received → production → shipped → delivered', async () => {
  const e = env();
  const o = await order(e, [{ sku: POLO_M, qty: 1 }]);
  const p = providerFor(e);
  await sweep(e, p);
  assert.equal((await getOrder(e.DB, o.id)).status, 'in_production');
  await sweep(e, p);
  assert.equal((await getOrder(e.DB, o.id)).status, 'shipped');
  await sweep(e, p);
  assert.equal((await getOrder(e.DB, o.id)).status, 'delivered');
});

test('provider statuses are normalised to Algebra statuses', () => {
  assert.equal(normaliseStatus('in_production'), 'production');
  assert.equal(normaliseStatus('Printing'), 'production');
  assert.equal(normaliseStatus('dispatched'), 'shipped');
  assert.equal(normaliseStatus('DELIVERED'), 'delivered');
  assert.equal(normaliseStatus('canceled'), 'cancelled');
  assert.equal(normaliseStatus('on_hold'), 'error');
  assert.equal(normaliseStatus('new'), 'received');
  assert.equal(normaliseStatus('weird'), null);
  assert.equal(parseWebhook({ data: { order_id: 7, status: 'shipped', trackingNumber: 'X' } }).supplierOrderId, '7');
});

test('signature check accepts sha256=<hex> and rejects tampering', async () => {
  const body = '{"a":1}';
  const s = await hmac(SECRET, body);
  assert.equal(await verifySignature(SECRET, body, `sha256=${s}`), true);
  assert.equal(await verifySignature(SECRET, '{"a":2}', s), false);
});

test('the private mapping never reaches the storefront build', () => {
  for (const f of ['scripts/build.mjs', 'site/assets/app.js', 'site/i18n.mjs', 'site/content.mjs', 'data/catalog.mjs', 'data/copy.mjs']) {
    assert.doesNotMatch(readFileSync(join(root, f), 'utf8'), /(from|import)\s*\(?\s*['"][^'"]*fulfillment\/mapping/, f);
  }
});

// ---------------------------------------------------------------- security of supplier data
import { VALADIO, A61, isConfirmed as confirmedFor, mappingFor as mapFor } from '../worker/src/fulfillment/mapping.js';

test('/api/admin/fulfillment: 403 without token or with a wrong token, data only with the right token', async () => {
  const e = env({ ADMIN_TOKEN: 'a-long-admin-token-123' });
  const get = (h = {}) => worker.fetch(new Request('https://algebra.test/api/admin/fulfillment', { headers: h }), e, ctx);
  assert.equal((await get()).status, 403);
  assert.equal((await get({ authorization: 'Bearer wrong' })).status, 403);
  const noTokenEnv = await worker.fetch(new Request('https://algebra.test/api/admin/fulfillment', { headers: { authorization: 'Bearer ' } }), env({ ADMIN_TOKEN: '' }), ctx);
  assert.equal(noTokenEnv.status, 403, 'no ADMIN_TOKEN configured → closed');
  const ok = await get({ authorization: 'Bearer a-long-admin-token-123' });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  const j = await ok.json();
  assert.ok(j.valadio.length && j.a61Fallback.length);
});

test('public endpoints never return supplier data', async () => {
  const e = env();
  const health = await (await worker.fetch(new Request('https://algebra.test/api/health'), e, ctx)).text();
  assert.doesNotMatch(health, /sol['’]s|pasadena|0057|stanley|a61|valadio|cost/i);
  const o = await order(e, [{ sku: POLO_M, qty: 1 }]);
  const look = await (await worker.fetch(post('/api/orders/lookup', { order: o.number, email: 'k@algebra.test' }), e, ctx)).text();
  assert.doesNotMatch(look, /sol['’]s|pasadena|valadio|sandbox|SBX|supplier/i);
});

test('every supplier mapping is candidate (Valadio) or disabled (A61): nothing is confirmed yet', () => {
  for (const m of Object.values(VALADIO)) assert.ok(['candidate', 'pending_confirmation'].includes(m.status));
  for (const m of Object.values(A61)) assert.equal(m.status, 'disabled');
  for (const v of allVariants().filter((x) => x.purchasable)) {
    assert.equal(confirmedFor(v.sku), false, v.sku);
    assert.equal(confirmedFor(v.sku, 'a61'), false, v.sku);
  }
  assert.equal(mapFor(POLO_M).supplierProductId, '00577');
  assert.equal(mapFor(POLO_M).status, 'candidate');
});

test('A61 fallback is disabled: selectable, but refuses every real order', async () => {
  const p = providerFor({ FULFILLMENT_PROVIDER: 'a61' });
  assert.equal(p.name, 'a61');
  const fake = { number: 'ALG-2', items_json: JSON.stringify([{ sku: POLO_M, qty: 1 }]), address_json: '{}' };
  await assert.rejects(() => p.createOrder(fake), (err) => err instanceof FulfillmentError && err.kind === 'sku');
});

test('graphic tees: the design source is never sent, a print-master is required', async () => {
  const p = providerFor(env({ VALADIO_SANDBOX: 'false', VALADIO_API_BASE_URL: 'https://api.example', VALADIO_API_KEY: 'k' }));
  const g = allVariants().find((v) => v.productId.startsWith('ALG-G-') && v.purchasable);
  assert.equal(g.printFile.source.startsWith('design/prints/'), true);
  const fake = { number: 'ALG-3', items_json: JSON.stringify([{ sku: g.sku, qty: 1, printFile: g.printFile }]), address_json: JSON.stringify({ line1: 'Weg 1', postal_code: '10115', city: 'Berlin', country: 'DE' }) };
  await assert.rejects(() => p.createOrder(fake), (err) => ['sku', 'rejected'].includes(err.kind));
});

test('bags saved with the old The Crew SKU still work (now The Sweat)', () => {
  const sweat = allVariants().find((v) => v.productId === 'ALG-M-SWEAT' && v.size === 'M');
  const legacy = sweat.sku.replace('SWEAT', 'CREW');
  assert.equal(priceCart({ country: 'DE', items: [{ sku: legacy, qty: 1 }] }).lines[0].sku, sweat.sku);
});
