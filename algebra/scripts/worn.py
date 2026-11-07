"""Worn product photos (owner 07.11.2026): one board per motif from the owner (design/refs/worn/<motif>.png),
4 columns = black, navy, ivory, olive; rows = Unisex front/back, Damen tailliert front/back, Damen gerade front/back.
The generated chest mark ("A=", "AF", plain A) is removed and the official A is printed in its place at the
product's size. Backs are the owner's boards as made from his drawings.
  -> site/assets/photos/<motif>-wf-<cut>-<color>-front|back.jpg|webp|avif
"""
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from garments import embroider, GRAPHICS  # noqa: E402
from worn_slice import tiles  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "refs" / "worn"
OUT = ROOT / "site" / "assets" / "photos"
COLS = ["black", "deep-navy", "ivory", "olive"]
CUTS = ["unisex", "women", "women-straight"]
TW, TH = 640, 560
rng = np.random.default_rng(3)


def norm(t):
    s = max(TW / t.width, TH / t.height)
    t = t.resize((round(t.width * s), round(t.height * s)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))
    x = (t.width - TW) // 2
    return t.crop((x, 0, x + TW, TH))


def find_mark(im, color):
    """The generated chest mark: a small blob of contrasting ink completely surrounded by the shirt's own fabric."""
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    ref = np.median(a[int(H * .66):int(H * .86), int(W * .38):int(W * .62)].reshape(-1, 3), axis=0)
    shirt = np.sqrt(((a - ref) ** 2).sum(axis=2)) < (55 if color == "ivory" else 50)
    shirt = cv2.morphologyEx(shirt.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
    # top of the shirt (neckline): first row where the shirt fills the centre; the mark sits below it
    cols = shirt[:, int(W * .35):int(W * .65)].mean(axis=1)
    top = int(np.argmax(cols > 0.5))
    lum = a.mean(axis=2)
    d = (ref.mean() - lum) if color == "ivory" else (lum - ref.mean())
    ink = (d > 45).astype(np.uint8)
    ink[: int(H * .2)] = 0
    ink[int(H * .7):] = 0
    n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.dilate(ink, np.ones((5, 3), np.uint8)), 8)
    best = None
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if not (9 <= h <= 48 and 7 <= w <= 80 and area >= 25):
            continue
        X0, Y0, X1, Y1 = max(0, x - 8), max(0, y - 8), min(W, x + w + 8), min(H, y + h + 8)
        ring = shirt[Y0:Y1, X0:X1].copy()
        ring[y - Y0:y - Y0 + h, x - X0:x - X0 + w] = True
        if ring.mean() < 0.8:
            continue
        if y < top + H * 0.03:
            continue
        cx = x + w / 2
        if not (W * .42 < cx < W * .85):
            continue
        if best is None or area > best[0]:
            best = (area, x, y, w, h)
    return best, ink


# marks the detector misses (low contrast on ivory, near the hair): box measured on the normalised tile
OVERRIDE = {
    ("big-bang", "women", "ivory"): (376, 280, 48, 50),
    ("entanglement", "women", "ivory"): (380, 278, 42, 30),
    ("maxwell", "women", "ivory"): (468, 288, 38, 30),
    ("maxwell", "women", "olive"): (508, 288, 36, 32),
    ("feynman", "women-straight", "ivory"): (408, 278, 36, 30),
    ("feynman", "women-straight", "olive"): (503, 323, 40, 34),
    ("lorenz", "women", "ivory"): (373, 303, 40, 38),
    ("mobius", "women", "ivory"): (373, 298, 40, 34),
    ("mobius", "women-straight", "olive"): (423, 283, 40, 34),
}


def replace(im, color, key=None):
    best = (0, *OVERRIDE[key]) if key in OVERRIDE else find_mark(im, color)[0]
    if best is None:
        return im, None
    _, x, y, w, h = best
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    mask = np.zeros(a.shape[:2], np.uint8)
    mask[max(0, y - 4):y + h + 4, max(0, x - 4):x + w + 4] = 255
    fill = cv2.inpaint(a, mask, 6, cv2.INPAINT_TELEA).astype(np.float32) + rng.normal(0, 2.0, a.shape)
    out = Image.fromarray(cv2.cvtColor(np.clip(fill, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB))
    aw = max(12, round(min(h, 34) * 0.75))  # product size: small, about 1/14 of the torso
    cx, cy = x + min(w, h) / 2, y + min(h, 34) / 2       # "A=" / "AF": centre of the A itself, not of the suffix
    return embroider(out, color, aw, (round(cx), round(cy)), printed=True), (x, y, w, h)


def save(im, name):
    im.save(OUT / f"{name}.jpg", quality=88, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=86)
    im.save(OUT / f"{name}.avif", quality=64)


if __name__ == "__main__":
    log = []
    for g in GRAPHICS:
        f = SRC / f"{g}.png"
        if not f.exists():
            continue
        ts = tiles(f, 6, 4)
        for ci, cut in enumerate(CUTS):
            for k, col in enumerate(COLS):
                fr = norm(ts[(2 * ci, k)])
                fr, box = replace(fr, col, (g, cut, col))
                log.append((g, cut, col, box))
                save(fr, f"{g}-wf-{cut}-{col}-front")
                save(norm(ts[(2 * ci + 1, k)]), f"{g}-wf-{cut}-{col}-back")
    miss = [l for l in log if l[3] is None]
    print("worn:", len(log), "fronts, marks not found:", miss)
