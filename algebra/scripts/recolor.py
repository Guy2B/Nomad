"""Recolour the existing deep-navy photo sets to olive, so every colour keeps the same shoot, framing and sharpness.
Only garment pixels change (navy hue band, saturated); the cream background and the ivory embroidery stay as they are.
Usage: python3 scripts/recolor.py the-polo-men the-polo-women the-crew-men the-crew-women"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

PH = Path(__file__).resolve().parent.parent / "site" / "assets" / "photos"
SRC_H = 158            # deep navy, PIL hue 0..255
DST = (39, 89, 76)     # olive (H, S median, V median) measured on the owner's olive boards
VIEWS = ["front", "back", "stage", "d-front", "d-fabric", "d-print", "d-collar"]


def recolor(im, ref=None):
    hsv = np.asarray(im.convert("HSV")).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    dist = np.minimum(np.abs(h - SRC_H), 256 - np.abs(h - SRC_H))
    # soft garment mask: hue near navy and some saturation, ramped to avoid hard edges
    m = np.clip((30 - dist) / 12, 0, 1) * np.clip((s - 20) / 30, 0, 1)
    mask = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    m = np.asarray(mask).astype(np.float32) / 255
    sel = m > 0.6
    ms, mv = ref if ref else (np.median(s[sel]), np.median(v[sel]))
    out = np.stack([np.full_like(h, DST[0]), np.clip(s * DST[1] / ms, 0, 255), np.clip(v * DST[2] / mv, 0, 255)], -1)
    rgb_new = np.asarray(Image.fromarray(out.astype(np.uint8), "HSV").convert("RGB")).astype(np.float32)
    rgb_old = np.asarray(im.convert("RGB")).astype(np.float32)
    res = rgb_old * (1 - m[..., None]) + rgb_new * m[..., None]
    return Image.fromarray(res.clip(0, 255).astype(np.uint8)), (ms, mv)


def save(im, name, small):
    im.save(PH / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    im.save(PH / f"{name}.webp", quality=84)
    im.save(PH / f"{name}.avif", quality=62)
    if small:
        im.resize((400, round(400 * im.height / im.width)), Image.LANCZOS).save(PH / f"{name}-400.webp", quality=84)


for slug in sys.argv[1:]:
    # one scale per product, measured on the front view, so close-ups keep the same depth as the garment
    _, ref = recolor(Image.open(PH / f"{slug}-deep-navy-front.jpg"))
    for v in VIEWS:
        src = PH / f"{slug}-deep-navy-{v}.jpg"
        if src.exists():
            save(recolor(Image.open(src), ref)[0], f"{slug}-olive-{v}", v in ("front", "back"))
    print(slug, "ok")
