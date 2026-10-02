#!/usr/bin/env node
/**
 * Generates one storefront of the Nomad platform in dist/:
 *   node scripts/build.mjs [store]        (default: the host store, "nomad")
 * from stores/<store>/site.json + products.json + assets/:
 *   /<lang>/index.html, /<lang>/produkt/<id>.html, /<lang>/ratgeber/<slug>.html,
 *   warenkorb, danke, bestellung, legal pages, sitemap, robots, _headers.
 * The host store also gets /admin/ (one dashboard for every store) and serves
 * the API; the other stores call it cross-origin.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { STR as BASE_STR } from './i18n.mjs';
import { legalPages } from './legal.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const HOST = 'nomad';
const STORE = process.argv[2] || process.env.STORE || HOST;
const storeDir = join(root, 'stores', STORE);
if (!existsSync(join(storeDir, 'site.json'))) throw new Error(`Unknown store "${STORE}" (no stores/${STORE}/site.json)`);
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const PRODUCTS = readJson(join(storeDir, 'products.json'));
const SITE = readJson(join(storeDir, 'site.json'));
const HOST_SITE = readJson(join(root, 'stores', HOST, 'site.json'));
const IS_HOST = STORE === HOST;
// Empty = same origin (the host store); otherwise the host store's API, called with CORS.
const API = IS_HOST ? '' : HOST_SITE.baseUrl.replace(/\/$/, '');
const ACTIVE = PRODUCTS.filter((p) => p.active);
const GUIDES = SITE.guides ?? [];
const LEGAL = legalPages(SITE);
const HAS_THEME = existsSync(join(storeDir, 'assets', 'theme.css'));
const BASE = SITE.baseUrl.replace(/\/$/, '');

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

function layout({ lang, depth, title, description, body, page, alternates, jsonLd = [], image, noindex }) {
  const t = STR[lang];
  const r = up(depth);
  const L = `${r}${lang}/`;
  const canonical = `${BASE}/${lang}/${alternates}`;
  const langLinks = SITE.languages
    .map((l) => `<a href="${r}${l}/${alternates}" ${l === lang ? 'aria-current="true"' : ''} hreflang="${l}">${l.toUpperCase()}</a>`)
    .join('');
  const legal = Object.entries(t.legalNames)
    .map(([k, v]) => `<a href="${L}${k}.html">${esc(v)}</a>`)
    .join('');
  const guideLinks = GUIDES.map((g) => `<a href="${L}ratgeber/${g.slug}.html">${esc(g.text[lang].title)}</a>`).join('');
  const ogImage = image || (ACTIVE[0] ? `${BASE}/assets/products/${ACTIVE[0].images[0]}` : '');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${canonical}">
${SITE.languages.map((l) => `<link rel="alternate" hreflang="${l}" href="${BASE}/${l}/${alternates}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${BASE}/${SITE.defaultLang}/${alternates}">
<meta property="og:type" content="${page === 'product' ? 'product' : 'website'}">
<meta property="og:site_name" content="${esc(SITE.brand)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${{ de: 'de_DE', fr: 'fr_FR', en: 'en_GB' }[lang]}">
${ogImage ? `<meta property="og:image" content="${ogImage}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="${SITE.themeColor || '#16181d'}">
<link rel="icon" href="${r}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${r}assets/style.css">
${HAS_THEME ? `<link rel="stylesheet" href="${r}assets/theme.css">` : ''}
${jsonLd.map(ldJson).join('\n')}
</head>
<body data-page="${page}" data-lang="${lang}" data-root="${r}" data-store="${SITE.id}" data-api="${API}">
<a class="skip" href="#main">${lang === 'de' ? 'Zum Inhalt' : lang === 'fr' ? 'Aller au contenu' : 'Skip to content'}</a>
<p class="promo">${esc(t.promo)}</p>
<header class="top">
  <div class="wrap top-row">
    <a class="brand" href="${L}index.html">${esc(SITE.brand)}${SITE.byline ? ` <small class="byline">${esc(SITE.byline)}</small>` : ''}</a>
    <nav class="menu" aria-label="Menu">
      <a href="${L}index.html#produkte">${esc(t.nav.shop)}</a>
      ${GUIDES.length ? `<a href="${L}ratgeber/${GUIDES[0].slug}.html">${esc(t.nav.guide)}</a>` : `<a href="${L}index.html#so-gehts">${esc(t.nav.how)}</a>`}
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
      <p class="brand">${esc(SITE.brand)}${SITE.byline ? ` <small class="byline">${esc(SITE.byline)}</small>` : ''}</p>
      <p class="muted">${esc(SITE.tagline[lang])}</p>
    </div>
    ${guideLinks ? `<nav aria-label="${esc(t.nav.guide)}" class="foot-links">${guideLinks}</nav>` : ''}
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
  <a class="card-img" href="${L}produkt/${p.id}.html">${x.badge ? `<span class="badge">${esc(x.badge)}</span>` : ''}<img src="../assets/products/${p.images[0]}" alt="${esc(p.seo?.[lang]?.title || p.name)}" loading="lazy" width="600" height="600"></a>
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
  const hl = SITE.highlight?.[lang];
  const seo = SITE.seo?.[lang];
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
    <div class="grid">${ACTIVE.filter((p) => !p.single).map((p) => card(p, lang, '')).join('')}</div>
    ${
      ACTIVE.some((p) => p.single)
        ? `<header class="head head-sub"><h2>${esc(t.products.singles)}</h2></header>
    <div class="grid">${ACTIVE.filter((p) => p.single).map((p) => card(p, lang, '')).join('')}</div>`
        : ''
    }
  </div>
</section>
${
  hl
    ? `<section class="section"><div class="wrap"><div class="promise">
  <div><p class="eyebrow">${esc(hl.eyebrow)}</p><h2>${esc(hl.title)}</h2><p>${esc(hl.text)}</p></div>
  <ul class="promise-list">${hl.points.map((x) => `<li>✓ ${esc(x)}</li>`).join('')}</ul>
</div></div></section>`
    : ''
}
<section class="section soft" id="so-gehts">
  <div class="wrap">
    <header class="head"><h2>${esc(t.how.title)}</h2></header>
    <ol class="steps">${t.how.steps.map(([h, d], i) => `<li><span>${i + 1}</span><h3>${esc(h)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
    ${GUIDES.map((g) => `<p class="guide-teaser"><a class="btn btn-line" href="ratgeber/${g.slug}.html">${esc(g.text[lang].title)} →</a></p>`).join('')}
  </div>
</section>
<section class="section" id="faq">
  <div class="wrap narrow">
    <header class="head"><h2>${esc(t.faq.title)}</h2></header>
    ${t.faq.items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(fill(a))}</p></details>`).join('')}
  </div>
</section>`;
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'OnlineStore', name: SITE.brand, url: `${BASE}/`, description: SITE.tagline[lang], logo: `${BASE}/assets/favicon.svg` },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: fill(a) } })),
    },
  ];
  write(
    `${lang}/index.html`,
    layout({
      lang,
      depth: 1,
      title: seo?.title || `${SITE.brand} — ${t.hero.title}`,
      description: seo?.description || SITE.tagline[lang],
      body,
      page: 'home',
      alternates: 'index.html',
      jsonLd,
    }),
  );
}

function productPage(p, lang) {
  const t = STR[lang];
  const x = p.text[lang];
  const seo = p.seo?.[lang];
  const imgs = p.images.map((src) => `../../assets/products/${src}`);
  const parts = Array.isArray(p.components) ? p.components : null;
  const body = `
<section class="section product">
  <div class="wrap product-grid">
    <div class="gallery">
      <img class="main-img" data-main src="${imgs[0]}" alt="${esc(seo?.title || p.name)}" width="800" height="800">
      <div class="thumbs">${imgs.map((src, i) => `<button type="button" data-thumb="${src}" aria-label="${esc(p.name)} ${i + 1}"><img src="${src}" alt="" width="96" height="96" loading="lazy"></button>`).join('')}</div>
      <p class="muted small">${esc(t.product.photoNote)}</p>
    </div>
    <div class="buy">
      <a class="back" href="../index.html#produkte">${esc(t.product.back)}</a>
      ${x.badge ? `<p class="eyebrow">${esc(x.badge)}</p>` : ''}
      <h1>${esc(p.name)}</h1>
      <p class="lead">${esc(x.tagline)}</p>
      <p class="price big"><b>${money(p.price, lang)}</b>${p.compare ? ` <s>${money(p.compare, lang)}</s>` : ''}</p>
      <ul class="bullets">${x.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <button class="btn btn-dark btn-lg btn-block" type="button" data-add="${p.id}" data-go-cart>${esc(t.products.add)} — ${money(p.price, lang)}</button>
      ${x.caution ? `<p class="muted small center">${esc(x.caution)}</p>` : ''}
      <ul class="reassure">
        <li>🚚 ${esc(fill(t.product.ship))}</li>
        <li>↩︎ ${esc(t.product.returns)}</li>
        <li>🔒 ${esc(t.product.secure)}</li>
        <li>🧾 ${esc(t.product.invoice)}</li>
      </ul>
      ${
        parts
          ? `<h2 class="small-title">${esc(t.product.includes)}</h2>
      <ul class="includes">${parts.map((c) => `<li><b>${c.qty} ×</b> ${esc(c.label?.[lang] || c.name)}</li>`).join('')}</ul>`
          : ''
      }
      <h2 class="small-title">${esc(t.product.details)}</h2>
      <p>${esc(x.description)}</p>
    </div>
  </div>
</section>
${
  (p.upsells ?? []).filter((id) => ACTIVE.some((q) => q.id === id)).length
    ? `<section class="section soft"><div class="wrap"><header class="head"><h2>${esc(t.cart.upsell)}</h2></header>
<div class="grid">${p.upsells
        .map((id) => ACTIVE.find((q) => q.id === id))
        .filter(Boolean)
        .map((q) => card(q, lang, '../'))
        .join('')
        .replaceAll('src="../assets/', 'src="../../assets/')}</div></div></section>`
    : ''
}`;
  const url = `${BASE}/${lang}/produkt/${p.id}.html`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: seo?.title || p.name,
      description: seo?.description || x.description,
      sku: p.sku,
      image: p.images.map((i) => `${BASE}/assets/products/${i}`),
      brand: { '@type': 'Brand', name: SITE.brand },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: (p.price / 100).toFixed(2),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        url,
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: (SITE.shipping.cents / 100).toFixed(2), currency: 'EUR' },
          shippingDestination: SITE.shipping.countries.map((c) => ({ '@type': 'DefinedRegion', addressCountry: c })),
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: SITE.shipping.countries,
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: SITE.shipping.returnDays,
          returnMethod: 'https://schema.org/ReturnByMail',
        },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE.brand, item: `${BASE}/${lang}/index.html` },
        { '@type': 'ListItem', position: 2, name: p.name, item: url },
      ],
    },
  ];
  write(
    `${lang}/produkt/${p.id}.html`,
    layout({
      lang,
      depth: 2,
      title: seo ? `${seo.title} | ${SITE.brand}` : `${p.name} — ${SITE.brand}`,
      description: seo?.description || x.tagline,
      body,
      page: 'product',
      alternates: `produkt/${p.id}.html`,
      jsonLd,
      image: `${BASE}/assets/products/${p.images[0]}`,
    }),
  );
}

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
    layout({ lang, depth: 1, title: `${title} — ${SITE.brand}`, description: SITE.tagline[lang], body: inner, page, alternates: file, noindex }),
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
    t: { cart: t.cart, thanks: t.thanks, track: t.track },
  };
}
const shopDataTag = (lang) =>
  `<script type="application/json" id="shop-data">${JSON.stringify(shopData(lang)).replace(/</g, '\\u003c')}</script>`;

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

function legal(lang) {
  for (const [k, html] of Object.entries(LEGAL[lang]))
    simplePage(lang, `${k}.html`, 'legal', STR[lang].legalNames[k], `<section class="section"><div class="wrap narrow legal">${html}</div></section>`);
}

/** Security headers per site (the API origin differs between the host store and the others). */
function headers() {
  const connect = ["'self'", API].filter(Boolean).join(' ');
  const csp = `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src ${connect}; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'self'`;
  return `/*
${SITE.launched ? '' : '  # PRE-LAUNCH: search engines kept out until the legal pages are complete ("launched": true in site.json).\n  X-Robots-Tag: noindex, nofollow\n'}  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${csp}

/assets/*
  Cache-Control: public, max-age=604800
${IS_HOST ? '\n/admin/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n' : ''}`;
}

