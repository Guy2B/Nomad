/**
 * Paid Stripe session → CRM order → supplier order. Idempotent: Stripe may
 * deliver the same webhook twice; an order is created and sent to CJ once.
 *
 * Order statuses:
 *   paid → supplier_ordered (CJ order created; paid from balance when CJ_AUTO_PAY=true)
 *        → shipped (tracking number) → delivered
 *   needs_attention: something requires a human (mapping missing, CJ error…), with the reason.
 */
import { HOST_STORE, decodeCart, orderNumber, priceCart, store as storeById } from './catalog.mjs';
import { CJError, cjConfigured, createSupplierOrder, unmapped } from './cj.mjs';
import { getOrder, saveOrder, upsertCustomer } from './store.mjs';
import { euros, notifyOwner } from './notify.mjs';

/** Shipping address from a Checkout Session (old and new Stripe API shapes). */
export function shippingFrom(session) {
  const ship = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const cust = session.customer_details ?? {};
  const a = ship?.address ?? cust.address ?? {};
  return {
    name: ship?.name || cust.name || '',
    line1: a.line1 || '',
    line2: a.line2 || '',
    postalCode: a.postal_code || '',
    city: a.city || '',
    state: a.state || '',
    country: a.country || '',
  };
}

export function orderFromSession(session, now = new Date()) {
  const cart = session.metadata?.cart || '';
  // Sessions created before the multi-store platform carry no store: they are Nomad's.
  const s = storeById(session.metadata?.store || HOST_STORE) ?? storeById(HOST_STORE);
  const priced = priceCart(decodeCart(cart), s.id);
  const cust = session.customer_details ?? {};
  return {
    number: orderNumber(s.site.orderPrefix, now),
    store: s.id,
    brand: s.site.brand,
    sessionId: session.id,
    createdAt: now.toISOString(),
    lang: session.metadata?.lang || 'de',
    status: 'paid',
    items: priced.items,
    // What the customer actually paid, as charged by Stripe.
    totalCents: session.amount_total ?? priced.totalCents,
    currency: session.currency || 'eur',
    customer: { email: cust.email || '', name: cust.name || '', phone: cust.phone || '' },
    shipping: shippingFrom(session),
    invoiceId: typeof session.invoice === 'string' ? session.invoice : (session.invoice?.id ?? null),
    supplier: { provider: 'CJdropshipping', orderId: null, status: null, trackNumber: null, logisticName: null },
    history: [{ at: now.toISOString(), event: 'paid' }],
    attention: null,
  };
}

/** Sends the order to the supplier, or flags exactly what a human must do. */
export async function fulfill(store, order) {
  const log = (event) => order.history.push({ at: new Date().toISOString(), event });
  const missing = unmapped(order);
  if (!cjConfigured()) order.attention = 'CJ API key missing (CJ_API_KEY)';
  else if (missing.length) order.attention = `CJ variant missing for: ${missing.map((i) => i.name).join(', ')}`;
  else if (!order.shipping.line1 || !order.shipping.city || !order.shipping.country) order.attention = 'Incomplete shipping address';
  else {
    try {
      const r = await createSupplierOrder(order, store);
      order.supplier.orderId = r.cjOrderId;
      order.supplier.status = process.env.CJ_AUTO_PAY === 'true' ? 'PAID' : 'CREATED';
      order.status = 'supplier_ordered';
      order.attention =
        process.env.CJ_AUTO_PAY === 'true' ? null : 'Pay the supplier order in CJ (CJ_AUTO_PAY is off)';
      log(`supplier order ${r.cjOrderId ?? ''}`.trim());
    } catch (err) {
      order.attention = `CJ: ${err instanceof CJError ? err.message : 'unreachable'}`;
      log('supplier order failed');
    }
  }
  if (order.attention && order.status === 'paid') order.status = 'needs_attention';
  await saveOrder(store, order);
  return order;
}

export async function processPaidSession(store, session) {
  if (session.payment_status && session.payment_status !== 'paid') return { skipped: 'unpaid' };
  const existing = await getOrder(store, session.id);
  if (existing) return { order: existing, duplicate: true };
  const order = orderFromSession(session);
  if (!order.items.length || !order.customer.email) {
    order.status = 'needs_attention';
    order.attention = 'Empty cart or missing email in the Stripe session';
    await saveOrder(store, order);
  } else {
    await saveOrder(store, order);
    await upsertCustomer(store, order);
    await fulfill(store, order);
  }
  const lines = order.items.map((i) => `${i.qty}× ${i.name}`).join(', ');
  await notifyOwner(
    order.attention ? `${order.brand} - Action needed ${order.number}` : `${order.brand} - New order ${order.number}`,
    `${euros(order.totalCents)} · ${lines}\n${order.shipping.name}, ${order.shipping.city} ${order.shipping.country}\n${order.attention ?? 'Sent to the supplier automatically.'}`,
    order.attention ? 'high' : 'default',
  );
  return { order };
}
