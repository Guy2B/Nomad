/**
 * Static site build: site/ + data/ → dist/
 * Pages per language (/de/, /en/, /fr/): home, shop, collections, products, search, cart, success, tracking,
 * FAQ, size guide, about, contact, info pages (shipping, returns, legal), plus 404, sitemap.xml, robots.txt, _redirects, _headers.
 * All internal links are relative, so the build works on any host or sub-path.
 * Run: npm run build   (SITE_MODE=live only after the launch checklist is PASS)
 */
import { readMaster } from './brand-master.mjs';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { blanks, colors, products as allProducts, shipping, variantsOf } from '../data/catalog.mjs';
// Pieces waiting for supplier approval are not shown on the site (no 'coming soon' clutter).
// Shown: orderable pieces, plus pieces waiting for supplier approval (shown as 'coming soon', not orderable).
const products = allProducts.filter((p) => p.status === 'PREVIEW' || p.status === 'NEEDS_SUPPLIER_APPROVAL');
import { site } from '../site/config.mjs';
import { legalTitles, pages } from '../site/content.mjs';
import { common as copyCommon, copy as premiumCopy, graphicCopy } from '../data/copy.mjs';
import { t } from '../site/i18n.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const brand = JSON.parse(readFileSync(join(root, 'brand', 'paths.json'), 'utf8'));
// Brand lock: the build refuses to run if paths.json drifted from the locked master A (run `npm run brand` after a validated change)
{
  const m = readMaster();
  if (m.d !== brand.master.d || JSON.stringify(m.bars) !== JSON.stringify(brand.master.bars)) {
    console.error('BRAND LOCK: brand/paths.json does not match brand/algebra-a-signature-master.svg. Run: npm run brand');
    process.exit(1);
  }
}
const LANGS = site.languages;
const PREVIEW = site.mode !== 'live';
// Cache-busting: every asset URL carries ?v=<hash of the shipped files>, so a deploy is never hidden by a browser cache.
const V = (() => {
  const h = createHash('sha1');
  for (const f of ['site/assets/styles.css', 'site/assets/app.js', 'data/photos.json', 'data/catalog.mjs']) if (existsSync(join(root, f))) h.update(readFileSync(join(root, f)));
  const pd = join(root, 'site', 'assets', 'photos');
  if (existsSync(pd)) for (const f of readdirSync(pd).sort()) h.update(f + statSync(join(pd, f)).size);
  return h.digest('hex').slice(0, 10);
})();
const vq = (u) => `${u}?v=${V}`;

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n, lang) => new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang === 'fr' ? 'fr-FR' : 'de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
/** relative URL from one page path to another (both like /de/shop/) */
function rel(from, to) {
  const fromDir = from.endsWith('/') ? from : posix.dirname(from) + '/';
  let r = posix.relative(fromDir, to);
  if (to.endsWith('/') && r && !r.endsWith('/')) r += '/';
  return r || './';
}
const abs = (p) => site.origin + p;
/** escaped text with ^{sup} and _{sub} markup → HTML */
const mathHtml = (s) => esc(s).replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>').replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
// The brand: ONE A (brand/algebra-a-signature-master.svg, locked), copied into every use; only size and colour vary.
const aMark = (transform = '') => `<g${transform ? ` transform="${transform}"` : ''}><path d="${brand.master.d}"/>${brand.master.bars.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('')}</g>`;
const [MX0, MY0, MX1, MY1] = brand.master.box;
/** Secondary mark: the A alone (statement, about, 404). viewBox = the A's own box, so CSS sizes it exactly. */
const symbolSvg = (cls = 'sym', label = '') =>
  `<svg class="${cls}" viewBox="${MX0} ${MY0} ${+(MX1 - MX0).toFixed(1)} ${+(MY1 - MY0).toFixed(1)}" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} focusable="false" fill="currentColor">${aMark()}</svg>`;
/** Primary brand: the wordmark "Algebra", the master A as its first letter (brand/wordmark-signature.svg). */
const sigSvg = (cls = 'wm') => {
  const g = brand.signature;
  return `<svg class="${cls}" viewBox="0 0 ${g.width} ${g.height}" role="img" aria-label="Algebra" focusable="false" fill="currentColor">${aMark(g.matrix)}<path transform="translate(${g.rest.dx} 0)" d="${g.rest.d}"/></svg>`;
};

const collections = {
  shop: { filter: () => true, nav: 'all' },
  men: { filter: (p) => p.gender === 'men' || p.gender === 'unisex', nav: 'men' },
  women: { filter: (p) => p.gender === 'women' || p.gender === 'unisex', nav: 'women' },
  polos: { filter: (p) => p.category === 'polos', nav: 'polos' },
  't-shirts': { filter: (p) => p.category === 't-shirts', nav: 'tees' },
  sweaters: { filter: (p) => p.category === 'sweaters', nav: 'sweaters' },
  'graphic-series': { filter: (p) => p.line === 'graphic', nav: 'graphic' },
};

