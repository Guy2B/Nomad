"""
Product images from the owner's blank garment boards (design/bases/<gender>-<garment>-<color>.png):
each board has the blank garment front (left) and back (right) on a plain cream background, plus macro tiles below
(fabric, collar, and on the women's boards the sleeve).

On top of the boards we place what Algebra actually produces:
  - the embroidered Algebra symbol on the left chest (every garment),
  - the back print from capsule/<design>/back-*.png (Graphic Series T-shirts only).

  python3 scripts/garments.py [slug ...]
  -> site/assets/photos/<slug>-<color>-front|back      card packshots, 4:5 (+ -400.webp)
     site/assets/photos/<slug>-<color>-stage           front and back side by side (product page)
     site/assets/photos/<slug>-<color>-d-front|d-print|d-fabric|d-collar   detail tiles
     data/photos.json                                  what was made and how (composites)
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "assets" / "photos"
BASES = ROOT / "design" / "bases"
CAP = ROOT / "capsule"
BRAND = json.loads((ROOT / "brand" / "paths.json").read_text())
THREAD = {"black": (233, 226, 211), "deep-navy": (233, 226, 211), "ivory": (24, 33, 56)}
DW, DH = 690, 796

# product -> board, decoration
PLAN = {
    "the-heavy-tee": dict(board="men-tee"),
    "the-polo-men": dict(board="men-polo"),
    "the-crew-men": dict(board="men-sweat"),
    "the-premium-tee": dict(board="women-tee"),
    "the-polo-women": dict(board="women-polo"),
    "the-crew-women": dict(board="women-sweat"),
}
GRAPHICS = ["big-bang", "entanglement", "feynman", "lorenz", "mandelbrot", "maxwell", "higgs", "euler", "mobius"]  # owner's drawings, design/prints/<slug>.png
for g in GRAPHICS:
    PLAN[g] = dict(board="men-tee", design=g)
COLORS = ["black", "deep-navy", "ivory"]

# chest position of the symbol (fraction of the garment box) and back print box, per garment type
CHEST = {"tee": (0.655, 0.255), "polo": (0.665, 0.285), "sweat": (0.655, 0.265)}
SYMBOL = {"tee": 0.052, "polo": 0.05, "sweat": 0.048}  # symbol size / garment width


# ------------------------------------------------------------------ board analysis
def analyse(board):
    a = np.asarray(board).astype(np.int16)
    H, W, _ = a.shape
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[:, :6].reshape(-1, 3)]), axis=0)
    diff = np.abs(a - bg).sum(axis=2)
    rows = (diff > 24).mean(axis=1)
    occupied = rows > 0.02
    # bands of occupied rows
    bands, y = [], 0
    while y < H:
        if occupied[y]:
            y0 = y
            while y < H and occupied[y]:
                y += 1
            if y - y0 > 40:
                bands.append((y0, y))
        y += 1
    top, det = bands[0], bands[-1]
    # garments: one box per half
    boxes = []
    for x0, x1 in ((0, W // 2), (W // 2, W)):
        m = diff[top[0] : top[1], x0:x1] > 14
        ys, xs = np.where(m)
        # robust box (ignore stray pixels): 0.2 / 99.8 percentiles
        bx0, bx1 = np.percentile(xs, [0.03, 99.97]).astype(int)
        by0, by1 = np.percentile(ys, [0.1, 99.9]).astype(int)
        boxes.append((x0 + bx0, top[0] + by0, x0 + bx1, top[0] + by1))
    # detail tiles: column runs inside the detail band
    cols = (diff[det[0] : det[1]] > 24).mean(axis=0) > 0.5
    tiles, x = [], 0
    while x < W:
        if cols[x]:
            x0 = x
            while x < W and cols[x]:
                x += 1
            if x - x0 > 200:
                tiles.append((x0, det[0], x, det[1]))
        x += 1
    return dict(bg=tuple(int(v) for v in bg), top=top, boxes=boxes, tiles=tiles)


# ------------------------------------------------------------------ marks
def symbol_mask(size):
    from PIL import ImageDraw

    s = 8
    big = Image.new("L", (100 * s, 100 * s), 0)
    d = ImageDraw.Draw(big)
    for sub in BRAND["symbolEmbroidery"].split("Z"):
        if "H" in sub:
            t = sub.replace("M", "").replace("H", " ").replace("V", " ").split()
            x0, y0, x1, y1 = (float(v) for v in t[:4])
            d.rectangle((x0 * s, y0 * s, x1 * s, y1 * s), fill=255)
            continue
        nums = [float(n) for n in sub.replace("M", " ").replace("L", " ").split()]
        pts = [(nums[i] * s, nums[i + 1] * s) for i in range(0, len(nums) - 1, 2)]
        if len(pts) >= 3:
            d.polygon(pts, fill=255)
    return np.asarray(big.resize((size, size), Image.LANCZOS)).astype(np.float32) / 255


def embroider(img, color, size, centre, relief=1.0, printed=False):
    """Satin-stitch embroidery of the symbol: thread colour, stitch direction, light relief and a soft shadow."""
    S = max(8, int(size))
    m = symbol_mask(S)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    ang = np.deg2rad(62)
    period = max(1.6, S / 70)
    stitch = 0.84 + 0.16 * (0.5 + 0.5 * np.sin((xx * np.cos(ang) + yy * np.sin(ang)) * 2 * np.pi / period))
    blur = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(0.8, S / 90)))).astype(np.float32) / 255
    gy, gx = np.gradient(blur)
    shade = np.clip(1 - (gx + gy) * 5 * relief, 0.7, 1.25)
    if printed:  # screen/DTG print: flat ink, no stitches, no relief
        stitch = np.ones_like(stitch)
        shade = np.ones_like(shade)
    thread = np.array(THREAD[color], np.float32)
    rgb = np.clip(thread * stitch[..., None] * shade[..., None] + np.random.default_rng(5).normal(0, 4, (S, S, 1)), 0, 255)
    out = img.copy()
    x, y = int(centre[0] - S / 2), int(centre[1] - S / 2)
    sh = Image.fromarray((m * 110).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(1, S / 60)))
    off = max(1, S // 70)
    if not printed:
        out.paste(Image.new("RGB", (S, S), (0, 0, 0)), (x + off, y + off * 2), sh)
    out.paste(Image.fromarray(rgb.astype(np.uint8)), (x, y), Image.fromarray((m * 255).astype(np.uint8)))
    return out


def fabric_blend(base, art_rgba, pos, strength=0.94):
    """Ink on fabric: follows the fabric's light and texture."""
    b = np.asarray(base).astype(np.float32)
    art = art_rgba.filter(ImageFilter.GaussianBlur(0.4))
    a = np.asarray(art).astype(np.float32)
    x, y = pos
    h, w = a.shape[:2]
    H, W = b.shape[:2]
    cx0, cy0, cx1, cy1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    a = a[cy0 - y : cy1 - y, cx0 - x : cx1 - x]
    region = b[cy0:cy1, cx0:cx1]
    lum = region.mean(axis=2, keepdims=True)
    local = np.asarray(Image.fromarray(lum[..., 0].astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))).astype(np.float32)[..., None]
    tex = np.clip((lum + 6) / (local + 6), 0.78, 1.22) ** 0.7
    shade = np.clip(local / max(1.0, float(local.mean())), 0.82, 1.15) ** 0.5
    ink = np.clip(a[..., :3] * tex * shade, 0, 255)
    alpha = (a[..., 3:4] / 255.0) * strength
    region[:] = region * (1 - alpha) + ink * alpha
    b[cy0:cy1, cx0:cx1] = region
    return Image.fromarray(b.astype(np.uint8))


