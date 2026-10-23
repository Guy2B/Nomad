/**
 * QA: static checks on dist/ + browser checks against the local preview (npm run dev).
 * Writes qa/report.json and qa/screens/*.png. Exit code 1 if anything FAILS.
 * Run: npm run build && (npm run dev &) && PLAYWRIGHT_MODULE=… npm run qa
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const BASE = process.env.QA_BASE || 'http://localhost:8787';
const results = [];
const check = (area, name, pass, detail = '') => results.push({ area, name, result: pass ? 'PASS' : 'FAIL', detail: String(detail).slice(0, 400) });

// ---------------------------------------------------------------- static
const pages = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) pages.push(p);
  }
})(dist);

let broken = [];
const titles = new Map();
let missingAlt = 0;
let badLd = 0;
let h1Bad = [];
let metaBad = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(dist.length);
  const is404 = rel === '/404.html';
  const isRoot = rel === '/index.html';
  for (const m of html.matchAll(/(?:href|src)="([^"#?]+)[^"]*"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|data:)/.test(u)) continue;
    const target = u.startsWith('/') ? join(dist, u) : resolve(dirname(file), u);
    const ok = existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
    if (!ok) broken.push(`${rel} → ${u}`);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      const target = u.startsWith('/') ? join(dist, u) : resolve(dirname(file), u);
      if (!existsSync(target)) broken.push(`${rel} → ${u} (srcset)`);
    }
  }
  if (isRoot) continue;
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) h1Bad.push(`${rel}: ${h1}`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const lang = rel.split('/')[1];
  if (!is404) titles.set(`${lang}|${title}`, [...(titles.get(`${lang}|${title}`) || []), rel]);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html) || !/<link rel="canonical"/.test(html)) metaBad.push(rel);
  if (!is404 && (html.match(/hreflang=/g) || []).length < 4) metaBad.push(`${rel} (hreflang)`);
  for (const m of html.matchAll(/<img [^>]*>/g)) if (!/ alt="/.test(m[0])) missingAlt++;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      badLd++;
    }
  }
}
check('links', 'All internal links, images and srcset resolve', !broken.length, broken.slice(0, 10).join(' | '));
check('seo', 'Exactly one h1 per page', !h1Bad.length, h1Bad.join(', '));
const dupTitles = [...titles.entries()].filter(([, v]) => v.length > 1);
check('seo', 'Unique titles per language', !dupTitles.length, dupTitles.map(([k, v]) => `${k}: ${v.join(',')}`).slice(0, 5).join(' | '));
check('seo', 'Meta description + canonical + hreflang (4) on every page', !metaBad.length, metaBad.slice(0, 10).join(', '));
check('seo', 'JSON-LD parses', badLd === 0, `${badLd} invalid`);
check('a11y', 'Every <img> has an alt attribute', missingAlt === 0, `${missingAlt} missing`);
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const missingInSitemap = locs.filter((u) => !existsSync(join(dist, new URL(u).pathname, 'index.html')));
check('seo', `sitemap.xml lists ${locs.length} URLs, all exist`, locs.length > 50 && !missingInSitemap.length, missingInSitemap.slice(0, 5).join(', '));
const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
const preview = readFileSync(join(dist, 'de', 'index.html'), 'utf8').includes('data-mode="preview"');
check('seo', preview ? 'Preview: every page noindex, robots allows crawling' : 'Live: robots has sitemap', preview ? pages.every((f) => /noindex/.test(readFileSync(f, 'utf8'))) && /Allow: \//.test(robots) : /Sitemap:/.test(robots));
const htmlAll = pages.map((f) => readFileSync(f, 'utf8')).join('\n');
check('trust', 'No countdowns, fake scarcity or review stars in the HTML', !/(countdown|only \d+ left|nur noch \d+|aggregateRating|ratingValue)/i.test(htmlAll));
check('trust', 'Image origin tracked internally (data/photos.json) and colour note on every product page', existsSync(join(root, 'data', 'photos.json')) && pages.filter((f) => f.includes('/product/')).every((f) => /muted">(Farben können|Colours may|Les couleurs peuvent)/.test(readFileSync(f, 'utf8'))));
check('perf', 'No third-party scripts', !/<script[^>]+src="https?:/.test(htmlAll));
const weight = statSync(join(dist, 'assets', 'app.js')).size + statSync(join(dist, 'assets', 'styles.css')).size;
check('perf', `JS + CSS weight ${(weight / 1024).toFixed(1)} KB (< 80 KB)`, weight < 80 * 1024);

// ---------------------------------------------------------------- browser
const mod = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(mod.startsWith('/') ? pathToFileURL(mod).href : mod);
const browser = await chromium.launch();
mkdirSync(join(root, 'qa', 'screens'), { recursive: true });
const errors = [];
async function page(w = 390, h = 844) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/404|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  return p;
}

// responsive: no horizontal overflow
const widths = [320, 375, 390, 430, 768, 1024, 1440];
const urls = ['/de/', '/en/men/', '/fr/women/', '/de/graphic-series/', '/de/product/the-polo-men/', '/en/product/black-hole/', '/de/cart/', '/de/faq/', '/de/size-guide/', '/de/info/imprint/', '/de/search/?q=polo', '/de/tracking/'];
const overflow = [];
for (const w of widths) {
  const p = await page(w, 900);
  for (const u of urls) {
    await p.goto(BASE + u, { waitUntil: 'networkidle' });
    const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 0) overflow.push(`${w}px ${u} +${o}px`);
  }
  await p.goto(BASE + '/de/', { waitUntil: 'networkidle' });
  await p.screenshot({ path: join(root, 'qa', 'screens', `home-${w}.png`) });
  await p.goto(BASE + '/de/product/black-hole/', { waitUntil: 'networkidle' });
  await p.screenshot({ path: join(root, 'qa', 'screens', `pdp-${w}.png`) });
  await p.context().close();
}
check('responsive', `No horizontal overflow at ${widths.join('/')} px on ${urls.length} pages`, !overflow.length, overflow.slice(0, 8).join(', '));

// consent + cart + checkout + tracking
{
  const p = await page(390, 844);
  await p.goto(BASE + '/de/product/the-heavy-tee/', { waitUntil: 'networkidle' });
  check('consent', 'Consent dialog shown on first visit', await p.isVisible('#consent'));
  check('consent', 'No analytics data before consent', (await p.evaluate(() => typeof window.dataLayer)) === 'undefined');
  await p.click('[data-consent="analytics"]');
  check('consent', 'Choice stored, dialog closed', !(await p.isVisible('#consent')) && (await p.evaluate(() => localStorage.getItem('alg_consent'))).includes('"analytics":true'));
  await p.click('[data-buy] button[type="submit"]');
  check('pdp', 'Add to bag without size shows an error', await p.isVisible('[data-buy] [data-err]'));
  await p.click('[data-buy] label.swatch:has(input[value="black"])');
  check('pdp', 'Colour change swaps the gallery', await p.evaluate(() => !document.querySelector('.gal__set[data-color="black"]').hidden && document.querySelector('.gal__set[data-color="deep-navy"]').hidden));
  await p.click('[data-buy] label.pill:not([hidden]):has(input[name="size"][value="M"])');
  await p.click('[data-buy] button[type="submit"]');
  await p.waitForSelector('#bag:not([hidden]) .bag__item');
  check('cart', 'Drawer opens with the item (colour, size)', (await p.textContent('#bag .bag__item')).includes('Schwarz · M'));
  check('analytics', 'add_to_cart recorded after consent', await p.evaluate(() => (window.dataLayer || []).some((e) => e.event === 'add_to_cart')));
  await p.click('#bag [data-q="1"]');
  check('cart', 'Quantity + updates total (2 × 59 € = 118 €, free shipping)', (await p.textContent('#bag .bag__sum')).replace(/\s/g, '').includes('118,00€'));
  await p.click('#bag [data-q="-1"]');
  await p.selectOption('#bag-country', 'FR');
  check('cart', 'Quantity − and country FR: 59 € + shipping 7,90 € (under 150 €)', (await p.textContent('#bag .bag__sum')).includes('7,90'));
  await p.selectOption('#bag-country', 'DE');
  await p.keyboard.press('Escape');
  check('a11y', 'Escape closes the drawer', await p.isHidden('#bag'));
  await p.click('.hdr__bag');
  await p.click('#bag [data-checkout]');
  await p.waitForURL(/order\/success/, { timeout: 10000 });
  await p.waitForFunction(() => /ALG-/.test(document.querySelector('[data-order-number]').textContent));
  const number = await p.textContent('[data-order-number]');
  check('checkout', 'Checkout (mock payment) → success page with order number', /^ALG-\d{6}-\w{4}$/.test(number), number);
  check('checkout', 'Bag emptied after purchase', (await p.textContent('.bag-count')).trim() === '0');
  check('analytics', 'purchase event recorded once', await p.evaluate(() => (window.dataLayer || []).filter((e) => e.event === 'purchase').length === 1));
  await p.goto(BASE + '/de/tracking/', { waitUntil: 'networkidle' });
  await p.fill('#t-order', number);
  await p.fill('#t-email', 'test@example.com');
  await p.click('[data-tracking] button');
  await p.waitForSelector('.tracking-box');
  check('tracking', 'Tracking lookup shows the status', (await p.textContent('.tracking-box')).includes('Produktion'));
  await p.fill('#t-email', 'wrong@example.com');
  await p.click('[data-tracking] button');
  await p.waitForTimeout(400);
  check('tracking', 'Wrong e-mail → not found message', await p.isVisible('[data-err]'));
  await p.context().close();
}

// collection filters, search, 404, newsletter, keyboard
{
  const p = await page(1440, 900);
  await p.goto(BASE + '/de/shop/', { waitUntil: 'networkidle' });
  const before = await p.$$eval('[data-grid] .card:not([hidden])', (e) => e.length);
  await p.click('.filters .chip:has(input[value="deep-navy"])');
  const after = await p.$$eval('[data-grid] .card:not([hidden])', (e) => e.length);
  check('collection', `Colour filter narrows the grid (${before} → ${after})`, after > 0 && after <= before);
  await p.selectOption('.filters select', 'desc');
  const prices = await p.$$eval('[data-grid] .card:not([hidden])', (e) => e.map((c) => +c.dataset.price));
  check('collection', 'Sort by price descending', prices.every((v, i) => !i || prices[i - 1] >= v));
  await p.goto(BASE + '/en/search/?q=black%20hole', { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const hits = await p.$$eval('[data-search-grid] .card:not([hidden])', (e) => e.length);
  check('search', `Search "black hole" finds the product (${hits})`, hits >= 1 && hits <= 3);
  const r = await p.goto(BASE + '/de/gibt-es-nicht/');
  check('404', '404 status and page', r.status() === 404 && (await p.textContent('h1')).includes('gibt es nicht'));
  await p.goto(BASE + '/fr/', { waitUntil: 'networkidle' });
  await p.fill('#ftr-email', 'qa@example.com');
  await p.click('[data-newsletter] button');
  await p.waitForTimeout(400);
  check('forms', 'Newsletter: double opt-in message shown', await p.isVisible('[data-newsletter] [data-ok]'));
  await p.goto(BASE + '/fr/', { waitUntil: 'networkidle' });
  await p.keyboard.press('Tab');
  check('a11y', 'First Tab focuses the skip link', await p.evaluate(() => document.activeElement?.classList.contains('skip')));
  const lang = await p.getAttribute('html', 'lang');
  check('i18n', '/fr/ declares lang="fr"', lang === 'fr');
  await p.context().close();
}
check('js', 'No JavaScript errors in the browser', !errors.length, errors.slice(0, 5).join(' | '));
await browser.close();

mkdirSync(join(root, 'qa'), { recursive: true });
writeFileSync(join(root, 'qa', 'report.json'), JSON.stringify({ date: new Date().toISOString(), base: BASE, results }, null, 2));
const fail = results.filter((r) => r.result === 'FAIL');
for (const r of results) console.log(`${r.result}  [${r.area}] ${r.name}${r.result === 'FAIL' && r.detail ? `  → ${r.detail}` : ''}`);
console.log(`\n${results.length - fail.length}/${results.length} PASS`);
process.exit(fail.length ? 1 : 0);
