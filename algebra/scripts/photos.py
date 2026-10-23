"""
Product photos (composites): Algebra artwork placed on the plain studio T-shirts from the owner's reference photos
(design/refs/base-*.jpg). Internally flagged MOCKUP in data/photos.json; the product page carries the usual
"Abbildung ähnlich" note. Replace with photos of the approved samples before launch.

  python3 scripts/photos.py            -> site/assets/photos/<slug>-<color>-<view>.{jpg,webp,avif} (+ -400 variants)
                                          site/assets/photos/hero.{jpg,webp,avif}
Needs: Pillow, numpy, and the 300 dpi capsule PNGs (npm run capsule with PLAYWRIGHT_MODULE).
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "assets" / "photos"
OUT.mkdir(parents=True, exist_ok=True)
CAP = ROOT / "capsule"
BRAND = json.loads((ROOT / "brand" / "paths.json").read_text())

# Base photos: crop window (x0, y0, x1, y1) for a 4:5 frame, logo centre to retouch, neck centre, body width (px in source)
# rect: GrabCut box around the front tee; dark: also require dark pixels (removes studio props); logo/neck in source px
BASES = {
    "black": dict(file="base-black.jpg", rect=(5, 150, 595, 870), dark=True, logo=(410, 365), logo_r=30, neck=(300, 196), body=400),
    "deep-navy": dict(file="base-navy.jpg", rect=(0, 270, 588, 1020), dark=True, logo=(420, 486), logo_r=30, neck=(300, 300), body=460),
    "ivory": dict(file="base-ivory.jpg", rect=(0, 310, 562, 1040), dark=False, logo=(386, 526), logo_r=30, neck=(282, 362), body=460),
}
STUDIO = (236, 232, 225)  # clean warm-grey studio background, like a brand packshot
INK_DARK = (233, 226, 211)   # ivory thread / ink on dark garments
INK_LIGHT = (19, 26, 43)     # navy thread / ink on light garments


def load(name):
    return Image.open(ROOT / "design" / "refs" / name).convert("RGB")


def retouch(img, centre, r, dx=-95):
    """Remove the reference logo: clone fabric from dx px to the side through a feathered disc."""
    cx, cy = centre
    patch = img.crop((cx + dx - r * 2, cy - r * 2, cx + dx + r * 2, cy + r * 2))
    mask = Image.new("L", patch.size, 0)
    ImageDraw.Draw(mask).ellipse((r * 0.6, r * 0.6, r * 3.4, r * 3.4), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(r * 0.35))
    out = img.copy()
    out.paste(patch, (cx - r * 2, cy - r * 2), mask)
    return out


def fabric_blend(base, art_rgba, pos, strength=0.93):
    """Put an RGBA artwork on fabric: follow the fabric's light and texture, slightly soften the edges."""
    b = np.asarray(base).astype(np.float32)
    art = art_rgba.filter(ImageFilter.GaussianBlur(0.45))
    a = np.asarray(art).astype(np.float32)
    x, y = pos
    h, w = a.shape[:2]
    region = b[y : y + h, x : x + w]
    lum = region.mean(axis=2, keepdims=True)
    local = np.asarray(Image.fromarray(lum[..., 0].astype(np.uint8)).filter(ImageFilter.GaussianBlur(12))).astype(np.float32)[..., None]
    tex = np.clip((lum + 6) / (local + 6), 0.75, 1.25) ** 0.7
    shade = np.clip(local / max(1.0, float(local.mean())), 0.8, 1.15) ** 0.5
    ink = np.clip(a[..., :3] * tex * shade, 0, 255)
    alpha = (a[..., 3:4] / 255.0) * strength
    region[:] = region * (1 - alpha) + ink * alpha
    b[y : y + h, x : x + w] = region
    return Image.fromarray(b.astype(np.uint8))


