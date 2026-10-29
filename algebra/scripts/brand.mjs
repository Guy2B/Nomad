/**
 * Algebra brand files, all derived from ONE locked master:
 *
 *   brand/algebra-a-signature-master.svg        THE A (locked, never redrawn: see brand/README.md)
 *   brand/algebra-a-signature-master-ivory.svg  same geometry, ivory
 *
 * Generated here (never edited by hand):
 *   brand/wordmark-signature.svg / -ivory.svg   "Algebra": the master A + "lgebra" (Cormorant Garamond SemiBold outlines, OFL)
 *   brand/favicon.svg                           the master A, ivory on navy
 *   brand/circle-seal.svg / -ivory.svg          A Circle seal: the master A in a fine ring
 *   brand/circle-signature.svg / -ivory.svg     A Circle signature: the master A, a hairline, CIRCLE (Cormorant Garamond outlines)
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

// ------------------------------------------------------------------ A Circle: seal + member signature (the master A, never altered)
// Seal: the A centred in a fine ring (avatar, member card, packaging stamp, small formats).
// Signature: the A, a hairline rule, "CIRCLE" in spaced capitals (page header, e-mails).
const aIn = (cx, cy, w) => { const k = w / (bx1 - bx0); return `matrix(${k.toFixed(5)} 0 0 ${k.toFixed(5)} ${(cx - ((bx0 + bx1) / 2) * k).toFixed(3)} ${(cy - ((by0 + by1) / 2) * k).toFixed(3)})`; };
const SEAL = { size: 200, r: 78, stroke: 1.6, aw: 84, cy: 102 };
const seal = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SEAL.size} ${SEAL.size}" role="img" aria-label="A Circle"><title>A Circle</title><circle cx="100" cy="100" r="${SEAL.r}" fill="none" stroke="${fill}" stroke-width="${SEAL.stroke}"/>${aShape(fill, aIn(100, SEAL.cy, SEAL.aw))}</svg>\n`;
writeFileSync(join(out, 'circle-seal.svg'), seal(INK));
writeFileSync(join(out, 'circle-seal-ivory.svg'), seal(IVORY));

const cfont = opentype.loadSync(join(root, 'node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff'));
const CS = 40, TRK = 0.25 * CS, CBASE = 114;
let cx = 196;
const cparts = [];
for (const g of cfont.stringToGlyphs('CIRCLE')) {
  const p = g.getPath(cx, CBASE, CS);
  cparts.push(p.toPathData(2));
  cx += (g.advanceWidth / cfont.unitsPerEm) * CS + TRK;
}
const textRight = cx - TRK;
const SIG = { x0: 40, y0: 60, w: Math.ceil(textRight + 4 - 40), h: 80 };
const signature = (fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SIG.x0} ${SIG.y0} ${SIG.w} ${SIG.h}" role="img" aria-label="A Circle"><title>A Circle</title>${aShape(fill, aIn(92, 100, 96))}<rect x="167.6" y="64" width="0.8" height="72" fill="${fill}"/><path fill="${fill}" d="${cparts.join(' ')}"/></svg>\n`;
writeFileSync(join(out, 'circle-signature.svg'), signature(INK));
writeFileSync(join(out, 'circle-signature-ivory.svg'), signature(IVORY));
const circle = {
  seal: { size: SEAL.size, r: SEAL.r, stroke: SEAL.stroke, matrix: aIn(100, SEAL.cy, SEAL.aw) },
  signature: { viewBox: `${SIG.x0} ${SIG.y0} ${SIG.w} ${SIG.h}`, matrix: aIn(92, 100, 96), rule: [167.6, 64, 0.8, 72], text: cparts.join(' ') },
};

// ------------------------------------------------------------------ geometry for the build
writeFileSync(
  join(out, 'paths.json'),
  JSON.stringify({ master: { d: master.d, bars: master.bars, box: master.box }, signature: { width, height, matrix, rest: { dx, d: lgebra.d } }, circle }, null, 1) + '\n',
);
console.log('brand/ written from the master A', { wordmark: `${width}×${height}`, scale: s.toFixed(4) });
