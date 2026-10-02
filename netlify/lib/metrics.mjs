/**
 * Anonymous conversion funnel, per store and per day — no cookie, no device
 * storage, no IP, no identifier: only counters of storefront events.
 *   metrics/<store>/<YYYY-MM-DD> → { view, product, add, checkout, products: { <id>: { product, add } } }
 * Orders (the last funnel step) come from the CRM, not from the browser.
 */
import { allowedOrigins, product, store as storeById } from './catalog.mjs';

export const EVENTS = ['view', 'product', 'add', 'checkout'];

const day = (d = new Date()) => d.toISOString().slice(0, 10);

/** Validates an event sent by a storefront; null when it must be ignored. */
export function parseEvent(raw, origin) {
  if (!origin || !allowedOrigins().has(origin)) return null;
  let e;
  try {
    e = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!e || !storeById(e.store) || !EVENTS.includes(e.type)) return null;
  const id = e.product && product(e.store, String(e.product)) ? String(e.product) : null;
  return { store: e.store, type: e.type, product: id };
}

export async function recordEvent(blobs, e, now = new Date()) {
  const key = `metrics/${e.store}/${day(now)}`;
  const m = (await blobs.get(key, { type: 'json' })) ?? { view: 0, product: 0, add: 0, checkout: 0, products: {} };
  m[e.type] += 1;
  if (e.product && (e.type === 'product' || e.type === 'add')) {
    const p = (m.products[e.product] ??= { product: 0, add: 0 });
    p[e.type] += 1;
  }
  await blobs.setJSON(key, m);
  return m;
}

/** Funnel totals of the last `days` days for one store (orders counted from the CRM). */
export async function funnel(blobs, storeId, orders, days = 30, now = new Date()) {
  const t = { view: 0, product: 0, add: 0, checkout: 0, orders: 0, revenueCents: 0, products: {} };
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const m = await blobs.get(`metrics/${storeId}/${day(d)}`, { type: 'json' });
    if (!m) continue;
    for (const k of EVENTS) t[k] += m[k] ?? 0;
    for (const [id, v] of Object.entries(m.products ?? {})) {
      const p = (t.products[id] ??= { product: 0, add: 0, sold: 0 });
      p.product += v.product;
      p.add += v.add;
    }
  }
  const since = now.getTime() - days * 86_400_000;
  for (const o of orders) {
    if ((o.store || 'nomad') !== storeId || Date.parse(o.createdAt) < since || !o.items.length) continue;
    t.orders += 1;
    t.revenueCents += o.totalCents;
    for (const i of o.items) (t.products[i.id] ??= { product: 0, add: 0, sold: 0 }).sold += i.qty;
  }
  const rate = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
  t.rates = {
    productPerView: rate(t.product, t.view),
    addPerProduct: rate(t.add, t.product),
    checkoutPerAdd: rate(t.checkout, t.add),
    orderPerCheckout: rate(t.orders, t.checkout),
    orderPerView: rate(t.orders, t.view),
  };
  return t;
}
