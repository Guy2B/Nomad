/** Reads and validates the locked master A (brand/algebra-a-signature-master.svg). No side effects.
 *  Griffe of 10.11.2026 (owner): ONE letter path (A, fine inner line, the two "=" bars, infinity, arch)
 *  ONE body path (id="body": the navy silhouette inside the ivory lines) and ONE accent path (id="accent": the copper stripe along the right leg). Older masters (path + two rect bars)
 *  are still read, for the archive. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MASTER = join(dirname(fileURLToPath(import.meta.url)), '..', 'brand', 'algebra-a-signature-master.svg');

export function readMaster(file = MASTER) {
  const svg = readFileSync(file, 'utf8');
  const all = [...svg.matchAll(/<path([^>]*)\sd="([^"]+)"/g)];
  const accentM = all.find((m) => /id="accent"/.test(m[1]));
  const bodyM = all.find((m) => /id="body"/.test(m[1]));
  const paths = all.filter((m) => m !== accentM && m !== bodyM).map((m) => m[2]);
  const bars = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\s*\/>/g)].map((m) => m.slice(1).map(Number));
  const fill = (svg.match(/<g fill="(#[0-9A-Fa-f]{6})"/) || [])[1];
  const accentFill = accentM ? (accentM[1].match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1] : null;
  if (paths.length !== 1) throw new Error(`master A: expected 1 letter path, found ${paths.length}`);
  if (bars.length !== 0 && bars.length !== 2) throw new Error(`master A: expected the bars in the path or 2 rect bars, found ${bars.length}`);
  if (!accentM && bars.length !== 2) throw new Error('master A: the griffe needs its copper accent path (id="accent")');
  const nums = (paths[0] + ' ' + (accentM ? accentM[2] : '') + ' ' + (bodyM ? bodyM[2] : '')).match(/-?\d+(?:\.\d+)?/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
  return { d: paths[0], bars, accent: accentM ? accentM[2] : '', body: bodyM ? bodyM[2] : '', fill, accentFill, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