const productPath = (lang, p) => `/${lang}/product/${p.slug}/`;
const img = (p, color, view) => `assets/photos/${p.slug}-${color}-${view}`;
const hasImg = (p, color, view) => existsSync(join(root, 'site', `${img(p, color, view)}.webp`));
/** width/height of a baseline or progressive JPEG (reads the SOF marker) */
function jpgSize(file) {
  const b = readFileSync(file);
  let i = 2;
  while (i < b.length) {
    const m = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return [1600, 1100];
}
const photoFile = (name) => join(root, 'site', 'assets', 'photos', `${name}.jpg`);
const hasPhoto = (name) => existsSync(photoFile(name));
const DETAIL = {
  front: { de: 'Detail vorne', en: 'Front detail', fr: 'Détail avant' },
  print: { de: 'Print-Detail', en: 'Print detail', fr: 'Détail du print' },
  fabric: { de: 'Stoff', en: 'Fabric', fr: 'Matière' },
  label: { de: 'Kragen', en: 'Collar', fr: 'Col' },
  frontView: { de: 'Vorderseite', en: 'Front', fr: 'Face avant' },
  backView: { de: 'Rückseite', en: 'Back', fr: 'Face arrière' },
};
const viewsOf = (p, color) => ['front', 'back'].filter((v) => hasImg(p, color, v));
const displayName = (p, lang) => {
  const g = { men: { de: 'Herren', en: 'Men', fr: 'Homme' }, women: { de: 'Damen', en: 'Women', fr: 'Femme' } }[p.gender];
  return g && p.line === 'essentials' ? `${p.name[lang]} · ${g[lang]}` : p.name[lang];
};

/** <picture> with AVIF/WebP, relative to the page. */
function picture(from, file, alt, { sizes = '(min-width: 1024px) 25vw, 50vw', eager = false, w = 800, h = 1000, small = true, cls = '' } = {}) {
  const r = (x) => rel(from, '/' + x);
  const srcset = small ? `${vq(r(file + '-400.webp'))} 400w, ${vq(r(file + '.webp'))} ${w}w` : `${vq(r(file + '.webp'))} ${w}w`;
  return `<picture class="${cls}"><source type="image/avif" srcset="${vq(r(file + '.avif'))}"><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="${vq(r(file + '.jpg'))}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

// ------------------------------------------------------------------ layout
function layout(lang, { path, key, title, desc, body, noindex = false, jsonld = [], alternates = true, bodyClass = '', absLinks = false }) {
  const L = t[lang];
  // the 404 page is served at any depth, so it uses root-absolute links
  const r = absLinks ? (to) => to.replace(/^\/(de|en|fr)\/404\/$/, '/$1/') : (to) => rel(path, to);
  const alt = alternates ? LANGS.map((l) => `<link rel="alternate" hreflang="${t[l].htmlLang}" href="${abs(path.replace(`/${lang}/`, `/${l}/`))}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${abs(path.replace(`/${lang}/`, '/de/'))}">` : '';
  const robots = PREVIEW || noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">';
  const nav = [
    ['men', '/men/'],
    ['women', '/women/'],
    ['polos', '/polos/'],
    ['tees', '/t-shirts/'],
    ['knit', '/knitwear/'],
    ['sweaters', '/sweaters/'],
    ['graphic', '/graphic-series/'],
  ];
  const navHtml = nav.map(([k, p]) => `<li><a href="${r(`/${lang}${p}`)}"${key === p.slice(1, -1) ? ' aria-current="page"' : ''}>${L.nav[k]}</a></li>`).join('');
  const langs = LANGS.map((l) => `<a href="${r(path.replace(`/${lang}/`, `/${l}/`))}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('');
  const f = L.footer;
  const info = (k) => r(`/${lang}/info/${k}/`);
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots}
<link rel="canonical" href="${abs(path)}">
${alt}
<meta property="og:type" content="${key === 'product' ? 'product' : 'website'}">
<meta property="og:site_name" content="Algebra">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(path)}">
<meta property="og:image" content="${abs('/assets/og.jpg')}">
<meta property="og:locale" content="${L.locale}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F3EFE7">
<link rel="icon" href="${r('/favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="${r('/assets/fonts/cormorant-garamond-latin-500-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${vq(r('/assets/styles.css'))}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body class="${bodyClass}" data-lang="${lang}" data-root="${r('/')}" data-api="${esc(site.apiBase)}" data-mode="${site.mode}">
<a class="skip" href="#main">${L.nav.skip}</a>
<div class="announce" role="note">${esc(L.preview)}</div>
<header class="hdr">
  <div class="hdr__top">
    <button class="hdr__menu" type="button" aria-expanded="false" aria-controls="nav"><span class="burger" aria-hidden="true"></span><span class="vh">${L.nav.menu}</span></button>
    <div class="hdr__lang" aria-label="${esc(L.nav.language)}">${langs}</div>
    <a class="hdr__logo" href="${r(`/${lang}/`)}" aria-label="Algebra">${sigSvg('wm')}</a>
    <div class="hdr__tools">
      <a class="hdr__search" href="${r(`/${lang}/search/`)}">${L.nav.search}</a>
      <a class="hdr__bag" href="${r(`/${lang}/cart/`)}" data-open-bag>${L.nav.bag} (<span class="bag-count" aria-live="polite">0</span>)</a>
    </div>
  </div>
  <nav id="nav" class="nav" aria-label="${esc(L.nav.menu)}"><ul>${navHtml}<li class="nav__all"><a href="${r(`/${lang}/shop/`)}">${L.nav.all}</a></li></ul>
    <div class="nav__lang">${langs}</div></nav>
</header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="ftr">
  <div class="ftr__in">
    <div class="ftr__brand">${sigSvg('wm wm--ftr')}<p class="ftr__sig">${site.signature}</p>
      <form class="ftr__nl" data-newsletter novalidate>
        <label for="ftr-email">${L.newsletter.title}</label>
        <div class="ftr__nlrow"><input id="ftr-email" name="email" type="email" autocomplete="email" required placeholder="${esc(L.newsletter.label)}"><button type="submit">${L.newsletter.button}</button></div>
        <p class="small" data-ok hidden role="status">${L.newsletter.ok}</p><p class="small form-err" data-err hidden role="alert">${L.newsletter.err}</p>
      </form></div>
    <div class="ftr__cols">
      <div><h2>${f.shop}</h2><ul>
        <li><a href="${r(`/${lang}/men/`)}">${L.nav.men}</a></li><li><a href="${r(`/${lang}/women/`)}">${L.nav.women}</a></li>
        <li><a href="${r(`/${lang}/knitwear/`)}">${L.nav.knit}</a></li><li><a href="${r(`/${lang}/graphic-series/`)}">${L.nav.graphic}</a></li><li><a href="${r(`/${lang}/shop/`)}">${L.nav.all}</a></li></ul></div>
      <div><h2>${f.help}</h2><ul>
        <li><a href="${r(`/${lang}/faq/`)}">${f.faq}</a></li><li><a href="${r(`/${lang}/size-guide/`)}">${f.size}</a></li>
        <li><a href="${info('shipping')}">${f.shipping}</a></li><li><a href="${info('returns')}">${f.returns}</a></li>
        <li><a href="${r(`/${lang}/tracking/`)}">${f.tracking}</a></li><li><a href="${r(`/${lang}/contact/`)}">${f.contact}</a></li></ul></div>
      <div><h2>${f.company}</h2><ul>
        <li><a href="${r(`/${lang}/about/`)}">${L.nav.about}</a></li>
        <li><a href="${info('imprint')}">${f.imprint}</a></li><li><a href="${info('privacy')}">${f.privacy}</a></li>
        <li><a href="${info('terms')}">${f.terms}</a></li><li><a href="${info('withdrawal')}">${f.withdrawal}</a></li>
        <li><a href="${info('cookies')}">${f.cookies}</a></li><li><a href="${info('accessibility')}">${f.a11y}</a></li>
        <li><button type="button" class="linkish" data-consent-open>${f.cookieSettings}</button></li></ul></div>
    </div>
  </div>
  <div class="ftr__base"><span>© ${new Date().getFullYear()} Algebra</span><span>${langs}</span></div>
</footer>
<div class="drawer" id="bag" role="dialog" aria-modal="true" aria-labelledby="bag-title" hidden>
  <div class="drawer__scrim" data-close-bag></div>
  <section class="drawer__panel">
    <header class="drawer__hd"><h2 id="bag-title">${L.cart.title}</h2><button type="button" class="drawer__x" data-close-bag aria-label="${esc(L.nav.close)}">×</button></header>
    <div class="drawer__bd" data-bag-body></div>
  </section>
</div>
<div class="consent" id="consent" role="dialog" aria-labelledby="consent-title" hidden>
  <h2 id="consent-title">${L.consent.title}</h2><p>${L.consent.body} <a href="${info('cookies')}">${L.consent.more}</a></p>
  <div class="consent__btns"><button type="button" class="btn btn--line" data-consent="necessary">${L.consent.reject}</button><button type="button" class="btn btn--line" data-consent="analytics">${L.consent.accept}</button></div>
</div>
<script type="module" src="${vq(r('/assets/app.js'))}"></script>
</body>
</html>
`;
}

function write(path, html) {
  const file = join(dist, path.endsWith('/') ? path + 'index.html' : path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ------------------------------------------------------------------ editorial copy (short on purpose)
const ED = {
  de: {
    cta: 'Kollektion entdecken',
    story: ['Herbst / Winter 2026', 'Form. Struktur. Balance.'],
    knit: ['Knitwear', 'Struktur, neu gedacht.', 'Feine Maschen, ruhige Formen. Die erste Knitwear von Algebra erscheint in Kürze.', 'Benachrichtigen', 'Demnächst'],
    graphic: ['Graphic Series', 'Die großen Gleichungen der Welt.', 'Neun Studien über Form, Bewegung und Materie.', 'Zur Graphic Series'],
    ess: ['The Essentials', 'Alle Essentials'],
    statement: ['Built on proportion.', 'Form. Structure. Balance.'],
    trust: [['Versand', 'Kostenlos ab 100 €'], ['Rückgabe', '14 Tage'], ['Zahlung', 'Sicher verschlüsselt']],
    knitPage: ['Knitwear', 'Struktur, neu gedacht.', 'Feine Maschen in Schwarz, Navy und Elfenbein. Ruhig von vorn, präzise im Detail. Die erste Knitwear von Algebra erscheint in Kürze.', 'Als Erste erfahren'],
    ship: 'Kostenloser Versand ab 100 € · 14 Tage Rückgabe',
  },
  en: {
    cta: 'Discover the collection',
    story: ['Autumn / Winter 2026', 'Form. Structure. Balance.'],
    knit: ['Knitwear', 'Structure, softened.', 'Fine gauge, quiet shapes. Algebra’s first knitwear arrives soon.', 'Get notified', 'Coming soon'],
    graphic: ['Graphic Series', 'The great equations of the world.', 'Nine studies of form, motion and matter.', 'Explore the Graphic Series'],
    ess: ['The Essentials', 'All essentials'],
    statement: ['Built on proportion.', 'Form. Structure. Balance.'],
    trust: [['Shipping', 'Free from 100 €'], ['Returns', '14 days'], ['Payment', 'Securely encrypted']],
    knitPage: ['Knitwear', 'Structure, softened.', 'Fine gauge in black, navy and ivory. Quiet from the front, precise in the detail. Algebra’s first knitwear arrives soon.', 'Be the first to know'],
    ship: 'Free shipping from 100 € · 14-day returns',
  },
  fr: {
    cta: 'Découvrir la collection',
    story: ['Automne / Hiver 2026', 'Forme. Structure. Équilibre.'],
    knit: ['Knitwear', 'La structure, adoucie.', 'Maille fine, formes calmes. La première maille Algebra arrive bientôt.', 'Être prévenu', 'Bientôt'],
    graphic: ['Graphic Series', 'Les grandes équations du monde.', 'Neuf études sur la forme, le mouvement et la matière.', 'Découvrir la Graphic Series'],
    ess: ['The Essentials', 'Tous les essentiels'],
    statement: ['Built on proportion.', 'Form. Structure. Balance.'],
    trust: [['Livraison', 'Offerte dès 100 €'], ['Retours', '14 jours'], ['Paiement', 'Chiffré et sécurisé']],
    knitPage: ['Knitwear', 'La structure, adoucie.', 'Maille fine en noir, navy et ivoire. Calme de face, précise dans le détail. La première maille Algebra arrive bientôt.', 'Être informé en premier'],
    ship: 'Livraison offerte dès 100 € · Retours sous 14 jours',
  },
};

// ------------------------------------------------------------------ components
function card(lang, from, p, { eager = false, color, crop = false } = {}) {
  const L = t[lang];
  const first = color || p.colors[0];
  const sizes = [...new Set((p.cuts ? p.cuts.flatMap((x) => x.sizes) : p.sizes))];
  const href = rel(from, productPath(lang, p));
  // one image pair per colour; the swatches below switch them (hidden sets are not loaded: lazy + display:none)
  const sets = p.colors
    .map((c) => {
      const v = p.line === 'graphic' ? viewsOf(p, c).reverse() : viewsOf(p, c);
      if (!v.length) return '';
      return `<div class="card__set" data-color="${c}"${c === first ? '' : ' hidden'}>${picture(from, img(p, c, v[0]), `${displayName(p, lang)}, ${colors[c].name[lang]}`, { eager: eager && c === first })}${v[1] ? picture(from, img(p, c, v[1]), '', { cls: 'card__alt' }) : ''}</div>`;
    })
    .join('');
  const sw = p.colors.map((k) => `<button type="button" class="sw-btn" data-swatch="${k}" aria-pressed="${k === first}" aria-label="${esc(colors[k].name[lang])}" title="${esc(colors[k].name[lang])}"><span class="sw sw--c-${k}"></span></button>`).join('');
  const soon = p.status !== 'PREVIEW';
  return `<li class="card${crop ? ' card--crop' : ''}" data-gender="${p.gender}" data-cat="${p.category}" data-price="${p.price}" data-colors="${color || p.colors.join(' ')}" data-sizes="${sizes.join(' ')}">
  <a href="${color ? `${href}?color=${color}` : href}" class="card__a" data-track="select_item" data-id="${p.id}" data-href="${href}">
    <div class="card__img">${sets}</div>
    <div class="card__txt"><h3 class="card__name">${esc(displayName(p, lang))}</h3>
    <p class="card__price">${soon ? `<span class="muted">${esc(L.product.unavailable)}</span>` : money(p.price, lang)}</p></div>
  </a>
  <p class="card__meta"><span class="sws">${sw}</span></p></li>`;
}

function collectionPage(lang, key) {
  const L = t[lang];
  const path = `/${lang}/${key}/`;
  const list = products.filter(collections[key].filter);
  const allColors = [...new Set(list.flatMap((p) => p.colors))];
  const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'].filter((s) => list.some((p) => (p.cuts ? p.cuts.flatMap((x) => x.sizes) : p.sizes).includes(s)));
  const [title, desc] = L.meta[key];
  const h1 = key === 'shop' ? L.nav.all : L.nav[collections[key].nav];
  const C = L.collection;
  // essentials: one card per colour (polo navy, polo black, polo ivory …); graphic tees: one card each
  let gi = 0;
  const entries = list.flatMap((p) => (p.line === 'essentials' ? p.colors.map((c) => [p, c]) : [[p, key === 'graphic-series' || key === 't-shirts' || key === 'shop' || key === 'men' || key === 'women' ? p.colors[gi++ % p.colors.length] : null]]));
  const G = ED[lang].graphic;
  const intro = key === 'graphic-series' ? `<p class="coll__line">${esc(G[1])}</p><p class="coll__sub">${esc(G[2])}</p>` : '';
  const body = `<section class="coll">
  <header class="coll__hd wrap"><h1 class="coll__h">${esc(h1)}</h1>${intro}</header>
  <div class="wrap">
  <form class="filters" data-filters aria-label="${esc(C.filter)}">
    <fieldset><legend>${C.color}</legend><div class="chips">${allColors.map((c) => `<label class="chip"><input type="checkbox" name="color" value="${c}"><span class="sw sw--c-${c}"></span>${esc(colors[c].name[lang])}</label>`).join('')}</div></fieldset>
    <fieldset><legend>${C.size}</legend><div class="chips">${allSizes.map((s) => `<label class="chip"><input type="checkbox" name="size" value="${s}">${s}</label>`).join('')}</div></fieldset>
    <label class="sort">${C.sort} <select name="sort"><option value="">${C.sortDefault}</option><option value="asc">${C.sortAsc}</option><option value="desc">${C.sortDesc}</option></select></label>
    <button type="reset" class="linkish">${C.reset}</button>
    <p class="count" aria-live="polite" data-count data-template="${esc(C.count(0)).replace('0', '{n}')}">${C.count(entries.length)}</p>
  </form>
  <ul class="grid" data-grid>${entries.map(([p, c], i) => card(lang, path, p, { eager: i < 4, color: c || undefined })).join('')}</ul>
  <p class="empty" data-empty hidden>${C.empty}</p>
  </div>
</section>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: L.product.breadcrumbHome, item: abs(`/${lang}/`) }, { '@type': 'ListItem', position: 2, name: h1, item: abs(path) }] },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(productPath(lang, p)) })) },
  ];
  write(path, layout(lang, { path, key, title, desc, body, jsonld }));
}

