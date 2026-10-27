/**
 * First-party statistics for Algebra. The browser sends events only after the visitor accepted statistics
 * (consent banner). No cookie, no IP address, no user agent and no e-mail is stored.
 *
 *   POST /api/events  { consent: true, session, visitor?, returning?, lang, screen?, landing?, referrer?,
 *                       utm?: { source, medium, campaign, content, term }, events: [{ event, path?, item?, value?,
 *                       seconds?, scroll?, term?, results?, detail? }] }
 *
 * Tables: alg_sessions (one row per tab session: landing, source, medium, campaign, device, screen, country,
 * new/returning), alg_events (funnel and product events), alg_engagement (time and scroll per page), alg_searches,
 * alg_order_sessions (checkout → session, for revenue by source). Purchases always come from alg_orders.
 * Retention: 13 months (cron).
 */
import { HttpError } from './orders.js';

export const EVENTS = ['page_view', 'page_leave', 'not_found', 'search', 'view_item', 'select_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'purchase', 'size_guide_open', 'color_selected', 'size_selected', 'graphic_series_view', 'newsletter_signup', 'circle_signup'];
const LANGS = ['de', 'en', 'fr'];
const clip = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
const int = (v, max) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.round(Number(v)))) : null);
const ID = /^[a-z0-9]{16,40}$/;
export const RETENTION_DAYS = 396;
const TABLES = [
  ['alg_events', 'ts'],
  ['alg_engagement', 'ts'],
  ['alg_searches', 'ts'],
  ['alg_sessions', 'last_ts'],
];

