// Algebra · client script. No dependencies. Progressive enhancement: pages work without it,
// except the bag and checkout, which need JavaScript (as with any hosted checkout).
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const body = document.body;
const LANG = body.dataset.lang || 'de';
const ROOT = body.dataset.root || '/';
const API = (body.dataset.api || '/api').replace(/\/$/, '');
const apiUrl = (p) => (API.startsWith('http') ? API : new URL(ROOT, location.href).pathname.replace(/\/$/, '') + API) + p;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: keep working in memory */ } },
};
const fmt = (n) => new Intl.NumberFormat(LANG === 'en' ? 'en-IE' : LANG === 'fr' ? 'fr-FR' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(n);

// ------------------------------------------------------------ consent + analytics
// Events are only recorded after consent. The provider is not chosen yet (NEEDS CREDENTIALS):
// window.dataLayer receives GA4-style events, a provider tag can be loaded in loadAnalytics().
let consent = store.get('alg_consent', null);
function loadAnalytics() {
  window.dataLayer = window.dataLayer || [];
  // Provider snippet goes here after the decision (docs/ANALYTICS.md). Nothing is loaded today.
}
function track(event, params = {}) {
  if (!consent || !consent.analytics) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}
function showConsent(force = false) {
  const box = $('#consent');
  if (!box) return;
  if (consent && !force) return;
  box.hidden = false;
}
$$('[data-consent]').forEach((b) =>
  b.addEventListener('click', () => {
    consent = { analytics: b.dataset.consent === 'analytics', at: new Date().toISOString() };
    store.set('alg_consent', consent);
    $('#consent').hidden = true;
    if (consent.analytics) loadAnalytics();
  }),
);
$$('[data-consent-open]').forEach((b) => b.addEventListener('click', () => showConsent(true)));
if (consent && consent.analytics) loadAnalytics();
showConsent();

// ------------------------------------------------------------ navigation
const menuBtn = $('.hdr__menu');
const nav = $('#nav');
menuBtn?.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  body.style.overflow = open ? 'hidden' : '';
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (nav?.classList.contains('is-open')) menuBtn.click();
  if (!$('#bag').hidden) closeBag();
});
$$('[data-track]').forEach((a) => a.addEventListener('click', () => track(a.dataset.track, { item_id: a.dataset.id })));

// ------------------------------------------------------------ catalogue
let CAT = null;
async function catalog() {
  if (CAT) return CAT;
  const r = await fetch(`${ROOT}assets/catalog.${LANG}.json`);
  CAT = await r.json();
  return CAT;
}
const T = () => CAT.t;

// ------------------------------------------------------------ bag
let bag = store.get('alg_bag', []);
let country = store.get('alg_country', 'DE');
const saveBag = () => { store.set('alg_bag', bag); updateCount(); };
function updateCount() {
  const n = bag.reduce((s, i) => s + i.qty, 0);
  $$('.bag-count').forEach((el) => (el.textContent = n));
}
updateCount();

function totals() {
  const sub = bag.reduce((s, i) => s + CAT.products[i.id].p * i.qty, 0);
  const zone = country === 'DE' ? CAT.shipping.DE : CAT.shipping.EU;
  const ship = sub === 0 || sub >= zone.freeFrom ? 0 : zone.fee;
  return { sub, ship, total: sub + ship, zone };
}

function itemImg(i) {
  const p = CAT.products[i.id];
  return `${ROOT}assets/photos/${p.k}-${i.color}-${p.gfx ? 'back' : 'front'}-400.webp`;
}

