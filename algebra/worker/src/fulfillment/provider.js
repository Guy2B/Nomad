/**
 * FulfillmentProvider: the only door between Algebra and whoever produces and ships the pieces.
 * Swap the provider by changing FULFILLMENT_PROVIDER; the storefront, checkout and order flow do not change.
 *
 *   getProducts()                       → [{ productId, provider, confirmed }]          (admin)
 *   getProduct(productId)               → mapping entry                                   (admin)
 *   getVariants(productId)              → [{ sku, supplierSku, confirmed }]               (admin)
 *   getStock(sku)                       → { sku, available: boolean | null }
 *   calculateShipping({ country, items }) → { amount, currency } | null
 *   createOrder(order)                  → { supplierOrderId, status }
 *   getOrder(order)                     → { status, carrier?, trackingNumber?, trackingUrl? }
 *   getTracking(order)                  → { carrier, trackingNumber, trackingUrl } | null
 *   cancelOrder(order)                  → { cancelled: boolean }
 *   handleWebhook({ rawBody, headers }) → { eventId, supplierOrderId, status, carrier?, trackingNumber?, trackingUrl?, raw }
 *
 * Statuses are always Algebra statuses (never the provider's own words):
 *   received · production · shipped · delivered · cancelled · error
 * Errors are FulfillmentError with kind: address | out_of_stock | api | not_configured | rejected | sku | signature.
 */
export { FulfillmentError, STATUSES, normaliseStatus } from './errors.js';
import { mockProvider } from './mock.js';
import { valadioProvider } from './valadio.js';
import { a61Provider } from './a61.js';

/**
 * FULFILLMENT_PROVIDER=valadio (default, target) · a61 (fallback, disabled: refuses real orders) · mock (local tests).
 * valadio with VALADIO_SANDBOX=true (or without credentials) behaves like the mock: nothing real is ordered.
 */
export function providerFor(env = {}) {
  const name = env.FULFILLMENT_PROVIDER || (env.SUPPLIER_MODE === 'mock' ? 'mock' : 'valadio');
  if (name === 'mock') return mockProvider(env);
  if (name === 'a61') return a61Provider(env);
  return valadioProvider(env);
}
