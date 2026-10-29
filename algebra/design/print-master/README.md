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

## Candidates (29.10.2026)

Made by `scripts/upscale.py` from the 1024 × 1536 sources: classical Lanczos resampling (two ×2 steps, light sharpening,
premultiplied alpha). Nothing generated or redrawn. 4096 × 6144 px, RGBA, sRGB, 300 dpi tag: about 315 dpi at 33 × 49.5 cm,
inside a 39 × 49 cm print area.

Kept outside Git (about 30 MB each) on the owner's computer: `Dropshipping/Algebra-print-master-candidates/`
(with `SHA256SUMS.txt`). Status: **candidate**. They become print-masters only after the owner approves each file and a
test print is checked; then they are copied here and listed in `PRINT_MASTER`.

| File | SHA-256 |
|---|---|
| `big-bang-print-master-candidate-4096x6144.png` | `f03424a625ac0b46c07b8451ed1f0f6b35f0c2339c05b963d35d7579bca80fff` |
| `entanglement-print-master-candidate-4096x6144.png` | `4dc9dbac050b4c9dec1c387ecc6b18179c386a40e09862c31e6c88c7183f6248` |
| `euler-print-master-candidate-4096x6144.png` | `a360f35468f28ec50a4d87c9855db383369a2e0c4455741ff2f921893bb4bfd2` |
| `feynman-print-master-candidate-4096x6144.png` | `60ddd79baad5a9c8476433bda885025ef20886835c4a6ba0e9f401ca9b4414c9` |
| `higgs-print-master-candidate-4096x6144.png` | `4a9896d9afe6e4c703653b62ced05ad0819fc350ce1883631503e2fffebf2335` |
| `lorenz-print-master-candidate-4096x6144.png` | `41e083d95d9953cab6f16ee46fe059f2dd87ca2903a2c887be831ca18d97a7d5` |
| `mandelbrot-print-master-candidate-4096x6144.png` | `39b73c58f61452386407f2f5fca1c3c7b2feaac906dc47b1fdaef4beb72676a6` |
| `maxwell-print-master-candidate-4096x6144.png` | `dd2dbb61f35b6ccb3f478e7f04f847c2fd95666b192795ac1823236ca92b412c` |
| `mobius-print-master-candidate-4096x6144.png` | `42223e08ac5d38bb306c419b7d23e70b118ac18071df58f5c4690f6582b76255` |
