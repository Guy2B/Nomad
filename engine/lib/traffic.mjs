/**
 * Audience statistics per store and per day: visitors, visits, page views,
 * pages, sources, countries, devices. No cookie, nothing stored on the device.
 *
 * Unique visitors of a day are counted with a one-way hash of (random salt of
 * the day, IP address, browser, store). The IP address itself is never stored,
 * the salt and the hashes of a day are deleted the next day, so a visitor can
 * neither be recognised from one day to the next nor identified.
 *
 * D1 tables:
 *   traffic_hits(store, day, dim, key, n)  dim: total | page | ref | country | device
 *     total keys: pageviews, visitors (first hit of the day), visits (arrivals from outside)
 *   traffic_seen(store, day, h)            hashes of the current day only
 *   traffic_salt(day, salt)                salt of the current day only
 */
import crypto from 'node:crypto';

let db = null;
/** D1 binding from the Worker (null in tests and local runs: nothing is recorded). */
export const useTraffic = (binding) => {
  if ((binding ?? null) === db) return;
  db = binding ?? null;
  ready = null;
};
export const trafficReady = () => Boolean(db);

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS traffic_hits (store TEXT NOT NULL, day TEXT NOT NULL, dim TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (store, day, dim, key))',
  'CREATE INDEX IF NOT EXISTS traffic_hits_day ON traffic_hits (day, dim)',
  'CREATE TABLE IF NOT EXISTS traffic_seen (store TEXT NOT NULL, day TEXT NOT NULL, h TEXT NOT NULL, PRIMARY KEY (store, day, h))',
  'CREATE TABLE IF NOT EXISTS traffic_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL)',
];
let ready = null;
const init = () => (ready ??= db.batch(SCHEMA.map((s) => db.prepare(s))));

export const DIMS = ['page', 'ref', 'country', 'device'];
/** Calendar day in Berlin (the shops' time zone), YYYY-MM-DD. */
const BERLIN = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = (d) => BERLIN.format(d);
/** YYYY-MM-DD shifted by k days (pure calendar arithmetic, no DST surprise). */
const shift = (ymd, k) => new Date(Date.parse(ymd + 'T00:00:00Z') + k * 86_400_000).toISOString().slice(0, 10);

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|monitor|uptime|curl|wget|python|httpclient|okhttp|java\/|go-http|axios|node-fetch|scrapy/i;
export const isBot = (ua) => !ua || BOT.test(ua);

export function device(ua = '') {
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** "/de/produkt/x?utm=1#a" → "/de/produkt/x"; "/de/index.html" → "/de/". */
export function cleanPath(p) {
  let s = String(p || '/').split(/[?#]/)[0].slice(0, 200);
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/{2,}/g, '/');
  return s.replace(/[^\w\-/.~%]/g, '').slice(0, 160) || '/';
}

const SOURCES = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)ecosia\.org$/, 'Ecosia'],
  [/(^|\.)yahoo\./, 'Yahoo'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity'],
  [/(^|\.)claude\.ai$/, 'Claude'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, 'Instagram'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X'],
  [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, 'Pinterest'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
];

/**
 * Where the visit comes from. null = navigation inside our own sites (not an arrival).
 * utm_source wins; no referrer = "Direct".
 */
export function source(referrer, utm, ownHost = /(^|\.)algbr\.(eu|de)$/) {
  const u = String(utm || '').trim().toLowerCase().replace(/[^\w.\-]/g, '').slice(0, 40);
  if (u) return u;
  if (!referrer) return 'Direct';
  let host;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'Direct';
  }
  if (ownHost.test(host) || host.endsWith('.workers.dev')) return null;
  for (const [re, name] of SOURCES) if (re.test(host)) return name;
  return host.slice(0, 60);
}

async function saltOf(today) {
  const row = await db.prepare('SELECT salt FROM traffic_salt WHERE day = ?').bind(today).first();
  if (row) return row.salt;
  // New day: forget yesterday's salt and visitor hashes, then start a fresh salt.
  await db.prepare('DELETE FROM traffic_salt WHERE day < ?').bind(today).run();
  await db.prepare('DELETE FROM traffic_seen WHERE day < ?').bind(today).run();
  await db.prepare('INSERT OR IGNORE INTO traffic_salt (day, salt) VALUES (?, ?)').bind(today, crypto.randomBytes(16).toString('hex')).run();
  return (await db.prepare('SELECT salt FROM traffic_salt WHERE day = ?').bind(today).first()).salt;
}

const UPSERT = 'INSERT INTO traffic_hits (store, day, dim, key, n) VALUES (?, ?, ?, ?, 1) ON CONFLICT (store, day, dim, key) DO UPDATE SET n = n + 1';

/**
 * One page view. hit = { store, path, referrer, utm, ip, ua, country }.
 * Returns what was counted (for tests), or null when ignored.
 */
export async function recordHit(hit, now = new Date()) {
  if (!db || !hit?.store || isBot(hit.ua)) return null;
  await init();
  const today = day(now);
  const salt = await saltOf(today);
  const h = crypto.createHash('sha256').update(`${salt}|${hit.ip || ''}|${hit.ua || ''}|${hit.store}`).digest('hex').slice(0, 24);
  const seen = await db.prepare('INSERT OR IGNORE INTO traffic_seen (store, day, h) VALUES (?, ?, ?)').bind(hit.store, today, h).run();
  const isNew = (seen?.meta?.changes ?? 0) > 0;
  const src = source(hit.referrer, hit.utm);
  const rows = [['total', 'pageviews'], ['page', cleanPath(hit.path)]];
  if (isNew) {
    rows.push(['total', 'visitors'], ['country', /^[A-Z]{2}$/.test(hit.country || '') ? hit.country : 'XX'], ['device', device(hit.ua)]);
  }
  // A visit = an arrival from outside our sites (or the first page of the day without referrer).
  if (src) rows.push(['total', 'visits'], ['ref', src]);
  await db.batch(rows.map(([dim, key]) => db.prepare(UPSERT).bind(hit.store, today, dim, key)));
  return { isNew, rows };
}

const pct = (a, b) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);

