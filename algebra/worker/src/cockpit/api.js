/**
 * Algebra Operating Cockpit: read API behind /api/admin/* (Bearer ADMIN_TOKEN, checked in index.js before any call).
 * Business truth, not decoration: every figure comes from D1 (orders, events, members) or the catalogue; a figure that
 * does not exist is returned as null with a reason, never simulated. Cost-based figures carry `estimate` and sources.
 *
 *   GET /api/admin/overview?range=30d        business, operations, cash, series, previous period, A Circle, alerts
 *   GET /api/admin/orders?filter=attention   orders with economics       GET /api/admin/orders/:number  detail + events
 *   GET /api/admin/finance?by=month          finance table (month | week | product | country | collection)
 *   GET /api/admin/products                  per product: price, cost, margin, sales, supplier mapping, production
 *   GET /api/admin/graphic-series            per artwork: source / print-master / mockup, approval, sales
 *   GET /api/admin/inventory                 supplier availability per product × colour (no fake stock)
 *   GET /api/admin/customers                 per customer (e-mail): orders, LTV, A Circle, consent
 *   GET /api/admin/circle                    members, segments, members vs non-members
 *   GET /api/admin/analytics                 funnel from real data only
 *   GET /api/admin/alerts                    actionable operational alerts
 *   GET /api/admin/fulfillment/status        provider health (existing /api/admin/fulfillment keeps the mapping)
 *   GET /api/admin/settings                  read-only configuration (no secret values)
 */
import { allVariants, colors, products, shipping } from '../../../data/catalog.mjs';
import { isConfirmed, mappingFor, PRINT_MASTER, supplierMappings, VALADIO } from '../fulfillment/mapping.js';
import { providerFor } from '../fulfillment/provider.js';
import { COST_MODEL, orderEconomics, parseItems, SOLD, sumEconomics, unitCost } from './margin.js';
import { segmentsOf } from '../circle.js';

const DAY = 24 * 3600 * 1000;
const r2 = (n) => (n == null ? null : Math.round(n * 100) / 100);
const ATTENTION = ['needs_attention', 'fulfillment_failed'];
const PRODUCTION = ['submitted', 'in_production'];

export const FILTERS = {
  all: () => true,
  new: (o) => o.status === 'pending_payment',
  paid: (o) => o.status === 'paid',
  production: (o) => PRODUCTION.includes(o.status),
  shipped: (o) => o.status === 'shipped',
  delivered: (o) => o.status === 'delivered',
  returned: () => false, // returns are not recorded separately yet (refunds are)
  refunded: (o) => o.status === 'refunded',
  attention: (o) => ATTENTION.includes(o.status) || Boolean(o.last_error) || (o.status === 'shipped' && !o.tracking_number),
};

/** Period from ?range= (today | 7d | 30d | 90d | year | custom&from=YYYY-MM-DD&to=YYYY-MM-DD) and the previous one. */
export function period(params, at = new Date()) {
  const range = params.get('range') || '30d';
  const end = new Date(at);
  let start;
  if (range === 'today') start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  else if (range === 'year') start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
  else if (range === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(params.get('from') || '')) {
    start = new Date(`${params.get('from')}T00:00:00Z`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('to') || '')) end.setTime(Date.parse(`${params.get('to')}T23:59:59Z`));
  } else start = new Date(end.getTime() - (Number.parseInt(range, 10) || 30) * DAY);
  const len = end - start;
  return { range, from: start.toISOString(), to: end.toISOString(), prevFrom: new Date(start - len).toISOString(), prevTo: start.toISOString() };
}

const inRange = (o, from, to) => o.created_at >= from && o.created_at <= to;

async function loadOrders(env) {
  const r = await env.DB.prepare('SELECT * FROM alg_orders ORDER BY created_at DESC LIMIT 5000').all();
  const c = await env.DB.prepare('SELECT * FROM alg_order_costs').all();
  const costs = new Map(c.results.map((x) => [x.order_id, x]));
  const opts = { vatMode: env.VAT_MODE || 'kleinunternehmer', vatOss: env.VAT_OSS === '1' };
  return r.results.map((o) => ({ ...o, econ: orderEconomics(o, { ...opts, costs: costs.get(o.id) || null }) }));
}

