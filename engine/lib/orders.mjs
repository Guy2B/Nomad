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
import { markSold, offItems } from './off.mjs';
import { mailOnce } from './aftersale.mjs';

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

/** CJ needs a house number in Address1 or Address2 ("Hauptstraße 12", "12b"). */
export const hasHouseNumber = (shipping) => /\d/.test(`${shipping.line1} ${shipping.line2}`);

export function orderFromSession(session, now = new Date()) {
  const cart = session.metadata?.cart || '';
  // OFF. pieces are not in the static catalogues: the session describes the item.
  const off = session.metadata?.store === 'off';
  // Sessions created before the multi-store platform carry no store: they are Nomad's.
  const s = off ? null : (storeById(session.metadata?.store || HOST_STORE) ?? storeById(HOST_STORE));
  const priced = off ? { items: offItems(session), totalCents: session.amount_total ?? 0 } : priceCart(decodeCart(cart), s.id);
  const cust = session.customer_details ?? {};
  return {
    number: orderNumber(off ? 'OF' : s.site.orderPrefix, now),
    store: off ? 'off' : s.id,
    brand: off ? 'OFF.' : s.site.brand,
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
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null),
    supplier: { provider: off ? 'own stock' : 'CJdropshipping', orderId: null, status: null, trackNumber: null, logisticName: null },
    history: [{ at: now.toISOString(), event: 'paid' }],
    attention: null,
    issue: null,
    mails: {},
    alerts: {},
    // Paid with a Stripe test key: never sent to the supplier.
    test: session.livemode === false,
  };
}

/** Sends the order to the supplier, or flags exactly what a human must do. */
export async function fulfill(store, order) {
  const log = (event) => order.history.push({ at: new Date().toISOString(), event });
  if (order.store === 'off') {
    // Our own stock: the piece is marked sold and shipped by hand.
    await markSold(order);
    order.attention = `À expédier soi-même (Hermes) : ${order.items.map((i) => `${i.sku} · ${i.name}`).join(', ')}`;
    if (order.status === 'paid') order.status = 'needs_attention';
    log('piece marked sold');
    await saveOrder(store, order);
    return order;
  }
  const missing = unmapped(order);
  order.issue = null;
  if (order.test) order.attention = 'Commande test (Stripe en mode test) : non envoyée à CJ';
  else if (!cjConfigured()) order.attention = 'Clé CJ absente (CJ_API_KEY) : commander à la main sur CJ, puis « Traité à la main »';
  else if (missing.length) order.attention = `Variante CJ manquante pour : ${missing.map((i) => i.name).join(', ')}`;
  else if (!order.shipping.line1 || !order.shipping.city || !order.shipping.country || !hasHouseNumber(order.shipping)) {
    // The customer gets a signed link to complete the address; the order goes to CJ as soon as it is fixed.
    order.issue = 'address';
    const sent = await mailOnce(order, 'address');
    order.attention = sent || order.mails?.address
      ? 'Adresse incomplète (numéro de rue) : e-mail envoyé au client avec un lien pour la compléter, la commande partira toute seule chez CJ'
      : 'Adresse incomplète (numéro de rue exigé par CJ) : demander l’adresse complète au client, commander à la main sur CJ';
  }
  else {
    try {
      const r = await createSupplierOrder(order, store);
      order.supplier.orderId = r.cjOrderId;
      order.supplier.status = process.env.CJ_AUTO_PAY === 'true' ? 'PAID' : 'CREATED';
      order.status = 'supplier_ordered';
      order.attention =
        process.env.CJ_AUTO_PAY === 'true' ? null : 'Payer la commande fournisseur dans CJ (CJ_AUTO_PAY désactivé)';
      if (order.attention) order.issue = 'pay';
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

/**
 * Sessions of another AlGBr circuit on the same Stripe account (ALGEBRA: own Worker, own webhook, own tables).
 * ALGEBRA marks its sessions with metadata.store = 'algebra'; older ones carry order_id without store.
 * Sessions without any store metadata remain GO's (the first store, before the multi-store platform).
 */
export const isForeignSession = (session) => {
  const m = session?.metadata ?? {};
  return m.store === 'algebra' || (!m.store && Boolean(m.order_id));
};

export async function processPaidSession(store, session) {
  if (isForeignSession(session)) return { skipped: 'foreign' };
  if (session.payment_status && session.payment_status !== 'paid') return { skipped: 'unpaid' };
  const existing = await getOrder(store, session.id);
  if (existing) return { order: existing, duplicate: true };
  const order = orderFromSession(session);
  if (!order.items.length || !order.customer.email) {
    order.status = 'needs_attention';
    order.attention = 'Panier vide ou e-mail absent dans la session Stripe';
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
