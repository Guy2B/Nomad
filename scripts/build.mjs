#!/usr/bin/env node
/**
 * Generates one storefront of the Nomad platform in dist/:
 *   node scripts/build.mjs [store]        (default: the host store, "nomad")
 * from stores/<store>/site.json + products.json + assets/:
 *   /<lang>/index.html, /<lang>/produkt/<id>.html, /<lang>/ratgeber/<slug>.html,
 *   warenkorb, danke, bestellung, legal pages, sitemap, robots, _headers.
 * Every storefront is static (Cloudflare Pages) and calls the shared API
 * (stores/platform.json → api) cross-origin. The backend itself is built with
 *   node scripts/build.mjs backend   → dist/ = /admin/ only (Netlify, with the functions).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { STR as BASE_STR } from './i18n.mjs';
import { legalPages } from './legal.mjs';
import { createTemplates } from './premium.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const STORE = process.argv[2] || process.env.STORE || 'nomad';
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const API = readJson(join(root, 'stores', 'platform.json')).api.replace(/\/$/, '');

if (STORE === 'backend') {
  // Shared backend: the admin dashboard (the API itself lives in netlify/functions).
  rmSync(dist, { recursive: true, force: true });
  cpSync(join(root, 'public', 'admin'), join(dist, 'admin'), { recursive: true });
  for (const f of ['style.css', 'algbr.svg']) cpSync(join(root, 'public', 'assets', f), join(dist, 'assets', f));
  cpSync(join(root, 'stores', 'nomad', 'assets', 'favicon.svg'), join(dist, 'assets', 'favicon.svg'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/admin/"><title>ALGBr</title>');
  writeFileSync(join(dist, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  writeFileSync(
    join(dist, '_headers'),
    [
      '/*',
      '  X-Robots-Tag: noindex, nofollow',
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      '  X-Frame-Options: DENY',
      "  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
      '',
      '/admin/*',
      '  Cache-Control: no-store',
      '',
    ].join('\n'),
  );
  console.log(`• dist/ built for the shared backend (${API}): /admin/`);
  process.exit(0);
}

const storeDir = join(root, 'stores', STORE);
if (!existsSync(join(storeDir, 'site.json'))) throw new Error(`Unknown store "${STORE}" (no stores/${STORE}/site.json)`);
const PRODUCTS = readJson(join(storeDir, 'products.json'));
const SITE = readJson(join(storeDir, 'site.json'));
const ACTIVE = PRODUCTS.filter((p) => p.active);
const GUIDES = SITE.guides ?? [];
const LEGAL = legalPages(SITE);
const HAS_THEME = existsSync(join(storeDir, 'assets', 'theme.css'));
const BASE = SITE.baseUrl.replace(/\/$/, '');
/** Content hash of the shared assets: ?v= on CSS/JS so browsers never keep a stale design. */
const ASSET_V = createHash('sha256')
  .update([join(root, 'public/assets/style.css'), join(root, 'public/assets/shop.js'), join(storeDir, 'assets/theme.css')].filter(existsSync).map((f) => readFileSync(f)).join(''))
  .digest('hex')
  .slice(0, 10);
/** Public URL of a page as Cloudflare Pages serves it (/de/, /de/produkt/x): canonical, hreflang, sitemap. */
const pub = (path) => `${BASE}/${path.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`;

