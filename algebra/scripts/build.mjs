/**
 * Static site build: site/ + data/ → dist/
 * Pages per language (/de/, /en/, /fr/): home, shop, collections, products, search, cart, success, tracking,
 * FAQ, size guide, about, contact, info pages (shipping, returns, legal), plus 404, sitemap.xml, robots.txt, _redirects, _headers.
 * All internal links are relative, so the build works on any host or sub-path.
 * Run: npm run build   (SITE_MODE=live only after the launch checklist is PASS)
 */
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
import { t } from '../site/i18n.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const brand = JSON.parse(readFileSync(join(root, 'brand', 'paths.json'), 'utf8'));
const LANGS = site.languages;
const PREVIEW = site.mode !== 'live';
// Cache-busting: every asset URL carries ?v=<hash of the shipped files>, so a deploy is never hidden by a browser cache.
const V = (() => {
  const h = createHash('sha1');
  for (const f of ['site/assets/styles.css', 'site/assets/app.js', 'data/photos.json']) if (existsSync(join(root, f))) h.update(readFileSync(join(root, f)));
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
const symbolSvg = (cls = 'sym', label = '') =>
  `<svg class="${cls}" viewBox="0 0 100 100" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'} focusable="false"><path fill="currentColor" d="${brand.symbol}"/></svg>`;
const wordmarkSvg = (cls = 'wm') =>
  `<svg class="${cls}" viewBox="0 0 ${brand.wordmark.width} ${brand.wordmark.height}" role="img" aria-label="Algebra" focusable="false"><path fill="currentColor" d="${brand.wordmark.d}"/></svg>`;

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
const conceptPic = (from, key, alt, opts = {}) => {
  const dims = { 'editorial-pair': [678, 585], 'detail-polo': [355, 325], 'detail-tee': [360, 325], 'detail-crew': [359, 325], 'detail-label': [353, 145], 'detail-button': [167, 130], 'gs-navier-stokes': [372, 425], 'gs-black-hole': [372, 425], 'gs-entanglement': [372, 425], 'gs-curvature': [372, 425], 'gs-epr-er': [800, 630], 'lifestyle-graphic': [1000, 891], 'gs-euler': [800, 542], 'gs-lorenz': [800, 542], 'gs-maxwell': [800, 542], 'gs-mandelbrot': [800, 542], 'gs-tesseract': [800, 542], 'gs-higgs': [800, 542], 'gs-big-bang': [800, 542] }[key];
  const r = (x) => rel(from, '/' + x);
  return `<picture class="${opts.cls || ''}"><source type="image/avif" srcset="${r(`assets/concept/${key}.avif`)}"><source type="image/webp" srcset="${r(`assets/concept/${key}.webp`)}"><img src="${r(`assets/concept/${key}.jpg`)}" alt="${esc(alt)}" width="${dims[0]}" height="${dims[1]}" ${opts.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-flag="CONCEPT"></picture>`;
};

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
    <a class="hdr__logo" href="${r(`/${lang}/`)}" aria-label="Algebra">${symbolSvg('sym', '')}${wordmarkSvg('wm')}</a>
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
    <div class="ftr__brand">${wordmarkSvg('wm wm--ftr')}<p class="ftr__sig">${site.signature}</p>
      <form class="ftr__nl" data-newsletter novalidate>
        <label for="ftr-email">${L.newsletter.title}</label>
        <div class="ftr__nlrow"><input id="ftr-email" name="email" type="email" autocomplete="email" required placeholder="${esc(L.newsletter.label)}"><button type="submit">${L.newsletter.button}</button></div>
        <p class="small" data-ok hidden role="status">${L.newsletter.ok}</p><p class="small form-err" data-err hidden role="alert">${L.newsletter.err}</p>
      </form></div>
    <div class="ftr__cols">
      <div><h2>${f.shop}</h2><ul>
        <li><a href="${r(`/${lang}/men/`)}">${L.nav.men}</a></li><li><a href="${r(`/${lang}/women/`)}">${L.nav.women}</a></li>
        <li><a href="${r(`/${lang}/graphic-series/`)}">${L.nav.graphic}</a></li><li><a href="${r(`/${lang}/shop/`)}">${L.nav.all}</a></li></ul></div>
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

// ------------------------------------------------------------------ components
function card(lang, from, p, { eager = false, color } = {}) {
  const L = t[lang];
  const first = color || p.colors[0];
  const sizes = [...new Set((p.cuts ? p.cuts.flatMap((x) => x.sizes) : p.sizes))];
  const href = rel(from, productPath(lang, p));
  // one image pair per colour; the swatches below switch them (hidden sets are not loaded: lazy + display:none)
  const sets = p.colors
    .map((c) => {
      const v = viewsOf(p, c);
      if (!v.length) return '';
      return `<div class="card__set" data-color="${c}"${c === first ? '' : ' hidden'}>${picture(from, img(p, c, v[0]), `${displayName(p, lang)}, ${colors[c].name[lang]}`, { eager: eager && c === first })}${v[1] ? picture(from, img(p, c, v[1]), '', { cls: 'card__alt' }) : ''}</div>`;
    })
    .join('');
  const sw = p.colors.map((k) => `<button type="button" class="sw-btn" data-swatch="${k}" aria-pressed="${k === first}" aria-label="${esc(colors[k].name[lang])}" title="${esc(colors[k].name[lang])}"><span class="sw" style="--c:${colors[k].hex}"></span></button>`).join('');
  const soon = p.status !== 'PREVIEW';
  return `<li class="card" data-gender="${p.gender}" data-cat="${p.category}" data-price="${p.price}" data-colors="${color || p.colors.join(' ')}" data-sizes="${sizes.join(' ')}">
  <a href="${color ? `${href}?color=${color}` : href}" class="card__a" data-track="select_item" data-id="${p.id}" data-href="${href}">
    <div class="card__img">${sets}</div>
    <div class="card__txt"><h3 class="card__name">${esc(displayName(p, lang))}</h3>
    <p class="card__price">${soon ? `<span class="muted">${esc(L.product.unavailable)}</span>` : money(p.price, lang)}</p></div>
  </a>
  <p class="card__meta"><span class="sws">${sw}</span><span>${L.premium.colorsCount(p.colors.length)}</span></p></li>`;
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
  const entries = list.flatMap((p) => (p.line === 'essentials' ? p.colors.map((c) => [p, c]) : [[p, null]]));
  const intro = key === 'graphic-series' ? `<p class="lead">${L.graphic.body}</p>` : key === 'women' ? `<p class="lead">${L.menwomen.body}</p>` : '';
  const body = `<section class="coll">
  <header class="coll__hd wrap"><h1 class="coll__h">${esc(h1)}</h1>${intro}</header>
  <div class="wrap">
  <form class="filters" data-filters aria-label="${esc(C.filter)}">
    <fieldset><legend>${C.color}</legend><div class="chips">${allColors.map((c) => `<label class="chip"><input type="checkbox" name="color" value="${c}"><span class="sw" style="--c:${colors[c].hex}"></span>${esc(colors[c].name[lang])}</label>`).join('')}</div></fieldset>
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
  const conceptKey = null;
  const concept = conceptKey && existsSync(join(root, 'site', 'assets', 'concept', `${conceptKey}.webp`)) ? `<figure class="gal__fig gal__fig--wide">${conceptPic(path, conceptKey, displayName(p, lang))}</figure>` : '';
  const b = blanks[p.blank];
  const composition = p.cuts ? p.cuts.map((c) => `${c.name[lang]}: ${blanks[c.blank].composition[lang]}, ${blanks[c.blank].gsm} g/m²`).join(' · ') : `${b.composition[lang]}${typeof b.gsm === 'number' ? `, ${b.gsm} g/m²` : ''}`;
  const blankLabel = p.cuts ? p.cuts.map((c) => blanks[c.blank].label).join(' · ') : b.label;
  const buyable = p.status === 'PREVIEW';
  const acc = (title, html, open = false) => `<details${open ? ' open' : ''}><summary>${esc(title)}</summary><div class="acc__bd">${html}</div></details>`;
  const related = [...products.filter((x) => x.id !== p.id && x.line !== p.line), ...products.filter((x) => x.id !== p.id && x.line === p.line)].slice(0, 4);
  const vat = P.vat[site.vatMode];
  const body = `<article class="pdp wrap" data-product="${p.id}" data-name="${esc(displayName(p, lang))}" data-price="${p.price}" data-cat="${p.category}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${r(`/${lang}/`)}">${P.breadcrumbHome}</a> / <a href="${r(`/${lang}/${p.gender === 'women' ? 'women' : p.line === 'graphic' ? 'graphic-series' : 'men'}/`)}">${p.gender === 'women' ? L.nav.women : p.line === 'graphic' ? L.nav.graphic : L.nav.men}</a> / <span aria-current="page">${esc(displayName(p, lang))}</span></nav>
  <div class="pdp__grid">
    <div class="gal sheet" data-gallery><p class="sheet__title" aria-hidden="true">${spaced}</p><span class="sheet__rule" aria-hidden="true"></span>${gallery}${concept}</div>
    <div class="buy">
      <div class="buy__sticky">
        ${p.capsule ? `<p class="kicker">${esc(p.capsule)}</p>` : `<p class="kicker">The Essentials</p>`}
        <h1 class="h1 buy__name">${esc(displayName(p, lang))}</h1>
        <p class="buy__price">${buyable ? money(p.price, lang) : P.unavailable}</p>
        ${buyable ? `<p class="small muted">${esc(vat)} <a href="${r(`/${lang}/info/shipping/`)}">${P.plusShip}</a></p>` : ''}
        <p class="buy__lead">${esc(p.copy.lead[lang])}</p>
        <form class="buy__form" data-buy novalidate>
          ${p.cuts ? `<fieldset class="opt"><legend>${P.cut}</legend><div class="opt__row">${cuts.map((c, i) => `<label class="pill"><input type="radio" name="cut" value="${c.id}"${i ? '' : ' checked'}><span>${esc(c.name[lang])}</span></label>`).join('')}</div></fieldset>` : ''}
          <fieldset class="opt"><legend>${P.color}: <span data-color-name>${esc(colors[p.colors[0]].name[lang])}</span></legend><div class="opt__row">${p.colors.map((c, i) => `<label class="swatch" title="${esc(colors[c].name[lang])}"><input type="radio" name="color" value="${c}" data-label="${esc(colors[c].name[lang])}"${i ? '' : ' checked'}><span class="sw sw--lg" style="--c:${colors[c].hex}"></span><span class="vh">${esc(colors[c].name[lang])}</span></label>`).join('')}</div></fieldset>
          <fieldset class="opt"><legend>${P.size}</legend><div class="opt__row" data-sizes>${cuts.map((c, ci) => c.sizes.map((s) => `<label class="pill" data-cut="${c.id}"${ci ? ' hidden' : ''}><input type="radio" name="size" value="${s}"${ci ? ' disabled' : ''}><span>${s}</span></label>`).join('')).join('')}</div>
          <a href="${r(`/${lang}/size-guide/`)}" class="small" data-track="size_guide_open">${P.sizeGuide}</a></fieldset>
          <p class="form-err" data-err role="alert" hidden>${P.chooseSize}</p>
          ${buyable ? `<button class="btn btn--solid btn--block" type="submit">${P.add}</button>` : `<p class="notice">${esc(P.notifyBody)}</p><a class="btn btn--line btn--block" href="${r(`/${lang}/#newsletter`)}">Newsletter</a>`}
        </form>
        <ul class="perks"><li>${esc(P.deliveryText)}</li><li>${esc(L.trust.returns[0])}</li><li>${esc(L.premium.germany[0])}</li></ul>
        <div class="acc">
          ${p.symbol ? acc(P.symbol, `<p class="symbol-eq">${mathHtml(p.equation || p.symbol.glyph)}</p><p>${mathHtml(p.symbol[lang])}</p>`, true) : ''}
          ${acc(P.fit, `<p>${esc(p.copy.fit[lang])}</p><p><a href="${r(`/${lang}/size-guide/`)}">${P.sizeGuide}</a></p>`, !p.symbol)}
          ${acc(P.fabric, `<p>${esc(p.copy.fabric[lang])}</p><p>${P.composition}: ${esc(composition)}</p><p class="small muted">${esc(L.premium.similar)}</p>`)}
          ${acc(P.detail, `<p>${esc(p.copy.detail[lang])}</p>`)}
          ${acc(P.design, `<p>${esc(p.copy.design[lang])}</p>`)}
          ${acc(P.care, `<p>${esc(p.care[lang])}</p>`)}
          ${acc(P.shipret, `<p>${esc(P.shipretText)}</p><p><a href="${r(`/${lang}/info/shipping/`)}">${L.footer.shipping}</a> · <a href="${r(`/${lang}/info/returns/`)}">${L.footer.returns}</a></p>`)}
          ${acc(P.safety, `<p>${esc(P.safetyText)}</p><p class="small muted">${esc(p.id)}</p>`)}
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
      description: p.copy.lead[lang],
      material: composition,
      color: p.colors.map((c) => colors[c].name[lang]).join(', '),
      image: [...(hasPhoto(`${p.slug}-${p.colors[0]}-stage`) ? [abs(`/assets/photos/${p.slug}-${p.colors[0]}-stage.jpg`)] : []), ...viewsOf(p, p.colors[0]).map((v) => abs(`/${img(p, p.colors[0], v)}.jpg`))],
      ...(offers ? { offers } : {}),
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: P.breadcrumbHome, item: abs(`/${lang}/`) }, { '@type': 'ListItem', position: 2, name: displayName(p, lang), item: abs(path) }] },
  ];
  write(path, layout(lang, { path, key: 'product', title: `${displayName(p, lang)} · Algebra`, desc: p.copy.lead[lang], body, jsonld }));
}