def symbol_png(size, color):
    """Algebra symbol rasterised from brand/paths.json (100-unit grid), with a faint embroidery relief."""
    from PIL import ImageDraw as D

    scale = 8
    big = Image.new("L", (100 * scale, 100 * scale), 0)
    d = D.Draw(big)
    for sub in BRAND["symbolEmbroidery"].split("Z"):
        nums = [float(n) for n in sub.replace("M", " ").replace("L", " ").replace("H", " H ").replace("V", " V ").split() if n not in ("H", "V")] if "H" not in sub else None
        if nums:
            pts = [(nums[i] * scale, nums[i + 1] * scale) for i in range(0, len(nums) - 1, 2)]
            if len(pts) >= 3:
                d.polygon(pts, fill=255)
        elif sub.strip():
            # rect written as M x y H x V y H x Z
            t = sub.replace("M", "").replace("H", " ").replace("V", " ").split()
            x0, y0, x1, y1 = float(t[0]), float(t[1]), float(t[2]), float(t[3])
            d.rectangle((x0 * scale, y0 * scale, x1 * scale, y1 * scale), fill=255)
    m = big.resize((size, size), Image.LANCZOS)
    rgba = Image.new("RGBA", (size, size), color + (0,))
    rgba.putalpha(m)
    return rgba


def resize_art(path, width):
    art = Image.open(path).convert("RGBA")
    h = round(art.height * width / art.width)
    return art.resize((width, h), Image.LANCZOS)


def tee_mask(B):
    """Segment the front tee (GrabCut, cached in design/refs/mask-*.png), holes filled, props removed."""
    import cv2

    cache = ROOT / "design" / "refs" / f"mask-{B['file'].replace('base-', '').replace('.jpg', '')}.png"
    if cache.exists():
        return Image.open(cache).convert("L")
    img = cv2.imread(str(ROOT / "design" / "refs" / B["file"]))
    x0, y0, x1, y1 = B["rect"]
    m = np.zeros(img.shape[:2], np.uint8)
    bg = np.zeros((1, 65), np.float64)
    fg = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, m, (x0, y0, x1 - x0, y1 - y0), bg, fg, 6, cv2.GC_INIT_WITH_RECT)
    m = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
    if B["dark"]:
        lum = img.mean(axis=2)
        m[lum > 120] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    # fill holes (logos, collar interior)
    flood = m.copy()
    h, w = m.shape
    cv2.floodFill(flood, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 255)
    m = m | cv2.bitwise_not(flood)
    m = cv2.GaussianBlur(m, (3, 3), 0)
    Image.fromarray(m).save(cache)
    return Image.fromarray(m)


def packshot(img, B, out_w=800):
    """Tee cut out and placed on a clean studio background with a soft shadow, 4:5."""
    mask = tee_mask(B)
    bbox = mask.getbbox()
    tee = img.crop(bbox)
    m = mask.crop(bbox)
    W, H = out_w * 2, out_w * 5 // 2  # work at 2x, downscale at the end
    scale = (W * 0.80) / tee.width
    if tee.height * scale > H * 0.82:
        scale = (H * 0.82) / tee.height
    tw, th = round(tee.width * scale), round(tee.height * scale)
    tee = tee.resize((tw, th), Image.LANCZOS)
    m = m.resize((tw, th), Image.LANCZOS)
    # background: soft vertical light falloff
    g = np.linspace(1.03, 0.95, H)[:, None, None]
    bgarr = np.clip(np.array(STUDIO, np.float32)[None, None, :] * g * np.ones((H, W, 1)), 0, 255).astype(np.uint8)
    canvas = Image.fromarray(bgarr)
    ox, oy = (W - tw) // 2, round((H - th) * 0.42)
    # contact shadow
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).ellipse((ox + tw * 0.12, oy + th - 18, ox + tw * 0.88, oy + th + 26), fill=95)
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    canvas = Image.composite(Image.new("RGB", (W, H), (120, 112, 100)), canvas, sh)
    canvas.paste(tee, (ox, oy), m)
    bx, by = bbox[0], bbox[1]

    def at(x, y):
        return (round(ox + (x - bx) * scale), round(oy + (y - by) * scale))

    return canvas, at, scale


