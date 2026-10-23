/**
 * Valadio provider (REST API). PREPARED, NOT CONNECTED.
 *
 * What is known (valadio.com, 23.10.2026): production in Teplice (CZ), print on demand from 1 piece, fulfillment via API.
 * What is NOT known yet and must come from Valadio's official API documentation after account approval:
 * base URL, authentication scheme, endpoint paths, order payload, status values, webhook signature format.
 * Nothing below invents those: every remote call goes through ENDPOINTS, which stays empty until the docs arrive,
 * and refuses with FulfillmentError('not_configured') meanwhile.
 *
 * Environment (worker/wrangler.toml [vars] + secrets):
 *   VALADIO_SANDBOX=true          → sandbox: behaves like the mock provider, never sends a real order (default)
 *   VALADIO_API_BASE_URL          → from the docs
 *   VALADIO_API_KEY / VALADIO_API_SECRET   (secrets)
 *   VALADIO_WEBHOOK_SECRET        (secret) shared secret for webhook signatures
 *   VALADIO_WEBHOOK_SIGNATURE_HEADER       header carrying the signature (default x-valadio-signature, TO VERIFY)
 */
import { FulfillmentError, normaliseStatus } from './errors.js';
import { PRINT_MASTER, isConfirmed, mappingFor, supplierSkuFor } from './mapping.js';
import { mockProvider } from './mock.js';

/** Fill from the official documentation. Keys are ours; values are Valadio paths or (params) => path. */
export const ENDPOINTS = {
  products: null,
  product: null,
  stock: null,
  shipping: null,
  createOrder: null,
  getOrder: null,
  cancelOrder: null,
};

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** HMAC-SHA256(secret, rawBody) in hex; accepts "sha256=<hex>" or "<hex>". Scheme TO VERIFY with the docs. */
export async function verifySignature(secret, rawBody, header) {
  if (!secret || !header) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = hex(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)));
  const got = String(header).trim().replace(/^sha256=/i, '').toLowerCase();
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Webhook body → Algebra event. Field names are read defensively until the payload is documented. */
export function parseWebhook(body) {
  const pick = (...keys) => keys.map((k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), body)).find((v) => v != null && v !== '');
  const raw = pick('status', 'state', 'event', 'type', 'data.status', 'order.status');
  return {
    eventId: String(pick('id', 'eventId', 'event_id', 'data.id') || ''),
    supplierOrderId: String(pick('orderId', 'order_id', 'data.orderId', 'data.order_id', 'order.id', 'reference') || ''),
    status: normaliseStatus(raw),
    rawStatus: raw ?? null,
    carrier: pick('carrier', 'tracking.carrier', 'data.carrier', 'shipment.carrier') || null,
    trackingNumber: pick('trackingNumber', 'tracking_number', 'tracking.number', 'data.trackingNumber', 'shipment.trackingNumber') || null,
    trackingUrl: pick('trackingUrl', 'tracking_url', 'tracking.url', 'data.trackingUrl', 'shipment.trackingUrl') || null,
  };
}

