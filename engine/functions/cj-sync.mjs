/**
 * Scheduled every hour:
 *  1. asks CJ for the status of open supplier orders and records tracking numbers
 *     (shown to the customer on the tracking page, and e-mailed);
 *  2. after-sale checks on recent orders: shipped / delivered / review e-mails,
 *     "pay in CJ" reminder and late-shipment alert (engine/lib/aftersale.mjs).
 */
import { crm, listOrders, saveOrder } from '../lib/store.mjs';
import { cjConfigured, supplierOrderDetail } from '../lib/cj.mjs';
import { notifyOwner } from '../lib/notify.mjs';
import { afterSaleAll } from '../lib/aftersale.mjs';

export async function syncSupplier(store, now = new Date()) {
  if (!cjConfigured()) return 0;
  const open = (await listOrders(store, 500)).filter(
    (o) => o.supplier.orderId && !['delivered', 'cancelled'].includes(o.status),
  );
  let changed = 0;
  for (const o of open.slice(0, 50)) {
    try {
      const d = await supplierOrderDetail(o.supplier.orderId, store);
      const before = `${o.supplier.status}|${o.supplier.trackNumber}|${o.status}`;
      o.supplier.status = d.status || o.supplier.status;
      o.supplier.trackNumber = d.trackNumber || o.supplier.trackNumber;
      o.supplier.logisticName = d.logisticName || o.supplier.logisticName;
      if (d.status === 'SHIPPED' && o.status !== 'shipped') {
        o.status = 'shipped';
        o.shippedAt ??= now.toISOString();
      }
      if (d.status === 'DELIVERED' && o.status !== 'delivered') {
        o.status = 'delivered';
        o.shippedAt ??= now.toISOString();
        o.deliveredAt ??= now.toISOString();
      }
      if (d.status === 'CANCELLED' && o.issue !== 'cancelled' && !o.refund) {
        o.status = 'needs_attention';
        o.issue = 'cancelled';
        o.attention = 'Annulée par CJ : bouton « Rembourser + e-mail » (remboursement Stripe intégral et excuses au client)';
        await notifyOwner(`${o.brand ?? 'GO'} - Annulee par CJ ${o.number}`, `${o.attention}`, 'high');
      }
      if (`${o.supplier.status}|${o.supplier.trackNumber}|${o.status}` !== before) {
        o.history.push({ at: now.toISOString(), event: `CJ ${o.supplier.status}${o.supplier.trackNumber ? ` · ${o.supplier.trackNumber}` : ''}` });
        await saveOrder(store, o);
        changed++;
      }
    } catch (err) {
      console.error('cj-sync', o.number, err);
    }
  }
  return changed;
}

export default async (now = new Date()) => {
  const store = crm();
  await syncSupplier(store, now);
  await afterSaleAll(store, now);
};

export const config = { schedule: '@hourly' };
