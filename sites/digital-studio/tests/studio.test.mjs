/**
 * algbr.de: build output (links, SEO, languages, honesty rules) and the contact Worker.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import worker, { contact, mailFor, pickLang, validate } from '../worker/index.mjs';

const here = join(import.meta.dirname, '..');
const dist = join(here, 'dist');
execFileSync(process.execPath, [join(here, 'build.mjs')], { env: { ...process.env, STUDIO_NOINDEX: '', STUDIO_ORIGIN: '' }, stdio: 'pipe' });

const files = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]));
const html = files(dist).filter((f) => f.endsWith('.html'));
const read = (f) => readFileSync(f, 'utf8');
const urlOf = (f) => '/' + relative(dist, f).replace(/index\.html$/, '');

test('every page of the brief exists in DE, EN and FR', () => {
  for (const l of ['de', 'en', 'fr'])
    for (const p of ['', 'services/', 'industries/', 'brands/', 'software/', 'work/', 'about/', 'contact/', 'impressum/', 'datenschutz/', 'brands/algebra/', 'brands/go/', 'brands/off/',
      ...['website', 'ecommerce', 'branding', 'software', 'automation', 'maintenance'].map((s) => `services/${s}/`),
      ...['trades', 'beauty', 'restaurants', 'coaching', 'hair', 'events', 'medical', 'real-estate'].map((i) => `industries/${i}/`)])
      assert.ok(existsSync(join(dist, l, p, 'index.html')), `${l}/${p}`);
});

test('every internal link and asset resolves', () => {
  const missing = [];
  for (const f of html) {
    for (const [, u] of read(f).matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const target = join(dist, u);
      const ok = existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
      if (!ok && u !== '/' && u !== '/api/contact') missing.push(`${urlOf(f)} → ${u}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('canonical, hreflang and x-default on every indexable page', () => {
  for (const f of html.filter((f) => !f.endsWith('404.html') && urlOf(f) !== '/')) {
    const s = read(f);
    const u = urlOf(f);
    assert.match(s, new RegExp(`<link rel="canonical" href="https://algbr\\.de${u.replace(/\//g, '\\/')}">`), u);
    if (s.includes('name="robots"')) continue;
    for (const l of ['de', 'en', 'fr', 'x-default']) assert.ok(s.includes(`hreflang="${l}"`), `${u} ${l}`);
    assert.equal((s.match(/<h1[\s>]/g) || []).length, 1, `${u}: one h1`);
  }
});

test('sitemap lists the indexable pages, robots points to it', () => {
  const sm = read(join(dist, 'sitemap.xml'));
  assert.ok(sm.includes('<loc>https://algbr.de/fr/brands/algebra/</loc>'));
  assert.ok(sm.includes('<loc>https://algbr.de/de/impressum/</loc>'));
  assert.ok(!sm.includes('/en/impressum/'), 'legal pages are German only');
  assert.match(read(join(dist, 'robots.txt')), /Sitemap: https:\/\/algbr\.de\/sitemap\.xml/);
});

test('security headers and no inline styles or scripts', () => {
  const h = read(join(dist, '_headers'));
  for (const k of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff', 'Referrer-Policy']) assert.ok(h.includes(k), k);
  assert.ok(!h.includes('unsafe-inline'));
  for (const f of html) {
    const s = read(f);
    assert.ok(!/\sstyle="/.test(s), `${urlOf(f)}: inline style`);
    assert.ok(!/<script(?![^>]*(src=|type="application\/ld\+json"))/.test(s), `${urlOf(f)}: inline script`);
  }
});

test('brand links come from the registry; ALGEBRA links to algbr.eu', () => {
  const s = read(join(dist, 'de', 'brands', 'algebra', 'index.html'));
  assert.ok(s.includes('href="https://algbr.eu"'));
  assert.ok(!s.includes('algebra.algbr.eu'), 'former address no longer shown');
  assert.ok(read(join(dist, 'de', 'index.html')).includes('href="https://next.algbr.eu"'));
});

test('no unverified claims: only approved client figures, no testimonials, hidden software stays hidden', () => {
  const all = html.map(read).join('\n');
  for (const bad of ['Testimonial', 'Kundenstimmen', 'Metamorph', 'AggregateRating']) assert.ok(!all.includes(bad), bad);
  // Lune Beauty figures: released by the owner on 27.10.2026 (content/work.mjs evidence); only on the work page
  for (const f of html.filter((f) => !/[\\/]work[\\/]index\.html$/.test(f))) assert.ok(!read(f).includes('Anfragen pro Monat'), f);
  assert.ok(read(join(dist, 'de', 'work', 'index.html')).includes('10+ Anfragen pro Monat'));
});

test('preview build is noindex everywhere', () => {
  execFileSync(process.execPath, [join(here, 'build.mjs')], { env: { ...process.env, STUDIO_NOINDEX: '1' }, stdio: 'pipe' });
  assert.match(read(join(dist, 'robots.txt')), /Disallow: \//);
  assert.ok(read(join(dist, 'en', 'index.html')).includes('noindex'));
  assert.ok(read(join(dist, '_headers')).includes('X-Robots-Tag: noindex'));
  execFileSync(process.execPath, [join(here, 'build.mjs')], { env: { ...process.env, STUDIO_NOINDEX: '' }, stdio: 'pipe' });
});

// ------------------------------------------------------------------ Worker
const now = Date.now();
const good = { name: 'Ada Muster', email: 'ada@example.com', type: 'website', industry: 'trades', goal: 'Mehr Anfragen aus der Region.', features: ['contact', 'book', 'nope'], budget: 'lt1000', timeline: '4weeks', message: '', consent: true, lang: 'de', t: String(now - 60_000) };
const env = { OWNER_EMAIL: 'owner@example.com', RESEND_API_KEY: 'test', ALLOWED_ORIGINS: 'https://algbr.de' };
const req = (body, headers = {}) =>
  new Request('https://algbr.de/api/contact', { method: 'POST', headers: { origin: 'https://algbr.de', 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('language redirect follows Accept-Language, German by default', () => {
  assert.equal(pickLang('fr-FR,fr;q=0.9,en;q=0.8'), 'fr');
  assert.equal(pickLang('es-ES,en;q=0.5'), 'en');
  assert.equal(pickLang('ja'), 'de');
  assert.equal(pickLang(''), 'de');
});

test('root redirects, unknown API is JSON 404, the rest goes to the static assets', async () => {
  const env2 = { ASSETS: { fetch: () => new Response('asset') } };
  const r = await worker.fetch(new Request('https://algbr.de/', { headers: { 'accept-language': 'en' } }), env2);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/en/');
  assert.equal((await worker.fetch(new Request('https://algbr.de/api/nope'), env2)).status, 404);
  assert.equal(await (await worker.fetch(new Request('https://algbr.de/de/'), env2)).text(), 'asset');
});

test('validation: required fields, honeypot and too-fast submissions', () => {
  assert.equal(validate(good, now).ok, true);
  assert.deepEqual(validate({ ...good, email: 'nope', goal: 'kurz', consent: false }, now).fields, ['email', 'goal', 'consent']);
  assert.deepEqual(validate(good, now).data.features, ['contact', 'book'], 'unknown features are dropped');
  assert.equal(validate({ ...good, budget: 'all-the-money' }, now).data.budget, 'open');
  assert.equal(validate({ ...good, website: 'http://spam' }, now).spam, true);
  assert.equal(validate({ ...good, t: String(now - 500) }, now).spam, true);
  assert.equal(validate({ ...good, type: 'casino' }, now).fields[0], 'type');
});

test('contact: e-mail sent to the owner with reply-to, no header injection', async () => {
  const sent = [];
  const fakeFetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); };
  const r = await contact(req({ ...good, name: 'Ada\r\nBcc: x@evil.test' }), env, fakeFetch);
  assert.equal(r.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://api.resend.com/emails');
  assert.deepEqual(sent[0].body.to, ['owner@example.com']);
  assert.equal(sent[0].body.reply_to, 'ada@example.com');
  assert.ok(!/[\r\n]/.test(sent[0].body.subject));
});

test('contact: spam answered like success but nothing sent', async () => {
  let calls = 0;
  const r = await contact(req({ ...good, website: 'x' }), env, async () => { calls++; return new Response('{}'); });
  assert.equal(r.status, 200);
  assert.equal(calls, 0);
});

test('contact: foreign origin, wrong type, oversize and missing credentials are refused', async () => {
  const f = async () => new Response('{}');
  assert.equal((await contact(req(good, { origin: 'https://evil.test' }), env, f)).status, 403);
  assert.equal((await contact(req(good, { 'content-type': 'text/plain' }), env, f)).status, 415);
  assert.equal((await contact(req('x'.repeat(13000)), env, f)).status, 413);
  const r = await contact(req(good), { ...env, RESEND_API_KEY: '' }, f);
  assert.equal(r.status, 503, 'the page then offers the mailto fallback');
  assert.equal((await contact(req(good), env, async () => new Response('', { status: 500 }))).status, 502);
});

test('mail text contains the request, budget label and language', () => {
  const m = mailFor(validate(good, now).data, env);
  assert.match(m.text, /Projektart: website/);
  assert.match(m.text, /Branche: trades/);
  assert.match(m.text, /Funktionen: contact, book/);
  assert.match(m.text, /Budget: lt1000/);
  assert.match(m.subject, /^\[algbr\.de\] website · Ada Muster$/);
});

test('the Algebra mark is never stretched: its card image keeps its own proportions', () => {
  const css = read(join(here, 'assets', 'studio.css'));
  assert.match(css, /\.work-visual \.brand-mark img[^{]*\{[^}]*height: auto[^}]*object-fit: contain/);
});

test('old studio content is kept: service and industry pages carry the original German text', () => {
  const s = read(join(dist, 'de', 'industries', 'trades', 'index.html'));
  assert.ok(s.includes('Leistungsseiten nach Gewerk'));
  assert.ok(read(join(dist, 'de', 'services', 'ecommerce', 'index.html')).includes('Shop- und Kategoriearchitektur'));
  assert.ok(read(join(dist, 'de', 'index.html')).includes('"@type":"FAQPage"'));
});

test('brief options in the page match what the Worker accepts', async () => {
  const { BRIEF } = await import('../content/copy.mjs');
  const s = read(join(dist, 'en', 'contact', 'index.html'));
  for (const t of BRIEF.types) assert.ok(s.includes(`value="${t}"`), t);
  for (const f of BRIEF.features) assert.ok(s.includes(`name="features" value="${f}"`), f);
});
