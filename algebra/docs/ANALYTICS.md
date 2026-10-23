# Analytics

Status: **IMPLEMENTED (event layer) · NEEDS USER INPUT (provider) · NEEDS CREDENTIALS**

`site/assets/app.js` → `track(event, params)` pushes GA4-style events to `window.dataLayer` **only after consent**
(`alg_consent.analytics === true`). Before consent nothing is recorded and no third-party script is loaded (QA checks both).

| Event | Where |
|---|---|
| view_item | product page load |
| select_item | click on a product card |
| add_to_cart | add to bag |
| remove_from_cart | remove in the bag |
| begin_checkout | checkout button |
| purchase | success page, once per order number |
| refund | server side (Stripe webhook) — send to the provider's server API once chosen |
| size_guide_open | size guide link on the product page |
| color_selected / size_selected | product page options |
| graphic_series_view | Graphic Series tiles on the home page |
| newsletter_signup | newsletter form success |

Provider options: Plausible or a self-hosted alternative (cookieless, simple, paid) or GA4 (free, needs consent, US transfer).
Load the provider inside `loadAnalytics()` only; keep the CSP in `scripts/build.mjs` (`_headers`) in sync.
