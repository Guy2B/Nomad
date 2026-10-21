import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NOMAD_MEMORY_STORE = '1';
const { priceCart, decodeCart, encodeCart, orderNumber, store, allowedOrigins } = await import('../engine/lib/catalog.mjs');
const { sessionPayload, verifySignature, formEncode } = await import('../engine/lib/stripe.mjs');
const { orderPayload, unmapped } = await import('../engine/lib/cj.mjs');
const { processPaidSession } = await import('../engine/lib/orders.mjs');
const { crm, listOrders, resetMemoryStore } = await import('../engine/lib/store.mjs');
const { default: checkout } = await import('../engine/functions/checkout.mjs');

const realFetch = globalThis.fetch;
let calls = [];
function mockFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
}
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

const paidSession = (over = {}) => ({
  id: 'cs_test_123',
  payment_status: 'paid',
  amount_total: 13980,
  currency: 'eur',
  invoice: 'in_123',
  metadata: { cart: 'vacuum-backpack:1,jewelry-roll:1', lang: 'de' },
  customer_details: { email: 'lea@example.com', name: 'Léa Muster', phone: '+49 151 000000' },
  collected_information: {
    shipping_details: {
      name: 'Léa Muster',
      address: { line1: 'Hauptstraße 1', line2: '', postal_code: '10115', city: 'Berlin', state: '', country: 'DE' },
    },
  },
  ...over,
});

beforeEach(() => {
  resetMemoryStore();
  globalThis.fetch = realFetch;
  for (const k of ['CJ_API_KEY', 'CJ_ACCESS_TOKEN', 'CJ_AUTO_PAY', 'NTFY_TOPIC']) delete process.env[k];
});

test('prices come from the catalogue only: inactive, unknown and absurd lines are dropped', () => {
  const r = priceCart([
    { id: 'vacuum-backpack', qty: 2, price: 1 },
    { id: 'vacuum-backpack', qty: 1 },
    { id: 'mini-steamer', qty: 1 }, // inactive until compliance
    { id: 'nope', qty: 1 },
    { id: 'jewelry-roll', qty: 999 },
  ]);
  assert.deepEqual(
    r.items.map((i) => [i.id, i.qty, i.unitCents]),
    [
      ['vacuum-backpack', 3, 9990],
      ['jewelry-roll', 9, 3990],
    ],
  );
  assert.equal(r.totalCents, 3 * 9990 + 9 * 3990);
  assert.deepEqual(decodeCart(encodeCart(r.items)), [
    { id: 'vacuum-backpack', qty: 3 },
    { id: 'jewelry-roll', qty: 9 },
  ]);
  assert.match(orderNumber('NM', new Date('2026-10-02T10:00:00Z'), () => 0.5), /^NM-261002-[A-Z0-9]{4}$/);
});

test('Stripe Checkout: server prices, shipping countries and an automatic §19 invoice', () => {
  const priced = priceCart([{ id: 'modular-toiletry', qty: 2 }]);
  const p = sessionPayload({ site: store('nomad').site, priced, lang: 'fr', baseUrl: 'https://shop.test', cart: 'modular-toiletry:2', images: {} });
  assert.equal(p.line_items[0].price_data.unit_amount, 4490);
  assert.equal(p.line_items[0].quantity, 2);
  assert.equal(p.invoice_creation.enabled, true);
  assert.match(p.invoice_creation.invoice_data.footer, /§ 19 UStG/);
  assert.ok(p.shipping_address_collection.allowed_countries.includes('DE'));
  assert.equal(p.phone_number_collection.enabled, true);
  assert.match(p.success_url, /^https:\/\/shop\.test\/fr\/danke\.html\?session=\{CHECKOUT_SESSION_ID\}$/);
  const form = formEncode(p);
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '4490');
  assert.equal(form.get('invoice_creation[enabled]'), 'true');
  assert.equal(form.get('metadata[store]'), 'nomad');
  assert.equal(form.get('allow_promotion_codes'), 'true');
  assert.match(form.get('custom_text[submit][message]'), /14 jours de rétractation/);
  assert.equal(form.get('invoice_creation[invoice_data][description]'), 'GO');
});

