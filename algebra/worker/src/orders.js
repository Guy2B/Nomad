/**
 * Order logic: pricing from the catalogue (never from the browser), state machine, fulfillment.
 *
 *   pending_payment → paid → submitted → in_production → shipped → delivered
 *                       ↘ needs_attention (address / stock problem, owner notified)
 *                       ↘ fulfillment_failed (supplier API kept failing after MAX_ATTEMPTS, owner notified)
 *   any before shipped → cancelled | refunded        pending_payment → payment_failed | expired
 *
 * Rule from the brief: nothing goes to the supplier before the payment is confirmed (status 'paid').
 */
import { productById, shipping, variantBySku, zoneOf } from '../../data/catalog.mjs';
import { notifyOwner, sendMail, template } from './email.js';
import { FulfillmentError } from './fulfillment/provider.js';
import { isConfirmed } from './fulfillment/mapping.js';

export const STATUSES = ['pending_payment', 'payment_failed', 'expired', 'paid', 'submitted', 'in_production', 'shipped', 'delivered', 'needs_attention', 'fulfillment_failed', 'cancelled', 'refunded'];
const NEXT = {
  pending_payment: ['paid', 'payment_failed', 'expired', 'cancelled'],
  paid: ['submitted', 'needs_attention', 'fulfillment_failed', 'cancelled', 'refunded'],
  submitted: ['in_production', 'shipped', 'delivered', 'needs_attention', 'cancelled', 'refunded'],
  in_production: ['shipped', 'delivered', 'needs_attention', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  needs_attention: ['paid', 'submitted', 'cancelled', 'refunded'],
  fulfillment_failed: ['paid', 'cancelled', 'refunded'],
  payment_failed: ['paid', 'expired'],
  expired: [],
  cancelled: ['refunded'],
  refunded: [],
};
export const canMove = (from, to) => (NEXT[from] || []).includes(to);
export const MAX_ATTEMPTS = 5;
const now = () => new Date().toISOString();

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message ? `${code}: ${message}` : code);
    this.status = status;
    this.code = code;
  }
}