/**
 * Report for the admin: totals of the period and of the previous period of the
 * same length, a daily series (monthly for a year), top lists, split by store.
 * store: a store id or 'all'. days: 1 (today), 7, 30, 90 or 365.
 */
export async function report({ store = 'all', days = 30, now = new Date() } = {}) {
  const empty = { ready: false, days, store, totals: {}, previous: {}, change: {}, series: [], byStore: [], top: {} };
  if (!db) return empty;
  await init();
  const n = [1, 7, 30, 90, 365].includes(Number(days)) ? Number(days) : 30;
  const to = day(now);
  const from = shift(to, -(n - 1));
  const prevTo = shift(to, -n);
  const prevFrom = shift(to, -(2 * n - 1));
  const scope = store === 'all' ? '' : ' AND store = ?';
  const args = (a, b) => (store === 'all' ? [a, b] : [a, b, store]);
  const sum = async (a, b) => {
    const { results } = await db
      .prepare(`SELECT key, SUM(n) AS n FROM traffic_hits WHERE dim = 'total' AND day BETWEEN ? AND ?${scope} GROUP BY key`)
      .bind(...args(a, b))
      .all();
    const t = { pageviews: 0, visitors: 0, visits: 0 };
    for (const r of results) t[r.key] = Number(r.n);
    return t;
  };
  const totals = await sum(from, to);
  const previous = await sum(prevFrom, prevTo);
  const monthly = n === 365;
  const bucket = monthly ? 'substr(day, 1, 7)' : 'day';
  const { results: rowsS } = await db
    .prepare(`SELECT ${bucket} AS d, key, SUM(n) AS n FROM traffic_hits WHERE dim = 'total' AND day BETWEEN ? AND ?${scope} GROUP BY d, key`)
    .bind(...args(from, to))
    .all();
  // Every bucket of the period, even without traffic, so the chart has no holes.
  const series = [];
  if (monthly) {
    const [y, m] = to.split('-').map(Number);
    for (let i = 11; i >= 0; i--) series.push({ d: new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7), pageviews: 0, visitors: 0, visits: 0 });
  } else {
    for (let i = n - 1; i >= 0; i--) series.push({ d: shift(to, -i), pageviews: 0, visitors: 0, visits: 0 });
  }
  const at = new Map(series.map((x) => [x.d, x]));
  for (const r of rowsS) if (at.has(r.d)) at.get(r.d)[r.key] = Number(r.n);
  const { results: bs } = await db
    .prepare(`SELECT store, key, SUM(n) AS n FROM traffic_hits WHERE dim = 'total' AND day BETWEEN ? AND ? GROUP BY store, key`)
    .bind(from, to)
    .all();
  const byStoreMap = {};
  for (const r of bs) (byStoreMap[r.store] ??= { store: r.store, pageviews: 0, visitors: 0, visits: 0 })[r.key] = Number(r.n);
  const top = {};
  for (const dim of DIMS) {
    const { results } = await db
      .prepare(`SELECT ${dim === 'page' ? 'store, ' : ''}key, SUM(n) AS n FROM traffic_hits WHERE dim = ? AND day BETWEEN ? AND ?${scope} GROUP BY ${dim === 'page' ? 'store, ' : ''}key ORDER BY n DESC LIMIT ${dim === 'page' ? 25 : 15}`)
      .bind(dim, ...args(from, to))
      .all();
    top[dim] = results.map((r) => ({ key: r.key, n: Number(r.n), ...(r.store ? { store: r.store } : {}) }));
  }
  return {
    ready: true,
    store,
    days: n,
    from,
    to,
    monthly,
    totals,
    previous,
    change: { visitors: pct(totals.visitors, previous.visitors), visits: pct(totals.visits, previous.visits), pageviews: pct(totals.pageviews, previous.pageviews) },
    series,
    byStore: Object.values(byStoreMap).sort((a, b) => b.visitors - a.visitors),
    top,
  };
}
