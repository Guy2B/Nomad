"""Graphic Series: product images for the extra cuts (oversize, women fitted, women straight).

The garment is the supplier's own template of the exact blank we order (design/printegy-layers/, exported from the
supplier editor, not in Git): white garment shape, tinted with the supplier's colour of that blank, the real
artwork placed where the supplier prints it (full print area, fitted, centred), then the fabric shading on top.
The A comes from brand/algebra-a-signature-master.svg (scripts/brandmark.py), the artwork from design/prints/.
The classic unisex cut keeps the existing photos (scripts/garments.py).

  python3 scripts/cuts.py [design ...]
  -> site/assets/photos/<design>-<cut>-<color>-stage   front and back side by side (product page)
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

import brandmark

ROOT = Path(__file__).resolve().parent.parent
LAYERS = ROOT / "design" / "printegy-layers"
PRINTS = ROOT / "design" / "prints"
OUT = ROOT / "site" / "assets" / "photos"
BG = (242, 238, 229)  # same paper as the existing stage images
INK, IVORY = (17, 19, 24), (243, 235, 221)  # master A colours

# cut -> supplier template product, print area (px at 300 dpi), A position on the front file (centre, width), and
# the supplier colour used for each site colour (same colour name we order)
CUTS = {
    "oversize": dict(product="82", area=(4606, 5787), a=(3484, 945, 295),
                     colors={"black": "Black", "deep-navy": "French Navy", "olive": "Khaki", "ivory": "Natural Raw"}),
    "women": dict(product="2", area=(4606, 5787), a=(3484, 945, 295),
                  colors={"black": "Black", "deep-navy": "Navy", "olive": "Urban Khaki", "ivory": "Natural"}),
    "women-straight": dict(product="113", area=(3425, 4606), a=(2657, 827, 295),
                           colors={"black": "Black", "deep-navy": "French Navy", "olive": "Khaki", "ivory": "Natural Raw"}),
}
LIGHT = {"ivory"}
META = json.loads((LAYERS / "meta.json").read_text())


def layer(name):
    return Image.open(LAYERS / name).convert("RGBA")


def side_image(t, side, hexcol, art=None, a_spec=None, light=False, area=None):
    s = t[side]
    bg, fg = layer(s["background"]), layer(s["foreground"])
    W, H = bg.size
    rgb = tuple(int(hexcol[i : i + 2], 16) for i in (1, 3, 5))
    base = np.zeros((H, W, 3), np.float32)
    base[:] = rgb
    alpha = np.asarray(bg)[..., 3:4].astype(np.float32) / 255
    L, T, MW, MH = s["maskLeft"], s["maskTop"], s["maskWidth"], s["maskHeight"]
    if art is not None:  # back: drawing fitted in the print area, centred
        k = min(MW / art.width, MH / art.height)
        im = art.resize((max(1, round(art.width * k)), max(1, round(art.height * k))), Image.LANCZOS)
        x, y = L + (MW - im.width) // 2, T + (MH - im.height) // 2
        a = np.asarray(im).astype(np.float32) / 255
        reg = base[y : y + im.height, x : x + im.width]
        reg[:] = reg * (1 - a[..., 3:4]) + a[..., :3] * 255 * a[..., 3:4]
    if a_spec is not None:  # front: the official A at its print position (25 mm wide)
        cx, cy, aw = a_spec
        k = MW / area[0]
        m = brandmark.mask(aw * k)
        x, y = round(L + cx * k - m.shape[1] / 2), round(T + cy * k - m.shape[0] / 2)
        col = np.array(INK if light else IVORY, np.float32)
        reg = base[y : y + m.shape[0], x : x + m.shape[1]]
        reg[:] = reg * (1 - m[..., None]) + col * m[..., None]
    # fabric shading (multiply), garment shape
    f = np.asarray(fg).astype(np.float32) / 255
    shade = f[..., :3] * f[..., 3:4] + (1 - f[..., 3:4])
    out = base * shade
    paper = np.array(BG, np.float32)
    out = out * alpha + paper * (1 - alpha)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), np.asarray(bg)[..., 3] > 8


def stage(front, back, fm, bm, out_w=1600):
    ys, xs = np.where(fm | bm)
    pad = 24
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(front.width, xs.max() + pad), min(front.height, ys.max() + pad))
    f, b = front.crop(box), back.crop(box)
    gap = round(f.width * 0.08)
    canvas = Image.new("RGB", (f.width * 2 + gap * 3, f.height + gap * 2), BG)
    canvas.paste(f, (gap, gap))
    canvas.paste(b, (gap * 2 + f.width, gap))
    return canvas.resize((out_w, round(out_w * canvas.height / canvas.width)), Image.LANCZOS)


def save(img, name):
    img.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    img.save(OUT / f"{name}.webp", quality=84)
    img.save(OUT / f"{name}.avif", quality=62)


def make(design):
    art = Image.open(PRINTS / f"{design}.png").convert("RGBA")
    made = []
    for cut, spec in CUTS.items():
        p = META[spec["product"]]
        by_name = {v["name"]: v for v in p["variants"]}
        tpl = {t["id"]: t for t in p["templates"]}
        for color, sname in spec["colors"].items():
            v = by_name[sname]
            t = tpl[v["layer"]]
            light = color in LIGHT
            front, fm = side_image(t, "front", v["color"], a_spec=spec["a"], light=light, area=spec["area"])
            back, bm = side_image(t, "back", v["color"], art=art)
            save(stage(front, back, fm, bm), f"{design}-{cut}-{color}-stage")
            made.append(f"{design}-{cut}-{color}")
    return made


if __name__ == "__main__":
    designs = sys.argv[1:] or ["big-bang", "entanglement", "feynman", "lorenz", "mandelbrot", "maxwell", "higgs", "euler", "mobius"]
    for d in designs:
        print(d, len(make(d)))
