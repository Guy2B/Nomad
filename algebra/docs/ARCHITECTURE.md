# Architecture

## Decision: custom static shop + Cloudflare Worker (not Shopify)

| | Custom (chosen) | Shopify |
|---|---|---|
| Fixed cost | 0 € (Cloudflare Pages, Workers and D1 free tiers; no subscription) | Basic plan per month + transaction fees without Shopify Payments (current prices **TO VERIFY**) |
| Variable cost | Stripe fee only | Shopify Payments fee or extra fee + app costs |
| A61 integration | Own adapter, **API documentation needed** (biggest risk) | A61 offers a Shopify integration: lower operational risk |
| Design control | Complete, very fast pages (static HTML, 38 KB JS+CSS, no third-party scripts) | Theme limits, apps add scripts |
| Owner know-how | Same stack as the existing AlGBr shops (Cloudflare, Stripe Checkout, Resend, GitHub Actions) | New tool |
| Maintenance | Code in Git, owner already runs this pattern | Platform updates handled by Shopify |

Default: custom, because the owner has little capital (no monthly fee) and already operates this exact stack.
**Fallback if A61 cannot provide an API**: either place A61 orders manually from the admin list (`/api/admin/orders`) for the first
orders, or move the catalogue to Shopify Basic with the A61 app. The catalogue, brand files and print files stay reusable.

## Components

```
Browser ──► Cloudflare Pages (dist/: static HTML per language, AVIF/WebP, app.js)
   │  bag in localStorage, consent, filters, search
   └──► /api/* Cloudflare Worker (worker/src)
          ├─ POST /checkout ── prices from data/catalog.mjs ──► Stripe Checkout (hosted, cards never touch us)
          ├─ POST /stripe/webhook ◄── Stripe (signature checked, idempotent)
          │       paid ─► supplier adapter (mock | a61) ─► A61 production & shipping
          ├─ cron */30: retry fulfillment, poll supplier status, tracking e-mail, expire unpaid orders
          ├─ D1 (shared algbr-crm): alg_orders, alg_order_events, alg_stripe_events, alg_subscribers
          └─ Resend: confirmation, shipping, delivery, newsletter double opt-in, owner alerts
```

## Order flow (brief section 9)

Order placed → `pending_payment` (D1) → Stripe Checkout → webhook `checkout.session.completed` (paid) → `paid` →
supplier `createOrder` → `submitted` → supplier status `in_production` → `shipped` (+ carrier, tracking → e-mail) → `delivered`.

Never sent to the supplier before `paid` (tested). Each line carries: SKU, supplier article id, supplier variant id (TO VERIFY),
size, colour, cut, decoration method, print file (front/back per garment tone) or embroidery file.

| Case | Handling |
|---|---|
| Supplier API failure | stays `paid`, retried by cron up to 5 times, then `fulfillment_failed` + owner e-mail |
| Address error | `needs_attention` + owner e-mail (fix, then `POST /api/admin/orders/:id/retry`) |
| Out of stock | `needs_attention` + owner e-mail (offer other colour/size or refund) |
| Amount mismatch | `needs_attention` (should never happen: prices are server-side) |
| Refund (Stripe `charge.refunded`) | `refunded`; supplier order cancelled if production has not started |
| Cancellation by customer before production | refund in Stripe → same path |
| Return (withdrawal) | refund in Stripe after the parcel is back; return address from A61 (NEEDS SUPPLIER APPROVAL) |
| Unpaid checkout | `expired` after 48 h or on `checkout.session.expired` |

## i18n and URLs

`/de/` (default, x-default), `/en/`, `/fr/`. Same slugs in all languages; canonical + hreflang on every page; sitemap with alternates.
`/` → 302 to `/de/`. Copy lives in `site/i18n.mjs` and `site/content.mjs`; product copy in `data/catalog.mjs`.

## Images

`data/images.json` flags every image: `REAL PRODUCT IMAGE` (none yet), `MOCKUP` (generated flat garments), `CONCEPT`
(crops of the owner's AI moodboards). The flag is also printed under the image on the page. Replace MOCKUP by real packshots after
sample approval: same file names in `site/assets/products/` and switch the flag.

## Deployment

Same Cloudflare account and pattern as GLOW / KIN / JOY / OFF: one Worker (`worker/wrangler.toml`, name `algebra`) serves the
static shop from `dist/` and runs `/api/*`; custom domain `algebra.algbr.eu`, preview at `algebra.<account>.workers.dev`.
The "algebra" job of `.github/workflows/deploy-cloudflare.yml` (repo Nomad) runs on every push touching `algebra/`: `npm ci`, tests, build, deploy.
Data lives in the shared D1 database `algbr-crm`, tables prefixed `alg_`, created by the Worker on first use. Uses the repository secret `CLOUDFLARE_API_TOKEN` already set for the AlGBr shops.

Worker secrets (Cloudflare dashboard → Workers → algebra → Settings → Variables, type **Secret**, never in Git or chat):
`STRIPE_SECRET_KEY` (test key while SITE_MODE=preview: live keys are refused), `STRIPE_WEBHOOK_SECRET` (new endpoint
`https://algebra.algbr.eu/api/stripe/webhook`, events in `.env.example`), `RESEND_API_KEY` (same as the AlGBr shops),
`ADMIN_TOKEN`, optional `NTFY_TOPIC` (same as the AlGBr shops for push alerts).
