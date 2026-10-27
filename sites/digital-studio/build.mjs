#!/usr/bin/env node
/**
 * Builds algbr.de (Al.G.B.r. Digital Studio + AlGBr ecosystem) into sites/digital-studio/dist/.
 *
 *   node sites/digital-studio/build.mjs
 *
 * Inputs: content/*.mjs (texts), shared/brands.json + shared/software.json (portfolio, via shared/registry.mjs),
 * assets/. No dependency. Environment:
 *   STUDIO_ORIGIN            canonical origin (default https://algbr.de)
 *   STUDIO_NOINDEX=1         preview build: noindex everywhere, robots Disallow
 *   STUDIO_TURNSTILE_SITEKEY Cloudflare Turnstile site key (optional; the Worker then needs TURNSTILE_SECRET)
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { checkRegistry, loadRegistry } from '../../shared/registry.mjs';
import { LANGS, DEFAULT_LANG, UI, META, HOME, SERVICES, SERVICES_PAGE, BRANDS_PAGE, SOFTWARE_PAGE, PLATFORM_NAMES, WORK_PAGE, ABOUT, CONTACT, BRIEF, NOT_FOUND } from './content/copy.mjs';
import { SERVICE_COMMON, SERVICE_DETAIL, INDUSTRY_COMMON, INDUSTRIES, HOME_FAQ } from './content/solutions.mjs';
import { WORK } from './content/work.mjs';
import { LEGAL } from './content/legal.mjs';

const here = import.meta.dirname;
const root = resolve(here, '..', '..');
const dist = join(here, 'dist');
const ORIGIN = (process.env.STUDIO_ORIGIN || 'https://algbr.de').replace(/\/$/, '');
const NOINDEX = process.env.STUDIO_NOINDEX === '1';
const TURNSTILE = process.env.STUDIO_TURNSTILE_SITEKEY || '';

const errors = await checkRegistry(root);
if (errors.length) {
  console.error(`Registre incohérent :\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const { organization: ORG, brands: BRANDS, software: ALL_SOFTWARE } = loadRegistry(root);
const SOFTWARE = ALL_SOFTWARE.filter((s) => s.public);

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
const ldJson = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const hostOf = (u) => new URL(u).host;
/** Site path of a page: '' → /de/, 'brands/go' → /de/brands/go/ */
const path = (lang, page = '') => `/${lang}/${page ? `${page}/` : ''}`;
const abs = (p) => ORIGIN + p;
const written = new Set();
function write(p, html) {
  const file = join(dist, p.endsWith('/') ? `${p}index.html` : p);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written.add(p);
}

// ------------------------------------------------------------------ assets
rmSync(dist, { recursive: true, force: true });
cpSync(join(here, 'assets'), join(dist, 'assets'), { recursive: true });
mkdirSync(join(dist, 'assets', 'logos'), { recursive: true });
for (const b of BRANDS) {
  cpSync(join(root, b.logo), join(dist, 'assets', 'logos', `${b.id}.svg`));
  if (b.logoOnDark) cpSync(join(root, b.logoOnDark), join(dist, 'assets', 'logos', `${b.id}-on-dark.svg`));
}
// Brand colours as classes (no inline styles: the CSP forbids them).
writeFileSync(
  join(dist, 'assets', 'brands.css'),
  BRANDS.map((b) => `.b-${b.id}{--b-ink:${b.theme.primary};--b-paper:${b.theme.background};--b-accent:${b.theme.accent}}`).join('\n') + '\n',
);
const V = createHash('sha256')
  .update(['studio.css', 'studio.js'].map((f) => readFileSync(join(here, 'assets', f))).join('') + JSON.stringify(BRANDS.map((b) => b.theme)))
  .digest('hex')
  .slice(0, 10);

// ------------------------------------------------------------------ chrome
const NAV = ['', 'services', 'brands', 'software', 'work', 'about', 'contact'];

function header(lang, page) {
  const t = UI[lang];
  const section = page.split('/')[0] === 'industries' ? 'services' : page.split('/')[0];
  const links = NAV.filter((p) => p !== 'contact')
    .map((p) => `<li><a href="${path(lang, p)}"${p === section ? ' aria-current="page"' : ''}>${esc(t.nav[p])}</a></li>`)
    .join('');
  const langs = LANGS.map((l) => `<li><a href="${path(l, page)}" hreflang="${l}" lang="${l}" aria-label="${esc(UI[l].langName)}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a></li>`).join('');
  return `<header class="site-head">
  <div class="wrap head-row">
    <a class="logo" href="${path(lang)}" aria-label="Al.G.B.r. Digital Studio, ${esc(t.nav[''])}"><img class="logo-mark" src="/assets/favicon.svg" alt="" width="36" height="36"><span class="logo-text"><span class="logo-word">Al.<i>G.B.</i><u>r.</u></span><span class="logo-sub">Digital Studio</span></span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">${esc(t.menu)}</button>
    <nav id="site-nav" class="site-nav" aria-label="${esc(t.menu)}">
      <ul>${links}</ul>
      <ul class="lang-switch" aria-label="${esc(t.language)}">${langs}</ul>
      <a class="btn btn-solid" href="${path(lang, 'contact')}"${section === 'contact' ? ' aria-current="page"' : ''}>${esc(t.cta)}</a>
    </nav>
  </div>
</header>`;
}

