"""Olive polo boards (owner's AI model boards, 27.10.2026) -> product photo set.
Board layout: one large panel left, three panels right (collar detail, back, seated).
Usage: python3 scripts/olive.py   (reads design/olive/*.png, writes site/assets/photos/the-polo-{men,women}-olive-*)"""
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "assets" / "photos"
BG = (243, 239, 231)  # --ivory

# panel boxes (x0, y0, x1, y1), measured on the white gutters of each board
BOARDS = {
    "men": dict(file="polo-men-olive-board.png", main=(0, 0, 684, 1402), collar=(689, 0, 1122, 493), back=(689, 497, 1122, 942), seated=(689, 946, 1122, 1402),
                front_y=230, fabric=(250, 520, 610, 935)),
    "women": dict(file="polo-women-olive-board.png", main=(0, 0, 696, 1402), collar=(701, 0, 1122, 455), back=(701, 460, 1122, 924), seated=(701, 928, 1122, 1402),
                  front_y=300, fabric=(230, 560, 590, 975)),
}


def fit(im, w, h, ay=0.5):
    """crop to the w:h ratio (anchor ay vertically, centred horizontally), then resize"""
    r = w / h
    if im.width / im.height > r:
        nw = round(im.height * r)
        x = (im.width - nw) // 2
        im = im.crop((x, 0, x + nw, im.height))
    else:
        nh = round(im.width / r)
        y = round((im.height - nh) * ay)
        im = im.crop((0, y, im.width, y + nh))
    out = im.resize((w, h), Image.LANCZOS)
    if w > im.width * 1.3:
        out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
    return out


def save(im, name, small=False):
    im = im.convert("RGB")
    im.save(OUT / f"{name}.jpg", quality=86, optimize=True, progressive=True)
    im.save(OUT / f"{name}.webp", quality=84)
    im.save(OUT / f"{name}.avif", quality=62)
    if small:
        im.resize((400, round(400 * im.height / im.width)), Image.LANCZOS).save(OUT / f"{name}-400.webp", quality=84)


for g, b in BOARDS.items():
    src = Image.open(ROOT / "design" / "olive" / b["file"]).convert("RGB")
    main = src.crop(b["main"])
    slug = f"the-polo-{g}-olive"
    # card / gallery views 800 x 1000
    fh = round(main.width / 0.8)
    front = main.crop((0, b["front_y"], main.width, b["front_y"] + fh)).resize((800, 1000), Image.LANCZOS)
    save(front, f"{slug}-front", small=True)
    save(fit(src.crop(b["back"]), 800, 1000), f"{slug}-back", small=True)
    # stage 1600 x 880: front | back on ivory
    stage = Image.new("RGB", (1600, 880), BG)
    stage.paste(fit(main, 792, 880, ay=0.12), (0, 0))
    stage.paste(fit(src.crop(b["back"]), 792, 880), (808, 0))
    save(stage, f"{slug}-stage")
    # details 690 x 796
    save(fit(src.crop(b["collar"]), 690, 796), f"{slug}-d-collar")
    save(fit(src.crop(b["seated"]), 690, 796, ay=0.3), f"{slug}-d-front")
    save(fit(main.crop(b["fabric"]), 690, 796), f"{slug}-d-fabric")
    print(slug, "ok")