export function valadioProvider(env = {}) {
  const sandbox = env.VALADIO_SANDBOX !== 'false' || !env.VALADIO_API_BASE_URL || !env.VALADIO_API_KEY;
  const notReady = (what) => {
    throw new FulfillmentError('not_configured', `Valadio ${what}: endpoint not documented yet (fill ENDPOINTS in worker/src/fulfillment/valadio.js from the official API docs)`);
  };
  const call = async (key, init = {}, params = {}, fetchImpl = fetch) => {
    if (!ENDPOINTS[key]) notReady(key);
    const path = typeof ENDPOINTS[key] === 'function' ? ENDPOINTS[key](params) : ENDPOINTS[key];
    let r;
    try {
      r = await fetchImpl(`${env.VALADIO_API_BASE_URL}${path}`, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${env.VALADIO_API_KEY}`, ...(init.headers || {}) } });
    } catch (e) {
      throw new FulfillmentError('api', `Valadio unreachable: ${e.message}`);
    }
    if (r.status >= 500) throw new FulfillmentError('api', `Valadio ${key}: HTTP ${r.status}`);
    if (!r.ok) throw new FulfillmentError('rejected', `Valadio ${key}: HTTP ${r.status} ${await r.text()}`);
    return r.json();
  };

  const base = sandbox ? mockProvider(env, { name: 'valadio-sandbox' }) : null;
  const webhook = {
    async handleWebhook({ rawBody, headers }) {
      const header = headers.get((env.VALADIO_WEBHOOK_SIGNATURE_HEADER || 'x-valadio-signature').toLowerCase());
      if (!env.VALADIO_WEBHOOK_SECRET) throw new FulfillmentError('not_configured', 'VALADIO_WEBHOOK_SECRET missing');
      if (!(await verifySignature(env.VALADIO_WEBHOOK_SECRET, rawBody, header))) throw new FulfillmentError('signature', 'Bad webhook signature');
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        throw new FulfillmentError('rejected', 'Webhook body is not JSON');
      }
      return { ...parseWebhook(body), raw: body };
    },
  };
  if (base) return { ...base, ...webhook, name: 'valadio-sandbox', sandbox: true };

  const p = {
    name: 'valadio',
    sandbox: false,
    async getProducts() {
      return call('products');
    },
    async getProduct(id) {
      return call('product', { method: 'GET' }, { id });
    },
    async getVariants(productId, skus = []) {
      return skus.filter((s) => s.startsWith(productId)).map((sku) => ({ sku, supplierSku: supplierSkuFor(sku), status: mappingFor(sku)?.variant.status || null }));
    },
    async getStock(sku) {
      return call('stock', { method: 'GET' }, { sku, supplierSku: supplierSkuFor(sku) });
    },
    async calculateShipping(q) {
      return call('shipping', { method: 'POST', body: JSON.stringify(q) });
    },
    async createOrder(order) {
      const items = JSON.parse(order.items_json);
      const a = order.address_json ? JSON.parse(order.address_json) : null;
      if (!a || !a.line1 || !a.postal_code || !a.city || !a.country) throw new FulfillmentError('address', 'Incomplete shipping address');
      const lines = items.map((it) => {
        const m = mappingFor(it.sku);
        if (!m || !isConfirmed(it.sku)) throw new FulfillmentError('sku', `Variant ${it.sku} is not confirmed for Valadio (status ${m ? m.variant.status : 'unknown'})`);
        // Graphic Series: only a print-master file may be sent, never the design source
        const design = it.printFile?.design || null;
        const printMaster = design ? PRINT_MASTER[design] : null;
        if (design && !printMaster) throw new FulfillmentError('rejected', `No print-master for ${design}`);
        return { supplierSku: supplierSkuFor(it.sku), quantity: it.qty, method: m.method, printMaster, embroideryFile: it.embroideryFile || null };
      });
      // Payload shape is a draft: rename fields to Valadio's schema when the docs arrive.
      const payload = { reference: order.number, whiteLabel: true, shippingAddress: { name: order.name, ...a }, lines };
      const r = await call('createOrder', { method: 'POST', body: JSON.stringify(payload) });
      return { supplierOrderId: String(r.id ?? r.orderId ?? ''), status: normaliseStatus(r.status) || 'received' };
    },
    async getOrder(order) {
      const r = await call('getOrder', { method: 'GET' }, { id: order.supplier_order_id });
      const e = parseWebhook(r);
      return { status: e.status || 'received', carrier: e.carrier, trackingNumber: e.trackingNumber, trackingUrl: e.trackingUrl };
    },
    async getTracking(order) {
      const s = await p.getOrder(order);
      return s.trackingNumber ? { carrier: s.carrier, trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl } : null;
    },
    async cancelOrder(order) {
      const r = await call('cancelOrder', { method: 'POST' }, { id: order.supplier_order_id });
      return { cancelled: Boolean(r.cancelled ?? r.ok ?? true) };
    },
    ...webhook,
  };
  p.getStatus = p.getOrder;
  p.cancel = p.cancelOrder;
  return p;
}
