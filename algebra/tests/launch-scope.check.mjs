// Launch scope (owner 10.11.2026), run WITHOUT ALGEBRA_FULL_SCOPE: Graphic Series only, Germany only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products, shipping, allVariants } from '../data/catalog.mjs';

test('launch: only Graphic Series variants are purchasable', () => {
  const lines = new Set(allVariants().filter((v) => v.purchasable).map((v) => products.find((p) => p.id === v.productId).line));
  assert.deepEqual([...lines], ['graphic']);
});
test('launch: delivery to Germany only, delivery time shown', () => {
  assert.deepEqual(shipping.countries, ['DE']);
  assert.equal(shipping.zones.DE.deliveryDays, '5–6');
});
