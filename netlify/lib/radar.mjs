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

const str = (v, n) => String(v ?? '').slice(0, n);
const list = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);
const nn = (v) => (v === null || v === undefined || v === '' ? null : num(v));
const link = (v) => (/^https:\/\/[^\s"'<>]+$/.test(String(v ?? '')) ? String(v).slice(0, 500) : '');

const FOLLOW = 'radar/follow';
export const followedMarkets = async (store) => (await store.get(FOLLOW, { type: 'json' })) ?? [];

/** Markets the owner follows: the engine analyses them first and deeper. */
export async function setFollow(store, key, on) {
  if (!/^[a-z0-9_]{2,40}$/.test(String(key))) throw new RadarError('bad-market', 400);
  const set = new Set(await followedMarkets(store));
  if (on) set.add(key);
  else set.delete(key);
  const out = [...set].slice(0, 30);
  await store.setJSON(FOLLOW, out);
  return out;
}

/** Market Pulse (weekly): markets, shop priorities, alerts. Shape-checked and bounded. */
export function slimPulse(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.markets)) return null;
  const season = (s) => ({
    now: nn(s?.now),
    next: nn(s?.next),
    peakMonth: str(s?.peakMonth, 20),
    weeksToPeak: nn(s?.weeksToPeak),
    index: list(s?.index, 12).map(nn),
  });
  return {
    generatedAt: str(p.generatedAt, 40),
    sources: Object.fromEntries(Object.entries(p.sources || {}).slice(0, 12).map(([k, v]) => [str(k, 40), str(v, 80)])),
    markets: list(p.markets, 60).map((m) => ({
      key: str(m.key, 40),
      label: str(m.label, 60),
      shop: str(m.shop, 10),
      fit: nn(m.fit),
      fitNote: str(m.fitNote, 120),
      pulse: nn(m.pulse),
      momentum: nn(m.momentum),
      seasonScore: nn(m.seasonScore),
      priceScore: nn(m.priceScore),
      momentumSources: list(m.momentumSources, 6).map((s) => str(s, 20)),
      season: season(m.season),
      interestYoy: nn(m.interestYoy),
      listings: nn(m.listings),
      priceMedian: nn(m.priceMedian),
      listingGrowth: nn(m.listingGrowth),
      suggestCount: nn(m.suggestCount),
      newQueries: list(m.newQueries, 12).map((q) => str(q, 80)),
      queries: list(m.queries, 40).map((q) => str(q, 80)),
      followed: m.followed === true,
      cjKeyword: str(m.cjKeyword, 60),
      ebayTop: list(m.ebayTop, 10).map((x) => ({ title: str(x.title, 110), price: nn(x.price), shipping: nn(x.shipping), url: link(x.url), image: link(x.image), query: str(x.query, 80) })),
      models: list(m.models, 8).map((x) => ({ model: str(x.model, 60), newMedian: nn(x.newMedian), newCount: nn(x.newCount), usedMedian: nn(x.usedMedian), usedCount: nn(x.usedCount) })),
      candidates: list(m.candidates, 8).map((c) => ({
        product: str(c.product, 90),
        url: link(c.url),
        image: link(c.image),
        landedEur: nn(c.landedEur),
        delivery: str(c.delivery, 30),
        listedBy: nn(c.listedBy),
        marketPriceEur: nn(c.marketPriceEur),
        ebayQuery: str(c.ebayQuery, 80),
        ebaySample: nn(c.ebaySample),
        margin: nn(c.margin),
      })),
      verdict: m.verdict ? { headline: str(m.verdict.headline, 240), points: list(m.verdict.points, 8).map((x) => str(x, 300)), good: nn(m.verdict.good) } : null,
      bestSellers: m.bestSellers
        ? { n: nn(m.bestSellers.n), risers: nn(m.bestSellers.risers), top: list(m.bestSellers.top, 5).map((t) => ({ title: str(t.title, 90), brand: str(t.brand, 40), rank: nn(t.rank), country: str(t.country, 4), change: str(t.change, 20) })) }
        : null,
      cj: m.cj
        ? { product: str(m.cj.product, 90), landedEur: nn(m.cj.landedEur), marketPriceEur: nn(m.cj.marketPriceEur), marginAtMarketPrice: nn(m.cj.marginAtMarketPrice), delivery: str(m.cj.delivery, 30) }
        : null,
    })),
    shops: list(p.shops, 10).map((s) => ({
      shop: str(s.shop, 10),
      pulse: nn(s.pulse),
      momentum: nn(s.momentum),
      seasonNext: nn(s.seasonNext),
      markets: list(s.markets, 10).map((k) => str(k, 40)),
      actions: list(s.actions, 4).map((a) => str(a, 300)),
    })),
    alerts: list(p.alerts, 12).map((a) => ({ level: str(a.level, 10), text: str(a.text, 300) })),
  };
}

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
    pulse: slimPulse(p.pulse),
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
