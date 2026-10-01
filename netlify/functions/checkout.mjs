/**
 * POST /api/checkout { cart: [{ id, qty }], lang } → { url } of a Stripe Checkout page.
 * Prices come from the catalogue on the server; the invoice is created by Stripe.
 */
import { SITE, encodeCart, priceCart, product } from '../lib/catalog.mjs';
import { createCheckoutSession, sessionPayload } from '../lib/stripe.mjs';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: 'bad-json' });
  }
  const lang = SITE.languages.includes(input?.lang) ? input.lang : SITE.defaultLang;
  const priced = priceCart(input?.cart);
  if (!priced.items.length) return json(400, { error: 'empty-cart' });
  if (!process.env.STRIPE_SECRET_KEY) return json(503, { error: 'payments-not-configured' });

  const baseUrl = (process.env.URL || SITE.baseUrl).replace(/\/$/, '');
  const images = Object.fromEntries(
    priced.items.map((i) => [i.id, `${baseUrl}/assets/products/${product(i.id).images[0]}`]),
  );
  try {
    const session = await createCheckoutSession(
      sessionPayload({ priced, lang, baseUrl, cart: encodeCart(priced.items), images }),
    );
    return json(200, { url: session.url });
  } catch (err) {
    console.error('checkout', err);
    return json(502, { error: 'stripe' });
  }
};

export const config = { path: '/api/checkout' };