async function loadMembers(env) {
  return (await env.DB.prepare('SELECT * FROM alg_members').all()).results;
}

function customerStats(orders) {
  const by = new Map();
  for (const o of orders) {
    if (!o.email || !o.econ.sold) continue;
    const e = o.email.toLowerCase();
    const s = by.get(e) || { email: e, name: o.name, country: o.country, orders: 0, ltv: 0, refunds: 0, first: o.created_at, lastOrder: o.created_at, contribution: 0, contributionKnown: true };
    s.orders += 1;
    s.ltv += o.total;
    if (o.status === 'refunded') s.refunds += 1;
    if (o.created_at > s.lastOrder) s.lastOrder = o.created_at;
    if (o.created_at < s.first) s.first = o.created_at;
    if (o.econ.contribution == null) s.contributionKnown = false;
    else s.contribution += o.econ.contribution;
    by.set(e, s);
  }
  for (const s of by.values()) {
    s.ltv = r2(s.ltv);
    s.aov = r2(s.ltv / s.orders);
    s.contribution = s.contributionKnown ? r2(s.contribution) : null;
  }
  return by;
}

function seriesOf(orders, from, to) {
  const days = new Map();
  const step = to - from > 120 * DAY ? 'month' : 'day';
  const key = (iso) => (step === 'month' ? iso.slice(0, 7) : iso.slice(0, 10));
  for (let t = Date.parse(from); t <= Date.parse(to); t += DAY) days.set(key(new Date(t).toISOString()), { date: key(new Date(t).toISOString()), revenue: 0, orders: 0 });
  for (const o of orders) {
    if (!o.econ.sold) continue;
    const d = days.get(key(o.created_at));
    if (!d) continue;
    d.revenue = r2(d.revenue + o.total);
    d.orders += 1;
  }
  return { step, points: [...days.values()] };
}

function business(list) {
  const sold = list.filter((o) => o.econ.sold);
  const e = sumEconomics(sold.map((o) => o.econ));
  return {
    revenue: e.gross,
    netRevenue: r2(e.netSales - e.refunds),
    orders: sold.length,
    aov: sold.length ? r2(e.gross / sold.length) : null,
    grossMargin: e.grossMargin,
    contribution: e.contribution,
    marginPct: e.marginPct,
    refunds: e.refunds,
    refundedOrders: sold.filter((o) => o.status === 'refunded').length,
    estimate: e.estimate,
    missingCosts: e.missingCosts,
    cash: { gross: e.gross, discounts: e.discounts, netSales: e.netSales, vat: e.vat, paymentFees: e.paymentFee, productionCosts: e.productionCosts, shippingCosts: e.shippingCosts, refunds: e.refunds, contribution: e.contribution },
  };
}

