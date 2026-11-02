/**
 * Printegy provider (REST API, https://app.printegy.de/docs/api). Test order placed 30.10.2026 from the dashboard.
 *
 * Known from the docs: base https://app.printegy.de/api/v1, Bearer token, envelope { success, data, meta }, 300 req/min.
 *   GET  /shops                          our shop id (orders are attached to a shop)
 *   GET  /products                       products created in our account (each carries its own front/back design)
 *   POST /orders                         multipart: shop_id, shipping[...], items[i][sku], items[i][quantity]
 *   GET  /orders/{id}                    status { id, name }, dhl_tracking_number
 *   POST /orders/{id}/cancel
 * No webhooks: the 30-minute cron (sweep) polls GET /orders/{id}.
 *
 * The design lives in the Printegy product, so no print file is sent with an order: the Algebra variant SKU maps to the
 * Printegy product variant SKU (mapping.js SKU.printegy, filled from GET /products or the dashboard).
 *
 * Environment:
 *   PRINTEGY_API_KEY (secret)        the token from Printegy (Cloudflare only, never in Git)
 *   PRINTEGY_SANDBOX=true            default: orders behave like the mock, nothing real is ordered.
 *                                    Read-only calls (probe: /shops, /products) still run, to check the connection.
 *   PRINTEGY_SHOP_ID                 shop the orders belong to (from the probe)
 *   PRINTEGY_API_BASE_URL            optional override
 */
import { FulfillmentError, normaliseStatus } from './errors.js';
import { isConfirmed, mappingFor, supplierSkuFor } from './mapping.js';
import { mockProvider } from './mock.js';

export const BASE = 'https://app.printegy.de/api/v1';

const countryName = (code) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
};

/** Order → multipart form (field names from the docs). Pure: tested without network. */
export function orderForm(order, shopId) {
  const items = JSON.parse(order.items_json);
  const a = order.address_json ? JSON.parse(order.address_json) : null;
  if (!a || !a.line1 || !a.postal_code || !a.city || !a.country) throw new FulfillmentError('address', 'Incomplete shipping address');
  if (!shopId) throw new FulfillmentError('not_configured', 'PRINTEGY_SHOP_ID missing');
  const f = new FormData();
  f.append('shop_id', String(shopId));
  f.append('shipping[name]', order.name || '');
  if (a.company) f.append('shipping[company]', a.company);
  f.append('shipping[street]', [a.line1, a.line2].filter(Boolean).join(', '));
  f.append('shipping[zip_code]', a.postal_code);
  f.append('shipping[city]', a.city);
  f.append('shipping[country]', countryName(a.country));
  f.append('shipping[country_code]', a.country);
  items.forEach((it, i) => {
    const sku = supplierSkuFor(it.sku, 'printegy');
    if (!sku || !isConfirmed(it.sku, 'printegy')) throw new FulfillmentError('sku', `Variant ${it.sku} has no confirmed Printegy SKU`);
    f.append(`items[${i}][sku]`, sku);
    f.append(`items[${i}][quantity]`, String(it.qty));
  });
  return f;
}

/** GET /orders/{id} data → Algebra status + tracking. */
export function readOrder(d = {}) {
  const raw = d.status?.name ?? d.status ?? null;
  const tn = d.dhl_tracking_number || d.tracking_number || null;
  return {
    status: normaliseStatus(raw) || (tn ? 'shipped' : 'received'),
    rawStatus: raw,
    carrier: tn ? 'DHL' : null,
    trackingNumber: tn,
    trackingUrl: tn ? `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(tn)}` : null,
  };
}

