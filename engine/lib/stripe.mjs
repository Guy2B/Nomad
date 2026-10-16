/**
 * Stripe over plain HTTPS (no SDK): Checkout Session with automatic invoice,
 * webhook signature verification, and session retrieval.
 */
import crypto from 'node:crypto';

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
/** `site` is the store's site.json: currency, shipping countries, invoice footer. */
export function sessionPayload({ site, priced, lang, baseUrl, cart, images }) {
  const names = { de: 'de', fr: 'fr', en: 'en' };
  // The slowest item sets the delivery time announced at checkout ("6–10" < "8–14").
  const upper = (d) => Number(String(d).match(/\d+/g)?.pop() ?? 0);
  const days = priced.items.reduce((d, i) => (i.deliveryDays && upper(i.deliveryDays) > upper(d) ? i.deliveryDays : d), site.shipping.deliveryDays);
  return {
    mode: 'payment',
    locale: names[lang] ?? 'auto',
    success_url: `${baseUrl}/${lang}/danke.html?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/${lang}/warenkorb.html`,
    line_items: priced.items.map((i) => ({
      quantity: i.qty,
      price_data: {
        currency: site.currency,
        unit_amount: i.unitCents,
        product_data: {
          name: i.name,
          metadata: { sku: i.sku, store: site.id },
          ...(images[i.id] ? { images: [images[i.id]] } : {}),
        },
      },
    })),
    shipping_address_collection: { allowed_countries: site.shipping.countries },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: lang === 'de' ? 'Versand mit Sendungsverfolgung' : lang === 'fr' ? 'Livraison suivie' : 'Tracked shipping',
          fixed_amount: { amount: priced.shippingCents, currency: site.currency },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    // Promotion codes created in the Stripe dashboard can be entered on the payment page.
    allow_promotion_codes: true,
    custom_text: {
      shipping_address: {
        message: {
          de: 'Bitte Straße mit Hausnummer angeben (z. B. Hauptstraße 12), sonst kann der Versand nicht starten.',
          fr: 'Indiquez la rue avec le numéro (ex. 12 rue de la Paix), sinon l’expédition ne peut pas partir.',
          en: 'Please include your house number (e.g. 12 Main Street), otherwise we cannot ship.',
        }[lang] ?? '',
      },
      submit: {
        message: {
          de: `Versand mit Sendungsverfolgung in ${days} Werktagen · 14 Tage Widerrufsrecht · Rechnung per E-Mail`,
          fr: `Livraison suivie en ${days} jours ouvrés · 14 jours de rétractation · Facture par e-mail`,
          en: `Tracked shipping in ${days} working days · 14-day withdrawal · Invoice by e-mail`,
        }[lang] ?? '',
      },
    },
    billing_address_collection: 'required',
    // The customer invoice: Stripe numbers it, emails it and keeps the PDF.
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: site.brand,
        footer: site.invoice.footer,
        metadata: { cart, store: site.id },
      },
    },
    metadata: { cart, lang, store: site.id },
    payment_intent_data: { metadata: { cart, store: site.id }, description: site.brand },
  };
}

export const createCheckoutSession = (payload) => stripe('/checkout/sessions', { method: 'POST', body: payload });
/** Full refund of a payment (Stripe sends the money back to the card used). */
export const refundPayment = (paymentIntent, metadata = {}) =>
  stripe('/refunds', { method: 'POST', body: { payment_intent: paymentIntent, reason: 'requested_by_customer', metadata } });
/** The Checkout Session that created a PaymentIntent (to find the CRM order of a dispute). */
export const sessionsForPaymentIntent = (pi) => stripe(`/checkout/sessions?payment_intent=${encodeURIComponent(pi)}&limit=1`);
/** Saves dispute evidence; with submit=false it stays a draft the owner reviews in Stripe. */
export const updateDispute = (id, body) => stripe(`/disputes/${encodeURIComponent(id)}`, { method: 'POST', body });
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
