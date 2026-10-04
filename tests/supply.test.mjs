import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NOMAD_MEMORY_STORE = '1';
const { agingDays, auditItems, auditOne, bestQuotes, originsFor, pickVariant, stockByCountry, verdictOf } = await import(
  '../netlify/lib/supply.mjs'
);

test('audit list: every active catalogue product once per CJ product, plus the GLOW/KIN prospects', () => {
  const items = auditItems();
  assert.equal(new Set(items.map((i) => i.pid)).size, items.length);
  assert.ok(items.some((i) => i.usedIn.some((u) => u.brand === 'GO')));
  assert.equal(items.filter((i) => i.usedIn.some((u) => u.prospect)).length, 24);
});

test('stock: variant figures first, Germany beats other EU warehouses, China last', () => {
  const inv = {
    inventories: [{ countryCode: 'CN', totalInventoryNum: 900 }],
    variantInventories: [{ vid: 'v1', inventory: [{ countryCode: 'DE', totalInventory: 12 }, { countryCode: 'PL', totalInventory: 40 }, { countryCode: 'CN', totalInventory: 500 }] }],
  };
  const stock = stockByCountry(inv, 'v1');
  assert.deepEqual(stock, { DE: 12, PL: 40, CN: 500 });
  assert.deepEqual(originsFor(stock), ['DE', 'PL', 'CN']);
  assert.equal(verdictOf(stock), 'DE');
  assert.equal(verdictOf({ PL: 3, CN: 0 }), 'EU');
  assert.equal(verdictOf(stockByCountry(inv, 'unknown')), 'CN');
});

test('quotes: "3-7" days parsed, cheapest and fastest picked', () => {
  assert.deepEqual(agingDays('3-7'), { min: 3, max: 7 });
  const q = bestQuotes([
    { logisticName: 'Slow', logisticPrice: 2.1, logisticAging: '10-15' },
    { logisticName: 'Fast', logisticPrice: 6.5, logisticAging: '2-4' },
  ]);
  assert.equal(q.cheapest.name, 'Slow');
  assert.equal(q.fastest.name, 'Fast');
  assert.equal(pickVariant([{ vid: 'a', variantSku: 'X-1' }, { vid: 'b', variantSku: 'Y-2' }], { sku: 'Y' }).vid, 'b');
});

test('one product: CJ product, stock and freight from each warehouse to DE and FR', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push([String(url), init?.body ? JSON.parse(init.body) : null]);
    const ok = (data) => new Response(JSON.stringify({ result: true, data }));
    if (String(url).includes('/product/query')) return ok({ productNameEn: 'Pillow', variants: [{ vid: 'v1', variantSku: 'SKU1', variantWeight: 120, variantSellPrice: 2 }] });
    if (String(url).includes('getInventoryByPid')) return ok({ variantInventories: [{ vid: 'v1', inventory: [{ countryCode: 'DE', totalInventory: 5 }, { countryCode: 'CN', totalInventory: 80 }] }] });
    return ok([{ logisticName: 'DHL', logisticPrice: 3.2, logisticAging: '2-4' }]);
  };
  try {
    const r = await auditOne({ pid: 'p1', sku: 'SKU1', vid: '', usedIn: [] }, 'tok');
    assert.equal(r.verdict, 'DE');
    assert.equal(r.routes.length, 4);
    assert.deepEqual(
      r.routes.map((x) => x.from + x.to),
      ['DEDE', 'DEFR', 'CNDE', 'CNFR'],
    );
    assert.equal(calls.filter(([u]) => u.includes('freightCalculate'))[0][1].products[0].vid, 'v1');
  } finally {
    globalThis.fetch = realFetch;
  }
});