function renderBag() {
  const t = T().cart;
  $$('[data-bag-body]').forEach((el) => {
    if (!bag.length) {
      el.innerHTML = `<p>${t.empty}</p><p><a class="btn btn--line" href="${ROOT}${LANG}/shop/">${t.continue}</a></p>`;
      return;
    }
    const { sub, ship, total, zone } = totals();
    const cats = new Set(bag.map((i) => CAT.products[i.id].c));
    const upCat = [...cats].map((c) => CAT.upsell[c]).find((c) => c && !cats.has(c));
    const gender = CAT.products[bag[0].id].g;
    const up = upCat && Object.entries(CAT.products).find(([, p]) => p.c === upCat && p.s && (p.g === gender || p.g === 'unisex' || gender === 'unisex'));
    el.innerHTML = `
      <ul class="bag__list">${bag
        .map(
          (i, idx) => `<li class="bag__item"><img src="${itemImg(i)}" alt="" width="92" height="115" loading="lazy">
          <div><h3><a href="${ROOT}${CAT.products[i.id].u.slice(1)}">${CAT.products[i.id].n}</a></h3>
          <p>${CAT.colors[i.color]} · ${i.size}${i.cut ? ` · ${CAT.cuts[i.cut]}` : ''}</p><p>${fmt(CAT.products[i.id].p)}</p>
          <div class="bag__row"><div class="qty" role="group" aria-label="${t.qty}"><button type="button" data-q="-1" data-i="${idx}" aria-label="−">−</button><output aria-live="polite">${i.qty}</output><button type="button" data-q="1" data-i="${idx}" aria-label="+">+</button></div>
          <button type="button" class="linkish small" data-rm="${idx}">${t.remove}</button></div></div></li>`,
        )
        .join('')}</ul>
      <div class="bag__sum">
        <div><label for="bag-country">${t.country}</label><select id="bag-country" data-country>${CAT.shipping.countries.map((c) => `<option${c === country ? ' selected' : ''}>${c}</option>`).join('')}</select></div>
        <div><span>${t.subtotal}</span><span>${fmt(sub)}</span></div>
        <div><span>${t.shipping}</span><span>${ship ? fmt(ship) : t.free}</span></div>
        ${ship ? `<p class="small muted">${t.freeHint.replace('{n}', fmt(zone.freeFrom - sub))}</p>` : ''}
        <div class="total"><span>${t.total}</span><span>${fmt(total)}</span></div>
      </div>
      ${up ? `<p class="bag__up">${t.upsell}: <a href="${ROOT}${up[1].u.slice(1)}">${up[1].n}</a> · ${fmt(up[1].p)}</p>` : ''}
      <div class="bag__actions"><button type="button" class="btn btn--solid btn--block" data-checkout>${t.checkout}</button>
      <p class="small muted">${t.legal}</p><p class="small form-err" data-checkout-err hidden role="alert"></p></div>`;
  });
}

document.addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]');
  const rm = e.target.closest('[data-rm]');
  if (q) {
    const i = bag[+q.dataset.i];
    i.qty = Math.min(10, Math.max(1, i.qty + +q.dataset.q));
    saveBag(); renderBag();
  } else if (rm) {
    const [removed] = bag.splice(+rm.dataset.rm, 1);
    track('remove_from_cart', { items: [{ item_id: removed.sku, quantity: removed.qty }] });
    saveBag(); renderBag();
  } else if (e.target.closest('[data-checkout]')) {
    checkout(e.target.closest('[data-checkout]'));
  } else if (e.target.closest('[data-open-bag]')) {
    e.preventDefault(); openBag();
  } else if (e.target.closest('[data-close-bag]')) {
    closeBag();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-country]')) { country = e.target.value; store.set('alg_country', country); renderBag(); }
});

let lastFocus = null;
async function openBag() {
  await catalog();
  if ($('[data-bag-page]')) { renderBag(); return; }
  renderBag();
  lastFocus = document.activeElement;
  $('#bag').hidden = false;
  body.style.overflow = 'hidden';
  $('#bag .drawer__x').focus();
}
function closeBag() {
  $('#bag').hidden = true;
  body.style.overflow = '';
  lastFocus?.focus();
}
// keep focus inside the drawer
$('#bag')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const f = $$('#bag a, #bag button, #bag select').filter((x) => !x.disabled);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});
if ($('[data-bag-page]')) catalog().then(renderBag);

async function checkout(btn) {
  const err = $('[data-checkout-err]', btn.parentElement);
  btn.disabled = true;
  err.hidden = true;
  const { total } = totals();
  track('begin_checkout', { currency: 'EUR', value: total, items: bag.map((i) => ({ item_id: i.sku, quantity: i.qty })) });
  try {
    const r = await fetch(apiUrl('/checkout'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lang: LANG, country, items: bag.map((i) => ({ sku: i.sku, qty: i.qty })) }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.url) { location.href = j.url; return; }
    err.textContent = r.status === 503 || r.status === 404 ? T().cart.notConnected : j.message || T().cart.error;
  } catch {
    err.textContent = T().cart.notConnected;
  }
  err.hidden = false;
  btn.disabled = false;
}

// ------------------------------------------------------------ product cards: colour swatches
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-swatch]');
  if (!b) return;
  const card = b.closest('.card');
  const c = b.dataset.swatch;
  $$('.card__set', card).forEach((s) => (s.hidden = s.dataset.color !== c));
  $$('[data-swatch]', card).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const a = $('.card__a', card);
  a.href = `${a.dataset.href}?color=${encodeURIComponent(c)}`;
});

