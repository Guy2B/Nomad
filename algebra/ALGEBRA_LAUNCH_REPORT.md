# ALGEBRA LAUNCH REPORT · 22.10.2026

Vocabulary: IMPLEMENTED · MOCKED · NEEDS CREDENTIALS · NEEDS SUPPLIER APPROVAL · NEEDS LEGAL REVIEW · NEEDS USER INPUT · VERIFIED.
Nothing here is "ready" or "live": the shop is a complete **preview**, verified locally, not deployed.

## 1. What is finished

| Item | Status |
|---|---|
| Brand system: symbol (A with integrated "="), embroidery version, wordmark + italic, lockup, favicon, tokens | IMPLEMENTED |
| Supplier comparison, primary A61 Partner / backup Shirtigo-Prinovia | IMPLEMENTED (research 22.10.2026) |
| Catalogue: 18 products (6 essentials + 12 Graphic Series), 562 variants, internal SKUs separate from marketing names | IMPLEMENTED |
| Unit economics per SKU, 3 scenarios (Kleinunternehmer DE, regular VAT DE, Kleinunternehmer EU), updatable by script | IMPLEMENTED |
| Graphic Series: Capsule 01 "Physics in Ink" (5 designs) + Capsule 02 "Pure Forms" (7 designs incl. Higgs Field and Big Bang), all original, print-ready SVG + 300 dpi PNG, light and dark ink sets, chest icons | IMPLEMENTED |
| Storefront DE/EN/FR: home (all sections of the brief), shop all, men, women, polos, t-shirts, sweaters, graphic series, 18 product pages, search, cart page + drawer, order confirmation, tracking, FAQ, size guide, about, contact, 8 info/legal pages, 404 | IMPLEMENTED |
| Filters (colour, size, price sort), search, upsell only when relevant (polo ↔ tee) | IMPLEMENTED |
| SEO: canonical, hreflang, unique metadata, Product/Offer/Breadcrumb/Organization/WebSite/FAQ schema, sitemap, robots, OpenGraph/Twitter | IMPLEMENTED |
| Consent + analytics event layer (all events of the brief) | IMPLEMENTED (provider: NEEDS USER INPUT) |
| Worker API: checkout (Stripe Checkout), webhook, order state machine, supplier adapter, cron, tracking, newsletter double opt-in, contact, admin | IMPLEMENTED |
| Payment | MOCKED locally · NEEDS CREDENTIALS for Stripe test mode |
| Supplier integration | MOCKED · A61 adapter NEEDS SUPPLIER APPROVAL (API docs) |
| E-mails (confirmation, shipping, delivery, opt-in, owner alerts) | IMPLEMENTED, MOCKED until Resend key |
| Legal pages | IMPLEMENTED with the AlGBr operator data and the same texts as the AlGBr shops (not lawyer-reviewed, see docs/LEGAL_REVIEW.md) |
| Deployment: one Worker `algebra` (shop + API) on algebra.algbr.eu, shared D1 algbr-crm (tables alg_*), job "algebra" in the Nomad deploy workflow (same account, token and pattern as GLOW/KIN/JOY/OFF) | IMPLEMENTED · not yet run |

## 2. What is verified

- 20 automated tests (catalogue integrity, pricing, webhook signatures, state machine, supplier error paths, refunds, newsletter, admin auth): **VERIFIED** (all pass).
- 36 QA checks in a real browser against the local preview (links, overflow at 7 widths, cart, mock checkout, tracking, consent, SEO, a11y, 404): **VERIFIED** (36/36).
- Lighthouse mobile, local: performance 97–100, accessibility 99–100, best practices 100, SEO 100 in live mode: **VERIFIED locally**, not on production.
- Worker bundles with `wrangler deploy --dry-run`: **VERIFIED**.
- A61 prices and materials: read from A61's public price page on 22.10.2026: **VERIFIED as published** (subject to change).
- Equations on the Graphic Series: checked against standard forms (docs/GRAPHIC_SERIES.md): **VERIFIED**.

## 3. What remains to be done
See docs/LAUNCH_CHECKLIST.md (FAIL section): Stripe test mode, A61 API + account, samples, delivery times, size measurements,
real photos, legal texts, e-mail domain, deployment, analytics provider, production checks.

## 4. Credentials needed
STRIPE_SECRET_KEY (test, later live) · STRIPE_WEBHOOK_SECRET · A61_API_BASE + A61_API_KEY · RESEND_API_KEY + verified sending domain ·
ADMIN_TOKEN (any long random string) · Cloudflare D1 database id · OWNER_EMAIL · analytics id (if chosen). All documented in `.env.example`.