test('Stripe webhook signatures: valid accepted, tampered or stale refused', () => {
  const secret = 'whsec_test';
  const body = '{"type":"checkout.session.completed"}';
  const t = 1_800_000_000;
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  assert.equal(verifySignature(body, `t=${t},v1=${sig}`, secret, t + 10), true);
  assert.equal(verifySignature(body + ' ', `t=${t},v1=${sig}`, secret, t + 10), false);
  assert.equal(verifySignature(body, `t=${t},v1=${sig}`, secret, t + 3600), false);
  assert.equal(verifySignature(body, `t=${t},v1=${sig}`, 'other', t + 10), false);
});

test('CJ order: delivery address, origin, shipping method and products as CJ expects', () => {
  const order = {
    number: 'NM-261002-AB12',
    store: 'nomad',
    brand: 'GO',
    totalCents: 13980,
    items: priceCart([{ id: 'vacuum-backpack', qty: 1 }]).items,
    customer: { email: 'lea@example.com', phone: '+49' },
    shipping: { name: 'Léa', line1: 'Hauptstraße 1', line2: '', postalCode: '10115', city: 'Berlin', state: '', country: 'DE' },
  };
  const p = orderPayload(order, {});
  assert.equal(p.shippingCountryCode, 'DE');
  assert.equal(p.shippingCountry, 'Germany');
  assert.equal(p.shippingCustomerName, 'Léa');
  assert.equal(p.logisticName, 'YunExpress Sensitive');
  assert.equal(p.fromCountryCode, 'CN');
  assert.equal(p.payType, 3);
  assert.deepEqual(p.products[0], { sku: 'CJYD232914001AZ', quantity: 1, storeLineItemId: 'NM-261002-AB12-vacuum-backpack' });
  assert.equal(orderPayload(order, { CJ_AUTO_PAY: 'true' }).payType, 2);
});

test('paid order → CRM → supplier order, once even if Stripe sends the webhook twice', async () => {
  process.env.CJ_API_KEY = 'CJ123@api@abc';
  process.env.CJ_AUTO_PAY = 'true';
  process.env.NTFY_TOPIC = 'test-topic';
  mockFetch((url) => {
    if (url.includes('getAccessToken')) return jsonResponse({ data: { accessToken: 'tok', accessTokenExpiryDate: '2027-04-01T00:00:00Z' } });
    if (url.includes('createOrderV2')) return jsonResponse({ result: true, data: { orderId: 'CJ-777' } });
    if (url.includes('ntfy.sh')) return new Response('ok');
    return jsonResponse({}, 404);
  });
  const store = crm();
  const first = await processPaidSession(store, paidSession());
  assert.equal(first.order.status, 'supplier_ordered');
  assert.equal(first.order.supplier.orderId, 'CJ-777');
  assert.equal(first.order.attention, null);
  assert.equal(first.order.invoiceId, 'in_123');

  const sent = JSON.parse(calls.find((c) => c.url.includes('createOrderV2')).init.body);
  assert.equal(sent.shippingAddress, 'Hauptstraße 1');
  assert.equal(sent.shippingCity, 'Berlin');
  assert.equal(sent.products.length, 2);
  assert.ok(calls.some((c) => c.url.includes('ntfy.sh/test-topic')));

  const again = await processPaidSession(store, paidSession());
  assert.equal(again.duplicate, true);
  assert.equal(calls.filter((c) => c.url.includes('createOrderV2')).length, 1);

  const customer = await store.get('customers/lea@example.com', { type: 'json' });
  assert.equal(customer.orders.length, 1);
  assert.equal(customer.lifetimeCents, 13980);
  assert.equal((await listOrders(store)).length, 1);
});

test('without the CJ key, the order is kept and flagged for a human, not lost', async () => {
  mockFetch(() => new Response('ok'));
  const { order } = await processPaidSession(crm(), paidSession({ id: 'cs_test_456' }));
  assert.equal(order.status, 'needs_attention');
  assert.match(order.attention, /CJ_API_KEY/);
  assert.equal(order.customer.email, 'lea@example.com');
});

test('a CJ error flags the order with the reason', async () => {
  process.env.CJ_API_KEY = 'CJ123@api@abc';
  mockFetch((url) => {
    if (url.includes('getAccessToken')) return jsonResponse({ data: { accessToken: 'tok' } });
    if (url.includes('createOrderV2')) return jsonResponse({ result: false, message: 'Insufficient balance' });
    return new Response('ok');
  });
  const { order } = await processPaidSession(crm(), paidSession({ id: 'cs_test_789' }));
  assert.equal(order.status, 'needs_attention');
  assert.equal(order.attention, 'CJ: Insufficient balance');
});