/** Actionable alerts. Each one says what happened, where, and what to do. */
export function alertsOf(orders, env, at = Date.now()) {
  const out = [];
  const add = (level, code, title, ref, action) => out.push({ level, code, title, ref, action });
  const hours = (iso) => (at - Date.parse(iso)) / 3600000;
  for (const o of orders) {
    if (o.status === 'needs_attention') add('error', 'order_attention', 'Order needs intervention', o.number, o.last_error || 'Check address or variant, then retry fulfillment.');
    if (o.status === 'fulfillment_failed') add('error', 'fulfillment_rejected', 'Fulfillment failed after retries', o.number, o.last_error || 'Retry from Orders or contact the provider.');
    if (o.status === 'paid' && hours(o.updated_at) > 2) add('warning', 'paid_not_submitted', 'Paid but not sent to production', o.number, 'Retry fulfillment; the cron retries every run.');
    if (o.status === 'shipped' && !o.tracking_number) add('warning', 'missing_tracking', 'Shipped without tracking number', o.number, 'Ask the provider for the tracking number.');
    if (PRODUCTION.includes(o.status) && hours(o.updated_at) > 24 * 7) add('warning', 'stuck_production', 'In production for more than 7 days', o.number, 'Ask the provider for a status.');
    if (o.econ.sold && o.econ.contribution != null && o.econ.contribution < 0) add('warning', 'negative_margin', 'Negative contribution margin', o.number, 'Check prices, shipping threshold and supplier cost.');
  }
  const live = env.SITE_MODE === 'live';
  const prov = providerFor(env);
  const purchasable = allVariants().filter((v) => v.purchasable);
  const unconfirmed = purchasable.filter((v) => !isConfirmed(v.sku));
  if (live && unconfirmed.length) add('error', 'variant_not_confirmed', `${unconfirmed.length} purchasable variants have no confirmed supplier SKU`, null, 'Confirm the Valadio mapping or set the products back to preview.');
  if (live && prov.sandbox) add('error', 'provider_sandbox', 'Shop is live while fulfillment is in sandbox', null, 'Activate Valadio production only after a test order.');
  for (const p of products.filter((x) => x.line === 'graphic' && x.status === 'PREVIEW')) {
    if (!PRINT_MASTER[p.graphic]) add(live ? 'error' : 'info', 'print_master_missing', `Print-master missing: ${p.name.en}`, p.id, 'Upscale the drawing to the confirmed print area and add it to PRINT_MASTER.');
  }
  if (!env.STRIPE_WEBHOOK_SECRET) add('error', 'webhook_missing', 'Stripe webhook secret missing', null, 'Set STRIPE_WEBHOOK_SECRET on the Worker.');
  if (!prov.sandbox && !env.VALADIO_WEBHOOK_SECRET) add('error', 'provider_webhook_missing', 'Provider webhook secret missing', null, 'Set VALADIO_WEBHOOK_SECRET.');
  const rank = { error: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

function circleBlock(members, orders, from, to) {
  const active = members.filter((m) => m.status === 'active');
  const emails = new Set(active.map((m) => m.email));
  const joined = new Map(active.map((m) => [m.email, m.joined_at]));
  const sold = orders.filter((o) => o.econ.sold && o.email);
  const memberOrders = sold.filter((o) => emails.has(o.email.toLowerCase()) && o.created_at >= (joined.get(o.email.toLowerCase()) || ''));
  const stats = customerStats(sold);
  const group = (isMember) => {
    const cs = [...stats.values()].filter((s) => emails.has(s.email) === isMember);
    const os = sold.filter((o) => emails.has(o.email.toLowerCase()) === isMember);
    const rev = os.reduce((n, o) => n + o.total, 0);
    const contributions = os.map((o) => o.econ.contribution);
    return {
      customers: cs.length,
      orders: os.length,
      aov: os.length ? r2(rev / os.length) : null,
      repeatRate: cs.length ? Math.round((cs.filter((s) => s.orders >= 2).length / cs.length) * 1000) / 10 : null,
      ltv: cs.length ? r2(cs.reduce((n, s) => n + s.ltv, 0) / cs.length) : null,
      refundRate: os.length ? Math.round((os.filter((o) => o.status === 'refunded').length / os.length) * 1000) / 10 : null,
      contribution: contributions.some((c) => c == null) ? null : r2(contributions.reduce((n, c) => n + c, 0)),
      conversion: null,
    };
  };
  const revenue = memberOrders.reduce((n, o) => n + o.total, 0);
  return {
    members: active.length,
    newMembers: active.filter((m) => m.joined_at >= from && m.joined_at <= to).length,
    pending: members.filter((m) => m.status === 'pending').length,
    left: members.filter((m) => m.status === 'left').length,
    memberRevenue: r2(revenue),
    memberAov: memberOrders.length ? r2(revenue / memberOrders.length) : null,
    repeatRate: group(true).repeatRate,
    compare: { members: group(true), nonMembers: group(false) },
    tiers: { circle: active.filter((m) => m.tier === 'circle').length, circle_private: active.filter((m) => m.tier === 'circle_private').length },
  };
}

function orderRow(o) {
  const items = parseItems(o);
  return {
    id: o.id,
    number: o.number,
    date: o.created_at,
    customer: o.name || null,
    email: o.email || null,
    country: o.country,
    products: items.map((i) => `${i.qty}× ${i.sku}`),
    units: o.econ.units,
    total: o.total,
    contribution: o.econ.contribution,
    marginPct: o.econ.marginPct,
    estimate: o.econ.estimate,
    payment: o.status === 'pending_payment' ? 'pending' : o.status === 'payment_failed' ? 'failed' : o.status === 'expired' ? 'expired' : o.status === 'refunded' ? 'refunded' : o.econ.sold ? 'paid' : 'none',
    status: o.status,
    tracking: o.tracking_number ? { carrier: o.carrier, number: o.tracking_number, url: o.tracking_url } : null,
    provider: { name: o.supplier, orderId: o.supplier_order_id, status: o.supplier_status },
    risk: ATTENTION.includes(o.status) ? 'error' : o.last_error || (o.status === 'shipped' && !o.tracking_number) ? 'warning' : null,
    error: o.last_error || null,
  };
}

function productTable(orders) {
  const sold = orders.filter((o) => o.econ.sold);
  return products.map((p) => {
    const variants = allVariants().filter((v) => v.productId === p.id);
    let units = 0;
    let revenue = 0;
    let refundedUnits = 0;
    for (const o of sold) {
      for (const it of parseItems(o)) {
        if (it.productId !== p.id) continue;
        units += it.qty;
        revenue += it.price * it.qty;
        if (o.status === 'refunded') refundedUnits += it.qty;
      }
    }
    const cost = unitCost(p.id);
    const k = 1 + COST_MODEL.vat; // per-piece view under § 19 (costs gross); delivery DE, one piece
    const unitContribution = cost.net == null ? null : r2(p.price - cost.net * k - COST_MODEL.neckLabelNet * k - (p.price * COST_MODEL.paymentPct + COST_MODEL.paymentFixed));
    const m = mappingFor(variants[0]?.sku, 'valadio');
    return {
      id: p.id,
      name: p.name.en,
      line: p.line,
      category: p.category,
      gender: p.gender,
      price: p.price,
      status: p.status,
      colors: p.colors.map((c) => colors[c].name.en),
      sizes: p.sizes,
      cost: cost.net == null ? null : r2(cost.net * k),
      costSource: cost.source,
      costEstimate: cost.source !== 'valadio' && cost.net != null,
      unitContribution,
      unitMarginPct: unitContribution == null ? null : Math.round((unitContribution / p.price) * 1000) / 10,
      units,
      revenue: r2(revenue),
      refundedUnits,
      returnRate: units ? Math.round((refundedUnits / units) * 1000) / 10 : null,
      conversion: null,
      supplier: { provider: 'valadio', status: m?.status || 'candidate', product: m?.supplierProduct || null, method: p.decoration.method },
      printMaster: p.line === 'graphic' ? Boolean(PRINT_MASTER[p.graphic]) : null,
      production: { variants: variants.length, purchasable: variants.filter((v) => v.purchasable).length, confirmed: variants.filter((v) => isConfirmed(v.sku)).length },
    };
  });
}

function financeTable(orders, by) {
  const sold = orders.filter((o) => o.econ.sold);
  const groups = new Map();
  const put = (key, econ) => {
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(econ);
  };
  const week = (iso) => {
    const d = new Date(iso);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y) / DAY + 1) / 7)).padStart(2, '0')}`;
  };
  for (const o of sold) {
    if (by === 'product' || by === 'collection') {
      // split an order's economics across its lines by revenue share
      const items = parseItems(o);
      const sub = items.reduce((n, i) => n + i.price * i.qty, 0) || 1;
      for (const it of items) {
        const share = (it.price * it.qty) / sub;
        const p = products.find((x) => x.id === it.productId);
        const key = by === 'product' ? it.productId : p?.line === 'graphic' ? 'Graphic Series' : 'Essentials';
        put(key, Object.fromEntries(Object.entries(o.econ).map(([k, v]) => [k, typeof v === 'number' && !['units', 'marginPct'].includes(k) ? v * share : v])));
      }
    } else put(by === 'country' ? o.country : by === 'week' ? week(o.created_at) : o.created_at.slice(0, 7), o.econ);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const e = sumEconomics(list);
      return { key, grossSales: e.gross, discounts: e.discounts, netSales: e.netSales, vat: e.vat, paymentFees: e.paymentFee, productionCosts: e.productionCosts, shipping: e.shippingCosts, refunds: e.refunds, contribution: e.contribution, marginPct: e.marginPct, estimate: e.estimate };
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

async function fulfillmentStatus(env, orders) {
  const prov = providerFor(env);
  const last = async (sql) => (await env.DB.prepare(sql).first())?.t || null;
  const reached = orders.filter((o) => o.econ.sold && o.status !== 'refunded' && o.status !== 'cancelled');
  const sent = reached.filter((o) => o.supplier_order_id);
  const ev = await env.DB.prepare("SELECT order_id, type, created_at FROM alg_order_events WHERE type IN ('status:paid','status:shipped') ORDER BY created_at").all();
  const paidAt = new Map();
  const durations = [];
  for (const e of ev.results) {
    if (e.type === 'status:paid') paidAt.set(e.order_id, e.created_at);
    else if (paidAt.has(e.order_id)) durations.push((Date.parse(e.created_at) - Date.parse(paidAt.get(e.order_id))) / DAY);
  }
  return {
    provider: prov.name,
    mode: prov.sandbox ? 'sandbox' : 'production',
    fallback: { name: 'a61', enabled: env.FULFILLMENT_PROVIDER === 'a61' },
    apiConfigured: Boolean(env.VALADIO_API_BASE_URL && env.VALADIO_API_KEY),
    webhookConfigured: Boolean(env.VALADIO_WEBHOOK_SECRET),
    lastWebhook: await last('SELECT MAX(created_at) AS t FROM alg_provider_events'),
    lastSync: await last("SELECT MAX(created_at) AS t FROM alg_order_events WHERE type IN ('provider_webhook','sync_error') OR type LIKE 'status:%'"),
    successRate: reached.length ? Math.round((sent.length / reached.length) * 1000) / 10 : null,
    avgProductionDays: durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null,
    delayed: orders.filter((o) => PRODUCTION.includes(o.status) && Date.now() - Date.parse(o.updated_at) > 7 * DAY).length,
    rejected: orders.filter((o) => ATTENTION.includes(o.status)).length,
    skuErrors: orders.filter((o) => /sku|stock/i.test(o.last_error || '')).length,
    variants: { purchasable: allVariants().filter((v) => v.purchasable).length, confirmed: allVariants().filter((v) => v.purchasable && isConfirmed(v.sku)).length },
    // neutral field names: the admin shell is a public static file and must not carry supplier vocabulary
    mapping: supplierMappings(allVariants().filter((v) => v.purchasable).map((v) => v.sku), 'valadio').map((m) => ({
      product: m.algebraProductId,
      reference: [m.supplierBrand, m.supplierProduct].filter(Boolean).join(' ') || (m.candidates || []).join(', ') || null,
      method: m.method,
      status: m.status,
      confirmed: m.variants.filter((v) => v.status === 'confirmed').length,
      total: m.variants.length,
      note: m.note || null,
    })),
  };
}

export async function cockpit(path, params, env) {
  const orders = await loadOrders(env);
  const per = period(params);
  const cur = orders.filter((o) => inRange(o, per.from, per.to));
  const prev = orders.filter((o) => inRange(o, per.prevFrom, per.prevTo));

  if (path === 'overview') {
    const members = await loadMembers(env);
    const b = business(cur);
    const pb = business(prev);
    const created = cur.length;
    return {
      period: per,
      generatedAt: new Date().toISOString(),
      business: { ...b, checkoutConversion: created ? Math.round((cur.filter((o) => o.econ.sold).length / created) * 1000) / 10 : null, conversion: null, conversionReason: 'No analytics provider connected: sessions are not measured.', returns: null, returnsReason: 'Returns are not recorded separately yet; refunds are.' },
      previous: { revenue: pb.revenue, orders: pb.orders, contribution: pb.contribution, aov: pb.aov },
      operations: {
        pending: orders.filter((o) => o.status === 'paid').length,
        production: orders.filter((o) => PRODUCTION.includes(o.status)).length,
        shipped: orders.filter((o) => o.status === 'shipped').length,
        attention: orders.filter(FILTERS.attention).length,
        fulfillmentFailures: orders.filter((o) => o.status === 'fulfillment_failed').length,
        productsUnavailable: products.filter((p) => p.status !== 'PREVIEW').length,
        missingTracking: orders.filter((o) => o.status === 'shipped' && !o.tracking_number).length,
        apiErrors: orders.filter((o) => o.last_error).length,
      },
      series: seriesOf(cur, per.from, per.to),
      circle: circleBlock(members, orders, per.from, per.to),
      alerts: alertsOf(orders, env).filter((a) => a.level !== 'info').slice(0, 6),
      notes: alertsOf(orders, env).filter((a) => a.level === 'info').length,
      mode: { site: env.SITE_MODE || 'preview', stripe: env.STRIPE_SECRET_KEY ? (env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live') : 'missing', fulfillment: providerFor(env).sandbox ? 'sandbox' : 'production', vat: env.VAT_MODE || 'kleinunternehmer' },
    };
  }
  if (path === 'orders') {
    const f = FILTERS[params.get('filter')] || FILTERS.all;
    const list = (params.get('range') ? cur : orders).filter(f);
    return { filter: params.get('filter') || 'all', count: list.length, orders: list.slice(0, 500).map(orderRow) };
  }
  const om = path.match(/^orders\/([\w-]+)$/);
  if (om) {
    const o = orders.find((x) => x.number === om[1] || x.id === om[1]);
    if (!o) return null;
    const ev = await env.DB.prepare('SELECT type, data, created_at FROM alg_order_events WHERE order_id = ? ORDER BY id').bind(o.id).all();
    return { ...orderRow(o), economics: o.econ, items: parseItems(o), address: o.address_json ? JSON.parse(o.address_json) : null, events: ev.results };
  }
  if (path === 'finance') {
    const by = ['month', 'week', 'product', 'country', 'collection'].includes(params.get('by')) ? params.get('by') : 'month';
    const list = params.get('range') ? cur : orders;
    return { by, totals: business(list).cash, estimate: business(list).estimate, rows: financeTable(list, by), model: { ...COST_MODEL, vatMode: env.VAT_MODE || 'kleinunternehmer', shipping: shipping.zones, packaging: shipping.packagingNetPerShipment } };
  }
  if (path === 'products') return { products: productTable(orders) };
  if (path === 'graphic-series') {
    const table = productTable(orders);
    return {
      designs: products
        .filter((p) => p.line === 'graphic')
        .map((p) => {
          const row = table.find((x) => x.id === p.id);
          return {
            id: p.id,
            design: p.graphic,
            name: p.name.en,
            field: p.field?.en || null,
            status: p.status,
            designSource: p.status === 'DRAFT' ? null : `design/prints/${p.graphic}.png`,
            printMaster: PRINT_MASTER[p.graphic] ? 'available' : null,
            productMockup: p.status === 'DRAFT' ? null : `assets/photos/${p.slug}-${p.colors[0]}-front.webp`,
            products: (p.cuts || []).map((c) => `${p.id}-${c.id === 'women' ? 'W' : 'U'}`),
            printArea: p.decoration.placement,
            method: VALADIO.graphic?.method || p.decoration.method,
            approval: VALADIO.graphic?.status || 'candidate',
            units: row.units,
            revenue: row.revenue,
            unitContribution: row.unitContribution,
            returnRate: row.returnRate,
          };
        }),
    };
  }
  if (path === 'inventory') {
    return {
      note: 'Print on demand: the provider does not report stock yet. Availability shows the supplier mapping status, never an invented stock.',
      rows: products.flatMap((p) =>
        p.colors.map((c) => {
          const vs = allVariants().filter((v) => v.productId === p.id && v.color === c);
          const confirmed = vs.filter((v) => isConfirmed(v.sku)).length;
          return { product: p.name.en, productId: p.id, color: colors[c].name.en, sizes: [...new Set(vs.map((v) => v.size))], purchasable: vs.some((v) => v.purchasable), supplierAvailability: null, status: confirmed === vs.length ? 'confirmed' : confirmed ? 'partial' : mappingFor(vs[0].sku, 'valadio')?.status || 'candidate', lastSync: null, warning: vs.some((v) => v.purchasable) && !confirmed ? 'Sellable in preview, no confirmed supplier SKU' : null };
        }),
      ),
    };
  }
  if (path === 'customers') {
    const members = new Map((await loadMembers(env)).map((m) => [m.email, m]));
    const subs = new Map((await env.DB.prepare('SELECT email, status FROM alg_subscribers').all()).results.map((s) => [s.email, s.status]));
    const stats = customerStats(orders);
    for (const m of members.values()) if (!stats.has(m.email)) stats.set(m.email, { email: m.email, name: m.first_name, country: null, orders: 0, ltv: 0, refunds: 0, lastOrder: null, aov: null, contribution: null });
    const rows = [...stats.values()].map((s) => {
      const m = members.get(s.email);
      return { ...s, circle: m ? { status: m.status, tier: m.tier, joinedAt: m.joined_at, prefs: m.prefs_json ? JSON.parse(m.prefs_json) : null } : null, newsletter: subs.get(s.email) || null, segments: segmentsOf(m, s, env) };
    });
    const q = (params.get('q') || '').toLowerCase();
    return { count: rows.length, customers: rows.filter((r) => !q || r.email.includes(q) || (r.name || '').toLowerCase().includes(q)).sort((a, b) => b.ltv - a.ltv).slice(0, 500) };
  }
  if (path === 'circle') {
    const members = await loadMembers(env);
    const stats = customerStats(orders);
    const consent = await env.DB.prepare('SELECT email, action, created_at FROM alg_consent_log WHERE purpose = ? ORDER BY id DESC LIMIT 200').bind('a-circle').all();
    const rows = members.map((m) => {
      const s = stats.get(m.email) || { orders: 0, ltv: 0, lastOrder: null };
      return { email: m.email, firstName: m.first_name, lang: m.lang, status: m.status, tier: m.tier, source: m.source, joinedAt: m.joined_at, requestedAt: m.requested_at, leftAt: m.left_at, orders: s.orders, ltv: s.ltv, lastOrder: s.lastOrder, prefs: m.prefs_json ? JSON.parse(m.prefs_json) : null, consentVersion: m.consent_version, segments: segmentsOf(m, s, env) };
    });
    const seg = {};
    for (const r of rows) for (const s of r.segments) seg[s] = (seg[s] || 0) + 1;
    return { summary: circleBlock(members, orders, per.from, per.to), segments: seg, members: rows.sort((a, b) => (b.joinedAt || b.requestedAt).localeCompare(a.joinedAt || a.requestedAt)), consentLog: consent.results, earlyAccess: null, earlyAccessReason: 'No early-access release has run yet.' };
  }
  if (path === 'analytics') {
    const created = cur.length;
    const paid = cur.filter((o) => o.econ.sold).length;
    const stats = customerStats(orders.filter((o) => o.econ.sold));
    const byCountry = {};
    for (const o of cur) {
      byCountry[o.country] ||= { checkouts: 0, purchases: 0 };
      byCountry[o.country].checkouts += 1;
      if (o.econ.sold) byCountry[o.country].purchases += 1;
    }
    return {
      provider: null,
      reason: 'No analytics provider connected (docs/ANALYTICS.md): sessions, product views, add to cart, device and source are not measured. Only server data is shown.',
      funnel: { sessions: null, productViews: null, addToCart: null, checkoutStarted: created, purchase: paid, checkoutConversion: created ? Math.round((paid / created) * 1000) / 10 : null },
      byCountry,
      repeatPurchaseRate: stats.size ? Math.round(([...stats.values()].filter((s) => s.orders >= 2).length / stats.size) * 1000) / 10 : null,
    };
  }
  if (path === 'alerts') return { alerts: alertsOf(orders, env) };
  if (path === 'fulfillment/status') return fulfillmentStatus(env, orders);
  if (path === 'settings') {
    const prov = providerFor(env);
    return {
      site: { mode: env.SITE_MODE || 'preview', origin: env.SITE_ORIGIN || null },
      stripe: env.STRIPE_SECRET_KEY ? (env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live') : 'missing',
      stripeWebhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
      mail: env.RESEND_API_KEY ? 'resend' : 'mocked',
      fulfillment: { provider: prov.name, mode: prov.sandbox ? 'sandbox' : 'production' },
      vat: { mode: env.VAT_MODE || 'kleinunternehmer', oss: env.VAT_OSS === '1' },
      costModel: COST_MODEL,
      circle: { highLtv: Number(env.CIRCLE_HIGH_LTV || 300), privateOrders: Number(env.CIRCLE_PRIVATE_ORDERS || 3), privateTierPublic: false },
    };
  }
  return null;
}

export const SOLD_STATUSES = SOLD;
