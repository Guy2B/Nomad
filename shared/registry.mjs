/**
 * Registre des marques et des logiciels AlGBr (shared/brands.json, shared/software.json).
 *
 *   loadRegistry(root)   → { organization, brands, software } triés, accroches lues à la source (site.json)
 *   checkRegistry(root)  → liste d'erreurs (vide = cohérent), utilisée par les tests et le build du Studio
 *
 * Aucune dépendance. Le registre décrit l'identité ; prix, stocks et catalogues restent dans leurs sources.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LANGS = ['de', 'en', 'fr'];
export const STATUSES = ['live', 'preview', 'seasonal', 'planned', 'retired'];
export const SHOP_TYPES = ['dropshipping', 'own-stock', 'print-on-demand'];
export const SOFTWARE_STATUSES = ['live', 'beta', 'development', 'retired'];

const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const isHex = (s) => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);
const isHttps = (s) => typeof s === 'string' && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/?$/.test(s);
const hostOf = (u) => new URL(u).host;
const texts = (o) => o && LANGS.every((l) => typeof o[l] === 'string' && o[l].trim().length > 0);

export function readRegistry(root) {
  return {
    brandsFile: readJson(join(root, 'shared', 'brands.json')),
    softwareFile: readJson(join(root, 'shared', 'software.json')),
  };
}

/** site.json of a catalogue shop, or null. */
function siteOf(root, b) {
  return b.source?.type === 'shop' ? readJson(join(root, b.source.site)) : null;
}

/** Registry with taglines resolved from their source (never copied by hand for catalogue shops). */
export function loadRegistry(root) {
  const { brandsFile, softwareFile } = readRegistry(root);
  const brands = brandsFile.brands
    .map((b) => {
      const site = siteOf(root, b);
      return { ...b, tagline: site ? site.tagline : b.tagline };
    })
    .sort((a, b) => a.portfolioPriority - b.portfolioPriority);
  const software = [...softwareFile.software].sort((a, b) => a.portfolioPriority - b.portfolioPriority);
  return { organization: brandsFile.organization, brands, software };
}