const appartSession = (over = {}) =>
  paidSession({
    id: 'cs_test_ar1',
    amount_total: 3990 * 2 + 6990,
    metadata: { cart: 'kitchen-reset:2,laundry-reset:1', lang: 'fr', store: 'appart-reset' },
    ...over,
  });

test('second store: its own catalogue, prices and order prefix; carts never cross stores', () => {
  assert.deepEqual(priceCart([{ id: 'kitchen-reset', qty: 1 }], 'nomad').items, []);
  assert.deepEqual(priceCart([{ id: 'vacuum-backpack', qty: 1 }], 'appart-reset').items, []);
  assert.deepEqual(priceCart([{ id: 'kitchen-reset', qty: 1 }], 'nope').items, []);
  const r = priceCart([{ id: 'laundry-reset', qty: 1 }], 'appart-reset');
  assert.equal(r.totalCents, 6990);
  const p = sessionPayload({ site: store('appart-reset').site, priced: r, lang: 'de', baseUrl: 'https://ar.test', cart: 'laundry-reset:1', images: {} });
  assert.equal(p.metadata.store, 'appart-reset');
  assert.equal(p.invoice_creation.invoice_data.description, 'SPACE');
  assert.match(p.success_url, /^https:\/\/ar\.test\/de\/danke\.html/);
});

test('bundle → one CJ order with every part, quantities multiplied and identical parts merged', async () => {
  process.env.CJ_API_KEY = 'CJ123@api@abc';
  mockFetch((url) => {
    if (url.includes('getAccessToken')) return jsonResponse({ data: { accessToken: 'tok' } });
    if (url.includes('createOrderV2')) return jsonResponse({ result: true, data: { orderId: 'CJ-AR' } });
    return new Response('ok');
  });
  const { order } = await processPaidSession(crm(), appartSession());
  assert.equal(order.store, 'appart-reset');
  assert.match(order.number, /^SP-\d{6}-[A-Z0-9]{4}$/);
  assert.equal(order.status, 'supplier_ordered');
  const sent = JSON.parse(calls.find((c) => c.url.includes('createOrderV2')).init.body);
  const qty = Object.fromEntries(sent.products.map((x) => [x.sku, x.quantity]));
  // 2× Kitchen (1 rack + 4 hooks) + 1× Laundry (1 dryer + 1 bag + 4 hooks)
  assert.deepEqual(qty, {
    CJYD207339601AZ: 2,
    CJYD195271102BY: 2 * 4 + 4,
    'CJJJJTFZ00270-2 frames 80cm': 1,
    CJYD237778201AZ: 1,
  });
  assert.equal(sent.remark, 'SPACE');
  assert.ok(sent.products.every((x) => x.storeLineItemId.startsWith(order.number)));
});

test('a bundle with one unmapped part is flagged, not half-ordered', () => {
  const order = { store: 'appart-reset', items: [{ id: 'desk-reset', qty: 1 }] };
  assert.equal(unmapped(order).length, 0);
  const desk = store('appart-reset').byId.get('desk-reset');
  const saved = desk.components[1].supplier.cjSku;
  desk.components[1].supplier.cjSku = '';
  try {
    assert.equal(unmapped(order).length, 1);
  } finally {
    desk.components[1].supplier.cjSku = saved;
  }
});

test('the shared API answers the other storefronts (CORS) and refuses unknown origins', async () => {
  assert.ok(allowedOrigins({}).has('https://space.algbr.eu'));
  const pre = await checkout(new Request('https://api.algbr.eu/api/checkout', { method: 'OPTIONS', headers: { origin: 'https://space.algbr.eu' } }));
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), 'https://space.algbr.eu');
  const evil = await checkout(new Request('https://api.algbr.eu/api/checkout', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }));
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  const bad = await checkout(
    new Request('https://api.algbr.eu/api/checkout', {
      method: 'POST',
      headers: { origin: 'https://space.algbr.eu', 'content-type': 'application/json' },
      body: JSON.stringify({ store: 'nope', cart: [{ id: 'kitchen-reset', qty: 1 }] }),
    }),
  );
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { error: 'unknown-store' });
});