// ------------------------------------------------------------ product page
const pdp = $('[data-product]');
if (pdp) {
  const variants = JSON.parse($('[data-variants]').textContent);
  const form = $('[data-buy]');
  const id = pdp.dataset.product;
  track('view_item', { currency: 'EUR', value: +pdp.dataset.price, items: [{ item_id: id, item_name: pdp.dataset.name, item_category: pdp.dataset.cat }] });
  const val = (n) => form.querySelector(`[name="${n}"]:checked`)?.value || '';
  const sync = () => {
    const cut = val('cut');
    const color = val('color');
    $$('[data-sizes] .pill', form).forEach((l) => {
      const show = !cut || l.dataset.cut === cut;
      l.hidden = !show;
      const input = $('input', l);
      const v = variants.find((x) => x.cut === cut && x.color === color && x.size === input.value);
      input.disabled = !show || !v;
      if (input.disabled) input.checked = false;
    });
    $$('[data-gallery] .gal__set').forEach((s) => (s.hidden = s.dataset.color !== color));
    const lbl = form.querySelector('[name="color"]:checked')?.dataset.label;
    if (lbl) $('[data-color-name]').textContent = lbl;
  };
  // colour chosen on a product card (?color=…) or a shared link
  const want = new URLSearchParams(location.search).get('color');
  const pre = want && form.querySelector(`[name="color"][value="${CSS.escape(want)}"]`);
  if (pre) pre.checked = true;
  form.addEventListener('change', (e) => {
    if (e.target.name === 'color') track('color_selected', { item_id: id, color: e.target.value });
    if (e.target.name === 'size') { track('size_selected', { item_id: id, size: e.target.value }); $('[data-err]', form).hidden = true; }
    sync();
  });
  sync();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = variants.find((x) => x.cut === val('cut') && x.color === val('color') && x.size === val('size'));
    if (!v) { $('[data-err]', form).hidden = false; $('[data-sizes] input:not(:disabled)', form)?.focus(); return; }
    if (!v.ok) return;
    const ex = bag.find((i) => i.sku === v.sku);
    if (ex) ex.qty = Math.min(10, ex.qty + 1);
    else bag.push({ sku: v.sku, id, color: v.color, size: v.size, cut: v.cut, qty: 1 });
    saveBag();
    track('add_to_cart', { currency: 'EUR', value: +pdp.dataset.price, items: [{ item_id: v.sku, item_name: pdp.dataset.name, quantity: 1 }] });
    await openBag();
  });
}

// ------------------------------------------------------------ collection filters
const filters = $('[data-filters]');
if (filters) {
  const grid = $('[data-grid]');
  const cards = $$('.card', grid);
  const apply = () => {
    const fd = new FormData(filters);
    const cs = fd.getAll('color');
    const ss = fd.getAll('size');
    let n = 0;
    cards.forEach((c) => {
      const ok = (!cs.length || cs.some((x) => c.dataset.colors.split(' ').includes(x))) && (!ss.length || ss.some((x) => c.dataset.sizes.split(' ').includes(x)));
      c.hidden = !ok;
      n += ok;
    });
    const sort = fd.get('sort');
    const sorted = [...cards].sort((a, b) => (sort === 'asc' ? a.dataset.price - b.dataset.price : sort === 'desc' ? b.dataset.price - a.dataset.price : 0));
    if (sort) sorted.forEach((c) => grid.append(c));
    else cards.forEach((c) => grid.append(c));
    const cnt = $('[data-count]');
    cnt.textContent = cnt.dataset.template.replace('{n}', n);
    $('[data-empty]').hidden = n > 0;
  };
  filters.addEventListener('change', apply);
  filters.addEventListener('reset', () => setTimeout(apply));
}

// ------------------------------------------------------------ search
const sform = $('[data-search]');
if (sform) {
  const input = $('#q');
  const grid = $('[data-search-grid]');
  const params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  const run = async () => {
    const c = await catalog();
    const words = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let n = 0;
    $$('.card', grid).forEach((card) => {
      const id = $('[data-id]', card)?.dataset.id;
      const ok = !words.length || words.every((w) => c.products[id].q.includes(w) || c.products[id].n.toLowerCase().includes(w));
      card.hidden = !ok;
      n += ok;
    });
    $('[data-search-count]').textContent = c.t.count.replace('{n}', n);
    $('[data-empty]').hidden = n > 0;
  };
  input.addEventListener('input', run);
  sform.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  run();
}

