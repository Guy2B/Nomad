# LEGAL REVIEW REQUIRED

Nothing in this repository is legal advice and no legal text is validated. Since 22.10.2026 the `/info/` pages carry the same legal texts as the AlGBr shops
(operator, AGB, Widerrufsbelehrung with the statutory model text, Datenschutz adapted to A61 / Resend), not lawyer-reviewed. Items below need a lawyer, a legal-text service (e.g. IT-Recht Kanzlei, Händlerbund, Trusted Shops)
or the tax adviser. Status: **NEEDS LEGAL REVIEW** unless marked otherwise.

| # | Topic | Why it matters | Where in the code |
|---|---|---|---|
| 1 | Operator identity (Impressum § 5 DDG) | Owner decision 22.10.2026: same operator as the AlGBr shops (AlGBr, Inhaber Guy Beaho, Lampertheim, contact@algbr.de, Kleinunternehmer). Filled in. | `site/config.mjs` operator |
| 2 | VAT regime | Owner is Kleinunternehmer (§ 19 UStG) per previous context. Check the turnover thresholds with all shops combined, and EU distance sales to FR/AT/BE/NL/LU (EU-wide 10,000 € threshold, OSS, new EU SME scheme since 2025). Price display switches with `VAT_MODE`. | `site/config.mjs`, `site/i18n.mjs` product.vat |
| 3 | Right of withdrawal | Products are made to order from preset sizes and colours. Our reading: **not** "made to the consumer's specification" (§ 312g (2) no. 1 BGB), so the 14-day right applies and is shown everywhere. Confirm. Insert the statutory model notice and model form. | `site/content.mjs` withdrawal, returns |
| 4 | Return shipping costs | Same rule as the AlGBr shops: the customer bears the direct return cost; returns go to the AlGBr address. Filled in. | returns, withdrawal |
| 5 | AGB | Structure only. Contract conclusion happens in Stripe Checkout: button wording ("zahlungspflichtig bestellen" equivalent), confirmation e-mail content, contract text storage. Check Stripe Checkout's German button label and the Button-Lösung (§ 312j BGB). | `site/content.mjs` terms, worker checkout |
| 6 | Datenschutz | Processors: Cloudflare, Stripe, A61 Partner (DPA / AV-Vertrag needed), Resend, analytics provider. Data transfer to the US (Stripe, Cloudflare, Resend). | privacy page |
| 7 | Cookies / consent | Only strictly necessary local storage without consent; analytics only after opt-in (TTDSG § 25). Banner offers equal-weight choices. Verify the wording. | `site/assets/app.js` consent |
| 8 | Textile labelling (EU 1007/2011) | Fibre composition must be on the product page and the garment. Composition is shown from A61's list ("100 % Bio-Baumwolle"); confirm on the samples and with the Stanley/Stella labels. | product pages |
| 9 | "Bio" / organic claims | The site states "100 % organic cotton" because A61 lists it. Green claims rules (UWG, EU Empowering Consumers Directive from 2026) require proof: get the GOTS/OCS certificates from Stanley/Stella or remove the word. | `data/catalog.mjs` blanks |
| 10 | GPSR (EU 2023/988) | Manufacturer (Stanley/Stella) address and EU responsible person must be on the page and with the product. Placeholder "address added before launch". | product page "Produktsicherheit" |
| 11 | Price display (PAngV) | Prices are final prices; shipping costs linked next to the price. With regular VAT the "inkl. MwSt." text switches automatically. | product page |
| 12 | Accessibility (BFSG, since 28.06.2025) | Micro-enterprise exemption for services may apply; check. The site is built towards WCAG 2.2 AA anyway. | accessibility page |
| 13 | Trademark "Algebra" | Common word; check EUIPO/DPMA class 25 before investing in the brand. The symbol (A with second bar) could be registered as a figurative mark. | brand/ |
| 14 | Newsletter | Double opt-in implemented; proof of consent is stored (subscribers table: date, token). Unsubscribe link needed in every mail once newsletters are sent. | worker newsletter |
| 15 | Online dispute resolution | The EU ODR platform was shut down in July 2025; check the current wording for Impressum/AGB. | imprint |
| 16 | Model and concept images | AI-generated concept images are labelled CONCEPT; replace with real photos before launch so no image suggests a product detail that does not exist. | `data/images.json` |