function productPage(lang, p) {
  const L = t[lang];
  const P = L.product;
  const path = productPath(lang, p);
  const r = (to) => rel(path, to);
  const cuts = p.cuts || [{ id: '', blank: p.blank, sizes: p.sizes, name: null }];
  const variants = variantsOf(p).map((v) => ({ sku: v.sku, cut: v.cut || '', color: v.color, size: v.size, ok: v.purchasable }));
  const fig = (name, alt, cap, opts = {}) => {
    const [w, h] = jpgSize(photoFile(name));
    return `<figure class="${opts.cls || 'sheet__fig'}">${picture(path, `assets/photos/${name}`, alt, { w, h, small: false, eager: opts.eager, sizes: opts.sizes || '(min-width: 1024px) 20vw, 33vw' })}${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
  };
  const gallery = p.colors
    .map((c, ci) => {
      const cn = colors[c].name[lang];
      const name = displayName(p, lang);
      const stage = `${p.slug}-${c}-stage`;
      let inner;
      if (hasPhoto(stage)) {
        const mid = hasPhoto(`${p.slug}-${c}-d-print`) ? fig(`${p.slug}-${c}-d-print`, `${name}, ${DETAIL.print[lang]}, ${cn}`, DETAIL.print[lang]) : fig(`${p.slug}-${c}-d-fabric`, `${name}, ${DETAIL.fabric[lang]}, ${cn}`, DETAIL.fabric[lang]);
        inner = `${fig(stage, `${name}, ${cn}: ${DETAIL.frontView[lang]} / ${DETAIL.backView[lang]}`, '', { cls: 'sheet__stage', eager: ci === 0, sizes: '(min-width: 1024px) 60vw, 100vw' })}
        <div class="sheet__details">${fig(`${p.slug}-${c}-d-front`, `${name}, ${DETAIL.front[lang]}, ${cn}`, DETAIL.front[lang])}${mid}${fig(`${p.slug}-${c}-d-collar`, `${name}, ${DETAIL.label[lang]}, ${cn}`, DETAIL.label[lang])}</div>`;
      } else {
        inner = `<div class="sheet__views">${viewsOf(p, c)
          .map((v, vi) => `<figure class="gal__fig">${picture(path, img(p, c, v), `${name}, ${cn}`, { eager: ci === 0 && vi === 0, sizes: '(min-width: 1024px) 30vw, 100vw' })}</figure>`)
          .join('')}</div>`;
      }
      return `<div class="gal__set" data-color="${c}"${ci ? ' hidden' : ''}>${inner}</div>`;
    })
    .join('');
  const spaced = esc(p.name[lang].replace(/\s+\d+$/, ''));
  // no reference/AI image on product pages: only images of the actual design
  const b = blanks[p.blank];
  const composition = p.cuts ? p.cuts.map((c) => `${c.name[lang]}: ${blanks[c.blank].composition[lang]}, ${blanks[c.blank].gsm} g/m²`).join(' · ') : `${b.composition[lang]}${typeof b.gsm === 'number' ? `, ${b.gsm} g/m²` : ''}`;
  const buyable = p.status === 'PREVIEW';
  const acc = (title, html, open = false) => `<details${open ? ' open' : ''}><summary>${esc(title)}</summary><div class="acc__bd">${html}</div></details>`;
  const related = [...products.filter((x) => x.id !== p.id && x.line !== p.line), ...products.filter((x) => x.id !== p.id && x.line === p.line)].slice(0, 4);
  const vat = P.vat[site.vatMode];
  // premium copy: headline + text per section (data/copy.mjs); public facts only
  const C = premiumCopy[p.id] || graphicCopy(p.name.de);
  const sec = (title, part, extra = '', open = false) => (part ? acc(title, `<p class="acc__h">${esc(part[lang][0])}</p><p>${esc(part[lang][1])}</p>${extra}`, open) : '');
  const S = P.spec;
  const o = site.operator;
  const weight = C.spec.weight || (p.cuts ? p.cuts.map((c) => `${c.name[lang]} ${blanks[c.blank].gsm} g/m²`).join(' · ') : typeof b.gsm === 'number' ? `${b.gsm} g/m²` : null);
  const specRows = [
    [S.material, C.spec.material[lang]],
    ...(weight ? [[S.weight, weight]] : []),
    [S.finish, C.spec.finish === 'print' ? S.print : S.embroidery],
    [S.ref, p.id],
    [S.maker, `Algebra · ${o.name}, ${o.street}, ${o.city}, ${o.country} · ${o.email}`],
  ];
  const body = `<article class="pdp wrap" data-product="${p.id}" data-name="${esc(displayName(p, lang))}" data-price="${p.price}" data-cat="${p.category}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${r(`/${lang}/`)}">${P.breadcrumbHome}</a> / <a href="${r(`/${lang}/${p.gender === 'women' ? 'women' : p.line === 'graphic' ? 'graphic-series' : 'men'}/`)}">${p.gender === 'women' ? L.nav.women : p.line === 'graphic' ? L.nav.graphic : L.nav.men}</a> / <span aria-current="page">${esc(displayName(p, lang))}</span></nav>
  <div class="pdp__grid">
    <div class="gal sheet" data-gallery><p class="sheet__title" aria-hidden="true">${spaced}</p><span class="sheet__rule" aria-hidden="true"></span>${gallery}</div>
    <div class="buy">
      <div class="buy__sticky">
        ${p.capsule ? `<p class="kicker">${esc(p.capsule)}</p>` : `<p class="kicker">The Essentials</p>`}
        <h1 class="h1 buy__name">${esc(displayName(p, lang))}</h1>
        <p class="buy__price">${buyable ? money(p.price, lang) : P.unavailable}</p>
        ${buyable ? `<p class="small muted">${esc(vat)} <a href="${r(`/${lang}/info/shipping/`)}">${P.plusShip}</a></p>` : ''}
        <p class="buy__head">${esc(C.lead[lang][0])}</p><p class="buy__lead">${esc(C.lead[lang][1])}</p>
        <form class="buy__form" data-buy novalidate>
          ${p.cuts ? `<fieldset class="opt"><legend>${P.cut}</legend><div class="opt__row">${cuts.map((c, i) => `<label class="pill"><input type="radio" name="cut" value="${c.id}"${i ? '' : ' checked'}><span>${esc(c.name[lang])}</span></label>`).join('')}</div></fieldset>` : ''}
          <fieldset class="opt"><legend>${P.color}: <span data-color-name>${esc(colors[p.colors[0]].name[lang])}</span></legend><div class="opt__row">${p.colors.map((c, i) => `<label class="swatch" title="${esc(colors[c].name[lang])}"><input type="radio" name="color" value="${c}" data-label="${esc(colors[c].name[lang])}"${i ? '' : ' checked'}><span class="sw sw--lg sw--c-${c}"></span><span class="vh">${esc(colors[c].name[lang])}</span></label>`).join('')}</div></fieldset>
          <fieldset class="opt"><legend>${P.size}</legend><div class="opt__row" data-sizes>${cuts.map((c, ci) => c.sizes.map((s) => `<label class="pill" data-cut="${c.id}"${ci ? ' hidden' : ''}><input type="radio" name="size" value="${s}"${ci ? ' disabled' : ''}><span>${s}</span></label>`).join('')).join('')}</div>
          <a href="${r(`/${lang}/size-guide/`)}" class="small" data-track="size_guide_open">${P.sizeGuide}</a></fieldset>
          <p class="form-err" data-err role="alert" hidden>${P.chooseSize}</p>
          ${buyable ? `<button class="btn btn--solid btn--block" type="submit">${P.add}</button>` : `<p class="notice">${esc(P.notifyBody)}</p><a class="btn btn--line btn--block" href="${r(`/${lang}/#newsletter`)}">Newsletter</a>`}
        </form>
        <p class="buy__ship">${esc(ED[lang].ship)}</p>
        <div class="acc">
          ${p.symbol ? acc(P.symbol, `<p class="symbol-eq">${mathHtml(p.equation || p.symbol.glyph)}</p><p>${mathHtml(p.symbol[lang])}</p>`, true) : ''}
          ${sec(P.fit, C.fit, `<p><a href="${r(`/${lang}/size-guide/`)}">${P.sizeGuide}</a></p>`, !p.symbol)}
          ${sec(P.fabric, C.fabric, `<p class="small muted">${esc(L.premium.similar)}</p>`)}
          ${p.category === 'knitwear' ? sec('The Yarn', C.yarn) + sec('The Knit', C.knit) : ''}
          ${sec(P.detail, C.detail)}
          ${sec(P.design, C.signature || copyCommon.signature)}
          ${sec(P.care, C.care)}
          ${sec(P.shipret, copyCommon.shipping, `<p><a href="${r(`/${lang}/info/shipping/`)}">${L.footer.shipping}</a> · <a href="${r(`/${lang}/info/returns/`)}">${L.footer.returns}</a></p>`)}
          ${acc(P.safety, `<dl class="spec">${specRows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><p class="small muted">${esc(S.more)}</p>`)}
        </div>
      </div>
    </div>
  </div>
  ${related.length ? `<section class="related"><h2 class="h2">${P.also}</h2><ul class="grid">${related.map((x) => card(lang, path, x)).join('')}</ul></section>` : ''}
  <script type="application/json" data-variants>${JSON.stringify(variants)}</script>
</article>`;
  const offers = buyable
    ? {
        '@type': 'Offer',
        price: p.price.toFixed(2),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/MadeToOrder',
        url: abs(path),
        itemCondition: 'https://schema.org/NewCondition',
        shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: p.price >= shipping.zones.DE.freeFrom ? '0' : shipping.zones.DE.fee.toFixed(2), currency: 'EUR' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'DE' } },
        hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'DE', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail' },
      }
    : undefined;
  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `Algebra ${displayName(p, lang)}`,
      sku: p.id,
      brand: { '@type': 'Brand', name: 'Algebra' },
      description: C.lead[lang][1],
      material: composition,
      color: p.colors.map((c) => colors[c].name[lang]).join(', '),
      image: [...(hasPhoto(`${p.slug}-${p.colors[0]}-stage`) ? [abs(`/assets/photos/${p.slug}-${p.colors[0]}-stage.jpg`)] : []), ...viewsOf(p, p.colors[0]).map((v) => abs(`/${img(p, p.colors[0], v)}.jpg`))],
      ...(offers ? { offers } : {}),
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: P.breadcrumbHome, item: abs(`/${lang}/`) }, { '@type': 'ListItem', position: 2, name: displayName(p, lang), item: abs(path) }] },
  ];
  write(path, layout(lang, { path, key: 'product', title: `${displayName(p, lang)} · Algebra`, desc: C.lead[lang][1], body, jsonld }));
}

/** A photo from site/assets/photos (no -400 variant needed). */
function photo(from, name, alt, { w, h, eager = false, cls = '', sizes = '100vw' } = {}) {
  const r = (x) => rel(from, '/' + x);
  return `<picture class="${cls}"><source type="image/avif" srcset="${vq(r(`assets/photos/${name}.avif`))}"><source type="image/webp" srcset="${vq(r(`assets/photos/${name}.webp`))}" sizes="${sizes}"><img src="${vq(r(`assets/photos/${name}.jpg`))}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

function home(lang) {
  const L = t[lang];
  const E = ED[lang];
  const path = `/${lang}/`;
  const r = (to) => rel(path, to);
  const byId = (id) => products.find((p) => p.id === id);
  const rail = ['ALG-G-09-MANDELBROT', 'ALG-G-11-HIGGS', 'ALG-G-13-FEYNMAN', 'ALG-G-12-BIGBANG'].map(byId).filter(Boolean);
  const railColors = ['black', 'deep-navy', 'ivory', 'black'];
  const essCards = [['ALG-M-POLO', 'deep-navy'], ['ALG-M-TEE', 'ivory'], ['ALG-M-SWEAT', 'black'], ['ALG-W-TEE', 'deep-navy']].map(([id, c]) => [byId(id), c]).filter(([p]) => p);
  const sel = [['ALG-M-POLO', 'deep-navy', 'd-front'], ['ALG-M-TEE', 'ivory', 'd-collar'], ['ALG-M-SWEAT', 'black', 'd-fabric']].map(([id, c, d]) => [byId(id), c, d]).filter(([p]) => p);
  const body = `
<section class="hero">
  ${photo(path, 'campaign-graphic', `Algebra · ${E.story[0]}`, { w: 1122, h: 1030, eager: true, cls: 'hero__img' })}
  <div class="hero__txt">
    <h1 class="hero__brand">${sigSvg('wm wm--hero')}</h1>
    <p class="hero__season">${esc(E.story[0])}</p>
    <p class="hero__links"><a class="more more--inv" href="${r(`/${lang}/shop/`)}">${esc(E.cta)}</a></p>
  </div>
</section>

<section class="edstory">
  <a class="edstory__img" href="${r(`/${lang}/men/`)}" tabindex="-1" aria-hidden="true">${photo(path, 'tile-men', '', { w: 800, h: 1000, sizes: '(min-width: 1024px) 58vw, 100vw' })}</a>
  <div class="edstory__txt">
    <p class="kicker">${esc(E.story[0])}</p>
    <h2 class="edstory__h">${esc(E.story[1])}</h2>
    <p class="edstory__links"><a class="more" href="${r(`/${lang}/men/`)}">${esc(L.nav.men)}</a><a class="more" href="${r(`/${lang}/women/`)}">${esc(L.nav.women)}</a></p>
  </div>
</section>

<section class="knitfeat">
  <div class="knitfeat__txt">
    <p class="kicker">${esc(E.knit[0])} · ${esc(E.knit[4])}</p>
    <h2 class="knitfeat__h">${esc(E.knit[1])}</h2>
    <p class="knitfeat__p">${esc(E.knit[2])}</p>
    <p><a class="more" href="${r(`/${lang}/knitwear/`)}#notify">${esc(E.knit[3])}</a></p>
  </div>
  <a class="knitfeat__img" href="${r(`/${lang}/knitwear/`)}#notify" tabindex="-1" aria-hidden="true">${photo(path, 'tile-women', '', { w: 800, h: 1000, sizes: '(min-width: 1024px) 50vw, 100vw' })}</a>
</section>

<section class="gsfeat">
  <div class="gsfeat__txt">
    <p class="kicker">${esc(E.graphic[0])}</p>
    <h2 class="gsfeat__h">${esc(E.graphic[1])}</h2>
    <p class="gsfeat__p">${esc(E.graphic[2])}</p>
  </div>
  <a class="gsfeat__img" href="${r(`/${lang}/graphic-series/`)}" tabindex="-1" aria-hidden="true">${photo(path, 'mandelbrot-black-stage', '', { w: 1600, h: 1000, sizes: '100vw' })}</a>
</section>

<section class="rail rail--gs">
  <ul class="grid grid--rail wrap">${rail.map((p, i) => card(lang, path, p, { color: railColors[i], crop: i === 2 })).join('')}</ul>
  <p class="rail__more wrap"><a class="more" href="${r(`/${lang}/graphic-series/`)}">${esc(E.graphic[3])}</a></p>
</section>

<section class="selection wrap" aria-label="${esc(E.ess[0])}">
  <h2 class="selection__t">${esc(E.ess[0])}</h2>
  <div class="selection__row">${sel
    .map(([p, c, d]) => `<a class="selection__it" href="${r(productPath(lang, p))}?color=${c}">${photo(path, `${p.slug}-${c}-${d}`, displayName(p, lang), { w: 690, h: 796, sizes: '(min-width: 768px) 33vw, 100vw' })}<span>${esc(p.name[lang])}</span></a>`)
    .join('')}</div>
</section>

<section class="rail">
  <ul class="grid grid--rail wrap">${essCards.map(([p, c]) => card(lang, path, p, { color: c })).join('')}</ul>
  <p class="rail__more wrap"><a class="more" href="${r(`/${lang}/shop/`)}">${esc(E.ess[1])}</a></p>
</section>

<section class="statement">
  ${symbolSvg('sym statement__sym', '')}
  <h2 class="statement__h">${esc(E.statement[0])}</h2>
  <p class="statement__p">${esc(E.statement[1])}</p>
</section>

<section class="trust wrap" aria-label="Service">
  ${E.trust.map(([h, b]) => `<div><h3>${esc(h)}</h3><p>${esc(b)}</p></div>`).join('')}
</section>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Algebra', url: abs('/'), logo: abs('/favicon.svg'), slogan: site.signature },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Algebra', url: abs(`/${lang}/`), inLanguage: t[lang].htmlLang, potentialAction: { '@type': 'SearchAction', target: abs(`/${lang}/search/?q={query}`), 'query-input': 'required name=query' } },
  ];
  write(path, layout(lang, { path, key: 'home', title: L.meta.home[0], desc: L.meta.home[1], body, jsonld, bodyClass: 'is-home' }));
}

/** Knitwear: editorial page. No product until a real knit reference is chosen (never a sweatshirt presented as knit). */
function knitwear(lang) {
  const L = t[lang];
  const K = ED[lang].knitPage;
  const path = `/${lang}/knitwear/`;
  const body = `<section class="knitpage">
  <div class="knitpage__img">${photo(path, 'tile-women', K[1], { w: 800, h: 1000, eager: true, sizes: '(min-width: 1024px) 50vw, 100vw' })}</div>
  <div class="knitpage__txt">
    <p class="kicker">${esc(K[0])} · ${esc(ED[lang].knit[4])}</p>
    <h1 class="knitpage__h">${esc(K[1])}</h1>
    <p class="knitpage__p">${esc(K[2])}</p>
    <form class="knitpage__nl" id="notify" data-newsletter novalidate>
      <label for="knit-email">${esc(K[3])}</label>
      <div class="ftr__nlrow"><input id="knit-email" name="email" type="email" autocomplete="email" required placeholder="${esc(L.newsletter.label)}"><button type="submit">${L.newsletter.button}</button></div>
      <p class="small" data-ok hidden role="status">${L.newsletter.ok}</p><p class="small form-err" data-err hidden role="alert">${L.newsletter.err}</p>
    </form>
  </div>
</section>`;
  write(path, layout(lang, { path, key: 'knitwear', title: `${K[0]} · Algebra`, desc: `${K[1]} ${K[2]}`, body, noindex: true }));
}

function simple(lang, slug, title, inner, { noindex = false, key = slug, desc } = {}) {
  const L = t[lang];
  const path = `/${lang}/${slug}/`;
  const body = `<section class="wrap page"><nav class="crumbs" aria-label="Breadcrumb"><a href="${rel(path, `/${lang}/`)}">${L.product.breadcrumbHome}</a> / <span aria-current="page">${esc(title)}</span></nav><h1 class="h1">${esc(title)}</h1><div class="prose">${inner}</div></section>`;
  write(path, layout(lang, { path, key, title: `${title} · Algebra`, desc: desc || `${title}. Algebra, ${site.signature}`, body, noindex }));
}

// ------------------------------------------------------------------ pages
for (const lang of LANGS) {
  const L = t[lang];
  home(lang);
  knitwear(lang);
  for (const key of Object.keys(collections)) collectionPage(lang, key);
  for (const p of products) productPage(lang, p);

  // FAQ with FAQPage schema
  {
    const path = `/${lang}/faq/`;
    const qa = pages.faq[lang];
    const body = `<section class="wrap page"><h1 class="h1">${L.faq.title}</h1><div class="acc acc--faq">${qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="acc__bd"><p>${esc(a)}</p></div></details>`).join('')}</div></section>`;
    const jsonld = [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }];
    write(path, layout(lang, { path, key: 'faq', title: `${L.faq.title} · Algebra`, desc: qa[0][1], body, jsonld }));
  }
  simple(lang, 'size-guide', L.size.title, pages.sizeGuide[lang]);
  simple(lang, 'about', L.about.title, pages.about[lang] + `<p class="about__sym">${symbolSvg('sym sym--xl', 'Algebra')}</p>`);
  simple(
    lang,
    'contact',
    L.contact.title,
    `<p>${esc(site.operator.email)}</p>
<form class="form" data-contact novalidate>
  <label for="c-name">${L.contact.name}</label><input id="c-name" name="name" autocomplete="name" required>
  <label for="c-email">${L.contact.email}</label><input id="c-email" name="email" type="email" autocomplete="email" required>
  <label for="c-msg">${L.contact.message}</label><textarea id="c-msg" name="message" rows="6" required></textarea>
  <button class="btn btn--solid" type="submit">${L.contact.send}</button>
  <p class="small" data-ok hidden role="status">${L.contact.ok}</p><p class="small form-err" data-err hidden role="alert">${L.contact.err}</p>
</form>`,
  );
  simple(
    lang,
    'search',
    L.search.title,
    `<form class="form search" role="search" data-search><label for="q">${L.search.label}</label><input id="q" name="q" type="search" placeholder="${esc(L.search.placeholder)}" autocomplete="off"></form>
<p class="count" aria-live="polite" data-search-count></p>
<ul class="grid" data-search-grid>${products.map((p) => card(lang, `/${lang}/search/`, p)).join('')}</ul><p class="empty" data-empty hidden>${L.search.none}</p>`,
    { noindex: true },
  );
  simple(lang, 'cart', L.cart.title, `<div data-bag-body data-bag-page></div>`, { noindex: true });
  simple(
    lang,
    'order/success',
    L.success.title,
    `<p class="lead">${L.success.body}</p><p>${L.success.number}: <strong data-order-number>…</strong></p><p><a class="btn btn--line" href="${rel(`/${lang}/order/success/`, `/${lang}/tracking/`)}">${L.success.track}</a></p>`,
    { noindex: true, key: 'success' },
  );
  simple(
    lang,
    'tracking',
    L.tracking.title,
    `<form class="form" data-tracking novalidate>
  <label for="t-order">${L.tracking.order}</label><input id="t-order" name="order" required autocomplete="off" placeholder="ALG-…">
  <label for="t-email">${L.tracking.email}</label><input id="t-email" name="email" type="email" autocomplete="email" required>
  <button class="btn btn--solid" type="submit">${L.tracking.button}</button>
</form>
<div data-tracking-result aria-live="polite"></div>
<script type="application/json" data-status-labels>${JSON.stringify(L.tracking.status)}</script>
<p class="form-err" data-err hidden role="alert">${L.tracking.notFound}</p>`,
    { noindex: true },
  );
  for (const k of Object.keys(legalTitles)) simple(lang, `info/${k}`, legalTitles[k][lang], pages[k][lang], { key: `info-${k}`, noindex: !['shipping', 'returns'].includes(k) });

  // client data: compact catalogue for the bag and search (prices are re-checked server side)
  const client = {
    products: Object.fromEntries(products.map((p) => [p.id, { n: displayName(p, lang), p: p.price, u: productPath(lang, p), c: p.category, g: p.gender, s: p.status === 'PREVIEW', k: p.slug, gfx: p.line === 'graphic', q: [p.name.de, p.name.en, p.name.fr, p.category, p.gender, p.line, ...(p.symbol ? [p.symbol.glyph] : []), ...p.colors.map((c) => colors[c].name[lang])].join(' ').toLowerCase() }])),
    colors: Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, v.name[lang]])),
    cuts: { unisex: { de: 'Unisex', en: 'Unisex', fr: 'Unisexe' }[lang], women: { de: 'Damenschnitt', en: 'Women’s cut', fr: 'Coupe femme' }[lang] },
    shipping: { DE: { fee: shipping.zones.DE.fee, freeFrom: shipping.zones.DE.freeFrom }, EU: { fee: shipping.zones.EU.fee, freeFrom: shipping.zones.EU.freeFrom }, countries: shipping.countries }, // fees only, never costs
    upsell: { polos: 't-shirts', 't-shirts': 'polos', sweaters: 't-shirts' },
    t: { cart: { ...L.cart, freeHint: L.cart.freeHint('{n}') }, product: { added: L.product.added, chooseSize: L.product.chooseSize }, count: L.collection.count('{n}') },
  };
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'assets', `catalog.${lang}.json`), JSON.stringify(client));
}

