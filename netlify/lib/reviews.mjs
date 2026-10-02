/**
 * Verified customer reviews. Only a customer with an order can review a product
 * of that order (order number + e-mail must match), once per order and product.
 * Every review waits for moderation in the admin before it is shown.
 *   reviews/pending                         → [ review ]          (latest first)
 *   reviews/approved/<store>/<product>      → [ public review ]
 */
import { ORDER_NUMBER, product } from './catalog.mjs';
import { listOrders } from './store.mjs';

const PENDING = 'reviews/pending';
const approvedKey = (store, productId) => `reviews/approved/${store}/${productId}`;

export class ReviewError extends Error {}

const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
/** Public display name: first name + initial ("Léa M."), never the full name or e-mail. */
export const displayName = (name) => {
  const parts = clean(name, 60).split(' ').filter(Boolean);
  if (!parts.length) return '';
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
};

export async function submitReview(store, input, now = new Date()) {
  const number = clean(input?.order, 20).toUpperCase();
  const email = clean(input?.email, 120).toLowerCase();
  const productId = clean(input?.product, 60);
  const rating = Math.round(Number(input?.rating));
  const text = clean(input?.text, 1200);
  if (!ORDER_NUMBER.test(number) || !email.includes('@')) throw new ReviewError('bad-order');
  if (!(rating >= 1 && rating <= 5)) throw new ReviewError('bad-rating');
  if (text.length < 10) throw new ReviewError('too-short');
  if (input?.consent !== true) throw new ReviewError('consent');
  const order = (await listOrders(store, 5000)).find((o) => o.number === number && o.customer.email.toLowerCase() === email);
  if (!order) throw new ReviewError('order-not-found');
  const storeId = order.store || 'nomad';
  if (!order.items.some((i) => i.id === productId) || !product(storeId, productId)) throw new ReviewError('not-in-order');
  const pending = (await store.get(PENDING, { type: 'json' })) ?? [];
  const approved = (await store.get(approvedKey(storeId, productId), { type: 'json' })) ?? [];
  const id = `${number}-${productId}`;
  if (pending.some((r) => r.id === id) || approved.some((r) => r.id === id)) throw new ReviewError('already-reviewed');
  const review = {
    id,
    store: storeId,
    product: productId,
    order: number,
    rating,
    title: clean(input?.title, 80),
    text,
    name: displayName(input?.name || order.customer.name),
    lang: ['de', 'fr', 'en'].includes(input?.lang) ? input.lang : 'de',
    createdAt: now.toISOString(),
  };
  pending.unshift(review);
  await store.setJSON(PENDING, pending.slice(0, 1000));
  return review;
}

export const pendingReviews = async (store) => (await store.get(PENDING, { type: 'json' })) ?? [];

export async function moderate(store, id, approve) {
  const pending = await pendingReviews(store);
  const r = pending.find((x) => x.id === id);
  if (!r) return null;
  await store.setJSON(PENDING, pending.filter((x) => x.id !== id));
  if (approve) {
    const key = approvedKey(r.store, r.product);
    const list = (await store.get(key, { type: 'json' })) ?? [];
    const { order, ...pub } = r; // the order number stays private
    list.unshift({ ...pub, approvedAt: new Date().toISOString() });
    await store.setJSON(key, list.slice(0, 500));
  }
  return r;
}

export async function publicReviews(store, storeId, productId) {
  const list = (await store.get(approvedKey(storeId, productId), { type: 'json' })) ?? [];
  const avg = list.length ? Math.round((list.reduce((a, r) => a + r.rating, 0) / list.length) * 10) / 10 : null;
  return { count: list.length, average: avg, reviews: list.slice(0, 50).map(({ id, ...r }) => r) };
}
