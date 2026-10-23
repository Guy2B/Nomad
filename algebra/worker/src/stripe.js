// Stripe over plain fetch (no SDK: smaller Worker, no Node polyfills).
const API = 'https://api.stripe.com/v1';

/** application/x-www-form-urlencoded with Stripe's bracket notation */
export function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripeRequest(env, method, path, body, fetchImpl = fetch) {
  const r = await fetchImpl(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded', 'stripe-version': '2024-06-20' },
    body: body ? form(body).toString() : undefined,
  });
  const j = await r.json();
  if (!r.ok) {
    const e = new Error(j.error?.message || `Stripe ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return j;
}

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

/** Verify the Stripe-Signature header (t=…,v1=…). Tolerance 5 minutes. */
export async function verifyStripeSignature(payload, header, secret, now = Date.now(), tolerance = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - t) > tolerance) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return sigs.some((s) => timingSafeEqual(s, expected));
}
