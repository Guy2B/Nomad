# Operating Cockpit and A Circle (27.10.2026)

**Dashboard = business truth, not decoration. A Circle = access, not discounts.**

## 1. Files created

| File | Role |
|---|---|
| `worker/migrations/0003_circle_cockpit.sql` | tables `alg_members`, `alg_consent_log`, `alg_order_costs` (mirrored in `worker/src/schema.js`) |
| `worker/src/cockpit/margin.js` | margin method per order, sums, cost model |
| `worker/src/cockpit/api.js` | cockpit views behind `/api/admin/*` |
| `worker/src/circle.js` | A Circle: double opt-in, member page, preferences, leaving, segments |
| `admin/index.html`, `admin/cockpit.css`, `admin/cockpit.js` | cockpit shell (static, no data inside), published at `/admin/` |
| `site/circle.mjs` | A Circle copy DE / EN / FR and the privacy section |
| `tests/cockpit.test.mjs`, `tests/circle.test.mjs` | 16 tests |

## 2. Files modified

`worker/src/index.js` (routes), `worker/src/schema.js`, `worker/src/email.js` (two A Circle e-mails), `scripts/build.mjs`
(A Circle page, member page, home section, footer link, `/admin/` copy, headers, robots, sitemap), `site/assets/app.js`
(join form, member page), `site/assets/styles.css`, `site/content.mjs` (privacy), `scripts/dev.mjs` (ADMIN_TOKEN for local QA).
Storefront, checkout, URLs, products, fulfillment, Valadio / A61, languages, orders and existing tests are unchanged.

## 3. Routes

Cockpit (all `GET`, Bearer `ADMIN_TOKEN`): `overview?range=today|7d|30d|90d|year|custom&from&to`, `orders?filter=all|new|paid|production|shipped|delivered|returned|refunded|attention`,
`orders/:number`, `finance?by=month|week|product|country|collection`, `products`, `graphic-series`, `inventory`, `customers?q=`,
`circle`, `analytics`, `alerts`, `fulfillment/status`, `fulfillment` (existing mapping), `settings`.
`POST /api/admin/orders/:id/costs` records real costs (`productionCost`, `shippingCost`, `paymentFee`, `source`).
Interface: `https://algbr.eu/admin/` (sections: Dashboard, Orders, Alerts, Fulfillment, Finance, Products, Graphic Series,
Inventory, Customers, A Circle, Analytics, Settings; Marketing, Returns, Messages and Content are not built: no data source yet).

A Circle: `POST /api/circle`, `GET /api/circle/confirm?token=`, `POST /api/circle/member|prefs|leave`.
Pages: `/{de,en,fr}/circle/` (indexable), `/{de,en,fr}/circle/member/` (noindex).

## 4. Admin protection

Every `/api/admin/*` route refuses without the exact `Bearer ADMIN_TOKEN` (constant-time compare; no token configured = closed).
The `/admin/` shell holds no figure, is `noindex`, `no-store`, `no-referrer`, disallowed in robots.txt, and passes the build's
supplier-confidentiality guard (no supplier names, costs or mapping in any public file). The token stays in `sessionStorage`.
**Cloudflare Access (active since 27.10.2026):** application “Algebra Operating Cockpit” covers `algbr.eu/admin` and `algbr.eu/api/admin` (sub-paths included), policy “Owner only” = the owner’s e-mail, one-time PIN login, session 7 days. Both locks apply: Access first, then the admin token.

## 5. KPIs available

Revenue, net revenue, orders, average order, gross margin, contribution margin and margin %, refunds, checkout → purchase,
paid waiting, in production, shipped, requiring intervention, fulfillment failures, products unavailable, missing tracking,
API errors, cash breakdown (gross, VAT, payment fees, production costs, shipping, refunds, contribution), revenue & orders chart
with previous period, per product / per artwork / per country / per collection / per week / per month finance, customer LTV and
average order, repeat purchase rate, fulfillment success rate, average production time, delayed and rejected orders,
A Circle members, new members, pending, left, member revenue, member average order, member repeat rate, members vs non-members.

## 6. KPIs not available yet (shown as “Not available” with the reason)

Sessions, product views, add to cart, conversion rate, conversion by product / device, acquisition source and UTM
(no analytics provider connected, docs/ANALYTICS.md); returns as such (only refunds are recorded); supplier stock and last
supplier sync (provider does not report them yet); early-access performance (no early release has run).

## 7. Margin method

