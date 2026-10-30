/**
 * PRIVATE supplier mapping: Algebra product → provider product, variants, status, costs.
 * Server side only. Never imported by scripts/build.mjs or site/* (tests check it), never sent by a public endpoint.
 * Only GET /api/admin/fulfillment (Bearer ADMIN_TOKEN) returns it.
 *
 * type SupplierMapping = {
 *   algebraProductId, provider: 'valadio' | 'a61', supplierBrand?, supplierProductId?, supplierProduct?,
 *   status: 'candidate' | 'pending_confirmation' | 'confirmed' | 'disabled',
 *   method, cost: { garment, decoration, source }, needs_verification, note?,
 *   variants: [{ algebraVariantId, supplierSku?, status }]   (built from SKU below)
 * }
 *
 * A real provider order is only possible when the product AND the variant are 'confirmed' and the supplierSku is known.
 */

export const STATUS = ['candidate', 'pending_confirmation', 'confirmed', 'disabled'];
const unknownCost = { garment: null, decoration: null, source: 'needs_verification' };

/** Target provider: Valadio. Nothing is confirmed yet (no API access, no price list, no test order). */
export const VALADIO = {
  'ALG-M-POLO': {
    supplierBrand: "SOL'S",
    supplierProduct: 'PASADENA MEN',
    supplierProductId: '00577',
    status: 'candidate',
    method: 'embroidery',
    needs_verification: true,
    note: 'Priority candidate. Tipped (contrast) collar. Colours to examine: Black/White, French Navy/White, White/Navy, Grey/Navy, Forest Green/White. Publish nothing before SKU, sizes, colours, stock, composition, weight, embroidery and Valadio availability are confirmed. If chosen: new photo boards with the tipped collar (the current photos show a plain collar).',
    cost: unknownCost,
  },
  'ALG-W-POLO': {
    supplierBrand: "SOL'S",
    supplierProduct: 'PASADENA WOMEN',
    supplierProductId: '00578',
    status: 'candidate',
    method: 'embroidery',
    needs_verification: true,
    note: 'Same rules as ALG-M-POLO.',
    cost: unknownCost,
  },
  'ALG-M-TEE': {
    supplierBrand: "SOL'S",
    supplierProduct: null,
    supplierProductId: null,
    candidates: ['MILLENIUM', 'LYAM'],
    status: 'candidate',
    method: 'embroidery',
    needs_verification: true,
    note: 'Compare weight, cut, cotton, black / navy / ivory-ecru, men + women, back print area, DTG/DTF, removable or hideable supplier label. The current tee stays until a better reference is confirmed.',
    cost: unknownCost,
  },
  'ALG-W-TEE': { supplierBrand: "SOL'S", supplierProduct: null, supplierProductId: null, candidates: ['women versions of the chosen tee'], status: 'candidate', method: 'embroidery', needs_verification: true, cost: unknownCost },
  'ALG-M-SWEAT': { supplierBrand: null, supplierProduct: null, supplierProductId: null, candidates: ['heavy crewneck sweatshirt (fleece)'], status: 'candidate', method: 'embroidery', needs_verification: true, note: 'The Sweat: fleece sweatshirt. Never presented as knitwear.', cost: unknownCost },
  'ALG-W-SWEAT': { supplierBrand: null, supplierProduct: null, supplierProductId: null, candidates: ['women crewneck sweatshirt (fleece)'], status: 'candidate', method: 'embroidery', needs_verification: true, cost: unknownCost },
  'ALG-M-KNIT': {
    supplierBrand: null,
    supplierProduct: null,
    supplierProductId: null,
    candidates: ['Valadio / Solo Group (SOL\'S, NEOBLU) or other: fine gauge crewneck knit, premium cotton or wool blend, men + women'],
    status: 'candidate',
    method: 'embroidery',
    needs_verification: true,
    note: 'The Knit: real knitted fabric (fine gauge). Palette: Black, Deep Navy, Ivory, Ecru, Warm Grey, possibly dark Forest Green. Not published until a reference is chosen.',
    cost: unknownCost,
  },
  'ALG-W-KNIT': { supplierBrand: null, supplierProduct: null, supplierProductId: null, candidates: ['as ALG-M-KNIT, women cut'], status: 'candidate', method: 'embroidery', needs_verification: true, cost: unknownCost },
  graphic: {
    supplierBrand: null,
    supplierProduct: null,
    supplierProductId: null,
    candidates: ['heavyweight / oversized tee (unisex)', 'women tee'],
    status: 'candidate',
    method: 'dtg_or_dtf',
    needs_verification: true,
    note: 'Full-back print ~35 × 50 cm or the area Valadio confirms. Only print-master files are sent (design/print-master), never design-source.',
    cost: unknownCost,
  },
};