export function printegyProvider(env = {}, fetchImpl = (...a) => fetch(...a)) {
  const base = env.PRINTEGY_API_BASE_URL || BASE;
  const sandbox = env.PRINTEGY_SANDBOX !== 'false' || !env.PRINTEGY_API_KEY;
  const call = async (path, init = {}) => {
    if (!env.PRINTEGY_API_KEY) throw new FulfillmentError('not_configured', 'PRINTEGY_API_KEY missing');
    let r;
    try {
      r = await fetchImpl(`${base}${path}`, { ...init, headers: { accept: 'application/json', authorization: `Bearer ${env.PRINTEGY_API_KEY}`, ...(init.headers || {}) } });
    } catch (e) {
      throw new FulfillmentError('api', `Printegy unreachable: ${e.message}`);
    }
    const text = await r.text();
    let j = null;
    try {
      j = JSON.parse(text);
    } catch {}
    if (r.status === 401 || r.status === 403) throw new FulfillmentError('not_configured', `Printegy ${path}: token refused (HTTP ${r.status})`);
    if (r.status >= 500) throw new FulfillmentError('api', `Printegy ${path}: HTTP ${r.status}`);
    if (!r.ok || (j && j.success === false)) throw new FulfillmentError('rejected', `Printegy ${path}: HTTP ${r.status} ${text.slice(0, 300)}`);
    return j?.data ?? j;
  };

  /** Read-only connection check for the cockpit: shops and our products with their variant SKUs. Never orders. */
  const probe = async () => {
    if (!env.PRINTEGY_API_KEY) return { ok: false, error: 'PRINTEGY_API_KEY missing' };
    try {
      const shops = await call('/shops');
      const products = await call('/products');
      const list = Array.isArray(products) ? products : products?.data || [];
      return {
        ok: true,
        shopId: env.PRINTEGY_SHOP_ID || null,
        shops: (Array.isArray(shops) ? shops : []).map((s) => ({ id: s.id, name: s.name || s.title || null })),
        products: list.map((p) => ({
          id: p.id,
          title: p.title || p.name || null,
          variants: (p.variants || []).map((v) => ({ sku: v.sku || null, color: v.color || v.color_name || v.name || null, size: v.size || v.size_name || null })),
        })),
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const noWebhook = {
    async handleWebhook() {
      throw new FulfillmentError('not_configured', 'Printegy has no webhooks: statuses are polled by the cron');
    },
  };

  if (sandbox) return { ...mockProvider(env, { name: 'printegy-sandbox' }), ...noWebhook, name: 'printegy-sandbox', sandbox: true, probe };

  const p = {
    name: 'printegy',
    sandbox: false,
    probe,
    async getProducts() {
      return call('/products');
    },
    async getProduct(id) {
      return call(`/products/${encodeURIComponent(id)}`);
    },
    async getVariants(productId, skus = []) {
      return skus.filter((s) => s.startsWith(productId)).map((sku) => ({ sku, supplierSku: supplierSkuFor(sku, 'printegy'), status: mappingFor(sku, 'printegy')?.variant.status || null }));
    },
    async getStock(sku) {
      return { sku, available: null }; // not in the API: stock problems come back on the order
    },
    async calculateShipping() {
      return null; // shop shipping prices come from data/catalog.mjs
    },
    async createOrder(order) {
      const r = await call('/orders', { method: 'POST', body: orderForm(order, env.PRINTEGY_SHOP_ID) });
      return { supplierOrderId: String(r?.id ?? r?.order_id ?? ''), status: readOrder(r || {}).status };
    },
    async getOrder(order) {
      const { status, carrier, trackingNumber, trackingUrl } = readOrder(await call(`/orders/${encodeURIComponent(order.supplier_order_id)}`));
      return { status, carrier, trackingNumber, trackingUrl };
    },
    async getTracking(order) {
      const s = await p.getOrder(order);
      return s.trackingNumber ? { carrier: s.carrier, trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl } : null;
    },
    async cancelOrder(order) {
      const r = await call(`/orders/${encodeURIComponent(order.supplier_order_id)}/cancel`, { method: 'POST' });
      return { cancelled: r?.cancelled ?? true };
    },
    ...noWebhook,
  };
  p.getStatus = p.getOrder;
  p.cancel = p.cancelOrder;
  return p;
}
