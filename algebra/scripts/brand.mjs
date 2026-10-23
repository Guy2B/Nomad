/**
 * Algebra brand assets, generated so they stay consistent and editable:
 *   brand/symbol.svg            primary symbol: serif A whose crossbar becomes "=" (second bar crosses the right stem)
 *   brand/symbol-embroidery.svg same symbol, bolder bars for 12–20 mm embroidery
 *   brand/wordmark.svg          "Algebra" in Cormorant Garamond SemiBold, converted to outlines (OFL font)
 *   brand/wordmark-italic.svg   editorial italic variant
 *   brand/lockup-horizontal.svg symbol + wordmark
 *   brand/favicon.svg
 * Colours come from design/tokens.json. Run: node scripts/brand.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const opentype = require('opentype.js');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(root, 'design', 'tokens.json'), 'utf8'));
const NAVY = tokens.color.navy;
const out = join(root, 'brand');
mkdirSync(out, { recursive: true });

const font = (w, style = 'normal') =>
  opentype.loadSync(join(root, 'node_modules/@fontsource/cormorant-garamond/files', `cormorant-garamond-latin-${w}-${style}.woff`));

/**
 * The symbol on a 100 × 100 grid. Didone contrast: hairline left stem, heavy right stem, bracket-less serifs.
 * Upper bar = crossbar. Lower bar = the "equals" stroke: same weight, starts inside the counter and
 * runs through the heavy stem, so "=" lives inside the letter instead of beside it.
 */
function symbolPaths({ bar = 5.2, gap = 4.6, hair = 4.3 } = {}) {
  const yTop = 8;
  const base = 92;
  const thick = [
    [45.6, yTop],
    [55.4, yTop],
    [84.5, base],
    [68.6, base],
  ];
  const thin = [
    [45.6, yTop],
    [45.6 + hair * 0.65, yTop + 6],
    [17.0 + hair, base],
    [17.0, base],
  ];
  const feet = [
    [9.5, base - 0.2, 29.5, base + 3.4],
    [61.0, base - 0.2, 92.5, base + 3.4],
  ];
  // stems as x(y): left hairline centre, right stem inner/outer edge
  const leftX = (y) => 45.6 + hair * 0.65 - ((y - (yTop + 6)) * (45.6 + hair * 0.65 - 17.0 - hair)) / (base - (yTop + 6));
  const rInner = (y) => 45.6 + ((y - yTop) * (68.6 - 45.6)) / (base - yTop);
  const rOuter = (y) => 55.4 + ((y - yTop) * (84.5 - 55.4)) / (base - yTop);
  const y1 = 55.5;
  const y2 = y1 + bar + gap;
  const crossbar = [leftX(y1 + bar / 2) - 1.2, y1, rInner(y1 + bar / 2) + 1, y1 + bar];
  const equals = [leftX(y2 + bar / 2) + 4.2, y2, rOuter(y2 + bar / 2) + 6.5, y2 + bar];
  const poly = (pts) => `M${pts.map((p) => p.map((n) => n.toFixed(2)).join(' ')).join(' L')} Z`;
  const rect = ([x0, y0, x1, y1]) => `M${x0.toFixed(2)} ${y0.toFixed(2)} H${x1.toFixed(2)} V${y1.toFixed(2)} H${x0.toFixed(2)} Z`;
  return [poly(thick), poly(thin), ...feet.map(rect), rect(crossbar), rect(equals)].join(' ');
}

const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

const symbol = (opts, color = NAVY) => `<path fill="${color}" fill-rule="nonzero" d="${symbolPaths(opts)}"/>`;

function wordmark(f, size = 100, tracking = 0.01) {
  // Kerned outlines, slight positive tracking for a calm, luxurious rhythm.
  const text = 'Algebra';
  let x = 0;
  const parts = [];
  const glyphs = f.stringToGlyphs(text);
  glyphs.forEach((g, i) => {
    const p = g.getPath(x, size * 0.78, size);
    parts.push(p.toPathData(2));
    const kern = i < glyphs.length - 1 ? f.getKerningValue(g, glyphs[i + 1]) : 0;
    x += ((g.advanceWidth + kern) / f.unitsPerEm) * size + (i < glyphs.length - 1 ? tracking * size : 0);
  });
  return { d: parts.join(' '), width: Math.ceil(x + 2), height: Math.ceil(size * 1.02) };
}

writeFileSync(join(out, 'symbol.svg'), svg(100, 100, symbol(), 'Algebra'));
writeFileSync(join(out, 'symbol-embroidery.svg'), svg(100, 100, symbol({ bar: 6.4, gap: 5.2, hair: 6.8 }), 'Algebra (embroidery 12–20 mm)'));
writeFileSync(join(out, 'symbol-ivory.svg'), svg(100, 100, symbol({}, tokens.color.ivory), 'Algebra'));

const regular = wordmark(font(600));
writeFileSync(join(out, 'wordmark.svg'), svg(regular.width, regular.height, `<path fill="${NAVY}" d="${regular.d}"/>`, 'Algebra'));
const italic = wordmark(font(500, 'italic'), 100, 0.004);
writeFileSync(join(out, 'wordmark-italic.svg'), svg(italic.width, italic.height, `<path fill="${NAVY}" d="${italic.d}"/>`, 'Algebra'));

const lock = `<g transform="translate(0 4) scale(0.92)">${symbol()}</g><g transform="translate(124 0)"><path fill="${NAVY}" d="${regular.d}"/></g>`;
writeFileSync(join(out, 'lockup-horizontal.svg'), svg(124 + regular.width, 102, lock, 'Algebra'));

writeFileSync(
  join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${NAVY}"/><g transform="translate(9 8) scale(0.46)">${symbol({ bar: 6.4, gap: 5.2, hair: 6.8 }, tokens.color.ivory)}</g></svg>\n`,
);

// Path data reused by the site build (inline SVG, no extra request).
writeFileSync(
  join(out, 'paths.json'),
  JSON.stringify({ symbol: symbolPaths(), symbolEmbroidery: symbolPaths({ bar: 6.4, gap: 5.2, hair: 6.8 }), wordmark: regular, wordmarkItalic: italic }, null, 0),
);
console.log('brand/ written', regular.width, 'x', regular.height);