/** Fallback provider A61: kept, DISABLED by default, never used unless FULFILLMENT_PROVIDER=a61. Costs = legacy_reference. */
export const A61 = {
  'ALG-M-POLO': { supplierBrand: 'Stanley/Stella', supplierProduct: 'PREPSTER 2.0', supplierProductId: 'STPU222', a61ArticleId: 8757, status: 'disabled', method: 'embroidery', cost: { net: 17.06, source: 'legacy_reference' } },
  'ALG-M-TEE': { supplierBrand: 'Stanley/Stella', supplierProduct: 'SPARKER 2.0', supplierProductId: 'STTU171', a61ArticleId: 8614, status: 'disabled', method: 'embroidery', cost: { net: 20.08, source: 'legacy_reference' } },
  'ALG-W-TEE': { supplierBrand: 'Stanley/Stella', supplierProduct: 'MUSER', supplierProductId: 'STTW172', a61ArticleId: 8982, status: 'disabled', method: 'embroidery', cost: { net: 18.82, source: 'legacy_reference' } },
  'ALG-M-SWEAT': { supplierBrand: 'Stanley/Stella', supplierProduct: 'CHANGER 2.0', supplierProductId: 'STSU178', a61ArticleId: 7867, status: 'disabled', method: 'embroidery', cost: { net: 25.92, source: 'legacy_reference' } },
  'ALG-W-SWEAT': { supplierBrand: 'Stanley/Stella', supplierProduct: 'ALMA', supplierProductId: 'STSW212', a61ArticleId: 8868, status: 'disabled', method: 'print', cost: { net: 16.72, source: 'legacy_reference' } },
  graphic: { supplierBrand: 'Stanley/Stella', supplierProduct: 'BLASTER 2.0 (2-sided print)', supplierProductId: 'STTU959', a61ArticleId: 8896, status: 'disabled', method: 'print', cost: { net: 14.37, source: 'legacy_reference' } },
};

/**
 * Printegy (test order 30.10.2026, not yet an active provider): blank per Graphic Series cut and the supplier colour
 * used for each Algebra colour. Same blanks and colours as the product images (scripts/cuts.py). Exact SKUs: dashboard only.
 */
export const PRINTEGY_GRAPHIC_CUTS = {
  unisex: { supplierBrand: 'Stanley/Stella', supplierProduct: 'CREATOR 2.0', supplierProductId: 'STTU169', print: 'DTF', colors: { black: 'Black', 'deep-navy': 'French Navy', olive: 'Khaki', ivory: 'Natural Raw' } },
  oversize: { supplierBrand: 'Stanley/Stella', supplierProduct: 'Oversize (BLASTER 2.0)', supplierProductId: 'STTU959', print: 'DTF', colors: { black: 'Black', 'deep-navy': 'French Navy', olive: 'Khaki', ivory: 'Natural Raw' } },
  women: { supplierBrand: 'B&C', supplierProduct: '#E190 /women', supplierProductId: 'TW04T', print: 'DTF', colors: { black: 'Black', 'deep-navy': 'Navy', olive: 'Urban Khaki', ivory: 'Natural' } },
  'women-straight': { supplierBrand: 'Stanley/Stella', supplierProduct: 'MUSER', supplierProductId: 'STTW172', print: 'DTG', colors: { black: 'Black', 'deep-navy': 'French Navy', olive: 'Khaki', ivory: 'Natural Raw' } },
};

/** Exact supplier SKU and status per Algebra variant SKU (filled only from the provider's catalogue). */
export const SKU = {
  valadio: {
    // 'ALG-M-POLO-BLK-M': { supplierSku: '…', status: 'confirmed' },
  },
  a61: {},
};

/** Print-master files per design (high resolution for the confirmed print area). None exists yet. */
export const PRINT_MASTER = {
  // 'mandelbrot': 'https://…/print-master/mandelbrot.png'
};

export const PROVIDERS = { valadio: VALADIO, a61: A61 };

export function productIdOf(algebraSku) {
  const m = String(algebraSku).match(/^(ALG-[MW]-[A-Z]+|ALG-G-\d{2}-[A-Z]+)/);
  return m ? m[1] : null;
}

/** Mapping entry for an Algebra variant SKU and provider, or null. */
export function mappingFor(algebraSku, provider = 'valadio') {
  const id = productIdOf(algebraSku);
  const table = PROVIDERS[provider];
  if (!id || !table) return null;
  const key = id.startsWith('ALG-G-') ? 'graphic' : id;
  const m = table[key];
  if (!m) return null;
  const v = SKU[provider]?.[algebraSku] || { supplierSku: null, status: m.status === 'disabled' ? 'disabled' : 'candidate' };
  return { algebraProductId: id, provider, ...m, variant: { algebraVariantId: algebraSku, ...v } };
}

export function supplierSkuFor(algebraSku, provider = 'valadio') {
  return SKU[provider]?.[algebraSku]?.supplierSku || null;
}

/** A real provider order is possible only for confirmed product + confirmed variant + known supplier SKU. */
export function isConfirmed(algebraSku, provider = 'valadio') {
  const m = mappingFor(algebraSku, provider);
  return Boolean(m && m.status === 'confirmed' && m.variant.status === 'confirmed' && m.variant.supplierSku);
}

/** Admin view: SupplierMapping[] for a list of Algebra SKUs. */
export function supplierMappings(skus, provider = 'valadio') {
  const byProduct = new Map();
  for (const sku of skus) {
    const m = mappingFor(sku, provider);
    if (!m) continue;
    const { variant, ...rest } = m;
    if (!byProduct.has(m.algebraProductId)) byProduct.set(m.algebraProductId, { ...rest, variants: [] });
    byProduct.get(m.algebraProductId).variants.push(variant);
  }
  return [...byProduct.values()];
}
