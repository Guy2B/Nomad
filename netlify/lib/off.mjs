/**
 * OFF. by ALGBr — outlet pieces held in our own stock in Germany (not
 * dropshipped). Products live in D1 (off_products), photos in KV (OFF_MEDIA),
 * private sourcing requests in off_requests. Each piece is unique or nearly:
 * a checkout reserves it for 30 minutes, the paid webhook marks it sold, and
 * the order lands in the shared CRM to be shipped by hand (Hermes).
 */
import { createCheckoutSession } from './stripe.mjs';

export const OFF_SITE = 'https://off.algbr.eu';
const site = () => process.env.OFF_ORIGIN || OFF_SITE;
export const SHIPPING_CENTS = 579;
export const RESERVE_MINUTES = 30;
const LANGS = ['de', 'fr', 'en'];
const STATUSES = ['live', 'sold', 'draft', 'archived'];

let db = null;
let media = null;
/** Bindings from the Worker: D1 database and the KV namespace holding photos. */
export const useOff = (bindings) => {
  db = bindings.db ?? null;
  media = bindings.media ?? null;
};
export const offReady = () => Boolean(db);

export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS off_products (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'live',
    brand TEXT NOT NULL, name TEXT NOT NULL, ref TEXT NOT NULL, gtin TEXT, color TEXT,
    size_eu TEXT, size_us TEXT, size_uk TEXT, cm TEXT, condition TEXT NOT NULL DEFAULT 'new',
    price_cents INTEGER NOT NULL, rrp_cents INTEGER, purchase_cents INTEGER,
    stock INTEGER NOT NULL DEFAULT 1, images_json TEXT NOT NULL DEFAULT '[]',
    description TEXT, reserved_until TEXT, sold_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS off_requests (
    id TEXT PRIMARY KEY, brand TEXT, model TEXT, color TEXT, size_eu TEXT, max_budget_cents INTEGER,
    email TEXT NOT NULL, notes TEXT, lang TEXT, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL)`,
];
let ready = null;
const init = () => (ready ??= db.batch(SCHEMA.map((s) => db.prepare(s))));

export class OffError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
}

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);

const cents = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Math.round(Number(String(v).replace(',', '.')) * 100);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const text = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/** Validated product row from the admin form (euros in, cents stored). */
export function productFromInput(p, now = new Date()) {
  const brand = text(p.brand, 60);
  const name = text(p.name, 120);
  const ref = text(p.ref, 60).toUpperCase();
  const price = cents(p.price);
  if (!brand || !name || !ref || !price) throw new OffError('missing-fields');
  const images = (Array.isArray(p.images) ? p.images : [])
    .map((u) => String(u))
    .filter((u) => /^\/media\/[A-Za-z0-9/_.-]+$/.test(u))
    .slice(0, 12);
  const sizeEU = text(p.sizeEU, 10);
  return {
    id: text(p.id, 60) || crypto.randomUUID(),
    slug: slugify(`${brand}-${name}-${p.color || ''}-${ref}${sizeEU ? `-eu${sizeEU}` : ''}`),
    status: STATUSES.includes(p.status) ? p.status : 'live',
    brand,
    name,
    ref,
    gtin: text(p.gtin, 14).replace(/\D/g, ''),
    color: text(p.color, 60),
    size_eu: sizeEU,
    size_us: text(p.sizeUS, 10),
    size_uk: text(p.sizeUK, 10),
    cm: text(p.cm, 10),
    condition: ['new', 'new_no_box', 'like_new'].includes(p.condition) ? p.condition : 'new',
    price_cents: price,
    rrp_cents: cents(p.rrp),
    purchase_cents: cents(p.purchasePrice),
    stock: Math.max(0, Math.min(99, Number.parseInt(p.stock ?? 1, 10) || 0)),
    images_json: JSON.stringify(images),
    description: text(p.description, 2000),
    updated_at: now.toISOString(),
  };
}

const COLS = ['id', 'slug', 'status', 'brand', 'name', 'ref', 'gtin', 'color', 'size_eu', 'size_us', 'size_uk', 'cm', 'condition', 'price_cents', 'rrp_cents', 'purchase_cents', 'stock', 'images_json', 'description', 'updated_at'];

export async function saveProduct(input, now = new Date()) {
  await init();
  const p = productFromInput(input, now);
  const existing = await db.prepare('SELECT id, created_at FROM off_products WHERE id = ?').bind(p.id).first();
  if (existing) {
    await db
      .prepare(`UPDATE off_products SET ${COLS.slice(1).map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
      .bind(...COLS.slice(1).map((c) => p[c]), p.id)
      .run();
  } else {
    await db
      .prepare(`INSERT INTO off_products (${COLS.join(', ')}, created_at) VALUES (${COLS.map(() => '?').join(', ')}, ?)`)
      .bind(...COLS.map((c) => p[c]), now.toISOString())
      .run();
  }
  return p;
}

