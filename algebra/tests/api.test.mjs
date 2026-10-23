import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import worker, { handleStripeWebhook } from '../worker/src/index.js';
import { canMove, priceCart, sweep, fulfill, getOrder, orderNumber } from '../worker/src/orders.js';
import { hmacHex, verifyStripeSignature } from '../worker/src/stripe.js';
import { mockSupplier } from '../worker/src/supplier.js';
import { allVariants } from '../data/catalog.mjs';
import { memoryD1 } from './d1.mjs';

const schema = join(import.meta.dirname, '..', 'worker', 'migrations', '0001_init.sql');
const env = (extra = {}) => ({ DB: memoryD1(schema), SITE_ORIGIN: 'https://algebra.test', SITE_MODE: 'preview', SUPPLIER_MODE: 'mock', ...extra });
const ctx = { waitUntil: () => {} };
const post = (path, data, headers = {}) => new Request(`https://algebra.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof data === 'string' ? data : JSON.stringify(data) });
const sku = (pred) => allVariants().find(pred).sku;
const POLO = sku((v) => v.productId === 'ALG-M-POLO' && v.size === 'M');
const TEE = sku((v) => v.productId === 'ALG-M-TEE' && v.size === 'L');
const BLOCKED = sku((v) => v.productId === 'ALG-W-POLO');

test('cart is priced from the catalogue, not from the browser', () => {
  const p = priceCart({ country: 'DE', items: [{ sku: POLO, qty: 1, price: 1 }] });
  assert.equal(p.subtotal, 89);
  assert.equal(p.shipping, 4.9);
  assert.equal(p.total, 93.9);
  const free = priceCart({ country: 'DE', items: [{ sku: POLO, qty: 1 }, { sku: TEE, qty: 1 }] });
  assert.equal(free.shipping, 0, 'free from 100 € in DE');
  const eu = priceCart({ country: 'FR', items: [{ sku: POLO, qty: 1 }, { sku: TEE, qty: 1 }] });
  assert.equal(eu.shipping, 7.9, 'EU threshold is 150 €');
});

test('bad carts are refused', () => {
  assert.throws(() => priceCart({ country: 'US', items: [{ sku: POLO, qty: 1 }] }), /BAD_COUNTRY/);
  assert.throws(() => priceCart({ country: 'DE', items: [{ sku: 'NOPE', qty: 1 }] }), /UNKNOWN_SKU/);
  assert.throws(() => priceCart({ country: 'DE', items: [{ sku: POLO, qty: 0 }] }), /BAD_ITEM/);
  assert.throws(() => priceCart({ country: 'DE', items: [{ sku: POLO, qty: 11 }] }), /BAD_ITEM/);
  assert.throws(() => priceCart({ country: 'DE', items: [{ sku: BLOCKED, qty: 1 }] }), /NOT_PURCHASABLE/);
  assert.throws(() => priceCart({ country: 'DE', items: [] }), /BAD_CART/);
});

test('checkout without Stripe key answers 503 NEEDS_CREDENTIALS', async () => {
  const r = await worker.fetch(post('/api/checkout', { lang: 'de', country: 'DE', items: [{ sku: POLO, qty: 1 }] }), env(), ctx);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, 'NEEDS_CREDENTIALS');
});

test('preview mode refuses a live Stripe key', async () => {
  const r = await worker.fetch(post('/api/checkout', { lang: 'de', country: 'DE', items: [{ sku: POLO, qty: 1 }] }), env({ STRIPE_SECRET_KEY: 'sk_live_x' }), ctx);
  assert.equal(r.status, 503);
});

test('mock checkout: paid → submitted to supplier → tracking → delivered', async () => {
  const e = env({ MOCK_PAYMENTS: '1' });
  const r = await worker.fetch(post('/api/checkout', { lang: 'en', country: 'DE', items: [{ sku: POLO, qty: 1 }], mockEmail: 'a@b.de' }), e, ctx);
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.match(j.url, /\/en\/order\/success\/\?session_id=mock_/);
  const sid = new URL(j.url).searchParams.get('session_id');
  const s = await (await worker.fetch(new Request(`https://algebra.test/api/orders/by-session/${sid}`), e, ctx)).json();
  assert.equal(s.status, 'submitted');
  assert.equal(s.total, 93.9);
  await sweep(e, mockSupplier()); // received → in_production
  await sweep(e, mockSupplier()); // → shipped with tracking
  const look = await (await worker.fetch(post('/api/orders/lookup', { order: s.number, email: 'A@B.de' }), e, ctx)).json();
  assert.equal(look.status, 'shipped');
  assert.match(look.trackingNumber, /^MOCK/);
  await sweep(e, mockSupplier());
  const done = await (await worker.fetch(post('/api/orders/lookup', { order: s.number, email: 'a@b.de' }), e, ctx)).json();
  assert.equal(done.status, 'delivered');
  const wrong = await worker.fetch(post('/api/orders/lookup', { order: s.number, email: 'x@b.de' }), e, ctx);
  assert.equal(wrong.status, 404, 'tracking needs the matching e-mail');
});

