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
npm run brand       # wordmark, favicon, paths.json from the locked master A (brand/README.md)
python3 scripts/garments.py  # product images: owner's blank boards + official A + owner's drawings
python3 scripts/retouch.py   # campaign images: generated marks removed, official A and real artwork composited
npm run economics   # docs/ECONOMICS.md + data/economics.json
```

## Repository

| Path | What |
|---|---|
| `data/catalog.mjs` | the catalogue: products, blanks with A61 prices, colours, sizes, variants, shipping policy. Single source of truth for site, checkout and supplier |
| `site/` | config, copy (i18n, long pages), CSS, client JS, images (products, campaign) |
| `scripts/` | build, dev server, QA, brand (from the locked master A), product images, campaign retouch, economics |
| `worker/` | Cloudflare Worker API (checkout, webhook, orders, supplier adapter, e-mail), D1 migration, wrangler.toml |
| `brand/`, `design/` | logo files, design tokens, art fonts with licences |
| `capsule/` | archive of the first capsule studies (not published; Graphic Series artwork lives in `design/prints/`) |
| `docs/` | suppliers, economics, architecture, brand, Graphic Series, legal review, analytics, e-mail flows, launch checklist |
| `tests/` | node:test suites + in-memory D1 |

## Configuration

All variables are documented in [.env.example](.env.example). Secrets go to `wrangler secret put`, never into Git.
Public settings: `site/config.mjs` (operator placeholders, VAT display mode, site mode) and `worker/wrangler.toml` `[vars]`.

## Key decisions (details in docs/)

- **Fulfillment**: Valadio REST API is the target provider (`FULFILLMENT_PROVIDER = "valadio"`, sandbox until validated);
  A61 Partner stays a disabled fallback, Shirtigo/Prinovia backup ([SUPPLIERS.md](docs/SUPPLIERS.md); the launch report of
  22.10.2026 predates this decision).
- **Stack**: static site + Cloudflare Worker + D1 + Stripe Checkout, no monthly platform fee; Shopify as fallback if A61 has no API ([ARCHITECTURE.md](docs/ARCHITECTURE.md)).
- **Collection**: 6 essentials (4 purchasable, 2 waiting for A61) + Graphic Series: Capsule 01 "Physics in Ink" (5) and Capsule 02 "Pure Forms" (7).
- **Prices**: hypotheses inside the brief's ranges, margins in [ECONOMICS.md](docs/ECONOMICS.md).
- **Honesty rules**: TO VERIFY for every unknown supplier fact, MOCKUP/CONCEPT labels on images, no fake reviews or scarcity, legal placeholders flagged.

## Deploy (when credentials exist)

One Worker `algebra` (site + API) on the shared D1 `algbr-crm`, published by the `algebra` job of
`.github/workflows/deploy-cloudflare.yml`. Today: algebra.algbr.eu. Target: **algbr.eu** through `wrangler deploy --env apex`,
switched by the repository variable `ALGEBRA_ORIGIN` (see `docs/architecture/ALGBR_TARGET.md` in the repository root).
The `pages:deploy` script is a leftover of an earlier plan and is not used.
See also [docs/ARCHITECTURE.md → Deployment](docs/ARCHITECTURE.md). Switch `SITE_MODE=live` only after [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) is all PASS.
