/**
 * algbr.de Worker: static site (Workers static assets, dist/) + two dynamic routes.
 *   GET  /              → 302 to /de/, /en/ or /fr/ by Accept-Language
 *   POST /api/contact   → validated project request, e-mailed to OWNER_EMAIL through Resend
 *
 * Secrets (Cloudflare dashboard, type "Secret"): RESEND_API_KEY, optional TURNSTILE_SECRET.
 * Variables (wrangler.toml): OWNER_EMAIL, MAIL_FROM, ALLOWED_ORIGINS.
 * Nothing is stored. Logs never contain the visitor's name, e-mail or message.
 */
const LANGS = ['de', 'en', 'fr'];
const TYPES = ['website', 'ecommerce', 'branding', 'software', 'automation', 'maintenance', 'other'];
const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 24 * 3600 * 1000;

const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra } });

export function pickLang(header) {
  const prefs = String(header || '')
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: tag.toLowerCase().slice(0, 2), q: q === undefined ? 1 : Number(q) || 0 };
    })
    .filter((p) => p.q > 0)
    .sort((a, b) => b.q - a.q);
  return prefs.find((p) => LANGS.includes(p.lang))?.lang ?? 'de';
}

const isEmail = (s) => typeof s === 'string' && s.length <= 200 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(s);
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const oneLine = (s, max) => clean(s, max).replace(/[\r\n]+/g, ' ');

/** Returns { ok, fields } or { spam: true }. Pure, exported for tests. */
export function validate(b, now = Date.now()) {
  if (!b || typeof b !== 'object') return { ok: false, fields: ['message'] };
  if (b.website) return { spam: true }; // honeypot
  const t = Number(b.t);
  if (!t || now - t < MIN_FILL_MS || now - t > MAX_AGE_MS) return { spam: true };
  const fields = [];
  const name = oneLine(b.name, 120);
  const email = String(b.email ?? '').trim();
  const message = clean(b.message, 5000);
  if (name.length < 2) fields.push('name');
  if (!isEmail(email)) fields.push('email');
  if (!TYPES.includes(b.type)) fields.push('type');
  if (message.length < 20) fields.push('message');
  if (b.consent !== true && b.consent !== 'on') fields.push('consent');
  if (fields.length) return { ok: false, fields };
  return {
    ok: true,
    data: {
      name,
      email,
      company: oneLine(b.company, 160),
      type: b.type,
      budget: ['0', '1', '2', '3'].includes(String(b.budget)) ? Number(b.budget) : 0,
      message,
      lang: LANGS.includes(b.lang) ? b.lang : 'de',
    },
  };
}

const BUDGETS = ['offen', '< 1.500 €', '1.500–5.000 €', '> 5.000 €'];

export function mailFor(d, env) {
  return {
    from: env.MAIL_FROM || 'Al.G.B.r. Digital Studio <service@algbr.eu>',
    to: [env.OWNER_EMAIL],
    reply_to: d.email,
    subject: `[algbr.de] ${d.type} · ${d.name}${d.company ? ` (${d.company})` : ''}`,
    text: [`Name: ${d.name}`, `E-Mail: ${d.email}`, `Unternehmen: ${d.company || '-'}`, `Projekt: ${d.type}`, `Budget: ${BUDGETS[d.budget]}`, `Sprache: ${d.lang}`, '', d.message].join('\n'),
  };
}

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const j = await r.json().catch(() => ({}));
  return j.success === true;
}

export async function contact(req, env, fetchImpl = fetch) {
  if (req.method !== 'POST') return json(405, { error: 'METHOD' }, { allow: 'POST' });
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get('origin');
  const self = new URL(req.url).origin;
  if (!origin || (origin !== self && !allowed.includes(origin))) return json(403, { error: 'ORIGIN' });
  if (!(req.headers.get('content-type') || '').includes('application/json')) return json(415, { error: 'TYPE' });
  const raw = await req.text();
  if (raw.length > 12000) return json(413, { error: 'TOO_LARGE' });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'BAD_JSON', fields: [] });
  }
  const v = validate(body);
  // Spam gets the same answer as success: nothing to learn for a bot.
  if (v.spam) return json(200, { ok: true });
  if (!v.ok) return json(400, { error: 'BAD_INPUT', fields: v.fields });
  if (!(await turnstileOk(env, body['cf-turnstile-response'], req.headers.get('cf-connecting-ip')))) return json(400, { error: 'CHALLENGE', fields: [] });
  if (!env.RESEND_API_KEY || !env.OWNER_EMAIL) return json(503, { error: 'NEEDS_CREDENTIALS' });
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(mailFor(v.data, env)),
  });
  if (!res.ok) {
    console.log('[contact] mail provider error', res.status);
    return json(502, { error: 'MAIL_FAILED' });
  }
  console.log('[contact] sent', v.data.type, v.data.lang);
  return json(200, { ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/' && (req.method === 'GET' || req.method === 'HEAD')) {
      return new Response(null, { status: 302, headers: { location: `/${pickLang(req.headers.get('accept-language'))}/`, vary: 'Accept-Language', 'cache-control': 'private, max-age=0' } });
    }
    if (url.pathname === '/api/contact') {
      try {
        return await contact(req, env);
      } catch (e) {
        console.log('[contact] error', e?.message);
        return json(500, { error: 'INTERNAL' });
      }
    }
    if (url.pathname.startsWith('/api/')) return json(404, { error: 'NOT_FOUND' });
    return env.ASSETS.fetch(req);
  },
};
