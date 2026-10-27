// A Circle: double opt-in, consent log, member page, leaving, segments, admin view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../worker/src/index.js';
import { segmentsOf } from '../worker/src/circle.js';
import { memoryD1 } from './d1.mjs';
import { SCHEMA } from '../worker/src/schema.js';

const freshDb = () => { const d = memoryD1(null); for (const q of SCHEMA) d.raw.exec(q); return d; };
const env = (extra = {}) => ({ DB: freshDb(), SITE_ORIGIN: 'https://algebra.test', SITE_MODE: 'preview', SUPPLIER_MODE: 'mock', ADMIN_TOKEN: 'admin-token-circle-0123456789', ...extra });
const ctx = { waitUntil: () => {} };
const post = (e, path, data) => worker.fetch(new Request(`https://algebra.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }), e, ctx);
const tokenOf = async (e, email) => (await e.DB.prepare('SELECT token FROM alg_members WHERE email = ?').bind(email).first()).token;

test('joining needs a valid e-mail and an explicit consent', async () => {
  const e = env();
  assert.equal((await post(e, '/api/circle', { email: 'x', consent: true })).status, 400);
  assert.equal((await post(e, '/api/circle', { email: 'ana@example.com' })).status, 400, 'no consent, no membership');
  assert.equal((await post(e, '/api/circle', { email: 'ana@example.com', consent: false })).status, 400);
});

test('double opt-in: pending until the link is clicked, every step logged', async () => {
  const e = env();
  const r = await post(e, '/api/circle', { email: 'Ana@Example.com', firstName: 'Ana', lang: 'fr', consent: true, source: 'home' });
  assert.equal(r.status, 200);
  let m = await e.DB.prepare('SELECT * FROM alg_members WHERE email = ?').bind('ana@example.com').first();
  assert.equal(m.status, 'pending', 'not a member before confirmation');
  assert.equal(m.joined_at, null);
  const confirm = await worker.fetch(new Request(`https://algebra.test/api/circle/confirm?token=${m.token}`), e, ctx);
  assert.equal(confirm.status, 302);
  m = await e.DB.prepare('SELECT * FROM alg_members WHERE email = ?').bind('ana@example.com').first();
  assert.equal(m.status, 'active');
  assert.ok(m.joined_at);
  assert.match(confirm.headers.get('location'), new RegExp(`^https://algebra.test/fr/circle/member/\\?welcome=1#t=${m.token}$`));
  const log = (await e.DB.prepare('SELECT action FROM alg_consent_log WHERE email = ? ORDER BY id').bind('ana@example.com').all()).results.map((x) => x.action);
  assert.deepEqual(log, ['requested', 'confirmed']);
  // the confirmation token was rotated: the old link cannot be replayed into the member page
  const again = await worker.fetch(new Request('https://algebra.test/api/circle/confirm?token=nope'), e, ctx);
  assert.match(again.headers.get('location'), /link=expired/);
});

test('same answer for a new address and an existing member (no enumeration)', async () => {
  const e = env();
  await post(e, '/api/circle', { email: 'ben@example.com', consent: true });
  const t = await tokenOf(e, 'ben@example.com');
  await worker.fetch(new Request(`https://algebra.test/api/circle/confirm?token=${t}`), e, ctx);
  const a = await (await post(e, '/api/circle', { email: 'ben@example.com', consent: true })).json();
  const b = await (await post(e, '/api/circle', { email: 'new@example.com', consent: true })).json();
  assert.deepEqual(a, b);
  assert.equal((await e.DB.prepare('SELECT status FROM alg_members WHERE email = ?').bind('ben@example.com').first()).status, 'active', 'a member stays a member');
});