/** A photo from site/assets/photos (no -400 variant needed). */
function photo(from, name, alt, { w, h, eager = false, cls = '', sizes = '100vw' } = {}) {
  const r = (x) => rel(from, '/' + x);
  return `<picture class="${cls}"><source type="image/avif" srcset="${vq(r(`assets/photos/${name}.avif`))}"><source type="image/webp" srcset="${vq(r(`assets/photos/${name}.webp`))}" sizes="${sizes}"><img src="${vq(r(`assets/photos/${name}.jpg`))}" alt="${esc(alt)}" width="${w}" height="${h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
}

function home(lang) {
  const L = t[lang];
  const M = L.premium;
  const path = `/${lang}/`;
  const r = (to) => rel(path, to);
  const byId = (id) => products.find((p) => p.id === id);
  const gfx = products.filter((p) => p.line === 'graphic');
  const rail = ['ALG-G-09-MANDELBROT', 'ALG-G-11-HIGGS', 'ALG-G-13-FEYNMAN', 'ALG-G-12-BIGBANG'].map(byId).filter(Boolean);
  const essCards = [['ALG-M-POLO', 'deep-navy'], ['ALG-M-TEE', 'black'], ['ALG-M-CREW', 'ivory'], ['ALG-W-TEE', 'deep-navy']].map(([id, c]) => [byId(id), c]).filter(([p]) => p);
  const E = M.edit;
  const edit = (href, img, [k, h, txt, cta]) => `<a class="edit" href="${r(href)}">${photo(path, img, h, { w: 800, h: 1000, sizes: '(min-width: 768px) 50vw, 100vw', cls: 'edit__img' })}<span class="edit__txt"><span class="edit__k">${esc(k)}</span><span class="edit__h">${esc(h)}</span><span class="edit__p">${esc(txt)}</span><span class="edit__cta">${esc(cta)}</span></span></a>`;
  const T = L.trust;
  const body = `
<section class="hero">
  ${photo(path, 'campaign-graphic', `${M.campaign[0]} ${M.campaign[1]}`, { w: 1122, h: 1030, eager: true, cls: 'hero__img' })}
  <div class="hero__txt">
    <h1 class="hero__brand">${esc(M.campaign[0])}</h1>
    <p class="hero__season">${esc(M.campaign[1])}</p>
    <p class="hero__links"><a href="${r(`/${lang}/shop/`)}">${esc(M.campaign[2])}</a></p>
  </div>
</section>

<section class="edits" aria-label="${esc(L.nav.men)} / ${esc(L.nav.women)}">
  ${edit(`/${lang}/men/`, 'tile-men', E.men)}
  ${edit(`/${lang}/women/`, 'tile-women', E.women)}
</section>

<section class="feature">
  <a class="feature__img" href="${r(`/${lang}/graphic-series/`)}" tabindex="-1" aria-hidden="true">${photo(path, 'mandelbrot-black-stage', '', { w: 1600, h: 900, sizes: '(min-width: 1024px) 60vw, 100vw' })}</a>
  <div class="feature__txt">
    <p class="kicker">${esc(E.graphic[0])}</p>
    <h2 class="feature__h">${esc(E.graphic[1])}</h2>
    <p>${esc(E.graphic[2])}</p>
    <p><a class="more" href="${r(`/${lang}/graphic-series/`)}">${esc(E.graphic[3])}</a></p>
  </div>
</section>

<section class="rail">
  <header class="rail__hd wrap"><h2 class="sec-t">${esc(M.rail)}</h2><a class="more" href="${r(`/${lang}/graphic-series/`)}">${esc(L.graphic.cta)}</a></header>
  <ul class="grid grid--rail wrap">${rail.map((p) => card(lang, path, p)).join('')}</ul>
</section>

<section class="rail">
  <header class="rail__hd wrap"><h2 class="sec-t">${esc(M.essentials[0])}</h2><a class="more" href="${r(`/${lang}/shop/`)}">${esc(L.nav.all)}</a></header>
  <ul class="grid grid--rail wrap">${essCards.map(([p, c]) => card(lang, path, p, { color: c })).join('')}</ul>
</section>

<section class="story">
  <div class="story__in">
    ${symbolSvg('sym story__sym', '')}
    <h2 class="story__h">${esc(M.story[0])}</h2>
    <p>${esc(M.story[1])}</p>
    <p><a class="more more--inv" href="${r(`/${lang}/about/`)}">${esc(M.story[2])}</a></p>
  </div>
</section>

<section class="trust wrap" aria-label="Service">
  ${[M.germany, T.ship, T.returns, T.pay].map(([h, b]) => `<div><h3>${esc(h)}</h3><p>${esc(b)}</p></div>`).join('')}
</section>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Algebra', url: abs('/'), logo: abs('/favicon.svg'), slogan: site.signature },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Algebra', url: abs(`/${lang}/`), inLanguage: t[lang].htmlLang, potentialAction: { '@type': 'SearchAction', target: abs(`/${lang}/search/?q={query}`), 'query-input': 'required name=query' } },
  ];
  write(path, layout(lang, { path, key: 'home', title: L.meta.home[0], desc: L.meta.home[1], body, jsonld, bodyClass: 'is-home' }));
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
    shipping: { DE: shipping.zones.DE, EU: shipping.zones.EU, countries: shipping.countries },
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
cpSync(join(root, 'site', 'assets'), join(dist, 'assets'), { recursive: true, filter: (s) => !s.includes('/mockups') });
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
cpSync(join(root, 'site', 'assets', 'photos', 'hero.jpg'), join(dist, 'assets', 'og.jpg'));
console.log(`build ok · mode=${site.mode} · ${LANGS.length} languages · ${products.length} products → dist/`);