function footer(lang, page) {
  const t = UI[lang];
  const langs = LANGS.map((l) => `<a href="${path(l, page)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(UI[l].langName)}</a>`).join('');
  return `<footer class="site-foot">
  <div class="wrap foot-grid">
    <div>
      <p class="logo foot-logo"><img class="logo-mark" src="/assets/favicon.svg" alt="" width="36" height="36"><span class="logo-text"><span class="logo-word">Al.<i>G.B.</i><u>r.</u></span><span class="logo-sub">Digital Studio</span></span></p>
      <p class="foot-line">${esc(t.footer.line)}</p>
      <p><a href="mailto:${esc(ORG.email)}">${esc(ORG.email)}</a></p>
    </div>
    <nav aria-label="${esc(t.nav.brands)}"><p class="foot-title">${esc(t.nav.brands)}</p><ul>${BRANDS.map((b) => `<li><a href="${path(lang, `brands/${b.id}`)}">${esc(b.name)}</a></li>`).join('')}</ul></nav>
    <nav aria-label="${esc(t.nav.industries)}"><p class="foot-title">${esc(t.nav.industries)}</p><ul>${INDUSTRIES.map((i) => `<li><a href="${path(lang, `industries/${i.id}`)}">${esc(i[lang].label)}</a></li>`).join('')}</ul></nav>
    <nav aria-label="Studio"><p class="foot-title">Studio</p><ul>${NAV.filter(Boolean).map((p) => `<li><a href="${path(lang, p)}">${esc(t.nav[p])}</a></li>`).join('')}</ul></nav>
    <div><p class="foot-title">${esc(t.language)}</p><p class="foot-langs">${langs}</p></div>
  </div>
  <div class="wrap foot-base">
    <p>© ${new Date().getFullYear()} AlGBr. ${esc(t.footer.rights)}</p>
    <p><a href="${path(lang, 'impressum')}">${esc(t.footer.legal.impressum)}</a> <a href="${path(lang, 'datenschutz')}">${esc(t.footer.legal.datenschutz)}</a></p>
  </div>
</footer>`;
}

function layout(lang, page, { title, desc, body, noindex = false, jsonLd = [], bodyClass = '' }) {
  const t = UI[lang];
  const robots = NOINDEX || noindex ? '<meta name="robots" content="noindex, nofollow">' : '';
  const alternates = noindex
    ? ''
    : [...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(path(l, page))}">`), `<link rel="alternate" hreflang="x-default" href="${abs(path(DEFAULT_LANG, page))}">`].join('\n');
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${ORIGIN}/#org`,
    name: ORG.name,
    alternateName: ORG.studio,
    url: `${ORIGIN}/`,
    email: ORG.email,
    logo: `${ORIGIN}/assets/favicon.svg`,
    brand: BRANDS.map((b) => ({ '@type': 'Brand', name: b.name, url: b.url })),
  };
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots}
<link rel="canonical" href="${abs(path(lang, page))}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(ORG.studio)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(path(lang, page))}">
<meta property="og:image" content="${ORIGIN}/assets/og-image.jpg">
<meta property="og:locale" content="${{ de: 'de_DE', en: 'en_GB', fr: 'fr_FR' }[lang]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b1530">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/studio.css?v=${V}">
<link rel="stylesheet" href="/assets/brands.css?v=${V}">
${ldJson([org, ...jsonLd])}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">${esc(t.skip)}</a>
${header(lang, page)}
<main id="main">
${body}
</main>
${footer(lang, page)}
<script src="/assets/studio.js?v=${V}" defer></script>
</body>
</html>
`;
}

const meta = (lang, page) => META[lang][page.split('/')[0]];
const statusDot = (lang, status) => `<span class="status status-${esc(status)}">${esc(UI[lang].status[status])}</span>`;
const pageHead = (title, lead, extra = '') => `<section class="page-head"><div class="wrap"><h1>${esc(title)}</h1><p class="lead">${esc(lead)}</p>${extra}</div></section>`;

// ------------------------------------------------------------------ components
function directory(lang) {
  const rows = [
    { host: hostOf(ORG.url), url: `${ORIGIN}${path(lang)}`, name: ORG.studio, role: UI[lang].nav.services, status: 'live', self: true },
    ...BRANDS.map((b) => ({ host: hostOf(b.url), url: b.url, name: b.name, role: UI[lang].category[b.category], status: b.status, detail: path(lang, `brands/${b.id}`) })),
    ...SOFTWARE.map((s) => ({ host: s.domain, url: s.url, name: s.name, role: UI[lang].nav.software, status: s.status, detail: path(lang, 'software') })),
  ];
  return `<div class="directory" role="table" aria-label="${esc(HOME[lang].directory)}">
  <div class="dir-row dir-head" role="row"><span role="columnheader">${esc(UI[lang].domain)}</span><span role="columnheader">Name</span><span role="columnheader" class="dir-role">${esc(UI[lang].model)}</span><span role="columnheader">Status</span></div>
  ${rows
    .map(
      (r) => `<div class="dir-row" role="row"><span role="cell" class="dir-host">${r.self ? `<span>${esc(r.host)}</span>` : `<a href="${esc(r.url)}" rel="noopener">${esc(r.host)}</a>`}</span><span role="cell" class="dir-name">${r.detail ? `<a href="${r.detail}">${esc(r.name)}</a>` : esc(r.name)}</span><span role="cell" class="dir-role">${esc(r.role)}</span><span role="cell">${statusDot(lang, r.status)}</span></div>`,
    )
    .join('\n  ')}