/** Validate a cart against the catalogue and price it. Throws HttpError(400) on anything suspicious. */
export function priceCart(input, { live = false } = {}) {
  const { items, country } = input || {};
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new HttpError(400, 'BAD_CART');
  if (!shipping.countries.includes(country)) throw new HttpError(400, 'BAD_COUNTRY');
  const merged = new Map();
  for (const it of items) {
    const qty = Number(it?.qty);
    if (typeof it?.sku !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 10) throw new HttpError(400, 'BAD_ITEM');
    // bags saved before the rename The Crew → The Sweat (23.10.2026) keep working
    it.sku = it.sku.replace(/^ALG-([MW])-CREW-/, 'ALG-$1-SWEAT-');
    merged.set(it.sku, (merged.get(it.sku) || 0) + qty);
  }
  const lines = [];
  for (const [sku, qty] of merged) {
    const v = variantBySku(sku);
    if (!v) throw new HttpError(400, 'UNKNOWN_SKU', sku);
    if (!v.purchasable) throw new HttpError(409, 'NOT_PURCHASABLE', sku);
    // live shop: only variants whose exact supplier SKU is confirmed can be sold (worker/src/fulfillment/mapping.js)
    if (live && !isConfirmed(sku)) throw new HttpError(409, 'NOT_PURCHASABLE', sku);
    if (qty > 10) throw new HttpError(400, 'BAD_ITEM');
    const p = productById(v.productId);
    lines.push({ sku, qty, price: v.price ?? p.price, name: p.name.en, productId: p.id, color: v.color, size: v.size, cut: v.cut, decoration: v.decoration, printFile: v.printFile, embroideryFile: v.embroideryFile });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const z = shipping.zones[zoneOf(country)];
  const ship = subtotal >= z.freeFrom ? 0 : z.fee;
  return { lines, subtotal, shipping: ship, total: Math.round((subtotal + ship) * 100) / 100, zone: zoneOf(country) };
}

export function orderNumber(date = new Date(), rand = crypto.getRandomValues(new Uint32Array(1))[0]) {
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const code = (rand % 1679616).toString(36).toUpperCase().padStart(4, '0');
  return `ALG-${ymd}-${code}`;
}

export async function createPendingOrder(db, { lang, country, priced }) {
  const id = crypto.randomUUID();
  const number = orderNumber();
  const t = now();
  await db
    .prepare('INSERT INTO alg_orders (id, number, status, lang, country, items_json, subtotal, shipping, total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, number, 'pending_payment', lang, country, JSON.stringify(priced.lines), priced.subtotal, priced.shipping, priced.total, t, t)
    .run();
  await event(db, id, 'created', { total: priced.total });
  return { id, number };
}

export async function event(db, orderId, type, data) {
  await db.prepare('INSERT INTO alg_order_events (order_id, type, data, created_at) VALUES (?,?,?,?)').bind(orderId, type, data ? JSON.stringify(data) : null, now()).run();
}

export const getOrder = (db, id) => db.prepare('SELECT * FROM alg_orders WHERE id = ?').bind(id).first();
export const getBySession = (db, sid) => db.prepare('SELECT * FROM alg_orders WHERE stripe_session_id = ?').bind(sid).first();

export async function setStatus(db, order, to, fields = {}) {
  if (order.status === to && !Object.keys(fields).length) return order;
  if (order.status !== to && !canMove(order.status, to)) throw new Error(`Illegal transition ${order.status} → ${to} (${order.number})`);
  const cols = { status: to, updated_at: now(), ...fields };
  const keys = Object.keys(cols);
  await db.prepare(`UPDATE alg_orders SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...keys.map((k) => cols[k] ?? null), order.id).run();
  await event(db, order.id, `status:${to}`, fields.last_error ? { error: fields.last_error } : null);
  return { ...order, ...cols };
}

/** Payment confirmed by Stripe. Idempotent. */
export async function markPaid(env, order, session) {
  if (['paid', 'submitted', 'in_production', 'shipped', 'delivered'].includes(order.status)) return order;
  const sd = session.shipping_details || session.collected_information?.shipping_details || {};
  const cd = session.customer_details || {};
  const amount = (session.amount_total ?? 0) / 100;
  if (Math.abs(amount - order.total) > 0.009) {
    // Should never happen (prices come from the server). Hold the order for a human.
    const held = await setStatus(env.DB, order, 'paid', { email: cd.email ?? null, stripe_payment_intent: session.payment_intent ?? null });
    await setStatus(env.DB, held, 'needs_attention', { last_error: `Amount mismatch: paid ${amount}, expected ${order.total}` });
    await notifyOwner(env, `Amount mismatch ${order.number}`, `Paid ${amount} €, expected ${order.total} €.`);
    return getOrder(env.DB, order.id);
  }
  const paid = await setStatus(env.DB, order, 'paid', {
    email: cd.email || null,
    name: sd.name || cd.name || null,
    address_json: JSON.stringify(sd.address || cd.address || null),
    stripe_payment_intent: session.payment_intent || null,
  });
  if (paid.email) {
    const m = template('confirm', paid.lang, paid);
    await sendMail(env, { to: paid.email, ...m });
  }
  return paid;
}

/** Send a paid order to the supplier. Only from status 'paid'. */
export async function fulfill(env, order, supplier) {
  if (order.status !== 'paid') return order;
  try {
    const r = await supplier.createOrder(order);
    return await setStatus(env.DB, order, 'submitted', { supplier: supplier.name, supplier_order_id: r.supplierOrderId, supplier_status: r.status, last_error: null, fulfillment_attempts: order.fulfillment_attempts + 1 });
  } catch (e) {
    const kind = e instanceof FulfillmentError ? e.kind : 'api';
    const attempts = order.fulfillment_attempts + 1;
    if (kind === 'api' && attempts < MAX_ATTEMPTS) {
      await env.DB.prepare('UPDATE alg_orders SET fulfillment_attempts = ?, last_error = ?, updated_at = ? WHERE id = ?').bind(attempts, e.message, now(), order.id).run();
      await event(env.DB, order.id, 'fulfillment_retry', { attempts, error: e.message });
      return getOrder(env.DB, order.id);
    }
    const to = kind === 'api' ? 'fulfillment_failed' : 'needs_attention';
    const o = await setStatus(env.DB, order, to, { last_error: `${kind}: ${e.message}`, fulfillment_attempts: attempts });
    await notifyOwner(env, `${to} ${order.number}`, `Supplier error (${kind}): ${e.message}\nThe customer has paid. Fix and retry, or refund.`);
    return o;
  }
}

/** Algebra provider statuses (fulfillment/errors.js) → order statuses. Old names kept for orders created before the switch. */
const SUPPLIER_TO_ORDER = { received: 'submitted', production: 'in_production', in_production: 'in_production', shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled', error: 'needs_attention', problem: 'needs_attention' };

/** Poll the supplier for one order and apply the result. */
export async function syncStatus(env, order, supplier) {
  return applyStatus(env, order, await supplier.getStatus(order));
}

/** Apply a provider status (from polling or a webhook) to an order. s = { status, carrier?, trackingNumber?, trackingUrl? } */
export async function applyStatus(env, order, s) {
  const to = SUPPLIER_TO_ORDER[s.status];
  if (!to || to === order.status) {
    if (s.status !== order.supplier_status) await env.DB.prepare('UPDATE alg_orders SET supplier_status = ?, updated_at = ? WHERE id = ?').bind(s.status, now(), order.id).run();
    return getOrder(env.DB, order.id);
  }
  let o = order;
  // walk through intermediate states so the history stays complete
  const path = { shipped: ['in_production', 'shipped'], delivered: ['in_production', 'shipped', 'delivered'] }[to] || [to];
  for (const step of path) {
    if (o.status === step || !canMove(o.status, step)) continue;
    const fields = { supplier_status: s.status };
    if (step === 'shipped') Object.assign(fields, { carrier: s.carrier, tracking_number: s.trackingNumber, tracking_url: s.trackingUrl });
    o = await setStatus(env.DB, o, step, fields);
    if ((step === 'shipped' || step === 'delivered') && o.email) await sendMail(env, { to: o.email, ...template(step, o.lang, o) });
    if (step === 'needs_attention') await notifyOwner(env, `Supplier reports a problem ${o.number}`, JSON.stringify(s));
  }
  return o;
}

/** Cron: retry paid orders, poll open ones, expire stale pending ones. */
export async function sweep(env, supplier) {
  const out = { retried: 0, synced: 0, expired: 0, errors: 0 };
  const paid = await env.DB.prepare("SELECT * FROM alg_orders WHERE status = 'paid' LIMIT 50").all();
  for (const o of paid.results) {
    await fulfill(env, o, supplier);
    out.retried++;
  }
  const open = await env.DB.prepare("SELECT * FROM alg_orders WHERE status IN ('submitted','in_production','shipped') LIMIT 100").all();
  for (const o of open.results) {
    try {
      await syncStatus(env, o, supplier);
      out.synced++;
    } catch (e) {
      out.errors++;
      await event(env.DB, o.id, 'sync_error', { error: e.message });
    }
  }
  const cutoff = new Date(Date.now() - 48 * 3600e3).toISOString();
  const stale = await env.DB.prepare("SELECT * FROM alg_orders WHERE status = 'pending_payment' AND created_at < ? LIMIT 200").bind(cutoff).all();
  for (const o of stale.results) {
    await setStatus(env.DB, o, 'expired');
    out.expired++;
  }
  return out;
}

/** Stripe refund event: mark refunded; cancel at the supplier if production has not started. */
export async function markRefunded(env, order, supplier) {
  if (order.status === 'refunded') return order;
  if (order.supplier_order_id && ['submitted'].includes(order.status)) {
    try {
      const c = await supplier.cancel(order);
      await event(env.DB, order.id, 'supplier_cancel', c);
    } catch (e) {
      await event(env.DB, order.id, 'supplier_cancel_error', { error: e.message });
    }
  }
  if (!canMove(order.status, 'refunded')) {
    await notifyOwner(env, `Refund on ${order.number} in status ${order.status}`, 'Check manually.');
    return order;
  }
  return setStatus(env.DB, order, 'refunded');
}
