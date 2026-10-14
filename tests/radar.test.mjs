import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NOMAD_MEMORY_STORE = '1';
const { slimRadar, slimPulse, setFollow, followedMarkets } = await import('../engine/lib/radar.mjs');
const { crm } = await import('../engine/lib/store.mjs');

test('radar snapshot carries the market pulse, bounded and with nulls kept', () => {
  const pulse = {
    generatedAt: '2026-10-07T20:00:00Z',
    sources: { merchant_bestsellers: 'locked' },
    markets: [
      { key: 'dog', label: 'Chien', shop: 'KIN', fit: 85, pulse: 63, momentum: 76, season: { next: null, peakMonth: 'janvier', index: Array(20).fill(1) }, newQueries: Array(20).fill('q'), cj: null, junk: 'x'.repeat(5000) },
    ],
    shops: [{ shop: 'KIN', pulse: 58, actions: ['a', 'b', 'c', 'd', 'e'] }],
    alerts: [{ level: 'info', text: 'y'.repeat(900) }],
  };
  const snap = slimRadar({ scores: [], pulse });
  const m = snap.pulse.markets[0];
  assert.equal(m.season.next, null);
  assert.equal(m.season.index.length, 12);
  assert.equal(m.newQueries.length, 12);
  assert.equal(m.junk, undefined);
  assert.equal(snap.pulse.shops[0].actions.length, 4);
  assert.equal(snap.pulse.alerts[0].text.length, 300);
  assert.equal(snap.pulse.sources.merchant_bestsellers, 'locked');
});

test('missing or malformed pulse is dropped', () => {
  assert.equal(slimPulse(null), null);
  assert.equal(slimPulse({ markets: 'nope' }), null);
  assert.equal(slimRadar({ scores: [] }).pulse, null);
});

test('market detail: only https links survive, candidates and verdict kept', () => {
  const p = slimPulse({
    markets: [
      {
        key: 'sauna',
        ebayTop: [{ title: 'Saunahut', price: 19.9, url: 'javascript:alert(1)', image: 'https://i.ebayimg.com/x.jpg' }],
        candidates: [{ product: 'Felt hat', url: 'https://cjdropshipping.com/product/a-p-1.html', image: 'http://insecure/x.jpg', landedEur: 4.2, margin: 12.5 }],
        verdict: { headline: 'Boutique possible', points: ['a'], good: 3 },
        followed: true,
      },
    ],
  });
  const m = p.markets[0];
  assert.equal(m.ebayTop[0].url, '');
  assert.equal(m.ebayTop[0].image, 'https://i.ebayimg.com/x.jpg');
  assert.equal(m.candidates[0].image, '');
  assert.equal(m.candidates[0].margin, 12.5);
  assert.equal(m.verdict.good, 3);
  assert.equal(m.followed, true);
});

test('follow list: add, remove, reject bad keys', async () => {
  const store = crm();
  assert.deepEqual(await setFollow(store, 'sauna', true), ['sauna']);
  await setFollow(store, 'car', true);
  assert.deepEqual(await setFollow(store, 'sauna', false), ['car']);
  assert.deepEqual(await followedMarkets(store), ['car']);
  await assert.rejects(() => setFollow(store, '../x', true));
});