</div>`;
}

function brandVisual(b, lang, size = 'card') {
  if (b.image) return `<img src="/${b.image.replace(/^sites\/digital-studio\//, '')}" alt="" width="720" height="560" loading="lazy" decoding="async">`;
  // No product photography for the brand yet: its official mark, never redrawn.
  const onDark = b.logoOnDark ? `/assets/logos/${b.id}-on-dark.svg` : `/assets/logos/${b.id}.svg`;
  return `<div class="brand-mark b-${b.id}"><img src="${onDark}" alt="${esc(b.name)}" width="${size === 'card' ? 120 : 180}" height="${size === 'card' ? 120 : 180}" loading="lazy"></div>`;
}

function brandCard(b, lang, h = 'h3') {
  return `<article class="brand-card b-${b.id}">
  <a class="brand-link" href="${path(lang, `brands/${b.id}`)}">
    <div class="brand-visual">${brandVisual(b, lang)}</div>
    <div class="brand-body">
      <${h}>${esc(b.name)}</${h}>
      <p class="brand-tag">${esc(b.tagline[lang])}</p>
      <p class="brand-meta">${esc(UI[lang].category[b.category])} ${statusDot(lang, b.status)}</p>
    </div>
  </a>
</article>`;
}

function serviceList(lang, detailed = false) {
  return `<ul class="services${detailed ? ' services-detailed' : ''}">${SERVICES[lang]
    .map(
      (s) => `<li id="${s.id}"><${detailed ? 'h2' : 'h3'}><a href="${path(lang, `services/${s.id}`)}">${esc(s.title)}</a></${detailed ? 'h2' : 'h3'}><p>${esc(s.text)}</p>${detailed ? `<ul class="ticks">${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}</li>`,
    )
    .join('')}</ul>`;
}

/** Line icons for the industries (24×24, stroke = currentColor). */
const ICONS = {
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  plate: '<circle cx="12" cy="12" r="6"/><path d="M3 4v6a2 2 0 0 0 2 2v8M21 4c-1.5 1-2 3-2 5s.5 3 2 3v8"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.6 20 18M8.6 16.4 20 6"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3zM14 6v12" stroke-dasharray="2 2"/>',
  stethoscope: '<path d="M6 3v6a5 5 0 0 0 10 0V3M11 14v2a5 5 0 0 0 10 0v-2"/><circle cx="21" cy="12" r="2"/>',
  house: '<path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6"/>',
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

function industryGrid(lang, h = 'h3') {
  return `<ul class="industry-grid">${INDUSTRIES.map((i) => `<li><a href="${path(lang, `industries/${i.id}`)}">${icon(i.icon)}<${h}>${esc(i[lang].label)}</${h}><span>${esc(i[lang].name)}</span></a></li>`).join('')}</ul>`;
}

function faqBlock(items, h = 'h3') {
  return `<div class="faq">${items.map(([q, a]) => `<details><summary><${h}>${esc(q)}</${h}></summary><p>${esc(a)}</p></details>`).join('')}</div>`;
}
const faqLd = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

const workTag = (w, lang) => w.tag?.[lang] ?? (w.kind === 'client' ? UI[lang].client : UI[lang].internal);

function workTeaser(w, lang) {
  const tag = workTag(w, lang);
  const brand = w.brands?.length === 1 ? BRANDS.find((b) => b.id === w.brands[0]) : null;
  const visual = w.image
    ? `<img src="/${w.image}" alt="" width="720" height="480" loading="lazy" decoding="async">`
    : brand
      ? brandVisual(brand, lang)
      : `<div class="brand-mark mark-next"><span aria-hidden="true">nΣxt</span></div>`;
  return `<article class="work-card${w.style ? ` work-card--${w.style}` : ''}"><a href="${path(lang, 'work')}#${w.id}"><div class="work-visual">${visual}</div><p class="work-kind">${esc(tag)}</p><h3>${esc(w.title[lang])}</h3>${w.signature ? `<p class="work-signature">${esc(w.signature)}</p>` : ''}<p>${esc(w.summary[lang])}</p></a></article>`;
}

function softwareBlock(s, lang, full = false) {
  const t = SOFTWARE_PAGE[lang];
  return `<article class="software${s.image ? ' has-visual' : ''}" id="${s.id}">
  ${s.image ? `<div class="software-visual"><img src="/${s.image.replace(/^sites\/digital-studio\//, '')}" alt="" width="1200" height="800" loading="lazy" decoding="async"></div>` : ''}
  <div class="software-body">
  <div class="software-id">
    ${s.logo ? `<img src="/${s.logo.replace(/^sites\/digital-studio\//, '')}" alt="" width="56" height="56">` : ''}
    <div><${full ? 'h2' : 'h3'}>${esc(s.name)}</${full ? 'h2' : 'h3'}><p class="software-tag">${esc(s.tagline || '')}</p></div>
    ${statusDot(lang, s.status)}
  </div>
  <p>${esc(s.summary[lang])}</p>
  ${full ? `<ul class="ticks">${s.features[lang].map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  <dl class="facts">
    <div><dt>${esc(t.platforms)}</dt><dd>${s.platforms.map((p) => esc(PLATFORM_NAMES[p]?.[lang] ?? p)).join(', ')}</dd></div>
    <div><dt>${esc(UI[lang].languages)}</dt><dd>${s.languages.map((l) => l.toUpperCase()).join(', ')}</dd></div>
    ${s.version ? `<div><dt>${esc(t.version)}</dt><dd>${esc(s.version)}</dd></div>` : ''}
    ${s.stack ? `<div><dt>${esc(t.stack)}</dt><dd>${s.stack.map(esc).join(', ')}</dd></div>` : ''}
    ${s.engineering ? `<div><dt>${esc(t.quality)}</dt><dd>${esc(s.engineering[lang])}</dd></div>` : ''}
  </dl>` : ''}
  <p><a class="btn btn-line" href="${esc(s.url)}" rel="noopener">${esc(s.access.cta[lang])}</a> <span class="host">${esc(s.domain)}</span></p>
  </div>
</article>`;
}

// ------------------------------------------------------------------ pages
function homePage(lang) {
  const h = HOME[lang];
  const [title, desc] = meta(lang, '');
  const body = `
<section class="hero">
  <div class="glow" aria-hidden="true"></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="pill"><span class="dot" aria-hidden="true"></span>${esc(h.pill)}</p>
      <h1>${esc(h.heroTitle)}</h1>
      <p class="lead">${esc(h.heroLead)}</p>
      <p class="hero-cta"><a class="btn btn-accent btn-lg" href="${path(lang, 'contact')}">${esc(h.cta1)}</a> <a class="btn btn-ghost btn-lg" href="${path(lang, 'work')}">${esc(h.cta2)}</a></p>
      <ul class="trust">${h.trust.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <div class="orbit">
        ${h.viz.map(([a, b], i) => `<div class="node node-${i + 1}"><small>0${i + 1}</small><strong>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}
        <div class="core"><span>Al.G.B.r.</span><small>${esc(h.vizCore)}</small></div>
      </div>
    </div>
  </div>
</section>
<section class="strip" aria-label="Al.G.B.r.">
  <div class="wrap strip-row">${h.strip.map(([n, x]) => `<p><strong>${esc(n)}</strong> <span>${esc(x)}</span></p>`).join('')}</div>
</section>
<section class="band band-ink">
  <div class="wrap eco">
    <div class="band-head"><div><p class="eyebrow">${esc(h.directory)}</p><h2>${esc(h.directoryNote)}</h2></div></div>
    ${directory(lang)}
  </div>
</section>
<section class="band">
  <div class="wrap">
    <div class="band-head"><div><p class="eyebrow">${esc(UI[lang].nav.services)}</p><h2>${esc(h.servicesTitle)}</h2></div><a href="${path(lang, 'services')}">${esc(UI[lang].nav.services)}</a></div>
    ${serviceList(lang)}
  </div>
</section>
<section class="band band-soft">
  <div class="wrap">
    <div class="band-head"><div><p class="eyebrow">${esc(UI[lang].nav.industries)}</p><h2>${esc(INDUSTRY_COMMON[lang].homeTitle)}</h2></div><a href="${path(lang, 'industries')}">${esc(UI[lang].nav.industries)}</a></div>
    ${industryGrid(lang)}
  </div>
</section>
<section class="band">
  <div class="wrap">
    <div class="band-head"><div><p class="eyebrow">${esc(UI[lang].nav.work)}</p><h2>${esc(h.workTitle)}</h2></div><a href="${path(lang, 'work')}">${esc(UI[lang].nav.work)}</a></div>
    <div class="work-grid work-grid-4">${WORK.slice(0, 4).map((w) => workTeaser(w, lang)).join('')}</div>
  </div>
</section>
<section class="band">
  <div class="wrap">
    <div class="band-head"><div><p class="eyebrow">${esc(UI[lang].nav.brands)}</p><h2>${esc(h.brandsTitle)}</h2></div><a href="${path(lang, 'brands')}">${esc(UI[lang].allBrands)}</a></div>
    <p class="band-lead">${esc(h.brandsLead)}</p>
    <div class="brand-grid">${BRANDS.map((b) => brandCard(b, lang)).join('')}</div>
  </div>
</section>
${SOFTWARE.length ? `<section class="band band-ink">
  <div class="wrap">
    <div class="band-head"><div><p class="eyebrow">${esc(UI[lang].nav.software)}</p><h2>${esc(h.softwareTitle)}</h2></div><a href="${path(lang, 'software')}">${esc(UI[lang].nav.software)}</a></div>
    ${SOFTWARE.map((s) => softwareBlock(s, lang)).join('')}
  </div>
</section>` : ''}
<section class="band">
  <div class="wrap narrow">
    <h2>${esc(HOME_FAQ[lang].title)}</h2>
    ${faqBlock(HOME_FAQ[lang].items)}
  </div>
</section>
<section class="band closing">
  <div class="wrap narrow">
    <h2>${esc(h.contactTitle)}</h2>
    <p class="lead">${esc(h.contactLead)}</p>
    <p><a class="btn btn-solid" href="${path(lang, 'contact')}">${esc(UI[lang].cta)}</a></p>
  </div>
</section>`;
  write(path(lang), layout(lang, '', { title, desc, body, bodyClass: 'is-home', jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: ORG.studio, url: `${ORIGIN}/`, inLanguage: LANGS }, faqLd(HOME_FAQ[lang].items)] }));
}

function servicesPage(lang) {
  const p = SERVICES_PAGE[lang];
  const [title, desc] = meta(lang, 'services');
  const body = `${pageHead(p.title, p.lead)}
<section class="band"><div class="wrap">${serviceList(lang, true)}</div></section>
<section class="band band-soft"><div class="wrap">
  <h2>${esc(p.processTitle)}</h2>
  <ol class="process">${p.process.map(([h, x]) => `<li><h3>${esc(h)}</h3><p>${esc(x)}</p></li>`).join('')}</ol>
</div></section>
<section class="band"><div class="wrap">
  <h2>${esc(p.pricingTitle)}</h2>
  <p class="band-lead">${esc(p.pricingLead)}</p>
  <dl class="pricing">${p.pricing.map(([n, price, x]) => `<div><dt>${esc(n)}</dt><dd class="price">${esc(price)}</dd><dd>${esc(x)}</dd></div>`).join('')}</dl>
  <p class="small muted">${esc(p.vat)}</p>
</div></section>
<section class="band band-soft"><div class="wrap">
  <h2>${esc(p.industriesTitle)}</h2>
  ${industryGrid(lang)}
  <p class="actions"><a class="btn btn-solid" href="${path(lang, 'contact')}">${esc(UI[lang].cta)}</a></p>
</div></section>`;
  const jsonLd = [{ '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: SERVICES[lang].map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Service', name: s.title, description: s.text, provider: { '@id': `${ORIGIN}/#org` } } })) }];
  write(path(lang, 'services'), layout(lang, 'services', { title, desc, body, jsonLd }));
}

function brandsPage(lang) {
  const p = BRANDS_PAGE[lang];
  const [title, desc] = meta(lang, 'brands');
  const body = `${pageHead(p.title, p.lead)}
<section class="band"><div class="wrap"><div class="brand-grid">${BRANDS.map((b) => brandCard(b, lang, 'h2')).join('')}</div></div></section>`;
  write(path(lang, 'brands'), layout(lang, 'brands', { title, desc, body }));
}

function brandPage(b, lang) {
  const t = UI[lang];
  const page = `brands/${b.id}`;
  const title = `${b.name} · ${BRANDS_PAGE[lang].title} · ${ORG.studio}`;
  const desc = `${b.name}: ${b.positioning[lang]}`;
  const move = b.migration && b.migration.status !== 'done' ? `<div><dt>${esc(t.planned)}</dt><dd>${esc(hostOf(b.migration.to))}</dd></div>` : '';
  const body = `
<section class="brand-hero b-${b.id}">
  <div class="wrap brand-hero-grid">
    <div>
      <p class="crumbs"><a href="${path(lang, 'brands')}">${esc(BRANDS_PAGE[lang].title)}</a></p>
      <h1>${esc(b.name)}</h1>
      <p class="brand-tag big">${esc(b.tagline[lang])}</p>
      <p class="lead">${esc(b.positioning[lang])}</p>
      <p class="actions"><a class="btn btn-solid" href="${esc(b.url)}" rel="noopener">${esc(t.visit)}</a></p>
    </div>
    <div class="brand-visual">${brandVisual(b, lang, 'hero')}</div>
  </div>
</section>
<section class="band"><div class="wrap brand-detail">
  <p class="lead">${esc(b.description[lang])}</p>
  <dl class="facts">
    <div><dt>${esc(t.domain)}</dt><dd><a href="${esc(b.url)}" rel="noopener">${esc(hostOf(b.url))}</a></dd></div>
    ${move}
    <div><dt>Status</dt><dd>${statusDot(lang, b.status)}</dd></div>
    <div><dt>${esc(t.model)}</dt><dd>${esc(t.shopType[b.shopType])}</dd></div>
    <div><dt>${esc(t.languages)}</dt><dd>${b.languages.map((l) => l.toUpperCase()).join(', ')}</dd></div>
  </dl>
  <p class="small muted">${esc(t.internal)}.</p>
  <p><a href="${path(lang, 'brands')}">${esc(t.allBrands)}</a></p>
</div></section>`;
  const jsonLd = [{ '@context': 'https://schema.org', '@type': 'Brand', name: b.name, url: b.url, slogan: b.tagline[lang], description: b.description[lang], logo: `${ORIGIN}/assets/logos/${b.id}.svg` }];
  write(path(lang, page), layout(lang, page, { title, desc, body, jsonLd }));
}

function softwarePage(lang) {
  const p = SOFTWARE_PAGE[lang];
  const [title, desc] = meta(lang, 'software');
  const body = `${pageHead(p.title, p.lead)}
<section class="band"><div class="wrap">${SOFTWARE.map((s) => softwareBlock(s, lang, true)).join('')}
<p class="muted">${esc(p.more)}</p></div></section>`;
  const jsonLd = SOFTWARE.map((s) => ({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: s.name, url: s.url, applicationCategory: 'ProductivityApplication', operatingSystem: 'Web', softwareVersion: s.version, description: s.summary[lang], publisher: { '@id': `${ORIGIN}/#org` } }));
  write(path(lang, 'software'), layout(lang, 'software', { title, desc, body, jsonLd }));
}

function workPage(lang) {
  const p = WORK_PAGE[lang];
  const [title, desc] = meta(lang, 'work');
  const list = (items) => `<ul class="ticks">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const cases = WORK.map((w) => {
    if (w.compact) {
      const link = BRANDS.find((b) => b.id === w.brands?.[0])?.url;
      return `<article class="case case--compact${w.style ? ` case--${w.style}` : ''}" id="${w.id}">
  <p class="work-kind">${esc(workTag(w, lang))}</p>
  <h2>${esc(w.title[lang])}</h2>
  ${w.signature ? `<p class="work-signature">${esc(w.signature)}</p>` : ''}
  <img class="case-photo" src="/${w.caseImage}" alt="${esc(w.title[lang])}" width="1080" height="720" loading="lazy" decoding="async">
  <p class="case-headline">${esc(w.headline[lang])}</p>
  <p class="case-text">${esc(w.text[lang])}</p>
  <p class="case-services">${w.services[lang].map(esc).join(' · ')}</p>
  ${link ? `<p class="case-cta"><a href="${esc(link)}" rel="noopener">${esc(w.cta[lang])} <span aria-hidden="true">↗</span></a></p>` : ''}
</article>`;
    }
    const sw = w.software ? SOFTWARE.find((s) => s.id === w.software) : null;
    const features = w.features?.[lang] ?? sw?.features[lang];
    const results = w.results?.[lang] ?? (sw ? [`${UI[lang].status[sw.status]} · ${sw.domain}`, sw.engineering?.[lang]].filter(Boolean) : null);
    const link = w.url ?? sw?.url ?? (w.brands?.length === 1 ? BRANDS.find((b) => b.id === w.brands[0])?.url : null);
    const brandLinks = w.brands?.length > 1 ? `<p class="small">${w.brands.map((id) => BRANDS.find((b) => b.id === id)).map((b) => `<a href="${path(lang, `brands/${b.id}`)}">${esc(b.name)}</a>`).join(' ')}</p>` : '';
    return `<article class="case${w.style ? ` case--${w.style}` : ''}" id="${w.id}">
  <header class="case-head">
    <p class="work-kind">${esc(workTag(w, lang))}</p>
    <h2>${esc(w.title[lang])}</h2>${w.signature ? `\n    <p class="work-signature">${esc(w.signature)}</p>` : ''}
    <p class="lead">${esc(w.summary[lang])}</p>
    ${brandLinks}
  </header>
  ${w.caseImage ? `<img class="case-shot" src="/${w.caseImage}" alt="${esc(w.title[lang])}" width="1200" height="800" loading="lazy" decoding="async">` : ''}
  <div class="case-grid">
    <section><h3>${esc(p.challenge)}</h3><p>${esc(w.challenge[lang])}</p><h3>${esc(p.approach)}</h3><p>${esc(w.approach[lang])}</p></section>
    <section>${features ? `<h3>${esc(p.features)}</h3>${list(features)}` : ''}<h3>${esc(p.tech)}</h3><p>${w.tech.map(esc).join(', ')}</p></section>
    <section>${results ? `<h3>${esc(p.results)}</h3>${list(results)}` : ''}${link ? `<p><a class="btn btn-line" href="${esc(link)}" rel="noopener">${esc(hostOf(link))}</a></p>` : ''}</section>
  </div>
</article>`;
  }).join('\n');
  const body = `${pageHead(p.title, p.lead)}
<section class="band"><div class="wrap">${cases}</div></section>`;
  write(path(lang, 'work'), layout(lang, 'work', { title, desc, body }));
}

function aboutPage(lang) {
  const a = ABOUT[lang];
  const [title, desc] = meta(lang, 'about');
  const body = `${pageHead(a.title, a.lead)}
<section class="band"><div class="wrap"><dl class="principles">${a.blocks.map(([h, x]) => `<div><dt>${esc(h)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>
<p class="actions"><a class="btn btn-solid" href="${path(lang, 'contact')}">${esc(UI[lang].cta)}</a></p></div></section>`;
  write(path(lang, 'about'), layout(lang, 'about', { title, desc, body }));
}

function contactPage(lang) {
  const c = CONTACT[lang];
  const [title, desc] = meta(lang, 'contact');
  const opts = (ids, labels, placeholder) => (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') + ids.map((id) => `<option value="${id}">${esc(labels[id])}</option>`).join('');
  const industryLabels = { ...Object.fromEntries(INDUSTRIES.map((i) => [i.id, i[lang].label])), other: c.other };
  const step = (n, inner) => `<fieldset class="brief-step"><legend><span class="step-n">${n}</span> ${esc(c.steps[n - 1])}</legend>${inner}</fieldset>`;
  const body = `${pageHead(c.title, c.lead)}
<section class="band"><div class="wrap contact-grid">
  <form class="contact-form" data-contact novalidate action="/api/contact" method="post">
    <input type="hidden" name="lang" value="${lang}">
    <input type="hidden" name="t" value="">
    <div class="hp" aria-hidden="true"><label>${esc(c.honeypot)}<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
    ${step(1, `<div class="row2"><label>${esc(c.type)}<select name="type" required>${opts(BRIEF.types, c.types, c.choose)}</select></label>
      <label>${esc(c.industry)}<select name="industry">${opts(BRIEF.industries, industryLabels, c.choose)}</select></label></div>
      <label>${esc(c.goal)}<textarea name="goal" required minlength="10" maxlength="2000" rows="3" aria-describedby="goal-hint"></textarea><span id="goal-hint" class="hint">${esc(c.goalHint)}</span></label>`)}
    ${step(2, `<div class="checks">${BRIEF.features.map((f) => `<label class="check"><input type="checkbox" name="features" value="${f}"> <span>${esc(c.features[f])}</span></label>`).join('')}</div>`)}
    ${step(3, `<div class="row2"><label>${esc(c.brand)}<select name="brand">${opts(BRIEF.have, c.have)}</select></label>
      <label>${esc(c.content)}<select name="content">${opts(BRIEF.have, c.have)}</select></label></div>
      <label>${esc(c.links)}<input name="links" maxlength="500" inputmode="url"></label>`)}
    ${step(4, `<div class="row2"><label>${esc(c.budget)}<select name="budget">${opts(BRIEF.budgets, c.budgets)}</select></label>
      <label>${esc(c.timeline)}<select name="timeline">${opts(BRIEF.timelines, c.timelines)}</select></label></div>
      <div class="row2"><label>${esc(c.name)}<input name="name" required maxlength="120" autocomplete="name"></label>
      <label>${esc(c.email)}<input name="email" type="email" required maxlength="200" autocomplete="email"></label></div>
      <label>${esc(c.company)}<input name="company" maxlength="160" autocomplete="organization"></label>
      <label>${esc(c.message)}<textarea name="message" maxlength="5000" rows="4"></textarea></label>
      <label class="check"><input type="checkbox" name="consent" required> <span>${esc(c.consent)} <a href="${path(lang, 'datenschutz')}">${esc(c.consentLink)}</a>.</span></label>`)}
    ${TURNSTILE ? `<div class="cf-turnstile" data-sitekey="${esc(TURNSTILE)}" data-language="${lang}"></div>` : ''}
    <button class="btn btn-solid" type="submit" data-sending="${esc(c.sending)}">${esc(c.submit)}</button>
    <p class="form-status" role="status" aria-live="polite" data-ok="${esc(c.sent)}" data-error="${esc(c.error)}" data-fallback="${esc(c.fallback)}"></p>
    <p class="form-fallback" hidden><a class="btn btn-line" data-mailto href="mailto:${esc(ORG.email)}">${esc(c.fallbackButton)}</a></p>
  </form>
  <div class="contact-aside">
    <p class="foot-title">${esc(c.direct)}</p>
    <p><a href="mailto:${esc(ORG.email)}">${esc(ORG.email)}</a></p>
  </div>
</div></section>`;
  write(path(lang, 'contact'), layout(lang, 'contact', { title, desc, body }));
}

function servicePage(id, lang) {
  const d = SERVICE_DETAIL[id][lang];
  const k = SERVICE_COMMON[lang];
  const page = `services/${id}`;
  const brief = `${path(lang, 'contact')}?type=${BRIEF.serviceType[id]}`;
  const body = `<section class="page-head sub-head"><div class="wrap">
  <p class="crumbs"><a href="${path(lang, 'services')}">${esc(UI[lang].nav.services)}</a></p>
  <h1>${esc(d.h1)}</h1><p class="lead">${esc(d.lead)}</p>
  <p class="actions"><a class="btn btn-solid" href="${brief}">${esc(k.ctaButton)}</a> <a class="btn btn-line" href="mailto:${esc(ORG.email)}">${esc(ORG.email)}</a></p>
</div></section>
<section class="band"><div class="wrap split">
  <div class="split-aside"><p class="aside-eyebrow">${esc(k.eyebrow)}</p><h2>${esc(d.name)}</h2><p>${esc(k.aside)}</p><ul class="tags">${d.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="split-main">
    <h2>${esc(k.itemsTitle)}</h2>
    <ul class="feature-list">${d.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    ${k.blocks.map(([h, x]) => `<h2>${esc(h)}</h2><p>${esc(x)}</p>`).join('')}
    <h2>${esc(k.faqTitle)}</h2>
    ${faqBlock(k.faq)}
    <h2>${esc(k.related)}</h2>
    <p class="related">${SERVICE_DETAIL[id].industries.map((iid) => INDUSTRIES.find((i) => i.id === iid)).map((i) => `<a href="${path(lang, `industries/${i.id}`)}">${esc(i[lang].label)}</a>`).join('')}</p>
  </div>
</div></section>
<section class="band closing"><div class="wrap narrow"><h2>${esc(k.cta)}</h2><p><a class="btn btn-solid" href="${brief}">${esc(k.ctaButton)}</a></p></div></section>`;
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Service', name: d.name, description: d.lead, provider: { '@id': `${ORIGIN}/#org` }, areaServed: 'DE', url: abs(path(lang, page)) },
    faqLd(k.faq),
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: UI[lang].nav.services, item: abs(path(lang, 'services')) }, { '@type': 'ListItem', position: 2, name: d.name, item: abs(path(lang, page)) }] },
  ];
  write(path(lang, page), layout(lang, page, { title: `${d.name} · ${ORG.studio}`, desc: d.lead, body, jsonLd }));
}

function industriesPage(lang) {
  const k = INDUSTRY_COMMON[lang];
  const [title, desc] = meta(lang, 'industries');
  const body = `${pageHead(k.title, k.lead)}
<section class="band"><div class="wrap">${industryGrid(lang, 'h2')}</div></section>`;
  write(path(lang, 'industries'), layout(lang, 'industries', { title, desc, body }));
}

function industryPage(ind, lang) {
  const d = ind[lang];
  const k = INDUSTRY_COMMON[lang];
  const page = `industries/${ind.id}`;
  const brief = `${path(lang, 'contact')}?industry=${ind.id}`;
  const body = `<section class="page-head sub-head"><div class="wrap">
  <p class="crumbs"><a href="${path(lang, 'industries')}">${esc(UI[lang].nav.industries)}</a></p>
  <p class="industry-icon">${icon(ind.icon)}</p>
  <h1>${esc(d.h1)}</h1><p class="lead">${esc(d.lead)}</p>
  <p class="actions"><a class="btn btn-solid" href="${brief}">${esc(k.ctaButton)}</a> <a class="btn btn-line" href="${path(lang, 'work')}">${esc(UI[lang].nav.work)}</a></p>
</div></section>
<section class="band"><div class="wrap split">
  <div class="split-aside"><p class="aside-eyebrow">${esc(k.eyebrow)}</p><h2>${esc(d.name)}</h2><p>${esc(k.aside)}</p></div>
  <div class="split-main">
    <h2>${esc(k.itemsTitle)}</h2>
    <ul class="feature-list">${d.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    ${k.blocks.map(([h, x]) => `<h2>${esc(h)}</h2><p>${esc(x)}</p>`).join('')}
    <h2>${esc(k.related)}</h2>
    <p class="related">${ind.services.map((sid) => `<a href="${path(lang, `services/${sid}`)}">${esc(SERVICE_DETAIL[sid][lang].name)}</a>`).join('')}</p>
  </div>
</div></section>
<section class="band closing"><div class="wrap narrow"><h2>${esc(k.cta)}</h2><p><a class="btn btn-solid" href="${brief}">${esc(k.ctaButton)}</a></p></div></section>`;
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Service', name: d.name, description: d.lead, provider: { '@id': `${ORIGIN}/#org` }, areaServed: 'DE', audience: { '@type': 'BusinessAudience', audienceType: d.label } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: UI[lang].nav.industries, item: abs(path(lang, 'industries')) }, { '@type': 'ListItem', position: 2, name: d.name, item: abs(path(lang, page)) }] },
  ];
  write(path(lang, page), layout(lang, page, { title: `${d.name} · ${ORG.studio}`, desc: d.lead, body, jsonLd }));
}

