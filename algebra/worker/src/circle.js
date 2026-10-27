/**
 * A Circle, the Algebra membership. Access, not discounts: no points, no coupons, no paid tier.
 *
 *   POST /api/circle            {email, firstName?, lang, source?, prefs?, consent:true} → double opt-in e-mail
 *   GET  /api/circle/confirm    ?token= → member (status active), redirect to the member page
 *   POST /api/circle/member     {token} → member view (member since, preferences)
 *   POST /api/circle/prefs      {token, prefs} → saved
 *   POST /api/circle/leave      {token} → status left (consent withdrawn, logged)
 *
 * Nobody is a member without a confirmed opt-in. Every step is written to alg_consent_log. The tier
 * 'circle_private' exists in the data model only: it is never shown nor promised publicly.
 */
import { sendMail, template } from './email.js';
import { HttpError } from './orders.js';

export const CONSENT_VERSION = 'a-circle-2026-10';
export const PREFS = ['graphic', 'knitwear', 'restocks'];
export const TIERS = ['circle', 'circle_private'];
const LANGS = ['de', 'en', 'fr'];
const CONFIRM_TTL_MS = 7 * 24 * 3600 * 1000;
const now = () => new Date().toISOString();
const isEmail = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const cleanPrefs = (p) => Object.fromEntries(PREFS.map((k) => [k, p?.[k] !== false]));
const newToken = () => `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');

async function log(db, email, action, lang) {
  await db.prepare('INSERT INTO alg_consent_log (email, purpose, action, consent_version, lang, created_at) VALUES (?,?,?,?,?,?)').bind(email, 'a-circle', action, CONSENT_VERSION, lang, now()).run();
}

/** Same answer whether the address is new, pending or already a member (no account enumeration). */
export async function requestMembership(env, b, { origin, ctx } = {}) {
  if (!isEmail(b?.email)) throw new HttpError(400, 'BAD_EMAIL');
  if (b.consent !== true && b.consent !== 'on' && b.consent !== 'true') throw new HttpError(400, 'CONSENT_REQUIRED');
  if (b.website) return { ok: true }; // honeypot
  const email = b.email.trim().toLowerCase();
  const lang = LANGS.includes(b.lang) ? b.lang : 'de';
  const firstName = typeof b.firstName === 'string' ? b.firstName.trim().slice(0, 60) || null : null;
  const source = ['page', 'home', 'footer', 'knitwear'].includes(b.source) ? b.source : 'page';
  const ex = await env.DB.prepare('SELECT status FROM alg_members WHERE email = ?').bind(email).first();
  if (ex?.status === 'active') return { ok: true };
  const token = newToken();
  const t = now();
  await env.DB.prepare(
    `INSERT INTO alg_members (email, first_name, lang, status, token, source, consent_version, requested_at, prefs_json, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(email) DO UPDATE SET first_name = COALESCE(excluded.first_name, alg_members.first_name), lang = excluded.lang, status = 'pending',
       token = excluded.token, source = excluded.source, consent_version = excluded.consent_version, requested_at = excluded.requested_at,
       prefs_json = excluded.prefs_json, updated_at = excluded.updated_at`,
  )
    .bind(email, firstName, lang, 'pending', token, source, CONSENT_VERSION, t, JSON.stringify(cleanPrefs(b.prefs)), t)
    .run();
  await log(env.DB, email, 'requested', lang);
  const link = `${env.API_ORIGIN || origin || env.SITE_ORIGIN}/api/circle/confirm?token=${token}`;
  const sending = sendMail(env, { to: email, ...template('circleConfirm', lang, { link, firstName }) });
  if (ctx?.waitUntil) ctx.waitUntil(sending);
  else await sending;
  return { ok: true };
}

/** Confirmation link: activates the membership, rotates the token, sends the welcome note. Returns the redirect URL. */
export async function confirmMembership(env, token, { ctx } = {}) {
  const m = token ? await env.DB.prepare('SELECT * FROM alg_members WHERE token = ?').bind(token).first() : null;
  const site = env.SITE_ORIGIN;
  if (!m) return `${site}/de/circle/?link=expired`;
  if (m.status === 'active') return `${site}/${m.lang}/circle/member/#t=${m.token}`;
  if (m.status !== 'pending' || Date.now() - Date.parse(m.requested_at) > CONFIRM_TTL_MS) return `${site}/${m.lang}/circle/?link=expired`;
  const manage = newToken();
  const t = now();
  await env.DB.prepare("UPDATE alg_members SET status = 'active', token = ?, joined_at = ?, left_at = NULL, updated_at = ? WHERE email = ?").bind(manage, t, t, m.email).run();
  await log(env.DB, m.email, 'confirmed', m.lang);
  const link = `${site}/${m.lang}/circle/member/#t=${manage}`;
  const sending = sendMail(env, { to: m.email, ...template('circleWelcome', m.lang, { link, firstName: m.first_name }) });
  if (ctx?.waitUntil) ctx.waitUntil(sending);
  else await sending;
  return `${site}/${m.lang}/circle/member/?welcome=1#t=${manage}`;
}

