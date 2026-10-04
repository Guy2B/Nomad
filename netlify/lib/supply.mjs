/**
 * Supply audit: for every CJ product of the catalogues (and the GLOW/KIN
 * prospects), where CJ holds stock — Germany, another EU warehouse, China —
 * and what delivery to Germany and France costs and takes from each of them.
 *
 * CJ allows about one call per second and a Worker request only a few dozen
 * sub-requests, so the admin runs it in small batches; results are kept in
 * audit/supply and shown in the admin.
 */
import { allStores, supplierLines } from './catalog.mjs';
import { CJError, accessToken } from './cj.mjs';
import prospects from '../../stores/prospects.json' with { type: 'json' };

const API = 'https://developers.cjdropshipping.com/api2.0/v1';
const KEY = 'audit/supply';
const EU = ['DE', 'PL', 'CZ', 'FR', 'NL', 'BE', 'AT', 'ES', 'IT', 'PT', 'HU', 'SK', 'SE', 'DK', 'IE'];
const DESTINATIONS = ['DE', 'FR'];
export const BATCH = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One entry per CJ product, with every catalogue line (or prospect) that uses it. */
export function auditItems() {
  const items = new Map();
  const add = (pid, base, use) => {
    const it = items.get(pid) ?? { pid, ...base, usedIn: [] };
    it.usedIn.push(use);
    items.set(pid, it);
  };
  for (const s of allStores()) {
    for (const p of s.products) {
      if (!p.active) continue;
      for (const c of supplierLines(p)) {
        const sup = c.supplier;
        if (!sup?.cjProductId) continue;
        add(sup.cjProductId, { sku: sup.cjSku || '', vid: sup.cjVid || '', costCents: sup.costCents ?? null }, {
          brand: s.site.brand,
          product: p.name,
          part: c.key === 'main' ? null : c.name,
          priceCents: p.price,
        });
      }
    }
  }
  for (const p of prospects) {
    add(p.cjProductId, { sku: p.cjSku || '', vid: '', costCents: null }, {
      brand: p.brand,
      product: p.name,
      part: null,
      priceCents: p.targetCents,
      prospect: true,
    });
  }
  return [...items.values()];
}

/** "3-7" → { min: 3, max: 7 }. */
export function agingDays(aging) {
  const n = String(aging ?? '').match(/\d+/g)?.map(Number) ?? [];
  return n.length ? { min: Math.min(...n), max: Math.max(...n) } : null;
}

/** The variant the catalogue uses: same vid, else same/prefixed SKU, else the first. */
export function pickVariant(variants, { vid, sku }) {
  if (!variants?.length) return null;
  return (
    (vid && variants.find((v) => v.vid === vid)) ||
    (sku && variants.find((v) => v.variantSku === sku)) ||
    (sku && variants.find((v) => String(v.variantSku || '').startsWith(sku))) ||
    variants[0]
  );
}

/** Stock per warehouse country for one variant (falls back to the product totals). */
export function stockByCountry(inv, vid) {
  const out = {};
  const variant = inv?.variantInventories?.find((v) => v.vid === vid);
  if (variant?.inventory?.length) {
    for (const i of variant.inventory) out[i.countryCode] = (out[i.countryCode] ?? 0) + (Number(i.totalInventory) || 0);
  } else {
    for (const i of inv?.inventories ?? []) out[i.countryCode] = (out[i.countryCode] ?? 0) + (Number(i.totalInventoryNum) || 0);
  }
  return out;
}

/** Warehouses worth quoting: Germany, then the best-stocked other EU one, then China. */
export function originsFor(stock) {
  const eu = EU.filter((c) => c !== 'DE' && stock[c] > 0).sort((a, b) => stock[b] - stock[a]);
  return [...(stock.DE > 0 ? ['DE'] : []), ...eu.slice(0, 1), ...(stock.CN > 0 || !Object.keys(stock).length ? ['CN'] : [])];
}

export const verdictOf = (stock) => (stock.DE > 0 ? 'DE' : EU.some((c) => stock[c] > 0) ? 'EU' : 'CN');

/** Cheapest and fastest quotes among CJ's shipping options. */
export function bestQuotes(options) {
  const list = (options ?? [])
    .map((o) => ({ name: o.logisticName, priceUsd: Number(o.logisticPrice), days: agingDays(o.logisticAging) }))
    .filter((o) => o.name && Number.isFinite(o.priceUsd) && o.days);
  if (!list.length) return null;
  const cheapest = [...list].sort((a, b) => a.priceUsd - b.priceUsd || a.days.max - b.days.max)[0];
  const fastest = [...list].sort((a, b) => a.days.max - b.days.max || a.priceUsd - b.priceUsd)[0];
  return { cheapest, fastest };
}

async function cj(token, path, body) {
  await sleep(1100);
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'CJ-Access-Token': token, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.result === false || data.success === false) throw new CJError(data?.message || `CJ HTTP ${res.status}`);
  return data.data;
}

export async function auditOne(item, token) {
  const product = await cj(token, `/product/query?pid=${encodeURIComponent(item.pid)}`);
  const variant = pickVariant(product?.variants, item);
  if (!variant) throw new CJError('product not found');
  const inv = await cj(token, `/product/stock/getInventoryByPid?pid=${encodeURIComponent(item.pid)}`);
  const stock = stockByCountry(inv, variant.vid);
  const routes = [];
  for (const from of originsFor(stock)) {
    for (const to of DESTINATIONS) {
      try {
        const quotes = bestQuotes(
          await cj(token, '/logistic/freightCalculate', { startCountryCode: from, endCountryCode: to, products: [{ quantity: 1, vid: variant.vid }] }),
        );
        routes.push({ from, to, ...(quotes ?? { error: 'no-route' }) });
      } catch (err) {
        routes.push({ from, to, error: err.message });
      }
    }
  }
  return {
    pid: item.pid,
    usedIn: item.usedIn,
    vid: variant.vid,
    variantSku: variant.variantSku,
    variantName: variant.variantNameEn || '',
    weightG: Number(variant.variantWeight) || null,
    sellPriceUsd: Number(variant.variantSellPrice) || null,
    productName: product.productNameEn || '',
    stock,
    verdict: verdictOf(stock),
    routes,
    checkedAt: new Date().toISOString(),
  };
}

/** Runs one batch from `cursor` (0 starts a fresh audit) and returns the progress. */
export async function auditBatch(store, cursor = 0) {
  const items = auditItems();
  const saved = cursor === 0 ? { startedAt: new Date().toISOString(), results: {} } : ((await store.get(KEY, { type: 'json' })) ?? { results: {} });
  const token = await accessToken(store);
  for (const item of items.slice(cursor, cursor + BATCH)) {
    try {
      saved.results[item.pid] = await auditOne(item, token);
    } catch (err) {
      saved.results[item.pid] = { pid: item.pid, usedIn: item.usedIn, error: err.message, checkedAt: new Date().toISOString() };
    }
  }
  const next = cursor + BATCH;
  saved.finishedAt = next >= items.length ? new Date().toISOString() : null;
  await store.setJSON(KEY, saved);
  return { total: items.length, next: Math.min(next, items.length), done: next >= items.length };
}

export const supplyAudit = (store) => store.get(KEY, { type: 'json' });