export function deviceOf(ua = '') {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

const hostOf = (raw) => {
  const s = clip(raw, 300);
  if (!s) return null;
  try {
    return new URL(s.includes('://') ? s : `https://${s}`).hostname.replace(/^www\./, '').toLowerCase() || null;
  } catch {
    return null;
  }
};

/** Referrer host, or utm_source; own domain and empty values become 'direct'. */
export function sourceOf(raw, ownHost) {
  const h = hostOf(raw);
  if (h) return h === ownHost ? 'direct' : h;
  const s = clip(raw, 60);
  return s ? s.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'direct' : 'direct';
}

const SEARCH = /(^|\.)(google|bing|duckduckgo|ecosia|yahoo|qwant|startpage|yandex|baidu|brave)\./;
const SOCIAL = /(^|\.)(instagram|facebook|fb|tiktok|pinterest|linkedin|youtube|reddit|threads|snapchat)\.|^(t\.co|x\.com|lnkd\.in|l\.instagram\.com)$/;
const MAIL = /(^|\.)(mail|gmail|outlook|webmail|gmx|web\.de|t-online|yahoo\.mail)/;
/** Channel: utm_medium when given, else derived from the referrer host. */
export function mediumOf(utmMedium, host) {
  const m = clip(utmMedium, 40);
  if (m) return m.toLowerCase();
  if (!host || host === 'direct') return 'direct';
  if (MAIL.test(host)) return 'email';
  if (SEARCH.test(`${host}.`) || SEARCH.test(host)) return 'organic';
  if (SOCIAL.test(host) || SOCIAL.test(`${host}.`)) return 'social';
  if (MAIL.test(host)) return 'email';
  return 'referral';
}

export async function recordEvents(req, env, b) {
  if (b?.consent !== true) throw new HttpError(400, 'CONSENT_REQUIRED');
  if (typeof b.session !== 'string' || !ID.test(b.session)) throw new HttpError(400, 'BAD_SESSION');
  const visitor = typeof b.visitor === 'string' && ID.test(b.visitor) ? b.visitor : null;
  const list = (Array.isArray(b.events) ? b.events.slice(0, 30) : []).filter((e) => EVENTS.includes(e?.event));
  if (!list.length) return { stored: 0 };
  const ts = new Date().toISOString();
  const own = env.SITE_ORIGIN ? new URL(env.SITE_ORIGIN).hostname.replace(/^www\./, '') : '';
  const country = clip(req.cf?.country, 2);
  const device = deviceOf(req.headers.get('user-agent') || '');
  const lang = LANGS.includes(b.lang) ? b.lang : null;
  const utm = b.utm && typeof b.utm === 'object' ? b.utm : {};
  const refHost = hostOf(b.referrer);
  const source = clip(utm.source, 60)?.toLowerCase() || (refHost && refHost !== own ? refHost : 'direct');
  const medium = mediumOf(utm.medium, refHost && refHost !== own ? refHost : null);
  const screen = ['s', 'm', 'l', 'xl'].includes(b.screen) ? b.screen : null;
  const pages = list.filter((e) => e.event === 'page_view').length;

  await env.DB.prepare(
    `INSERT INTO alg_sessions (session, visitor, is_returning, first_ts, last_ts, pages, landing, referrer, source, medium, campaign, content, term, lang, country, device, screen)
     VALUES (?,?,?,?,?,0,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(session) DO NOTHING`,
  )
    .bind(b.session, visitor, b.returning === true ? 1 : 0, ts, ts, clip(b.landing, 200) || clip(list[0].path, 200), refHost && refHost !== own ? refHost : null, source, medium, clip(utm.campaign, 80), clip(utm.content, 80), clip(utm.term, 80), lang, country, device, screen)
    .run();
  await env.DB.prepare('UPDATE alg_sessions SET last_ts = ?, pages = pages + ? WHERE session = ?').bind(ts, pages, b.session).run();

  for (const e of list) {
    const path = clip(e.path, 200);
    if (e.event === 'page_leave') {
      await env.DB.prepare('INSERT INTO alg_engagement (ts, session, path, seconds, scroll) VALUES (?,?,?,?,?)').bind(ts, b.session, path, int(e.seconds, 3600), int(e.scroll, 100)).run();
      continue;
    }
    if (e.event === 'search') {
      const term = clip(e.term, 60)?.toLowerCase();
      if (term) await env.DB.prepare('INSERT INTO alg_searches (ts, session, term, results) VALUES (?,?,?,?)').bind(ts, b.session, term, int(e.results, 999)).run();
      continue;
    }
    const value = Number.isFinite(Number(e.value)) ? Math.round(Number(e.value) * 100) / 100 : null;
    const detail = clip(e.detail, 40); // colour or size for *_selected events, kept in the source column
    await env.DB.prepare('INSERT INTO alg_events (ts, session, event, path, item, lang, country, device, source, campaign, value) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(ts, b.session, e.event, path, clip(e.item, 40), lang, country, device, e.event === 'page_view' ? source : detail, e.event === 'page_view' ? clip(utm.campaign, 80) : null, value)
      .run();
  }
  return { stored: list.length };
}

/** Checkout started by a consented session (the browser sends its session id with the cart). */
export async function linkOrderSession(db, orderId, session) {
  if (typeof session !== 'string' || !ID.test(session)) return;
  await db.prepare('INSERT INTO alg_order_sessions (order_id, session) VALUES (?,?) ON CONFLICT(order_id) DO NOTHING').bind(orderId, session).run();
}

export async function pruneEvents(db, at = Date.now()) {
  const cutoff = new Date(at - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  for (const [t, col] of TABLES) await db.prepare(`DELETE FROM ${t} WHERE ${col} < ?`).bind(cutoff).run();
  await db.prepare('DELETE FROM alg_order_sessions WHERE session NOT IN (SELECT session FROM alg_sessions)').run();
}

const pct = (x, y) => (y ? Math.round((x / y) * 1000) / 10 : null);

/**
 * Everything the cockpit shows for [from, to]. `orders` = economics-enriched alg_orders rows of the same period
 * (purchases and revenue come from there, never from the browser).
 */
export async function analyticsOf(db, from, to, orders = []) {
  const all = (sql, ...a) => db.prepare(sql).bind(from, to, ...a).all().then((r) => r.results);
  const sessions = await all('SELECT * FROM alg_sessions WHERE first_ts >= ? AND first_ts <= ?');
  const events = await all('SELECT session, event, item, path, value, source AS detail, ts FROM alg_events WHERE ts >= ? AND ts <= ?');
  const engagement = await all('SELECT path, seconds, scroll, session FROM alg_engagement WHERE ts >= ? AND ts <= ?');
  const searches = await all('SELECT term, results FROM alg_searches WHERE ts >= ? AND ts <= ?');
  const links = new Map((await db.prepare('SELECT order_id, session FROM alg_order_sessions').all()).results.map((r) => [r.order_id, r.session]));
  const sess = new Map(sessions.map((s) => [s.session, s]));
  // older rows (before alg_sessions existed) still count as sessions
  for (const e of events) if (!sess.has(e.session)) sess.set(e.session, { session: e.session, source: 'direct', medium: 'direct', device: null, country: null, is_returning: 0, pages: 0, first_ts: e.ts });
  const S = [...sess.values()];
  const by = (ev) => new Set(events.filter((e) => e.event === ev).map((e) => e.session));
  const viewed = by('view_item');
  const carted = by('add_to_cart');
  const checkout = by('begin_checkout');
  const sold = orders.filter((o) => o.econ?.sold);
  const paidSessions = new Set(sold.map((o) => links.get(o.id)).filter(Boolean));
  const revenueBySession = new Map();
  for (const o of sold) {
    const s = links.get(o.id);
    if (s) revenueBySession.set(s, (revenueBySession.get(s) || 0) + o.total);
  }

  // segment table: sessions, cart, checkout, attributed purchases and revenue
  const segment = (keyOf) => {
    const m = new Map();
    for (const s of S) {
      const k = keyOf(s) ?? '—';
      const r = m.get(k) || { key: k, sessions: 0, pages: 0, carts: 0, checkouts: 0, purchases: 0, revenue: 0 };
      r.sessions += 1;
      r.pages += s.pages || 0;
      if (carted.has(s.session)) r.carts += 1;
      if (checkout.has(s.session)) r.checkouts += 1;
      if (paidSessions.has(s.session)) r.purchases += 1;
      r.revenue += revenueBySession.get(s.session) || 0;
      m.set(k, r);
    }
    return [...m.values()].map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100, pagesPerSession: Math.round((r.pages / r.sessions) * 10) / 10, conversion: pct(r.purchases, r.sessions) })).sort((a, b) => b.sessions - a.sessions);
  };

  // pages: views, average time, average scroll, landing count
  const pageMap = new Map();
  for (const e of events.filter((x) => x.event === 'page_view')) {
    const p = pageMap.get(e.path) || { path: e.path, views: 0, landings: 0, seconds: [], scroll: [] };
    p.views += 1;
    pageMap.set(e.path, p);
  }
  for (const s of S) if (s.landing && pageMap.has(s.landing)) pageMap.get(s.landing).landings += 1;
  for (const g of engagement) {
    const p = pageMap.get(g.path);
    if (!p) continue;
    if (g.seconds != null) p.seconds.push(g.seconds);
    if (g.scroll != null) p.scroll.push(g.scroll);
  }
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const pagesTable = [...pageMap.values()].map((p) => ({ path: p.path, views: p.views, landings: p.landings, avgSeconds: avg(p.seconds), avgScroll: avg(p.scroll) })).sort((a, b) => b.views - a.views).slice(0, 40);

  // products: views, add-to-cart, units and revenue sold, conversion, colour and size interest
  const prod = new Map();
  const P = (id) => prod.get(id) || prod.set(id, { id, views: 0, viewSessions: new Set(), carts: 0, units: 0, revenue: 0, colors: {}, sizes: {} }).get(id);
  for (const e of events) {
    if (!e.item) continue;
    const p = P(e.item);
    if (e.event === 'view_item') {
      p.views += 1;
      p.viewSessions.add(e.session);
    }
    if (e.event === 'add_to_cart') p.carts += 1;
    if (e.event === 'color_selected' && e.detail) p.colors[e.detail] = (p.colors[e.detail] || 0) + 1;
    if (e.event === 'size_selected' && e.detail) p.sizes[e.detail] = (p.sizes[e.detail] || 0) + 1;
  }
  for (const o of sold) {
    let items = [];
    try {
      items = JSON.parse(o.items_json || '[]');
    } catch {
      /* ignore */
    }
    for (const it of items) {
      const p = P(it.productId);
      p.units += it.qty;
      p.revenue += it.price * it.qty;
    }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} (${n})`);
  const productsTable = [...prod.values()].map((p) => ({ id: p.id, views: p.views, sessions: p.viewSessions.size, addToCart: p.carts, addRate: pct(p.carts, p.viewSessions.size), units: p.units, revenue: Math.round(p.revenue * 100) / 100, conversion: pct(p.units, p.viewSessions.size), colors: top(p.colors), sizes: top(p.sizes) })).sort((a, b) => b.sessions - a.sessions || b.units - a.units);

  // trend per day: sessions and orders
  const days = new Map();
  const day = (iso) => iso.slice(0, 10);
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) days.set(day(new Date(t).toISOString()), { date: day(new Date(t).toISOString()), sessions: 0, orders: 0, revenue: 0 });
  for (const s of S) if (days.has(day(s.first_ts))) days.get(day(s.first_ts)).sessions += 1;
  for (const o of sold) {
    const d = days.get(day(o.created_at));
    if (d) {
      d.orders += 1;
      d.revenue = Math.round((d.revenue + o.total) * 100) / 100;
    }
  }

  // time patterns (UTC → shown as hour of day in Europe/Berlin)
  const hour = Array.from({ length: 24 }, (_, h) => ({ hour: h, sessions: 0 }));
  const weekday = Array.from({ length: 7 }, (_, d) => ({ day: d, sessions: 0 }));
  const berlin = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const wd = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  for (const s of S) {
    const parts = Object.fromEntries(berlin.formatToParts(new Date(s.first_ts)).map((x) => [x.type, x.value]));
    hour[Number(parts.hour) % 24].sessions += 1;
    weekday[wd[parts.weekday] ?? 0].sessions += 1;
  }

  // abandonment
  const abandonedCart = [...carted].filter((s) => !checkout.has(s)).length;
  const pendingCheckouts = orders.filter((o) => ['pending_payment', 'expired', 'payment_failed'].includes(o.status));
  const terms = new Map();
  for (const s of searches) {
    const t = terms.get(s.term) || { term: s.term, count: 0, zero: 0 };
    t.count += 1;
    if (s.results === 0) t.zero += 1;
    terms.set(s.term, t);
  }
  const notFound = new Map();
  for (const e of events.filter((x) => x.event === 'not_found')) notFound.set(e.path, (notFound.get(e.path) || 0) + 1);
  const count = (ev) => events.filter((e) => e.event === ev).length;
  const engagementAll = engagement.filter((g) => g.seconds != null);
  const bounce = S.filter((s) => (s.pages || 0) <= 1).length;

  const funnel = [
    { step: 'sessions', n: S.length },
    { step: 'product view', n: viewed.size },
    { step: 'add to cart', n: carted.size },
    { step: 'checkout', n: Math.max(checkout.size, orders.length ? new Set(orders.map((o) => links.get(o.id)).filter(Boolean)).size : 0) },
    { step: 'purchase', n: sold.length },
  ].map((s, i, a) => ({ ...s, ofPrevious: i ? pct(s.n, a[i - 1].n) : null, ofSessions: pct(s.n, a[0].n) }));

  return {
    sessions: S.length,
    visitors: new Set(S.map((s) => s.visitor).filter(Boolean)).size,
    newSessions: S.filter((s) => !s.is_returning).length,
    returningSessions: S.filter((s) => s.is_returning).length,
    pageViews: count('page_view'),
    pagesPerSession: S.length ? Math.round((count('page_view') / S.length) * 10) / 10 : null,
    bounceRate: pct(bounce, S.length),
    avgSecondsPerPage: avg(engagementAll.map((g) => g.seconds)),
    avgScroll: avg(engagement.filter((g) => g.scroll != null).map((g) => g.scroll)),
    productViews: count('view_item'),
    addToCart: carted.size,
    checkoutStarted: checkout.size,
    funnel,
    trend: [...days.values()],
    bySource: segment((s) => s.source),
    byMedium: segment((s) => s.medium),
    byCampaign: segment((s) => s.campaign).filter((r) => r.key !== '—'),
    byLanding: segment((s) => s.landing).slice(0, 25),
    byDevice: segment((s) => s.device),
    byScreen: segment((s) => s.screen),
    byCountry: segment((s) => s.country),
    byLanguage: segment((s) => s.lang),
    byVisitorType: segment((s) => (s.is_returning ? 'returning' : 'new')),
    hours: hour,
    weekdays: weekday,
    pages: pagesTable,
    products: productsTable,
    searches: [...terms.values()].sort((a, b) => b.count - a.count).slice(0, 30),
    notFound: [...notFound.entries()].map(([path, n]) => ({ path, n })).sort((a, b) => b.n - a.n).slice(0, 20),
    abandonment: { cartsWithoutCheckout: abandonedCart, cartAbandonRate: pct(abandonedCart, carted.size), unpaidCheckouts: pendingCheckouts.length, unpaidValue: Math.round(pendingCheckouts.reduce((n, o) => n + o.total, 0) * 100) / 100 },
    signups: { circle: count('circle_signup'), newsletter: count('newsletter_signup') },
    sizeGuideOpens: count('size_guide_open'),
    attributed: { orders: sold.filter((o) => links.has(o.id)).length, of: sold.length },
  };
}
