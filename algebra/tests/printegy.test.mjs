// Printegy provider: sandbox by default, read-only probe, multipart order form, status polling. No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerFor } from '../worker/src/fulfillment/provider.js';
import { printegyProvider, orderForm, readOrder } from '../worker/src/fulfillment/printegy.js';
import { SKU } from '../worker/src/fulfillment/mapping.js';
import { allVariants } from '../data/catalog.mjs';

const G = allVariants().find((v) => v.productId.startsWith('ALG-G-') && v.color === 'black' && v.size === 'L').sku;
const order = (extra = {}) => ({ number: 'A-1', name: 'Test Kunde', items_json: JSON.stringify([{ sku: G, qty: 2 }]), address_json: JSON.stringify({ line1: 'Musterstr. 1', postal_code: '10115', city: 'Berlin', country: 'DE' }), ...extra });
const fake = (routes) => async (url, init = {}) => {
  const path = new URL(url).pathname.replace('/api/v1', '');
  const hit = routes[`${init.method || 'GET'} ${path}`];
  if (!hit) return new Response('{"success":false}', { status: 404 });
  return new Response(JSON.stringify({ success: true, data: typeof hit === 'function' ? hit(init) : hit }), { status: 200 });
};

test('FULFILLMENT_PROVIDER=printegy stays a sandbox without PRINTEGY_SANDBOX=false or without a key', () => {
  assert.equal(providerFor({ FULFILLMENT_PROVIDER: 'printegy' }).name, 'printegy-sandbox');
  assert.equal(providerFor({ FULFILLMENT_PROVIDER: 'printegy', PRINTEGY_API_KEY: 'k' }).sandbox, true);
  assert.equal(providerFor({ FULFILLMENT_PROVIDER: 'printegy', PRINTEGY_API_KEY: 'k', PRINTEGY_SANDBOX: 'false' }).name, 'printegy');
});

test('probe is read only and reports shops and product SKUs; a refused token is reported, not thrown', async () => {
  const seen = [];
  const p = printegyProvider({ PRINTEGY_API_KEY: 'k' }, async (url, init = {}) => { seen.push(`${init.method || 'GET'} ${url}`); return fake({ 'GET /shops': [{ id: 7, name: 'Algebra' }], 'GET /products': [{ id: 1, title: 'Euler', variants: [{ sku: 'PX-1', color: 'Khaki', size: 'L' }] }] })(url, init); });
  const r = await p.probe();
  assert.equal(r.ok, true);
  assert.deepEqual(r.shops, [{ id: 7, name: 'Algebra' }]);
  assert.equal(r.products[0].variants[0].sku, 'PX-1');
  assert.ok(seen.every((s) => s.startsWith('GET ')));
  const bad = await printegyProvider({ PRINTEGY_API_KEY: 'k' }, async () => new Response('no', { status: 401 })).probe();
  assert.equal(bad.ok, false);
  assert.match(bad.error, /token refused/);
});

test('every live Graphic Series variant has its Printegy SKU (stc_<colour>-<size>-<shop product>)', () => {
  const gs = allVariants().filter((v) => v.productId.startsWith('ALG-G-') && v.purchasable);
  assert.ok(gs.length > 0);
  for (const v of gs) assert.match(SKU.printegy[v.sku]?.supplierSku || '', /^st[cm]_(black|french_navy|khaki|natural_raw)-(XS|S|M|L|XL|XXL)-\d+$/, v.sku);
});

test('sandbox never posts an order', async () => {
  let posted = false;
  const p = printegyProvider({ PRINTEGY_API_KEY: 'k' }, async (u, i = {}) => { if (i.method === 'POST') posted = true; return new Response('{}'); });
  const r = await p.createOrder(order());
  assert.match(r.supplierOrderId, /^SBX-/);
  assert.equal(posted, false);
});

test('live order refuses a variant without confirmed Printegy SKU, then sends the documented multipart form', async () => {
  const env = { PRINTEGY_API_KEY: 'k', PRINTEGY_SANDBOX: 'false', PRINTEGY_SHOP_ID: '7' };
  await assert.rejects(printegyProvider(env, fake({})).createOrder(order()), (e) => e.kind === 'sku');
  const saved = SKU.printegy[G];
  SKU.printegy[G] = { supplierSku: 'PX-1', status: 'confirmed' };
  try {
    // product-level status must be confirmed too
    const { PRINTEGY } = await import('../worker/src/fulfillment/mapping.js');
    const prev = PRINTEGY.graphic.status;
    PRINTEGY.graphic.status = 'confirmed';
    let form;
    const p = printegyProvider(env, fake({ 'POST /orders': (init) => { form = init.body; return { id: 991, status: { id: 1, name: 'Neu' } }; } }));
    const r = await p.createOrder(order());
    assert.equal(r.supplierOrderId, '991');
    assert.equal(form.get('shop_id'), '7');
    assert.equal(form.get('shipping[country_code]'), 'DE');
    assert.equal(form.get('shipping[country]'), 'Germany');
    assert.equal(form.get('items[0][sku]'), 'PX-1');
    assert.equal(form.get('items[0][quantity]'), '2');
    PRINTEGY.graphic.status = prev;
  } finally {
    SKU.printegy[G] = saved;
  }
});

test('polled order: status name and DHL tracking become Algebra status and tracking', () => {
  assert.equal(readOrder({ status: { id: 3, name: 'In Produktion' } }).status, 'production');
  const s = readOrder({ status: { id: 5, name: 'Versendet' }, dhl_tracking_number: '00340434' });
  assert.equal(s.status, 'shipped');
  assert.equal(s.carrier, 'DHL');
  assert.match(s.trackingUrl, /piececode=00340434/);
  assert.throws(() => orderForm(order({ address_json: null }), '7'), (e) => e.kind === 'address');
});

test('XS and S go to the smaller-print shop product where one exists; olive and ivory are mapped', () => {
  assert.equal(SKU.printegy['ALG-G-06-EULER-U-IVO-XS'].supplierSku, 'stc_natural_raw-XS-359655');
  assert.equal(SKU.printegy['ALG-G-06-EULER-U-OLV-M'].supplierSku, 'stc_khaki-M-358377');
  assert.equal(SKU.printegy['ALG-G-13-FEYNMAN-U-BLK-S'].supplierSku, 'stc_black-S-360028');
  assert.equal(SKU.printegy['ALG-G-13-FEYNMAN-U-BLK-M'].supplierSku, 'stc_black-M-358373');
});

test('women straight cut (R) maps to the MUSER shop products, XS-XL only', () => {
  assert.equal(SKU.printegy['ALG-G-14-MOBIUS-R-DNV-XS'].supplierSku, 'stm_french_navy-XS-360024');
  assert.equal(SKU.printegy['ALG-G-11-HIGGS-R-IVO-XL'].supplierSku, 'stm_natural_raw-XL-360085');
  assert.equal(SKU.printegy['ALG-G-07-LORENZ-R-OLV-M'].supplierSku, 'stm_khaki-M-360009');
  assert.equal(SKU.printegy['ALG-G-07-LORENZ-R-BLK-XXL'], undefined);
});
