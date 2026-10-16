/**
 * After the payment: customer e-mails (once each), watchdogs that warn the owner
 * before a customer opens a dispute, refunds and dispute evidence.
 *
 *   order.mails   = { shipped, delivered, address, cancelled, review }   (ISO date sent)
 *   order.alerts  = { late, pay }                                          (ISO date raised)
 *   order.issue   = 'address' | 'late' | 'pay' | 'cancelled' | 'dispute' | null
 */
import crypto from 'node:crypto';
import { store as storeById } from './catalog.mjs';
import { addressUrl, customerEmail } from './emails.mjs';
import { mailConfigured, sendMail, senderFor } from './mail.mjs';
import { euros, notifyOwner } from './notify.mjs';
import { getOrder, listOrders, saveOrder } from './store.mjs';
import { getSession, refundPayment, sessionsForPaymentIntent, updateDispute } from './stripe.mjs';

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Orders placed before these automations existed are never mailed retroactively. */
export const MAILS_SINCE = Date.parse('2026-10-16T00:00:00Z');
/** CJ statuses of an order created but not paid yet in CJ. */
const UNPAID = new Set(['CREATED', 'IN_CART', 'UNPAID']);

const log = (order, event, now = new Date()) => order.history.push({ at: now.toISOString(), event });
const originDE = (order) => storeById(order.store)?.site?.shipping?.from === 'DE';
/** Days without a tracking number before the owner is warned (German warehouse is fast). */
export const lateAfterDays = (order) => (originDE(order) ? 4 : 7);
/** Days after shipping when a review is asked if the carrier never reported "delivered". */
const reviewAfterShippedDays = (order) => (originDE(order) ? 10 : 20);

