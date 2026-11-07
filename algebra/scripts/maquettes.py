"""Flat product mock-ups from the owner's pack (design/refs/maquettes, ALGEBRA_MAQUETTES_PRODUITS_WEBP, 07.11.2026):
real drawings and the official A, no model. They replace the old flat 'stage' images (front | back) of every
motif / cut / colour, and the unisex card packshots.
  python3 scripts/maquettes.py <motif ...> [--cards]
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent.parent / "_maq" / "WEBP"
OUT = ROOT / "site" / "assets" / "photos"
COL = {"black": "black", "navy": "deep-navy", "ivory": "ivory", "olive": "olive"}


def save(im, name, small=False):
    im.save(OUT / f"{name}.jpg", quality=88, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=86)
    im.save(OUT / f"{name}.avif", quality=60)
    if small:
        im.resize((400, 500), Image.LANCZOS).save(OUT / f"{name}-400.webp", quality=84)


for g in [a for a in sys.argv[1:] if not a.startswith("--")]:
    for cut in ["women", "women-straight"]:  # owner 07.11.2026: unisex keeps its own mock-ups
        for c, cc in COL.items():
            f = Image.open(SRC.parent / "fronts_fixed" / f"maquette-{cut}-{c}-front.png").convert("RGB").resize((800, 1000), Image.LANCZOS)  # official A at the unisex size
            b = Image.open(SRC / "DOS_MOTIFS" / g / cut / f"{g}-{cut}-{c}-back.webp").convert("RGB").resize((800, 1000), Image.LANCZOS)
            st = Image.new("RGB", (1600, 1000)); st.paste(f, (0, 0)); st.paste(b, (800, 0))
            save(st, f"{g}-{cc}-stage" if cut == "unisex" else f"{g}-{cut}-{cc}-stage")
            if cut == "unisex" and "--cards" in sys.argv:
                save(f, f"{g}-{cc}-front", small=True)
                save(b, f"{g}-{cc}-back", small=True)
    print(g, "ok")
