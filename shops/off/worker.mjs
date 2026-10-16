/**
 * OFF. by AlGBr — the storefront (off.algbr.eu). Pages are rendered on request
 * from D1 (off_products), so a piece published in the admin is live at once and
 * a sold piece moves to the archive. Photos come from KV (OFF_MEDIA). Checkout,
 * sourcing requests and the admin API are served by the shared backend
 * (api.algbr.eu). Static files: /assets/*, /admin/*.
 */
import { legalPages } from '../../scripts/legal.mjs';
import platform from '../../shared/platform.json' with { type: 'json' };
import { T, LANGS, CONDITION, money } from './i18n.mjs';

const SITE = {
  brand: 'OFF.',
  company: {
    name: 'AlGBr',
    owner: 'Guy Beaho',
    street: 'Carlo-Mierendorff-Str. 15',
    city: '68623 Lampertheim',
    country: 'Deutschland',
    email: 'contact@algbr.de',
    phone: '',
    taxNote: 'Kleinunternehmer gemäß § 19 UStG',
  },
  fulfilment: 'own',
  shipping: { countries: ['DE'], cents: 579, carrier: 'Hermes', deliveryDays: '2–4' },
};
const LEGAL = legalPages(SITE);
const LEGAL_PAGES = ['impressum', 'datenschutz', 'agb', 'widerruf', 'versand'];
const PUBLIC_COLS = 'id, slug, status, brand, name, ref, gtin, color, size_eu, size_us, size_uk, cm, condition, price_cents, rrp_cents, stock, images_json, description, created_at, updated_at';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
const imgs = (p) => JSON.parse(p.images_json || '[]');
const sold = (p) => p.status === 'sold' || p.stock <= 0;
const title = (p) => `${p.brand} ${p.name}${p.color ? ` · ${p.color}` : ''}`;

function headers(env, type = 'text/html; charset=utf-8', cache = 'public, max-age=60') {
  return {
    'content-type': type,
    'cache-control': cache,
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'content-security-policy': `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' ${env.API} https://cloudflareinsights.com; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'self'`,
    ...(env.LAUNCHED === 'true' ? {} : { 'x-robots-tag': 'noindex, nofollow' }),
  };
}

