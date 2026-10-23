# Launch checklist (PASS / FAIL)

Run on 22.10.2026 against the local preview (`npm run dev`: real site build + real Worker code, in-memory D1, **mock supplier,
mock payment**). Automated: `npm test` (20 unit/API tests) and `npm run qa` (36 browser/static checks, report in `qa/report.json`).
"PASS" below means: verified in that local setup. Nothing has been deployed; nothing ran against real Stripe, A61 or Resend.

## Verified locally

| Area | Check | Result |
|---|---|---|
| Navigation | header, mobile menu, footer, breadcrumbs, language switch | PASS |
| Links | every internal link, image and srcset in all pages resolves | PASS |
| Responsive | no horizontal overflow at 320 / 375 / 390 / 430 / 768 / 1024 / 1440 px on 12 page types | PASS |
| Product page | colour switch swaps gallery, size required, cut switch (graphic), add to bag | PASS |
| Cart | drawer, quantity + / −, remove, country switch, shipping thresholds DE 100 € / EU 150 € | PASS |
| Checkout | cart → Worker prices from catalogue → (mock) payment → success page with order number | PASS (mock payment) |
| Server-side price check | wrong prices, unknown SKUs, blocked products, qty limits refused | PASS |
| Stripe webhook | signature check, expiry, idempotency, paid → supplier, amount mismatch held | PASS (unit tests with signed payloads) |
| Supplier flow | paid → submitted → in production → shipped (tracking) → delivered; address error; API outage retries; refund cancels | PASS (mock supplier) |
| Never before payment | supplier not called for unpaid orders | PASS |
| Tracking | lookup by order number + e-mail; wrong e-mail refused | PASS |
| Forms | newsletter double opt-in, contact (503 until e-mail key), tracking | PASS |
| 404 | status 404 + branded page | PASS |
| SEO | one h1, unique titles, descriptions, canonical, hreflang de/en/fr/x-default, JSON-LD valid, sitemap (75 URLs), robots | PASS |
| Preview safety | every page noindex, preview banner, Worker refuses live Stripe keys in preview | PASS |
| Consent | banner on first visit, no analytics before consent, events after consent, purchase once | PASS |
| Accessibility | alt on all images, skip link, Escape closes drawer, focus trap in drawer, labels; Lighthouse a11y 100 / 100 / 99 | PASS |
| Performance | Lighthouse mobile (local): home 97, product 99, collection 100; CLS 0; JS+CSS 38.5 KB; no third-party script | PASS (local, not production CDN) |
| SEO score | Lighthouse SEO 100 in live mode (69 in preview because of noindex, intended) | PASS |
| Trust | no countdown, no fake scarcity, no reviews/ratings; MOCKUP and CONCEPT labels visible | PASS |
| Worker bundle | `wrangler deploy --dry-run` builds (56.6 KiB) | PASS |

## Not done / blocked (FAIL until done)

| Area | Check | Result | Needs |
|---|---|---|---|
| Payment test mode | real Stripe Checkout in test mode, webhook from Stripe | FAIL (not run) | NEEDS CREDENTIALS (Stripe test key + webhook secret) |
| Supplier sandbox | real A61 order in test/sandbox | FAIL (adapter not connected) | NEEDS SUPPLIER APPROVAL (API docs, account) |
| Samples | one sample per product, colours, embroidery at 18 mm, print size/colours | FAIL | order samples (≈ cost list in ECONOMICS.md) |
| Delivery times | real production + shipping times shown | FAIL (TO VERIFY everywhere) | A61 answer |
| Size guide | garment measurements | FAIL (placeholder) | Stanley/Stella spec sheets + sample measurements |
| Product photos | REAL PRODUCT IMAGE for every product | FAIL (MOCKUP / CONCEPT only) | photos of samples |
| Legal texts | Impressum, AGB, Widerruf, Datenschutz, cookies | FAIL (placeholders) | NEEDS LEGAL REVIEW + operator data |
| E-mail | real sending from a verified domain | FAIL (MOCKED) | NEEDS CREDENTIALS (Resend) |
| Deployment | Pages + Worker + D1 + domain algebra.algbr.eu | FAIL (not deployed) | NEEDS CREDENTIALS / user OK |
| Analytics provider | chosen and loaded after consent | FAIL (event layer only) | NEEDS USER INPUT |
| Women's polo, women's crew with embroidery | purchasable | FAIL (blocked on purpose) | NEEDS SUPPLIER APPROVAL |
| Cookie behaviour in production | re-check on the real domain | FAIL (not run) | deployment |
| Production performance | Lighthouse on the real domain | FAIL (not run) | deployment |
