"""Worn product photos, full resolution (owner 07.11.2026): blank shirts generated one photo at a time
(design/refs/worn2/<cut>-<color>-front|back.png). On top we print what Algebra actually produces:
  - front: the official A, at the product page's place and size (garments.py CHEST / SYMBOL, garment box);
  - back: the owner's real drawing (design/prints-nobg/), at the real print width of that cut, below the collar.
  -> site/assets/photos/<motif>-wf-<cut>-<color>-front|back.jpg|webp|avif
"""
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from garments import embroider, fabric_blend, drawing, GRAPHICS, CHEST, SYMBOL  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "refs" / "worn2"
OUT = ROOT / "site" / "assets" / "photos"
COLOR = {"black": "black", "navy": "deep-navy", "ivory": "ivory", "olive": "olive"}
# print width / shirt width at the chest (size M): unisex 39 cm on 53.5, fitted 33 on 47, straight 29 on 51
PRINT = {"unisex": 39 / 53.5, "women": 33 / 47, "women-straight": 29 / 51}
DEBUG = "--debug" in sys.argv


def shirt_mask(im):
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    seed = a[int(H * .5):int(H * .6), int(W * .45):int(W * .55)].reshape(-1, 3)
    ref = np.median(seed, axis=0)
    lum_ref = ref.mean()
    d = np.sqrt(((a - ref) ** 2).sum(axis=2))
    tol = 34 if lum_ref > 150 else 46
    near = (d < tol).astype(np.uint8)
    near[: int(H * .12)] = 0
    near = cv2.morphologyEx(near, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab = cv2.connectedComponents(near)
    m = (lab == lab[int(H * .55), W // 2]).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m)
    cv2.drawContours(out, [max(cnts, key=cv2.contourArea)], -1, 255, -1)
    return out > 0


def geometry(m):
    ys, xs = np.where(m)
    gx0, gx1, gy0, gy1 = xs.min(), xs.max(), ys.min(), ys.max()
    gh = gy1 - gy0
    # torso width: below the sleeves, at 55 % of the garment height
    row = m[gy0 + int(gh * .55)]
    tx = np.where(row)[0]
    centre = m[:, (gx0 + gx1) // 2]
    collar = int(np.where(centre)[0].min())
    return dict(gx0=gx0, gx1=gx1, gy0=gy0, gy1=gy1, tw=tx.max() - tx.min(), tc=(tx.max() + tx.min()) // 2, collar=collar)


def save(im, name):
    im.save(OUT / f"{name}.jpg", quality=88, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=86)
    im.save(OUT / f"{name}.avif", quality=64)


def front(cut, col):
    f = SRC / f"{cut}-{col}-front.png"
    if not f.exists():
        return None
    im = Image.open(f).convert("RGB")
    g = geometry(shirt_mask(im))
    gw, gh = g["gx1"] - g["gx0"], g["gy1"] - g["gy0"]
    cx = g["gx0"] + CHEST["tee"][0] * gw
    cy = g["gy0"] + CHEST["tee"][1] * gh
    out = embroider(im, COLOR[col], round(SYMBOL["tee"] * gw), (round(cx), round(cy)), printed=True)
    return out, g


def back(cut, col, design):
    f = SRC / f"{cut}-{col}-back.png"
    if not f.exists():
        return None
    im = Image.open(f).convert("RGB")
    g = geometry(shirt_mask(im))
    w = round(PRINT[cut] * g["tw"])
    art = drawing(design, COLOR[col])
    art = art.resize((w, round(art.height * w / art.width)), Image.LANCZOS)
    top = g["collar"] + round(0.11 * g["tw"])  # about 6 cm below the collar seam
    return fabric_blend(im, art, (g["tc"] - w // 2, top), strength=0.95), g


if __name__ == "__main__":
    done = []
    for cut in PRINT:
        for col in COLOR:
            fr = front(cut, col)
            for d in GRAPHICS:
                bk = back(cut, col, d)
                if fr and bk:
                    save(fr[0], f"{d}-wf-{cut}-{COLOR[col]}-front")
                    save(bk[0], f"{d}-wf-{cut}-{COLOR[col]}-back")
                    done.append((cut, col, d))
            if DEBUG and fr:
                print(cut, col, "front", fr[1])
    print("worn2:", len(done), "pairs")
