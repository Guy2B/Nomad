import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NOMAD_MEMORY_STORE = '1';
process.env.ADMIN_PASSWORD = 'test-admin-password-123';
const { processPaidSession } = await import('../engine/lib/orders.mjs');
const { crm, getOrder, resetMemoryStore, saveOrder } = await import('../engine/lib/store.mjs');
const { testOutbox, resetOutbox } = await import('../engine/lib/mail.mjs');
const { addressToken, afterSale, MAILS_SINCE } = await import('../engine/lib/aftersale.mjs');
const { customerEmail, carrierUrl } = await import('../engine/lib/emails.mjs');
const { default: cjSync } = await import('../engine/functions/cj-sync.mjs');
const { default: address } = await import('../engine/functions/address.mjs');
const { default: admin } = await import('../engine/functions/admin.mjs');
const { default: webhook } = await import('../engine/functions/stripe-webhook.mjs');

const realFetch = globalThis.fetch;
const DAY = 86_400_000;
let calls = [];
let cj = { status: 'UNSHIPPED', trackNumber: null };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function mock() {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    url = String(url);
    calls.push({ url, init });
    if (url.includes('getAccessToken')) return json({ data: { accessToken: 'tok', accessTokenExpiryDate: '2030-01-01' } });
    if (url.includes('createOrderV2')) return json({ result: true, data: { orderId: 'CJ-1' } });
    if (url.includes('getOrderDetail'))
      return json({ data: { orderStatus: cj.status, trackNumber: cj.trackNumber, logisticName: cj.logistic ?? 'CJPacket' } });
    if (url.includes('/v1/refunds')) return json({ id: 're_1', amount: 6990 });
    if (url.includes('/v1/checkout/sessions?payment_intent=')) return json({ data: [{ id: 'cs_live_joy' }] });
    if (url.includes('/v1/disputes/')) return json({ id: 'dp_1' });
    if (url.includes('ntfy.sh')) return new Response('ok');
    return json({ error: 'unexpected ' + url }, 500);
  };
}
const notifications = () => calls.filter((c) => c.url.includes('ntfy.sh')).map((c) => ({ title: c.init.headers.Title, body: c.init.body, priority: c.init.headers.Priority, click: c.init.headers.Click }));

const session = (over = {}) => ({
  id: 'cs_live_joy',
  livemode: true,
  payment_status: 'paid',
  payment_intent: 'pi_joy',
  amount_total: 6990,
  currency: 'eur',
  metadata: { cart: 'das-ganze-fest:1', lang: 'de', store: 'joy' },
  customer_details: { email: 'anna@example.com', name: 'Anna Schmidt', phone: '+49 151 1' },
  collected_information: {
    shipping_details: { name: 'Anna Schmidt', address: { line1: 'Lindenweg 4', line2: '', postal_code: '60311', city: 'Frankfurt', state: '', country: 'DE' } },
  },
  ...over,
});