```
sales − discounts − VAT = net sales
− refunds − product and decoration − neck label = gross margin
− shipping paid by Algebra − packaging − payment fees = contribution margin
```
Real costs in `alg_order_costs` (provider invoice, Stripe balance, manual entry in the order view) replace the model. Otherwise:
product cost Valadio once confirmed, else the A61 reference of docs/ECONOMICS.md, labelled **estimate**; shipping and packaging
from `data/catalog.mjs`; payment fee 1.5 % + 0.25 € (same constants as `scripts/economics.mjs`, kept equal by a test).
§ 19 UStG: no VAT on sales, supplier costs counted gross. `VAT_MODE=regular` (+ `VAT_OSS=1` for destination rates) switches.
Costs only count once the order reached the provider; a refunded order keeps its payment fee. Unknown cost → contribution `null`.

## 8. Alerts

Order needs intervention, fulfillment failed, paid but not sent after 2 h, shipped without tracking, in production > 7 days,
negative contribution, Stripe webhook secret missing, provider webhook secret missing (production), and before / after going
live: purchasable variants without a confirmed supplier SKU, shop live while fulfillment is in sandbox, print-master missing.
Each alert carries the order or product and the action to take.

## 9. A Circle model

`alg_members` (e-mail key, first name optional, language, `program = a-circle`, `tier = circle | circle_private`,
`status = pending | active | left`, source, consent version, requested / joined / left dates, preferences graphic / knitwear /
restocks). A member and a customer are linked by e-mail (no customer accounts exist: guest checkout through Stripe).
`circle_private` exists in the data only; nothing about it is public.

## 10. A Circle page

Official A (`brand/algebra-a-signature-master.svg` geometry, same symbol as the site) + “Circle”; “Private access to Algebra.”;
four benefits (early access, private releases, Graphic Series, priority restocks); join form; small print (free, leave at any
time, we write rarely). Home: one calm section “For those who look closer.” before the statement. Footer link “A Circle”.

## 11. Signup flow

E-mail (required), first name (optional), explicit consent checkbox, honeypot. Same answer whether the address is new or
already a member. Confirmation e-mail (7 days) → active, token rotated → welcome note with the member page link.

## 12. Member account

`/circle/member/#t=…` (token in the fragment, never in server logs): member since, masked e-mail, topic preferences, leave.

## 13. Admin view

A Circle section: members, new, pending, left, member revenue, average order, repeat rate, members vs non-members (customers,
orders, average order, repeat purchase, LTV, refund rate, contribution, conversion when measurable), segments, member list,
consent log. Dashboard block: members, new members, member revenue, repeat rate, member average order.

## 14. Segments

`new_member` (≤ 30 days), `active_member` (order ≤ 180 days), `repeat_customer` (≥ 2 orders), `high_ltv` (≥ `CIRCLE_HIGH_LTV`,
default 300 €), `inactive_member`, `private_candidate` (≥ `CIRCLE_PRIVATE_ORDERS`, default 3, or high LTV). Internal only;
thresholds are Worker variables, never written on the site.

## 15. Privacy and consent

Opt-in only, double opt-in, every step in `alg_consent_log` (requested, confirmed, prefs, withdrawn) with consent version,
leaving at any time, language kept, privacy policy section added (DE full, EN / FR summary). Customers are never made members
automatically. **LEGAL REVIEW** of the new privacy section before the public launch, like the rest of the policy.

## 16. Translations

A Circle page, member page, home section, footer, e-mails and privacy: DE / EN / FR. The cockpit is in English (internal tool).

## 17. Responsive

Cockpit: sidebar becomes a drawer under 820 px; KPI grids reflow; tables scroll horizontally. A Circle pages follow the shop grid.

## 18. Tests

`tests/cockpit.test.mjs`: admin auth on every view, cost model = economics, margin cases (§ 19, regular VAT, OSS, refund,
unproduced, real costs, unknown cost), overview with real data only, alerts, filters and periods, cost entry validation, no
cost / supplier data in the public build, admin headers. `tests/circle.test.mjs`: consent required, double opt-in and log,
no enumeration, member page and leaving, segments, admin counts, public pages (consent checkbox, noindex member page, no
discount vocabulary, privacy section).

## 19. Depends on Valadio

Real production costs, supplier SKUs and stock, provider webhook and sync times, delays and rejections in real conditions,
print-masters for the Graphic Series. Until then the cockpit shows the sandbox and labels costs as estimates.

## 20. Before public activation

1. Set `ADMIN_TOKEN` (long random value) on the Worker (Cloudflare Access is already in place).
2. Legal review of the privacy section (A Circle) and of the e-mail wording.
3. Choose the analytics provider to unlock sessions and conversion.
4. Record the first real costs (provider invoice, Stripe fees) to replace estimates.
5. Decide when the first early-access release runs; only then announce dates or editions.
