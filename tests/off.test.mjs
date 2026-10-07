import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.NOMAD_MEMORY_STORE = '1';
const { OffError, productFromInput, offSessionPayload, offItems, useOff, checkout, createRequest } = await import('../netlify/lib/off.mjs');
const { processPaidSession } = await import('../netlify/lib/orders.mjs');
const { crm, resetMemoryStore } = await import('../netlify/lib/store.mjs');

/** Minimal D1 double: records SQL and returns scripted results. */
function fakeDb(script = {}) {
  const calls = [];
  const db = {
    calls,
    batch: async () => [],
    prepare(sql) {
      const stmt = (args) => ({
        run: async () => {
          calls.push(['run', sql, args]);
          return { meta: { changes: script.changes ?? 1 } };
        },
        first: async () => {
          calls.push(['first', sql, args]);
          return typeof script.first === 'function' ? script.first(sql, args) : (script.first ?? null);
        },
        all: async () => ({ results: [] }),
      });
      return { bind: (...args) => stmt(args), ...stmt([]) };
    },
  };
  return db;
}

const piece = {
  id: 'p1',
  slug: 'timberland-cedar-bay-light-brown-tb0a2r35em8-eu45',
  status: 'live',
  brand: 'Timberland',
  name: 'Cedar Bay Essential Boat Shoe',
  ref: 'TB0A2R35EM8',
  color: 'Light Brown',
  size_eu: '45',
  price_cents: 7900,
  stock: 1,
  images_json: '["/media/p/tb/1.webp"]',
};

beforeEach(() => {
  resetMemoryStore();
  useOff({});
});

test('admin input: euros to cents, slug, only our own /media photos, required fields enforced', () => {
  const p = productFromInput({ brand: 'Timberland', name: 'Cedar Bay', ref: 'tb0a2r35em8', color: 'Light Brown', sizeEU: '45', price: '79,00', rrp: '150', purchasePrice: '30', images: ['/media/p/x/1.webp', 'https://evil.example/x.jpg', 'javascript:alert(1)'] });
  assert.equal(p.price_cents, 7900);
  assert.equal(p.rrp_cents, 15000);
  assert.equal(p.purchase_cents, 3000);
  assert.equal(p.ref, 'TB0A2R35EM8');
  assert.equal(p.slug, 'timberland-cedar-bay-light-brown-tb0a2r35em8-eu45');
  assert.deepEqual(JSON.parse(p.images_json), ['/media/p/x/1.webp']);
  assert.throws(() => productFromInput({ brand: 'X', name: '', ref: 'R', price: 10 }), OffError);
});

test('Stripe session: one piece, Hermes 5,79 € to Germany, 30-minute expiry, item described in metadata', () => {
  const s = offSessionPayload(piece, 'de', 'https://off.algbr.eu', 1_000_000_000_000);
  assert.equal(s.line_items[0].price_data.unit_amount, 7900);
  assert.match(s.line_items[0].price_data.product_data.name, /EU 45/);
  assert.deepEqual(s.line_items[0].price_data.product_data.images, ['https://off.algbr.eu/media/p/tb/1.webp']);
  assert.deepEqual(s.shipping_address_collection.allowed_countries, ['DE']);
  assert.equal(s.shipping_options[0].shipping_rate_data.fixed_amount.amount, 579);
  assert.equal(s.expires_at, 1_000_000_000 + 30 * 60);
  assert.equal(s.metadata.store, 'off');
  assert.equal(offItems({ metadata: s.metadata })[0].id, 'p1');
});

test('checkout refuses a piece already reserved or sold, without calling Stripe', async () => {
  const realFetch = globalThis.fetch;
  let stripeCalls = 0;
  globalThis.fetch = async () => {
    stripeCalls++;
    return new Response('{}');
  };
  try {
    useOff({ db: fakeDb({ changes: 0, first: { status: 'live', stock: 1 } }) });
    await assert.rejects(checkout('p1', 'de'), (e) => e.message === 'reserved' && e.status === 409);
    useOff({ db: fakeDb({ changes: 0, first: { status: 'sold', stock: 0 } }) });
    await assert.rejects(checkout('p1', 'de'), (e) => e.message === 'sold');
    assert.equal(stripeCalls, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('paid OFF session → CRM order OF-…, piece marked sold, flagged to ship by hand (never sent to CJ)', async () => {
  const db = fakeDb();
  useOff({ db });
  process.env.CJ_API_KEY = 'CJ123@api@abc';
  const realFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (u) => {
    urls.push(String(u));
    return new Response('ok');
  };
  try {
    const item = { id: 'p1', ref: 'TB0A2R35EM8', name: 'Timberland Cedar Bay · Light Brown', size: '45', priceCents: 7900 };
    const { order } = await processPaidSession(crm(), {
      id: 'cs_test_off1',
      payment_status: 'paid',
      amount_total: 8479,
      currency: 'eur',
      metadata: { store: 'off', lang: 'de', item: JSON.stringify(item) },
      customer_details: { email: 'a@b.de', name: 'A B' },
      collected_information: { shipping_details: { name: 'A B', address: { line1: 'Hauptstr. 1', postal_code: '10115', city: 'Berlin', country: 'DE' } } },
    });
    assert.match(order.number, /^OF-\d{6}-[A-Z0-9]{4}$/);
    assert.equal(order.store, 'off');
    assert.equal(order.totalCents, 8479);
    assert.match(order.attention, /Hermes/);
    assert.ok(db.calls.some(([k, sql, args]) => k === 'run' && /stock - \?/.test(sql) && args.includes('p1')));
    assert.ok(!urls.some((u) => u.includes('cjdropshipping')));
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.CJ_API_KEY;
  }
});

test('private sourcing: bots (honeypot) ignored, e-mail required', async () => {
  useOff({ db: fakeDb() });
  assert.deepEqual(await createRequest({ website: 'spam', email: 'x' }), { ok: true });
  await assert.rejects(createRequest({ email: 'not-an-email' }), OffError);
  assert.equal((await createRequest({ email: 'a@b.de', sizeEU: '45', maxBudget: '90' })).ok, true);
});
