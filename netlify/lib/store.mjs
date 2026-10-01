/**
 * CRM storage (Netlify Blobs): orders/<stripeSessionId>, customers/<email>,
 * index/orders (latest first), cj/token. An in-memory store is used in tests.
 */
import { getStore } from '@netlify/blobs';

let memory = null;

export function crm() {
  if (process.env.NOMAD_MEMORY_STORE === '1') {
    memory ??= new Map();
    return {
      async get(key, opts) {
        const v = memory.get(key);
        return v === undefined ? null : opts?.type === 'json' ? JSON.parse(v) : v;
      },
      async setJSON(key, value) {
        memory.set(key, JSON.stringify(value));
      },
      async delete(key) {
        memory.delete(key);
      },
    };
  }
  return getStore({ name: 'crm', consistency: 'strong' });
}

export const resetMemoryStore = () => {
  memory = null;
};

const INDEX = 'index/orders';

export async function saveOrder(store, order) {
  await store.setJSON(`orders/${order.sessionId}`, order);
  const index = (await store.get(INDEX, { type: 'json' })) ?? [];
  if (!index.includes(order.sessionId)) {
    index.unshift(order.sessionId);
    await store.setJSON(INDEX, index.slice(0, 5000));
  }
}

export const getOrder = (store, sessionId) => store.get(`orders/${sessionId}`, { type: 'json' });

export async function listOrders(store, limit = 200) {
  const index = (await store.get(INDEX, { type: 'json' })) ?? [];
  const orders = await Promise.all(index.slice(0, limit).map((id) => getOrder(store, id)));
  return orders.filter(Boolean);
}

/** Creates or updates the CRM customer and returns it. */
export async function upsertCustomer(store, order) {
  const key = `customers/${order.customer.email.toLowerCase()}`;
  const cur = (await store.get(key, { type: 'json' })) ?? {
    email: order.customer.email.toLowerCase(),
    firstOrderAt: order.createdAt,
    orders: [],
    lifetimeCents: 0,
  };
  if (!cur.orders.includes(order.number)) {
    cur.orders.unshift(order.number);
    cur.lifetimeCents += order.totalCents;
  }
  cur.name = order.customer.name || cur.name;
  cur.phone = order.customer.phone || cur.phone;
  cur.lastAddress = order.shipping;
  cur.lastOrderAt = order.createdAt;
  cur.lang = order.lang;
  await store.setJSON(key, cur);
  return cur;
}
