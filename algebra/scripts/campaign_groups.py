"""Group campaign photos (owner 06.11.2026: "ces images sont capitales pour une belle visibilité").

Sources design/refs/lifestyle/group-*.jpg are never changed. People, light and set are generated; what Algebra sells is
made true afterwards:
  - every generated back print is removed and the owner's real drawing is printed in its place (design/prints-nobg/);
  - every generated chest mark ("A=", "AF", plain A) is removed and the official A is printed on the LEFT chest;
  - shirts in colours Algebra does not sell (teal, burgundy) are re-dyed to a sold colour (navy, olive), folds kept.
Run: python3 scripts/campaign_groups.py  ->  site/assets/photos/campaign-<name>.jpg|webp|avif|-800.webp
"""
from pathlib import Path
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from garments import embroider, fabric_blend, drawing  # noqa: E402
from lifestyle import save, erase  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "refs" / "lifestyle"
rng = np.random.default_rng(23)
NAVY = np.array([27, 31, 52], np.float32)
OLIVE = np.array([66, 64, 38], np.float32)


def poly_mask(size, pts):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m) > 0


def shirt_mask(im, seed, box, tol):
    """The shirt itself: jersey pixels close to the colour at the seed, connected to it inside the box, with the
    print's holes filled (skin, hair, bag and background stay out)."""
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    x0, y0, x1, y1 = box
    sx, sy = seed
    ref = np.median(a[sy - 6:sy + 7, sx - 6:sx + 7].reshape(-1, 3), axis=0)
    dist = np.sqrt(((a - ref) ** 2).sum(axis=2))
    near = np.zeros((H, W), np.uint8)
    near[y0:y1, x0:x1] = (dist[y0:y1, x0:x1] < tol).astype(np.uint8)
    n, lab = cv2.connectedComponents(near, connectivity=8)
    comp = (lab == lab[sy, sx]).astype(np.uint8) * 255
    comp = cv2.morphologyEx(comp, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    filled = np.zeros_like(comp)
    if cnts:
        cv2.drawContours(filled, [max(cnts, key=cv2.contourArea)], -1, 255, -1)
    m = filled > 0
    return m, ref


def is_dye(a, kind):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if kind == "teal":
        return (g > r + 10) & (b > r + 4)
    return (r > 32) & (r - g > 16) & (np.abs(g - b) < 30) & (r > 1.9 * g)


def dye_mask(im, box, kind):
    """A shirt in a colour Algebra does not sell, found by its dye (teal or burgundy), print holes filled."""
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    x0, y0, x1, y1 = box
    m = np.zeros((H, W), np.uint8)
    m[y0:y1, x0:x1] = is_dye(a[y0:y1, x0:x1], kind).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35)))
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(m)
    cv2.drawContours(out, [max(cnts, key=cv2.contourArea)], -1, 255, -1)
    return out > 0


def remove_print(im, seed, box, tol=42, thr=30, protect=None, debug=None, mask=None):
    """Remove the generated print inside one shirt: ink pixels are refilled with the shirt's own colour and light,
    estimated from the clean jersey around them."""
    a = np.asarray(im).astype(np.float32)
    if mask is not None:
        shirt = mask.copy()
        ref = np.median(a[shirt & ~(cv2.dilate((np.abs(a - np.median(a[mask], axis=0)).sum(axis=2) > 60).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)], axis=0)
    else:
        shirt, ref = shirt_mask(im, seed, box, tol)
    if protect is not None:
        shirt &= ~protect
    dist = np.sqrt(((a - ref) ** 2).sum(axis=2))
    ink = shirt & (dist > thr)
    ink = cv2.dilate(ink.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)), iterations=2) > 0
    ink &= shirt
    keep = (shirt & ~ink).astype(np.float32)
    def blur(x, s):
        return cv2.GaussianBlur(x, (0, 0), s)
    fill = None
    for s_ in (60, 20):
        num = np.stack([blur(a[..., c] * keep, s_) for c in range(3)], -1)
        den = blur(keep, s_)[..., None]
        est = num / np.maximum(den, 1e-3)
        if fill is None:
            fill = est
        else:
            w = np.clip(den / 0.35, 0, 1)
            fill = fill * (1 - w) + est * w
    fill += rng.normal(0, 2.2, fill.shape)
    k = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), 1.0)[..., None]
    out = np.clip(a * (1 - k) + fill * k, 0, 255).astype(np.uint8)
    if debug is not None:
        debug.append(shirt)
    return Image.fromarray(out), shirt


def redye(im, shirt, target, kind):
    """Re-dye a whole shirt (its print already removed): same light and folds, sold colour. The shirt mask is widened
    to every pixel of the old dye next to it (sunlit edges, seams)."""
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dye = is_dye(a, kind)
    near = cv2.dilate(shirt.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))) > 0
    if kind != "teal":  # burgundy edges: red with blue >= green (skin has green above blue)
        dye = (r - g > 22) & (b >= g - 5) & (r > 40)
    sel = shirt | (dye & near)
    lum = a.mean(axis=2)
    med = np.median(lum[shirt])
    rel = np.clip(lum / med, 0.3, 2.6)[..., None]
    new = np.clip(target * rel, 0, 255)
    k = cv2.GaussianBlur(sel.astype(np.float32), (0, 0), 0.8)[..., None]
    return Image.fromarray((a * (1 - k) + new * k).astype(np.uint8))


