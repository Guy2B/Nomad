import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

process.env.NOMAD_MEMORY_STORE = '1';
const { useTraffic, recordHit, report, source, cleanPath, device, isBot } = await import('../engine/lib/traffic.mjs');
const { parseHit } = await import('../engine/functions/event.mjs');

/** D1 on top of node:sqlite (same prepare/bind/run/first/all/batch surface). */
function d1() {
  const sql = new DatabaseSync(':memory:');
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    run: async () => {
      const r = sql.prepare(q).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
    first: async () => sql.prepare(q).get(...args) ?? null,
    all: async () => ({ results: sql.prepare(q).all(...args) }),
  });
  return { prepare: (q) => stmt(q), batch: async (list) => Promise.all(list.map((s) => s.run())), sql };
}

const UA_PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';

test('helpers: sources, paths, devices, bots', () => {
  assert.equal(source('https://www.google.de/'), 'Google');
  assert.equal(source('https://kin.algbr.eu/de/'), null);
  assert.equal(source('https://go.algbr.de/'), null);
  assert.equal(source(''), 'Direct');
  assert.equal(source('https://forum.example.org/t/1', ''), 'forum.example.org');
  assert.equal(source('https://www.google.de/', 'Newsletter'), 'newsletter');
  assert.equal(cleanPath('/de/produkt/x?utm_source=a#top'), '/de/produkt/x');
  assert.equal(cleanPath('/de/index.html'), '/de/');
  assert.equal(device(UA_PHONE), 'mobile');
  assert.equal(device(UA_PC), 'desktop');
  assert.ok(isBot('Googlebot/2.1'));
  assert.ok(isBot(''));
});

test('only our storefronts, page views only, OFF. included', () => {
  assert.equal(parseHit('{"store":"nomad","type":"view","path":"/de/"}', 'https://evil.example'), null);
  assert.equal(parseHit('{"store":"nomad","type":"add"}', 'https://go.algbr.eu'), null);
  assert.equal(parseHit('{"store":"nope","type":"view"}', 'https://go.algbr.eu'), null);
  assert.equal(parseHit('{"store":"off","type":"view","path":"/de/"}', 'https://off.algbr.eu').store, 'off');
  assert.equal(parseHit('{"store":"joy","type":"view","path":"/de/"}', 'https://joy.algbr.eu').store, 'joy');
});

test('visitors counted once a day, visits on arrivals, IP never stored, report adds up', async () => {
  const db = d1();
  useTraffic(db);
  const now = new Date('2026-10-21T10:00:00Z');
  const hit = (over) => recordHit({ store: 'nomad', path: '/de/', referrer: '', ip: '203.0.113.7', ua: UA_PHONE, country: 'DE', ...over }, now);
  await hit({ referrer: 'https://www.google.com/' }); // arrival from Google
  await hit({ path: '/de/produkt/vacuum-backpack', referrer: 'https://go.algbr.eu/de/' }); // internal
  await hit({ path: '/de/produkt/vacuum-backpack', referrer: 'https://go.algbr.eu/de/' });
  await hit({ ip: '198.51.100.9', ua: UA_PC, country: 'AT' }); // second visitor, direct
  await hit({ store: 'kin', ip: '198.51.100.9', ua: UA_PC, country: 'AT', referrer: 'https://www.instagram.com/' });
  assert.equal(await recordHit({ store: 'nomad', path: '/de/', ua: 'Googlebot/2.1' }, now), null);

  const dump = JSON.stringify(db.sql.prepare('SELECT * FROM traffic_hits').all()) + JSON.stringify(db.sql.prepare('SELECT * FROM traffic_seen').all());
  assert.equal(dump.includes('203.0.113.7'), false);
  assert.equal(dump.includes('198.51.100.9'), false);

  const go = await report({ store: 'nomad', days: 7, now });
  assert.deepEqual(go.totals, { pageviews: 4, visitors: 2, visits: 2 });
  assert.equal(go.series.length, 7);
  assert.deepEqual(go.series.at(-1), { d: '2026-10-21', pageviews: 4, visitors: 2, visits: 2 });
  assert.deepEqual(go.top.page.map((x) => [x.key, x.n]).sort(), [['/de/', 2], ['/de/produkt/vacuum-backpack', 2]]);
  assert.deepEqual(go.top.ref.map((r) => r.key).sort(), ['Direct', 'Google']);
  assert.deepEqual(go.top.device.map((r) => [r.key, r.n]).sort(), [['desktop', 1], ['mobile', 1]]);
  assert.deepEqual(go.top.country.map((r) => r.key).sort(), ['AT', 'DE']);

  const all = await report({ store: 'all', days: 30, now });
  assert.deepEqual(all.totals, { pageviews: 5, visitors: 3, visits: 3 });
  assert.deepEqual(all.byStore.map((s) => [s.store, s.visitors]), [['nomad', 2], ['kin', 1]]);
  const year = await report({ store: 'all', days: 365, now });
  assert.equal(year.series.length, 12);
  assert.equal(year.series.at(-1).d, '2026-10');
  assert.equal(year.series.at(-1).visitors, 3);

  // Next day: yesterday's salt and hashes are gone, the same person is a new visitor of the day.
  const tomorrow = new Date('2026-10-22T09:00:00Z');
  const r = await recordHit({ store: 'nomad', path: '/de/', referrer: '', ip: '203.0.113.7', ua: UA_PHONE, country: 'DE' }, tomorrow);
  assert.equal(r.isNew, true);
  assert.equal(db.sql.prepare("SELECT COUNT(*) AS c FROM traffic_seen WHERE day < '2026-10-22'").get().c, 0);
  assert.equal(db.sql.prepare("SELECT COUNT(*) AS c FROM traffic_salt").get().c, 1);
  const week = await report({ store: 'nomad', days: 7, now: tomorrow });
  assert.equal(week.totals.visitors, 3);
  assert.equal(week.previous.visitors, 0);
  useTraffic(null);
});

test('no database: nothing recorded, empty report', async () => {
  useTraffic(null);
  assert.equal(await recordHit({ store: 'nomad', path: '/', ua: UA_PC }), null);
  assert.equal((await report()).ready, false);
});