/** Structural checks + consistency with the sources of truth. Returns human-readable errors. */
export async function checkRegistry(root, overrides = {}) {
  const errors = [];
  const err = (id, msg) => errors.push(`${id}: ${msg}`);
  const { brandsFile, softwareFile } = { ...readRegistry(root), ...overrides };

  if (!brandsFile.organization || !isHttps(brandsFile.organization.url)) err('organization', 'url manquante ou invalide');

  const ids = new Set();
  const prios = new Set();
  for (const b of brandsFile.brands ?? []) {
    const id = b.id || '(sans id)';
    if (!/^[a-z][a-z0-9-]*$/.test(b.id ?? '')) err(id, 'id invalide');
    if (ids.has(b.id)) err(id, 'id en double');
    ids.add(b.id);
    if (prios.has(b.portfolioPriority)) err(id, 'portfolioPriority en double');
    prios.add(b.portfolioPriority);
    if (!Number.isInteger(b.portfolioPriority)) err(id, 'portfolioPriority doit être un entier');
    for (const k of ['storeId', 'name', 'domain', 'category'])
      if (typeof b[k] !== 'string' || !b[k]) err(id, `${k} manquant`);
    if (!isHttps(b.url)) err(id, 'url invalide');
    if (!STATUSES.includes(b.status)) err(id, `status inconnu "${b.status}"`);
    if (!SHOP_TYPES.includes(b.shopType)) err(id, `shopType inconnu "${b.shopType}"`);
    if (!texts(b.positioning)) err(id, 'positioning DE/EN/FR incomplet');
    if (!texts(b.description)) err(id, 'description DE/EN/FR incomplète');
    if (!b.theme || !isHex(b.theme.primary) || !isHex(b.theme.background) || !isHex(b.theme.accent)) err(id, 'theme incomplet');
    if (!Array.isArray(b.languages) || !b.languages.length || b.languages.some((l) => !LANGS.includes(l))) err(id, 'languages invalides');
    if (!b.logo || !existsSync(join(root, b.logo))) err(id, `logo introuvable (${b.logo})`);
    if (b.image && !existsSync(join(root, b.image))) err(id, `image introuvable (${b.image})`);
    if (typeof b.crossPromotion?.eligible !== 'boolean' || typeof b.crossPromotion?.showsFamily !== 'boolean')
      err(id, 'crossPromotion.eligible / showsFamily requis');
    // Domain: official domain = url host, unless a migration towards it is declared.
    if (isHttps(b.url)) {
      const target = b.migration ? b.migration.to : b.url;
      if (!isHttps(target) || hostOf(target) !== b.domain) err(id, `domain ${b.domain} ≠ ${target}`);
      if (b.migration && hostOf(b.migration.from) !== hostOf(b.url) && hostOf(b.migration.to) !== hostOf(b.url))
        err(id, 'url doit être l’origine ou la cible de la migration');
    }

    // ---- consistency with the sources of truth
    if (b.source?.type === 'shop') {
      if (!existsSync(join(root, b.source.site))) { err(id, `site.json introuvable (${b.source.site})`); continue; }
      const s = siteOf(root, b);
      if (s.id !== b.storeId) err(id, `storeId ${b.storeId} ≠ site.json id ${s.id} (identifiant historique des commandes)`);
      if (s.brand !== b.name) err(id, `name ${b.name} ≠ site.json brand ${s.brand}`);
      if (s.baseUrl.replace(/\/$/, '') !== b.url.replace(/\/$/, '')) err(id, `url ${b.url} ≠ site.json baseUrl ${s.baseUrl}`);
      if (s.themeColor.toLowerCase() !== b.theme.primary.toLowerCase()) err(id, `theme.primary ≠ site.json themeColor ${s.themeColor}`);
      if ([...s.languages].sort().join() !== [...b.languages].sort().join()) err(id, 'languages ≠ site.json');
      if ((b.status === 'live' || b.status === 'seasonal') && s.launched !== true) err(id, 'status live/seasonal mais site.json launched ≠ true');
      if (b.tagline) err(id, 'tagline à ne pas recopier : elle est lue dans site.json');
    } else if (b.source?.type === 'algebra') {
      const { site } = await import(pathToFileURL(join(root, b.source.config)).href);
      const origin = (process.env.SITE_ORIGIN ? null : site.origin) ?? b.url;
      if (origin.replace(/\/$/, '') !== b.url.replace(/\/$/, '')) err(id, `url ${b.url} ≠ origin par défaut d'ALGEBRA ${origin}`);
      if ([...site.languages].sort().join() !== [...b.languages].sort().join()) err(id, 'languages ≠ config ALGEBRA');
      if (!texts(b.tagline) || b.tagline.en !== site.signature) err(id, `tagline ≠ signature ALGEBRA "${site.signature}"`);
      if (b.crossPromotion.eligible || b.crossPromotion.showsFamily) err(id, 'ALGEBRA doit rester hors promotion croisée');
    } else if (b.source?.type === 'off') {
      const toml = readFileSync(join(root, b.source.worker), 'utf8');
      const origin = toml.match(/^ORIGIN\s*=\s*"([^"]+)"/m)?.[1];
      if (origin !== b.url) err(id, `url ${b.url} ≠ ORIGIN du Worker OFF. ${origin}`);
      const { LANGS: offLangs } = await import(pathToFileURL(join(root, b.source.i18n)).href);
      if ([...offLangs].sort().join() !== [...b.languages].sort().join()) err(id, 'languages ≠ i18n OFF.');
      if (!texts(b.tagline)) err(id, 'tagline DE/EN/FR requise (pas de site.json)');
    } else err(id, `source inconnue ${JSON.stringify(b.source)}`);
  }

  // ---- cross-promotion policy (shared/platform.json → family): only eligible brands, never ALGEBRA
  const platform = overrides.platform ?? readJson(join(root, 'shared', 'platform.json'));
  const byFolder = new Map(brandsFile.brands.filter((b) => b.source?.type === 'shop').map((b) => [b.source.site.split('/')[1], b]));
  for (const [host, picks] of Object.entries(platform.family?.pick ?? {})) {
    const hb = byFolder.get(host);
    if (!hb) err('platform.family', `boutique hôte inconnue "${host}"`);
    else if (!hb.crossPromotion.showsFamily) err('platform.family', `${host} n'affiche pas l'encart famille (registre)`);
    for (const p of picks) {
      const pb = byFolder.get(p);
      if (!pb) err('platform.family', `${host} → marque inconnue ou hors moteur commun "${p}"`);
      else if (!pb.crossPromotion.eligible) err('platform.family', `${host} → ${p} non éligible à la promotion croisée`);
    }
  }
  for (const f of Object.keys(platform.family?.shops ?? {}))
    if (!byFolder.get(f)?.crossPromotion.eligible) err('platform.family', `carte famille pour une marque non éligible "${f}"`);

  // ---- software
  const sids = new Set();
  for (const s of softwareFile.software ?? []) {
    const id = s.id || '(sans id)';
    if (!/^[a-z][a-z0-9-]*$/.test(s.id ?? '')) err(id, 'id invalide');
    if (sids.has(s.id) || ids.has(s.id)) err(id, 'id en double (logiciels et marques partagent l’espace des ids)');
    sids.add(s.id);
    if (!SOFTWARE_STATUSES.includes(s.status)) err(id, `status inconnu "${s.status}"`);
    if (typeof s.public !== 'boolean') err(id, 'public doit être true ou false');
    if (!texts(s.summary)) err(id, 'summary DE/EN/FR incomplet');
    if (s.public) {
      if (!isHttps(s.url) || hostOf(s.url) !== s.domain) err(id, 'logiciel public : url https et domain cohérents requis');
      if (!texts(s.access?.cta)) err(id, 'logiciel public : access.cta DE/EN/FR requis');
      if (!s.features || !LANGS.every((l) => Array.isArray(s.features[l]) && s.features[l].length)) err(id, 'logiciel public : features DE/EN/FR requises');
      if (s.logo && !existsSync(join(root, s.logo))) err(id, `logo introuvable (${s.logo})`);
      if (/\.algbr\.eu$/.test(s.domain) && ['go', 'space', 'ease', 'glow', 'kin', 'joy', 'off', 'api'].includes(s.domain.split('.')[0]))
        err(id, 'un logiciel ne partage pas un sous-domaine e-commerce');
    }
  }
  return errors;
}
