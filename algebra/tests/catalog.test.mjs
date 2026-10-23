import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { allVariants, blanks, colors, products } from '../data/catalog.mjs';
import { table } from '../scripts/economics.mjs';

const root = join(import.meta.dirname, '..');

test('SKUs are unique', () => {
  const skus = allVariants().map((v) => v.sku);
  assert.equal(new Set(skus).size, skus.length);
});

test('every graphic variant points to existing print files', () => {
  for (const v of allVariants().filter((x) => x.printFile && x.purchasable)) {
    assert.ok(existsSync(join(root, v.printFile.front)), v.printFile.front);
    assert.ok(existsSync(join(root, v.printFile.back)), v.printFile.back);
  }
});

test('purchasable products have a published supplier cost; the others are blocked', () => {
  for (const p of products) {
    const cuts = p.cuts || [{ blank: p.blank }];
    const priced = cuts.every((c) => blanks[c.blank].a61[p.decoration.option]);
    if (p.status === 'PREVIEW') assert.ok(priced, `${p.id} is purchasable without a known cost`);
    else assert.equal(allVariants().filter((v) => v.productId === p.id && v.purchasable).length, 0);
  }
});

test('prices stay inside the brief ranges (hypotheses)', () => {
  const range = { polos: [69, 99], sweaters: [79, 119], 't-shirts': [49, 79] };
  for (const p of products) {
    const [lo, hi] = range[p.category];
    assert.ok(p.price >= lo && p.price <= hi, `${p.id} ${p.price}`);
  }
});

test('economics: no invented margin for unknown costs', () => {
  for (const r of table('K', 'DE')) {
    if (r.status === 'NEEDS_SUPPLIER_APPROVAL') assert.equal(r.contribution, null, r.sku);
    else assert.ok(r.contribution > 0, r.sku);
  }
});

test('colour palette is the short brand palette', () => {
  assert.deepEqual(Object.keys(colors).sort(), ['black', 'burgundy', 'deep-navy', 'ivory', 'sage', 'taupe']);
});
