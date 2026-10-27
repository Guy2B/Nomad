# Analytics

Status: **LIVE (first-party, 27.10.2026)**: after consent, `track()` also sends the events to `POST /api/events` (worker/src/analytics.js, table `alg_events`). No cookie, no IP address, no user agent stored; random session id in the tab's sessionStorage (`alg_sid`); country from Cloudflare, coarse device class, first-page source and utm_campaign; 13-month retention. The Operating Cockpit (Analytics, Dashboard) reads it. A third-party provider is no longer needed; `window.dataLayer` stays for a later tag if ever wanted.

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
