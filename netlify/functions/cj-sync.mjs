/**
 * Scheduled every hour: asks CJ for the status of open supplier orders and
 * records tracking numbers (shown to the customer on the tracking page).
 */
import { crm, listOrders, saveOrder } from '../lib/store.mjs';
import { cjConfigured, supplierOrderDetail } from '../lib/cj.mjs';
import { notifyOwner } from '../lib/notify.mjs';

export default async () => {
  if (!cjConfigured()) return;
  const store = crm();
  const open = (await listOrders(store, 500)).filter(
    (o) => o.supplier.orderId && !['delivered', 'cancelled'].includes(o.status),
  );
  for (const o of open.slice(0, 50)) {
    try {
      const d = await supplierOrderDetail(o.supplier.orderId, store);
      const before = `${o.supplier.status}|${o.supplier.trackNumber}`;
      o.supplier.status = d.status || o.supplier.status;
      o.supplier.trackNumber = d.trackNumber || o.supplier.trackNumber;
      o.supplier.logisticName = d.logisticName || o.supplier.logisticName;
      if (d.status === 'SHIPPED') o.status = 'shipped';
      if (d.status === 'DELIVERED') o.status = 'delivered';
      if (d.status === 'CANCELLED') {
        o.status = 'needs_attention';
        o.attention = 'Supplier order cancelled by CJ';
        await notifyOwner(`NOMADA - Supplier cancelled ${o.number}`, o.attention, 'high');
      }
      if (`${o.supplier.status}|${o.supplier.trackNumber}` !== before) {
        o.history.push({ at: new Date().toISOString(), event: `CJ ${o.supplier.status}${o.supplier.trackNumber ? ` · ${o.supplier.trackNumber}` : ''}` });
        await saveOrder(store, o);
      }
    } catch (err) {
      console.error('cj-sync', o.number, err);
    }
  }
};

export const config = { schedule: '@hourly' };
