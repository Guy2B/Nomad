/**
 * GET /api/track?order=NM-…&email=… — order status for the customer.
 * Both the order number and the e-mail must match; nothing else is revealed.
 * GET /api/track?session=cs_… — used by the thank-you page right after payment.
 * Called by every storefront of the platform (CORS).
 */
import { ORDER_NUMBER } from '../lib/catalog.mjs';
import { json, preflight } from '../lib/http.mjs';
import { crm, getOrder, listOrders } from '../lib/store.mjs';

const publicView = (o) => ({
  number: o.number,
  status: o.status === 'needs_attention' ? 'processing' : o.status,
  createdAt: o.createdAt,
  items: o.items.map((i) => ({ name: i.name, qty: i.qty })),
  trackNumber: o.supplier.trackNumber,
  carrier: o.supplier.logisticName,
});

export default async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const url = new URL(req.url);
  const store = crm();
  const session = url.searchParams.get('session');
  if (session) {
    if (!/^cs_[A-Za-z0-9_]+$/.test(session)) return json(400, { error: 'bad-session' }, req);
    const o = await getOrder(store, session);
    return o ? json(200, { number: o.number }, req) : json(404, { error: 'pending' }, req);
  }
  const number = (url.searchParams.get('order') || '').trim().toUpperCase();
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!ORDER_NUMBER.test(number) || !email.includes('@')) return json(400, { error: 'bad-input' }, req);
  const o = (await listOrders(store, 5000)).find(
    (x) => x.number === number && x.customer.email.toLowerCase() === email,
  );
  return o ? json(200, publicView(o), req) : json(404, { error: 'not-found' }, req);
};

export const config = { path: '/api/track' };
