/**
 * Mock provider: the full order flow without any real production. Used for local tests and as the Valadio sandbox.
 * Test hooks in the shipping address line 1: test-out-of-stock · test-api-down
 */
import { FulfillmentError } from './errors.js';
import { MAPPING, mappingFor, supplierSkuFor } from './mapping.js';

const STEPS = ['received', 'production', 'shipped', 'delivered'];

export function mockProvider(env = {}, { name = 'mock' } = {}) {
  const tracking = (order) => {
    const n = order.number.replace(/\D/g, '');
    return { carrier: 'Sandbox', trackingNumber: `SANDBOX${n}`, trackingUrl: `${env.SITE_ORIGIN || ''}/de/tracking/?sandbox=${n}` };
  };
  const p = {
    name,
    sandbox: true,
    async getProducts() {
      return Object.entries(MAPPING).map(([productId, m]) => ({ productId, provider: m.provider, confirmed: m.confirmed }));
    },
    async getProduct(productId) {
      return MAPPING[productId] || null;
    },
    async getVariants(productId, skus = []) {
      return skus.filter((s) => s.startsWith(productId)).map((sku) => ({ sku, supplierSku: supplierSkuFor(sku), confirmed: false }));
    },
    async getStock(sku) {
      return { sku, available: mappingFor(sku) ? true : null };
    },
    async calculateShipping() {
      return null; // shop shipping prices come from data/catalog.mjs
    },
    async createOrder(order) {
      const items = JSON.parse(order.items_json);
      const a = order.address_json ? JSON.parse(order.address_json) : null;
      if (!a || !a.line1 || !a.postal_code || !a.city || !a.country) throw new FulfillmentError('address', 'Incomplete shipping address');
      const line = a.line1.toLowerCase();
      if (line.includes('test-out-of-stock')) throw new FulfillmentError('out_of_stock', 'Sandbox: base garment out of stock');
      if (line.includes('test-api-down')) throw new FulfillmentError('api', 'Sandbox: provider API unavailable');
      for (const it of items) if (!mappingFor(it.sku)) throw new FulfillmentError('sku', `No fulfillment mapping for ${it.sku}`);
      return { supplierOrderId: `SBX-${order.number}`, status: 'received' };
    },
    async getOrder(order) {
      const i = Math.min(STEPS.length - 1, Math.max(0, STEPS.indexOf(order.supplier_status || 'received')) + 1);
      const status = STEPS[i];
      return { status, ...(i >= 2 ? tracking(order) : {}) };
    },
    async getTracking(order) {
      return ['shipped', 'delivered'].includes(order.supplier_status) ? tracking(order) : null;
    },
    async cancelOrder(order) {
      return { cancelled: (order.supplier_status || 'received') === 'received' };
    },
    async handleWebhook() {
      throw new FulfillmentError('not_configured', 'The sandbox has no webhooks');
    },
  };
  // names used by the order flow (orders.js)
  p.getStatus = p.getOrder;
  p.cancel = p.cancelOrder;
  return p;
}
