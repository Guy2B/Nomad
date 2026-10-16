/**
 * Premium storefront templates: page layout (header, NEXT banner, footer),
 * product cards, editorial home page and benefit-led product page.
 * All copy comes from shops/<shop>/site.json → ui.<lang> (and optional
 * products.json → rich.<lang>), so every brand shares one design system.
 */
export function createTemplates(ctx) {
  const { SITE, ACTIVE, GUIDES, STR, NEXT_AD, FAMILY, API, HAS_THEME, ASSET_V, shopDataTag, BASE, pub, esc, money, fill, ldJson, write, up } = ctx;
  const byId = new Map(ACTIVE.map((p) => [p.id, p]));
  const U = (lang) => SITE.ui[lang];
  const lines = (arr) => (Array.isArray(arr) ? arr.map(esc).join('<br>') : esc(arr));
  const img = (r, src) => `${r}assets/products/${src}`;
  // Strike-through prices only when a real former price exists (PAngV § 11): off unless enabled.
  const was = (p, lang) => (SITE.showCompare && p.compare ? ` <s>${money(p.compare, lang)}</s>` : '');
  const short = (p, lang) => p.text[lang].short || p.text[lang].tagline;

  const nsxt = (cls = '') => `<span class="nsxt ${cls}" role="img" aria-label="NEXT">n<b>Σ</b>xt</span>`;

  function nextBanner(lang, r) {
    const n = NEXT_AD?.[lang];
    if (!n) return '';
    const href = `${NEXT_AD.url}?ref=${encodeURIComponent(SITE.id)}`;
    return `<aside class="next-ad" aria-label="NEXT by AlGBr">
  <div class="wrap next-ad-row">
    ${nsxt('nsxt-lg')}
    <div class="next-copy"><p class="next-title">${esc(n.title)} <small>by AlGBr</small></p><p class="next-text">${esc(n.text)}</p></div>
    <a class="btn next-btn" href="${href}" target="_blank" rel="noopener">${esc(n.cta)} ↗</a>
  </div>
</aside>`;
  }

  /** « La famille AlGBr »: 2–3 sister shops, premium cards, on home, product and guide pages only. */
  function familyBlock(lang, r) {
    const x = FAMILY?.texts?.[lang];
    if (!x) return '';
    const cards = FAMILY.shops
      .map((f) => {
        const l = f.languages.includes(lang) ? lang : f.defaultLang;
        const href = `${f.url}/${l}/?ref=${encodeURIComponent(SITE.id)}`;
        return `<a class="fam-card fam-${esc(f.folder)}" href="${href}" target="_blank" rel="noopener">
      <span class="fam-img"><img src="${r}assets/family/${f.img}" alt="" loading="lazy" width="220" height="220"></span>
      <span class="fam-copy">
        <span class="fam-label">${esc(f.label[lang] ?? f.label.en)}</span>
        <span class="fam-brand">${esc(f.brand)}<small>by AlGBr</small></span>
        <span class="fam-tagline">${esc(f.tagline[l] ?? f.tagline.en)}</span>
        <span class="fam-cta">${esc(x.cta)} <span aria-hidden="true">↗</span></span>
      </span>
    </a>`;
      })
      .join('');
    return `<aside class="family" aria-label="${esc(x.eyebrow)}">
  <div class="wrap">
    <header class="family-head"><p class="eyebrow">${esc(x.eyebrow)}</p><h2>${esc(x.title)}</h2></header>
    <div class="family-grid fam-n${FAMILY.shops.length}">${cards}</div>
  </div>
</aside>`;
  }

  function layout({ lang, depth, title, description, body, page, alternates, jsonLd = [], image, noindex }) {
    const t = STR[lang];
    const u = U(lang);
    const r = up(depth);
    const L = `${r}${lang}/`;
    const canonical = pub(`${lang}/${alternates}`);
    const langLinks = SITE.languages
      .map((l) => `<a href="${r}${l}/${alternates}" ${l === lang ? 'aria-current="true"' : ''} hreflang="${l}">${l.toUpperCase()}</a>`)
      .join('');
    const ogImage = image || (ACTIVE[0] ? `${BASE}/assets/products/${ACTIVE[0].images[0]}` : '');
    const guideHref = GUIDES.length ? `${L}ratgeber/${GUIDES[0].slug}.html` : `${L}index.html#faq`;
    const href = (h) => (/^(https?:|mailto:)/.test(h) ? h : h.startsWith('#') ? `${L}index.html${h}` : `${L}${h}`);
    const cols = u.footer.cols
      .map((c) => `<nav class="foot-col" aria-label="${esc(c.title)}"><p>${esc(c.title)}</p>${c.links.map(([label, h]) => `<a href="${href(h === 'GUIDE' ? guideHref.replace(L, '') : h)}">${esc(label)}</a>`).join('')}</nav>`)
      .join('');
    return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${canonical}">
${SITE.languages.map((l) => `<link rel="alternate" hreflang="${l}" href="${pub(`${l}/${alternates}`)}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${pub(`${SITE.defaultLang}/${alternates}`)}">
<meta property="og:type" content="${page === 'product' ? 'product' : 'website'}">
<meta property="og:site_name" content="${esc(SITE.brand)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${{ de: 'de_DE', fr: 'fr_FR', en: 'en_GB' }[lang]}">
${ogImage ? `<meta property="og:image" content="${ogImage}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<meta name="theme-color" content="${SITE.themeColor || '#16181d'}">
<link rel="icon" href="${r}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${r}assets/style.css?v=${ASSET_V}">
${HAS_THEME ? `<link rel="stylesheet" href="${r}assets/theme.css?v=${ASSET_V}">` : ''}
${jsonLd.map(ldJson).join('\n')}
</head>
<body data-page="${page}" data-lang="${lang}" data-root="${r}" data-store="${SITE.id}" data-api="${API}">
<a class="skip" href="#main">${lang === 'de' ? 'Zum Inhalt' : lang === 'fr' ? 'Aller au contenu' : 'Skip to content'}</a>
<p class="promo">${esc(u.promo)}</p>
<header class="top">
  <div class="wrap top-row">
    <a class="brand" href="${L}index.html">${esc(SITE.brand)}${SITE.byline ? ` <small class="byline">${esc(SITE.byline)}</small>` : ''}</a>
    <nav class="menu" aria-label="${lang === 'de' ? 'Menü' : 'Menu'}">
      <a href="${L}index.html#produkte">${esc(u.nav.shop)}</a>
      <a href="${guideHref}">${esc(u.nav.guide)}</a>
      <a href="${L}index.html#warum">${esc(u.nav.why)}</a>
      <a href="${L}bestellung.html">${esc(u.nav.track)}</a>
    </nav>
    <div class="top-actions">
      ${NEXT_AD ? `<a class="next-pill" href="${NEXT_AD.url}?ref=${encodeURIComponent(SITE.id)}" target="_blank" rel="noopener" title="NEXT by AlGBr">${nsxt()}</a>` : ''}
      <nav class="langs" aria-label="${lang === 'de' ? 'Sprache' : lang === 'fr' ? 'Langue' : 'Language'}">${langLinks}</nav>
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
${body.includes('id="shop-data"') ? '' : shopDataTag(lang)}
${['home', 'product', 'guide'].includes(page) ? familyBlock(lang, r) : ''}
${nextBanner(lang, r)}
<footer class="foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <p class="brand">${esc(SITE.brand)}${SITE.byline ? ` <small class="byline">${esc(SITE.byline)}</small>` : ''}</p>
      <p class="muted">${esc(u.footer.tagline)}</p>
    </div>
    ${cols}
  </div>
  <div class="wrap foot-bottom">
    <span>© ${new Date().getFullYear()} ${esc(SITE.brand)} · ${esc(u.footer.rights)}</span>
    <a class="by-algbr" href="${SITE.byAlgbr}" target="_blank" rel="noopener">by <img src="${r}assets/algbr.svg" alt="" width="22" height="22"> <b>Al.<i>G.B.</i><u>r.</u></b></a>
  </div>
</footer>
<script src="${r}assets/shop.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
  }

  function card(p, lang, L, r = '../') {
    const t = STR[lang];
    const x = p.text[lang];
    return `<article class="card">
  <a class="card-img" href="${L}produkt/${p.id}.html">${x.badge ? `<span class="badge">${esc(x.badge)}</span>` : ''}<img src="${img(r, p.images[0])}" alt="${esc(p.seo?.[lang]?.title || p.name)}" loading="lazy" width="600" height="600"></a>
  <div class="card-body">
    <h3><a href="${L}produkt/${p.id}.html">${esc(p.name)}</a></h3>
    <p class="card-line">${esc(short(p, lang))}</p>
    <div class="card-foot"><p class="price"><b>${money(p.price, lang)}</b>${was(p, lang)}</p>
    <button class="btn btn-dark btn-sm" type="button" data-add="${p.id}" aria-label="${esc(t.products.add)}: ${esc(p.name)}">${esc(t.products.add)}</button></div>
  </div>
</article>`;
  }

  function home(lang) {
    const u = U(lang);
    const t = STR[lang];
    const seo = SITE.seo?.[lang];
    const fp = byId.get(u.featured.id) ?? ACTIVE[0];
    const heroImgs = [fp, ...ACTIVE.filter((p) => p !== fp)].slice(0, 3);
    const guide = GUIDES[0];
    const groups = u.collection.groups
      .map((g) => ({ ...g, items: g.ids.map((id) => byId.get(id)).filter(Boolean) }))
      .filter((g) => g.items.length);
    const body = `
<section class="hero-x">
  <div class="wrap hero-x-grid">
    <div class="hero-x-copy">
      <p class="eyebrow">${esc(u.hero.label)}</p>
      <h1>${lines(u.hero.title)}</h1>
      ${u.hero.signature ? `<p class="signature">${esc(u.hero.signature)}</p>` : ''}
      <p class="lead">${esc(u.hero.text)}</p>
      <div class="actions">
        <a class="btn btn-dark btn-lg" href="#produkte">${esc(u.hero.cta)}</a>
        <a class="btn btn-line btn-lg" href="${u.hero.cta2Href === 'GUIDE' && guide ? `ratgeber/${guide.slug}.html` : '#anlaesse'}">${esc(u.hero.cta2)}</a>
      </div>
      <p class="micro">${esc(u.hero.micro)}</p>
    </div>
    <div class="hero-x-art" aria-hidden="true">
      <img class="hx-main" src="${img('../', heroImgs[0].images[0])}" alt="" width="640" height="640">
      ${heroImgs[1] ? `<img class="hx-a" src="${img('../', heroImgs[1].images[0])}" alt="" width="260" height="260">` : ''}
      ${heroImgs[2] ? `<img class="hx-b" src="${img('../', heroImgs[2].images[0])}" alt="" width="220" height="220">` : ''}
    </div>
  </div>
</section>
<section class="trust-x" aria-label="${esc(u.trustLabel || '')}">
  <div class="wrap trust-x-grid">${u.trust.map((x) => `<div><p class="tx-t">${esc(x.t)}</p><p class="tx-s">${esc(x.s)}</p></div>`).join('')}</div>
</section>
<section class="section featured">
  <div class="wrap featured-grid">
    <div class="featured-copy">
      <p class="eyebrow">${esc(u.featured.label)}</p>
      <h2>${esc(fp.name)}</h2>
      <p class="lead">${esc(u.featured.pitch)}</p>
      <p>${esc(u.featured.sub)}</p>
      <ul class="benefits-3">${u.featured.benefits.map((b) => `<li><b>${esc(b.t)}</b><span>${esc(b.s)}</span></li>`).join('')}</ul>
      <p class="price big"><b>${money(fp.price, lang)}</b>${was(fp, lang)}</p>
      <div class="actions"><a class="btn btn-dark btn-lg" href="produkt/${fp.id}.html">${esc(u.featured.cta)}</a><a class="link-arrow" href="#produkte">${esc(u.featured.link)} →</a></div>
    </div>
    <a class="featured-img" href="produkt/${fp.id}.html"><img src="${img('../', fp.images[1] ?? fp.images[0])}" alt="${esc(fp.seo?.[lang]?.title || fp.name)}" width="720" height="720" loading="lazy"></a>
  </div>
</section>
<section class="section soft" id="produkte">
  <div class="wrap">
    <header class="head-x"><p class="eyebrow">${esc(u.collection.label)}</p><h2>${lines(u.collection.title)}</h2><p class="muted">${esc(u.collection.text)}</p></header>
    ${groups.map((g) => `<div class="group" id="g-${esc(g.key || '')}"><h3 class="group-title">${esc(g.title)}</h3><div class="grid">${g.items.map((p) => card(p, lang, '')).join('')}</div></div>`).join('')}
  </div>
</section>
<section class="section" id="anlaesse">
  <div class="wrap">
    <header class="head-x"><h2>${lines(u.usages.title)}</h2></header>
    <div class="usage-grid">${u.usages.cards.map((c, i) => `<a class="usage${c.img && byId.get(c.img) ? ' has-img' : ''}" href="${c.href === 'GUIDE' && guide ? `ratgeber/${guide.slug}.html` : c.href}">${c.img && byId.get(c.img) ? `<img src="${img('../', byId.get(c.img).images[Math.min(1, byId.get(c.img).images.length - 1)])}" alt="" loading="lazy" width="600" height="420">` : ''}<span class="usage-n">0${i + 1}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p><span class="link-arrow">${esc(c.cta)} →</span></a>`).join('')}</div>
  </div>
</section>
<section class="section ink" id="warum">
  <div class="wrap why-grid">
    <div><p class="eyebrow">${esc(u.why.label)}</p><h2>${lines(u.why.title)}</h2>${u.why.text.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <ol class="principles">${u.why.principles.map((x) => `<li><b>${esc(x.t)}</b><span>${esc(x.s)}</span></li>`).join('')}</ol>
  </div>
</section>
<section class="section" id="so-gehts">
  <div class="wrap">
    <header class="head-x"><h2>${esc(u.how.title)}</h2></header>
    <ol class="steps-x">${u.how.steps.map((x, i) => `<li><span>0${i + 1}</span><h3>${esc(x.t)}</h3><p>${esc(x.s)}</p></li>`).join('')}</ol>
    ${guide ? `<p class="center help"><a class="link-arrow" href="ratgeber/${guide.slug}.html">${esc(u.how.help)} →</a></p>` : ''}
  </div>
</section>
${
  guide
    ? `<section class="section soft">
  <div class="wrap">
    <header class="head-x"><h2>${esc(u.guides.title)}</h2></header>
    <div class="guides-grid">
      <a class="guide-main" href="ratgeber/${guide.slug}.html"><p class="eyebrow">${esc(t.nav.guide)}</p><h3>${esc(guide.text[lang].title)}</h3><p>${esc(guide.text[lang].lead)}</p><span class="link-arrow">${esc(u.guides.read)} →</span></a>
      ${u.guides.soon.map((s) => `<div class="guide-soon"><p class="eyebrow">${esc(u.guides.soonLabel)}</p><h3>${esc(s)}</h3></div>`).join('')}
    </div>
  </div>
</section>`
    : ''
}
<section class="section" id="faq">
  <div class="wrap narrow">
    <header class="head-x"><h2>${esc(u.faq.title)}</h2></header>
    ${u.faq.items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(fill(a))}</p></details>`).join('')}
  </div>
</section>
<section class="final-cta">
  <div class="wrap center">
    <p class="eyebrow">${esc(u.final.label)}</p>
    <h2>${lines(u.final.title)}</h2>
    <p>${esc(u.final.text)}</p>
    <div class="actions center-row"><a class="btn btn-light btn-lg" href="#produkte">${esc(u.final.cta)}</a>${guide ? `<a class="btn btn-ghost btn-lg" href="ratgeber/${guide.slug}.html">${esc(u.final.cta2)}</a>` : ''}</div>
  </div>
</section>`;
    const jsonLd = [
      { '@context': 'https://schema.org', '@type': 'OnlineStore', name: SITE.brand, url: `${BASE}/`, description: SITE.tagline[lang], logo: `${BASE}/assets/favicon.svg` },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: u.faq.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: fill(a) } })) },
    ];
    write(
      `${lang}/index.html`,
      layout({ lang, depth: 1, title: seo?.title || `${SITE.brand} · ${u.hero.title}`, description: seo?.description || SITE.tagline[lang], body, page: 'home', alternates: 'index.html', jsonLd }),
    );
  }

  function productPage(p, lang) {
    const t = STR[lang];
    const u = U(lang);
    const up_ = u.product;
    const x = p.text[lang];
    const rich = p.rich?.[lang] ?? {};
    const seo = p.seo?.[lang];
    const imgs = p.images.map((src) => img('../../', src));
    const parts = Array.isArray(p.components) ? p.components : null;
    const cross = (p.upsells ?? []).map((id) => byId.get(id)).filter(Boolean).slice(0, 3);
    const benefits = rich.benefits ?? x.bullets;
    const faq = [...(rich.faq ?? []), ...up_.faqDefault];
    const story = rich.story ?? [];
    const body = `
<section class="section product-x">
  <div class="wrap product-x-grid">
    <div class="gallery">
      <img class="main-img" data-main src="${imgs[0]}" alt="${esc(seo?.title || p.name)}" width="800" height="800">
      <div class="thumbs">${imgs.map((src, i) => `<button type="button" data-thumb="${src}" aria-label="${esc(p.name)} ${i + 1}"><img src="${src}" alt="" width="96" height="96" loading="lazy"></button>`).join('')}</div>
      <p class="muted small">${esc(t.product.photoNote)}</p>
    </div>
    <div class="buy">
      <p class="crumb"><a href="../index.html#produkte">${esc(up_.crumb)}</a>${x.badge ? ` / ${esc(x.badge)}` : ''}</p>
      <h1>${esc(p.name)}</h1>
      <p class="lead">${esc(x.tagline)}</p>
      <p class="price big"><b>${money(p.price, lang)}</b>${was(p, lang)}</p>
      <p>${esc(rich.lead || x.description)}</p>
      <ul class="bullets">${benefits.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <button class="btn btn-dark btn-lg btn-block" type="button" data-add="${p.id}" data-go-cart>${esc(t.products.add)} · ${money(p.price, lang)}</button>
      ${x.caution ? `<p class="muted small center">${esc(x.caution)}</p>` : ''}
      <ul class="reassure-x">${up_.trust.map((s) => `<li>${esc(fill(s, p.deliveryDays || SITE.shipping.deliveryDays))}</li>`).join('')}</ul>
      ${parts && !p.single ? `<h2 class="small-title">${esc(t.product.includes)}</h2><ul class="includes">${parts.map((c) => `<li><b>${c.qty} ×</b> ${esc(c.label?.[lang] || c.name)}</li>`).join('')}</ul>` : ''}
    </div>
  </div>
</section>
${story
  .map(
    (s, i) => `<section class="section story ${i % 2 ? 'soft' : ''}"><div class="wrap story-grid ${i % 2 ? 'rev' : ''}">
  <div><h2>${esc(s.title)}</h2><p class="lead">${esc(s.text)}</p></div>
  <img src="${imgs[(i + 1) % imgs.length]}" alt="" width="640" height="640" loading="lazy">
</div></section>`,
  )
  .join('')}
${
  rich.ideal
    ? `<section class="section"><div class="wrap"><header class="head-x"><h2>${esc(up_.idealTitle)}</h2></header><div class="ideal-grid">${rich.ideal.map((c) => `<div class="ideal"><h3>${esc(c.t)}</h3><p>${esc(c.s)}</p></div>`).join('')}</div></div></section>`
    : ''
}
<section class="section soft">
  <div class="wrap two-col">
    <div><h2 class="small-title">${esc(up_.detailsTitle)}</h2><ul class="details">${(rich.details ?? x.bullets).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>${rich.details ? '' : `<p class="muted">${esc(x.description)}</p>`}</div>
    <div class="why-box"><p class="eyebrow">${esc(up_.whyTitle)}</p><p>${esc(rich.why || up_.whyDefault)}</p></div>
  </div>
</section>
${
  cross.length
    ? `<section class="section"><div class="wrap"><header class="head-x head-row"><h2>${esc(up_.crossTitle)}</h2>${cross.length > 1 ? `<button class="btn btn-line" type="button" data-add-all="${cross.map((c) => c.id).join(',')}">${esc(up_.addAll)}</button>` : ''}</header><div class="grid">${cross.map((q) => card(q, lang, '../', '../../')).join('')}</div></div></section>`
    : ''
}
<section class="section" id="reviews" data-reviews="${p.id}"><div class="wrap narrow">
  <header class="head-x head-row"><h2>${esc(t.reviews.title)}</h2><a class="btn btn-line" href="../bewertung.html?p=${p.id}">${esc(t.reviews.write)}</a></header>
  <div class="reviews-summary" data-reviews-summary><p class="muted">${esc(t.reviews.none)}</p></div>
  <div class="reviews-list" data-reviews-list></div>
  <p class="muted small">${esc(t.reviews.note)}</p>
</div></section>
<section class="section soft"><div class="wrap narrow"><header class="head-x"><h2>${esc(up_.faqTitle)}</h2></header>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(fill(a, p.deliveryDays || SITE.shipping.deliveryDays))}</p></details>`).join('')}</div></section>
<section class="final-cta small-cta"><div class="wrap center">
  <h2>${esc(rich.final || up_.finalTitle)}</h2>
  <p class="price big"><b>${esc(p.name)} · ${money(p.price, lang)}</b></p>
  <button class="btn btn-light btn-lg" type="button" data-add="${p.id}" data-go-cart>${esc(t.products.add)}</button>
  <p class="micro">${esc(up_.finalMicro)}</p>
</div></section>
<div class="buy-bar" data-buy-bar><div class="wrap buy-bar-row"><span><b>${esc(p.name)}</b> · ${money(p.price, lang)}</span><button class="btn btn-dark" type="button" data-add="${p.id}" data-go-cart>${esc(t.products.add)}</button></div></div>`;
    const url = pub(`${lang}/produkt/${p.id}.html`);
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
          { '@type': 'ListItem', position: 1, name: SITE.brand, item: pub(`${lang}/index.html`) },
          { '@type': 'ListItem', position: 2, name: p.name, item: url },
        ],
      },
    ];
    write(
      `${lang}/produkt/${p.id}.html`,
      layout({
        lang,
        depth: 2,
        title: seo ? `${seo.title} | ${SITE.brand}` : `${p.name} | ${SITE.brand}`,
        description: seo?.description || x.tagline,
        body,
        page: 'product',
        alternates: `produkt/${p.id}.html`,
        jsonLd,
        image: `${BASE}/assets/products/${p.images[0]}`,
      }),
    );
  }

  return { layout, card, home, productPage };
}
