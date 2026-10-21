/**
 * POST /api/event (text/plain body: {"store","type","product","path","ref","utm"}),
 * sent by the storefronts with navigator.sendBeacon. Text/plain keeps it a
 * "simple" cross-origin request (no preflight); the Origin header must be one
 * of our storefronts. Two uses:
 *   - anonymous conversion funnel (view, product, add, checkout) per store and day;
 *   - audience statistics on each page view (visitors, pages, sources, countries,
 *     devices), see engine/lib/traffic.mjs. No cookie, no IP address stored.
 * Always answers 204: the beacon never retries.
 */
import { allowedOrigins, store as storeById } from '../lib/catalog.mjs';
import { parseEvent, recordEvent } from '../lib/metrics.mjs';
import { recordHit } from '../lib/traffic.mjs';
import { crm } from '../lib/store.mjs';

/** Page view for the audience statistics (also OFF., which is not in the catalogue). */
export function parseHit(raw, origin) {
  if (!origin || !allowedOrigins().has(origin)) return null;
  let e;
  try {
    e = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!e || e.type !== 'view' || !(e.store === 'off' || storeById(e.store))) return null;
  return {
    store: e.store,
    path: String(e.path || '/').slice(0, 300),
    referrer: String(e.ref || '').slice(0, 300),
    utm: String(e.utm || '').slice(0, 60),
  };
}

export default async (req) => {
  if (req.method === 'POST') {
    const raw = await req.text();
    const origin = req.headers.get('origin');
    const e = parseEvent(raw, origin);
    if (e) {
      try {
        await recordEvent(crm(), e);
      } catch (err) {
        console.error('event', err);
      }
    }
    const hit = parseHit(raw, origin);
    if (hit) {
      try {
        await recordHit({
          ...hit,
          ip: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '',
          ua: req.headers.get('user-agent') || '',
          country: req.cf?.country || req.headers.get('cf-ipcountry') || '',
        });
      } catch (err) {
        console.error('traffic', err);
      }
    }
  }
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/event' };
