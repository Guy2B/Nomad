// First-party statistics: consent required, no personal identifiers, sessions/engagement/searches, attribution, cockpit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
import { analyticsOf, deviceOf, linkOrderSession, mediumOf, pruneEvents, sourceOf } from '../worker/src/analytics.js';
import { insightsOf } from '../worker/src/cockpit/api.js';
import { orderEconomics } from '../worker/src/cockpit/margin.js';
import { allVariants } from '../data/catalog.mjs';
import { memoryD1 } from './d1.mjs';
import { SCHEMA } from '../worker/src/schema.js';

const freshDb = () => { const d = memoryD1(null); for (const q of SCHEMA) d.raw.exec(q); return d; };
const TOKEN = 'analytics-admin-token-0123';
const env = (extra = {}) => ({ DB: freshDb(), SITE_ORIGIN: 'https://algbr.eu', SITE_MODE: 'preview', SUPPLIER_MODE: 'mock', MOCK_PAYMENTS: '1', ADMIN_TOKEN: TOKEN, ...extra });
const ctx = { waitUntil: () => {} };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile';
const send = (e, data, ua = IPHONE) =>
  worker.fetch(new Request('https://algbr.eu/api/events', { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': ua, 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify(data) }), e, ctx);
const admin = (e, path) => worker.fetch(new Request(`https://algbr.eu/api/admin/${path}`, { headers: { authorization: `Bearer ${TOKEN}` } }), e, ctx).then((r) => r.json());
const S1 = 'abcdefghij0123456789';
const S2 = 'zyxwvutsrq9876543210';
const V1 = 'visitor0000000000001';
const ALL = ['2000-01-01', '2100-01-01'];

test('no consent, no data; bad session refused; unknown events dropped', async () => {
  const e = env();
  assert.equal((await send(e, { session: S1, events: [{ event: 'page_view' }] })).status, 400);
  assert.equal((await send(e, { consent: true, session: 'x', events: [{ event: 'page_view' }] })).status, 400);
  const r = await (await send(e, { consent: true, session: S1, events: [{ event: 'hack' }, { event: 'page_view', path: '/de/' }] })).json();
  assert.equal(r.stored, 1);
});

test('stored rows carry no IP, no user agent, no full referrer URL', async () => {
  const e = env();
  await send(e, { consent: true, session: S1, visitor: V1, returning: true, lang: 'de', screen: 's', landing: '/de/', referrer: 'https://www.instagram.com/p/secret-post?x=1', utm: { campaign: 'aw26' }, events: [{ event: 'page_view', path: '/de/' }, { event: 'view_item', item: 'ALG-M-POLO', value: 89 }] });
  const flat = JSON.stringify([e.DB.raw.prepare('SELECT * FROM alg_events').all(), e.DB.raw.prepare('SELECT * FROM alg_sessions').all()]);
  assert.ok(!flat.includes('203.0.113.9') && !flat.includes('iPhone OS') && !flat.includes('secret-post'));
  const s = e.DB.raw.prepare('SELECT * FROM alg_sessions').get();
  assert.equal(s.source, 'instagram.com');
  assert.equal(s.medium, 'social');
  assert.equal(s.is_returning, 1);
  assert.equal(s.device, 'mobile');
  assert.equal(s.screen, 's');
  assert.equal(s.pages, 1);
  assert.equal(s.campaign, 'aw26');
});

test('channels: organic, social, email, referral, direct, utm wins', () => {
  assert.equal(mediumOf(null, 'google.de'), 'organic');
  assert.equal(mediumOf(null, 'l.instagram.com'), 'social');
  assert.equal(mediumOf(null, 'mail.google.com'), 'email');
  assert.equal(mediumOf(null, 'vogue.de'), 'referral');
  assert.equal(mediumOf(null, null), 'direct');
  assert.equal(mediumOf('CPC', 'google.de'), 'cpc');
  assert.equal(sourceOf('https://algbr.eu/de/', 'algbr.eu'), 'direct');
  assert.equal(deviceOf('Mozilla/5.0 (Windows NT 10.0)'), 'desktop');
});

test('full picture: funnel, engagement, searches, 404, attribution of revenue to the source', async () => {
  const e = env();
  await send(e, { consent: true, session: S1, visitor: V1, referrer: 'https://www.google.com/', events: [{ event: 'page_view', path: '/de/' }, { event: 'page_view', path: '/de/product/the-polo-men/' }, { event: 'view_item', item: 'ALG-M-POLO' }, { event: 'color_selected', item: 'ALG-M-POLO', detail: 'black' }, { event: 'size_selected', item: 'ALG-M-POLO', detail: 'M' }, { event: 'add_to_cart', item: 'ALG-M-POLO' }, { event: 'begin_checkout' }, { event: 'page_leave', path: '/de/', seconds: 40, scroll: 80 }, { event: 'search', term: 'Knit', results: 0 }] });
  await send(e, { consent: true, session: S2, events: [{ event: 'not_found', path: '/de/old/' }, { event: 'page_view', path: '/de/old/' }] }, 'Mozilla/5.0 (Windows NT 10.0)');
  const sku = allVariants().find((v) => v.productId === 'ALG-M-POLO' && v.purchasable).sku;
  const r = await worker.fetch(new Request('https://algbr.eu/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: 'de', country: 'DE', items: [{ sku, qty: 1 }], statsConsent: true, session: S1 }) }), e, ctx);
  assert.equal(r.status, 200);
  const orders = e.DB.raw.prepare('SELECT * FROM alg_orders').all().map((o) => ({ ...o, econ: orderEconomics(o) }));
  const a = await analyticsOf(e.DB, ...ALL, orders);
  assert.equal(a.sessions, 2);
  assert.deepEqual(a.funnel.map((f) => f.n), [2, 1, 1, 1, 1]);
  assert.equal(a.avgSecondsPerPage, 40);
  assert.equal(a.avgScroll, 80);
  assert.equal(a.searches[0].term, 'knit');
  assert.equal(a.searches[0].zero, 1);
  assert.equal(a.notFound[0].path, '/de/old/');
  const google = a.bySource.find((x) => x.key === 'google.com');
  assert.equal(google.purchases, 1);
  assert.equal(google.revenue, orders[0].total);
  assert.equal(a.byMedium.find((x) => x.key === 'organic').conversion, 100);
  const polo = a.products.find((p) => p.id === 'ALG-M-POLO');
  assert.deepEqual([polo.addToCart, polo.units, polo.colors[0], polo.sizes[0]], [1, 1, 'black (1)', 'M (1)']);
  assert.equal(a.attributed.orders, 1);
  const d = await admin(e, 'analytics?range=30d');
  assert.equal(d.sessions, 2);
  assert.equal(d.purchases, 1);
  assert.ok(Array.isArray(d.insights) && d.insights[0].includes('consented session'));
});

test('checkout without statistics consent is never linked to a session', async () => {
  const e = env();
  const sku = allVariants().find((v) => v.productId === 'ALG-M-POLO' && v.purchasable).sku;
  await worker.fetch(new Request('https://algbr.eu/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: 'de', country: 'DE', items: [{ sku, qty: 1 }], session: S1 }) }), e, ctx);
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM alg_order_sessions').get().n, 0);
  await linkOrderSession(e.DB, 'o1', 'bad');
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM alg_order_sessions').get().n, 0);
});

test('insights speak only with enough data and point at the weakest step', () => {
  const thin = insightsOf({ sessions: 5 }, []);
  assert.equal(thin.length, 1);
  const a = { sessions: 200, funnel: [{ step: 'sessions', n: 200 }, { step: 'product view', n: 120, ofPrevious: 60 }, { step: 'add to cart', n: 6, ofPrevious: 5 }, { step: 'checkout', n: 5, ofPrevious: 83.3 }, { step: 'purchase', n: 3, ofPrevious: 60 }], byDevice: [{ key: 'mobile', sessions: 150, conversion: 1 }, { key: 'desktop', sessions: 50, conversion: 3 }], bySource: [], products: [], abandonment: { cartAbandonRate: 10, unpaidCheckouts: 0 }, searches: [], notFound: [], bounceRate: 40 };
  const out = insightsOf(a, [{}]);
  assert.ok(out[0].includes('add to cart'));
  assert.ok(out.some((t) => t.startsWith('desktop converts at 3 %')));
});

test('retention: everything older than 13 months is deleted', async () => {
  const e = env();
  e.DB.raw.prepare("INSERT INTO alg_events (ts, session, event) VALUES ('2020-01-01T00:00:00Z', ?, 'page_view')").run(S1);
  e.DB.raw.prepare("INSERT INTO alg_sessions (session, first_ts, last_ts) VALUES (?, '2020-01-01T00:00:00Z', '2020-01-01T00:00:00Z')").run(S1);
  e.DB.raw.prepare("INSERT INTO alg_searches (ts, session, term) VALUES ('2020-01-01T00:00:00Z', ?, 'x')").run(S1);
  await send(e, { consent: true, session: S2, events: [{ event: 'page_view' }] });
  await pruneEvents(e.DB);
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM alg_events').get().n, 1);
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM alg_sessions').get().n, 1);
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM alg_searches').get().n, 0);
});
