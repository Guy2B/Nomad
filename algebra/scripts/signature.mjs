/**
 * Signature wordmark: "Algebra" set in the brand serif, with the first letter replaced by the Algebra symbol
 * (the A with the double bar). One unit, used wherever the brand name is shown (header, footer, hero).
 * The symbol alone stays the secondary mark (favicon, embroidery, labels, small formats).
 * Writes brand/wordmark-signature.svg and paths.json → signature { width, height, symbol: {tx, ty, s}, rest: {dx, d} }.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'brand', 'paths.json');
const brand = JSON.parse(readFileSync(file, 'utf8'));
const opt = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k, Number(v)]));

const wm = brand.wordmark.d;
const cut = wm.indexOf('M75.80'); // first sub-path of the "l": everything before is the serif A (crossbar + body)
if (cut < 0) throw new Error('wordmark layout changed: cannot find the start of "l"');
const rest = wm.slice(cut);

// The serif A of the wordmark spans y 14.6 → 78 (baseline), x -0.7 → 71.5; the "l" starts at x 75.8.
// The symbol spans y 8 → 95.4, x 9.5 → 92.5 in its 100×100 box.
const baseline = 78, capTop = opt.cap ?? 15.5;
const s = (baseline - capTop) / (95.4 - 8);
const tx = -9.5 * s, ty = baseline - 95.4 * s;
const aRight = 92.5 * s + tx;
const gap = opt.gap ?? 5.2;
const dx = +(aRight + gap - 75.8).toFixed(2);
const width = Math.ceil(321 + dx);
const height = 102;

brand.signature = { width, height, symbol: { tx: +tx.toFixed(3), ty: +ty.toFixed(3), s: +s.toFixed(4) }, rest: { dx, d: rest } };
writeFileSync(file, JSON.stringify(brand, null, 2) + '\n');

const svg = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Algebra"><title>Algebra</title><path fill="${fill}" transform="matrix(${s.toFixed(4)} 0 0 ${s.toFixed(4)} ${tx.toFixed(3)} ${ty.toFixed(3)})" d="${brand.symbol}"/><path fill="${fill}" transform="translate(${dx} 0)" d="${rest}"/></svg>\n`;
writeFileSync(join(root, 'brand', 'wordmark-signature.svg'), svg('#131A2B'));
writeFileSync(join(root, 'brand', 'wordmark-signature-ivory.svg'), svg('#F3EFE7'));
console.log('signature wordmark', { width, s: s.toFixed(4), dx });
