// Graphic Series cuts: every cut is sold with the price and the images of its own blank.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { products, variantsOf, priceOf, minPrice, graphicCuts } from '../data/catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const graphics = products.filter((p) => p.line === 'graphic' && p.status === 'PREVIEW');

test('only live cuts are sold (unisex until real photos of the other cuts exist), unique SKU letters', () => {
  assert.equal(new Set(graphicCuts.map((c) => c.code)).size, graphicCuts.length);
  for (const p of graphics) {
    assert.deepEqual(p.cuts.map((c) => c.id), graphicCuts.filter((c) => c.live !== false).map((c) => c.id));
    assert.equal(priceOf(p, 'unisex'), p.price);
    assert.equal(minPrice(p), Math.min(...p.cuts.map((c) => c.price ?? p.price)));
    const skus = variantsOf(p).map((v) => v.sku);
    assert.equal(new Set(skus).size, skus.length);
    assert.ok(variantsOf(p).every((v) => p.cuts.some((c) => c.id === v.cut)));
  }
});

test('each extra cut has its own image in every colour (the product shown is the product delivered)', () => {
  for (const p of graphics)
    for (const c of p.cuts.slice(1))
      for (const col of p.colors) assert.ok(existsSync(join(root, 'site/assets/photos', `${p.slug}-${c.id}-${col}-stage.jpg`)), `${p.slug} ${c.id} ${col}`);
});