async function byToken(env, token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) throw new HttpError(404, 'NOT_FOUND');
  const m = await env.DB.prepare('SELECT * FROM alg_members WHERE token = ?').bind(token).first();
  if (!m || m.status === 'pending') throw new HttpError(404, 'NOT_FOUND');
  return m;
}

const maskEmail = (e) => e.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + '•'.repeat(Math.min(b.length, 6)) + c);

/** What the member page shows. No order data, no internal tier, the e-mail masked. */
export function memberView(m) {
  let prefs = {};
  try {
    prefs = JSON.parse(m.prefs_json || '{}');
  } catch {
    /* default */
  }
  return { status: m.status, firstName: m.first_name, email: maskEmail(m.email), lang: m.lang, joinedAt: m.joined_at, prefs: cleanPrefs(prefs) };
}

export async function getMember(env, token) {
  return memberView(await byToken(env, token));
}

export async function savePrefs(env, token, prefs, lang) {
  const m = await byToken(env, token);
  if (m.status !== 'active') throw new HttpError(409, 'NOT_ACTIVE');
  const l = LANGS.includes(lang) ? lang : m.lang;
  await env.DB.prepare('UPDATE alg_members SET prefs_json = ?, lang = ?, updated_at = ? WHERE email = ?').bind(JSON.stringify(cleanPrefs(prefs)), l, now(), m.email).run();
  await log(env.DB, m.email, 'prefs', l);
  return getMember(env, token);
}

export async function leave(env, token) {
  const m = await byToken(env, token);
  if (m.status === 'left') return memberView(m);
  const t = now();
  await env.DB.prepare("UPDATE alg_members SET status = 'left', left_at = ?, updated_at = ? WHERE email = ?").bind(t, t, m.email).run();
  await log(env.DB, m.email, 'withdrawn', m.lang);
  return memberView({ ...m, status: 'left' });
}

/** Internal segments for operations and CRM (never shown to customers). Thresholds come from env, not from the site. */
export function segmentsOf(member, stats, env = {}, at = Date.now()) {
  const day = 24 * 3600 * 1000;
  const highLtv = Number(env.CIRCLE_HIGH_LTV || 300);
  const privateOrders = Number(env.CIRCLE_PRIVATE_ORDERS || 3);
  const s = [];
  const active = member?.status === 'active';
  const last = stats?.lastOrder ? Date.parse(stats.lastOrder) : null;
  if (active && member.joined_at && at - Date.parse(member.joined_at) <= 30 * day) s.push('new_member');
  if (active && last && at - last <= 180 * day) s.push('active_member');
  if ((stats?.orders || 0) >= 2) s.push('repeat_customer');
  if ((stats?.ltv || 0) >= highLtv) s.push('high_ltv');
  if (active && (!last || at - last > 180 * day)) s.push('inactive_member');
  if (active && member.tier !== 'circle_private' && ((stats?.orders || 0) >= privateOrders || (stats?.ltv || 0) >= highLtv)) s.push('private_candidate');
  return s;
}
