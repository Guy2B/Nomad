/**
 * Algebra API (Cloudflare Worker + D1). Routes under /api:
 *   POST /api/checkout                 cart → Stripe Checkout Session (prices from the catalogue)
 *   POST /api/stripe/webhook           payment events → order paid → supplier fulfillment
 *   GET  /api/orders/by-session/:sid   order number for the success page
 *   POST /api/orders/lookup            {order, email} → status + tracking
 *   POST /api/newsletter               double opt-in start · GET /api/newsletter/confirm?token=
 *   POST /api/contact                  message to the owner
 *   POST /api/supplier/webhook         supplier push (if A61 offers it), shared secret
 *   GET  /api/admin/orders             Bearer ADMIN_TOKEN · POST /api/admin/orders/:id/retry
 *   GET  /api/health
 * Cron (wrangler.toml): sweep() retries fulfillment, polls supplier status, expires unpaid orders.
 */
import { ensureSchema } from './schema.js';
import { stripeRequest, timingSafeEqual, verifyStripeSignature } from './stripe.js';
import { supplierFor } from './supplier.js';
import { sendMail, template } from './email.js';
import { HttpError, createPendingOrder, fulfill, getBySession, getOrder, markPaid, markRefunded, priceCart, setStatus, sweep, syncStatus } from './orders.js';

const LANGS = ['de', 'en', 'fr'];
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const isEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function cors(env, req) {
  const origin = req.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS || env.SITE_ORIGIN || '').split(',').map((s) => s.trim());
  return origin && allowed.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'origin' } : {};
}

async function body(req, max = 20000) {
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, 'TOO_LARGE');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'BAD_JSON');
  }
}

export async function handleCheckout(req, env, fetchImpl = fetch) {
  const b = await body(req);
  const lang = LANGS.includes(b.lang) ? b.lang : 'de';
  const priced = priceCart(b);
  const origin = env.SITE_ORIGIN;
  if (env.MOCK_PAYMENTS === '1') {
    // Local end-to-end tests only: no Stripe, the order is paid immediately.
    const { id, number } = await createPendingOrder(env.DB, { lang, country: b.country, priced });
    const sid = `mock_${id}`;
    await env.DB.prepare('UPDATE alg_orders SET stripe_session_id = ? WHERE id = ?').bind(sid, id).run();
    const o = await getOrder(env.DB, id);
    await markPaid(env, o, { amount_total: Math.round(priced.total * 100), customer_details: { email: b.mockEmail || 'test@example.com', name: 'Test Kunde' }, shipping_details: { name: 'Test Kunde', address: b.mockAddress || { line1: 'Teststraße 1', postal_code: '10115', city: 'Berlin', country: b.country } }, payment_intent: 'pi_mock' });
    await fulfill(env, await getOrder(env.DB, id), supplierFor(env));
    return json({ url: `${origin}/${lang}/order/success/?session_id=${sid}`, number, mocked: true });
  }
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, 'NEEDS_CREDENTIALS', 'Checkout not connected');
  if (env.SITE_MODE !== 'live' && !env.STRIPE_SECRET_KEY.startsWith('sk_test_')) throw new HttpError(503, 'PREVIEW_REQUIRES_TEST_KEY');
  const { id, number } = await createPendingOrder(env.DB, { lang, country: b.country, priced });
  const zoneName = { de: 'Standardversand', en: 'Standard shipping', fr: 'Livraison standard' }[lang];
  const session = await stripeRequest(
    env,
    'POST',
    '/checkout/sessions',
    {
      mode: 'payment',
      locale: lang,
      client_reference_id: id,
      metadata: { order_id: id, order_number: number },
      payment_intent_data: { metadata: { order_id: id, order_number: number } },
      success_url: `${origin}/${lang}/order/success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${lang}/cart/`,
      shipping_address_collection: { allowed_countries: { 0: b.country } },
      phone_number_collection: { enabled: false },
      shipping_options: { 0: { shipping_rate_data: { type: 'fixed_amount', display_name: zoneName, fixed_amount: { amount: Math.round(priced.shipping * 100), currency: 'eur' } } } },
      line_items: Object.fromEntries(
        priced.lines.map((l, i) => [i, { quantity: l.qty, price_data: { currency: 'eur', unit_amount: Math.round(l.price * 100), product_data: { name: `Algebra ${l.name}`, description: `${l.color} · ${l.size}${l.cut ? ` · ${l.cut}` : ''}`, metadata: { sku: l.sku } } } }]),
      ),
      ...(env.STRIPE_REQUIRE_TERMS === '1' ? { consent_collection: { terms_of_service: 'required' } } : {}),
    },
    fetchImpl,
  );
  await env.DB.prepare('UPDATE alg_orders SET stripe_session_id = ? WHERE id = ?').bind(session.id, id).run();
  return json({ url: session.url, number });
}

