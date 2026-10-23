# E-mail flows

Sender: Resend (`RESEND_API_KEY`, `MAIL_FROM` on a verified domain). Without a key, mails are logged only (**MOCKED**).
Tone: short, factual, no pressure. Templates: `worker/src/email.js` (DE/EN/FR).

| Flow | Trigger | Status |
|---|---|---|
| Order confirmation | Stripe payment confirmed | IMPLEMENTED (MOCKED until key) |
| Shipping confirmation | supplier status shipped, with carrier and tracking link | IMPLEMENTED (MOCKED until key) |
| Delivery | supplier status delivered | IMPLEMENTED (MOCKED until key) |
| Newsletter double opt-in | newsletter form | IMPLEMENTED (MOCKED until key) |
| Owner alerts | needs_attention, fulfillment_failed, refunds in odd states | IMPLEMENTED (needs OWNER_EMAIL) |
| Welcome | after opt-in confirmation | PREPARED (text to write, send from the confirm route) |
| Abandoned cart | only for customers who gave an e-mail and consent; Stripe Checkout "recovery" can do this | NOT BUILT (P1, legal check) |
| Post-purchase care tips | 3 days after delivery | NOT BUILT (P1) |
| Review request | 14 days after delivery, real reviews only (no incentives that bias) | NOT BUILT (P1) |