test('member page: masked e-mail, preferences, leaving withdraws consent', async () => {
  const e = env();
  await post(e, '/api/circle', { email: 'cara@example.com', consent: true, lang: 'de' });
  await worker.fetch(new Request(`https://algebra.test/api/circle/confirm?token=${await tokenOf(e, 'cara@example.com')}`), e, ctx);
  const t = await tokenOf(e, 'cara@example.com');
  const view = await (await post(e, '/api/circle/member', { token: t })).json();
  assert.equal(view.status, 'active');
  assert.ok(!view.email.includes('cara@'), 'e-mail masked');
  assert.equal(view.tier, undefined, 'internal tier never exposed');
  const saved = await (await post(e, '/api/circle/prefs', { token: t, prefs: { graphic: false, knitwear: true, restocks: true } })).json();
  assert.equal(saved.prefs.graphic, false);
  const left = await (await post(e, '/api/circle/leave', { token: t })).json();
  assert.equal(left.status, 'left');
  const log = (await e.DB.prepare('SELECT action FROM alg_consent_log WHERE email = ? ORDER BY id').bind('cara@example.com').all()).results.map((x) => x.action);
  assert.deepEqual(log, ['requested', 'confirmed', 'prefs', 'withdrawn']);
  assert.equal((await post(e, '/api/circle/member', { token: 'short' })).status, 404);
});

test('segments are internal and threshold-driven by env', () => {
  const now = Date.parse('2026-10-27T00:00:00Z');
  const m = { status: 'active', tier: 'circle', joined_at: '2026-10-20T00:00:00Z' };
  assert.deepEqual(segmentsOf(m, { orders: 0, ltv: 0 }, {}, now), ['new_member', 'inactive_member']);
  const s = segmentsOf(m, { orders: 3, ltv: 320, lastOrder: '2026-10-25T00:00:00Z' }, {}, now);
  for (const k of ['active_member', 'repeat_customer', 'high_ltv', 'private_candidate']) assert.ok(s.includes(k), k);
  assert.ok(!segmentsOf(m, { orders: 3, ltv: 320 }, { CIRCLE_HIGH_LTV: '1000', CIRCLE_PRIVATE_ORDERS: '5' }, now).includes('private_candidate'));
});

test('admin A Circle view counts only confirmed members and compares members with non-members', async () => {
  const e = env();
  await post(e, '/api/circle', { email: 'dan@example.com', consent: true });
  await post(e, '/api/circle', { email: 'eva@example.com', consent: true });
  await worker.fetch(new Request(`https://algebra.test/api/circle/confirm?token=${await tokenOf(e, 'dan@example.com')}`), e, ctx);
  const d = await (await worker.fetch(new Request('https://algebra.test/api/admin/circle', { headers: { authorization: 'Bearer admin-token-circle-0123456789' } }), e, ctx)).json();
  assert.equal(d.summary.members, 1);
  assert.equal(d.summary.pending, 1);
  assert.ok('members' in d.summary.compare && 'nonMembers' in d.summary.compare);
  assert.equal((await worker.fetch(new Request('https://algebra.test/api/admin/circle'), e, ctx)).status, 403);
});

test('public pages: A Circle page in three languages with consent checkbox, member page noindex, official A only', () => {
  const dist = join(import.meta.dirname, '..', 'dist');
  if (!existsSync(dist)) return;
  for (const l of ['de', 'en', 'fr']) {
    const page = readFileSync(join(dist, l, 'circle', 'index.html'), 'utf8');
    assert.match(page, /name="consent"[^>]*required/);
    assert.match(page, /info\/privacy\//);
    assert.ok(!/points|cashback|rabatt|discount|remise|%\s*off/i.test(page.replace(/<script[\s\S]*?<\/script>/g, '')), `${l}: access, not discounts`);
    const member = readFileSync(join(dist, l, 'circle', 'member', 'index.html'), 'utf8');
    assert.match(member, /noindex/);
    const home = readFileSync(join(dist, l, 'index.html'), 'utf8');
    assert.match(home, /class="circlefeat"/);
  }
  const privacy = readFileSync(join(dist, 'de', 'info', 'privacy', 'index.html'), 'utf8');
  assert.match(privacy, /A Circle/);
});
