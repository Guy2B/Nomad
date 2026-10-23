/**
 * Supplier adapters. The order flow only talks to this interface:
 *   createOrder(order)  -> { supplierOrderId, status }
 *   getStatus(order)    -> { status, carrier?, trackingNumber?, trackingUrl? }
 *   cancel(order)       -> { cancelled: boolean }
 * Errors are SupplierError with kind: 'address' | 'out_of_stock' | 'api' | 'not_implemented' | 'rejected'.
 *
 * SUPPLIER_MODE=mock  : simulated supplier, every call succeeds, each getStatus() advances one step.
 * SUPPLIER_MODE=a61   : A61 Partner. NEEDS SUPPLIER APPROVAL: API documentation not public (22.10.2026),
 *                       so the calls below are a documented skeleton that refuses to run until it is filled in.
 */
export class SupplierError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

/** Statuses the supplier can report, mapped to order statuses in orders.js */
export const SUPPLIER_STATUSES = ['received', 'in_production', 'shipped', 'delivered', 'cancelled', 'problem'];

export function mockSupplier() {
  const steps = ['received', 'in_production', 'shipped', 'delivered'];
  return {
    name: 'mock',
    async createOrder(order) {
      const items = JSON.parse(order.items_json);
      const a = order.address_json ? JSON.parse(order.address_json) : null;
      if (!a || !a.line1 || !a.postal_code || !a.city || !a.country) throw new SupplierError('address', 'Incomplete shipping address');
      if (a.line1.toLowerCase().includes('test-out-of-stock')) throw new SupplierError('out_of_stock', 'Simulated: blank out of stock');
      if (a.line1.toLowerCase().includes('test-api-down')) throw new SupplierError('api', 'Simulated: supplier API unavailable');
      for (const it of items) if (!it.supplierArticleId || it.supplierArticleId === 'TO VERIFY') throw new SupplierError('rejected', `No supplier article for ${it.sku}`);
      return { supplierOrderId: `MOCK-${order.number}`, status: 'received' };
    },
    async getStatus(order) {
      const i = Math.min(steps.length - 1, steps.indexOf(order.supplier_status || 'received') + 1);
      const status = steps[i];
      const shipped = i >= 2;
      return {
        status,
        carrier: shipped ? 'DHL' : null,
        trackingNumber: shipped ? `MOCK${order.number.replace(/\D/g, '')}` : null,
        trackingUrl: shipped ? `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=MOCK${order.number.replace(/\D/g, '')}` : null,
      };
    },
    async cancel(order) {
      return { cancelled: (order.supplier_status || 'received') === 'received' };
    },
  };
}

/**
 * A61 Partner adapter: NOT CONNECTED. What has to be filled in once A61 sends the API documentation
 * (docs/SUPPLIERS.md, open point 7): base URL, auth header, order payload (article id, variant id per colour/size,
 * print/embroidery file URLs, white-label options, shipping address), status values and tracking fields.
 */
export function a61Supplier(env) {
  const ready = env.A61_API_BASE && env.A61_API_KEY;
  const notReady = () => {
    throw new SupplierError('not_implemented', 'A61 API not configured: NEEDS SUPPLIER APPROVAL (docs) and NEEDS CREDENTIALS (A61_API_BASE, A61_API_KEY)');
  };
  return {
    name: 'a61',
    async createOrder(order) {
      if (!ready) notReady();
      // Payload mapping is written but unverified; it must be checked against A61's documentation before use.
      notReady(order);
    },
    async getStatus() {
      if (!ready) notReady();
      notReady();
    },
    async cancel() {
      if (!ready) notReady();
      notReady();
    },
  };
}

export function supplierFor(env) {
  return (env.SUPPLIER_MODE || 'mock') === 'a61' ? a61Supplier(env) : mockSupplier();
}
