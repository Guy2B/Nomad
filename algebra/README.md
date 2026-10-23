# Algebra

European contemporary essentials for men and women. *Built on proportion.*
Zero-inventory shop: every piece is embroidered or printed on demand by the production partner after payment.

**Status: PREVIEW.** Implemented and verified locally; not deployed; payment, supplier and e-mail run in mock mode until the
credentials and supplier approval exist. Full status: [ALGEBRA_LAUNCH_REPORT.md](ALGEBRA_LAUNCH_REPORT.md).

## Quick start

```bash
npm install                      # Node ≥ 22.13
npm run build                    # dist/ (DE/EN/FR static site)
npm run dev                      # http://localhost:8787/de/  (site + Worker in-process, mock payment and supplier)
npm test                         # 20 unit and API tests
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs npm run qa   # 36 browser checks, qa/report.json
```

Regenerate assets (needs Playwright for PNG/WebP/AVIF):

```bash
npm run brand       # brand/ symbol, wordmark, lockup, favicon
npm run capsule     # capsule/<design>/ print files (SVG + 300 dpi PNG)
npm run mockups     # site/assets/mockups/ flat garment mockups (MOCKUP)
npm run economics   # docs/ECONOMICS.md + data/economics.json
```

## Repository

| Path | What |
|---|---|
| `data/catalog.mjs` | the catalogue: products, blanks with A61 prices, colours, sizes, variants, shipping policy. Single source of truth for site, checkout and supplier |
| `site/` | config, copy (i18n, long pages), CSS, client JS, images (concept crops, mockups) |
| `scripts/` | build, dev server, QA, brand, Graphic Series artwork, mockups, economics |
| `worker/` | Cloudflare Worker API (checkout, webhook, orders, supplier adapter, e-mail), D1 migration, wrangler.toml |
| `brand/`, `design/` | logo files, design tokens, art fonts with licences |
| `capsule/` | Graphic Series print files (`_archive/` = first concept) |
| `docs/` | suppliers, economics, architecture, brand, Graphic Series, legal review, analytics, e-mail flows, launch checklist |
| `tests/` | node:test suites + in-memory D1 |

## Configuration

All variables are documented in [.env.example](.env.example). Secrets go to `wrangler secret put`, never into Git.
Public settings: `site/config.mjs` (operator placeholders, VAT display mode, site mode) and `worker/wrangler.toml` `[vars]`.

## Key decisions (details in docs/)

- **Supplier**: A61 Partner (Germany) primary, Shirtigo/Prinovia backup ([SUPPLIERS.md](docs/SUPPLIERS.md)).
- **Stack**: static site + Cloudflare Worker + D1 + Stripe Checkout, no monthly platform fee; Shopify as fallback if A61 has no API ([ARCHITECTURE.md](docs/ARCHITECTURE.md)).
- **Collection**: 6 essentials (4 purchasable, 2 waiting for A61) + Graphic Series: Capsule 01 "Physics in Ink" (5) and Capsule 02 "Pure Forms" (7).
- **Prices**: hypotheses inside the brief's ranges, margins in [ECONOMICS.md](docs/ECONOMICS.md).
- **Honesty rules**: TO VERIFY for every unknown supplier fact, MOCKUP/CONCEPT labels on images, no fake reviews or scarcity, legal placeholders flagged.

## Deploy (when credentials exist)

See [docs/ARCHITECTURE.md → Deployment](docs/ARCHITECTURE.md). Switch `SITE_MODE=live` only after [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) is all PASS.
