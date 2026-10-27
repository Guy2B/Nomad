/**
 * First-party statistics for Algebra. The browser only sends events after the visitor accepted statistics
 * (consent banner); nothing is sent before. No cookie, no IP address, no user agent and no e-mail is stored.
 *
 *   POST /api/events   { consent: true, session, lang, source?, campaign?, events: [{ event, path?, item?, value? }] }
 *
 * The cockpit reads alg_events (sessions, product views, add to cart, checkout started) and joins purchases from
 * alg_orders. Retention: 13 months (cron).
 */
import { HttpError } from './orders.js';

export const EVENTS = ['page_view', 'view_item', 'select_item', 'add_to_cart', 'remove_from_cart', 'begin_checkout', 'purchase', 'size_guide_open', 'color_selected', 'size_selected', 'graphic_series_view', 'newsletter_signup', 'circle_signup'];
const LANGS = ['de', 'en', 'fr'];
const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);
export const RETENTION_DAYS = 396;

export function deviceOf(ua = '') {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Referrer host, or utm_source; own domain and empty values become 'direct'. */
export function sourceOf(raw, ownHost) {
  const s = clip(raw, 200);
  if (!s) return 'direct';
  try {
    const host = new URL(s.includes('://') ? s : `https://${s}`).hostname.replace(/^www\./, '');
    return host && host !== ownHost ? host : 'direct';
  } catch {
    return s.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 60) || 'direct';
  }
}

export async function recordEvents(req, env, b) {
  if (b?.consent !== true) throw new HttpError(400, 'CONSENT_REQUIRED');
  if (typeof b.session !== 'string' || !/^[a-z0-9]{16,40}$/.test(b.session)) throw new HttpError(400, 'BAD_SESSION');
  const list = Array.isArray(b.events) ? b.events.slice(0, 25) : [];
  const ok = list.filter((e) => EVENTS.includes(e?.event));
  if (!ok.length) return { stored: 0 };
  const country = clip(req.cf?.country, 2) || null;
  const device = deviceOf(req.headers.get('user-agent') || '');
  const own = env.SITE_ORIGIN ? new URL(env.SITE_ORIGIN).hostname.replace(/^www\./, '') : '';
  const source = b.source != null ? sourceOf(b.source, own) : null;
  const campaign = clip(b.campaign, 80);
  const lang = LANGS.includes(b.lang) ? b.lang : null;
  const ts = new Date().toISOString();
  for (const e of ok) {
    const value = Number.isFinite(Number(e.value)) ? Math.round(Number(e.value) * 100) / 100 : null;
    await env.DB.prepare('INSERT INTO alg_events (ts, session, event, path, item, lang, country, device, source, campaign, value) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(ts, b.session, e.event, clip(e.path, 200), clip(e.item, 40), lang, country, device, e.event === 'page_view' ? source : null, e.event === 'page_view' ? campaign : null, value)
      .run();
  }
  return { stored: ok.length };
}

export async function pruneEvents(db, at = Date.now()) {
  const cutoff = new Date(at - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  await db.prepare('DELETE FROM alg_events WHERE ts < ?').bind(cutoff).run();
}

/** Aggregates for the cockpit over [from, to]. Purchases come from orders, not from the browser. */
export async function analyticsOf(db, from, to) {
  const q = (sql, ...args) => db.prepare(sql).bind(from, to, ...args);
  const sessions = (await q('SELECT COUNT(DISTINCT session) AS n FROM alg_events WHERE ts >= ? AND ts <= ?').first())?.n || 0;
  const count = async (ev) => (await q('SELECT COUNT(DISTINCT session) AS n FROM alg_events WHERE ts >= ? AND ts <= ? AND event = ?', ev).first())?.n || 0;
  const firstHits = (col) => q(`SELECT ${col} AS k, COUNT(DISTINCT session) AS n FROM alg_events WHERE ts >= ? AND ts <= ? AND event = 'page_view' AND ${col} IS NOT NULL GROUP BY ${col} ORDER BY n DESC LIMIT 20`).all();
  const bySession = (col) => q(`SELECT k, COUNT(*) AS n FROM (SELECT session, MIN(${col}) AS k FROM alg_events WHERE ts >= ? AND ts <= ? GROUP BY session) GROUP BY k ORDER BY n DESC`).all();
  const views = await q("SELECT item, COUNT(*) AS views, COUNT(DISTINCT session) AS sessions FROM alg_events WHERE ts >= ? AND ts <= ? AND event = 'view_item' AND item IS NOT NULL GROUP BY item").all();
  const adds = await q("SELECT item, COUNT(*) AS n FROM alg_events WHERE ts >= ? AND ts <= ? AND event = 'add_to_cart' AND item IS NOT NULL GROUP BY item").all();
  return {
    sessions,
    productViews: (await q("SELECT COUNT(*) AS n FROM alg_events WHERE ts >= ? AND ts <= ? AND event = 'view_item'").first())?.n || 0,
    addToCart: await count('add_to_cart'),
    checkoutStarted: await count('begin_checkout'),
    bySource: (await firstHits('source')).results,
    byCampaign: (await firstHits('campaign')).results,
    byDevice: (await bySession('device')).results,
    byCountry: (await bySession('country')).results,
    items: views.results.map((v) => ({ ...v, addToCart: adds.results.find((a) => a.item === v.item)?.n || 0 })),
  };
}
