/**
 * Opportunity Radar: the ALGBr Opportunity Engine (Python, runs on the owner's
 * PC) publishes its latest scan here; the admin shows it. The engine signs its
 * upload with RADAR_KEY (same secret in the engine's .env and in the Worker).
 */
import crypto from 'node:crypto';

const KEY = 'radar/latest';
const MAX_BYTES = 900_000;

export class RadarError extends Error {
  constructor(code, status) {
    super(code);
    this.status = status;
  }
}

export function radarKeyValid(given, expected = process.env.RADAR_KEY || '') {
  if (expected.length < 24 || !given) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null);

/** Keeps only what the admin shows, so the snapshot stays small. */
export function slimRadar(p, now = new Date()) {
  const scores = (Array.isArray(p.scores) ? p.scores : []).slice(0, 300).map((s) => ({
    concept: String(s.concept ?? '').slice(0, 160),
    universe: String(s.universe ?? 'OTHER').slice(0, 20),
    stage: String(s.stage ?? '').slice(0, 30),
    decision: String(s.decision ?? '').slice(0, 30),
    opportunity: num(s.opportunity_score),
    trend: num(s.trend_score),
    cash: num(s.cash_score),
    risk: num(s.risk_score),
    confidence: num(s.confidence_score),
    growth7d: num(s.growth_7d),
    acceleration: num(s.acceleration),
    marketPriceEur: num(s.market_price_proxy_eur),
    landedEur: num(s.landed_proxy_eur),
    contributionEur: num(s.contribution_proxy_eur),
    pSuccess: num(s.p_success),
    explanation: String(s.explanation ?? '').slice(0, 600),
  }));
  return {
    receivedAt: now.toISOString(),
    generatedAt: String(p.generatedAt ?? now.toISOString()).slice(0, 40),
    version: String(p.version ?? '').slice(0, 20),
    sources: typeof p.sources === 'object' && p.sources ? p.sources : {},
    errors: (Array.isArray(p.errors) ? p.errors : []).slice(0, 10).map((e) => String(typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 300)),
    funnel: typeof p.funnel === 'object' && p.funnel ? p.funnel : null,
    scores,
  };
}

export async function saveRadar(store, req) {
  if (!radarKeyValid(req.headers.get('x-radar-key'))) throw new RadarError('unauthorized', 401);
  const raw = await req.text();
  if (raw.length > 8 * MAX_BYTES) throw new RadarError('too-large', 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new RadarError('bad-json', 400);
  }
  const snap = slimRadar(body);
  if (JSON.stringify(snap).length > MAX_BYTES) snap.scores = snap.scores.slice(0, 120);
  await store.setJSON(KEY, snap);
  return { ok: true, concepts: snap.scores.length };
}

export const latestRadar = (store) => store.get(KEY, { type: 'json' });