export async function setStatus(id, status) {
  if (!STATUSES.includes(status)) throw new OffError('bad-status');
  await init();
  const r = await db
    .prepare("UPDATE off_products SET status = ?, stock = CASE WHEN ? = 'live' AND stock = 0 THEN 1 ELSE stock END, updated_at = ? WHERE id = ?")
    .bind(status, status, new Date().toISOString(), id)
    .run();
  if (!r.meta?.changes) throw new OffError('not-found', 404);
}

export async function adminData() {
  await init();
  const { results: products = [] } = await db.prepare('SELECT * FROM off_products ORDER BY created_at DESC').all();
  const { results: requests = [] } = await db.prepare('SELECT * FROM off_requests ORDER BY created_at DESC LIMIT 500').all();
  const live = products.filter((p) => p.status === 'live' && p.stock > 0);
  const sold = products.filter((p) => p.status === 'sold');
  return {
    products: products.map((p) => ({ ...p, images: JSON.parse(p.images_json || '[]') })),
    requests,
    stats: {
      live: live.length,
      stockValueCents: live.reduce((a, p) => a + p.price_cents * p.stock, 0),
      stockCostCents: live.reduce((a, p) => a + (p.purchase_cents ?? 0) * p.stock, 0),
      sold: sold.length,
      soldMarginCents: sold.reduce((a, p) => a + p.price_cents - (p.purchase_cents ?? 0), 0),
      openRequests: requests.filter((r) => r.status === 'new').length,
    },
  };
}

export async function setRequestStatus(id, status) {
  if (!['new', 'done'].includes(status)) throw new OffError('bad-status');
  await init();
  await db.prepare('UPDATE off_requests SET status = ? WHERE id = ?').bind(status, id).run();
}

