#!/usr/bin/env node
/**
 * Generates the static storefront in dist/ from catalog/*.json:
 *   /<lang>/index.html, /<lang>/produkt/<id>.html, warenkorb, danke, bestellung,
 *   legal pages, /admin/, sitemap and robots. Languages: catalog/site.json.
 * Adding a product = one entry in catalog/products.json + `npm run build`.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { STR } from './i18n.mjs';
import { legalPages } from './legal.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const PRODUCTS = JSON.parse(readFileSync(join(root, 'catalog/products.json'), 'utf8'));
const SITE = JSON.parse(readFileSync(join(root, 'catalog/site.json'), 'utf8'));
const ACTIVE = PRODUCTS.filter((p) => p.active);
const LEGAL = legalPages(SITE);

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
const fill = (s) => s.replace('{days}', SITE.shipping.deliveryDays);

function write(path, html) {
  const file = join(dist, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

/** Relative prefix from a page to the site root (pages live at /<lang>/ or /<lang>/produkt/). */
const up = (depth) => '../'.repeat(depth);

function layout({ lang, depth, title, description, body, page, alternates, jsonLd }) {
  const t = STR[lang];
  const r = up(depth);
  const L = `${r}${lang}/`;
  const langLinks = SITE.languages
    .map((l) => `<a href="${r}${l}/${alternates}" ${l === lang ? 'aria-current="true"' : ''} hreflang="${l}">${l.toUpperCase()}</a>`)
    .join('');
  const legal = Object.entries(t.legalNames)
    .map(([k, v]) => `<a href="${L}${k}.html">${esc(v)}</a>`)
    .join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#16181d">
<link rel="icon" href="${r}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${r}assets/style.css">
${SITE.languages.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE.baseUrl}/${l}/${alternates}">`).join('\n')}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body data-page="${page}" data-lang="${lang}" data-root="${r}">
<a class="skip" href="#main">${lang === 'de' ? 'Zum Inhalt' : lang === 'fr' ? 'Aller au contenu' : 'Skip to content'}</a>
<p class="promo">${esc(t.promo)}</p>
<header class="top">
  <div class="wrap top-row">
    <a class="brand" href="${L}index.html">${esc(SITE.brand)}</a>
    <nav class="menu" aria-label="Menu">
      <a href="${L}index.html#produkte">${esc(t.nav.shop)}</a>
      <a href="${L}index.html#so-gehts">${esc(t.nav.how)}</a>
      <a href="${L}bestellung.html">${esc(t.nav.track)}</a>
    </nav>
    <div class="top-actions">
      <nav class="langs" aria-label="Language">${langLinks}</nav>
      <a class="cart-link" href="${L}warenkorb.html" aria-label="${esc(t.nav.cart)}">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7Zm3 0a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        <span class="cart-count" data-cart-count hidden>0</span>
      </a>
    </div>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="wrap foot-row">
    <div>
      <p class="brand">${esc(SITE.brand)}</p>
      <p class="muted">${esc(SITE.tagline[lang])}</p>
    </div>
    <nav aria-label="${esc(t.footer.legal)}" class="foot-links">${legal}</nav>
  </div>
  <div class="wrap foot-bottom">
    <span>© ${new Date().getFullYear()} ${esc(SITE.brand)} · ${esc(t.footer.rights)}</span>
    <a class="by-algbr" href="${SITE.byAlgbr}" target="_blank" rel="noopener">by <img src="${r}assets/algbr.svg" alt="" width="22" height="22"> <b>Al.<i>G.B.</i><u>r.</u></b></a>
  </div>
</footer>
<script src="${r}assets/shop.js" defer></script>
</body>
</html>`;
}

function card(p, lang, L) {
  const t = STR[lang];
  const x = p.text[lang];
  return `<article class="card">
  <a class="card-img" href="${L}produkt/${p.id}.html"><img src="../assets/products/${p.images[0]}" alt="${esc(p.name)}" loading="lazy" width="600" height="600"></a>
  <div class="card-body">
    <h3><a href="${L}produkt/${p.id}.html">${esc(p.name)}</a></h3>
    <p class="muted">${esc(x.tagline)}</p>
    <p class="price"><b>${money(p.price, lang)}</b>${p.compare ? ` <s aria-label="${esc(t.products.from)}">${money(p.compare, lang)}</s>` : ''}</p>
    <button class="btn btn-dark" type="button" data-add="${p.id}">${esc(t.products.add)}</button>
  </div>
</article>`;
}

function home(lang) {
  const t = STR[lang];
  const L = '';
  const heroImgs = ACTIVE.slice(0, 3)
    .map((p, i) => `<img class="h${i + 1}" src="../assets/products/${p.images[0]}" alt="" width="420" height="420">`)
    .join('');
  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <p class="eyebrow">${esc(t.hero.eyebrow)}</p>
      <h1>${esc(t.hero.title)}</h1>
      <p class="lead">${esc(t.hero.lead)}</p>
      <div class="actions">
        <a class="btn btn-dark btn-lg" href="#produkte">${esc(t.hero.cta)}</a>
        <a class="btn btn-line btn-lg" href="#so-gehts">${esc(t.hero.cta2)}</a>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">${heroImgs}</div>
  </div>
</section>
<section class="trust"><div class="wrap trust-row">${t.trust.map((x) => `<p>✓ ${esc(x)}</p>`).join('')}</div></section>
<section class="section" id="produkte">
  <div class="wrap">
    <header class="head"><h2>${esc(t.products.title)}</h2><p class="muted">${esc(t.products.lead)}</p></header>
    <div class="grid">${ACTIVE.map((p) => card(p, lang, L)).join('')}</div>
  </div>
</section>
<section class="section soft" id="so-gehts">
  <div class="wrap">
    <header class="head"><h2>${esc(t.how.title)}</h2></header>
    <ol class="steps">${t.how.steps.map(([h, d], i) => `<li><span>${i + 1}</span><h3>${esc(h)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
  </div>
</section>
<section class="section" id="faq">
  <div class="wrap narrow">
    <header class="head"><h2>${esc(t.faq.title)}</h2></header>
    ${t.faq.items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(fill(a))}</p></details>`).join('')}
  </div>
</section>`;
  write(
    `${lang}/index.html`,
    layout({ lang, depth: 1, title: `${SITE.brand} — ${t.hero.title}`, description: SITE.tagline[lang], body, page: 'home', alternates: 'index.html' }),
  );
}

function productPage(p, lang) {
  const t = STR[lang];
  const x = p.text[lang];
  const imgs = p.images.map((src) => `../../assets/products/${src}`);
  const body = `
<section class="section product">
  <div class="wrap product-grid">
    <div class="gallery">
      <img class="main-img" data-main src="${imgs[0]}" alt="${esc(p.name)}" width="800" height="800">
      <div class="thumbs">${imgs.map((src, i) => `<button type="button" data-thumb="${src}" aria-label="${esc(p.name)} ${i + 1}"><img src="${src}" alt="" width="96" height="96" loading="lazy"></button>`).join('')}</div>
      <p class="muted small">${esc(t.product.photoNote)}</p>
    </div>
    <div class="buy">
      <a class="back" href="../index.html#produkte">${esc(t.product.back)}</a>
      <h1>${esc(p.name)}</h1>
      <p class="lead">${esc(x.tagline)}</p>
      <p class="price big"><b>${money(p.price, lang)}</b>${p.compare ? ` <s>${money(p.compare, lang)}</s>` : ''}</p>
      <ul class="bullets">${x.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <button class="btn btn-dark btn-lg btn-block" type="button" data-add="${p.id}" data-go-cart>${esc(t.products.add)} — ${money(p.price, lang)}</button>
      <ul class="reassure">
        <li>🚚 ${esc(fill(t.product.ship))}</li>
        <li>↩︎ ${esc(t.product.returns)}</li>
        <li>🔒 ${esc(t.product.secure)}</li>
        <li>🧾 ${esc(t.product.invoice)}</li>
      </ul>
      <h2 class="small-title">${esc(t.product.details)}</h2>
      <p>${esc(x.description)}</p>
    </div>
  </div>
</section>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: x.description,
    sku: p.sku,
    image: p.images.map((i) => `${SITE.baseUrl}/assets/products/${i}`),
    brand: { '@type': 'Brand', name: SITE.brand },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (p.price / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${SITE.baseUrl}/${lang}/produkt/${p.id}.html`,
    },
  };
  write(
    `${lang}/produkt/${p.id}.html`,
    layout({ lang, depth: 2, title: `${p.name} — ${SITE.brand}`, description: x.tagline, body, page: 'product', alternates: `produkt/${p.id}.html`, jsonLd }),
  );
}

