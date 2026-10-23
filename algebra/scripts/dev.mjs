/**
 * Local preview: serves dist/ and runs the Worker in-process with an in-memory D1,
 * mock supplier and MOCK_PAYMENTS=1 (no Stripe). Used by QA. Run: npm run dev  → http://localhost:8787/de/
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../worker/src/index.js';
import { memoryD1 } from '../tests/d1.mjs';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT || 8787);
const env = { DB: memoryD1(null), SITE_ORIGIN: `http://localhost:${port}`, SITE_MODE: 'preview', SUPPLIER_MODE: 'mock', MOCK_PAYMENTS: '1' };
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith('/api/')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await worker.fetch(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), env, { waitUntil: () => {} });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  if (url.pathname === '/') { res.writeHead(302, { location: '/de/' }); res.end(); return; }
  let file = join(dist, decodeURIComponent(url.pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404, { 'content-type': types['.html'] });
    res.end(readFileSync(join(dist, '404.html')));
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Algebra preview on http://localhost:${port}/de/ (mock payments, mock supplier)`));