// ------------------------------------------------------------ forms (newsletter, contact, tracking)
async function postJson(path, data) {
  const r = await fetch(apiUrl(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json().catch(() => ({}));
}
function bindForm(sel, path, extra = {}, onOk) {
  const f = $(sel);
  if (!f) return;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = $('[data-ok]', f) || $('[data-ok]');
    const err = $('[data-err]', f) || $('[data-err]');
    ok && (ok.hidden = true); err && (err.hidden = true);
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const data = { ...Object.fromEntries(new FormData(f)), lang: LANG, ...extra };
    const btn = $('button[type="submit"]', f);
    btn.disabled = true;
    try { const j = await postJson(path, data); ok && (ok.hidden = false); onOk?.(j); if (path === '/newsletter') track('newsletter_signup'); }
    catch { err && (err.hidden = false); }
    btn.disabled = false;
  });
}
bindForm('[data-newsletter]', '/newsletter');
bindForm('[data-contact]', '/contact');
bindForm('[data-circle]', '/circle', {}, () => { $('[data-circle]').reset(); track('circle_signup'); });
if ($('[data-circle-expired]') && new URLSearchParams(location.search).get('link') === 'expired') $('[data-circle-expired]').hidden = false;

// A Circle member page: the token sits in the URL fragment (#t=…), so it never reaches a server log or a Referer.
const cm = $('[data-circle-member]');
if (cm) {
  const tok = new URLSearchParams(location.hash.slice(1)).get('t');
  const show = (sel) => { const el = $(sel, cm); if (el) el.hidden = false; };
  const fill = (m) => {
    if (m.status === 'left') { $('[data-cm-body]', cm).hidden = true; show('[data-cm-left]'); return; }
    $('[data-cm-since]', cm).textContent = m.joinedAt ? new Date(m.joinedAt).toLocaleDateString(LANG === 'en' ? 'en-GB' : LANG === 'fr' ? 'fr-FR' : 'de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    $('[data-cm-email]', cm).textContent = m.email;
    for (const [k, v] of Object.entries(m.prefs || {})) { const box = $(`[data-cm-prefs] [name="${k}"]`, cm); if (box) box.checked = Boolean(v); }
    show('[data-cm-body]');
  };
  if (!tok) show('[data-cm-missing]');
  else {
    if (new URLSearchParams(location.search).get('welcome')) show('[data-cm-welcome]');
    postJson('/circle/member', { token: tok }).then(fill).catch(() => show('[data-cm-missing]'));
    $('[data-cm-prefs]', cm).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const prefs = Object.fromEntries(['graphic', 'knitwear', 'restocks'].map((k) => [k, $(`[name="${k}"]`, f).checked]));
      try { fill(await postJson('/circle/prefs', { token: tok, prefs, lang: LANG })); $('[data-cm-saved]', cm).hidden = false; } catch { show('[data-cm-missing]'); }
    });
    $('[data-cm-leave]', cm).addEventListener('click', async (e) => {
      if (!window.confirm(e.currentTarget.dataset.confirm)) return;
      try { fill(await postJson('/circle/leave', { token: tok })); } catch { show('[data-cm-missing]'); }
    });
  }
}

const tform = $('[data-tracking]');
if (tform) {
  const labels = JSON.parse($('[data-status-labels]').textContent);
  const params = new URLSearchParams(location.search);
  if (params.get('order')) $('#t-order').value = params.get('order');
  tform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = $('[data-tracking-result]');
    const err = $('.page > .prose > [data-err]') || $('[data-err]');
    out.innerHTML = ''; err.hidden = true;
    if (!tform.checkValidity()) { tform.reportValidity(); return; }
    try {
      const j = await postJson('/orders/lookup', Object.fromEntries(new FormData(tform)));
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      out.innerHTML = `<div class="tracking-box"><p><strong>${esc(j.number)}</strong>: ${esc(labels[j.status] || j.status)}</p>${j.trackingUrl ? `<p><a href="${esc(j.trackingUrl)}" rel="noopener" target="_blank">${esc(j.carrier || '')} ${esc(j.trackingNumber || '')}</a></p>` : ''}</div>`;
    } catch { err.hidden = false; }
  });
}

// ------------------------------------------------------------ order success
const num = $('[data-order-number]');
if (num) {
  const sid = new URLSearchParams(location.search).get('session_id');
  if (sid) {
    fetch(apiUrl(`/orders/by-session/${encodeURIComponent(sid)}`))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        num.textContent = j.number;
        const done = store.get('alg_purchases', []);
        if (!done.includes(j.number)) {
          track('purchase', { transaction_id: j.number, currency: 'EUR', value: j.total });
          store.set('alg_purchases', [...done, j.number].slice(-20));
        }
        bag = []; saveBag();
      })
      .catch(() => (num.textContent = '—'));
  } else num.textContent = '—';
}

// ------------------------------------------------------------ header: compact once the page scrolls
(() => {
  const hdr = document.querySelector('.hdr');
  if (!hdr) return;
  let on = false;
  const tick = () => { const s = window.scrollY > 80; if (s !== on) { on = s; hdr.classList.toggle('is-stuck', s); } };
  window.addEventListener('scroll', tick, { passive: true });
  tick();
})();