function simplePage(lang, file, page, title, inner) {
  write(
    `${lang}/${file}`,
    layout({ lang, depth: 1, title: `${title} — ${SITE.brand}`, description: SITE.tagline[lang], body: inner, page, alternates: file }),
  );
}

/** Data the shop script needs: products (for the cart), money format, texts. */
function shopData(lang) {
  const t = STR[lang];
  return {
    lang,
    shippingCents: SITE.shipping.cents,
    products: Object.fromEntries(
      ACTIVE.map((p) => [p.id, { name: p.name, price: p.price, img: p.images[0], url: `produkt/${p.id}.html` }]),
    ),
    t: { cart: t.cart, thanks: t.thanks, track: t.track },
  };
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
</div></section>
<script type="application/json" id="shop-data">${JSON.stringify(shopData(lang)).replace(/</g, '\\u003c')}</script>`,
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
<script type="application/json" id="shop-data">${JSON.stringify(shopData(lang)).replace(/</g, '\\u003c')}</script>`,
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
  <p class="muted">${esc(t.lead)}</p>
  <form class="track-form" data-track-form>
    <label>${esc(t.number)}<input name="order" required placeholder="NM-251002-AB12" autocomplete="off"></label>
    <label>${esc(t.email)}<input name="email" type="email" required autocomplete="email"></label>
    <button class="btn btn-dark" type="submit">${esc(t.submit)}</button>
  </form>
  <div class="track-result" data-track-result aria-live="polite"></div>
</div></section>
<script type="application/json" id="shop-data">${JSON.stringify(shopData(lang)).replace(/</g, '\\u003c')}</script>`,
  );
}

function legal(lang) {
  for (const [k, html] of Object.entries(LEGAL[lang]))
    simplePage(lang, `${k}.html`, 'legal', STR[lang].legalNames[k], `<section class="section"><div class="wrap narrow legal">${html}</div></section>`);
}

// ---------------------------------------------------------------- build
rmSync(dist, { recursive: true, force: true });
cpSync(join(root, 'public'), dist, { recursive: true });
for (const lang of SITE.languages) {
  home(lang);
  for (const p of ACTIVE) productPage(p, lang);
  cartPage(lang);
  thanksPage(lang);
  trackPage(lang);
  legal(lang);
}
// Root: language chooser (redirect by browser language in shop.js).
write(
  'index.html',
  `<!doctype html><html lang="${SITE.defaultLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(SITE.brand)}</title><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/style.css"></head><body data-page="root" data-root=""><main class="section center"><p class="brand big-brand">${esc(SITE.brand)}</p><nav class="langs-big">${SITE.languages.map((l) => `<a href="${l}/index.html" hreflang="${l}">${esc(STR[l].lang)}</a>`).join('')}</nav></main><script src="assets/shop.js" defer></script></body></html>`,
);
const urls = SITE.languages.flatMap((l) => [`${l}/index.html`, ...ACTIVE.map((p) => `${l}/produkt/${p.id}.html`)]);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE.baseUrl}/${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${SITE.baseUrl}/sitemap.xml\n`);
console.log(`• dist/ built: ${SITE.languages.length} languages × ${ACTIVE.length} products (+ cart, thanks, tracking, legal, admin)`);
