/**
 * Opportunity Radar:
 *   POST /api/radar  (X-Radar-Key: <RADAR_KEY>)           → the engine publishes its latest scan
 *   GET  /api/radar  (Authorization: Bearer <ADMIN_PASSWORD>) → the admin reads it
 */
import { authorized } from './admin.mjs';
import { RadarError, latestRadar, saveRadar } from '../lib/radar.mjs';
import { crm } from '../lib/store.mjs';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  const store = crm();
  try {
    if (req.method === 'POST') return json(200, await saveRadar(store, req));
    if (req.method === 'GET') {
      if (!authorized(req)) return json(401, { error: 'unauthorized' });
      return json(200, (await latestRadar(store)) ?? { scores: [] });
    }
    return json(405, { error: 'method' });
  } catch (err) {
    if (err instanceof RadarError) return json(err.status, { error: err.message });
    console.error('radar', err);
    return json(500, { error: 'server' });
  }
};
