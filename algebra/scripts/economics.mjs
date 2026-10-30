/**
 * Unit economics per SKU (product × cut), from data/catalog.mjs.
 * Writes docs/ECONOMICS.md and data/economics.json. Run: npm run economics
 *
 * Every number is one of:
 *   SUPPLIER   provider cost from worker/src/fulfillment/mapping.js (Valadio, once confirmed)
 *   legacy_reference  previous A61 offer (23.10.2026), shown only while Valadio prices are unknown, never a Valadio cost
 *   POLICY     an Algebra decision (price hypothesis, shipping fee), change it in data/catalog.mjs
 *   ASSUMPTION a modelling assumption, change it below; never presented as a fact
 *   TO VERIFY  unknown; the SKU's result is then flagged instead of invented
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { products, shipping } from '../data/catalog.mjs';
import { VALADIO, A61 } from '../worker/src/fulfillment/mapping.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const VAT = 0.19;

export const ASSUMPTIONS = {
  // Stripe standard EEA cards. TO VERIFY on stripe.com/de/pricing for the account (could not be fetched on 22.10.2026).
  paymentPct: 0.015,
  paymentFixed: 0.25,
  // Worse mix (PayPal / Klarna / non-EEA cards) for the sensitivity column. ASSUMPTION.
  paymentPctWorst: 0.035,
  paymentFixedWorst: 0.35,
  // Apparel return rate. ASSUMPTION for planning, replace with real data after 100 orders.
  returnRate: 0.15,
  // Share of the product cost recovered when a returned piece can be resold as new. ASSUMPTION.
  returnRecovery: 0.5,
  // A61 return handling fee per piece: TO VERIFY (0 used, flagged in the report).
  returnHandling: 0,
  // White label per piece: transfer neck label (SUPPLIER, 0,90 € net). Packaging 0,75 € and inserts 0,25 € are not used at launch (POLICY).
  neckLabelNet: 0.9,
  // Contribution Algebra wants to keep per piece, as a share of net revenue (POLICY, for the minimum price).
  targetMargin: 0.35,
};

/** Net cost of garment + decoration: Valadio if both numbers are known, else the A61 reference, else null. */
function costOf(p, cut) {
  const key = p.line === 'graphic' ? 'graphic' : p.id;
  const c = VALADIO[key]?.cost;
  if (c && c.garment != null && c.decoration != null) return { net: c.garment + c.decoration, source: 'Valadio' };
  const ref = A61[key]?.cost;
  return ref ? { net: ref.net, source: 'legacy_reference (A61)' } : { net: null, source: 'TO VERIFY' };
}

const r2 = (n) => Math.round(n * 100) / 100;
const eur = (n) => (n == null ? 'TO VERIFY' : `${n.toFixed(2).replace('.', ',')} €`);
const pct = (n) => (n == null ? 'TO VERIFY' : `${(n * 100).toFixed(0)} %`);

/** One-unit order to Germany. mode 'K' = Kleinunternehmer (§ 19 UStG, no VAT charged, input VAT not deductible), 'V' = regular VAT. */
export function unit(p, cut, mode = 'K', zone = 'DE', a = ASSUMPTIONS) {
  const cost = costOf(p, cut);
  const z = shipping.zones[zone];
  const price = cut?.price ?? p.price;
  const shipFee = price >= z.freeFrom ? 0 : z.fee;
  const gross = price + shipFee; // what the customer pays
  const revenue = mode === 'K' ? gross : gross / (1 + VAT);
  const k = mode === 'K' ? 1 + VAT : 1; // supplier invoices carry 19 % VAT; not recoverable for a Kleinunternehmer
  const product = cost.net != null ? cost.net * k : null;
  const label = a.neckLabelNet * k;
  const ship = (z.supplierCostNet + shipping.packagingNetPerShipment) * k;
  const pay = gross * a.paymentPct + a.paymentFixed;
  const payWorst = gross * a.paymentPctWorst + a.paymentFixedWorst;
  const returns = product == null ? null : a.returnRate * (shipFee + (product + label) * (1 - a.returnRecovery) + a.returnHandling);
  const contribution = product == null ? null : revenue - product - label - ship - pay - returns;
  const contributionWorst = product == null ? null : revenue - product - label - ship - payWorst - returns;
  return {
    sku: p.id + (cut ? `-${cut.code}` : ''),
    name: p.name.en + (cut ? ` (${cut.name.en})` : ''),
    costSource: cost.source,
    // minimum price (incl. shipping fee paid by the customer) that keeps targetMargin: gross = (fixed costs) / (1 − pay% − margin)
    minPrice: product == null ? null : r2((product + label + ship + a.paymentFixed + a.returnRate * ((product + label) * (1 - a.returnRecovery) + a.returnHandling)) / ((mode === 'K' ? 1 : 1 / (1 + VAT)) - a.paymentPct - a.targetMargin * (mode === 'K' ? 1 : 1 / (1 + VAT))) - shipFee),
    status: p.status,
    mode,
    zone,
    priceGross: price,
    shipFee,
    revenue: r2(revenue),
    product: product == null ? null : r2(product),
    label: r2(label),
    ship: r2(ship),
    pay: r2(pay),
    returns: returns == null ? null : r2(returns),
    contribution: contribution == null ? null : r2(contribution),
    contributionPct: contribution == null ? null : contribution / revenue,
    contributionWorst: contributionWorst == null ? null : r2(contributionWorst),
    breakEvenCac: contribution == null ? null : r2(contribution),
  };
}

