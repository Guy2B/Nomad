import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { allVariants, blanks, colors, products } from '../data/catalog.mjs';
import { mappingFor } from '../worker/src/fulfillment/mapping.js';
import { table } from '../scripts/economics.mjs';

const root = join(import.meta.dirname, '..');

test('SKUs are unique', () => {
  const skus = allVariants().map((v) => v.sku);
  assert.equal(new Set(skus).size, skus.length);
});

test('every graphic variant points to existing print files', () => {
  for (const v of allVariants().filter((x) => x.printFile && x.purchasable)) {
    assert.ok(existsSync(join(root, v.printFile.front)), v.printFile.front);
    assert.ok(existsSync(join(root, v.printFile.source)), v.printFile.source);
  }
});

test('every purchasable variant has a fulfillment mapping; the others are blocked', () => {
  for (const p of products) {
    const vs = allVariants().filter((v) => v.productId === p.id);
    if (p.status === 'PREVIEW') for (const v of vs) assert.ok(mappingFor(v.sku), `${v.sku} has no fulfillment mapping`);
    else assert.equal(vs.filter((v) => v.purchasable).length, 0);
  }
});

test('no supplier name, blank name or supplier SKU in the public catalogue', () => {
  const pub = JSON.stringify({ products, colors, variants: allVariants() });
  assert.doesNotMatch(pub, /a61|stanley|stella|sol['’]s|valadio|pasadena|00577|00578|supplierSku|supplierArticle/i);
});

test('prices stay inside the brief ranges (hypotheses)', () => {
  const range = { polos: [69, 99], sweaters: [79, 119], 't-shirts': [49, 79] };
  for (const p of products.filter((x) => x.price != null)) {
    const [lo, hi] = range[p.category];
    assert.ok(p.price >= lo && p.price <= hi, `${p.id} ${p.price}`);
  }
});

test('economics: no invented margin for unknown costs', () => {
  for (const r of table('K', 'DE')) {
    if (r.costSource === 'TO VERIFY') assert.equal(r.contribution, null, r.sku);
    else assert.ok(r.contribution > 0, r.sku);
  }
});

test('colour palette is the short brand palette', () => {
  assert.deepEqual(Object.keys(colors).sort(), ['black', 'burgundy', 'deep-navy', 'ivory', 'sage', 'taupe']);
});