def tone(color):
    return "light" if color == "ivory" else "dark"


PRINTS = ROOT / "design" / "prints"


def drawing(design):
    return Image.open(PRINTS / f"{design}.png").convert("RGBA")


def art(design, box_w, box_h):
    """The drawing as large as the back allows (full-back print, like the owner's boards)."""
    im = drawing(design)
    s = min(box_w / im.width, box_h / im.height)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


# ------------------------------------------------------------------ output
def save(img, name, small=False):
    img.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    img.save(OUT / f"{name}.webp", quality=84)
    img.save(OUT / f"{name}.avif", quality=62)
    if small:
        img.resize((400, round(400 * img.height / img.width)), Image.LANCZOS).save(OUT / f"{name}-400.webp", quality=84)


def isolate(board, region, bg, side=None):
    """Board with everything outside region (x0, y0, x1, y1) painted with the background colour.
    side='left'|'right': keep only the garment whose body lies on that side (a neighbour's sleeve tip is removed)."""
    out = Image.new("RGB", board.size, bg)
    out.paste(board.crop(region), region[:2])
    if side:
        # split the two garments along a vertical seam that crosses as little garment as possible
        a = np.asarray(out).astype(np.int16)
        m = (np.abs(a - np.array(bg)).sum(axis=2) > 14).astype(np.float32)
        H, W = m.shape
        L, R = int(W * 0.38), int(W * 0.62)
        cost = m[:, L:R] * 10 + np.abs(np.arange(R - L) - (R - L) / 2)[None, :] * 0.002
        acc = cost.copy()
        for y in range(1, H):
            prev = acc[y - 1]
            best = np.minimum(prev, np.minimum(np.r_[np.inf, prev[:-1]], np.r_[prev[1:], np.inf]))
            acc[y] += best
        seam = np.zeros(H, int)
        seam[-1] = int(np.argmin(acc[-1]))
        for y in range(H - 2, -1, -1):
            x = seam[y + 1]
            lo, hi = max(0, x - 1), min(R - L, x + 2)
            seam[y] = lo + int(np.argmin(acc[y, lo:hi]))
        xs = np.arange(W)[None, :]
        left = xs < (seam[:, None] + L)
        keep = left if side == "left" else ~left
        # drop stray bits of the neighbour (a sleeve tip cut off by the seam): only small pieces right next to the seam
        import cv2

        seamx = seam + L
        near = np.abs(np.arange(W)[None, :] - seamx[:, None]) < 70
        g = ((m > 0) & keep).astype(np.uint8)
        g = cv2.morphologyEx(g, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(g)
        if n > 1:
            big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
            for i in range(1, n):
                if i == big or st[i, cv2.CC_STAT_AREA] > 0.05 * st[big, cv2.CC_STAT_AREA]:
                    continue
                comp = lab == i
                if (comp & near).sum() > 0.5 * comp.sum():
                    keep = keep & ~(cv2.dilate(comp.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0)
        k = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)[..., None] / 255
        res = a * k + np.array(bg) * (1 - k)
        # garments overlapping on the board (the seam had to cut through fabric): rebuild the cut half
        # from the clean half, mirrored about the body centre measured at the hem
        seamx = seam + L
        crossing = int(m[np.arange(H), np.clip(seamx, 0, W - 1)].sum())
        g = (m > 0) & keep
        gy, gx = np.where(g)
        if crossing > 20 and len(gy):
            # centre from the shoulders (top 6 % of the garment): sleeves never overlap up there
            y0 = np.percentile(gy, 1)
            top = (gy >= y0) & (gy < y0 + (gy.max() - y0) * 0.06)
            c = (np.percentile(gx[top], 3) + np.percentile(gx[top], 97)) / 2
            xs_ = np.arange(W)
            src = np.round(2 * c - xs_).astype(int)
            zone = (xs_ > c) if side == "left" else (xs_ < c)
            for x in np.where(zone)[0]:
                res[:, x] = res[:, src[x]] if 0 <= src[x] < W else np.array(bg)
        out = Image.fromarray(res.astype(np.uint8))
    return out


def packshot(board, box, bg, out_w=800):
    """Garment centred on its own cream background, 4:5."""
    x0, y0, x1, y1 = box
    gw, gh = x1 - x0, y1 - y0
    H = max(gh / 0.78, gw / 0.86 * 1.25)
    W = H * 0.8
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + gh * 0.01
    canvas = Image.new("RGB", (round(W), round(H)), bg)
    crop = board.crop((round(cx - W / 2), round(cy - H / 2), round(cx + W / 2), round(cy + H / 2)))
    # outside-of-board areas come back black from crop(): paint them with the background
    arr = np.asarray(crop).copy()
    bx0, by0 = round(cx - W / 2), round(cy - H / 2)
    bw, bh = board.size
    if bx0 < 0:
        arr[:, : -bx0] = bg
    if by0 < 0:
        arr[: -by0] = bg
    if bx0 + arr.shape[1] > bw:
        arr[:, bw - bx0 :] = bg
    if by0 + arr.shape[0] > bh:
        arr[bh - by0 :] = bg
    canvas = Image.fromarray(arr)
    return canvas.resize((out_w, round(out_w * 1.25)), Image.LANCZOS)


def stage(board, boxes, bg, out_w=1600):
    x0 = min(b[0] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y0 = min(b[1] for b in boxes)
    y1 = max(b[3] for b in boxes)
    pad_x, pad_y = (x1 - x0) * 0.06, (y1 - y0) * 0.08
    box = (round(x0 - pad_x), round(y0 - pad_y), round(x1 + pad_x), round(y1 + pad_y))
    W, H = board.size
    canvas = Image.new("RGB", (box[2] - box[0], box[3] - box[1]), bg)
    canvas.paste(board.crop((max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3]))), (max(0, -box[0]), max(0, -box[1])))
    return canvas.resize((out_w, round(out_w * canvas.height / canvas.width)), Image.LANCZOS)


