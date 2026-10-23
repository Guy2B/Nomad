"""
Product "sheets" in the style of the owner's Mandelbrot board: one stage image (front and back side by side on the
stone wall) plus three detail images (front embroidery, print or fabric, neck label), per product and colour.

  python3 scripts/sheets.py   -> site/assets/photos/<slug>-<color>-stage.*, <slug>-<color>-d-print.*,
                                 detail-front-<color>.*, detail-label-<color>.*, detail-fabric-<color>.*
Built on the reference boards in design/refs (composites, flagged in data/photos.json).
When the owner's blank garment boards arrive (polo, sweater, women's cuts), they get an entry in BOARDS.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from photos import (BASES, CAP, INK_DARK, INK_LIGHT, OUT, ROOT, fabric_blend, load, resize_art, retouch,  # noqa: E402
                    symbol_png, tee_mask, tone)

# stage crop (x0, y0, x1, y1) and GrabCut rect of the back garment, per colour board
STAGE = {
    "black": dict(crop=(0, 128, 1122, 900), front=(4, 166, 596, 863), back=(553, 166, 1104, 864), label=(307, 215)),
    "deep-navy": dict(crop=(0, 215, 1122, 1095), front=(0, 289, 590, 1011), back=(556, 286, 1105, 1008), label=(300, 335)),
    "ivory": dict(crop=(0, 270, 1122, 1110), front=(62, 339, 561, 1030), back=(590, 336, 1110, 1036), label=None, margin=28),
}
FABRIC = {"black": (24, 24, 25), "deep-navy": (22, 28, 48), "ivory": (232, 226, 212)}
THREAD = {"black": INK_DARK, "deep-navy": INK_DARK, "ivory": INK_LIGHT}


def save(img, name, small=None):
    img.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    img.save(OUT / f"{name}.webp", quality=84)
    img.save(OUT / f"{name}.avif", quality=62)
    if small:
        img.resize(small, Image.LANCZOS).save(OUT / f"{name}-s.webp", quality=84)


def back_mask(color):
    import cv2

    cache = ROOT / "design" / "refs" / f"mask-back-{color}.png"
    if cache.exists():
        return Image.open(cache).convert("L")
    B = BASES[color]
    img = cv2.imread(str(ROOT / "design" / "refs" / B["file"]))
    x0, y0, x1, y1 = STAGE[color]["back"]
    m = np.zeros(img.shape[:2], np.uint8)
    bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(img, m, (x0, y0, x1 - x0, y1 - y0), bg, fg, 6, cv2.GC_INIT_WITH_RECT)
    m = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    flood = m.copy()
    h, w = m.shape
    cv2.floodFill(flood, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255)
    m = m | cv2.bitwise_not(flood)
    Image.fromarray(m).save(cache)
    return Image.fromarray(m)


def fix_label(img, centre):
    """Neck label inside the collar: clear the reference mark, weave a small Algebra symbol in."""
    import cv2

    cx, cy = centre
    a = np.asarray(img).copy()
    box = a[cy - 18 : cy + 18, cx - 22 : cx + 22]
    hole = np.zeros(a.shape[:2], np.uint8)
    hole[cy - 18 : cy + 18, cx - 22 : cx + 22] = (box.mean(axis=2) > 70).astype(np.uint8) * 255
    hole = cv2.dilate(hole, np.ones((3, 3), np.uint8))
    arr = cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), hole, 5, cv2.INPAINT_TELEA)
    out = Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
    sym = symbol_png(20, (200, 194, 182))
    out.paste(sym.convert("RGB"), (cx - 10, cy - 11), sym.split()[3])
    return out


def wall_fill(img, hole):
    """Rebuild a large area of plain wall: inpaint at 1/4 scale (smooth light and shadow), upscale, add the wall's grain."""
    import cv2

    a = np.asarray(img)
    H, W = hole.shape
    small = cv2.resize(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hole, (W // 4, H // 4), interpolation=cv2.INTER_NEAREST)
    hs = cv2.dilate(hs, np.ones((3, 3), np.uint8))
    fill = cv2.inpaint(small, hs, 15, cv2.INPAINT_TELEA)
    fill = cv2.GaussianBlur(fill, (0, 0), 2.2)
    fill = cv2.cvtColor(cv2.resize(fill, (W, H), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB).astype(np.float32)
    grain = np.random.default_rng(3).normal(0, 3.2, (H, W, 1))
    fill = np.clip(fill + grain, 0, 255)
    m = cv2.GaussianBlur(hole, (0, 0), 3).astype(np.float32)[..., None] / 255
    return Image.fromarray((a * (1 - m) + fill * m).astype(np.uint8))


def front_shirt(color):
    """Source board with the reference marks removed and the Algebra symbol on the chest and the neck label."""
    B = BASES[color]
    src = retouch(load(B["file"]), B["logo"], B["logo_r"])
    sym = symbol_png(36, THREAD[color])
    lx, ly = B["logo"]
    src = fabric_blend(src, sym, (lx - 18, ly - 18), strength=0.97)
    if STAGE[color]["label"]:
        src = fix_label(src, STAGE[color]["label"])
    return src


def stage(slug, color, design=None):
    import cv2

    B = BASES[color]
    S = STAGE[color]
    board = front_shirt(color)
    fb, bb = S["front"], S["back"]
    fm = Image.new("L", board.size, 0)
    fm.paste(tee_mask(B).crop(fb), fb[:2])
    # clean back: the front garment, mirrored, fitted to the back garment's box (the reference back carries a print)
    clean = retouch(load(B["file"]), B["logo"], B["logo_r"])
    if S["label"]:  # no label visible from the back: fill the collar opening with fabric
        lx_, ly_ = S["label"]
        clean = retouch(clean, (lx_, ly_), 22, dx=-48)
    tee = clean.crop(fb).transpose(Image.FLIP_LEFT_RIGHT)
    tm = fm.crop(fb).transpose(Image.FLIP_LEFT_RIGHT)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    tee, tm = tee.resize((bw, bh), Image.LANCZOS), tm.resize((bw, bh), Image.LANCZOS)
    if design:
        width = round(bw * 0.55)
        art = resize_art(CAP / design / f"back-{tone(color)}.png", width)
        tee = fabric_blend(tee, art, ((bw - width) // 2, round(bh * 0.16)))
    new = np.zeros(board.size[::-1], np.uint8)
    new[bb[1] : bb[3], bb[0] : bb[2]] = np.asarray(tm)
    # old back: the whole area around it (minus the front garment) is rebuilt from the wall, then the new back goes on top
    a = np.asarray(board)
    H, W = new.shape
    zone = np.zeros((H, W), bool)
    m = S.get("margin", 40)
    zone[max(0, bb[1] - m) : min(H, bb[3] + 14), max(0, bb[0] - m) : W] = True
    zone &= ~(cv2.dilate((np.asarray(fm) > 0).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0)
    hole = np.where(zone, 255, 0).astype(np.uint8)
    out = wall_fill(board, hole)
    out.paste(tee, bb[:2], tm)
    st = out.crop(S["crop"])
    st = st.resize((1600, round(1600 * st.height / st.width)), Image.LANCZOS)
    save(st, f"{slug}-{color}-stage")
    return st.size


# ------------------------------------------------------------------ details (shared per colour)
PANEL_FRONT = (6, 910, 350, 1308)  # macro of the fabric with the embroidered mark, on the black board
PANEL_LABEL = (774, 910, 1118, 1308)
LABEL_POLY = [(880, 1010), (1045, 1022), (1037, 1150), (872, 1138)]  # the woven label in PANEL_LABEL (board px)
DW, DH = 690, 796  # detail size (2x of the panel)


def recolour(img, color, keep=None):
    """Re-dye the black macro fabric: keep its texture (luminance relative to the local mean), change the base colour."""
    if color == "black":
        return img
    a = np.asarray(img).astype(np.float32)
    lum = a.mean(axis=2)
    local = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))).astype(np.float32)
    rel = (lum + 4) / (local + 4)
    shade = (local + 4) / (float(local.mean()) + 4)
    k = 0.45 if color == "ivory" else 0.85
    tex = 1 + (rel - 1) * k
    sh = shade ** (0.25 if color == "ivory" else 0.6)
    base = np.array(FABRIC[color], np.float32)
    out = np.clip(base[None, None, :] * tex[..., None] * sh[..., None], 0, 255)
    if keep is not None:
        m = (np.asarray(keep).astype(np.float32) / 255)[..., None]
        out = out * (1 - m) + a * m
    return Image.fromarray(out.astype(np.uint8))


def macro(color):
    """Plain macro fabric (reference mark cloned away), dyed to the colour, 2x."""
    import cv2

    p = np.asarray(load("base-black.jpg").crop(PANEL_FRONT)).astype(np.float32)
    # remove the reference mark: smooth light from an inpaint, knit texture (high frequencies) from plain fabric above
    lum = p.mean(axis=2)
    mark = np.zeros(lum.shape, np.uint8)
    mark[140:300, 70:300] = (lum[140:300, 70:300] > 85).astype(np.uint8) * 255
    mark = cv2.dilate(mark, np.ones((11, 11), np.uint8))
    # light of the fabric around the mark (normalised blur that ignores the mark and its shadow)
    w = 1 - cv2.dilate(mark, np.ones((25, 25), np.uint8)).astype(np.float32)[..., None] / 255
    low = cv2.GaussianBlur(p * w, (0, 0), 22) / np.maximum(cv2.GaussianBlur(w, (0, 0), 22)[..., None] if cv2.GaussianBlur(w, (0, 0), 22).ndim == 2 else cv2.GaussianBlur(w, (0, 0), 22), 1e-3)
    shifted = np.roll(p, -118, axis=0)  # sharp plain knit 118 px lower (the band above is out of focus)
    ratio = (shifted + 0.5) / (cv2.GaussianBlur(shifted, (0, 0), 9) + 0.5)  # knit texture, relative to its local light
    patch = np.clip(low * ratio, 0, 255)
    m = cv2.GaussianBlur(cv2.dilate(mark, np.ones((15, 15), np.uint8)).astype(np.float32), (0, 0), 6)[..., None] / 255
    p = Image.fromarray((p * (1 - m) + patch * m).astype(np.uint8))
    p = recolour(p, color)
    return p.resize((DW, DH), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))


def embroider(fabric, color, size, pos):
    """Satin-stitch embroidery of the Algebra symbol with a light relief."""
    S = size
    m = np.asarray(symbol_png(S, (255, 255, 255)).split()[3]).astype(np.float32) / 255
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    ang = np.deg2rad(62)
    stitch = 0.82 + 0.18 * (0.5 + 0.5 * np.sin((xx * np.cos(ang) + yy * np.sin(ang)) * 2 * np.pi / 3.2))
    blur = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255
    gy, gx = np.gradient(blur)
    relief = np.clip(1 - (gx + gy) * 6, 0.65, 1.3)
    thread = np.array(THREAD[color], np.float32)
    rgb = np.clip(thread[None, None, :] * stitch[..., None] * relief[..., None], 0, 255)
    noise = np.random.default_rng(7).normal(0, 6, (S, S, 1))
    rgb = np.clip(rgb + noise, 0, 255)
    rgba = np.dstack([rgb, m * 255]).astype(np.uint8)
    out = fabric.copy()
    shadow = Image.fromarray((m * 120).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))
    out.paste(Image.new("RGB", (S, S), (0, 0, 0)), (pos[0] + 3, pos[1] + 4), shadow)
    out.paste(Image.fromarray(rgba[..., :3]), pos, Image.fromarray(rgba[..., 3]))
    return out


def detail_front(color):
    f = macro(color)
    size = 230
    out = embroider(f, color, size, ((DW - size) // 2 + 10, (DH - size) // 2 + 20))
    save(out, f"detail-front-{color}")


def detail_fabric(color):
    save(macro(color), f"detail-fabric-{color}")


def detail_label(color):
    import cv2

    board = load("base-black.jpg")
    # remove the reference mark on the woven label, then weave the Algebra symbol in
    poly = Image.new("L", board.size, 0)
    ImageDraw.Draw(poly).polygon(LABEL_POLY, fill=255)
    a = np.asarray(board)
    bright = (a.mean(axis=2) > 70) & (np.asarray(poly) > 0)
    hole = cv2.dilate(bright.astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
    arr = cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), hole, 7, cv2.INPAINT_TELEA)
    board = Image.fromarray(cv2.cvtColor(arr, cv2.COLOR_BGR2RGB))
    sym = symbol_png(64, (196, 190, 178))
    cx = sum(p[0] for p in LABEL_POLY) // 4
    cy = sum(p[1] for p in LABEL_POLY) // 4
    board.paste(sym.convert("RGB"), (cx - 32, cy - 34), sym.split()[3].point(lambda v: v * 0.92))
    p = board.crop(PANEL_LABEL)
    keep = poly.crop(PANEL_LABEL).filter(ImageFilter.GaussianBlur(1.5))
    p = recolour(p, color, keep=keep)
    p = p.resize((DW, DH), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))
    save(p, f"detail-label-{color}")


def detail_print(slug, color, design):
    """Close-up of the back print on the fabric: the densest window of the 300 dpi artwork."""
    art = Image.open(CAP / design / f"back-{tone(color)}.png").convert("RGBA")
    al = np.asarray(art.split()[3].resize((art.width // 16, art.height // 16))).astype(np.float32)
    ww, wh = round(art.width * 0.5 / 16), round(art.width * 0.5 * DH / DW / 16)
    best, bx, by = -1, 0, 0
    ii = al.cumsum(0).cumsum(1)
    for y in range(0, al.shape[0] - wh, 2):
        for x in range(0, al.shape[1] - ww, 2):
            s = ii[y + wh - 1, x + ww - 1] - (ii[y - 1, x + ww - 1] if y else 0) - (ii[y + wh - 1, x - 1] if x else 0) + (ii[y - 1, x - 1] if x and y else 0)
            if s > best:
                best, bx, by = s, x, y
    win = art.crop((bx * 16, by * 16, (bx + ww) * 16, (by + wh) * 16)).resize((DW, DH), Image.LANCZOS)
    out = fabric_blend(macro(color), win, (0, 0), strength=0.95)
    save(out, f"{slug}-{color}-d-print")


if __name__ == "__main__":
    plan = json.loads((ROOT / "data" / "photo-plan.json").read_text())
    only = set(sys.argv[1:])
    for color in BASES:
        if not only or "details" in only:
            detail_front(color)
            detail_fabric(color)
            detail_label(color)
    made = []
    for item in plan:
        if only and item["slug"] not in only and "prints" not in only:
            continue
        for color in item["colors"]:
            if "prints" not in only:
                stage(item["slug"], color, item.get("design"))
            if item.get("design"):
                detail_print(item["slug"], color, item["design"])
            made.append(f"{item['slug']}-{color}")
    print("sheets:", len(made))