test('address error → needs_attention, supplier outage → retried then fulfillment_failed', async () => {
  const e = env({ MOCK_PAYMENTS: '1' });
  const a = await (await worker.fetch(post('/api/checkout', { lang: 'de', country: 'DE', items: [{ sku: POLO, qty: 1 }], mockAddress: { line1: '', postal_code: '', city: '', country: 'DE' } }), e, ctx)).json();
  const sa = await (await worker.fetch(new Request(`https://algebra.test/api/orders/by-session/${new URL(a.url).searchParams.get('session_id')}`), e, ctx)).json();
  assert.equal(sa.status, 'needs_attention');
  const b = await (await worker.fetch(post('/api/checkout', { lang: 'de', country: 'DE', items: [{ sku: POLO, qty: 1 }], mockAddress: { line1: 'test-api-down 1', postal_code: '1', city: 'X', country: 'DE' } }), e, ctx)).json();
  const sid = new URL(b.url).searchParams.get('session_id');
  let o = await e.DB.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').bind(sid).first();
  assert.equal(o.status, 'paid', 'stays paid for a retry');
  for (let i = 0; i < 5; i++) await sweep(e, mockSupplier());
  o = await getOrder(e.DB, o.id);
  assert.equal(o.status, 'fulfillment_failed');
});

test('nothing reaches the supplier before payment', async () => {
  const e = env();
  let called = 0;
  const spy = { ...mockSupplier(), name: 'spy', createOrder: async () => { called++; return { supplierOrderId: 'x', status: 'received' }; } };
  await e.DB.prepare("INSERT INTO orders (id, number, status, lang, country, items_json, subtotal, shipping, total, created_at, updated_at) VALUES ('o1','ALG-1','pending_payment','de','DE','[]',1,0,1,'2026','2026')").run();
  await fulfill(e, await getOrder(e.DB, 'o1'), spy);
  await sweep(e, spy);
  assert.equal(called, 0);
});

test('state machine refuses illegal jumps', () => {
  assert.equal(canMove('pending_payment', 'submitted'), false);
  assert.equal(canMove('paid', 'submitted'), true);
  assert.equal(canMove('delivered', 'paid'), false);
});

test('Stripe webhook: signature checked, paid order fulfilled once, duplicates ignored', async () => {
  const e = env({ STRIPE_WEBHOOK_SECRET: 'whsec_test' });
  await e.DB.prepare("INSERT INTO orders (id, number, status, lang, country, items_json, subtotal, shipping, total, stripe_session_id, created_at, updated_at) VALUES ('o2','ALG-2','pending_payment','de','DE',?,89,4.9,93.9,'cs_1','2026','2026')").bind(JSON.stringify([{ sku: POLO, qty: 1, supplierArticleId: 8757 }])).run();
  const evt = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1', metadata: { order_id: 'o2' }, payment_status: 'paid', amount_total: 9390, customer_details: { email: 'k@x.de' }, shipping_details: { name: 'K', address: { line1: 'Weg 1', postal_code: '1', city: 'B', country: 'DE' } } } } };
  const payload = JSON.stringify(evt);
  const t = Math.floor(Date.now() / 1000);
  const sig = `t=${t},v1=${await hmacHex('whsec_test', `${t}.${payload}`)}`;
  const bad = await handleStripeWebhook(post('/api/stripe/webhook', payload, { 'stripe-signature': `t=${t},v1=00` }), e);
  assert.equal(bad.status, 400);
  const ok = await handleStripeWebhook(post('/api/stripe/webhook', payload, { 'stripe-signature': sig }), e);
  assert.equal(ok.status, 200);
  assert.equal((await getOrder(e.DB, 'o2')).status, 'submitted');
  const dup = await (await handleStripeWebhook(post('/api/stripe/webhook', payload, { 'stripe-signature': sig }), e)).json();
  assert.equal(dup.duplicate, true);
  assert.equal(await verifyStripeSignature(payload, sig, 'whsec_test', Date.now() + 3600e3), false, 'old signatures expire');
});

