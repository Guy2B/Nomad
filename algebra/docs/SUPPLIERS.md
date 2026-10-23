# Algebra · Supplier comparison (POD / zero-inventory)

Research date: 22.10.2026. Sources are the suppliers' own public pages, read on that day.
Anything not published or not verifiable is marked **TO VERIFY**. No price or delay below is invented.

## Requirements

Zero stock, production from 1 piece, embroidery (polo piqué, small symbol 12–20 mm), premium blanks for men and women,
heavy tee, crewneck, DTG/DTF for the Graphic Series, white label (neck label, packaging), API, shipping DE first then FR/AT/BE/NL/LU.

## Comparison

| Criterion | **A61 Partner** (Grefrath, DE) | **Shirtigo / Prinovia** (DE) | **Printful** (LV, ES, UK, US…) | **Gelato** (network) | **Valadio** (Teplice, CZ) |
|---|---|---|---|---|---|
| Production location | Germany ("Printing and embroidery are done in Germany") | Germany ("Produced & packed in Germany") | Own facilities in Latvia (2) and Spain (1), UK; techniques per site **TO VERIFY** | Partner network, 7 countries for embroidery; EU sites **TO VERIFY** | Czech Republic |
| From 1 piece | Yes ("production from just one item") | Yes (POD) | Yes ("no minimum order") | Yes | Yes ("from 1 piece") |
| Stanley/Stella blanks | Yes, published price list (Prepster 2.0, Sparker 2.0, Muser, Changer 2.0) | Official dealer logo; models **TO VERIFY** | Catalogue of 470+ products; models **TO VERIFY** | Not stated on the embroidery page | **TO VERIFY** |
| Polo piqué | Yes: Stanley/Stella PREPSTER 2.0 Unisex Heavy Polo STPU222 (240 g/m², organic), embroidery | **TO VERIFY** | Polos offered, models **TO VERIFY** | Not listed on embroidery page | **TO VERIFY** |
| Women's polo | Not on the public price list (Stanley/Stella makes the women's ELLISER polo) → **TO VERIFY with A61** | **TO VERIFY** | **TO VERIFY** | No | **TO VERIFY** |
| Heavy tee | Sparker 2.0 STTU171 (220 g/m², organic) | "Premium T-Shirt" **TO VERIFY** | **TO VERIFY** | Heavyweight unisex tee (embroidery) | **TO VERIFY** |
| Women's tee | Stella Muser STTW172 (180 g/m²) | **TO VERIFY** | **TO VERIFY** | Unisex only on that page | **TO VERIFY** |
| Crewneck | Changer 2.0 STSU178 (350 g/m², organic), unisex | Sweaters listed | Yes **TO VERIFY** | Crewneck sweatshirt | **TO VERIFY** |
| Embroidery | Yes, up to 8,000 stitches included; setup (digitizing) 33,00 € net per design | Yes | Yes | Yes | **TO VERIFY** |
| DTG / DTF | "Print" 1- or 2-sided; method **TO VERIFY** | DTG, DTF | DTG, DTFlex | Yes | **TO VERIFY** |
| White label | Shipped "in your brand", no A61 reference; transfer neck label 0,90 € net, hangtag 1,09 € net, woven label 2,10 € net, individual packaging 0,75 € net, inserts 0,25 € net/order | "Branding" service **TO VERIFY** | Yes (pack-ins, labels) **TO VERIFY prices** | White label page exists **TO VERIFY** | **TO VERIFY** |
| API / integrations | API + Shopify, WooCommerce, Shopware (docs **TO VERIFY**) | REST API, Shopify, WooCommerce, Shopware… | REST API + all platforms | REST API + platforms | API (fulfillment) |
| Production time | **TO VERIFY** | "2-5 working days" | **TO VERIFY** | **TO VERIFY** | **TO VERIFY** |
| Shipping DE | from 5,80 € net (DHL Paket/Warenpost) + 0,80 € net packaging per shipment | **TO VERIFY** | **TO VERIFY** | **TO VERIFY** | **TO VERIFY** |
| Shipping EU | from 8,32 € net (1 tee example) | **TO VERIFY** | **TO VERIFY** | **TO VERIFY** | **TO VERIFY** |
| Returns | FAQ "How are misprints and returns handled?" exists, answer **TO VERIFY** | "Returns management" tool **TO VERIFY** | **TO VERIFY** | **TO VERIFY** | **TO VERIFY** |
| Fees | Free registration; "you do not have to pay for your production in advance" | Free platform, per-order costs | Free, per-order | Free + optional Gelato+ | **TO VERIFY** |

## Decision

**PRIMARY SUPPLIER: A61 Partner (Germany).**
1. The only supplier in this list with a **public price list** for exactly the Algebra launch blanks, including embroidery,
   so the margin model can use real numbers instead of guesses.