## 5. External accounts to create or connect
1. A61 Partner dropshipping account (free registration) and request for API documentation.
2. Stripe: same account as the AlGBr shops (owner decision). For the preview, a test key (sk_test_…) as Secret on the Worker `algebra`; a new webhook endpoint https://algebra.algbr.eu/api/stripe/webhook gives its own STRIPE_WEBHOOK_SECRET.
3. Cloudflare: Pages project `algebra-shop`, Worker `algebra-api`, D1 `algebra`, DNS `algebra.algbr.eu`.
4. Resend: same key and verified domain as the AlGBr shops (sender Algebra <service@algbr.eu>).
5. GitHub: Algebra lives in the Nomad repository (`algbr-shops/algebra/`), owner decision 23.10.2026.
6. Optional: analytics provider; legal-text service.

## 6. Known costs (A61 published list, gross incl. 19 % VAT; net in docs/SUPPLIERS.md)

| Product | Blank | Decoration | Cost |
|---|---|---|---|
| The Polo (men) | Prepster 2.0 STPU222, 240 g/m² | embroidery ≤ 8,000 stitches | 20,30 € |
| The Heavy Tee | Sparker 2.0 STTU171, 220 g/m² | embroidery | 23,90 € |
| The Crew (men) | Changer 2.0 STSU178, 350 g/m² | embroidery | 30,85 € |
| The Premium Tee (women) | Muser STTW172, 180 g/m² | embroidery | 22,40 € |
| Graphic tee, unisex | Sparker 2.0 | print 2 sides | 21,15 € |
| Graphic tee, women | Muser | print 2 sides | 16,20 € |
| Shipping DE / EU (from) | | + packaging 0,80 € net | 5,80 € / 8,32 € net |
| Neck label | | per piece | 0,90 € net |
| Digitizing (one-off) | | per design | 33,00 € net |
Fixed platform costs: 0 € (Cloudflare free tiers, Stripe per transaction).

Contribution per single-item order, DE, Kleinunternehmer (docs/ECONOMICS.md): Polo 60,68 € · Crew 64,95 € · Heavy Tee 27,26 € ·
Premium Tee 24,94 € · Graphic unisex 40,07 € · Graphic women 45,39 €. These are the break-even CAC per order.

## 7. Costs to verify
Stripe rate for the account · A61 print area/colours for 30 × 40 cm three-colour backs · combination embroidery + print ·
oversized blank · women's polo (ELLISER) · embroidery on ALMA (women's crew) · return handling fee · production time · EU shipping per country ·
legal texts · samples.

## 8. Recommended supplier
**A61 Partner** (Grefrath, Germany): only candidate with a public price list for exactly these Stanley/Stella blanks incl. embroidery,
production in Germany, white label. Backup: **Shirtigo / Prinovia**.

## 9. Recommended launch products
Purchasable now (pending samples): The Polo (men), The Heavy Tee, The Crew (men), The Premium Tee (women), Graphic Series 01–12
in unisex heavy and women's cut. Recommendation: open with 6 graphic designs at most (Black Hole, Navier–Stokes, Euler, Lorenz, Higgs Field, Big Bang)
and keep the others for later drops, so the shop stays edited. Waiting for A61: The Polo (women), The Crew (women).
Start with fewer colours if samples disappoint: Ivory, Deep Navy, Black first.

## 10. Risks
1. **A61 API unknown**: without it, orders must be placed by hand (fallback documented) or the stack moves to Shopify + A61 app.
2. **Print quality and area** for the large three-colour backs (DTG on dark garments): must be judged on samples.
3. **Returns of made-to-order pieces**: right of withdrawal applies; return costs and resale of returns are assumptions (15 % rate).
4. **Legal**: VAT regime across shops, organic claim proof, GPSR data, legal texts.
5. **Imagery**: until real photos exist, the shop shows mockups and AI concept images; conversion will suffer if launched like that.
6. **Brand name**: "Algebra" is a common word; trademark search pending.
7. **Ads cost**: break-even CAC 25–65 € per order; tees alone leave little room, polo/crew/bundles carry acquisition.

## 11. Next 10 priority actions
1. Register at A61, ask the 12 open questions in docs/SUPPLIERS.md (API, print area, women's cuts, oversized, times, returns).
2. Order samples: Polo navy, Heavy Tee ivory, Crew black, Premium Tee ivory, Black Hole black, Navier–Stokes ivory (≈ 190 € gross incl. digitizing and shipping, from the A61 list).
3. Push the Nomad repo: the existing CLOUDFLARE_API_TOKEN deploys the preview on algebra.algbr.eu; check the VAT question with the tax adviser.
4. Create the Stripe test key and webhook; run the checkout once in test mode on a deployed preview.
5. Deploy preview: Cloudflare Pages + Worker + D1 on algebra.algbr.eu (noindex stays on).
6. Photograph the samples (packshot, detail, back print, embroidery close-up) and replace MOCKUP images.
7. Fill the size guide from the Stanley/Stella spec sheets and sample measurements.
8. Order the legal texts (AGB, Widerruf, Datenschutz) and replace the placeholders.
9. Connect A61 (adapter) or decide the manual/Shopify fallback; run one real end-to-end order to yourself.
10. Switch `SITE_MODE=live` when the checklist is PASS, submit the sitemap, then start with small ad tests on polo + crew.
