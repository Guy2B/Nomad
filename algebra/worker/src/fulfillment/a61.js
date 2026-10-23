/**
 * A61 Partner provider: FALLBACK, DISABLED BY DEFAULT.
 * Kept until Valadio is fully validated (API access, real prices, exact references, availability, embroidery,
 * large back print, shipping, tracking, webhooks, knitwear, one successful real test order).
 * Selected only with FULFILLMENT_PROVIDER=a61. Even then it refuses real orders: A61's API documentation was never
 * received (A61_API_BASE / A61_API_KEY empty) and every A61 mapping has status 'disabled'.
 */
import { FulfillmentError } from './errors.js';
import { A61, isConfirmed } from './mapping.js';

export function a61Provider(env = {}) {
  const ready = Boolean(env.A61_API_BASE && env.A61_API_KEY);
  const refuse = (what) => {
    throw new FulfillmentError('not_configured', `A61 fallback ${what}: disabled (no API documentation, mapping status 'disabled')`);
  };
  const p = {
    name: 'a61',
    sandbox: false,
    async getProducts() {
      return Object.entries(A61).map(([id, m]) => ({ algebraProductId: id, provider: 'a61', status: m.status }));
    },
    async getProduct(id) {
      return A61[id] || null;
    },
    async getVariants(productId, skus = []) {
      return skus.filter((s) => s.startsWith(productId)).map((sku) => ({ sku, status: 'disabled' }));
    },
    async getStock() {
      refuse('stock');
    },
    async calculateShipping() {
      refuse('shipping');
    },
    async createOrder(order) {
      const items = JSON.parse(order.items_json);
      for (const it of items) if (!isConfirmed(it.sku, 'a61')) throw new FulfillmentError('sku', `A61 fallback: ${it.sku} not confirmed`);
      if (!ready) refuse('createOrder');
      refuse('createOrder');
    },
    async getOrder() {
      refuse('getOrder');
    },
    async getTracking() {
      refuse('getTracking');
    },
    async cancelOrder() {
      refuse('cancelOrder');
    },
    async handleWebhook() {
      refuse('webhook');
    },
  };
  p.getStatus = p.getOrder;
  p.cancel = p.cancelOrder;
  return p;
}
