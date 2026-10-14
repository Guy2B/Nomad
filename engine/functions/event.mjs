/**
 * POST /api/event (text/plain body: {"store","type","product"}) — anonymous
 * funnel counter sent by the storefronts with navigator.sendBeacon. Text/plain
 * keeps it a "simple" cross-origin request (no preflight); the Origin header
 * must be one of our storefronts. Always answers 204: the beacon never retries.
 */
import { parseEvent, recordEvent } from '../lib/metrics.mjs';
import { crm } from '../lib/store.mjs';

export default async (req) => {
  if (req.method === 'POST') {
    const e = parseEvent(await req.text(), req.headers.get('origin'));
    if (e) {
      try {
        await recordEvent(crm(), e);
      } catch (err) {
        console.error('event', err);
      }
    }
  }
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/event' };
