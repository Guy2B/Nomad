/**
 * Admin API (Authorization: Bearer <ADMIN_PASSWORD>):
 *   GET  /api/admin            → overview, orders, customers count
 *   POST /api/admin {action:'retry', sessionId}      → send to the supplier again
 *   POST /api/admin {action:'resolve', sessionId}    → clear the attention flag (done by hand)
 */
import crypto from 'node:crypto';
import { crm, getOrder, listOrders } from '../lib/store.mjs';
import { fulfill } from '../lib/orders.mjs';
import { PRODUCTS } from '../lib/catalog.mjs';
import { cjConfigured } from '../lib/cj.mjs';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (expected.length < 12 || !given) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export default async (req) => {
  if (!authorized(req)) return json(401, { error: 'unauthorized' });
  const store = crm();
  if (req.method === 'GET') {
    const orders = await listOrders(store, 500);
    const paid = orders.filter((o) => o.items.length);
    const revenue = paid.reduce((a, o) => a + o.totalCents, 0);
    const cost = paid.reduce(
      (a, o) =>
        a + o.items.reduce((s, i) => s + (PRODUCTS.find((p) => p.id === i.id)?.supplier.costCents ?? 0) * i.qty, 0),
      0,
    );
    return json(200, {
      setup: {
        stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        cj: cjConfigured(),
        cjAutoPay: process.env.CJ_AUTO_PAY === 'true',
        notifications: Boolean(process.env.NTFY_TOPIC),
        mappedProducts: PRODUCTS.filter((p) => p.active && (p.supplier.cjVid || p.supplier.cjSku)).length,
        activeProducts: PRODUCTS.filter((p) => p.active).length,
      },
      stats: {
        orders: orders.length,
        revenueCents: revenue,
        estimatedMarginCents: revenue - cost,
        customers: new Set(orders.map((o) => o.customer.email.toLowerCase())).size,
        attention: orders.filter((o) => o.attention).length,
      },
      orders,
    });
  }
  if (req.method === 'POST') {
    const { action, sessionId } = await req.json().catch(() => ({}));
    const order = sessionId ? await getOrder(store, sessionId) : null;
    if (!order) return json(404, { error: 'not-found' });
    if (action === 'retry') return json(200, await fulfill(store, { ...order, attention: null }));
    if (action === 'resolve') {
      order.attention = null;
      if (order.status === 'needs_attention') order.status = 'supplier_ordered';
      order.history.push({ at: new Date().toISOString(), event: 'resolved by hand' });
      const { saveOrder } = await import('../lib/store.mjs');
      await saveOrder(store, order);
      return json(200, order);
    }
    return json(400, { error: 'action' });
  }
  return json(405, { error: 'method' });
};

export const config = { path: '/api/admin' };
