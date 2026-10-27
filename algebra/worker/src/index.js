/**
 * Algebra API (Cloudflare Worker + D1). Routes under /api:
 *   POST /api/checkout                 cart → Stripe Checkout Session (prices from the catalogue)
 *   POST /api/stripe/webhook           payment events → order paid → supplier fulfillment
 *   GET  /api/orders/by-session/:sid   order number for the success page
 *   POST /api/orders/lookup            {order, email} → status + tracking
 *   POST /api/newsletter               double opt-in start · GET /api/newsletter/confirm?token=
 *   POST /api/contact                  message to the owner
 *   POST /api/webhooks/valadio         fulfillment provider push (signed), idempotent
 *   POST /api/events                   first-party statistics, only after consent (worker/src/analytics.js)
 *   POST /api/circle · GET /api/circle/confirm · POST /api/circle/member|prefs|leave   A Circle (worker/src/circle.js)
 *   GET  /api/admin/<view>             Operating Cockpit, Bearer ADMIN_TOKEN (worker/src/cockpit/api.js)
 *   POST /api/admin/orders/:id/costs   real costs of an order (provider invoice, Stripe balance, manual)
 *   GET  /api/admin/orders             Bearer ADMIN_TOKEN · POST /api/admin/orders/:id/retry
 *   GET  /api/admin/fulfillment        Bearer ADMIN_TOKEN · provider, mapping, costs (never public)
 *   GET  /api/health
 * Former Digital Studio URLs (/leistungen/*, /project.html…) → 301 to algbr.de when LEGACY_STUDIO_REDIRECTS = "1".
 * Cron (wrangler.toml): sweep() retries fulfillment, polls supplier status, expires unpaid orders.
 */