def frame(img, out_w=800):
    return img.resize((out_w, round(out_w * 5 / 4)), Image.LANCZOS)


def save(img, name):
    img.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    img.save(OUT / f"{name}.webp", quality=84)
    img.save(OUT / f"{name}.avif", quality=62)
    small = img.resize((400, 500), Image.LANCZOS)
    small.save(OUT / f"{name}-400.webp", quality=84)


def tone(color):
    return "light" if color == "ivory" else "dark"


def make(slug, color, kind, design=None):
    """kind: 'graphic' (icon front, print back) or 'essential' (embroidered symbol front, plain back).
    The artwork is blended at source resolution, then the tee is cut out onto the studio background."""
    B = BASES[color]
    src = retouch(load(B["file"]), B["logo"], B["logo_r"])
    lx, ly = B["logo"]
    nx, ny = B["neck"]
    out = {}
    front = src.copy()
    if kind == "graphic" and design in GRAPHIC_ICON:
        icon = resize_art(CAP / design / f"front-{tone(color)}.png", 46)
        front = fabric_blend(front, icon, (lx - 23, ly - 23))
    else:
        sym = symbol_png(36, INK_LIGHT if color == "ivory" else INK_DARK)
        front = fabric_blend(front, sym, (lx - 18, ly - 18), strength=0.97)
    out["front"] = front
    back = src.copy()
    if kind == "graphic":
        width = round(B["body"] * 0.52)
        art = resize_art(CAP / design / f"back-{tone(color)}.png", width)
        back = fabric_blend(back, art, (nx - width // 2, ny + round(B["body"] * 0.09)))
    out["back"] = back
    for view, img in out.items():
        shot, _, _ = packshot(img, B)
        save(frame(shot), f"{slug}-{color}-{view}")


GRAPHIC_ICON = {"navier-stokes", "black-hole", "entanglement", "curvature", "epr-er"}  # capsule 01 has its own chest icon


def hero(design="black-hole", color="black"):
    """Campaign-style wide image: front and back packshots side by side on one studio background."""
    B = BASES[color]
    src = retouch(load(B["file"]), B["logo"], B["logo_r"])
    icon = resize_art(CAP / design / f"front-{tone(color)}.png", 46)
    front = fabric_blend(src, icon, (B["logo"][0] - 23, B["logo"][1] - 23))
    width = round(B["body"] * 0.52)
    art = resize_art(CAP / design / f"back-{tone(color)}.png", width)
    back = fabric_blend(src, art, (B["neck"][0] - width // 2, B["neck"][1] + round(B["body"] * 0.09)))
    f, _, _ = packshot(front, B)
    k, _, _ = packshot(back, B)
    W, H = f.width * 2, f.height
    wide = Image.new("RGB", (W, H))
    wide.paste(f, (0, 0))
    wide.paste(k, (f.width, 0))
    wide = wide.crop((0, round(H * 0.08), W, round(H * 0.92)))
    out = wide.resize((1600, round(1600 * wide.height / wide.width)), Image.LANCZOS)
    for ext, q in (("jpg", 86), ("webp", 84), ("avif", 62)):
        out.save(OUT / f"hero.{ext}", quality=q)
    out.resize((800, round(800 * out.height / out.width)), Image.LANCZOS).save(OUT / "hero-800.webp", quality=84)


if __name__ == "__main__":
    cat = json.loads((ROOT / "data" / "photo-plan.json").read_text())
    made = []
    for item in cat:
        for color in item["colors"]:
            make(item["slug"], color, item["kind"], item.get("design"))
            made.append(f"{item['slug']}-{color}")
    hero()
    (ROOT / "data" / "photos.json").write_text(json.dumps({"flag": "MOCKUP (composite on reference photos)", "items": made}, indent=1))
    print("photos:", len(made))
