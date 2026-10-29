// Brand lock: one A, one geometry, everywhere (brand/README.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMaster } from '../scripts/brand-master.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = join(root, 'brand');
const read = (...p) => readFileSync(join(root, ...p), 'utf8');
const master = readMaster();

test('master A: one letter path and an exact equals sign (two identical, parallel bars)', () => {
  const [a, b] = master.bars;
  assert.equal(a[0], b[0], 'same x');
  assert.equal(a[2], b[2], 'same width');
  assert.equal(a[3], b[3], 'same height');
  assert.ok(b[1] - (a[1] + a[3]) > 0, 'bars do not touch');
  assert.ok(!/<(polygon|circle|ellipse|text|filter|image)/.test(read('brand', 'algebra-a-signature-master.svg')), 'no star, triangle, text or effect');
  // the = sits inside the letter, never wider than it
  assert.ok(a[0] > master.box[0] && a[0] + a[2] < master.box[2]);
});

test('ivory master has exactly the master geometry', () => {
  const iv = readMaster(join(brandDir, 'algebra-a-signature-master-ivory.svg'));
  assert.equal(iv.d, master.d);
  assert.deepEqual(iv.bars, master.bars);
});

test('generated files reuse the master geometry (wordmark, favicon, build paths)', () => {
  const paths = JSON.parse(read('brand', 'paths.json'));
  assert.equal(paths.master.d, master.d);
  assert.deepEqual(paths.master.bars, master.bars);
  for (const f of ['wordmark-signature.svg', 'wordmark-signature-ivory.svg', 'favicon.svg', 'circle-seal.svg', 'circle-seal-ivory.svg', 'circle-signature.svg', 'circle-signature-ivory.svg']) {
    const t = read('brand', f);
    assert.ok(t.includes(master.d), `${f} uses the master path`);
    for (const [x, y, w, h] of master.bars) assert.ok(t.includes(`<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`), `${f} uses the master bars`);
    assert.ok(!/scale\([^)]*,[^)]*\)|matrix\(([\d.]+) 0 0 (?!\1 )/.test(t), `${f}: uniform scale only`);
  }
});

test('brand/ holds only the master and what is generated from it', () => {
  const allowed = ['README.md', 'algebra-a-signature-master.svg', 'algebra-a-signature-master-ivory.svg', 'wordmark-signature.svg', 'wordmark-signature-ivory.svg', 'circle-seal.svg', 'circle-seal-ivory.svg', 'circle-signature.svg', 'circle-signature-ivory.svg', 'favicon.svg', 'paths.json', 'production'];
  assert.deepEqual(readdirSync(brandDir).filter((f) => !allowed.includes(f)), []);
  assert.ok(read('brand', 'README.md').includes('One A. One geometry. Everywhere.'));
});

test('no script draws an older symbol: raster uses go through brandmark.py (the master)', () => {
  for (const f of readdirSync(join(root, 'scripts'))) {
    if (!/\.(mjs|py)$/.test(f)) continue;
    const t = read('scripts', f);
    assert.ok(!/symbolEmbroidery|BRAND\["symbol|brand\.symbol\b|M45\.60 8\.00/.test(t), `${f} uses a legacy symbol`);
  }
  for (const f of ['garments.py', 'retouch.py']) assert.ok(/brandmark|from garments import embroider/.test(read('scripts', f)), `${f} uses the master`);
});

test('production references point to the master', () => {
  const cat = read('data', 'catalog.mjs');
  assert.ok(!/brand\/symbol/.test(cat), 'catalog still points to an old symbol file');
  assert.ok(cat.includes('brand/algebra-a-signature-master'));
});

test('built site (when present): header, footer and hero carry the master A, nothing older', { skip: !existsSync(join(root, 'dist', 'de', 'index.html')) }, () => {
  const html = read('dist', 'de', 'index.html');
  const count = html.split(master.d).length - 1;
  assert.ok(count >= 4, `master A in header, hero, statement and footer (found ${count})`);
  assert.ok(!/M45\.60 8\.00|M17\.90 53\.50L19\.20 51/.test(html), 'an older A is still in the page');
});
