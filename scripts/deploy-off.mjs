#!/usr/bin/env node
/** Deploys the OFF. storefront with a content hash of its assets (cache busting for off.css / off.js). */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const h = createHash('sha256');
for (const f of ['off.css', 'off.js']) h.update(readFileSync(new URL(`../cloudflare/off/public/assets/${f}`, import.meta.url)));
const v = h.digest('hex').slice(0, 10);
execFileSync('npx', ['wrangler', 'deploy', '--config', 'cloudflare/off/wrangler.toml', '--var', `ASSET_V:${v}`], { stdio: 'inherit', shell: true });
