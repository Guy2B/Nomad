/**
 * Registre des marques et logiciels (shared/brands.json, shared/software.json) :
 * structure, cohérence avec les sources (site.json, config ALGEBRA, Worker OFF.) et politique de promotion croisée.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkRegistry, loadRegistry, readRegistry } from '../shared/registry.mjs';

const root = join(import.meta.dirname, '..');
const clone = (o) => JSON.parse(JSON.stringify(o));
const platform = () => JSON.parse(readFileSync(join(root, 'shared', 'platform.json'), 'utf8'));

test('le registre réel est cohérent avec toutes ses sources', async () => {
  assert.deepEqual(await checkRegistry(root), []);
});

test('chaque boutique du moteur commun et chaque circuit propre est enregistré', () => {
  const { brands } = loadRegistry(root);
  assert.deepEqual(brands.map((b) => b.id), ['algebra', 'go', 'space', 'ease', 'glow', 'kin', 'joy', 'off']);
  // Identifiants historiques des commandes conservés.
  const store = Object.fromEntries(brands.map((b) => [b.id, b.storeId]));
  assert.equal(store.go, 'nomad');
  assert.equal(store.space, 'appart-reset');
  assert.equal(store.ease, 'body-care');
});

test('les accroches des boutiques sont lues dans site.json, pas recopiées', () => {
  const go = loadRegistry(root).brands.find((b) => b.id === 'go');
  const site = JSON.parse(readFileSync(join(root, 'shops/go/site.json'), 'utf8'));
  assert.deepEqual(go.tagline, site.tagline);
});

test('ALGEBRA ne peut pas entrer dans la promotion croisée', async () => {
  const p = platform();
  p.family.pick.go = ['algebra', ...p.family.pick.go];
  const errors = await checkRegistry(root, { platform: p });
  assert.ok(errors.some((e) => e.includes('algebra')), errors.join('\n'));

  const { brandsFile } = readRegistry(root);
  const b = clone(brandsFile);
  b.brands.find((x) => x.id === 'algebra').crossPromotion.eligible = true;
  assert.ok((await checkRegistry(root, { brandsFile: b })).some((e) => e.includes('hors promotion croisée')));
});

test('OFF. (stock propre) reste hors de l’encart famille', async () => {
  const p = platform();
  p.family.pick.kin = ['off'];
  assert.ok((await checkRegistry(root, { platform: p })).some((e) => e.includes('"off"')));
});

test('un identifiant historique modifié est refusé', async () => {
  const { brandsFile } = readRegistry(root);
  const b = clone(brandsFile);
  b.brands.find((x) => x.id === 'go').storeId = 'go';
  assert.ok((await checkRegistry(root, { brandsFile: b })).some((e) => e.includes('identifiant historique')));
});

test('domaine incohérent, logo absent, statut inconnu : refusés', async () => {
  const { brandsFile } = readRegistry(root);
  const b = clone(brandsFile);
  const kin = b.brands.find((x) => x.id === 'kin');
  kin.domain = 'kin.algbr.de';
  kin.logo = 'shops/kin/assets/missing.svg';
  kin.status = 'soon';
  const errors = await checkRegistry(root, { brandsFile: b });
  for (const needle of ['domain', 'logo introuvable', 'status inconnu']) assert.ok(errors.some((e) => e.includes(needle)), needle);
});

test('ALGEBRA : domaine officiel algbr.eu, migration déclarée, adresse actuelle conservée', () => {
  const a = loadRegistry(root).brands.find((b) => b.id === 'algebra');
  assert.equal(a.domain, 'algbr.eu');
  assert.equal(a.migration.to, 'https://algbr.eu');
  assert.equal(a.shopType, 'print-on-demand');
});

test('logiciels : seuls les publics sont complets et hors sous-domaines e-commerce', async () => {
  const { softwareFile } = readRegistry(root);
  const s = clone(softwareFile);
  s.software[0].domain = 'api.algbr.eu';
  s.software[0].url = 'https://api.algbr.eu';
  assert.ok((await checkRegistry(root, { softwareFile: s })).some((e) => e.includes('sous-domaine e-commerce')));
  const pub = loadRegistry(root).software.filter((x) => x.public);
  assert.deepEqual(pub.map((x) => x.id), ['next']);
});

test('coordonnées de l’exploitant identiques dans toutes les copies', async () => {
  const keys = ['name', 'owner', 'street', 'city', 'country', 'email', 'taxNote'];
  const pick = (c) => Object.fromEntries(keys.map((k) => [k, c[k]]));
  const ref = pick(JSON.parse(readFileSync(join(root, 'shops/go/site.json'), 'utf8')).company);
  for (const s of ['space', 'ease', 'glow', 'kin', 'joy'])
    assert.deepEqual(pick(JSON.parse(readFileSync(join(root, `shops/${s}/site.json`), 'utf8')).company), ref, s);
  const { site } = await import('../algebra/site/config.mjs');
  assert.deepEqual(pick(site.operator), ref, 'algebra/site/config.mjs');
  const off = readFileSync(join(root, 'shops/off/worker.mjs'), 'utf8');
  for (const k of keys) assert.ok(off.includes(`'${ref[k]}'`), `shops/off/worker.mjs: ${k}`);
});