beforeEach(() => {
  resetMemoryStore();
  resetOutbox();
  globalThis.fetch = realFetch;
  cj = { status: 'UNSHIPPED', trackNumber: null };
  process.env.CJ_API_KEY = 'k';
  process.env.NTFY_TOPIC = 'algbr-test';
  delete process.env.CJ_AUTO_PAY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

test('address without house number: customer gets a signed link, fixes it, the order goes to CJ by itself', async () => {
  mock();
  const s = session({
    collected_information: { shipping_details: { name: 'Anna Schmidt', address: { line1: 'Lindenweg', line2: '', postal_code: '60311', city: 'Frankfurt', country: 'DE' } } },
  });
  const { order } = await processPaidSession(crm(), s);
  assert.equal(order.issue, 'address');
  assert.match(order.attention, /e-mail envoyé au client/);
  assert.ok(!calls.some((c) => c.url.includes('createOrderV2')), 'nothing sent to CJ yet');
  const mail = testOutbox().find((m) => m.subject.includes('Lieferadresse'));
  assert.ok(mail, 'address e-mail sent');
  assert.equal(mail.to, 'anna@example.com');
  assert.match(mail.from, /^JOY <service@algbr\.eu>$/);
  const link = mail.html.match(/href="([^"]+\/api\/address[^"]+)"/)[1].replace(/&amp;/g, '&');
  assert.ok(link.startsWith('https://api.algbr.eu/api/address?o=cs_live_joy&t='));

  // A forged token is refused.
  const bad = await address(new Request('https://api.algbr.eu/api/address?o=cs_live_joy&t=' + 'a'.repeat(32)));
  assert.equal(bad.status, 404);
  const form = await address(new Request(link));
  assert.equal(form.status, 200);
  assert.match(await form.text(), /Straße und Hausnummer/);
  const post = (body) => address(new Request(link, { method: 'POST', body: new URLSearchParams(body), headers: { 'content-type': 'application/x-www-form-urlencoded' } }));
  assert.equal((await post({ line1: 'Lindenweg', zip: '60311', city: 'Frankfurt' })).status, 400);
  const ok = await post({ line1: 'Lindenweg 4', line2: '', zip: '60311', city: 'Frankfurt' });
  assert.equal(ok.status, 200);
  const saved = await getOrder(crm(), 'cs_live_joy');
  assert.equal(saved.shipping.line1, 'Lindenweg 4');
  assert.equal(saved.status, 'supplier_ordered');
  assert.equal(saved.supplier.orderId, 'CJ-1');
  assert.equal(saved.issue, 'pay', 'without CJ_AUTO_PAY the owner still pays in CJ');
  assert.ok(notifications().some((n) => /Adresse completee/.test(n.title)));
  // The link cannot be replayed to change the address again.
  assert.match(await (await address(new Request(link))).text(), /bereits vollständig/);
});

test('shipped and delivered e-mails go out once, with the DHL link for the German warehouse, then the review request', async () => {
  mock();
  process.env.CJ_AUTO_PAY = 'true';
  await processPaidSession(crm(), session());
  const t0 = new Date();
  cj = { status: 'SHIPPED', trackNumber: '00340434', logistic: 'DHL DE to DE' };
  await cjSync(t0);
  let o = await getOrder(crm(), 'cs_live_joy');
  assert.equal(o.status, 'shipped');
  const shipped = testOutbox().filter((m) => m.subject.includes('unterwegs'));
  assert.equal(shipped.length, 1);
  assert.match(shipped[0].html, /dhl\.de\/de\/privatkunden\/dhl-sendungsverfolgung\.html\?piececode=00340434/);
  assert.match(shipped[0].text, /Sendungsnummer 00340434/);
  await cjSync(t0); // second run: nothing new
  assert.equal(testOutbox().filter((m) => m.subject.includes('unterwegs')).length, 1);

  cj.status = 'DELIVERED';
  const t1 = new Date(t0.getTime() + 2 * DAY);
  await cjSync(t1);
  assert.equal(testOutbox().filter((m) => m.subject.includes('zugestellt')).length, 1);
  assert.equal(testOutbox().filter((m) => m.subject.startsWith('Wie gefällt')).length, 0, 'no review request on delivery day');
  await cjSync(new Date(t1.getTime() + 5 * DAY + 1000));
  const review = testOutbox().filter((m) => m.subject.startsWith('Wie gefällt'));
  assert.equal(review.length, 1);
  assert.match(review[0].html, /joy\.algbr\.eu\/de\/bewertung\.html\?p=das-ganze-fest&amp;o=JO-\d{6}-[A-Z0-9]{4}&amp;e=anna%40example\.com/);
  o = await getOrder(crm(), 'cs_live_joy');
  assert.deepEqual(Object.keys(o.mails).sort(), ['delivered', 'review', 'shipped']);
});

test('watchdogs: unpaid CJ order reminded after 3 h, nothing shipped after 4 days (JOY) raises a late alert once', async () => {
  mock();
  await processPaidSession(crm(), session());
  const created = Date.parse((await getOrder(crm(), 'cs_live_joy')).createdAt);
  cj = { status: 'UNPAID', trackNumber: null };
  await cjSync(new Date(created + 1 * 3_600_000));
  assert.ok(!notifications().some((n) => /A payer/.test(n.title)), 'not before 3 hours');
  await cjSync(new Date(created + 4 * 3_600_000));
  assert.equal(notifications().filter((n) => /A payer dans CJ/.test(n.title)).length, 1);
  await cjSync(new Date(created + 5 * 3_600_000));
  assert.equal(notifications().filter((n) => /A payer dans CJ/.test(n.title)).length, 1, 'reminded once');

  await cjSync(new Date(created + 4 * DAY + 60_000));
  const late = notifications().filter((n) => /Retard/.test(n.title));
  assert.equal(late.length, 1);
  assert.equal(late[0].priority, 'high');
  await cjSync(new Date(created + 5 * DAY));
  assert.equal(notifications().filter((n) => /Retard/.test(n.title)).length, 1);

  // Once it ships, the flags disappear by themselves.
  cj = { status: 'SHIPPED', trackNumber: 'X1', logistic: 'DHL DE to DE' };
  await cjSync(new Date(created + 5 * DAY + 3_600_000));
  const o = await getOrder(crm(), 'cs_live_joy');
  assert.equal(o.attention, null);
  assert.equal(o.issue, null);
});

test('China stores wait 7 days before the late alert; test-mode and old orders are left alone', async () => {
  const base = { number: 'GO-261016-AAAA', store: 'nomad', brand: 'GO', sessionId: 'cs_x', lang: 'de', status: 'supplier_ordered', items: [{ id: 'vacuum-backpack', name: 'Rucksack', qty: 1 }], totalCents: 9990, customer: { email: 'a@b.de', name: 'A' }, shipping: { city: 'Köln', country: 'DE' }, supplier: { orderId: 'CJ', status: 'UNSHIPPED', trackNumber: null }, history: [], attention: null };
  mock();
  const created = Date.now();
  const o = { ...base, createdAt: new Date(created).toISOString() };
  assert.equal(await afterSale(o, new Date(created + 5 * DAY)), false);
  assert.equal(await afterSale(o, new Date(created + 7 * DAY + 1)), true);
  assert.equal(o.issue, 'late');
  const testOrder = { ...base, test: true, createdAt: new Date(created).toISOString(), history: [] };
  assert.equal(await afterSale(testOrder, new Date(created + 30 * DAY)), false);
  // Shipped before the e-mails existed: never mailed retroactively.
  const old = { ...base, status: 'delivered', deliveredAt: '2026-09-01T00:00:00Z', supplier: { trackNumber: 'T' }, createdAt: new Date(MAILS_SINCE - DAY).toISOString(), history: [] };
  await afterSale(old, new Date());
  assert.equal(testOutbox().length, 0);
});

test('refund in one click from the admin: Stripe refund, order cancelled, apology e-mail in the customer language', async () => {
  mock();
  await processPaidSession(crm(), session({ metadata: { cart: 'das-ganze-fest:1', lang: 'fr', store: 'joy' } }));
  const res = await admin(
    new Request('https://api.algbr.eu/api/admin', {
      method: 'POST',
      headers: { authorization: 'Bearer test-admin-password-123' },
      body: JSON.stringify({ action: 'refund', sessionId: 'cs_live_joy' }),
    }),
  );
  assert.equal(res.status, 200);
  const refund = calls.find((c) => c.url.endsWith('/v1/refunds'));
  assert.match(String(refund.init.body), /payment_intent=pi_joy/);
  const o = await getOrder(crm(), 'cs_live_joy');
  assert.equal(o.status, 'cancelled');
  assert.equal(o.refund.id, 're_1');
  const mail = testOutbox().find((m) => m.subject.includes('remboursement intégral'));
  assert.ok(mail);
  assert.match(mail.text, /69,90 €/);
  // A second click does not refund twice.
  await admin(new Request('https://api.algbr.eu/api/admin', { method: 'POST', headers: { authorization: 'Bearer test-admin-password-123' }, body: JSON.stringify({ action: 'refund', sessionId: 'cs_live_joy' }) }));
  assert.equal(calls.filter((c) => c.url.endsWith('/v1/refunds')).length, 1);
});

test('dispute opened: urgent alert and evidence pre-filled in Stripe with the tracking number (draft, not submitted)', async () => {
  mock();
  process.env.CJ_AUTO_PAY = 'true';
  await processPaidSession(crm(), session());
  cj = { status: 'SHIPPED', trackNumber: '00340434', logistic: 'DHL DE to DE' };
  await cjSync(new Date());
  const event = { type: 'charge.dispute.created', data: { object: { id: 'dp_1', payment_intent: 'pi_joy', amount: 6990, reason: 'product_not_received' } } };
  const raw = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', 'whsec_test').update(`${t}.${raw}`).digest('hex');
  const res = await webhook(new Request('https://api.algbr.eu/api/stripe/webhook', { method: 'POST', body: raw, headers: { 'stripe-signature': `t=${t},v1=${sig}` } }));
  assert.equal(res.status, 200);
  const ev = calls.find((c) => c.url.endsWith('/v1/disputes/dp_1'));
  const body = String(ev.init.body);
  assert.match(body, /evidence%5Bshipping_tracking_number%5D=00340434/);
  assert.match(body, /submit=false/);
  const alert = notifications().find((n) => /LITIGE/.test(n.title));
  assert.equal(alert.priority, 'urgent');
  assert.equal(alert.click, 'https://dashboard.stripe.com/disputes/dp_1');
  const o = await getOrder(crm(), 'cs_live_joy');
  assert.equal(o.issue, 'dispute');
  assert.match(o.attention, /preuves pré-remplies/);
});

test('e-mail texts: three languages, 17TRACK outside the German warehouse, escaped HTML', () => {
  const o = { number: 'KI-261016-ABCD', store: 'kin', lang: 'en', sessionId: 'cs_1', totalCents: 2990, items: [{ id: 'x', name: 'Towel <b>', qty: 1 }], customer: { email: 'x@y.z', name: 'Sam Lee' }, shipping: { country: 'FR' }, supplier: { trackNumber: 'LP123', logisticName: 'CJPacket' } };
  assert.equal(carrierUrl(o), 'https://t.17track.net/en#nums=LP123');
  const m = customerEmail('review', o);
  assert.equal(m.subject, 'How do you like Towel <b>?');
  assert.ok(!m.html.includes('Towel <b>'));
  assert.match(m.html, /Hello Sam,/);
  assert.equal(customerEmail('shipped', { ...o, lang: 'fr' }).subject, 'Votre commande KI-261016-ABCD est en route');
  assert.equal(customerEmail('delivered', { ...o, lang: 'de' }).subject, 'Ihre Bestellung KI-261016-ABCD wurde zugestellt');
});
