/**
 * JSON responses with CORS for the storefronts: every store is its own site
 * (its own domain) and calls this one shared API.
 */
import { allowedOrigins } from './catalog.mjs';

export function corsHeaders(req) {
  const origin = req.headers.get('origin');
  if (!origin || !allowedOrigins().has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

export const json = (status, body, req) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...(req ? corsHeaders(req) : {}) },
  });

/** Answers the CORS preflight; null for any other method. */
export const preflight = (req) => (req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders(req) }) : null);
