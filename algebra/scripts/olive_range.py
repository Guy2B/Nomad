"""Olive range board (owner, 27.10.2026, design/olive/olive-range-board.png): The Knit in olive (knitwear page).
The olive Polo and Sweat sets come from scripts/recolor.py (recoloured deep-navy shoot), not from this board.
Tiles are small (about 200 px), so they are scaled with LANCZOS + a light unsharp mask and placed on a flat canvas
that takes the tile's own background colour. Usage: python3 scripts/olive_range.py"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "assets" / "photos"
SRC = Image.open(ROOT / "design" / "olive" / "olive-range-board.png").convert("RGB")

TILES = {
    "the-crew-men": dict(face=(30, 280, 232, 475), dos=(232, 280, 405, 475), bro=(570, 283, 748, 471)),
    "the-crew-women": dict(face=(795, 280, 985, 475), dos=(988, 280, 1165, 475), bro=(1322, 283, 1504, 471)),
}
KNIT = {"knit-olive-men": (20, 742, 232, 975), "knit-olive-women": (795, 505, 985, 712)}


def up(im, w, h):
    out = im.resize((w, h), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=1.4, percent=70, threshold=2))


def fit(im, w, h):
    r = w / h
    if im.width / im.height > r:
        nw = round(im.height * r); x = (im.width - nw) // 2; im = im.crop((x, 0, x + nw, im.height))
    else:
        nh = round(im.width / r); y = (im.height - nh) // 2; im = im.crop((0, y, im.width, y + nh))
    return up(im, w, h)


def bgcol(im):
    return im.crop((0, 0, 4, im.height)).resize((1, 1), Image.BOX).getpixel((0, 0))


def soft(im, r=14):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rectangle((r, r, im.width - r, im.height - r), fill=255)
    garment = im.convert("L").point(lambda v: 255 if v < 205 else 0).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
    return ImageChops.lighter(m.filter(ImageFilter.GaussianBlur(r / 2)), garment)


def onto(canvas_size, tiles, fill_w, fill_h):
    """place tiles side by side, scaled to fill_h height, centred on a canvas of their background colour"""
    bg = bgcol(tiles[0])
    k = min(fill_h / max(t.height for t in tiles), fill_w / sum(t.width for t in tiles))
    ts = [up(t, round(t.width * k), round(t.height * k)) for t in tiles]
    c = Image.new("RGB", canvas_size, bg)
    x = (canvas_size[0] - sum(t.width for t in ts)) // 2
    for t in ts:
        c.paste(t, (x, (canvas_size[1] - t.height) // 2), soft(t, r=max(14, round(min(t.size) * 0.12)))); x += t.width
    return c


def save(im, name, small=False):
    im = im.convert("RGB")
    im.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=84)
    im.save(OUT / f"{name}.avif", quality=62)
    if small:
        im.resize((400, round(400 * im.height / im.width)), Image.LANCZOS).save(OUT / f"{name}-400.webp", quality=84)


for name, box in KNIT.items():
    save(fit(SRC.crop(box), 640, 800), name)
    print(name, "ok")