// 404 (German first, links to the three languages)
{
  const L = t.de;
  const path = '/404.html';
  const body = `<section class="wrap page nf"><p class="nf__sym">${symbolSvg('sym sym--xl', '')}</p><h1 class="h1">${L.notFound.title}</h1><p>${L.notFound.body}</p>
<p><a class="btn btn--solid" href="/de/">${L.notFound.home}</a> <a class="btn btn--line" href="/en/">English</a> <a class="btn btn--line" href="/fr/">Français</a></p></section>`;
  write(path, layout('de', { path: '/de/404/', key: '404', title: '404 · Algebra', desc: L.notFound.title, body, noindex: true, alternates: false, absLinks: true }));
}

// root redirect + headers + robots + sitemap
writeFileSync(join(dist, '_redirects'), '/ /de/ 302\n/index.html /de/ 302\n');
writeFileSync(
  join(dist, 'index.html'),
  `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=de/"><link rel="canonical" href="${abs('/de/')}"><title>Algebra</title></head><body><a href="de/">Algebra</a> · <a href="en/">English</a> · <a href="fr/">Français</a></body></html>`,
);
writeFileSync(
  join(dist, '_headers'),
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: SAMEORIGIN
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self' ${site.apiBase.startsWith('http') ? new URL(site.apiBase).origin : ''}; form-action 'self' https://checkout.stripe.com; frame-ancestors 'self'; base-uri 'self'
${PREVIEW ? '  X-Robots-Tag: noindex, nofollow\n' : ''}/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/assets/photos/*
  Cache-Control: public, max-age=86400
/assets/catalog.*
  Cache-Control: public, max-age=300
/assets/styles.css
  Cache-Control: public, max-age=86400
/assets/app.js
  Cache-Control: public, max-age=86400
`,
);
writeFileSync(join(dist, 'robots.txt'), PREVIEW ? `# Preview: pages carry noindex. Crawling stays allowed so the noindex is seen.\nUser-agent: *\nAllow: /\n` : `User-agent: *\nAllow: /\nDisallow: /*/cart/\nDisallow: /*/search/\nDisallow: /*/order/\nDisallow: /*/tracking/\n\nSitemap: ${abs('/sitemap.xml')}\n`);
{
  const indexable = ['', 'shop/', ...Object.keys(collections).filter((k) => k !== 'shop').map((k) => `${k}/`), ...products.map((p) => `product/${p.slug}/`), 'faq/', 'size-guide/', 'about/', 'contact/', 'info/shipping/', 'info/returns/'];
  const urls = indexable
    .map((s) => `<url><loc>${abs(`/de/${s}`)}</loc>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${t[l].htmlLang}" href="${abs(`/${l}/${s}`)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${abs(`/de/${s}`)}"/></url>` + LANGS.filter((l) => l !== 'de').map((l) => `<url><loc>${abs(`/${l}/${s}`)}</loc></url>`).join(''))
    .join('\n');
  writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
}

// static assets
cpSync(join(root, 'site', 'assets'), join(dist, 'assets'), { recursive: true, });
// Garment colour swatches as classes: the Content-Security-Policy (style-src 'self') blocks inline style attributes.
writeFileSync(
  join(dist, 'assets', 'styles.css'),
  readFileSync(join(dist, 'assets', 'styles.css'), 'utf8') + '\n/* garment colours, generated from data/catalog.mjs */\n' + Object.entries(colors).map(([k, c]) => `.sw--c-${k}{--c:${c.hex}}`).join('\n') + '\n',
);
cpSync(join(root, 'brand', 'favicon.svg'), join(dist, 'favicon.svg'));
mkdirSync(join(dist, 'assets', 'fonts'), { recursive: true });
for (const [pkg, file] of [
  ['cormorant-garamond', 'cormorant-garamond-latin-500-normal.woff2'],
  ['cormorant-garamond', 'cormorant-garamond-latin-500-italic.woff2'],
  ['inter', 'inter-latin-400-normal.woff2'],
  ['inter', 'inter-latin-500-normal.woff2'],
]) {
  cpSync(join(root, 'node_modules', '@fontsource', pkg, 'files', file), join(dist, 'assets', 'fonts', file));
}
cpSync(join(root, 'site', 'assets', 'photos', 'mandelbrot-black-stage.jpg'), join(dist, 'assets', 'og.jpg'));

