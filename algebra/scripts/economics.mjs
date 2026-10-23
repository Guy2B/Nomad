/**
 * Unit economics per SKU (product × cut), from data/catalog.mjs.
 * Writes docs/ECONOMICS.md and data/economics.json. Run: npm run economics
 *
 * Every number is one of:
 *   SUPPLIER   published by A61 (source in data/catalog.mjs / docs/SUPPLIERS.md)
 *   POLICY     an Algebra decision (price hypothesis, shipping fee), change it in data/catalog.mjs
 *   ASSUMPTION a modelling assumption, change it below; never presented as a fact
 *   TO VERIFY  unknown; the SKU's result is then flagged instead of invented
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blanks, products, shipping } from '../data/catalog.mjs';

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
};

const r2 = (n) => Math.round(n * 100) / 100;
const eur = (n) => (n == null ? 'TO VERIFY' : `${n.toFixed(2).replace('.', ',')} €`);
const pct = (n) => (n == null ? 'TO VERIFY' : `${(n * 100).toFixed(0)} %`);

/** One-unit order to Germany. mode 'K' = Kleinunternehmer (§ 19 UStG, no VAT charged, input VAT not deductible), 'V' = regular VAT. */
export function unit(p, cut, mode = 'K', zone = 'DE', a = ASSUMPTIONS) {
  const b = blanks[cut ? cut.blank : p.blank];
  const opt = b.a61[p.decoration.option];
  const z = shipping.zones[zone];
  const shipFee = p.price >= z.freeFrom ? 0 : z.fee;
  const gross = p.price + shipFee; // what the customer pays
  const revenue = mode === 'K' ? gross : gross / (1 + VAT);
  const k = mode === 'K' ? 1 + VAT : 1; // supplier invoices carry 19 % VAT; not recoverable for a Kleinunternehmer
  const product = opt ? opt.net * k : null;
  const label = a.neckLabelNet * k;
  const ship = (z.supplierCostNet + shipping.packagingNetPerShipment) * k;
  const pay = gross * a.paymentPct + a.paymentFixed;
  const payWorst = gross * a.paymentPctWorst + a.paymentFixedWorst;
  const returns = product == null ? null : a.returnRate * (shipFee + (product + label) * (1 - a.returnRecovery) + a.returnHandling);
  const contribution = product == null ? null : revenue - product - label - ship - pay - returns;
  const contributionWorst = product == null ? null : revenue - product - label - ship - payWorst - returns;
  return {
    sku: p.id + (cut ? `-${cut.id === 'women' ? 'W' : 'U'}` : ''),
    name: p.name.en + (cut ? ` (${cut.name.en})` : ''),
    blank: b.label,
    status: p.status,
    mode,
    zone,
    priceGross: p.price,
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
  return products.flatMap((p) => (p.cuts ? p.cuts.map((c) => unit(p, c, mode, zone)) : [unit(p, null, mode, zone)]));
}

function md(rows, title) {
  const head =
    '| SKU | Product | Status | Price | Ship fee | Net revenue | Product + deco | Neck label | Shipping | Payment | Return prov. | **Contribution** | % | Worst pay mix | Break-even CAC |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
  const lines = rows.map(
    (r) =>
      `| ${r.sku} | ${r.name} | ${r.status} | ${eur(r.priceGross)} | ${eur(r.shipFee)} | ${eur(r.revenue)} | ${eur(r.product)} | ${eur(r.label)} | ${eur(r.ship)} | ${eur(r.pay)} | ${eur(r.returns)} | **${eur(r.contribution)}** | ${pct(r.contributionPct)} | ${eur(r.contributionWorst)} | ${eur(r.breakEvenCac)} |`,
  );
  return `### ${title}\n\n${head}\n${lines.join('\n')}\n`;
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
