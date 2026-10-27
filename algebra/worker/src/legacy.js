/**
 * Former Al.G.B.r. Digital Studio URLs on algbr.eu (repository Guy2B/algbr), redirected with a 301 to their
 * new home on algbr.de once Algebra serves algbr.eu. Active only when LEGACY_STUDIO_REDIRECTS = "1"
 * (wrangler.toml [env.apex]); the paths are also listed in run_worker_first there, so the Worker sees them.
 * Paths Algebra serves itself (/, /de/, /en/, /fr/) are never redirected.
 */
export const STUDIO_ORIGIN = 'https://algbr.de';

const SERVICE = { websites: 'website', webshop: 'ecommerce', apps: 'software', 'crm-booking': 'automation', 'seo-support': 'maintenance' };

/** run_worker_first patterns needed for the redirects (kept here so tests can check wrangler.toml). */
export const LEGACY_PATTERNS = ['/leistungen/*', '/branchen/*', '/project.html', '/en/project.html', '/fr/project.html', '/impressum.html', '/datenschutz.html', '/privacy.html', '/legal.html'];

export function legacyStudioTarget(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  let m;
  if ((m = p.match(/^\/leistungen\/([\w-]+)(?:\.html)?$/))) return `${STUDIO_ORIGIN}/de/services/${SERVICE[m[1]] ? `#${SERVICE[m[1]]}` : ''}`;
  if (p === '/leistungen') return `${STUDIO_ORIGIN}/de/services/`;
  if (/^\/branchen(\/[\w-]+(\.html)?)?$/.test(p)) return `${STUDIO_ORIGIN}/de/services/`;
  if ((m = p.match(/^(?:\/(en|fr))?\/project\.html$/))) return `${STUDIO_ORIGIN}/${m[1] || 'de'}/contact/`;
  if (p === '/impressum.html' || p === '/legal.html') return `${STUDIO_ORIGIN}/de/impressum/`;
  if (p === '/datenschutz.html' || p === '/privacy.html') return `${STUDIO_ORIGIN}/de/datenschutz/`;
  return null;
}
