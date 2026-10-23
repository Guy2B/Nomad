/**
 * DEPRECATED (A61 period). Kept only so old imports keep working; use ./fulfillment/provider.js.
 * The A61 adapter was never connected and is removed. Delete this file once nothing imports it.
 */
export { FulfillmentError as SupplierError, providerFor as supplierFor } from './fulfillment/provider.js';
export { mockProvider as mockSupplier } from './fulfillment/mock.js';
