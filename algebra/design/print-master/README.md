# print-master

High-resolution files that are actually sent to production, one per design (e.g. `mandelbrot.png`).
Empty on purpose: none is print-ready yet.

| Layer | Folder | Sent to production? |
|---|---|---|
| design-source | `design/prints/` (owner's drawings, 1024 × 1536 px) | **Never** |
| print-master | `design/print-master/` | Yes, once listed in `PRINT_MASTER` (worker/src/fulfillment/mapping.js) |
| product-mockup | `site/assets/photos/` (made by `scripts/garments.py`) | No, marketing only |

Target for a full back: the print area Valadio confirms (about 35 × 50 cm). At 300 dpi that is about
4130 × 5900 px; 200 dpi (about 2760 × 3940 px) is the usual minimum for DTG/DTF. Transparent PNG, sRGB,
colours checked on a test print. The 1024 × 1536 sources must be redrawn or upscaled and cleaned before.
