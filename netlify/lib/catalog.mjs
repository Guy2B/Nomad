/**
 * Catalogues of every store on the Nomad platform, and price calculation — the
 * server is the only authority on prices: the browser sends a store id, product
 * ids and quantities, never amounts.
 *
 * A store = stores/<id>/site.json + stores/<id>/products.json. A product is
 * either one supplier item (`supplier`) or a bundle of several (`components`).
 * Adding a store = a folder in stores/ + one line below (static imports, so the
 * catalogues are bundled into the functions).
 */
import nomadSite from '../../stores/nomad/site.json' with { type: 'json' };
import nomadProducts from '../../stores/nomad/products.json' with { type: 'json' };
import appartSite from '../../stores/appart-reset/site.json' with { type: 'json' };
import appartProducts from '../../stores/appart-reset/products.json' with { type: 'json' };
import bodySite from '../../stores/body-care/site.json' with { type: 'json' };
import bodyProducts from '../../stores/body-care/products.json' with { type: 'json' };

/** The first store is the host: it serves the API and the admin for all of them. */
const DEFINITIONS = [
  [nomadSite, nomadProducts],
  [appartSite, appartProducts],
  [bodySite, bodyProducts],
];

const STORES = new Map(
  DEFINITIONS.map(([site, products]) => [
    site.id,
    { id: site.id, site, products, byId: new Map(products.map((p) => [p.id, p])) },
  ]),
);

export const HOST_STORE = DEFINITIONS[0][0].id;
export const store = (id) => STORES.get(id) ?? null;
export const allStores = () => [...STORES.values()];
export const product = (storeId, id) => store(storeId)?.byId.get(id) ?? null;

/** What the supplier must ship for one unit of a product: [{ key, name, qty, supplier }]. */
export function supplierLines(p) {
  if (Array.isArray(p?.components)) return p.components;
  return p?.supplier ? [{ key: 'main', name: p.name, qty: 1, supplier: p.supplier }] : [];
}

/** Estimated supplier cost of one unit (bundle target if set, else the sum of its parts). */
export function unitCost(p) {
  if (!p) return 0;
  if (Number.isFinite(p.costCents)) return p.costCents;
  return supplierLines(p).reduce((a, c) => a + (c.supplier.costCents ?? 0) * c.qty, 0);
}

/** Cart lines → priced items. Unknown stores, unknown, inactive or malformed lines are dropped. */
export function priceCart(cart, storeId = HOST_STORE) {
  const s = store(storeId);
  const items = [];
  for (const line of s && Array.isArray(cart) ? cart.slice(0, 20) : []) {
    const p = s.byId.get(String(line?.id ?? ''));
    if (!p || !p.active) continue;
    const qty = Math.max(1, Math.min(9, Math.floor(Number(line.qty) || 1)));
    const existing = items.find((i) => i.id === p.id);
    if (existing) existing.qty = Math.min(9, existing.qty + qty);
    else items.push({ id: p.id, sku: p.sku, name: p.name, unitCents: p.price, qty });
  }
  for (const i of items) i.lineCents = i.unitCents * i.qty;
  const subtotalCents = items.reduce((a, i) => a + i.lineCents, 0);
  const shippingCents = items.length ? s.site.shipping.cents : 0;
  return { store: s?.id ?? null, items, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
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

/** Human order number: <PREFIX>-YYMMDD-XXXX (GO, SP for SPACE, EA for EASE…). */
export function orderNumber(prefix = 'NM', date = new Date(), rand = Math.random) {
  const d = date.toISOString().slice(2, 10).replace(/-/g, '');
  const tail = Math.floor(rand() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `${prefix}-${d}-${tail}`;
}

export const ORDER_NUMBER = /^[A-Z]{2}-\d{6}-[A-Z0-9]{4}$/;

/** Origins allowed to call the API from a browser: every store's site (+ this deploy). */
export function allowedOrigins(env = process.env) {
  const list = allStores().flatMap((s) => [s.site.baseUrl, ...(s.site.aliases ?? [])].map((u) => new URL(u).origin));
  for (const u of [env.URL, env.DEPLOY_PRIME_URL, ...(env.EXTRA_ORIGINS || '').split(',')])
    if (u && /^https?:\/\//.test(u.trim())) list.push(new URL(u.trim()).origin);
  return new Set(list);
}