// ---------------------------------------------------------------- build
rmSync(dist, { recursive: true, force: true });
cpSync(join(root, 'public'), dist, { recursive: true, filter: (src) => IS_HOST || !src.includes(`${join(root, 'public', 'admin')}`) });
cpSync(join(storeDir, 'assets'), join(dist, 'assets'), { recursive: true });
for (const lang of SITE.languages) {
  home(lang);
  for (const p of ACTIVE) productPage(p, lang);
  for (const g of GUIDES) guidePage(g, lang);
  cartPage(lang);
  thanksPage(lang);
  trackPage(lang);
  legal(lang);
}
// Root: language chooser (redirect by browser language in shop.js).
write(
  'index.html',
  `<!doctype html><html lang="${SITE.defaultLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(SITE.seo?.[SITE.defaultLang]?.title || SITE.brand)}</title><meta name="description" content="${esc(SITE.seo?.[SITE.defaultLang]?.description || SITE.tagline[SITE.defaultLang])}"><link rel="canonical" href="${BASE}/${SITE.defaultLang}/index.html">${SITE.languages.map((l) => `<link rel="alternate" hreflang="${l}" href="${BASE}/${l}/index.html">`).join('')}<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/style.css">${HAS_THEME ? '<link rel="stylesheet" href="assets/theme.css">' : ''}</head><body data-page="root" data-root="" data-store="${SITE.id}" data-api="${API}"><main class="section center"><p class="brand big-brand">${esc(SITE.brand)}</p><nav class="langs-big">${SITE.languages.map((l) => `<a href="${l}/index.html" hreflang="${l}">${esc(STR[l].lang)}</a>`).join('')}</nav></main><script src="assets/shop.js" defer></script></body></html>`,
);
const pages = ['index.html', ...ACTIVE.map((p) => `produkt/${p.id}.html`), ...GUIDES.map((g) => `ratgeber/${g.slug}.html`)];
const today = new Date().toISOString().slice(0, 10);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${SITE.languages
    .flatMap((l) =>
      pages.map(
        (u) =>
          `<url><loc>${BASE}/${l}/${u}</loc><lastmod>${today}</lastmod>${SITE.languages.map((x) => `<xhtml:link rel="alternate" hreflang="${x}" href="${BASE}/${x}/${u}"/>`).join('')}</url>`,
      ),
    )
    .join('\n')}\n</urlset>\n`,
);
write('robots.txt', `User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${BASE}/sitemap.xml\n`);
write('_headers', headers());
// Secondary domains (e.g. go.algbr.de) → the primary one, path kept.
write('_redirects', (SITE.aliases ?? []).map((u) => `${u.replace(/\/$/, '')}/* ${BASE}/:splat 301!`).join('\n') + '\n');
console.log(
  `• dist/ built for ${SITE.brand}: ${SITE.languages.length} languages × ${ACTIVE.length} products, ${GUIDES.length} guide(s)${IS_HOST ? ' + admin for every store' : `, API ${API}`}`,
);
