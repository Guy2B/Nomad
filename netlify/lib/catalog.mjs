/**
 * Catalogue and price calculation — the server is the only authority on prices:
 * the browser sends product ids and quantities, never amounts.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const PRODUCTS = require('../../catalog/products.json');
export const SITE = require('../../catalog/site.json');

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
export const product = (id) => byId.get(id) ?? null;

/** Cart lines → priced items. Unknown, inactive or malformed lines are dropped. */
export function priceCart(cart) {
  const items = [];
  for (const line of Array.isArray(cart) ? cart.slice(0, 20) : []) {
    const p = product(String(line?.id ?? ''));
    if (!p || !p.active) continue;
    const qty = Math.max(1, Math.min(9, Math.floor(Number(line.qty) || 1)));
    const existing = items.find((i) => i.id === p.id);
    if (existing) existing.qty = Math.min(9, existing.qty + qty);
    else items.push({ id: p.id, sku: p.sku, name: p.name, unitCents: p.price, qty });
  }
  for (const i of items) i.lineCents = i.unitCents * i.qty;
  const subtotalCents = items.reduce((a, i) => a + i.lineCents, 0);
  const shippingCents = items.length ? SITE.shipping.cents : 0;
  return { items, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}

/** Compact cart for Stripe metadata (500 chars max): "id:qty,id:qty". */
export const encodeCart = (items) => items.map((i) => `${i.id}:${i.qty}`).join(',').slice(0, 500);
export const decodeCart = (s) =>
  String(s || '')
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [id, qty] = part.split(':');
      return { id, qty: Number(qty) || 1 };
    });

/** Human order number: NM-YYMMDD-XXXX. */
export function orderNumber(date = new Date(), rand = Math.random) {
  const d = date.toISOString().slice(2, 10).replace(/-/g, '');
  const tail = Math.floor(rand() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `NM-${d}-${tail}`;
}