export function table(mode = 'K', zone = 'DE') {
  return products.filter((p) => p.status !== 'DRAFT').flatMap((p) => (p.cuts ? p.cuts.map((c) => unit(p, c, mode, zone)) : [unit(p, null, mode, zone)]));
}

function md(rows, title) {
  const head =
    '| SKU | Product | Status | Price | Min. price | Cost source | Product + deco | Neck label | Shipping | Payment | Return prov. | **Contribution** | % | Worst pay mix |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  const lines = rows.map(
    (r) =>
      `| ${r.sku} | ${r.name} | ${r.status} | ${eur(r.priceGross)} | ${eur(r.minPrice)}${r.minPrice != null && r.minPrice > r.priceGross ? ' ⚠' : ''} | ${r.costSource} | ${eur(r.product)} | ${eur(r.label)} | ${eur(r.ship)} | ${eur(r.pay)} | ${eur(r.returns)} | **${eur(r.contribution)}** | ${pct(r.contributionPct)} | ${eur(r.contributionWorst)} |`,
  );
  return `### ${title}\n\n${head}\n${lines.join('\n')}\n`;
}

/** Graphic tee at 59 / 69 / 79 €, both cuts, DE, Kleinunternehmer. Valid only if A61's "2-sided" price covers the large back print. */
export function sensitivity(prices = [59, 69, 79]) {
  const g = products.find((p) => p.line === 'graphic');
  const rows = g.cuts.flatMap((c) =>
    prices.map((price) => {
      const r = unit({ ...g, price }, { ...c, price }, 'K', 'DE');
      return `| ${c.name.en} | ${eur(price)} | ${eur(r.shipFee)} | ${eur(r.product)} | **${eur(r.contribution)}** | ${pct(r.contributionPct)} | ${eur(r.contributionWorst)} |`;
    }),
  );
  return `### Graphic tee: price test 59 / 69 / 79 € (DE, Kleinunternehmer)

Costs: Valadio once confirmed, until then the previous A61 "2-sided print" offer as a reference. A full-back print (~35 × 50 cm)
may cost more than a standard print: replace with the Valadio quote before deciding the price.

| Cut | Price | Ship fee | Product + deco | **Contribution** | % | Worst pay mix |
|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const K = table('K', 'DE');
  const V = table('V', 'DE');
  const KEU = table('K', 'EU');
  writeFileSync(join(root, 'data', 'economics.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), assumptions: ASSUMPTIONS, K, V, KEU }, null, 2));
  const a = ASSUMPTIONS;
  const doc = `# Algebra · Unit economics

Generated by \`npm run economics\` from \`data/catalog.mjs\` (prices, blanks, shipping) and the assumptions in \`scripts/economics.mjs\`.
**No margin below is invented**: supplier costs are A61's published list prices (22.10.2026, "Änderungen vorbehalten");
everything else is labelled POLICY, ASSUMPTION or TO VERIFY. A SKU whose supplier cost is not published shows **TO VERIFY** instead of a number.

## How to read it

- One unit, one order, delivered to Germany (EU table further down). A second item in the same order adds no shipping cost, so real baskets do better.
- **Contribution** = net revenue − product and decoration − neck label − shipping and packaging − payment fee − return provision.
  It must pay for marketing, samples, tools and the owner's time. **Break-even CAC** = the contribution: the most one acquired order may cost in ads.
- **Kleinunternehmer (§ 19 UStG)**: no VAT on sales, but the 19 % VAT on A61 invoices cannot be reclaimed, so costs are taken **gross**.
  Under **regular VAT** the selling price is divided by 1.19 and costs are taken net. Which regime applies to Algebra (and to cross-border
  sales to FR/AT/BE/NL/LU) is a **LEGAL REVIEW** point: see docs/LEGAL_REVIEW.md.

## Inputs

| Input | Value | Type |
|---|---|---|
| Selling prices | in the tables, inside the brief's ranges (tee 49–69, polo 69–99, sweater 79–119, graphic 59–79) | POLICY (hypothesis to test) |
| Product + decoration | A61 list price for blank + embroidery (≤ 8,000 stitches) or 2-sided print | SUPPLIER |
| Neck label | ${eur(a.neckLabelNet)} net per piece (transfer label) | SUPPLIER |
| Shipping DE | ${eur(shipping.zones.DE.supplierCostNet)} net + ${eur(shipping.packagingNetPerShipment)} net packaging per shipment | SUPPLIER ("ab", smallest parcel) |
| Shipping EU | ${eur(shipping.zones.EU.supplierCostNet)} net + packaging (A61 example: 1 tee) | SUPPLIER, per country **TO VERIFY** |
| Shipping fee charged | DE ${eur(shipping.zones.DE.fee)}, free from ${eur(shipping.zones.DE.freeFrom)} · EU ${eur(shipping.zones.EU.fee)}, free from ${eur(shipping.zones.EU.freeFrom)} | POLICY |
| Payment fee | ${(a.paymentPct * 100).toFixed(1)} % + ${eur(a.paymentFixed)} (Stripe EEA standard cards) | **TO VERIFY** for the account |
| Worst payment mix | ${(a.paymentPctWorst * 100).toFixed(1)} % + ${eur(a.paymentFixedWorst)} | ASSUMPTION (sensitivity) |
| Return rate | ${pct(a.returnRate)} | ASSUMPTION |
| Value recovered on a return | ${pct(a.returnRecovery)} of product cost | ASSUMPTION |
| A61 return handling fee | not published, 0 used | **TO VERIFY** |
| Return provision | rate × (refunded shipping fee + unrecovered product and label cost + handling) | formula |

${md(K, 'Kleinunternehmer, delivery to Germany (current regime of the owner, LEGAL REVIEW)')}
${md(V, 'Regular VAT 19 %, delivery to Germany (if Algebra leaves § 19 or exceeds the threshold)')}
${md(KEU, 'Kleinunternehmer, delivery to FR / AT / BE / NL / LU (A61 EU example rate)')}
${sensitivity()}

## One-off costs before launch

| Item | Cost | Type |
|---|---|---|
| Embroidery digitizing of the symbol | 33,00 € net (39,27 € gross) per design; probably 1 design for all chest sizes, maybe 2 (TO VERIFY with A61) | SUPPLIER |
| Samples: 1 piece of each purchasable product in one colour | ≈ sum of the "Product + deco" column + shipping | SUPPLIER |
| Domain | algebra.algbr.eu is a subdomain of an owned domain: 0 € | known |
| Hosting (Cloudflare Pages + Workers + D1 free tier) | 0 € at launch volume (free-tier limits TO VERIFY at scale) | known |
| Stripe | no fixed fee | known |
| Legal texts (Impressum, AGB, Widerruf, Datenschutz) | depends on provider | **TO VERIFY** |

## What the numbers say (22.10.2026)

1. Essentials work at the hypothesis prices: the polo and the crew carry the strongest absolute contribution, which is what pays for ads.
2. Graphic tees in the women's cut (Muser) are cheaper to make than the unisex heavy cut at the same price. Keep one price for both: same design, same value to the customer.
3. Free shipping from 100 € in Germany makes the crew carry its own shipping; a polo + tee basket crosses the threshold and is the natural upsell (no artificial pressure).
4. The two women's pieces without a published cost (polo, crew with embroidery) stay **not purchasable** until A61 quotes them.
5. **Graphic Series print cost TO VERIFY**: the A61 "Druck" price does not state the maximum print area or colour count. The capsule needs up to 30 × 40 cm on the back, three ink colours, plus a 7 × 7 cm chest icon. If A61 charges more for that, these rows change.
6. Before spending on ads: replace the payment fee assumption with the real Stripe rate and the return assumptions with A61's real return terms.
`;
  writeFileSync(join(root, 'docs', 'ECONOMICS.md'), doc);
  console.table(K.map(({ sku, priceGross, revenue, product, contribution, contributionPct }) => ({ sku, priceGross, revenue, product, contribution, pct: contributionPct && +(contributionPct * 100).toFixed(1) })));
}
