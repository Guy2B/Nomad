/** Reads and validates the locked master A (brand/algebra-a-signature-master.svg). No side effects. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MASTER = join(dirname(fileURLToPath(import.meta.url)), '..', 'brand', 'algebra-a-signature-master.svg');

export function readMaster(file = MASTER) {
  const svg = readFileSync(file, 'utf8');
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  const bars = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\s*\/>/g)].map((m) => m.slice(1).map(Number));
  const fill = (svg.match(/<g fill="(#[0-9A-Fa-f]{6})"/) || [])[1];
  if (paths.length !== 1) throw new Error(`master A: expected 1 path, found ${paths.length}`);
  if (bars.length !== 2) throw new Error(`master A: expected 2 equality bars, found ${bars.length}`);
  const [a, b] = bars;
  if (a[0] !== b[0] || a[2] !== b[2] || a[3] !== b[3]) throw new Error('master A: the two equality bars must be identical (x, width, height)');
  // bounding box of the letter (path points)
  const nums = paths[0].match(/-?\d+(?:\.\d+)?/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  return { d: paths[0], bars, fill, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

