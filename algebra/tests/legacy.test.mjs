// Former Digital Studio URLs on algbr.eu: 301 to algbr.de once Algebra serves algbr.eu (env.apex only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../worker/src/index.js';
import { LEGACY_PATTERNS, legacyStudioTarget } from '../worker/src/legacy.js';

test('old studio pages map to their algbr.de equivalent', () => {
  assert.equal(legacyStudioTarget('/leistungen/webshop.html'), 'https://algbr.de/de/services/#ecommerce');
  assert.equal(legacyStudioTarget('/leistungen/websites.html'), 'https://algbr.de/de/services/#website');
  assert.equal(legacyStudioTarget('/branchen/handwerk.html'), 'https://algbr.de/de/services/');
  assert.equal(legacyStudioTarget('/fr/project.html'), 'https://algbr.de/fr/contact/');
  assert.equal(legacyStudioTarget('/project.html'), 'https://algbr.de/de/contact/');
  assert.equal(legacyStudioTarget('/impressum.html'), 'https://algbr.de/de/impressum/');
  assert.equal(legacyStudioTarget('/datenschutz.html'), 'https://algbr.de/de/datenschutz/');
});

test('Algebra’s own pages are never redirected', () => {
  for (const p of ['/', '/de/', '/en/', '/fr/', '/de/product/the-polo-men/', '/api/health', '/assets/app.js']) assert.equal(legacyStudioTarget(p), null, p);
});

test('redirects only when LEGACY_STUDIO_REDIRECTS = "1"', async () => {
  const assets = { fetch: () => new Response('asset') };
  const on = await worker.fetch(new Request('https://algbr.eu/leistungen/apps.html'), { LEGACY_STUDIO_REDIRECTS: '1', ASSETS: assets, SITE_ORIGIN: 'https://algbr.eu' });
  assert.equal(on.status, 301);
  assert.equal(on.headers.get('location'), 'https://algbr.de/de/services/#software');
  const off = await worker.fetch(new Request('https://algebra.algbr.eu/leistungen/apps.html'), { ASSETS: assets, SITE_ORIGIN: 'https://algebra.algbr.eu' });
  assert.equal(await off.text(), 'asset');
});

test('wrangler env.apex: algbr.eu route, origin, redirects reach the Worker, still preview', () => {
  const toml = readFileSync(join(import.meta.dirname, '..', 'worker', 'wrangler.toml'), 'utf8');
  const apex = toml.slice(toml.indexOf('[env.apex]'));
  const base = toml.slice(0, toml.indexOf('[env.apex]'));
  assert.match(apex, /pattern = "algbr\.eu", custom_domain = true/);
  assert.match(apex, /SITE_ORIGIN = "https:\/\/algbr\.eu"/);
  assert.match(apex, /SITE_MODE = "preview"/);
  assert.match(apex, /LEGACY_STUDIO_REDIRECTS = "1"/);
  for (const p of LEGACY_PATTERNS) assert.ok(apex.includes(`"${p}"`), `run_worker_first ${p}`);
  // The default environment (current production) is unchanged.
  assert.match(base, /routes = \[\{ pattern = "algebra\.algbr\.eu", custom_domain = true \}\]/);
  assert.match(base, /SITE_ORIGIN = "https:\/\/algebra\.algbr\.eu"/);
  assert.ok(!base.includes('LEGACY_STUDIO_REDIRECTS'));
  // Same D1 database in both environments.
  const ids = [...toml.matchAll(/database_id = "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, 1);
});

test('no inline style attributes in page templates (CSP style-src self would drop them)', () => {
  const src = readFileSync(join(import.meta.dirname, '..', 'scripts', 'build.mjs'), 'utf8');
  assert.equal((src.match(/ style="/g) || []).length, 0);
});