test('third store EASE: own prefix, 6-part bundle mapped, API open to its site', () => {
  const r = priceCart([{ id: 'full-body-care', qty: 1 }], 'body-care');
  assert.equal(r.totalCents, 9990);
  assert.equal(store('body-care').site.orderPrefix, 'EA');
  const order = { number: 'EA-261002-AB12', store: 'body-care', brand: 'EASE', totalCents: 9990, items: r.items, customer: { email: 'a@b.c' }, shipping: { country: 'DE', name: 'A', line1: 'x', city: 'y', postalCode: '1' } };
  assert.deepEqual(unmapped(order), []);
  assert.equal(orderPayload(order, {}).products.length, 6);
  assert.ok(allowedOrigins({}).has('https://ease.algbr.eu'));
});

test('JOY (Christmas): ships from the CJ Germany warehouse by DHL, one order per box, honest delivery time', () => {
  // Boxes with candle holders are withdrawn (GPSR): they can no longer be bought.
  assert.equal(priceCart([{ id: 'das-ganze-fest', qty: 1 }], 'joy').totalCents, 0);
  const r = priceCart([{ id: 'baum-und-sofa', qty: 1 }], 'joy');
  assert.equal(r.totalCents, 3490);
  assert.equal(r.shippingCents, 0);
  const s = store('joy').site;
  assert.equal(s.orderPrefix, 'JO');
  assert.deepEqual(s.shipping.countries, ['DE']);
  assert.equal(s.shipping.deliveryDays, '5–7');
  const order = { number: 'JO-261016-AB12', store: 'joy', brand: 'JOY', totalCents: 3490, items: r.items, customer: { email: 'a@b.c' }, shipping: { country: 'DE', name: 'A', line1: 'x', city: 'y', postalCode: '1' } };
  assert.deepEqual(unmapped(order), []);
  const payload = orderPayload(order, {});
  assert.equal(payload.products.length, 2);
  assert.equal(payload.fromCountryCode, 'DE');
  assert.equal(payload.logisticName, 'DHL DE to DE');
  for (const p of store('joy').products) {
    assert.ok(p.costCents < p.price, p.id);
    for (const c of p.components) assert.ok(c.supplier.cjVid && c.supplier.fromCountryCode === 'DE', c.key);
  }
  assert.ok(allowedOrigins({}).has('https://joy.algbr.eu'));
});

test('secondary .de domains are allowed origins too', () => {
  for (const o of ['https://go.algbr.de', 'https://space.algbr.de', 'https://ease.algbr.de']) assert.ok(allowedOrigins({}).has(o), o);
});

test('anonymous funnel: only our storefronts count, events add up, rates computed', async () => {
  const { parseEvent, recordEvent, funnel } = await import('../engine/lib/metrics.mjs');
  const blobs = crm();
  assert.equal(parseEvent('{"store":"nomad","type":"view"}', 'https://evil.example'), null);
  assert.equal(parseEvent('{"store":"nomad","type":"hack"}', 'https://go.algbr.eu'), null);
  assert.equal(parseEvent('not json', 'https://go.algbr.eu'), null);
  assert.deepEqual(parseEvent('{"store":"nomad","type":"product","product":"nope"}', 'https://go.algbr.eu'), { store: 'nomad', type: 'product', product: null });
  const now = new Date('2026-10-02T12:00:00Z');
  const ev = (type, product) => recordEvent(blobs, parseEvent(JSON.stringify({ store: 'nomad', type, product }), 'https://go.algbr.eu'), now);
  for (let i = 0; i < 10; i++) await ev('view');
  for (let i = 0; i < 4; i++) await ev('product', 'packing-cubes');
  await ev('add', 'packing-cubes');
  await ev('add', 'packing-cubes');
  await ev('checkout');
  const orders = [{ store: 'nomad', createdAt: now.toISOString(), totalCents: 2990, items: [{ id: 'packing-cubes', qty: 1 }] }];
  const f = await funnel(blobs, 'nomad', orders, 30, now);
  assert.deepEqual([f.view, f.product, f.add, f.checkout, f.orders], [10, 4, 2, 1, 1]);
  assert.equal(f.rates.addPerProduct, 50);
  assert.equal(f.rates.orderPerView, 10);
  assert.deepEqual(f.products['packing-cubes'], { product: 4, add: 2, sold: 1 });
});

