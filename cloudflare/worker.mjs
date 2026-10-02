/**
 * ALGBr shared backend on Cloudflare Pages (advanced mode, bundled to
 * dist/_worker.js): /api/* for every store + the /admin/ dashboard (static
 * assets), on api.algbr.eu. Storage is the D1 database bound as DB.
 *
 * Pages has no cron: the CJ status sync (tracking numbers) runs at most once
 * an hour, in the background, when the admin or a customer's tracking page
 * calls the API.
 */
import admin from '../netlify/functions/admin.mjs';
import checkout from '../netlify/functions/checkout.mjs';
import cjSync from '../netlify/functions/cj-sync.mjs';
import event from '../netlify/functions/event.mjs';
import reviews from '../netlify/functions/reviews.mjs';
import stripeWebhook from '../netlify/functions/stripe-webhook.mjs';
import track from '../netlify/functions/track.mjs';
import { crm, useStore } from '../netlify/lib/store.mjs';
import { d1Store } from './d1-store.mjs';

const ROUTES = {
  '/api/admin': admin,
  '/api/checkout': checkout,
  '/api/event': event,
  '/api/reviews': reviews,
  '/api/stripe/webhook': stripeWebhook,
  '/api/track': track,
};
const SYNC_ON = new Set(['/api/admin', '/api/track']);
const HOUR = 3600_000;

async function syncIfDue() {
  const store = crm();
  const last = await store.get('cj/lastSync', { type: 'json' });
  if (last && Date.now() - Date.parse(last.at) < HOUR) return;
  await store.setJSON('cj/lastSync', { at: new Date().toISOString() });
  await cjSync();
}

export default {
  async fetch(request, env, ctx) {
    // The shared code reads its settings from process.env (variables and secrets of the Pages project).
    for (const [k, v] of Object.entries(env)) if (typeof v === 'string') process.env[k] = v;
    useStore(d1Store(env.DB));
    const { pathname } = new URL(request.url);
    const route = ROUTES[pathname.replace(/\/$/, '')];
    if (!route) return env.ASSETS.fetch(request);
    if (SYNC_ON.has(pathname)) ctx.waitUntil(syncIfDue().catch((err) => console.error('cj-sync', err)));
    return route(request);
  },
};
