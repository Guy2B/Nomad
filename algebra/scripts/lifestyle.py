"""Worn photos for the Graphic Series product pages (owner 06.11.2026: "les clients doivent s'identifier").

Sources in design/refs/lifestyle/ are never changed. People, light and set are generated; brand and artwork are not:
the generated chest marks are removed and the official A is printed on the LEFT chest (as on the product), and the
generated back print is removed and the owner's real drawing (design/prints-nobg/) is printed in its place, at the
size of the real print of that cut. Only cuts and colours that are on sale are shown:

  ls-couple-a|b|c          olive Unisex (man) + ivory Damen tailliert (woman), front: same front on every motif
  ls-man-olive             olive Unisex, front
  ls-fitted-ivory-real     the owner's real test shirt (Damen tailliert, ivory), unretouched
  <motif>-ls-straight-deep-navy-back   Damen gerade, navy, back with that motif (29 cm wide, top-aligned)

Run: python3 scripts/lifestyle.py
"""
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from garments import embroider, fabric_blend, drawing, GRAPHICS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "refs" / "lifestyle"
OUT = ROOT / "site" / "assets" / "photos"
rng = np.random.default_rng(11)


def save(im, name):
    im.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=84)
    im.save(OUT / f"{name}.avif", quality=62)
    im.resize((800, round(800 * im.height / im.width)), Image.LANCZOS).save(OUT / f"{name}-800.webp", quality=84)


def erase(img, centre, half, light_mark):
    """Remove a generated mark: its ink pixels inside the box are inpainted from the fabric around them."""
    a = np.asarray(img).copy()
    x, y = centre
    x0, y0, x1, y1 = x - half, y - half, x + half, y + half
    box = a[y0:y1, x0:x1].astype(np.int16)
    lum = box.mean(axis=2)
    ref = np.median(lum)
    ink = (lum > ref + 22) if light_mark else (lum < ref - 22)
    m = np.zeros(a.shape[:2], np.uint8)
    m[y0:y1, x0:x1] = ink.astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=3)
    bgr = cv2.cvtColor(a, cv2.COLOR_RGB2BGR)
    fill = cv2.inpaint(bgr, m, 7, cv2.INPAINT_TELEA).astype(np.float32)
    fill += rng.normal(0, 2.2, fill.shape)
    k = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 1.0)[..., None]
    out = np.clip(bgr * (1 - k) + fill * k, 0, 255).astype(np.uint8)
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))


def couple(src, man_old, man_new, woman, name, man_w=26, woman_w=24, woman_new=None):
    im = Image.open(SRC / src).convert("RGB")
    im = erase(im, man_old, 22, True)
    im = erase(im, woman, 20, False)
    im = embroider(im, "olive", man_w, man_new, printed=True)   # the man's left chest (image right), out towards the shoulder as on campaign-couple (owner 06.11.2026)
    im = embroider(im, "ivory", woman_w, woman_new or woman, printed=True)
    save(im, name)
    return im


def man_olive():
    im = Image.open(SRC / "man-olive.jpg").convert("RGB")
    im = erase(im, (667, 508), 32, True)
    im = embroider(im, "olive", 40, (667, 508), printed=True)
    save(im, "ls-man-olive")


def real_fitted():
    im = Image.open(SRC / "real-fitted-ivory-front.jpg").convert("RGB")
    save(im, "ls-fitted-ivory-real")


def straight_navy_backs():
    base = Image.open(SRC / "woman-straight-navy-back.jpg").convert("RGB")
    a = cv2.cvtColor(np.asarray(base), cv2.COLOR_RGB2BGR)
    H, W = a.shape[:2]
    # the generated print: everything clearly lighter or more coloured than the navy jersey, inside the print zone
    zone = np.zeros((H, W), np.uint8)
    cv2.rectangle(zone, (378, 462), (752, 1012), 255, -1)
    b, g, r = [a[..., i].astype(np.int16) for i in range(3)]
    jersey = np.median(np.maximum(np.maximum(r, g), b)[zone > 0])
    ink = (np.maximum(np.maximum(r, g), b) > jersey + 18) | ((r - b) > 6) | ((g - b) > 4)
    m = ((zone > 0) & ink).astype(np.uint8) * 255
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)), iterations=2)
    small = cv2.inpaint(cv2.resize(a, (W // 2, H // 2)), cv2.resize(m, (W // 2, H // 2)), 11, cv2.INPAINT_TELEA)
    fill = cv2.resize(small, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    fill += rng.normal(0, 2.4, fill.shape)
    k = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 1.4)[..., None]
    clean = Image.fromarray(cv2.cvtColor(np.clip(a * (1 - k) + fill * k, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB))
    clean.save(SRC.parent.parent.parent / "design" / "refs" / "lifestyle" / "_clean-straight-navy-back.jpg", quality=90)
    # Damen gerade: 29 x 36 cm on a size M back (about 51 cm half chest = the 640 px between the side seams here)
    aw = 365
    for g in GRAPHICS:
        art = drawing(g, "deep-navy")
        art = art.resize((aw, round(art.height * aw / art.width)), Image.LANCZOS)
        im = fabric_blend(clean, art, (566 - aw // 2, 478), strength=0.95)
        save(im, f"{g}-ls-straight-deep-navy-back")


if __name__ == "__main__":
    # A placed as on the product page (owner 07.11.2026): from the collar centre, 0.24 x torso width towards the
    # wearer's left, 0.32 x torso width below the neckline, A width 0.065 x torso width
    couple("couple-olive-ivory-a.jpg", (617, 357), (798, 402), (1153, 500), "ls-couple-a", man_w=29, woman_w=21, woman_new=(1147, 497))
    couple("couple-olive-ivory-b.jpg", (648, 360), (870, 419), (1110, 485), "ls-couple-b", man_w=30, woman_w=18, woman_new=(1102, 500))
    couple("couple-olive-ivory-c.jpg", (301, 373), (498, 405), (797, 481), "ls-couple-c", man_w=30, woman_w=18, woman_new=(817, 475))
    man_olive()
    real_fitted()
    straight_navy_backs()
    print("lifestyle: 3 couples, olive man, real fitted ivory, 9 straight navy backs")