test('reviews: only buyers of the product, once, moderated, private data never published', async () => {
  const { submitReview, moderate, publicReviews, pendingReviews, displayName } = await import('../engine/lib/reviews.mjs');
  const { saveOrder } = await import('../engine/lib/store.mjs');
  const blobs = crm();
  await saveOrder(blobs, { sessionId: 'cs_r1', number: 'GO-261002-REV1', store: 'nomad', createdAt: new Date().toISOString(), status: 'delivered', items: [{ id: 'packing-cubes', qty: 1 }], customer: { email: 'lea@example.com', name: 'Léa Muster' }, totalCents: 2990, supplier: {}, history: [] });
  const base = { order: 'go-261002-rev1', email: 'Lea@Example.com', product: 'packing-cubes', rating: 5, text: 'Tout rentre enfin dans ma valise.', consent: true };
  await assert.rejects(submitReview(blobs, { ...base, email: 'x@y.z' }), /order-not-found/);
  await assert.rejects(submitReview(blobs, { ...base, product: 'sleep-mask' }), /not-in-order/);
  await assert.rejects(submitReview(blobs, { ...base, consent: false }), /consent/);
  await assert.rejects(submitReview(blobs, { ...base, rating: 9 }), /bad-rating/);
  const r = await submitReview(blobs, base);
  assert.equal(r.name, 'Léa M.');
  await assert.rejects(submitReview(blobs, base), /already-reviewed/);
  assert.equal((await publicReviews(blobs, 'nomad', 'packing-cubes')).count, 0); // not before moderation
  await moderate(blobs, r.id, true);
  const pub = await publicReviews(blobs, 'nomad', 'packing-cubes');
  assert.equal(pub.count, 1);
  assert.equal(pub.average, 5);
  assert.equal(JSON.stringify(pub).includes('GO-261002-REV1'), false);
  assert.equal(JSON.stringify(pub).includes('lea@example.com'), false);
  assert.equal((await pendingReviews(blobs)).length, 0);
  assert.equal(displayName('jean'), 'jean');
});

test('Stripe test-mode payments are kept in the CRM but never sent to CJ', async () => {
  process.env.CJ_API_KEY = 'CJ123@api@abc';
  const calls = [];
  mockFetch((url) => {
    calls.push(url);
    return new Response('ok');
  });
  const { order } = await processPaidSession(crm(), paidSession({ id: 'cs_test_t1', livemode: false }));
  assert.equal(order.status, 'needs_attention');
  assert.match(order.attention, /test/);
  assert.ok(!calls.some((u) => String(u).includes('cjdropshipping')));
});

test('an address without a house number is flagged before reaching CJ', async () => {
  process.env.CJ_API_KEY = 'CJ123@api@abc';
  const calls = [];
  mockFetch((url) => {
    calls.push(url);
    return new Response('ok');
  });
  const session = paidSession({ id: 'cs_test_h1' });
  session.collected_information.shipping_details.address = { line1: 'Hauptstraße', line2: '', postal_code: '10115', city: 'Berlin', state: '', country: 'DE' };
  const { order } = await processPaidSession(crm(), session);
  assert.match(order.attention, /numéro de rue/i);
  assert.ok(!calls.some((u) => String(u).includes('cjdropshipping')));
});

test('GLOW and KIN: own prefixes, bundles priced and fully mapped to CJ, API open to their sites', () => {
  for (const [id, prefix, bundleId, cents, parts, origin] of [
    ['glow', 'GL', 'night-ritual', 4490, 3, 'https://glow.algbr.eu'],
    ['kin', 'KI', 'hair-control-system', 6990, 4, 'https://kin.algbr.eu'],
  ]) {
    const s = store(id);
    assert.equal(s.site.orderPrefix, prefix);
    assert.ok(s.products.filter((p) => p.active).length >= 10);
    const r = priceCart([{ id: bundleId, qty: 1 }], id);
    assert.equal(r.totalCents, cents);
    const order = { number: `${prefix}-261007-AB12`, store: id, brand: s.site.brand, totalCents: cents, items: r.items, customer: { email: 'a@b.c' }, shipping: { country: 'DE', name: 'A', line1: 'x 1', city: 'y', postalCode: '1' } };
    assert.deepEqual(unmapped(order), []);
    assert.equal(orderPayload(order, {}).products.length, parts);
    assert.ok(allowedOrigins({}).has(origin));
  }
});
