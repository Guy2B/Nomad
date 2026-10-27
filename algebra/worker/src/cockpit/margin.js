/**
 * Order economics for the Operating Cockpit. Server side only (imports the private supplier mapping).
 *
 *   sales (what the customer paid, shipping included)
 * − discounts                     (none exist today: 0)
 * − VAT                           (0 under § 19 UStG; regular VAT: DE 19 %, or the destination rate with OSS)
 * = net sales
 * − refunds                       (actual: Stripe refund events)
 * − product + decoration          (supplier blank + embroidery / print)
 * − neck label
 * = gross margin
 * − shipping paid by Algebra + packaging
 * − payment fees
 * = contribution margin
 *
 * Every cost has a source. Real figures (alg_order_costs: provider invoice, Stripe balance, manual) win; otherwise the
 * documented cost model of docs/ECONOMICS.md is used and the result is flagged `estimate: true`. A cost nobody knows
 * stays null and so does the contribution: nothing is invented.
 */
import { productById, shipping, zoneOf } from '../../../data/catalog.mjs';
import { A61, VALADIO } from '../fulfillment/mapping.js';

/** Same values as scripts/economics.mjs ASSUMPTIONS (a test keeps them equal). */
export const COST_MODEL = { vat: 0.19, paymentPct: 0.015, paymentFixed: 0.25, neckLabelNet: 0.9 };
/** Standard VAT rates of the delivery countries (used only with VAT_MODE=regular and VAT_OSS=1). */
export const VAT_RATES = { DE: 0.19, FR: 0.2, AT: 0.2, BE: 0.21, NL: 0.21, LU: 0.17 };

/** Orders that count as sales (money was taken at some point). */
export const SOLD = ['paid', 'submitted', 'in_production', 'shipped', 'delivered', 'needs_attention', 'fulfillment_failed', 'refunded', 'cancelled'];
const r2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

/** Net garment + decoration cost of one piece: Valadio when confirmed, else the A61 reference (estimate), else null. */
export function unitCost(productId) {
  const p = productById(productId);
  if (!p) return { net: null, source: null };
  const key = p.line === 'graphic' ? 'graphic' : p.id;
  const v = VALADIO[key]?.cost;
  if (v && v.garment != null && v.decoration != null) return { net: v.garment + v.decoration, source: 'valadio' };
  const ref = A61[key]?.cost;
  return ref?.net != null ? { net: ref.net, source: 'legacy_reference' } : { net: null, source: null };
}

export const parseItems = (o) => {
  try {
    return JSON.parse(o.items_json || '[]');
  } catch {
    return [];
  }
};

/**
 * @param o       alg_orders row
 * @param opts    { vatMode: 'kleinunternehmer' | 'regular', vatOss: boolean, costs: alg_order_costs row | null }
 */
export function orderEconomics(o, { vatMode = 'kleinunternehmer', vatOss = false, costs = null, model = COST_MODEL } = {}) {
  const items = parseItems(o);
  const sold = SOLD.includes(o.status) && !(o.status === 'cancelled' && !o.stripe_payment_intent);
  const gross = sold ? o.total : 0;
  const k = vatMode === 'regular' ? 1 : 1 + model.vat; // § 19: supplier VAT cannot be reclaimed, costs count gross
  const rate = vatMode === 'regular' ? (vatOss ? VAT_RATES[o.country] ?? model.vat : model.vat) : 0;
  const vat = r2(gross - gross / (1 + rate));
  const netSales = r2(gross - vat);
  const refunds = o.status === 'refunded' ? netSales : 0;
  // A piece is only made (and paid to the supplier) once the order reached the provider.
  const produced = sold && Boolean(o.supplier_order_id);
  const sources = {};
  const unknown = [];

  let product = 0;
  let label = 0;
  if (costs?.supplier_cost != null) {
    product = produced ? costs.supplier_cost : 0;
    sources.product = costs.source;
  } else if (produced) {
    for (const it of items) {
      const c = unitCost(it.productId);
      if (c.net == null) {
        product = null;
        unknown.push(`cost:${it.productId}`);
        break;
      }
      product += c.net * k * (it.qty || 1);
      sources.product = sources.product && sources.product !== c.source ? 'mixed' : c.source;
    }
  }
  if (produced) label = model.neckLabelNet * k * items.reduce((n, it) => n + (it.qty || 1), 0);

  let shippingCost = 0;
  let packaging = 0;
  if (costs?.shipping_cost != null) {
    shippingCost = produced ? costs.shipping_cost : 0;
    sources.shipping = costs.source;
  } else if (produced) {
    shippingCost = shipping.zones[zoneOf(o.country)].supplierCostNet * k;
    packaging = shipping.packagingNetPerShipment * k;
    sources.shipping = 'model';
  }

  let paymentFee = 0;
  if (costs?.payment_fee != null) {
    paymentFee = costs.payment_fee;
    sources.payment = costs.source;
  } else if (sold && o.stripe_payment_intent) {
    paymentFee = gross * model.paymentPct + model.paymentFixed; // Stripe keeps its fee on refunds
    sources.payment = 'model';
  }

  const grossMargin = product == null ? null : r2(netSales - refunds - product - label);
  const contribution = grossMargin == null ? null : r2(grossMargin - shippingCost - packaging - paymentFee);
  const base = netSales - refunds;
  const estimate = Object.values(sources).some((s) => s === 'model' || s === 'legacy_reference' || s === 'mixed');
  return {
    sold,
    gross: r2(gross),
    discounts: 0,
    shippingCharged: sold ? r2(o.shipping) : 0,
    vat,
    netSales,
    refunds: r2(refunds),
    product: r2(product),
    label: r2(label),
    shippingCost: r2(shippingCost),
    packaging: r2(packaging),
    paymentFee: r2(paymentFee),
    grossMargin,
    contribution,
    marginPct: contribution == null || base <= 0 ? null : Math.round((contribution / base) * 1000) / 10,
    estimate,
    sources,
    unknown,
    units: items.reduce((n, it) => n + (it.qty || 1), 0),
  };
}

/** Sum a list of economics objects. A null contribution anywhere makes the total contribution null (with a count). */
export function sumEconomics(list) {
  const keys = ['gross', 'discounts', 'shippingCharged', 'vat', 'netSales', 'refunds', 'product', 'label', 'shippingCost', 'packaging', 'paymentFee', 'grossMargin', 'contribution'];
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  let missing = 0;
  let estimate = false;
  for (const e of list) {
    if (!e.sold) continue;
    estimate ||= e.estimate;
    for (const k of keys) {
      if (e[k] == null) {
        if (k === 'contribution') missing += 1;
        out[k] = null;
      } else if (out[k] != null) out[k] += e[k];
    }
  }
  for (const k of keys) out[k] = r2(out[k]);
  const base = out.netSales - out.refunds;
  out.productionCosts = out.product == null ? null : r2(out.product + out.label);
  out.shippingCosts = r2(out.shippingCost + out.packaging);
  out.marginPct = out.contribution == null || base <= 0 ? null : Math.round((out.contribution / base) * 1000) / 10;
  out.estimate = estimate;
  out.missingCosts = missing;
  return out;
}
