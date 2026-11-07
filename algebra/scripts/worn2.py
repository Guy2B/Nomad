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
# drawing width / back width measured on the photo at the armpit line. Calibrated on the owner's real worn test
# shirt (B&C fitted ivory, 32.7 cm print on a 47 cm half chest = 0.70 physical): on the body it reads as about 0.88 of
# the visible back and reaches the lower back. Same factor (x 1.25) for every cut:
# unisex 39/53.5 -> 0.91, fitted 33/47 -> 0.88, straight 29/51 (the blank's maximum) -> 0.71.
PRINT = {"unisex": 0.91, "women": 0.88, "women-straight": 0.71}
DEBUG = "--debug" in sys.argv


# long dark hair on a dark shirt joins the mask: the shirt starts at this row (collar), measured on the photo
TOP = {
    ("women-straight", "black", "front"): 452,
    ("women-straight", "navy", "front"): 392,
    ("women-straight", "black", "back"): 336,
}


def shirt_mask(im, top=None):
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    seed = a[int(H * .5):int(H * .6), int(W * .45):int(W * .55)].reshape(-1, 3)
    ref = np.median(seed, axis=0)
    lum_ref = ref.mean()
    d = np.sqrt(((a - ref) ** 2).sum(axis=2))
    tol = 34 if lum_ref > 150 else 46
    near = (d < tol).astype(np.uint8)
    near[: int(H * .12)] = 0
    if top:
        near[:top] = 0
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
    # chest width: the body just below the sleeves (armpit line), where the print sits; the width there is what the
    # real print is measured against (owner 07.11.2026: the drawing covers about 70 % of the back)
    widths = []
    for y in range(gy0 + int(gh * .25), gy0 + int(gh * .75)):
        x = np.where(m[y])[0]
        widths.append((y, x.max() - x.min() if len(x) else 0, x))
    wmax = max(w for _, w, _ in widths)
    arm = next((t for t in widths if t[1] < 0.80 * wmax), widths[len(widths) // 2])
    tx = arm[2]
    centre = m[:, (gx0 + gx1) // 2]
    collar = int(np.where(centre)[0].min())
    return dict(arm=arm[0], mask=m, gx0=gx0, gx1=gx1, gy0=gy0, gy1=gy1, tw=tx.max() - tx.min(), tc=(tx.max() + tx.min()) // 2, collar=collar)


def save(im, name):
    im.save(OUT / f"{name}.jpg", quality=88, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=86)
    im.save(OUT / f"{name}.avif", quality=64)


def front(cut, col):
    f = SRC / f"{cut}-{col}-front.png"
    if not f.exists():
        return None
    im = Image.open(f).convert("RGB")
    g = geometry(shirt_mask(im, TOP.get((cut, col, "front"))))
    # left chest of the wearer (image right), measured on the body itself, not on the garment box (sleeves and
    # pose move the box): about 12 cm from the centre and 9 cm below the front neckline on a size M (chest 53.5 cm),
    # A 25 mm wide (owner 07.11.2026: the A sits on the chest, below the collar, never towards the arm)
    cw = g["tw"]
    # body centre = centre of the neck opening (the pose may shift the torso, the neckline does not lie)
    m = g["mask"]
    tc = g["tc"]
    for dy in (6, 12, 18, 24):
        row = m[g["collar"] + dy, g["gx0"]:g["gx1"]]
        xs = np.where(row)[0]
        gaps = [(xs[i] + xs[i + 1]) / 2 + g["gx0"] for i in range(len(xs) - 1) if xs[i + 1] - xs[i] > 0.12 * cw]
        if gaps:
            tc = min(gaps, key=lambda v: abs(v - g["tc"]))
            break
    # measured on the product page's own front (site/assets/photos/<motif>-<color>-stage): the A centre sits
    # 0.17 x chest width right of the centre, 0.23 x chest width above the armpit line, 0.038 x chest wide
    # owner 07.11.2026: the A sits near the middle of the left pectoral. Measured on the body, from the torso width at
    # the waist (arms and sleeves excluded): 0.24 x waist towards the wearer's left, 0.29 x waist below the neckline,
    # 0.07 x waist wide (owner's reference: the essentials ivory tee packshot)
    m = g["mask"]
    yw = int(g["collar"] + 0.7 * (g["gy1"] - g["collar"]))
    r = np.where(m[yw])[0]
    ww, wc = r.max() - r.min(), (r.max() + r.min()) / 2
    # women's cuts: the owner's women reference (fitted ivory packshot) sits a little further out and higher
    fx, fy, fs = {"women": (0.21, 0.26, 0.08), "women-straight": (0.215, 0.27, 0.08)}.get(cut, (0.24, 0.29, 0.07))
    cx = wc + fx * ww
    cy = g["collar"] + fy * ww
    out = embroider(im, COLOR[col], max(14, round(fs * ww)), (round(cx), round(cy)), printed=True)
    return out, g


def back(cut, col, design):
    f = SRC / f"{cut}-{col}-back.png"
    if not f.exists():
        return None
    im = Image.open(f).convert("RGB")
    g = geometry(shirt_mask(im, TOP.get((cut, col, "back"))))
    w = round(PRINT[cut] * g["tw"])
    art = drawing(design, COLOR[col])
    art = art.resize((w, round(art.height * w / art.width)), Image.LANCZOS)
    top = g["collar"] + round(0.12 * g["tw"])  # as on the real test shirts: a hand below the collar  # about 3 to 4 cm below the collar seam, as on the real shirts
    out = fabric_blend(im, art, (g["tc"] - w // 2, top), strength=0.95)
    # the print stays on the shirt: hair or arms over the back stay in front of it
    keep = np.asarray(im)
    o = np.asarray(out).copy()
    o[~g["mask"]] = keep[~g["mask"]]
    return Image.fromarray(o), g


if __name__ == "__main__":
    done = []
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    for cut in (only or PRINT):
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
