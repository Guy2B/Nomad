/**
 * Algebra brand files, all derived from ONE locked master:
 *
 *   brand/algebra-a-signature-master.svg        THE A (locked, never redrawn: see brand/README.md)
 *   brand/algebra-a-signature-master-ivory.svg  same geometry, ivory
 *
 * Generated here (never edited by hand):
 *   brand/wordmark-signature.svg / -ivory.svg   "Algebra": the master A + "lgebra" (Cormorant Garamond SemiBold outlines, OFL)
 *   brand/favicon.svg                           the master A, ivory on navy
 *   brand/paths.json                            geometry for the build: master path + bars, "lgebra" outlines, wordmark layout
 *
 * Only size and colour ever vary; the A's geometry is copied, not re-created.
 * Run: node scripts/brand.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const opentype = require('opentype.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'brand');
import { readMaster } from './brand-master.mjs';
const tokens = JSON.parse(readFileSync(join(root, 'design', 'tokens.json'), 'utf8'));

// ------------------------------------------------------------------ the master A
const master = readMaster(join(out, 'algebra-a-signature-master.svg'));
const ivory = readMaster(join(out, 'algebra-a-signature-master-ivory.svg'));
if (ivory.d !== master.d || JSON.stringify(ivory.bars) !== JSON.stringify(master.bars)) throw new Error('ivory master must have exactly the master geometry');
const INK = master.fill, IVORY = ivory.fill;
const aShape = (fill, transform = '') =>
  `<g fill="${fill}"${transform ? ` transform="${transform}"` : ''}><path d="${master.d}"/>${master.bars.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('')}</g>`;

// ------------------------------------------------------------------ "lgebra" in the brand serif
const font = opentype.loadSync(join(root, 'node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff'));
const SIZE = 100, BASE = SIZE * 0.78, TRACK = 0.01;
const glyphs = font.stringToGlyphs('Algebra');
let x = 0;
const parts = [];
glyphs.forEach((g, i) => {
  const p = g.getPath(x, BASE, SIZE);
  parts.push({ d: p.toPathData(2), box: p.getBoundingBox() });
  const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0;
  x += ((g.advanceWidth + kern) / font.unitsPerEm) * SIZE + (i < glyphs.length - 1 ? TRACK * SIZE : 0);
});
const rest = parts.slice(1); // l g e b r a  (the font's own A is never used)
const lgebra = { d: rest.map((p) => p.d).join(' '), left: rest[0].box.x1, right: Math.max(...rest.map((p) => p.box.x2)), top: rest[0].box.y1 };

// ------------------------------------------------------------------ the signature wordmark: master A + lgebra
// The A stands on the baseline and rises to the ascender of the "l"; uniform scale only.
const [bx0, by0, bx1, by1] = master.box;
const s = (BASE - lgebra.top) / (by1 - by0);
const tx = -bx0 * s, ty = BASE - by1 * s;
const aRight = (bx1 - bx0) * s;
const GAP = 3;
const dx = +(aRight + GAP - lgebra.left).toFixed(2);
const width = Math.ceil(lgebra.right + dx + 1), height = Math.ceil(SIZE * 1.02);
const matrix = `matrix(${s.toFixed(5)} 0 0 ${s.toFixed(5)} ${tx.toFixed(3)} ${ty.toFixed(3)})`;
const wm = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Algebra"><title>Algebra</title>${aShape(fill, matrix)}<path fill="${fill}" transform="translate(${dx} 0)" d="${lgebra.d}"/></svg>\n`;
writeFileSync(join(out, 'wordmark-signature.svg'), wm(INK));
writeFileSync(join(out, 'wordmark-signature-ivory.svg'), wm(IVORY));

// ------------------------------------------------------------------ favicon: the master A, ivory on navy
const FAV = 64, aw = 48, fs = aw / (bx1 - bx0), ah = (by1 - by0) * fs;
writeFileSync(
  join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FAV} ${FAV}"><rect width="${FAV}" height="${FAV}" rx="14" fill="${tokens.color.navy}"/>${aShape(IVORY, `matrix(${fs.toFixed(5)} 0 0 ${fs.toFixed(5)} ${((FAV - aw) / 2 - bx0 * fs).toFixed(3)} ${((FAV - ah) / 2 - by0 * fs + 1).toFixed(3)})`)}</svg>\n`,
);

// ------------------------------------------------------------------ geometry for the build
writeFileSync(
  join(out, 'paths.json'),
  JSON.stringify({ master: { d: master.d, bars: master.bars, box: master.box }, signature: { width, height, matrix, rest: { dx, d: lgebra.d } } }, null, 1) + '\n',
);
console.log('brand/ written from the master A', { wordmark: `${width}×${height}`, scale: s.toFixed(4) });