/** Store texts = shared texts + the store's own overrides (site.json → copy). */
const merge = (a, b) => {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b ?? a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = merge(a?.[k], v);
  return out;
};
const STR = Object.fromEntries(
  SITE.languages.map((l) => {
    const t = merge(BASE_STR[l], SITE.copy?.[l]);
    t.faq = { ...t.faq, items: [...t.faq.items, ...(t.faqExtra ?? [])] };
    return [l, t];
  }),
);

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const money = (cents, lang) =>
  new Intl.NumberFormat({ de: 'de-DE', fr: 'fr-FR', en: 'en-IE' }[lang], { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
const fill = (s) => s.replace('{days}', SITE.shipping.deliveryDays).replace('{prefix}', SITE.orderPrefix);
const ldJson = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

function write(path, html) {
  const file = join(dist, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

/** Relative prefix from a page to the site root (pages live at /<lang>/ or /<lang>/<folder>/). */
const up = (depth) => '../'.repeat(depth);

const NEXT_AD = readJson(join(root, 'stores', 'platform.json')).next;
const { layout, card, home, productPage } = createTemplates({ SITE, ACTIVE, GUIDES, STR, NEXT_AD, API, HAS_THEME, ASSET_V, shopDataTag: (l) => shopDataTag(l), BASE, pub, esc, money, fill, ldJson, write, up });

function guidePage(g, lang) {
  const x = g.text[lang];
  const t = STR[lang];
  const body = `
<section class="section">
  <div class="wrap narrow guide">
    <p class="eyebrow">${esc(t.nav.guide)}</p>
    <h1>${esc(x.title)}</h1>
    <p class="lead">${esc(x.lead)}</p>
    <ol class="guide-list">${x.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>
    <h2>${esc(t.products.title)}</h2>
    <div class="grid">${ACTIVE.slice(0, 3)
      .map((p) => card(p, lang, '../'))
      .join('')
      .replaceAll('src="../assets/', 'src="../../assets/')}</div>
  </div>
</section>`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: x.title,
      description: x.description,
      step: x.items.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
    },
  ];
  write(
    `${lang}/ratgeber/${g.slug}.html`,
    layout({ lang, depth: 2, title: `${x.title} | ${SITE.brand}`, description: x.description, body, page: 'guide', alternates: `ratgeber/${g.slug}.html`, jsonLd }),
  );
}

function simplePage(lang, file, page, title, inner, noindex = false) {
  write(
    `${lang}/${file}`,
    layout({ lang, depth: 1, title: `${title} · ${SITE.brand}`, description: SITE.tagline[lang], body: inner, page, alternates: file, noindex }),
  );
}

/** Data the shop script needs: products (for the cart), money format, texts. */
function shopData(lang) {
  const t = STR[lang];
  return {
    lang,
    shippingCents: SITE.shipping.cents,
    products: Object.fromEntries(
      ACTIVE.map((p) => [p.id, { name: p.name, price: p.price, img: p.images[0], url: `produkt/${p.id}.html`, upsells: p.upsells ?? [] }]),
    ),
    t: { cart: t.cart, thanks: t.thanks, track: t.track, reviews: t.reviews },
  };
}
function shopDataTag(lang) {
  return `<script type="application/json" id="shop-data">${JSON.stringify(shopData(lang)).replace(/</g, '\\u003c')}</script>`;
}

function cartPage(lang) {
  const t = STR[lang].cart;
  simplePage(
    lang,
    'warenkorb.html',
    'cart',
    t.title,
    `<section class="section"><div class="wrap narrow">
  <h1>${esc(t.title)}</h1>
  <div data-cart-lines></div>
  <p class="muted" data-cart-empty hidden>${esc(t.empty)} <a href="index.html#produkte">${esc(t.continue)}</a></p>
  <div class="summary" data-cart-summary hidden>
    <p><span>${esc(t.subtotal)}</span><b data-subtotal></b></p>
    <p><span>${esc(t.shipping)}</span><b data-shipping></b></p>
    <p class="total"><span>${esc(t.total)}</span><b data-total></b></p>
    <p class="muted small">${esc(t.vat)}</p>
    <button class="btn btn-dark btn-lg btn-block" type="button" data-checkout>${esc(t.checkout)}</button>
    <p class="muted small">${esc(t.note)}</p>
    <p class="error" data-checkout-error hidden>${esc(t.error)}</p>
  </div>
  <div class="upsells" data-upsell hidden><h2 class="small-title">${esc(t.upsell)}</h2><div data-upsell-row></div></div>
</div></section>
${shopDataTag(lang)}`,
    true,
  );
}

function thanksPage(lang) {
  const t = STR[lang].thanks;
  simplePage(
    lang,
    'danke.html',
    'thanks',
    t.title,
    `<section class="section"><div class="wrap narrow center">
  <p class="check" aria-hidden="true">✓</p>
  <h1>${esc(t.title)}</h1>
  <p class="lead">${esc(t.lead)}</p>
  <p class="order-number" data-order-number aria-live="polite">${esc(t.pending)}</p>
  <p class="muted">${esc(t.next)}</p>
  <a class="btn btn-line" href="bestellung.html">${esc(t.track)}</a>
</div></section>
${shopDataTag(lang)}`,
    true,
  );
}

function trackPage(lang) {
  const t = STR[lang].track;
  simplePage(
    lang,
    'bestellung.html',
    'track',
    t.title,
    `<section class="section"><div class="wrap narrow">
  <h1>${esc(t.title)}</h1>
  <p class="muted">${esc(fill(t.lead))}</p>
  <form class="track-form" data-track-form>
    <label>${esc(t.number)}<input name="order" required placeholder="${SITE.orderPrefix}-261002-AB12" autocomplete="off"></label>
    <label>${esc(t.email)}<input name="email" type="email" required autocomplete="email"></label>
    <button class="btn btn-dark" type="submit">${esc(t.submit)}</button>
  </form>
  <div class="track-result" data-track-result aria-live="polite"></div>
</div></section>
${shopDataTag(lang)}`,
    true,
  );
}

function reviewPage(lang) {
  const t = STR[lang].reviews;
  const options = ACTIVE.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  simplePage(
    lang,
    'bewertung.html',
    'review',
    t.formTitle,
    `<section class="section"><div class="wrap narrow">
  <h1>${esc(t.formTitle)}</h1>
  <p class="muted">${esc(t.formLead)}</p>
  <form class="review-form" data-review-form novalidate>
    <label>${esc(t.order)}<input name="order" required placeholder="${SITE.orderPrefix}-261002-AB12" autocomplete="off"></label>
    <label>${esc(t.email)}<input name="email" type="email" required autocomplete="email"></label>
    <label>${esc(t.product)}<select name="product" required>${options}</select></label>
    <fieldset class="stars"><legend>${esc(t.rating)}</legend>${[5, 4, 3, 2, 1].map((n) => `<input type="radio" id="star${n}" name="rating" value="${n}"><label for="star${n}" title="${n}/5">★</label>`).join('')}</fieldset>
    <label>${esc(t.rTitle)}<input name="title" maxlength="80"></label>
    <label>${esc(t.text)}<textarea name="text" rows="5" required minlength="10" maxlength="1200"></textarea></label>
    <label>${esc(t.name)}<input name="name" maxlength="60" autocomplete="given-name"></label>
    <label class="check-row"><input type="checkbox" name="consent" required> <span>${esc(t.consent)}</span></label>
    <button class="btn btn-dark btn-lg" type="submit">${esc(t.submit)}</button>
    <p class="error" data-review-error hidden></p>
  </form>
  <p class="lead" data-review-thanks hidden>${esc(t.thanks)}</p>
  <p class="muted small">${esc(t.note)}</p>
</div></section>`,
    true,
  );
}

function legal(lang) {
  for (const [k, html] of Object.entries(LEGAL[lang]))
    simplePage(lang, `${k}.html`, 'legal', STR[lang].legalNames[k], `<section class="section"><div class="wrap narrow legal">${html}</div></section>`);
}

/** Security headers per storefront (Cloudflare Pages reads the same _headers format as Netlify). */
function headers() {
  const connect = ["'self'", API].filter(Boolean).join(' ');
  const csp = `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src ${connect} https://cloudflareinsights.com; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'self'`;
  return `/*
${SITE.launched ? '' : '  # PRE-LAUNCH: search engines kept out until the legal pages are complete ("launched": true in site.json).\n  X-Robots-Tag: noindex, nofollow\n'}  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${csp}

/assets/*
  Cache-Control: public, max-age=604800
`;
}

// ---------------------------------------------------------------- build
rmSync(dist, { recursive: true, force: true });
cpSync(join(root, 'public'), dist, { recursive: true, filter: (src) => !src.includes(join(root, 'public', 'admin')) });
cpSync(join(storeDir, 'assets'), join(dist, 'assets'), { recursive: true });
for (const lang of SITE.languages) {
  home(lang);
  for (const p of ACTIVE) productPage(p, lang);
  for (const g of GUIDES) guidePage(g, lang);
  cartPage(lang);
  thanksPage(lang);
  trackPage(lang);
  reviewPage(lang);
  legal(lang);
}
// Root: language chooser (redirect by browser language in shop.js).
write(
  'index.html',
  `<!doctype html><html lang="${SITE.defaultLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(SITE.seo?.[SITE.defaultLang]?.title || SITE.brand)}</title><meta name="description" content="${esc(SITE.seo?.[SITE.defaultLang]?.description || SITE.tagline[SITE.defaultLang])}"><link rel="canonical" href="${pub(`${SITE.defaultLang}/index.html`)}">${SITE.languages.map((l) => `<link rel="alternate" hreflang="${l}" href="${pub(`${l}/index.html`)}">`).join('')}<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/style.css?v=${ASSET_V}">${HAS_THEME ? `<link rel="stylesheet" href="assets/theme.css?v=${ASSET_V}">` : ''}</head><body data-page="root" data-root="" data-store="${SITE.id}" data-api="${API}"><main class="section center"><p class="brand big-brand">${esc(SITE.brand)}</p><nav class="langs-big">${SITE.languages.map((l) => `<a href="${l}/index.html" hreflang="${l}">${esc(STR[l].lang)}</a>`).join('')}</nav></main><script src="assets/shop.js?v=${ASSET_V}" defer></script></body></html>`,
);
const pages = ['index.html', ...ACTIVE.map((p) => `produkt/${p.id}.html`), ...GUIDES.map((g) => `ratgeber/${g.slug}.html`)];
const today = new Date().toISOString().slice(0, 10);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${SITE.languages
    .flatMap((l) =>
      pages.map(
        (u) =>
          `<url><loc>${pub(`${l}/${u}`)}</loc><lastmod>${today}</lastmod>${SITE.languages.map((x) => `<xhtml:link rel="alternate" hreflang="${x}" href="${pub(`${x}/${u}`)}"/>`).join('')}</url>`,
      ),
    )
    .join('\n')}\n</urlset>\n`,
);
write('robots.txt', `User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${BASE}/sitemap.xml\n`);
write('_headers', headers());
// Secondary domains (go.algbr.de…) are forwarded to the primary one at the registrar (Porkbun).
console.log(
  `• dist/ built for ${SITE.brand}: ${SITE.languages.length} languages × ${ACTIVE.length} products, ${GUIDES.length} guide(s), API ${API}`,
);
