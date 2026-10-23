/**
 * PRIVATE fulfillment mapping: Algebra product → provider product and SKUs, costs, print method.
 * Server side only. Never import this file from scripts/build.mjs or anything under site/ (a test checks it).
 * The storefront only knows Algebra IDs (ALG-M-POLO, ALG-M-POLO-BLK-M …).
 *
 * Status of every field:
 *   confirmed: false  → candidate only; must be confirmed in the Valadio catalogue (API or account) before live sales.
 *   supplierSku: null → not known yet; a live order with this variant is refused and goes to the admin (needs_attention).
 */

export const PROVIDER = 'valadio';

/** colour code in Algebra SKUs → supplier colour name (to be matched to the Valadio colour list) */
const COLOR_HINT = { BLK: 'Black', DNV: 'French Navy', IVO: 'Off White / Natural (TO MATCH)' };

/**
 * Per Algebra product: the base garment we intend to use through Valadio.
 * method: embroidery | dtg | dtf | screen | sublimation | flex  (how Valadio decorates; confirm per product)
 * cost: net EUR per piece from Valadio, null until their price list / API returns it.
 */
export const MAPPING = {
  'ALG-M-POLO': {
    provider: PROVIDER,
    supplierBrand: "SOL'S",
    supplierProduct: 'PASADENA MEN',
    supplierProductId: '00577',
    confirmed: false,
    method: 'embroidery',
    note: 'Tipped (contrast) collar polo. Palette wanted: Black/White, French Navy/White, White/Navy, Grey/Navy, Forest Green/White. Publish a colour only once its exact SKU is confirmed. Current site colours (black, navy, ivory, plain collar) do not match this blank yet.',
    cost: { garment: null, decoration: null },
  },
  'ALG-W-POLO': {
    provider: PROVIDER,
    supplierBrand: "SOL'S",
    supplierProduct: 'PASADENA WOMEN',
    supplierProductId: '00578',
    confirmed: false,
    method: 'embroidery',
    note: 'Women version of the tipped collar polo. Same palette rule as ALG-M-POLO.',
    cost: { garment: null, decoration: null },
  },
  'ALG-M-TEE': {
    provider: PROVIDER,
    supplierBrand: null,
    supplierProduct: null,
    supplierProductId: null,
    candidates: ["SOL'S MILLENIUM", "SOL'S LYAM", 'other heavyweight references in the Valadio catalogue'],
    confirmed: false,
    method: 'embroidery',
    note: 'Choose after comparing weight, hand feel, black/navy/off-white availability, men + women, tear-away or relabel option.',
    cost: { garment: null, decoration: null },
  },
  'ALG-W-TEE': {
    provider: PROVIDER,
    supplierBrand: null,
    supplierProduct: null,
    supplierProductId: null,
    candidates: ["SOL'S women versions of the chosen men tee"],
    confirmed: false,
    method: 'embroidery',
    cost: { garment: null, decoration: null },
  },
  'ALG-M-CREW': {
    provider: PROVIDER,
    supplierBrand: null,
    supplierProduct: null,
    supplierProductId: null,
    candidates: ["SOL'S heavy crewneck sweatshirts"],
    confirmed: false,
    method: 'embroidery',
    note: 'This is The Sweat (fleece sweatshirt), not The Knit.',
    cost: { garment: null, decoration: null },
  },
  'ALG-W-CREW': {
    provider: PROVIDER,
    supplierBrand: null,
    supplierProduct: null,
    supplierProductId: null,
    candidates: ["SOL'S women crewneck sweatshirts"],
    confirmed: false,
    method: 'embroidery',
    cost: { garment: null, decoration: null },
  },
  // Reserved for a real knitwear line (fine gauge crewneck). Not on the site until a reference is confirmed.
  'ALG-M-KNIT': { provider: PROVIDER, candidates: ['SOL\'S / NEOBLU knitwear (Solo Group)'], confirmed: false, method: 'embroidery', reserved: true, cost: { garment: null, decoration: null } },
  'ALG-W-KNIT': { provider: PROVIDER, candidates: ['SOL\'S / NEOBLU knitwear (Solo Group)'], confirmed: false, method: 'embroidery', reserved: true, cost: { garment: null, decoration: null } },
};

/** Graphic Series tees: one mapping for every design (same base garments, different back print file). */
export const GRAPHIC = {
  provider: PROVIDER,
  cuts: {
    unisex: { supplierBrand: null, supplierProduct: null, candidates: ["SOL'S heavyweight / oversized tee in the Valadio catalogue"], confirmed: false },
    women: { supplierBrand: null, supplierProduct: null, candidates: ["SOL'S women tee"], confirmed: false },
  },
  method: 'dtg', // or dtf: full-back print about 35 × 50 cm, chest symbol; confirm technique and max print area
  cost: { garment: null, decoration: null },
};

/**
 * Exact supplier SKU per Algebra variant SKU. Filled in once the Valadio catalogue is available.
 * Example (DO NOT USE until confirmed): 'ALG-M-POLO-BLK-M': '00577-…'
 */
export const SKU = {};

/** Previous supplier offer (A61, 23.10.2026), kept only as a cost reference for the margin check. Not used for orders. */
export const PREVIOUS_A61 = {
  'ALG-M-POLO': { blank: 'Stanley/Stella PREPSTER 2.0 STPU222', net: 17.06 },
  'ALG-M-TEE': { blank: 'Stanley/Stella SPARKER 2.0 STTU171', net: 20.08 },
  'ALG-W-TEE': { blank: 'Stella MUSER STTW172', net: 18.82 },
  'ALG-M-CREW': { blank: 'Stanley/Stella CHANGER 2.0 STSU178', net: 25.92 },
  'ALG-W-CREW': { blank: 'Stella ALMA STSW212 (print only)', net: 16.72 },
  graphic: { blank: 'Stanley/Stella BLASTER 2.0 STTU959 (2-sided print)', net: 14.37 },
};

const productIdOf = (algebraSku) => {
  const m = String(algebraSku).match(/^(ALG-[MW]-[A-Z]+|ALG-G-\d{2}-[A-Z]+)/);
  return m ? m[1] : null;
};

/** Mapping entry for an Algebra variant SKU, or null if the product is unknown. */
export function mappingFor(algebraSku) {
  const id = productIdOf(algebraSku);
  if (!id) return null;
  if (id.startsWith('ALG-G-')) {
    const cut = /-W-/.test(algebraSku.slice(id.length)) ? 'women' : 'unisex';
    return { productId: id, ...GRAPHIC, ...GRAPHIC.cuts[cut], cut };
  }
  return MAPPING[id] ? { productId: id, ...MAPPING[id] } : null;
}

/** Supplier SKU for an Algebra SKU, or null if not confirmed yet. */
export function supplierSkuFor(algebraSku) {
  return SKU[algebraSku] || null;
}

/** True when the variant can be ordered for real (product confirmed AND exact SKU known). */
export function isConfirmed(algebraSku) {
  const m = mappingFor(algebraSku);
  return Boolean(m && m.confirmed && supplierSkuFor(algebraSku));
}

export const colorHint = (code) => COLOR_HINT[code] || null;
