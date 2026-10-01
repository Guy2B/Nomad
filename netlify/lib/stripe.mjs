/**
 * Stripe over plain HTTPS (no SDK): Checkout Session with automatic invoice,
 * webhook signature verification, and session retrieval.
 */
import crypto from 'node:crypto';
import { SITE } from './catalog.mjs';

const API = 'https://api.stripe.com/v1';

/** Nested objects → Stripe's form encoding (a[b][0][c]=…). */
export function formEncode(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') formEncode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe(path, { method = 'GET', body } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: body ? formEncode(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe HTTP ${res.status}`);
  return data;
}

/** The Checkout Session payload (exported for tests). */
export function sessionPayload({ priced, lang, baseUrl, cart, images }) {
  const names = { de: 'de', fr: 'fr', en: 'en' };
  return {
    mode: 'payment',
    locale: names[lang] ?? 'auto',
    success_url: `${baseUrl}/${lang}/danke.html?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/${lang}/warenkorb.html`,
    line_items: priced.items.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: SITE.currency,
        unit_amount: i.unitCents,
        product_data: {
          name: i.name,
          metadata: { sku: i.sku },
          ...(images[i.id] ? { images: [images[i.id]] } : {}),
        },
      },
    })),
    shipping_address_collection: { allowed_countries: SITE.shipping.countries },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: lang === 'de' ? 'Versand mit Sendungsverfolgung' : lang === 'fr' ? 'Livraison suivie' : 'Tracked shipping',
          fixed_amount: { amount: priced.shippingCents, currency: SITE.currency },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    billing_address_collection: 'required',
    // The customer invoice: Stripe numbers it, emails it and keeps the PDF.
    invoice_creation: {
      enabled: true,
      invoice_data: {
        footer: SITE.invoice.footer,
        metadata: { cart },
      },
    },
    metadata: { cart, lang },
    payment_intent_data: { metadata: { cart } },
  };
}

export const createCheckoutSession = (payload) => stripe('/checkout/sessions', { method: 'POST', body: payload });
export const getSession = (id) =>
  stripe(`/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items&expand[]=invoice`);

/** Verifies the Stripe-Signature header (HMAC-SHA256 of "t.payload", 5-minute tolerance). */
export function verifySignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  if (!t || Math.abs(nowSec - t) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const given = header
    .split(',')
    .filter((kv) => kv.trim().startsWith('v1='))
    .map((kv) => kv.trim().slice(3));
  return given.some((sig) => {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