/** Signature for the address form link: proves the link came from our e-mail. */
export function addressToken(sessionId) {
  const secret = process.env.ADDRESS_SECRET || process.env.ADMIN_PASSWORD || process.env.STRIPE_WEBHOOK_SECRET || 'dev';
  return crypto.createHmac('sha256', secret).update(`address:${sessionId}`).digest('hex').slice(0, 32);
}
export function validAddressToken(sessionId, token) {
  const a = Buffer.from(addressToken(sessionId));
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Sends one kind of customer e-mail at most once. Returns true when sent now. */
export async function mailOnce(order, kind, now = new Date()) {
  order.mails ??= {};
  if (order.mails[kind] || !order.customer?.email) return false;
  if (Date.parse(order.createdAt) < MAILS_SINCE) return false;
  if (!mailConfigured()) return false;
  const extra = kind === 'address' ? { addressUrl: addressUrl(order, addressToken(order.sessionId)) } : {};
  const m = customerEmail(kind, order, extra);
  const { brand, ...mail } = m;
  const r = await sendMail({ ...mail, to: order.customer.email, from: senderFor(brand), key: `${order.sessionId}:${kind}` });
  if (r.ok) {
    order.mails[kind] = now.toISOString();
    log(order, `mail ${kind}`, now);
    return true;
  }
  log(order, `mail ${kind} failed: ${r.error}`, now);
  return false;
}

/**
 * Hourly checks on one order (after the CJ status sync). Mutates the order;
 * returns true when it changed and must be saved.
 */
export async function afterSale(order, now = new Date()) {
  order.mails ??= {};
  order.alerts ??= {};
  order.issue ??= null;
  const before = JSON.stringify([order.mails, order.alerts, order.attention, order.issue, order.status]);
  const age = now - Date.parse(order.createdAt);
  const shipped = ['shipped', 'delivered'].includes(order.status);

  // A late or unpaid order that has since shipped needs nothing more.
  if (shipped && ['late', 'pay'].includes(order.issue)) {
    order.issue = null;
    order.attention = null;
  }
  // Paid in CJ by hand: the "pay in CJ" flag is done.
  if (order.status === 'supplier_ordered' && order.supplier?.status && !UNPAID.has(order.supplier.status) && /^Payer/.test(order.attention || '')) {
    order.attention = null;
    if (order.issue === 'pay') order.issue = null;
  }

  // 3 · shipped + tracking, then delivered.
  if (shipped && (order.supplier?.trackNumber || order.shippedBy === 'hand')) await mailOnce(order, 'shipped', now);
  if (order.status === 'delivered') await mailOnce(order, 'delivered', now);

  // 8 · review request: 5 days after delivery, or long after shipping if "delivered" never came.
  const deliveredAt = Date.parse(order.deliveredAt || '');
  const shippedAt = Date.parse(order.shippedAt || '');
  if (
    shipped &&
    !order.refund &&
    ((deliveredAt && now - deliveredAt >= 5 * DAY) || (shippedAt && now - shippedAt >= reviewAfterShippedDays(order) * DAY))
  )
    await mailOnce(order, 'review', now);

  const live = !order.test && order.store !== 'off' && !order.refund;
  // 2 · CJ order created but not paid (no CJ_AUTO_PAY): one reminder after 3 hours.
  if (
    live &&
    process.env.CJ_AUTO_PAY !== 'true' &&
    order.status === 'supplier_ordered' &&
    UNPAID.has(order.supplier?.status) &&
    age >= 3 * HOUR &&
    !order.alerts.pay
  ) {
    order.alerts.pay = now.toISOString();
    await notifyOwner(
      `${order.brand} - A payer dans CJ ${order.number}`,
      `Commande CJ ${order.supplier.orderId ?? ''} creee il y a ${Math.round(age / HOUR)} h mais pas encore payee : rien ne part tant qu'elle n'est pas payee dans CJ.`,
      'high',
    );
  }
  // 5 · nothing shipped after 4 days (Germany) or 7 days (China): warn before the customer worries.
  const limit = lateAfterDays(order);
  if (live && ['paid', 'supplier_ordered', 'needs_attention'].includes(order.status) && !order.supplier?.trackNumber && age >= limit * DAY && !order.alerts.late) {
    order.alerts.late = now.toISOString();
    if (!order.attention) {
      order.attention = `Pas encore expédiée après ${limit} jours : vérifier chez CJ (stock, paiement) et prévenir le client`;
      order.issue = 'late';
    }
    await notifyOwner(
      `${order.brand} - Retard ${order.number}`,
      `Aucun numero de suivi apres ${Math.floor(age / DAY)} jours (${euros(order.totalCents)}, ${order.shipping?.city || ''}). Statut CJ : ${order.supplier?.status || 'aucun'}.`,
      'high',
    );
  }
  return JSON.stringify([order.mails, order.alerts, order.attention, order.issue, order.status]) !== before;
}

/** Runs afterSale on the recent orders and saves the ones that changed. */
export async function afterSaleAll(store, now = new Date()) {
  let changed = 0;
  for (const o of await listOrders(store, 500)) {
    if (o.status === 'cancelled') continue;
    try {
      if (await afterSale(o, now)) {
        await saveOrder(store, o);
        changed++;
      }
    } catch (err) {
      console.error('aftersale', o.number, err);
    }
  }
  return changed;
}

/** Stripe PaymentIntent of an order (kept on the order since 2026-10, else read from the session). */
export async function paymentIntentOf(order) {
  if (order.paymentIntent) return order.paymentIntent;
  const s = await getSession(order.sessionId);
  const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
  if (!pi) throw new Error('Paiement Stripe introuvable pour cette commande');
  order.paymentIntent = pi;
  return pi;
}

/** 6 · Full refund through Stripe + apology e-mail. */
export async function refundOrder(store, order, now = new Date()) {
  if (order.refund) return order;
  const pi = await paymentIntentOf(order);
  const r = await refundPayment(pi, { order: order.number, store: order.store || '' });
  order.refund = { id: r.id, cents: r.amount ?? order.totalCents, at: now.toISOString() };
  order.status = 'cancelled';
  order.attention = null;
  order.issue = null;
  log(order, `refunded ${euros(order.refund.cents)} (${r.id})`, now);
  await mailOnce(order, 'cancelled', now);
  await saveOrder(store, order);
  return order;
}

/** The CRM order paid with a Stripe PaymentIntent. */
export async function orderByPaymentIntent(store, pi) {
  if (!pi) return null;
  const known = (await listOrders(store, 5000)).find((o) => o.paymentIntent === pi);
  if (known) return known;
  const list = await sessionsForPaymentIntent(pi);
  const sessionId = list?.data?.[0]?.id;
  return sessionId ? getOrder(store, sessionId) : null;
}

/** 7 · Dispute opened: alert now and pre-fill the evidence (saved as a draft, submitted by the owner). */
export async function onDispute(store, dispute, now = new Date()) {
  const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id;
  const order = await orderByPaymentIntent(store, pi);
  const amount = euros(dispute.amount ?? 0);
  if (!order) {
    await notifyOwner('Litige Stripe', `Litige ${dispute.id} (${amount}, motif ${dispute.reason}) : commande introuvable dans le CRM.`, 'urgent');
    return null;
  }
  const a = order.shipping || {};
  const shippedEvent = order.history.find((h) => /shipped|SHIPPED/.test(h.event));
  const evidence = {
    customer_name: order.customer.name || a.name,
    customer_email_address: order.customer.email,
    shipping_address: [a.name, a.line1, a.line2, `${a.postalCode} ${a.city}`, a.country].filter(Boolean).join(', '),
    shipping_carrier: order.supplier?.logisticName || undefined,
    shipping_tracking_number: order.supplier?.trackNumber || undefined,
    shipping_date: (order.shippedAt || shippedEvent?.at || '').slice(0, 10) || undefined,
    product_description: order.items.map((i) => `${i.qty} x ${i.name}`).join('; '),
    uncategorized_text: [
      `Order ${order.number} placed ${order.createdAt.slice(0, 10)} on ${order.brand}.`,
      order.supplier?.trackNumber ? `Shipped with tracking ${order.supplier.trackNumber} (${order.supplier.logisticName || 'carrier'}).` : 'Not shipped yet.',
      order.status === 'delivered' ? `Delivered${order.deliveredAt ? ` on ${order.deliveredAt.slice(0, 10)}` : ''}.` : '',
      'Order history: ' + order.history.map((h) => `${h.at.slice(0, 10)} ${h.event}`).join(' | '),
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 19000),
  };
  let draft = false;
  try {
    await updateDispute(dispute.id, { evidence, submit: false });
    draft = true;
  } catch (err) {
    log(order, `dispute evidence not saved: ${err.message}`, now);
  }
  order.dispute = { id: dispute.id, reason: dispute.reason, cents: dispute.amount, at: now.toISOString() };
  order.attention = `Litige Stripe (${dispute.reason}) : ${draft ? 'preuves pré-remplies dans Stripe, vérifier puis « Submit evidence »' : 'répondre dans Stripe'}`;
  order.issue = 'dispute';
  if (order.status === 'paid') order.status = 'needs_attention';
  log(order, `dispute opened ${dispute.id}`, now);
  await saveOrder(store, order);
  await notifyOwner(
    `${order.brand} - LITIGE ${order.number}`,
    `${amount}, motif : ${dispute.reason}. Suivi : ${order.supplier?.trackNumber || 'aucun'} (${order.status}).\n${draft ? 'Preuves deja pre-remplies dans Stripe : verifier et soumettre.' : 'Repondre dans Stripe (preuves non pre-remplies).'}`,
    'urgent',
    `https://dashboard.stripe.com/disputes/${dispute.id}`,
  );
  return order;
}

/** Refund made in the Stripe dashboard: the CRM follows. */
export async function onRefunded(store, charge, now = new Date()) {
  if (!charge.refunded) return null;
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  const order = await orderByPaymentIntent(store, pi);
  if (!order || order.refund) return order;
  order.refund = { id: charge.refunds?.data?.[0]?.id ?? null, cents: charge.amount_refunded ?? order.totalCents, at: now.toISOString() };
  order.status = 'cancelled';
  order.attention = null;
  order.issue = null;
  log(order, `refunded in Stripe ${euros(order.refund.cents)}`, now);
  await saveOrder(store, order);
  return order;
}