function legalPage(lang, key) {
  const [title, desc] = meta(lang, key);
  const note = UI[lang].legalNote ? `<p class="muted">${esc(UI[lang].legalNote)}</p>` : '';
  const body = `<section class="page-head"><div class="wrap narrow">${note}</div></section><section class="band legal"><div class="wrap narrow" lang="de">${LEGAL[key]}</div></section>`;
  write(path(lang, key), layout(lang, key, { title, desc, body, noindex: lang !== 'de' }));
}

function notFound() {
  const lang = DEFAULT_LANG;
  const [h, x, cta] = NOT_FOUND[lang];
  const other = LANGS.filter((l) => l !== lang).map((l) => `<p lang="${l}"><a href="${path(l)}">${esc(NOT_FOUND[l][2])}</a></p>`).join('');
  write('/404.html', layout(lang, '', { title: `404 · ${ORG.studio}`, desc: h, noindex: true, body: `${pageHead(h, x, `<p class="actions"><a class="btn btn-solid" href="${path(lang)}">${esc(cta)}</a></p>${other}`)}` }));
}

// ------------------------------------------------------------------ build
for (const lang of LANGS) {
  homePage(lang);
  servicesPage(lang);
  for (const id of Object.keys(SERVICE_DETAIL)) servicePage(id, lang);
  industriesPage(lang);
  for (const ind of INDUSTRIES) industryPage(ind, lang);
  brandsPage(lang);
  for (const b of BRANDS) brandPage(b, lang);
  softwarePage(lang);
  workPage(lang);
  aboutPage(lang);
  contactPage(lang);
  legalPage(lang, 'impressum');
  legalPage(lang, 'datenschutz');
}
notFound();

