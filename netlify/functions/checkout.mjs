/**
 * POST /api/checkout { store, cart: [{ id, qty }], lang } → { url } of a Stripe Checkout page.
 * Called by every storefront of the platform (CORS). Prices come from that
 * store's catalogue on the server; the invoice is created by Stripe.
 */
import { HOST_STORE, encodeCart, priceCart, store } from '../lib/catalog.mjs';
import { createCheckoutSession, sessionPayload } from '../lib/stripe.mjs';
import { json, preflight } from '../lib/http.mjs';

export default async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json(405, { error: 'method' }, req);
  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: 'bad-json' }, req);
  }
  const s = store(String(input?.store || HOST_STORE));
  if (!s) return json(400, { error: 'unknown-store' }, req);
  const lang = s.site.languages.includes(input?.lang) ? input.lang : s.site.defaultLang;
  const priced = priceCart(input?.cart, s.id);
  if (!priced.items.length) return json(400, { error: 'empty-cart' }, req);
  if (!process.env.STRIPE_SECRET_KEY) return json(503, { error: 'payments-not-configured' }, req);

  // Back to the storefront the customer came from (deploy previews of the host store included).
  const own = s.id === HOST_STORE && process.env.URL ? process.env.URL : s.site.baseUrl;
  const baseUrl = own.replace(/\/$/, '');
  const images = Object.fromEntries(
    priced.items.map((i) => [i.id, `${baseUrl}/assets/products/${s.byId.get(i.id).images[0]}`]),
  );
  try {
    const session = await createCheckoutSession(
      sessionPayload({ site: s.site, priced, lang, baseUrl, cart: encodeCart(priced.items), images }),
    );
    return json(200, { url: session.url }, req);
  } catch (err) {
    console.error('checkout', err);
    return json(502, { error: 'stripe' }, req);
  }
};

export const config = { path: '/api/checkout' };
