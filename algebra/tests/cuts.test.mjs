// Graphic Series cuts: every cut is sold with the price and the images of its own blank.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { products, variantsOf, priceOf, minPrice } from '../data/catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const graphics = products.filter((p) => p.line === 'graphic' && p.status === 'PREVIEW');

test('four cuts, unique SKU letters, oversize priced on its own', () => {
  for (const p of graphics) {
    assert.deepEqual(p.cuts.map((c) => c.id), ['unisex', 'oversize', 'women', 'women-straight']);
    assert.equal(new Set(p.cuts.map((c) => c.code)).size, 4);
    assert.equal(priceOf(p, 'oversize'), 75);
    assert.equal(priceOf(p, 'unisex'), p.price);
    assert.equal(minPrice(p), p.price);
    const skus = variantsOf(p).map((v) => v.sku);
    assert.equal(new Set(skus).size, skus.length);
    assert.ok(variantsOf(p).filter((v) => v.cut === 'oversize').every((v) => v.price === 75));
  }
});

test('each extra cut has its own image in every colour (the product shown is the product delivered)', () => {
  for (const p of graphics)
    for (const c of p.cuts.slice(1))
      for (const col of p.colors) assert.ok(existsSync(join(root, 'site/assets/photos', `${p.slug}-${c.id}-${col}-stage.jpg`)), `${p.slug} ${c.id} ${col}`);
});