// Root: the Worker redirects / by Accept-Language; this page is the fallback without the Worker.
write(
  '/index.html',
  `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(ORG.studio)}</title><link rel="canonical" href="${abs(path(DEFAULT_LANG))}"><meta http-equiv="refresh" content="0;url=${path(DEFAULT_LANG)}"><link rel="icon" href="/assets/favicon.svg"></head><body><p>${LANGS.map((l) => `<a href="${path(l)}" hreflang="${l}">${esc(UI[l].langName)}</a>`).join(' · ')}</p></body></html>`,
);

const indexable = [...written].filter((p) => /^\/(de|en|fr)\//.test(p) && !(/\/(impressum|datenschutz)\/$/.test(p) && !p.startsWith('/de/')));
const pageOf = (p) => p.replace(/^\/(de|en|fr)\//, '').replace(/\/$/, '');
const pages = [...new Set(indexable.map(pageOf))];
const legalOnlyDe = new Set(['impressum', 'datenschutz']);
write(
  '/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages
    .flatMap((pg) =>
      (legalOnlyDe.has(pg) ? ['de'] : LANGS).map(
        (l) => `<url><loc>${abs(path(l, pg))}</loc>${legalOnlyDe.has(pg) ? '' : LANGS.map((x) => `<xhtml:link rel="alternate" hreflang="${x}" href="${abs(path(x, pg))}"/>`).join('')}</url>`,
      ),
    )
    .join('\n')}\n</urlset>\n`,
);
write('/robots.txt', NOINDEX ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n`);

const turnstile = TURNSTILE ? ' https://challenges.cloudflare.com' : '';
write(
  '/_headers',
  `/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'${turnstile}; frame-src${turnstile || " 'none'"}; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'
${NOINDEX ? '  X-Robots-Tag: noindex, nofollow\n' : ''}
/assets/*
  Cache-Control: public, max-age=604800

`,
);

// Size check: nothing heavy slips in.
const size = (d) => readdirSync(d).reduce((a, f) => a + (statSync(join(d, f)).isDirectory() ? size(join(d, f)) : statSync(join(d, f)).size), 0);
console.log(`• algbr.de → ${dist.replace(root + '/', '')}: ${written.size} files, ${LANGS.length} languages, ${BRANDS.length} brands, ${SOFTWARE.length} software, ${(size(dist) / 1024).toFixed(0)} KB, origin ${ORIGIN}${NOINDEX ? ' (noindex preview)' : ''}`);
if (!existsSync(join(dist, 'de', 'index.html'))) process.exit(1);
