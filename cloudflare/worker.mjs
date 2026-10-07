/**
 * ALGBr shared backend on Cloudflare Workers: /api/* for every store, the
 * /admin/ dashboard (static assets), and the hourly CJ status sync (cron).
 * Storage is the D1 database bound as DB; OFF. photos are in the KV namespace OFF_MEDIA.
 */
import admin from '../netlify/functions/admin.mjs';
import checkout from '../netlify/functions/checkout.mjs';
import cjSync from '../netlify/functions/cj-sync.mjs';
import event from '../netlify/functions/event.mjs';
import reviews from '../netlify/functions/reviews.mjs';
import stripeWebhook from '../netlify/functions/stripe-webhook.mjs';
import track from '../netlify/functions/track.mjs';
import off from '../netlify/functions/off.mjs';
import radar from '../netlify/functions/radar.mjs';
import { useOff } from '../netlify/lib/off.mjs';
import { useStore } from '../netlify/lib/store.mjs';
import { d1Store } from './d1-store.mjs';

const ROUTES = {
  '/api/admin': admin,
  '/api/checkout': checkout,
  '/api/event': event,
  '/api/reviews': reviews,
  '/api/stripe/webhook': stripeWebhook,
  '/api/track': track,
  '/api/off/checkout': off,
  '/api/off/sourcing': off,
  '/api/off/admin': off,
  '/api/off/upload': off,
  '/api/radar': radar,
};

// The shared code reads its settings from process.env (variables and secrets of the Worker).
function setup(env) {
  for (const [k, v] of Object.entries(env)) if (typeof v === 'string') process.env[k] = v;
  useStore(d1Store(env.DB));
  useOff({ db: env.DB, media: env.OFF_MEDIA });
}

export default {
  async fetch(request, env) {
    setup(env);
    const route = ROUTES[new URL(request.url).pathname.replace(/\/$/, '')];
    return route ? route(request) : env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env, ctx) {
    setup(env);
    ctx.waitUntil(cjSync());
  },
};