export async function handleStripeWebhook(req, env, fetchImpl = fetch) {
  const payload = await req.text();
  const ok = await verifyStripeSignature(payload, req.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: 'bad signature' }, 400);
  const evt = JSON.parse(payload);
  const seen = await env.DB.prepare('SELECT id FROM alg_stripe_events WHERE id = ?').bind(evt.id).first();
  if (seen) return json({ received: true, duplicate: true });
  const supplier = supplierFor(env);
  const obj = evt.data.object;
  const orderFromSession = async () => (obj.metadata?.order_id ? getOrder(env.DB, obj.metadata.order_id) : getBySession(env.DB, obj.id));
  switch (evt.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const o = await orderFromSession();
      if (!o) break;
      if (obj.payment_status === 'paid') {
        const paid = await markPaid(env, o, obj);
        await fulfill(env, paid, supplier);
      }
      break;
    }
    case 'checkout.session.async_payment_failed': {
      const o = await orderFromSession();
      if (o && o.status === 'pending_payment') await setStatus(env.DB, o, 'payment_failed');
      break;
    }
    case 'checkout.session.expired': {
      const o = await orderFromSession();
      if (o && o.status === 'pending_payment') await setStatus(env.DB, o, 'expired');
      break;
    }
    case 'charge.refunded': {
      const oid = obj.metadata?.order_id;
      const o = oid ? await getOrder(env.DB, oid) : null;
      if (o && obj.refunded) await markRefunded(env, o, supplier);
      break;
    }
    default:
      break;
  }
  await env.DB.prepare('INSERT INTO alg_stripe_events (id, type, created_at) VALUES (?,?,?)').bind(evt.id, evt.type, new Date().toISOString()).run();
  void fetchImpl;
  return json({ received: true });
}