/** Private sourcing request from the public form (honeypot field `website` must stay empty). */
export async function createRequest(p, now = new Date()) {
  if (p.website) return { ok: true };
  const email = text(p.email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OffError('bad-email');
  await init();
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO off_requests (id, brand, model, color, size_eu, max_budget_cents, email, notes, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, text(p.brand, 60), text(p.model, 120), text(p.color, 60), text(p.sizeEU, 10), cents(p.maxBudget), email, text(p.notes, 1000), LANGS.includes(p.lang) ? p.lang : 'de', now.toISOString())
    .run();
  return { ok: true, id };
}

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Stores one photo in KV and returns its public path on the OFF site. */
export async function uploadImage(file, ref) {
  if (!media) throw new OffError('media-not-configured', 503);
  const ext = IMAGE_TYPES[file?.type];
  if (!ext) throw new OffError('bad-type', 415);
  if (file.size > 8 * 1024 * 1024) throw new OffError('too-large', 413);
  const key = `p/${slugify(ref || 'product') || 'product'}/${crypto.randomUUID()}.${ext}`;
  await media.put(key, await file.arrayBuffer(), { metadata: { type: file.type } });
  return { url: `/media/${key}` };
}

const LABEL = { de: 'Größe', fr: 'Pointure', en: 'Size' };

/** The Stripe Checkout payload for one piece (exported for tests). */
export function offSessionPayload(p, lang, site = OFF_SITE, now = Date.now()) {
  const images = JSON.parse(p.images_json || '[]').slice(0, 1).map((u) => site + u);
  const item = { id: p.id, ref: p.ref, name: `${p.brand} ${p.name}${p.color ? ` · ${p.color}` : ''}`, size: p.size_eu, priceCents: p.price_cents };
  return {
    mode: 'payment',
    locale: lang,
    expires_at: Math.floor(now / 1000) + RESERVE_MINUTES * 60,
    success_url: `${site}/${lang}/danke?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/${lang}/p/${p.slug}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: p.price_cents,
          product_data: {
            name: `${item.name}${p.size_eu ? ` · ${LABEL[lang]} EU ${p.size_eu}` : ''}`,
            metadata: { ref: p.ref, store: 'off' },
            ...(images.length ? { images } : {}),
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: ['DE'] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: { de: 'Hermes Paket mit Sendungsverfolgung', fr: 'Colis Hermes suivi', en: 'Hermes tracked parcel' }[lang],
          fixed_amount: { amount: SHIPPING_CENTS, currency: 'eur' },
          delivery_estimate: { minimum: { unit: 'business_day', value: 2 }, maximum: { unit: 'business_day', value: 4 } },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    billing_address_collection: 'required',
    custom_text: {
      submit: {
        message: {
          de: `Versand aus Deutschland in 2–4 Werktagen · 14 Tage Widerrufsrecht · Rechnung per E-Mail. Der Artikel ist ${RESERVE_MINUTES} Minuten für Sie reserviert.`,
          fr: `Expédié d’Allemagne en 2–4 jours ouvrés · 14 jours de rétractation · Facture par e-mail. L’article vous est réservé ${RESERVE_MINUTES} minutes.`,
          en: `Ships from Germany in 2–4 working days · 14-day withdrawal · Invoice by e-mail. The item is reserved for you for ${RESERVE_MINUTES} minutes.`,
        }[lang],
      },
    },
    invoice_creation: {
      enabled: true,
      invoice_data: { description: 'OFF. by ALGBr', footer: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', metadata: { store: 'off', ref: p.ref } },
    },
    metadata: { store: 'off', lang, item: JSON.stringify(item) },
    payment_intent_data: { metadata: { store: 'off', ref: p.ref }, description: 'OFF. by ALGBr' },
  };
}

/** Reserves the piece (atomic: only if live, in stock and not already reserved) and opens Stripe Checkout. */
export async function checkout(id, lang, now = new Date()) {
  await init();
  const l = LANGS.includes(lang) ? lang : 'de';
  const until = new Date(now.getTime() + RESERVE_MINUTES * 60_000).toISOString();
  const r = await db
    .prepare("UPDATE off_products SET reserved_until = ? WHERE id = ? AND status = 'live' AND stock > 0 AND (reserved_until IS NULL OR reserved_until < ?)")
    .bind(until, String(id), now.toISOString())
    .run();
  if (!r.meta?.changes) {
    const p = await db.prepare('SELECT status, stock FROM off_products WHERE id = ?').bind(String(id)).first();
    throw new OffError(!p ? 'not-found' : p.status !== 'live' || p.stock <= 0 ? 'sold' : 'reserved', !p ? 404 : 409);
  }
  const p = await db.prepare('SELECT * FROM off_products WHERE id = ?').bind(String(id)).first();
  try {
    const session = await createCheckoutSession(offSessionPayload(p, l, site(), now.getTime()));
    return { url: session.url };
  } catch (err) {
    await db.prepare('UPDATE off_products SET reserved_until = NULL WHERE id = ?').bind(p.id).run();
    throw err;
  }
}

/** Order lines of a paid OFF session (the piece is described in the session metadata). */
export function offItems(session) {
  try {
    const i = JSON.parse(session.metadata?.item || '{}');
    if (!i.id) return [];
    return [{ id: i.id, sku: i.ref, name: `${i.name}${i.size ? ` · EU ${i.size}` : ''}`, qty: 1, unitCents: i.priceCents }];
  } catch {
    return [];
  }
}

/** After payment: one piece fewer, sold when none left, reservation released. */
export async function markSold(order, now = new Date()) {
  if (!db) return;
  await init();
  for (const i of order.items) {
    await db
      .prepare("UPDATE off_products SET stock = MAX(stock - ?, 0), status = CASE WHEN stock - ? <= 0 THEN 'sold' ELSE status END, sold_at = ?, reserved_until = NULL, updated_at = ? WHERE id = ?")
      .bind(i.qty, i.qty, now.toISOString(), now.toISOString(), i.id)
      .run();
  }
}