2. Production **in Germany**: short delivery to the primary market, simple customs (none), simple GPSR chain.
3. Premium Stanley/Stella blanks with a **real polo piqué** (Prepster 2.0) and a **women's cut tee** (Muser).
4. White-label options with published prices (neck label, hangtag, packaging, inserts).

**BACKUP SUPPLIER: Shirtigo / Prinovia (Germany).** Same country and blank family (Stanley/Stella dealer), DTG + DTF + embroidery,
documented REST API, published production time (2-5 working days). Note: shirtigo.de now redirects to prinovia.com (**TO VERIFY**: rebranding, same API?).

**Not chosen for launch:** Printful (EU embroidery location and polo models not published), Gelato (no polo on the embroidery page),
Valadio (catalogue and prices not public, contact needed). Keep Printful as the long-term option for markets outside the EU.

## Open points to clear with A61 before going live (NEEDS SUPPLIER APPROVAL)

1. Women's polo: can A61 produce Stanley/Stella **ELLISER** (or another women's polo) with embroidery? Price?
2. Women's crewneck: a women's cut, or only the unisex Changer 2.0?
3. Production time and the carrier's delivery time for DE, FR, AT, BE, NL, LU.
4. Thread colours available (tone-on-tone on Deep Navy, Black, Sage, Taupe, Ivory).
5. Colour availability of each blank in Ivory / Deep Navy / Black / Sage / Taupe (Stanley/Stella names differ).
6. Returns: who receives returns, restock or destroy, cost.
7. API documentation, test/sandbox mode, webhooks or polling for status and tracking.
8. GPSR: manufacturer information supplied with each garment (Stanley/Stella label) and A61's role.
9. Payment terms (invoice after production?).
10. Print specs for the Graphic Series: maximum print area (we need 30 × 40 cm back + 7 × 7 cm chest), colours included, DTG or DTF, file format (300 dpi PNG / SVG), price if larger than standard.
11. Oversized blank: the owner's reference boards show a boxy oversized tee. Does A61 offer a Stanley/Stella oversized heavy tee (e.g. a "Freestyler"/"Blaster" type)? Price? Until then the capsule uses Sparker 2.0 (unisex heavy) and Muser (women).
12. Combination embroidery front + print back on the same tee: possible? price?

## Update 22.10.2026, women's crew
The A61 list does contain a women's sweatshirt: **Stella ALMA STSW212** (100 % organic cotton, 300 g/m²), but only with print
(1-sided 19,90 € gross / 16,72 € net; 2-sided 24,70 € / 20,76 €). Embroidery for ALMA is not listed → NEEDS SUPPLIER APPROVAL.
A61 also lists Stella IDA STSW214 (women's zip hoodie) and Gamechanger Hoodie STSW268 (later capsules).

## Sources
- A61: https://www.a61partner.de/en/ · https://www.a61partner.de/en/print-on-demand.html · https://www.a61partner.de/de/dropshipping-preise.html · https://www.a61partner.de/en/services.html
- Shirtigo / Prinovia: https://cockpit.shirtigo.com/en
- Printful: https://www.printful.com/custom-polo-shirts · https://www.printful.com/news/printful-invests-in-UK-and-Poland
- Gelato: https://gelato.com/embroidered-clothing
- Valadio: https://www.valadio.com/
- Stanley/Stella women's polo ELLISER (exists): https://www.spreadshop.com/products/detail/stanley-stella-womens-organic-polo-shirt-elliser/2476/eu

## Update 23.10.2026 (owner check + A61 pages re-read)
- **API: confirmed.** A61 offers an internal API to transmit orders from a custom shop, with product/colour IDs from the B2B list,
  plus Shopify / WooCommerce / Shopware connectors. Documentation is sent on request ("Request Documentation" → contact page).
  Source: https://www.a61partner.de/integrate-your-custom-e-commerce-platform-with-a61partner-via-our-internal-api
- **Oversized: confirmed.** Stanley/Stella BLASTER 2.0 Oversized STTU959, 100 % organic cotton, 200 g/m²: print 1-sided 12,30 € gross
  (10,34 € net), 2-sided 17,10 € (14,37 €), embroidery 19,80 € (16,64 €). Now the unisex cut of the Graphic Series.
  ASHER Heavyweight Boxy STTU078, 280 g/m²: print 18,70 € / 23,50 € gross (15,71 € / 19,75 € net), embroidery 25,10 €: premium option later.
  STELLA Collider rolled sleeve oversized, 155 g/m²: 15,30 € / 20,10 € (not labelled as women's on the list).
- **Still open:** whether a ~30 × 40 cm back print with ~3 colours is covered by the "2-sided" price, colour/complexity surcharge,
  recommended technique (DTG/DTF), Blaster 2.0 via API. Question prepared for the A61 contact form (owner wording, 23.10.2026).
