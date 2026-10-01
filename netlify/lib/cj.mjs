/**
 * CJdropshipping API v2 (developers.cjdropshipping.com, checked 2026-10):
 *  - token: POST /authentication/getAccessToken { apiKey } (180 days), cached in the store;
 *  - order: POST /shopping/order/createOrderV2 (products[].vid | sku, logisticName, fromCountryCode);
 *  - status: GET /shopping/order/getOrderDetail?orderId=… (orderStatus, trackNumber, logisticName).
 * CJ invoices you for each supplier order in your CJ account.
 */
import { product } from './catalog.mjs';

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

/** Products without a CJ variant id or SKU cannot be ordered automatically. */
export function unmapped(items) {
  return items.filter((i) => {
    const s = product(i.id)?.supplier;
    return !s || !(s.cjVid || s.cjSku) || !s.logisticName || !s.fromCountryCode;
  });
}

/** createOrderV2 body (exported for tests). One origin country per order: the first item's. */
export function orderPayload(order, env = process.env) {
  const a = order.shipping;
  const first = product(order.items[0].id).supplier;
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
    remark: 'NOMADA',
    logisticName: first.logisticName,
    fromCountryCode: first.fromCountryCode,
    // 2 = pay from CJ balance immediately (zero-touch), 3 = create only, pay in CJ.
    payType: env.CJ_AUTO_PAY === 'true' ? 2 : 3,
    iossType: Number(env.CJ_IOSS_TYPE || 3),
    shopAmount: (order.totalCents / 100).toFixed(2),
    products: order.items.map((i) => {
      const s = product(i.id).supplier;
      return { ...(s.cjVid ? { vid: s.cjVid } : { sku: s.cjSku }), quantity: i.qty, storeLineItemId: `${order.number}-${i.id}` };
    }),
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
