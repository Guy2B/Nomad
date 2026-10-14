/**
 * OFF. API (served by the shared backend, CORS for the OFF site):
 *   POST /api/off/checkout {id, lang}            → reserves the piece, { url } of Stripe Checkout
 *   POST /api/off/sourcing {brand, model, …}     → private sourcing request
 * Admin (Authorization: Bearer <ADMIN_PASSWORD>):
 *   GET  /api/off/admin                          → products (with purchase prices), requests, stats
 *   POST /api/off/admin {action:'save', product} | {action:'status', id, status} | {action:'request', id, status}
 *   POST /api/off/upload (multipart: file, ref)  → { url: /media/… }
 */
import { authorized } from './admin.mjs';
import { OffError, adminData, checkout, createRequest, offReady, saveProduct, setRequestStatus, setStatus, uploadImage } from '../lib/off.mjs';
import { json, preflight } from '../lib/http.mjs';

export default async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const path = new URL(req.url).pathname.replace(/\/$/, '');
  if (!offReady()) return json(503, { error: 'off-not-configured' }, req);
  try {
    if (path === '/api/off/checkout' && req.method === 'POST') {
      if (!process.env.STRIPE_SECRET_KEY) return json(503, { error: 'payments-not-configured' }, req);
      const { id, lang } = await req.json().catch(() => ({}));
      return json(200, await checkout(id, lang), req);
    }
    if (path === '/api/off/sourcing' && req.method === 'POST') {
      return json(201, await createRequest(await req.json().catch(() => ({}))), req);
    }
    if (!authorized(req)) return json(401, { error: 'unauthorized' }, req);
    if (path === '/api/off/admin' && req.method === 'GET') return json(200, await adminData(), req);
    if (path === '/api/off/admin' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body.action === 'save') return json(200, await saveProduct(body.product ?? {}), req);
      if (body.action === 'status') return json(200, (await setStatus(String(body.id), body.status), { ok: true }), req);
      if (body.action === 'request') return json(200, (await setRequestStatus(String(body.id), body.status), { ok: true }), req);
      return json(400, { error: 'action' }, req);
    }
    if (path === '/api/off/upload' && req.method === 'POST') {
      const form = await req.formData();
      return json(201, await uploadImage(form.get('file'), String(form.get('ref') || '')), req);
    }
    return json(404, { error: 'not-found' }, req);
  } catch (err) {
    if (err instanceof OffError) return json(err.status, { error: err.message }, req);
    console.error('off', err);
    return json(502, { error: 'server' }, req);
  }
};