// ------------------------------------------------------------------ live guard: no unverified product facts
if (!PREVIEW) {
  const unverified = products.filter((p) => p.needs_verification || (premiumCopy[p.id] || graphicCopy(p.name.de)).spec.needs_verification);
  if (unverified.length) {
    console.error('LIVE BUILD REFUSED: product facts need verification for ' + unverified.map((p) => p.id).join(', '));
    process.exit(1);
  }
}

// ------------------------------------------------------------------ supplier confidentiality guard
// The public build must never contain supplier, base garment or cost data. The deploy stops if it does.
{
  const FORBIDDEN = /\b(a61|valadio|stanley|stella|pasadena|00577|00578|millenium|lyam|neoblu|supplierCost\w*|supplierSku|supplierArticle\w*|supplierProduct\w*|dropshipping|print[- ]on[- ]demand|lieferant\w*|fournisseur\w*|grossiste|großhändler|wholesaler)\b|sol['’]s\b/i;
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const leaks = [];
  for (const f of walk(dist)) {
    if (!/\.(html|json|js|css|txt|xml|svg)$/.test(f) && !f.endsWith('_headers') && !f.endsWith('_redirects')) continue;
    const m = readFileSync(f, 'utf8').match(FORBIDDEN);
    if (m) leaks.push(`${f.slice(dist.length)}: "${m[0]}"`);
  }
  if (leaks.length) {
    console.error('SUPPLIER DATA IN THE PUBLIC BUILD:\n' + leaks.slice(0, 20).join('\n'));
    process.exit(1);
  }
}
// Brand lock: one A. The public build may only contain the master geometry; no older symbol, no font A as logo,
// and brand/ may only hold the master and the files generated from it.
{
  const LEGACY = [/M45\.60 8\.00/, /M17\.90 53\.50L19\.20 51/, /symbol-embroidery|symbol-ivory|lockup-horizontal|wordmark-italic/];
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const hits = [];
  for (const f of walk(dist)) {
    if (!/\.(html|json|js|css|svg)$/.test(f)) continue;
    const t = readFileSync(f, 'utf8');
    for (const re of LEGACY) if (re.test(t)) hits.push(`${f.slice(dist.length)}: ${re}`);
  }
  const allowed = new Set(['README.md', 'algebra-a-signature-master.svg', 'algebra-a-signature-master-ivory.svg', 'wordmark-signature.svg', 'wordmark-signature-ivory.svg', 'favicon.svg', 'paths.json', 'production']);
  const extra = readdirSync(join(root, 'brand')).filter((f) => !allowed.has(f));
  if (extra.length) hits.push(`brand/ holds files outside the master set: ${extra.join(', ')}`);
  if (!readFileSync(join(dist, 'favicon.svg'), 'utf8').includes(brand.master.d)) hits.push('favicon.svg is not built from the master A');
  if (hits.length) {
    console.error('BRAND LOCK: competing A found:\n' + hits.slice(0, 20).join('\n'));
    process.exit(1);
  }
}
console.log(`build ok · mode=${site.mode} · ${LANGS.length} languages · ${products.length} products → dist/`);