function layout(env, lang, { title: pageTitle, description, body, path, ogImage, jsonld }) {
  const t = T[lang];
  const origin = env.ORIGIN;
  const alt = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${origin}/${l}${path}">`).join('');
  const n = platform.next[lang];
  const nav = LANGS.map((l) => `<a href="/${l}${path}"${l === lang ? ' aria-current="true"' : ''}>${l.toUpperCase()}</a>`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(pageTitle)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${origin}/${lang}${path}">${alt}<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${origin}/${lang}${path}">
${ogImage ? `<meta property="og:image" content="${esc(origin + ogImage)}">` : ''}<meta name="theme-color" content="#0b0b0a">
<link rel="stylesheet" href="/assets/off.css?v=${env.ASSET_V}">${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head><body data-api="${esc(env.API)}" data-lang="${lang}">
<div class="top">${esc(t.top)}</div>
<header class="wrap head"><a class="logo" href="/${lang}/" aria-label="OFF. by AlGBr">O<i>F</i>F.<small>by AlGBr</small></a>
<nav class="nav"><a href="/${lang}/#shop">${t.nav.shop}</a><a href="/${lang}/#archive">${t.nav.archive}</a><a href="/${lang}/#find">${t.nav.find}</a><a href="/${lang}/bestellung">${t.nav.track}</a></nav>
<span class="langs">${nav}</span></header>
<main>${body}</main>
<aside class="wrap next"><a href="${platform.next.url}" rel="noopener"><span class="nsxt" role="img" aria-label="NEXT">n<b>Σ</b>xt</span><span><b>${esc(n.title)}</b> ${esc(n.text)}</span><span class="next-cta">${esc(n.cta)} →</span></a></aside>
<footer class="wrap foot"><div><b class="logo">O<i>F</i>F.</b><p>${esc(t.footer)}</p><p class="muted">${esc(t.rights)}</p></div>
<div><b>${t.service}</b>${LEGAL_PAGES.map((k) => `<a href="/${lang}/${k}">${t.legal[k]}</a>`).join('')}<a href="mailto:${SITE.company.email}">${t.contact}</a></div></footer>
<script type="application/json" id="i18n">${JSON.stringify({ pdp: { reserving: t.pdp.reserving, reserved: t.pdp.reserved, soldNow: t.pdp.soldNow, error: t.pdp.error }, find: { ok: t.find.ok, error: t.find.error }, count: [t.shop.count(1), t.shop.count(2)], status: t.status, notFound: t.trackNotFound }).replace(/</g, '\\u003c')}</script>
<script src="/assets/off.js?v=${env.ASSET_V}" defer></script>
${env.CF_BEACON ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(env.CF_BEACON)}"}'></script>` : ''}
</body></html>`;
}

function card(lang, p) {
  const t = T[lang];
  const i = imgs(p)[0];
  const off = p.rrp_cents && p.rrp_cents > p.price_cents ? Math.round((1 - p.price_cents / p.rrp_cents) * 100) : 0;
  return `<a class="card${sold(p) ? ' is-sold' : ''}" href="/${lang}/p/${encodeURIComponent(p.slug)}" data-brand="${esc(p.brand)}" data-size="${esc(p.size_eu)}" data-price="${p.price_cents}" data-date="${esc(p.created_at)}" data-q="${esc(`${p.brand} ${p.name} ${p.color} ${p.ref}`.toLowerCase())}">
<div class="visual"><span class="badge">${sold(p) ? t.sold : p.stock > 1 ? t.left(p.stock) : t.one}</span>${off && !sold(p) ? `<span class="off">−${off} %</span>` : ''}${i ? `<img src="${esc(i)}" alt="${esc(title(p))}" loading="lazy">` : ''}</div>
<div class="meta"><div><span class="ey">${esc(p.brand)} · ${esc(p.ref)}</span><h3>${esc(p.name)}</h3><small>${esc(p.color)}${p.size_eu ? ` · EU ${esc(p.size_eu)}` : ''}</small></div><strong>${money(lang, p.price_cents)}</strong></div></a>`;
}

function home(env, lang, products) {
  const t = T[lang];
  const live = products.filter((p) => p.status === 'live' && p.stock > 0);
  const archive = products.filter((p) => p.status === 'sold' || (p.status === 'live' && p.stock <= 0)).slice(0, 12);
  const brands = [...new Set(live.map((p) => p.brand))].sort();
  const sizes = [...new Set(live.map((p) => p.size_eu).filter(Boolean))].sort((a, b) => parseFloat(a) - parseFloat(b));
  const body = `
<section class="wrap hero"><div><span class="ey">${t.hero.eyebrow}</span><h1>${t.hero.title[0]}<br>${t.hero.title[1]}</h1><p>${t.hero.text}</p>
<div class="row"><a class="btn" href="#shop">${t.hero.cta}</a><a class="btn ghost" href="#find">${t.hero.cta2}</a></div></div>
<div class="heroBox"><span class="ey">${t.hero.live}</span><strong>${live.length}</strong><p>${t.hero.liveText}</p><ul class="ticks">${t.promise.map((x) => `<li>${x}</li>`).join('')}</ul></div></section>
<section class="wrap section" id="shop"><span class="ey">${t.shop.eyebrow}</span><h2>${t.shop.title}</h2>
<div class="shopbar"><input id="q" type="search" placeholder="${esc(t.shop.search)}" aria-label="${esc(t.shop.search)}">
<select id="brandFilter" aria-label="${t.shop.brand}"><option value="">${t.shop.allBrands}</option>${brands.map((b) => `<option>${esc(b)}</option>`).join('')}</select>
<select id="sizeFilter" aria-label="${t.shop.size}"><option value="">${t.shop.allSizes}</option>${sizes.map((s) => `<option>${esc(s)}</option>`).join('')}</select>
<select id="sortFilter" aria-label="${t.shop.sort}"><option value="new">${t.shop.newest}</option><option value="asc">${t.shop.priceAsc}</option><option value="desc">${t.shop.priceDesc}</option></select></div>
<p class="shopmeta"><span id="resultCount">${t.shop.count(live.length)}</span><span>${t.shop.meta}</span></p>
<div class="grid" id="liveGrid">${live.map((p) => card(lang, p)).join('') || `<p class="empty">${t.shop.empty}</p>`}</div>
<p class="empty" id="noMatch" hidden>${t.shop.noMatch}</p></section>
${archive.length ? `<section class="wrap section" id="archive"><span class="ey">${t.archive.eyebrow}</span><h2>${t.archive.title}</h2><p class="lead">${t.archive.text}</p><div class="grid">${archive.map((p) => card(lang, p)).join('')}</div></section>` : ''}
<section class="wrap section" id="find"><div class="find"><div><span class="ey">${t.find.eyebrow}</span><h2>${t.find.title}</h2><p>${t.find.text}</p><ul class="ticks">${t.find.points.map((x) => `<li>${x}</li>`).join('')}</ul></div>
<form class="form" id="sourceForm" novalidate>
<label class="field"><span>${t.find.brand}</span><input name="brand" maxlength="60" placeholder="Timberland, Clarks, Lacoste…"></label>
<label class="field"><span>${t.find.model}</span><input name="model" maxlength="120"></label>
<label class="field"><span>${t.find.color}</span><input name="color" maxlength="60"></label>
<label class="field"><span>${t.find.size}</span><input name="sizeEU" maxlength="10" required></label>
<label class="field"><span>${t.find.budget}</span><input name="maxBudget" type="number" min="0" step="1"></label>
<label class="field"><span>${t.find.email}</span><input name="email" type="email" maxlength="120" required autocomplete="email"></label>
<label class="field full"><span>${t.find.notes}</span><textarea name="notes" maxlength="1000"></textarea></label>
<label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
<p class="full fine">${t.find.privacy} <a href="/${lang}/datenschutz">${t.legal.datenschutz}</a>.</p>
<button class="btn full" type="submit">${t.find.submit}</button><p class="notice full" id="notice" role="status" hidden></p></form></div></section>`;
  return layout(env, lang, { title: t.seo.title, description: t.seo.description, body, path: '/', ogImage: live[0] ? imgs(live[0])[0] : null });
}

function product(env, lang, p, others) {
  const t = T[lang];
  const images = imgs(p);
  const isSold = sold(p);
  const off = p.rrp_cents && p.rrp_cents > p.price_cents ? Math.round((1 - p.price_cents / p.rrp_cents) * 100) : 0;
  const url = `${env.ORIGIN}/${lang}/p/${p.slug}`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title(p),
    sku: p.ref,
    mpn: p.ref,
    ...(p.gtin ? { gtin: p.gtin } : {}),
    brand: { '@type': 'Brand', name: p.brand },
    ...(p.color ? { color: p.color } : {}),
    image: images.map((i) => env.ORIGIN + i),
    description: p.description || `${title(p)}, EU ${p.size_eu}`,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EUR',
      price: (p.price_cents / 100).toFixed(2),
      availability: isSold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      itemCondition: p.condition === 'like_new' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: '5.79', currency: 'EUR' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'DE' } },
    },
  };
  const sizes = [p.size_eu && `EU ${p.size_eu}`, p.size_us && `US ${p.size_us}`, p.size_uk && `UK ${p.size_uk}`, p.cm && `${p.cm} cm`].filter(Boolean).join(' · ');
  const body = `<div class="wrap pdp"><a class="back" href="/${lang}/#shop">← ${t.pdp.back}</a><div class="pgrid">
<div class="gallery"><div class="hero-img">${images[0] ? `<img id="mainImg" src="${esc(images[0])}" alt="${esc(title(p))}">` : ''}</div>
${images.length > 1 ? `<div class="thumbs">${images.map((i, n) => `<button type="button" data-img="${esc(i)}" aria-label="${t.pdp.photo} ${n + 1}"><img src="${esc(i)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</div>
<aside class="panel"><span class="ey">${esc(p.brand)} · ${esc(p.ref)}</span><h1>${esc(p.name)}</h1>${p.color ? `<p class="color">${esc(p.color)}</p>` : ''}
<div class="pricebox"><span class="price">${money(lang, p.price_cents)}</span>${off ? `<span class="rrp">${t.pdp.rrp} ${money(lang, p.rrp_cents)} · −${off} %</span>` : ''}</div>
<p class="fine">${t.pdp.vat}</p>
<div class="stock${isSold ? ' is-sold' : ''}">${isSold ? t.pdp.soldOut : p.stock > 1 ? t.pdp.inStockN(p.stock) : t.pdp.inStock}</div>
<dl class="facts"><div><dt>${t.pdp.size}</dt><dd>${esc(sizes) || '—'}</dd></div><div><dt>${t.pdp.condition}</dt><dd>${CONDITION[lang][p.condition] ?? CONDITION[lang].new}</dd></div>
<div><dt>${t.pdp.ship}</dt><dd>${t.pdp.shipText}</dd></div><div><dt>${t.pdp.returns}</dt><dd>${t.pdp.returnsText}</dd></div></dl>
${isSold ? `<a class="btn full" href="/${lang}/#find">${t.pdp.request}</a>` : `<button class="btn full" type="button" id="buy" data-id="${esc(p.id)}">${t.pdp.buy} · ${money(lang, p.price_cents)}</button><p class="fine" id="buyMsg" role="status"></p>`}
<a class="btn ghost full" href="/${lang}/#find">${t.pdp.otherSize}</a>
${p.description ? `<div class="desc"><h2>${t.pdp.details}</h2><p>${esc(p.description)}</p></div>` : ''}
<p class="fine">${p.gtin ? `EAN ${esc(p.gtin)} · ` : ''}${t.pdp.authentic}</p></aside></div>
${others.length ? `<section class="section"><h2>${t.pdp.more}</h2><div class="grid">${others.map((o) => card(lang, o)).join('')}</div></section>` : ''}</div>`;
  return layout(env, lang, {
    title: `${title(p)}${p.size_eu ? ` EU ${p.size_eu}` : ''} | OFF.`,
    description: `${title(p)}${p.size_eu ? `, EU ${p.size_eu}` : ''}, ${money(lang, p.price_cents)}. ${t.pdp.metaTail}`,
    body,
    path: `/p/${p.slug}`,
    ogImage: images[0],
    jsonld,
  });
}

const page = (env, lang, path, h1, inner) => layout(env, lang, { title: `${h1} | OFF.`, description: h1, body: `<div class="wrap prose">${inner}</div>`, path });

function feed(env, products) {
  const x = (s) => String(s ?? '').replace(/[<>&'"]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[m]);
  const items = products
    .filter((p) => p.status === 'live' && p.stock > 0)
    .map((p) => {
      const i = imgs(p);
      return `<item><g:id>${x(p.ref)}-${x(p.size_eu)}</g:id><g:title>${x(`${title(p)} EU ${p.size_eu}`)}</g:title><g:description>${x(p.description || title(p))}</g:description><g:link>${env.ORIGIN}/de/p/${encodeURIComponent(p.slug)}</g:link>${i[0] ? `<g:image_link>${x(env.ORIGIN + i[0])}</g:image_link>` : ''}${i.slice(1, 10).map((u) => `<g:additional_image_link>${x(env.ORIGIN + u)}</g:additional_image_link>`).join('')}<g:availability>in_stock</g:availability><g:condition>${p.condition === 'like_new' ? 'used' : 'new'}</g:condition><g:price>${(p.price_cents / 100).toFixed(2)} EUR</g:price><g:brand>${x(p.brand)}</g:brand>${p.gtin ? `<g:gtin>${x(p.gtin)}</g:gtin>` : `<g:identifier_exists>no</g:identifier_exists>`}<g:mpn>${x(p.ref)}</g:mpn>${p.color ? `<g:color>${x(p.color)}</g:color>` : ''}${p.size_eu ? `<g:size>${x(p.size_eu)}</g:size><g:size_system>EU</g:size_system>` : ''}<g:shipping><g:country>DE</g:country><g:service>Hermes</g:service><g:price>5.79 EUR</g:price></g:shipping></item>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>OFF. by AlGBr</title><link>${env.ORIGIN}</link><description>Live inventory</description>${items}</channel></rss>`;
}

async function allProducts(env) {
  const { results = [] } = await env.DB.prepare(`SELECT ${PUBLIC_COLS} FROM off_products WHERE status IN ('live', 'sold') ORDER BY created_at DESC`).all();
  return results;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (url.protocol === 'http:' && !url.hostname.includes('localhost')) return Response.redirect(`https://${url.host}${path}${url.search}`, 301);
    if (path.startsWith('/assets/') || path.startsWith('/admin')) return env.ASSETS.fetch(request);
    if (path.startsWith('/media/')) {
      const obj = await env.OFF_MEDIA.getWithMetadata(decodeURIComponent(path.slice(7)), { type: 'arrayBuffer' });
      if (!obj.value) return new Response('Not found', { status: 404 });
      return new Response(obj.value, { headers: { 'content-type': obj.metadata?.type || 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    if (path === '/robots.txt')
      return new Response(env.LAUNCHED === 'true' ? `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${env.ORIGIN}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n', { headers: headers(env, 'text/plain; charset=utf-8') });
    if (path === '/sitemap.xml') {
      const ps = await allProducts(env);
      const urls = LANGS.flatMap((l) => [`/${l}/`, ...ps.map((p) => `/${l}/p/${p.slug}`)]);
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${env.ORIGIN}${u}</loc></url>`).join('')}</urlset>`, { headers: headers(env, 'application/xml; charset=utf-8', 'public, max-age=300') });
    }
    if (path === '/feed.xml') return new Response(feed(env, await allProducts(env)), { headers: headers(env, 'application/xml; charset=utf-8', 'public, max-age=300') });
    if (path === '/' || path === '') {
      const al = (request.headers.get('accept-language') || '').slice(0, 2).toLowerCase();
      return Response.redirect(`${url.origin}/${LANGS.includes(al) ? al : 'de'}/`, 302);
    }
    const m = path.match(/^\/(de|fr|en)(\/.*)?$/);
    if (!m) return new Response('Not found', { status: 404, headers: headers(env) });
    const lang = m[1];
    const rest = (m[2] || '/').replace(/\.html$/, '');
    const t = T[lang];
    const html = (s, status = 200) => new Response(s, { status, headers: headers(env) });
    if (rest === '/') return html(home(env, lang, await allProducts(env)));
    const pm = rest.match(/^\/p\/([a-z0-9-]+)\/?$/);
    if (pm) {
      const ps = await allProducts(env);
      const p = ps.find((x) => x.slug === pm[1]);
      if (!p) return html(page(env, lang, rest, t.notFound, `<h1>${t.notFound}</h1><p><a href="/${lang}/#shop">${t.pdp.back}</a></p>`), 404);
      const others = ps.filter((o) => o.id !== p.id && o.status === 'live' && o.stock > 0).slice(0, 3);
      return html(product(env, lang, p, others));
    }
    const key = rest.slice(1);
    if (LEGAL_PAGES.includes(key)) return html(page(env, lang, rest, t.legal[key], LEGAL[lang][key].replace(/href="([a-z]+)\.html"/g, `href="/${lang}/$1"`)));
    if (key === 'danke') return html(page(env, lang, rest, t.thanks.title, `<h1>${t.thanks.title}</h1><p>${t.thanks.text}</p><p class="ordernum" id="orderNum" data-wait="${esc(t.thanks.wait)}"></p><p><a class="btn" href="/${lang}/">${t.thanks.back}</a></p>`));
    if (key === 'bestellung')
      return html(page(env, lang, rest, t.track.title, `<h1>${t.track.title}</h1><p>${t.track.text}</p><form class="form" id="trackForm"><label class="field"><span>${t.track.number}</span><input name="order" required placeholder="OF-261007-AB12"></label><label class="field"><span>${t.find.email}</span><input name="email" type="email" required></label><button class="btn full" type="submit">${t.track.submit}</button><div class="full" id="trackOut" role="status"></div></form>`));
    return html(page(env, lang, rest, t.notFound, `<h1>${t.notFound}</h1><p><a href="/${lang}/">${t.thanks.back}</a></p>`), 404);
  },
};
