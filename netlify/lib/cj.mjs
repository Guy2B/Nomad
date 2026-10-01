/**
 * CJdropshipping API v2 (developers.cjdropshipping.com, checked 2026-10):
 *  - token: POST /authentication/getAccessToken { apiKey } (180 days), cached in the store;
 *  - order: POST /shopping/order/createOrderV2 (products[].vid | sku, logisticName, fromCountryCode);
 *  - status: GET /shopping/order/getOrderDetail?orderId=… (orderStatus, trackNumber, logisticName).
 * CJ invoices you for each supplier order in your CJ account.
 */
import { HOST_STORE, product, supplierLines } from './catalog.mjs';

const API = 'https://developers.cjdropshipping.com/api2.0/v1';
const COUNTRY_NAMES = {
  DE: 'Germany',
  AT: 'Austria',
  FR: 'France',
  BE: 'Belgium',
  LU: 'Luxembourg',
  NL: 'Netherlands',
  ES: 'Spain',
  IT: 'Italy',
};

export class CJError extends Error {}

export const cjConfigured = () => Boolean(process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN);

/** Access token: env override, else cached token, else a fresh one from the API key. */
export async function accessToken(store) {
  if (process.env.CJ_ACCESS_TOKEN) return process.env.CJ_ACCESS_TOKEN;
  const cached = store ? await store.get('cj/token', { type: 'json' }) : null;
  if (cached?.token && cached.expiresAt > Date.now() + 86_400_000) return cached.token;
  const res = await fetch(`${API}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  });
  const data = await res.json().catch(() => ({}));
  const token = data?.data?.accessToken;
  if (!res.ok || !token) throw new CJError(data?.message || `CJ token HTTP ${res.status}`);
  const expiresAt = Date.parse(data.data.accessTokenExpiryDate || '') || Date.now() + 170 * 86_400_000;
  if (store) await store.setJSON('cj/token', { token, expiresAt });
  return token;
}

const mapped = (sup) => sup && (sup.cjVid || sup.cjSku) && sup.logisticName && sup.fromCountryCode;

/** Order items that cannot be ordered automatically (a bundle needs every part mapped). */
export function unmapped(order) {
  return order.items.filter((i) => {
    const lines = supplierLines(product(order.store || HOST_STORE, i.id));
    return !lines.length || lines.some((c) => !mapped(c.supplier));
  });
}

/** Supplier lines of an order: bundles expanded into their parts, same variant merged. */
export function supplierItems(order) {
  const out = new Map();
  for (const i of order.items) {
    for (const c of supplierLines(product(order.store || HOST_STORE, i.id))) {
      const s = c.supplier;
      const ref = s.cjVid ? `vid:${s.cjVid}` : `sku:${s.cjSku}`;
      const cur = out.get(ref);
      if (cur) cur.quantity += c.qty * i.qty;
      else
        out.set(ref, {
          ...(s.cjVid ? { vid: s.cjVid } : { sku: s.cjSku }),
          quantity: c.qty * i.qty,
          storeLineItemId: c.key === 'main' ? `${order.number}-${i.id}` : `${order.number}-${i.id}-${c.key}`,
          supplier: s,
        });
    }
  }
  return [...out.values()];
}

/** createOrderV2 body (exported for tests). One origin country per order: the first line's. */
export function orderPayload(order, env = process.env) {
  const a = order.shipping;
  const lines = supplierItems(order);
  const first = lines[0].supplier;
  return {
    orderNumber: order.number,
    shippingCountryCode: a.country,
    shippingCountry: COUNTRY_NAMES[a.country] ?? a.country,
    shippingProvince: a.state || a.city,
    shippingCity: a.city,
    shippingZip: a.postalCode,
    shippingAddress: a.line1,
    shippingAddress2: a.line2 || '',
    shippingCustomerName: a.name,
    shippingPhone: order.customer.phone || '',
    email: order.customer.email,
    remark: order.brand || 'NOMAD',
    logisticName: first.logisticName,
    fromCountryCode: first.fromCountryCode,
    // 2 = pay from CJ balance immediately (zero-touch), 3 = create only, pay in CJ.
    payType: env.CJ_AUTO_PAY === 'true' ? 2 : 3,
    iossType: Number(env.CJ_IOSS_TYPE || 3),
    shopAmount: (order.totalCents / 100).toFixed(2),
    products: lines.map(({ supplier, ...line }) => line),
  };
}

export async function createSupplierOrder(order, store) {
  const token = await accessToken(store);
  const res = await fetch(`${API}/shopping/order/createOrderV2`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CJ-Access-Token': token, platformToken: '' },
    body: JSON.stringify(orderPayload(order)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.result === false || data.success === false || data.code >= 400)
    throw new CJError(data?.message || `CJ HTTP ${res.status}`);
  return { cjOrderId: data?.data?.orderId || data?.data?.cjOrderId || null, raw: data?.data ?? null };
}

export async function supplierOrderDetail(cjOrderId, store) {
  const token = await accessToken(store);
  const res = await fetch(`${API}/shopping/order/getOrderDetail?orderId=${encodeURIComponent(cjOrderId)}`, {
    headers: { 'CJ-Access-Token': token },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.data) throw new CJError(data?.message || `CJ HTTP ${res.status}`);
  return {
    status: String(data.data.orderStatus || ''),
    trackNumber: data.data.trackNumber || null,
    logisticName: data.data.logisticName || null,
  };
}
