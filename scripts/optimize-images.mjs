#!/usr/bin/env node
/**
 * Product photos → WebP (max 1400 px, quality 80), next to the originals, which
 * are then removed. Run after adding new photos to public/assets/products/.
 */
import { readdirSync, rmSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const dir = resolve(import.meta.dirname, '..', 'public', 'assets', 'products');
for (const file of readdirSync(dir)) {
  const ext = extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;
  const src = join(dir, file);
  const out = join(dir, file.slice(0, -ext.length) + '.webp');
  await sharp(src).resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
  console.log(`${file} ${Math.round(statSync(src).size / 1024)} KB → ${Math.round(statSync(out).size / 1024)} KB`);
  rmSync(src);
}
