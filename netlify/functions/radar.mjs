/**
 * Opportunity Radar:
 *   POST /api/radar  (X-Radar-Key: <RADAR_KEY>)              → the engine publishes its latest scan
 *   GET  /api/radar?follow=1  (X-Radar-Key)                   → the engine reads the followed markets
 *   GET  /api/radar  (Authorization: Bearer <ADMIN_PASSWORD>) → the admin reads the scan + followed markets
 *   POST /api/radar  (Bearer) {follow: "<market>", on: bool}  → the admin follows / unfollows a market
 */
import { authorized } from './admin.mjs';
import { RadarError, followedMarkets, latestRadar, radarKeyValid, saveRadar, setFollow } from '../lib/radar.mjs';
import { crm } from '../lib/store.mjs';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  const store = crm();
  try {
    const radarKey = req.headers.get('x-radar-key');
    if (req.method === 'POST') {
      if (radarKey) return json(200, await saveRadar(store, req));
      if (!authorized(req)) return json(401, { error: 'unauthorized' });
      const body = await req.json().catch(() => ({}));
      return json(200, { follow: await setFollow(store, body.follow, body.on === true) });
    }
    if (req.method === 'GET') {
      if (radarKey) {
        if (!radarKeyValid(radarKey)) return json(401, { error: 'unauthorized' });
        return json(200, { follow: await followedMarkets(store) });
      }
      if (!authorized(req)) return json(401, { error: 'unauthorized' });
      const snap = (await latestRadar(store)) ?? { scores: [] };
      return json(200, { ...snap, follow: await followedMarkets(store) });
    }
    return json(405, { error: 'method' });
  } catch (err) {
    if (err instanceof RadarError) return json(err.status, { error: err.message });
    console.error('radar', err);
    return json(500, { error: 'server' });
  }
};