def put(im, design, color, cx, top, w, protect_img=None, protect=None):
    art = drawing(design, color)
    art = art.resize((w, round(art.height * w / art.width)), Image.LANCZOS)
    out = fabric_blend(im, art, (cx - w // 2, top), strength=0.95)
    if protect is not None:
        o = np.asarray(out).copy()
        o[protect] = np.asarray(protect_img)[protect]
        out = Image.fromarray(o)
    return out


# A on the chest where the photo's own mark sat (on the torso, clear of arms and collar), at the product's size
# (owner 07.11.2026: never on an arm, under the armpit or on the collar)
def front(im, old, half, light_mark, color, new, w):
    im = erase(im, old, half, light_mark)
    return embroider(im, color, w, new, printed=True)


DEBUG = []


def walk():
    im = Image.open(SRC / "group-walk.jpg").convert("RGB")
    W, H = im.size
    st = Image.new("L", (W, H), 0)
    ImageDraw.Draw(st).line([(322, 300), (300, 450), (268, 640), (258, 720)], fill=255, width=24)
    strap = np.asarray(st) > 0
    orig = im.copy()
    im, _ = remove_print(im, (420, 680), (195, 290, 515, 752), tol=34, thr=28, protect=strap, debug=DEBUG)
    im, _ = remove_print(im, (700, 700), (552, 318, 848, 758), tol=30, debug=DEBUG)
    im, _ = remove_print(im, (980, 690), (838, 352, 1122, 752), tol=30, debug=DEBUG)
    im = put(im, "feynman", "ivory", 402, 352, 216, protect_img=orig, protect=strap)
    im = put(im, "mandelbrot", "olive", 716, 345, 240)
    im = put(im, "big-bang", "deep-navy", 990, 384, 212)
    im = front(im, (160, 340), 26, True, "black", (162, 338), 16)
    im = front(im, (522, 330), 22, True, "deep-navy", (524, 330), 13)
    save(im, "campaign-walk")


def steps_b():
    im = Image.open(SRC / "group-steps-b.jpg").convert("RGB")
    im, _ = remove_print(im, (110, 420), (40, 215, 498, 592), debug=DEBUG)
    im, _ = remove_print(im, (1000, 1080), (700, 685, 1122, 1132), debug=DEBUG)
    im = put(im, "maxwell", "deep-navy", 268, 255, 236)
    im = put(im, "entanglement", "black", 952, 736, 266)
    im = front(im, (865, 307), 26, False, "ivory", (868, 306), 20)
    im = front(im, (483, 910), 28, True, "olive", (488, 905), 22)
    save(im, "campaign-steps")


def steps_a():
    im = Image.open(SRC / "group-steps-a.jpg").convert("RGB")
    im, _ = remove_print(im, (200, 760), (0, 222, 482, 822), debug=DEBUG)
    wm = dye_mask(im, (700, 404, 1122, 1000), "burgundy")
    im, _ = remove_print(im, None, None, mask=wm, debug=DEBUG)
    mm = dye_mask(im, (425, 232, 848, 668), "teal")
    im = redye(im, mm, OLIVE, "teal")
    im = redye(im, wm, NAVY, "burgundy")
    im = put(im, "entanglement", "black", 202, 286, 290)
    im = put(im, "maxwell", "deep-navy", 982, 462, 270)
    im = front(im, (695, 352), 30, True, "olive", (692, 352), 22)
    im = front(im, (705, 1028), 34, False, "ivory", (708, 1026), 22)
    save(im, "campaign-steps-2")


def trio():
    im = Image.open(SRC / "group-trio.jpg").convert("RGB")
    im, _ = remove_print(im, (150, 700), (0, 240, 438, 805), debug=DEBUG)
    tm = dye_mask(im, (680, 392, 1122, 1140), "teal")
    im, _ = remove_print(im, None, None, mask=tm, debug=DEBUG)
    im = redye(im, tm, NAVY, "teal")
    im = put(im, "maxwell", "black", 180, 318, 320)
    im = put(im, "euler", "deep-navy", 982, 478, 280)
    im = front(im, (672, 588), 30, False, "ivory", (676, 548), 20)
    save(im, "campaign-trio")


if __name__ == "__main__":
    walk(); steps_b(); steps_a(); trio()
    if "--debug" in sys.argv:
        for i, m in enumerate(DEBUG):
            Image.fromarray((m * 255).astype(np.uint8)).save(ROOT.parent.parent / "_compare" / "ls" / f"mask{i}.png")
    print("campaign groups: walk, steps, steps-2, trio")