import { ensureSchema } from './schema.js';
import { stripeRequest, timingSafeEqual, verifyStripeSignature } from './stripe.js';
import { providerFor, FulfillmentError } from './fulfillment/provider.js';
import { isConfirmed, supplierMappings } from './fulfillment/mapping.js';
import { allVariants } from '../../data/catalog.mjs';
import { sendMail, template } from './email.js';
import { legacyStudioTarget } from './legacy.js';
import { confirmMembership, getMember, leave, requestMembership, savePrefs } from './circle.js';
import { cockpit } from './cockpit/api.js';
import { pruneEvents, recordEvents } from './analytics.js';
import { HttpError, applyStatus, createPendingOrder, event, fulfill, getBySession, getOrder, markPaid, markRefunded, priceCart, setStatus, sweep, syncStatus } from './orders.js';

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
  const priced = priceCart(b, { live: env.SITE_MODE === 'live' });
  const origin = env.SITE_ORIGIN;
  if (env.MOCK_PAYMENTS === '1') {
    // Local end-to-end tests only: no Stripe, the order is paid immediately.
    const { id, number } = await createPendingOrder(env.DB, { lang, country: b.country, priced });
    const sid = `mock_${id}`;
    await env.DB.prepare('UPDATE alg_orders SET stripe_session_id = ? WHERE id = ?').bind(sid, id).run();
    const o = await getOrder(env.DB, id);
    await markPaid(env, o, { amount_total: Math.round(priced.total * 100), customer_details: { email: b.mockEmail || 'test@example.com', name: 'Test Kunde' }, shipping_details: { name: 'Test Kunde', address: b.mockAddress || { line1: 'Teststraße 1', postal_code: '10115', city: 'Berlin', country: b.country } }, payment_intent: 'pi_mock' });
    await fulfill(env, await getOrder(env.DB, id), providerFor(env));
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
      // store: 'algebra' lets the AlGBr shops' webhook (same Stripe account) ignore these sessions.
      metadata: { store: 'algebra', order_id: id, order_number: number },
      payment_intent_data: { metadata: { store: 'algebra', order_id: id, order_number: number } },
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
  const supplier = providerFor(env);
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

/** Provider webhook: signature, idempotency, status mapping. Never exposes provider statuses to customers. */
export async function handleProviderWebhook(req, env) {
  const rawBody = await req.text();
  if (rawBody.length > 100000) throw new HttpError(413, 'TOO_LARGE');
  const prov = providerFor(env);
  let e;
  try {
    e = await prov.handleWebhook({ rawBody, headers: req.headers });
  } catch (err) {
    if (err instanceof FulfillmentError) {
      console.log('[webhook]', err.kind, err.message);
      return json({ error: err.kind }, err.kind === 'signature' ? 401 : err.kind === 'not_configured' ? 503 : 400);
    }
    throw err;
  }
  const eventId = e.eventId || `${e.supplierOrderId}:${e.rawStatus}:${e.trackingNumber || ''}`;
  const seen = await env.DB.prepare('SELECT id FROM alg_provider_events WHERE id = ?').bind(eventId).first();
  if (seen) return json({ received: true, duplicate: true });
  const o = e.supplierOrderId ? await env.DB.prepare('SELECT * FROM alg_orders WHERE supplier_order_id = ?').bind(e.supplierOrderId).first() : null;
  // 404 → the provider retries later (order may not be stored yet); nothing recorded so the retry is processed
  if (!o) return json({ error: 'not found' }, 404);
  await event(env.DB, o.id, 'provider_webhook', { provider: prov.name, status: e.status, raw: e.rawStatus });
  if (e.status) await applyStatus(env, o, { status: e.status, carrier: e.carrier, trackingNumber: e.trackingNumber, trackingUrl: e.trackingUrl });
  await env.DB.prepare('INSERT INTO alg_provider_events (id, provider, order_id, status, created_at) VALUES (?,?,?,?,?)').bind(eventId, prov.name, o.id, e.status, new Date().toISOString()).run();
  return json({ received: true });
}

async function route(req, env, ctx) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '');
  const m = req.method;
  if (env.LEGACY_STUDIO_REDIRECTS === '1' && (m === 'GET' || m === 'HEAD')) {
    const to = legacyStudioTarget(url.pathname);
    if (to) return new Response(null, { status: 301, headers: { location: to, 'cache-control': 'public, max-age=86400' } });
  }
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(env, req), 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });

  if (p === '/api/health') return json({ ok: true, fulfillment: providerFor(env).sandbox ? 'sandbox' : 'live', stripe: env.STRIPE_SECRET_KEY ? (env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live') : 'NEEDS_CREDENTIALS', mail: env.RESEND_API_KEY ? 'resend' : 'MOCKED' });
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
  if (p === '/api/webhooks/valadio' && m === 'POST') return handleProviderWebhook(req, env);
  if (p === '/api/events' && m === 'POST') return json(await recordEvents(req, env, await body(req, 8000)));
  if (p === '/api/circle' && m === 'POST') return json(await requestMembership(env, await body(req, 4000), { origin: url.origin, ctx }));
  if (p === '/api/circle/confirm' && m === 'GET') return Response.redirect(await confirmMembership(env, url.searchParams.get('token') || '', { ctx }), 302);
  if (p === '/api/circle/member' && m === 'POST') return json(await getMember(env, (await body(req, 2000)).token));
  if (p === '/api/circle/prefs' && m === 'POST') {
    const b = await body(req, 2000);
    return json(await savePrefs(env, b.token, b.prefs, b.lang));
  }
  if (p === '/api/circle/leave' && m === 'POST') return json(await leave(env, (await body(req, 2000)).token));
  if (p.startsWith('/api/admin/')) {
    const auth = req.headers.get('authorization') || '';
    if (!env.ADMIN_TOKEN || !timingSafeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`)) return json({ error: 'forbidden' }, 403);
    if (p === '/api/admin/fulfillment' && m === 'GET') {
      // admin only: provider, supplier references, confirmation status, costs
      const prov = providerFor(env);
      const variants = allVariants().filter((v) => v.purchasable);
      const skus = variants.map((v) => v.sku);
      return json({
        provider: prov.name,
        sandbox: Boolean(prov.sandbox),
        valadio: supplierMappings(skus, 'valadio'),
        a61Fallback: supplierMappings(skus, 'a61'),
        variants: { total: variants.length, confirmed: variants.filter((v) => isConfirmed(v.sku)).length },
      });
    }
    const mc = p.match(/^\/api\/admin\/orders\/([\w-]+)\/costs$/);
    if (mc && m === 'POST') {
      const o = await getOrder(env.DB, mc[1]);
      if (!o) return json({ error: 'not found' }, 404);
      const b = await body(req, 2000);
      const num = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v) * 100) / 100 : NaN);
      const c = { supplier: num(b.productionCost), shipping: num(b.shippingCost), payment: num(b.paymentFee) };
      if (Object.values(c).some(Number.isNaN) || !['provider_invoice', 'stripe_balance', 'manual'].includes(b.source)) throw new HttpError(400, 'BAD_INPUT');
      await env.DB.prepare('INSERT INTO alg_order_costs (order_id, supplier_cost, shipping_cost, payment_fee, source, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET supplier_cost = excluded.supplier_cost, shipping_cost = excluded.shipping_cost, payment_fee = excluded.payment_fee, source = excluded.source, updated_at = excluded.updated_at').bind(o.id, c.supplier, c.shipping, c.payment, b.source, new Date().toISOString()).run();
      await event(env.DB, o.id, 'costs', { ...c, source: b.source });
      return json({ ok: true });
    }
    if (m === 'GET') {
      const view = p.slice('/api/admin/'.length);
      const data = await cockpit(view, url.searchParams, env);
      if (data) return json(data);
    }
    const mm = p.match(/^\/api\/admin\/orders\/([\w-]+)\/retry$/);
    if (mm && m === 'POST') {
      const o = await getOrder(env.DB, mm[1]);
      if (!o) return json({ error: 'not found' }, 404);
      const back = ['needs_attention', 'fulfillment_failed'].includes(o.status) ? await setStatus(env.DB, o, 'paid', { fulfillment_attempts: 0 }) : o;
      return json(await fulfill(env, back, providerFor(env)));
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
    ctx.waitUntil(ensureSchema(env.DB).then(() => sweep(env, providerFor(env))).then((r) => console.log('[sweep]', JSON.stringify(r))).then(() => pruneEvents(env.DB)));
  },
};