def tile(board, t, inset=10):
    x0, y0, x1, y1 = t
    im = board.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset))
    # cover-crop to the detail aspect
    r = DW / DH
    if im.width / im.height > r:
        w = round(im.height * r)
        im = im.crop(((im.width - w) // 2, 0, (im.width - w) // 2 + w, im.height))
    else:
        h = round(im.width / r)
        im = im.crop((0, (im.height - h) // 2, im.width, (im.height - h) // 2 + h))
    return im.resize((DW, DH), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.0, 50, 2))


def make(slug, color, spec):
    garment = spec["board"].split("-")[1]
    path = BASES / f"{spec['board']}-{color}.png"
    board = Image.open(path).convert("RGB")
    A = analyse(board)
    bg = A["bg"]
    front_box, back_box = A["boxes"]
    fw = front_box[2] - front_box[0]
    fh = front_box[3] - front_box[1]
    cxr, cyr = CHEST[garment]
    printed = bool(spec.get("design"))
    W = board.size[0]
    t0, t1 = A["top"]
    region = (0, t0 - 4, W, t1 + 2)
    # split the board into the front garment and the back garment first, then decorate each
    front = isolate(board, region, bg, side="left")
    back = isolate(board, region, bg, side="right")
    front = embroider(front, color, fw * SYMBOL[garment], (front_box[0] + fw * cxr, front_box[1] + fh * cyr), printed=printed)
    if spec.get("design"):
        bw = back_box[2] - back_box[0]
        bh = back_box[3] - back_box[1]
        a = art(spec["design"], bw * 0.70, bh * 0.76)
        back = fabric_blend(back, a, (round(back_box[0] + (bw - a.width) / 2), round(back_box[1] + bh * 0.12)), strength=0.96)
    fp = packshot(front, front_box, bg)
    bp = packshot(back, back_box, bg)
    save(fp, f"{slug}-{color}-front", small=True)
    save(bp, f"{slug}-{color}-back", small=True)
    # stage: front and back side by side, like the owner's boards
    st = Image.new("RGB", (fp.width * 2, fp.height), bg)
    st.paste(fp, (0, 0))
    st.paste(bp, (fp.width, 0))
    st = st.crop((0, round(fp.height * 0.06), st.width, round(fp.height * 0.94)))
    save(st, f"{slug}-{color}-stage")
    tiles = A["tiles"]
    raw = Image.open(path).convert("RGB")  # details from the untouched board
    fabric = tile(raw, tiles[0])
    collar = tile(raw, tiles[1])
    save(embroider(fabric, color, 230, (DW / 2, DH / 2 + 10), relief=1.4, printed=printed), f"{slug}-{color}-d-front")
    if spec.get("design"):
        im = drawing(spec["design"])
        al = np.asarray(im.split()[3].resize((im.width // 16, im.height // 16))).astype(np.float32)
        ww, wh = round(im.width * 0.5 / 16), round(im.width * 0.5 * DH / DW / 16)
        ii = al.cumsum(0).cumsum(1)
        best, bx, by = -1, 0, 0
        for yy in range(1, al.shape[0] - wh, 2):
            for xx in range(1, al.shape[1] - ww, 2):
                s = ii[yy + wh - 1, xx + ww - 1] - ii[yy - 1, xx + ww - 1] - ii[yy + wh - 1, xx - 1] + ii[yy - 1, xx - 1]
                if s > best:
                    best, bx, by = s, xx, yy
        win = im.crop((bx * 16, by * 16, (bx + ww) * 16, (by + wh) * 16)).resize((DW, DH), Image.LANCZOS)
        save(fabric_blend(fabric, win, (0, 0), strength=0.95), f"{slug}-{color}-d-print")
    else:
        save(fabric, f"{slug}-{color}-d-fabric")
    save(collar, f"{slug}-{color}-d-collar")
    return dict(board=path.name, tiles=len(tiles), design=spec.get("design"))


if __name__ == "__main__":
    only = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    made = {}
    for slug, spec in PLAN.items():
        if only and slug not in only:
            continue
        for color in COLORS:
            made[f"{slug}-{color}"] = make(slug, color, spec)
            print(slug, color, made[f"{slug}-{color}"]["tiles"], "tiles", flush=True)
    log = ROOT / "data" / "photos.json"
    old = json.loads(log.read_text()) if log.exists() else {}
    items = old.get("items", {}) if isinstance(old.get("items"), dict) else {}
    items.update({k: "composite: owner's blank board + Algebra symbol" + (" + capsule back print" if v["design"] else "") for k, v in made.items()})
    log.write_text(json.dumps({"flag": "COMPOSITE (owner's AI blank boards + our artwork)", "items": items}, indent=1, ensure_ascii=False))
    print("made", len(made))