test('amount mismatch holds the order for a human', async () => {
  const e = env({ STRIPE_WEBHOOK_SECRET: 's' });
  await e.DB.prepare("INSERT INTO orders (id, number, status, lang, country, items_json, subtotal, shipping, total, created_at, updated_at) VALUES ('o3','ALG-3','pending_payment','de','DE','[]',89,4.9,93.9,'2026','2026')").run();
  const payload = JSON.stringify({ id: 'evt_2', type: 'checkout.session.completed', data: { object: { id: 'cs_3', metadata: { order_id: 'o3' }, payment_status: 'paid', amount_total: 100, customer_details: {} } } });
  const t = Math.floor(Date.now() / 1000);
  await handleStripeWebhook(post('/api/stripe/webhook', payload, { 'stripe-signature': `t=${t},v1=${await hmacHex('s', `${t}.${payload}`)}` }), e);
  assert.equal((await getOrder(e.DB, 'o3')).status, 'needs_attention');
});

test('refund before production cancels at the supplier and marks refunded', async () => {
  const e = env({ STRIPE_WEBHOOK_SECRET: 's', MOCK_PAYMENTS: '1' });
  const j = await (await worker.fetch(post('/api/checkout', { lang: 'de', country: 'DE', items: [{ sku: TEE, qty: 2 }] }), e, ctx)).json();
  const o = await e.DB.prepare('SELECT * FROM orders WHERE number = ?').bind(j.number).first();
  const payload = JSON.stringify({ id: 'evt_3', type: 'charge.refunded', data: { object: { refunded: true, metadata: { order_id: o.id } } } });
  const t = Math.floor(Date.now() / 1000);
  await handleStripeWebhook(post('/api/stripe/webhook', payload, { 'stripe-signature': `t=${t},v1=${await hmacHex('s', `${t}.${payload}`)}` }), e);
  assert.equal((await getOrder(e.DB, o.id)).status, 'refunded');
});

test('newsletter is double opt-in', async () => {
  const e = env();
  const r = await worker.fetch(post('/api/newsletter', { email: 'n@x.de', lang: 'fr' }), e, ctx);
  assert.equal(r.status, 200);
  const s = await e.DB.prepare('SELECT * FROM subscribers').first();
  assert.equal(s.status, 'pending');
  const c = await worker.fetch(new Request(`https://algebra.test/api/newsletter/confirm?token=${s.token}`), e, ctx);
  assert.equal(c.status, 302);
  assert.equal((await e.DB.prepare('SELECT status FROM subscribers').first()).status, 'confirmed');
  const bad = await worker.fetch(post('/api/newsletter', { email: 'nope' }), e, ctx);
  assert.equal(bad.status, 400);
});

test('admin routes need the token', async () => {
  const r = await worker.fetch(new Request('https://algebra.test/api/admin/orders'), env({ ADMIN_TOKEN: 't' }), ctx);
  assert.equal(r.status, 403);
  const ok = await worker.fetch(new Request('https://algebra.test/api/admin/orders', { headers: { authorization: 'Bearer t' } }), env({ ADMIN_TOKEN: 't' }), ctx);
  assert.equal(ok.status, 200);
});

test('order numbers look like ALG-YYMMDD-XXXX', () => {
  assert.match(orderNumber(new Date('2026-10-22T10:00:00Z'), 12345), /^ALG-261022-[0-9A-Z]{4}$/);
});
