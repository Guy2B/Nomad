/**
 * Admin API (Authorization: Bearer <ADMIN_PASSWORD>):
 *   GET  /api/admin            → stores, setup, overview (all stores and per store), orders
 *   POST /api/admin {action:'retry', sessionId}      → send to the supplier again
 *   POST /api/admin {action:'resolve', sessionId}    → clear the attention flag (done by hand)
 *   POST /api/admin {action:'ship', sessionId, trackNumber, carrier} → mark shipped by hand, tracking for the customer
 *   POST /api/admin {action:'auditSupply', cursor, kind} → next batch of the CJ stock & delivery audit (kind 'alternatives': same products stocked in Germany)
 */
import crypto from 'node:crypto';
import { crm, getOrder, listOrders } from '../lib/store.mjs';
import { fulfill } from '../lib/orders.mjs';
import { HOST_STORE, allStores, product, supplierLines, unitCost } from '../lib/catalog.mjs';
import { cjConfigured } from '../lib/cj.mjs';
import { funnel } from '../lib/metrics.mjs';
import { moderate, pendingReviews } from '../lib/reviews.mjs';
import { alternatives, auditBatch, supplyAudit } from '../lib/supply.mjs';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function authorized(req) {
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
    const storeOf = (o) => o.store || HOST_STORE;
    const stats = (list) => {
      const paid = list.filter((o) => o.items.length);
      const revenue = paid.reduce((a, o) => a + o.totalCents, 0);
      const cost = paid.reduce(
        (a, o) => a + o.items.reduce((c, i) => c + unitCost(product(storeOf(o), i.id)) * i.qty, 0),
        0,
      );
      return {
        orders: list.length,
        revenueCents: revenue,
        estimatedMarginCents: revenue - cost,
        customers: new Set(list.map((o) => o.customer.email.toLowerCase())).size,
        attention: list.filter((o) => o.attention).length,
      };
    };
    const stores = allStores().map((s) => {
      const active = s.products.filter((p) => p.active);
      return {
        id: s.id,
        brand: s.site.brand,
        url: s.site.baseUrl,
        activeProducts: active.length,
        mappedProducts: active.filter((p) => {
          const lines = supplierLines(p);
          return lines.length && lines.every((c) => c.supplier.cjVid || c.supplier.cjSku);
        }).length,
        stats: stats(orders.filter((o) => storeOf(o) === s.id)),
        catalog: s.products.map((p) => ({
          id: p.id,
          name: p.name,
          active: p.active,
          priceCents: p.price,
          costCents: unitCost(p),
          parts: supplierLines(p).map((c) => ({
            qty: c.qty,
            name: c.name,
            sku: c.supplier.cjSku,
            vid: c.supplier.cjVid || '',
            url: c.supplier.url,
            sourcing: c.supplier.sourcing ?? null,
            logisticName: c.supplier.logisticName || null,
            shippingDays: c.supplier.shippingDays || null,
          })),
        })),
      };
    });
    for (const s of stores) s.funnel = await funnel(store, s.id, orders, 30);
    return json(200, {
      setup: {
        stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        cj: cjConfigured(),
        cjAutoPay: process.env.CJ_AUTO_PAY === 'true',
        notifications: Boolean(process.env.NTFY_TOPIC),
        mappedProducts: stores.reduce((a, s) => a + s.mappedProducts, 0),
        activeProducts: stores.reduce((a, s) => a + s.activeProducts, 0),
      },
      stores,
      stats: stats(orders),
      pendingReviews: await pendingReviews(store),
      supplyAudit: await supplyAudit(store),
      alternatives: await alternatives(store),
      orders: orders.map((o) => ({ ...o, store: storeOf(o) })),
    });
  }
  if (req.method === 'POST') {
    const { action, sessionId, reviewId, cursor, kind, trackNumber, carrier } = await req.json().catch(() => ({}));
    if (action === 'auditSupply') {
      if (!cjConfigured()) return json(400, { error: 'cj-not-configured' });
      return json(200, await auditBatch(store, Math.max(0, Number(cursor) || 0), kind === 'alternatives' ? 'alternatives' : 'stock'));
    }
    if (action === 'approveReview' || action === 'rejectReview') {
      const r = await moderate(store, String(reviewId || ''), action === 'approveReview');
      return r ? json(200, { ok: true }) : json(404, { error: 'not-found' });
    }
    const order = sessionId ? await getOrder(store, sessionId) : null;
    if (!order) return json(404, { error: 'not-found' });
    // Own stock (OFF.): never re-run fulfilment, it would take the piece out of stock twice.
    if (action === 'retry' && order.store === 'off') return json(400, { error: 'own-stock' });
    if (action === 'retry') return json(200, await fulfill(store, { ...order, attention: null }));
    if (action === 'ship') {
      // Shipped by hand (own stock or ordered manually): tracking shown to the customer.
      const { saveOrder } = await import('../lib/store.mjs');
      order.status = 'shipped';
      order.attention = null;
      order.supplier.trackNumber = String(trackNumber || '').trim().slice(0, 60) || order.supplier.trackNumber || null;
      order.supplier.logisticName = String(carrier || '').trim().slice(0, 40) || order.supplier.logisticName || null;
      order.history.push({ at: new Date().toISOString(), event: `shipped by hand${order.supplier.trackNumber ? ` · ${order.supplier.trackNumber}` : ''}` });
      await saveOrder(store, order);
      return json(200, order);
    }
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
