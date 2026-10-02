/**
 * GET  /api/reviews?store=…&product=…  → approved reviews + average (cached 10 min at the CDN)
 * POST /api/reviews {order, email, product, rating, title, text, name, consent, lang}
 *      → verified review, pending moderation in the admin.
 */
import { store as storeById } from '../lib/catalog.mjs';
import { json, preflight, corsHeaders } from '../lib/http.mjs';
import { ReviewError, publicReviews, submitReview } from '../lib/reviews.mjs';
import { crm } from '../lib/store.mjs';

export default async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const blobs = crm();
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const s = url.searchParams.get('store');
    const p = url.searchParams.get('product');
    if (!storeById(s) || !p) return json(400, { error: 'bad-input' }, req);
    const body = await publicReviews(blobs, s, p);
    return new Response(JSON.stringify(body), {
      headers: {
        'content-type': 'application/json',
        // Few function calls: the CDN answers repeated views for 10 minutes.
        'cache-control': 'public, max-age=300',
        'netlify-cdn-cache-control': 'public, s-maxage=600, stale-while-revalidate=3600',
        ...corsHeaders(req),
      },
    });
  }
  if (req.method === 'POST') {
    let input;
    try {
      input = await req.json();
    } catch {
      return json(400, { error: 'bad-json' }, req);
    }
    try {
      await submitReview(blobs, input);
      return json(201, { ok: true }, req);
    } catch (err) {
      if (err instanceof ReviewError) return json(400, { error: err.message }, req);
      console.error('review', err);
      return json(500, { error: 'server' }, req);
    }
  }
  return json(405, { error: 'method' }, req);
};

export const config = { path: '/api/reviews' };
