// First-party statistics: consent required, no personal identifiers stored, aggregates feed the cockpit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
import { analyticsOf, deviceOf, pruneEvents, sourceOf } from '../worker/src/analytics.js';
import { memoryD1 } from './d1.mjs';
import { SCHEMA } from '../worker/src/schema.js';

const freshDb = () => { const d = memoryD1(null); for (const q of SCHEMA) d.raw.exec(q); return d; };
const env = (extra = {}) => ({ DB: freshDb(), SITE_ORIGIN: 'https://algbr.eu', SITE_MODE: 'preview', SUPPLIER_MODE: 'mock', ADMIN_TOKEN: 'analytics-admin-token-0123', ...extra });
const ctx = { waitUntil: () => {} };
const send = (e, data, ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile') =>
  worker.fetch(new Request('https://algbr.eu/api/events', { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': ua, 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify(data) }), e, ctx);
const S1 = 'abcdefghij0123456789';
const S2 = 'zyxwvutsrq9876543210';

test('no consent, no data; bad session refused; unknown events dropped', async () => {
  const e = env();
  assert.equal((await send(e, { session: S1, events: [{ event: 'page_view' }] })).status, 400);
  assert.equal((await send(e, { consent: true, session: 'x', events: [{ event: 'page_view' }] })).status, 400);
  const r = await (await send(e, { consent: true, session: S1, events: [{ event: 'hack' }, { event: 'page_view', path: '/de/' }] })).json();
  assert.equal(r.stored, 1);
});

test('stored rows carry no IP, no user agent, no e-mail; source only on page views', async () => {
  const e = env();
  await send(e, { consent: true, session: S1, lang: 'de', source: 'https://www.instagram.com/p/x', campaign: 'aw26', events: [{ event: 'page_view', path: '/de/' }, { event: 'view_item', item: 'ALG-M-POLO', value: 89 }] });
  const rows = e.DB.raw.prepare('SELECT * FROM alg_events').all();
  const flat = JSON.stringify(rows);
  assert.ok(!flat.includes('203.0.113.9') && !flat.includes('iPhone OS'), 'no IP, no user agent');
  assert.deepEqual(Object.keys(rows[0]).sort(), ['campaign', 'country', 'device', 'event', 'id', 'item', 'lang', 'path', 'session', 'source', 'ts', 'value']);
  assert.equal(rows[0].source, 'instagram.com');
  assert.equal(rows[0].device, 'mobile');
  assert.equal(rows[1].source, null);
  assert.equal(sourceOf('https://algbr.eu/de/', 'algbr.eu'), 'direct');
  assert.equal(deviceOf('Mozilla/5.0 (Windows NT 10.0)'), 'desktop');
});

test('aggregates: sessions, views, add to cart, checkout, by product / source / device; cockpit conversion', async () => {
  const e = env();
  await send(e, { consent: true, session: S1, source: 'google.com', events: [{ event: 'page_view' }, { event: 'view_item', item: 'ALG-M-POLO' }, { event: 'add_to_cart', item: 'ALG-M-POLO' }, { event: 'begin_checkout' }] });
  await send(e, { consent: true, session: S2, source: '', events: [{ event: 'page_view' }, { event: 'view_item', item: 'ALG-M-POLO' }] }, 'Mozilla/5.0 (Windows NT 10.0)');
  const a = await analyticsOf(e.DB, '2000-01-01', '2100-01-01');
  assert.equal(a.sessions, 2);
  assert.equal(a.productViews, 2);
  assert.equal(a.addToCart, 1);
  assert.equal(a.checkoutStarted, 1);
  assert.equal(a.items[0].sessions, 2);
  assert.deepEqual(a.bySource.map((x) => x.k).sort(), ['direct', 'google.com']);
  assert.deepEqual(a.byDevice.map((x) => x.k).sort(), ['desktop', 'mobile']);
  const d = await (await worker.fetch(new Request('https://algbr.eu/api/admin/analytics?range=30d', { headers: { authorization: 'Bearer analytics-admin-token-0123' } }), e, ctx)).json();
  assert.equal(d.funnel.sessions, 2);
  assert.equal(d.provider, 'first-party');
  assert.ok(d.note.includes('consent'));
  const o = await (await worker.fetch(new Request('https://algbr.eu/api/admin/overview?range=30d', { headers: { authorization: 'Bearer analytics-admin-token-0123' } }), e, ctx)).json();
  assert.equal(o.business.sessions, 2);
  assert.equal(o.business.conversion, 0);
});

test('retention: events older than 13 months are deleted', async () => {
  const e = env();
  e.DB.raw.prepare("INSERT INTO alg_events (ts, session, event) VALUES ('2020-01-01T00:00:00Z', ?, 'page_view')").run(S1);
  await send(e, { consent: true, session: S2, events: [{ event: 'page_view' }] });
  await pruneEvents(e.DB);
  assert.equal(e.DB.raw.prepare('SELECT COUNT(*) AS n FROM alg_events').get().n, 1);
});
