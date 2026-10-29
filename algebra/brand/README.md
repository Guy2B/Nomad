# ALGEBRA OFFICIAL BRAND MARK

Master: `algebra-a-signature-master.svg` (ivory: `algebra-a-signature-master-ivory.svg`, same geometry)

RULE: **One A. One geometry. Everywhere.**

The two horizontal equality bars:
- same width (264)
- same height (34)
- same shape (square ends)
- same thickness
- fixed spacing (tops at 615 and 707: 58 between the bars)

Never redraw. Never regenerate with AI. Never alter proportions.

## Status

LOCKED. Validated by the owner on 23.10.2026: a vector drawing of the A on the approved brand board
(high pointed apex, finer left leg, stronger right leg, refined serifs, compact "=" in the counter).
It replaces the earlier master. Any change needs the owner's explicit written approval, then `npm run brand`.

## What may vary

| Property | Allowed |
|---|---|
| Size | yes, uniform scale only |
| Colour | ink `#111318`, ivory `#F3EBDD`, white, tonal (black on black, navy on navy) |
| Technique | embroidery, screen print, DTF, DTG, woven label, foil, embossing |
| Geometry | **never**: no stretch, no compression, no moved or thickened bars, no star, no triangle, no effect, no per-garment variant |

## Files in this folder

| File | Role |
|---|---|
| `algebra-a-signature-master.svg` | THE A. Locked source. |
| `algebra-a-signature-master-ivory.svg` | Same geometry, ivory. |
| `wordmark-signature.svg`, `-ivory.svg` | Primary brand "Algebra": the master A + "lgebra" (Cormorant Garamond SemiBold outlines). Generated. |
| `favicon.svg` | The master A, ivory on navy. Generated. |
| `circle-seal.svg`, `-ivory.svg` | A Circle seal: the master A in a fine ring (avatar, member card, packaging stamp, small formats). Generated. |
| `circle-signature.svg`, `-ivory.svg` | A Circle signature: the master A, a hairline, CIRCLE in spaced capitals (page header, e-mails). Generated. |
| `paths.json` | Geometry for the site build. Generated. |
| `production/` | Technical files for suppliers (embroidery, print), always derived from the master. |

Generated files are written by `node scripts/brand.mjs` from the master. Never edit them by hand.
Raster uses (product images, campaign retouches) rasterise the master through `scripts/brandmark.py`.

## Brand hierarchy

- **Primary brand:** the wordmark `Algebra` (header, footer, hero, institutional pages, email branding).
- **Secondary symbol:** the A alone (chest embroidery or print, labels, hangtags, packaging, favicon, small formats).
- Never stack the A above the wordmark.

## Minimum sizes

- Embroidery: A **25 mm wide (≈ 18 mm high)**. Bars and left leg are 3.7 % of the A's width: 0.9 mm at 25 mm.
  Below that the "=" closes up. If it does not read, make the A larger: never thicken the bars. To confirm with the embroiderer's sample.
- Print (DTG / DTF / screen): A ≥ 20 mm wide.
- Digital, A alone: ≥ 24 px high (the bars stay separate). Favicon 32 px and larger.
- Digital, wordmark: ≥ 22 px high (header: 22 mobile, 24 sticky, 28–29 desktop).

## Build lock

`scripts/build.mjs` stops the build when:
- `paths.json` no longer matches the master,
- the public site contains an older symbol or the font's own A used as a logo,
- this folder holds any file outside the list above,
- the favicon is not built from the master.
