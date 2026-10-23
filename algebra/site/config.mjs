/**
 * Site configuration. Values in [BRACKETS] are placeholders: NEEDS USER INPUT / LEGAL REVIEW.
 * Never put a secret here: this file is public (it ends up in the HTML).
 */
export const site = {
  name: 'Algebra',
  signature: 'Built on proportion.',
  origin: process.env.SITE_ORIGIN || 'https://algebra.algbr.eu',
  // API of the Worker (checkout, newsletter, tracking). Same origin via a route, or a separate host.
  apiBase: process.env.API_BASE || '/api',
  // 'preview': banner on every page, noindex everywhere, checkout only in Stripe test mode.
  // 'live': only after docs/LAUNCH_CHECKLIST.md is all PASS.
  mode: process.env.SITE_MODE || 'preview',
  languages: ['de', 'en', 'fr'],
  defaultLanguage: 'de',
  // VAT display. 'kleinunternehmer' (§ 19 UStG) or 'regular'. LEGAL REVIEW before launch.
  vatMode: process.env.VAT_MODE || 'kleinunternehmer',
  // Same operator as the AlGBr shops (GO, SPACE, EASE, GLOW, KIN, JOY, OFF): algbr-shops/shops/*/site.json "company".
  operator: {
    name: 'AlGBr',
    owner: 'Guy Beaho',
    street: 'Carlo-Mierendorff-Str. 15',
    city: '68623 Lampertheim',
    country: 'Deutschland',
    email: 'contact@algbr.de',
    phone: '',
    taxNote: 'Kleinunternehmer gemäß § 19 UStG',
  },
  social: {},
};
