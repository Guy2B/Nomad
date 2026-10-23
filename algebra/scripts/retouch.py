"""Campaign images: visual truth pass (reversible: sources in design/refs/ are never changed).

The campaign images are generated (people, light, set). Brand and artwork are never generated: they are removed from the
generated image and replaced by the real thing, composited afterwards.

  campaign-graphic (hero)
    - the generated chest mark (a triangle A with a star) is removed, the official A is printed in its place
      (Graphic Series tees carry the A printed on the left chest);
    - the generated back print (an invented "Quantum Entanglement") is removed from the black jersey and replaced by
      the owner's real Entanglement drawing (design/prints/entanglement.png), blended with the fabric's light.
  tile-men (Form. Struktur. Balance.)
    - the generated triangle logo on the polo is removed, the official A is embroidered in its place (The Polo carries it).
  tile-women (Knitwear, editorial)
    - the old A on the knit is removed, the official A is embroidered in its place.

The A always comes from brand/algebra-a-signature-master.svg (scripts/brandmark.py), the artwork from design/prints/.
Run: python3 scripts/retouch.py
"""
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from garments import embroider, fabric_blend, drawing  # noqa: E402  same A, same ink model as the product images

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "design" / "refs"
OUT = ROOT / "site" / "assets" / "photos"
rng = np.random.default_rng(7)


def save(im, name):
    im.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=84)
    im.save(OUT / f"{name}.avif", quality=62)
    if (OUT / f"{name}-800.webp").exists():
        im.resize((800, round(800 * im.height / im.width)), Image.LANCZOS).save(OUT / f"{name}-800.webp", quality=84)


def patch(img, box, dx, dy, feather=6):
    """Cover box with the fabric next to it (shifted by dx, dy), feathered edges: removes a mark without smearing."""
    a = np.asarray(img).astype(np.float32)
    x0, y0, x1, y1 = box
    src = a[y0 + dy : y1 + dy, x0 + dx : x1 + dx]
    m = np.zeros((y1 - y0, x1 - x0), np.float32)
    m[feather:-feather, feather:-feather] = 1
    m = cv2.GaussianBlur(m, (0, 0), feather / 2)[..., None]
    a[y0:y1, x0:x1] = a[y0:y1, x0:x1] * (1 - m) + src * m
    return Image.fromarray(a.astype(np.uint8))


def hero():
    img = cv2.imread(str(REFS / "campaign-graphic.jpg"))
    H, W = img.shape[:2]
    # 1. generated marks and print: light ink on the black jersey, inside the garments only (skin and background untouched)
    tee = Image.new("L", (W, H), 0)
    ImageDraw.Draw(tee).polygon([(735, 196), (900, 196), (1000, 250), (1088, 330), (1122, 470), (1126, 608), (1046, 636),
                                 (1040, 935), (602, 935), (602, 652), (528, 640), (520, 470), (560, 330), (640, 252)], fill=255)
    ImageDraw.Draw(tee).rectangle((312, 405, 376, 482), fill=255)  # chest mark of the front model
    tee = np.asarray(tee) > 0
    b, g, r = [img[..., i].astype(np.int16) for i in range(3)]
    lum = np.maximum(np.maximum(r, g), b)
    # the garment itself: dark jersey, closed over the print, holes filled; the grey background stays out
    dark = ((lum < 42) & tee).astype(np.uint8) * 255
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
    flood = dark.copy()
    cv2.floodFill(flood, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 255)
    garment = (dark > 0) | (flood == 0)
    ink = (lum > 38) | ((b - r) > 12) | ((r - b) > 20)
    mask = (garment & tee & ink).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
    small = cv2.inpaint(cv2.resize(img, (W // 2, H // 2)), cv2.resize(mask, (W // 2, H // 2)), 9, cv2.INPAINT_TELEA)
    fill = cv2.resize(small, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    fill += rng.normal(0, 2.6, fill.shape)  # jersey grain
    m = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 1.2)[..., None]
    clean = np.clip(img * (1 - m) + fill * m, 0, 255).astype(np.uint8)
    im = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))
    # 2. the real artwork on the back: centred on the spine, below the collar, about 35 x 50 cm on this garment
    art = drawing("entanglement")
    aw = 330
    art = art.resize((aw, round(art.height * aw / art.width)), Image.LANCZOS)
    im = fabric_blend(im, art, (812 - aw // 2, 262), strength=0.95)
    # 3. the official A printed on the front model's left chest (about 25 mm on this garment)
    im = embroider(im, "black", 24, (343, 440), printed=True)
    save(im, "campaign-graphic")
    return im


def tile_men():
    im = Image.open(REFS / "tile-men.jpg").convert("RGB")
    im = patch(im, (552, 742, 646, 816), -96, 0)          # generated triangle logo → plain piqué next to it
    im = embroider(im, "black", 46, (598, 780))            # official A, ivory thread, left chest
    save(im, "tile-men")
    return im


def tile_women():
    im = Image.open(REFS / "tile-women.jpg").convert("RGB")
    im = patch(im, (424, 816, 524, 898), 0, -96)          # old A → the knit just above it
    im = embroider(im, "ivory", 72, (474, 858))            # official A, dark thread on ivory knit
    save(im, "tile-women")
    return im


if __name__ == "__main__":
    h, m, w = hero(), tile_men(), tile_women()
    prev = ROOT.parent / "pass"
    if prev.exists():
        h.save(prev / "rt-hero.jpg"); m.save(prev / "rt-men.jpg"); w.save(prev / "rt-women.jpg")
    print("campaign retouched: hero (real Entanglement + official A), tile-men, tile-women")