async function route(req, env, ctx) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '');
  const m = req.method;
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(env, req), 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });

  if (p === '/api/health') return json({ ok: true, supplier: env.SUPPLIER_MODE || 'mock', stripe: env.STRIPE_SECRET_KEY ? (env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live') : 'NEEDS_CREDENTIALS', mail: env.RESEND_API_KEY ? 'resend' : 'MOCKED' });
  if (p === '/api/checkout' && m === 'POST') return handleCheckout(req, env);
  if (p === '/api/stripe/webhook' && m === 'POST') return handleStripeWebhook(req, env);

  if (p.startsWith('/api/orders/by-session/') && m === 'GET') {
    const o = await getBySession(env.DB, decodeURIComponent(p.split('/').pop()));
    if (!o) return json({ error: 'not found' }, 404);
    return json({ number: o.number, status: o.status, total: o.total });
  }
  if (p === '/api/orders/lookup' && m === 'POST') {
    const b = await body(req, 2000);
    const o = typeof b.order === 'string' ? await env.DB.prepare('SELECT * FROM alg_orders WHERE number = ?').bind(b.order.trim().toUpperCase()).first() : null;
    const ok = o && o.email && typeof b.email === 'string' && timingSafeEqual(o.email.toLowerCase(), b.email.trim().toLowerCase());
    if (!ok) return json({ error: 'not found' }, 404);
    return json({ number: o.number, status: o.status, carrier: o.carrier, trackingNumber: o.tracking_number, trackingUrl: o.tracking_url });
  }
  if (p === '/api/newsletter' && m === 'POST') {
    const b = await body(req, 2000);
    if (!isEmail(b.email)) throw new HttpError(400, 'BAD_EMAIL');
    const lang = LANGS.includes(b.lang) ? b.lang : 'de';
    const email = b.email.trim().toLowerCase();
    const token = crypto.randomUUID();
    const ex = await env.DB.prepare('SELECT status FROM alg_subscribers WHERE email = ?').bind(email).first();
    if (ex?.status === 'confirmed') return json({ ok: true });
    await env.DB.prepare('INSERT INTO alg_subscribers (email, lang, status, token, created_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET token = excluded.token, lang = excluded.lang, status = \'pending\'').bind(email, lang, 'pending', token, new Date().toISOString()).run();
    const link = `${env.API_ORIGIN || url.origin}/api/newsletter/confirm?token=${token}`;
    const sending = sendMail(env, { to: email, ...template('newsletter', lang, link) });
    if (ctx?.waitUntil) ctx.waitUntil(sending);
    else await sending;
    return json({ ok: true });
  }
  if (p === '/api/newsletter/confirm' && m === 'GET') {
    const token = url.searchParams.get('token') || '';
    const s = await env.DB.prepare('SELECT * FROM alg_subscribers WHERE token = ?').bind(token).first();
    if (!s) return new Response('Link expired', { status: 404 });
    await env.DB.prepare("UPDATE alg_subscribers SET status = 'confirmed', confirmed_at = ? WHERE email = ?").bind(new Date().toISOString(), s.email).run();
    return Response.redirect(`${env.SITE_ORIGIN}/${s.lang}/?newsletter=confirmed`, 302);
  }
  if (p === '/api/contact' && m === 'POST') {
    const b = await body(req, 8000);
    if (!isEmail(b.email) || typeof b.message !== 'string' || !b.message.trim() || b.message.length > 5000) throw new HttpError(400, 'BAD_INPUT');
    if (!env.RESEND_API_KEY || !env.OWNER_EMAIL) throw new HttpError(503, 'NEEDS_CREDENTIALS');
    await sendMail(env, { to: env.OWNER_EMAIL, subject: `[Algebra] Kontakt: ${String(b.name || '').slice(0, 80)}`, text: `${b.name || ''} <${b.email}>\n\n${b.message}`, replyTo: b.email });
    return json({ ok: true });
  }
  if (p === '/api/supplier/webhook' && m === 'POST') {
    if (!env.SUPPLIER_WEBHOOK_SECRET || !timingSafeEqual(req.headers.get('x-algebra-secret') || '', env.SUPPLIER_WEBHOOK_SECRET)) return json({ error: 'forbidden' }, 403);
    const b = await body(req);
    const o = b.supplierOrderId ? await env.DB.prepare('SELECT * FROM alg_orders WHERE supplier_order_id = ?').bind(b.supplierOrderId).first() : null;
    if (!o) return json({ error: 'not found' }, 404);
    await syncStatus(env, o, supplierFor(env));
    return json({ ok: true });
  }
  if (p.startsWith('/api/admin/')) {
    const auth = req.headers.get('authorization') || '';
    if (!env.ADMIN_TOKEN || !timingSafeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`)) return json({ error: 'forbidden' }, 403);
    if (p === '/api/admin/orders' && m === 'GET') {
      const r = await env.DB.prepare('SELECT id, number, status, email, total, supplier_order_id, last_error, created_at FROM alg_orders ORDER BY created_at DESC LIMIT 200').all();
      return json(r.results);
    }
    const mm = p.match(/^\/api\/admin\/orders\/([\w-]+)\/retry$/);
    if (mm && m === 'POST') {
      const o = await getOrder(env.DB, mm[1]);
      if (!o) return json({ error: 'not found' }, 404);
      const back = ['needs_attention', 'fulfillment_failed'].includes(o.status) ? await setStatus(env.DB, o, 'paid', { fulfillment_attempts: 0 }) : o;
      return json(await fulfill(env, back, supplierFor(env)));
    }
  }
  // everything else is the static shop (Workers static assets); /api/* unknown routes stay JSON 404
  if (!p.startsWith('/api') && env.ASSETS) return env.ASSETS.fetch(req);
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(req, env, ctx) {
    try {
      if (new URL(req.url).pathname.startsWith('/api')) await ensureSchema(env.DB);
      const res = await route(req, env, ctx);
      for (const [k, v] of Object.entries(cors(env, req))) res.headers.set(k, v);
      return res;
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code }, e.status, cors(env, req));
      console.log('[api error]', e.stack || e.message);
      return json({ error: 'INTERNAL' }, 500, cors(env, req));
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ensureSchema(env.DB).then(() => sweep(env, supplierFor(env))).then((r) => console.log('[sweep]', JSON.stringify(r))));
  },
};
