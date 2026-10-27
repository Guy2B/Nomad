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


# ---- packshot board (owner, 27.10.2026): same look as the other colours.
# The packshots take the card front, the stage and the three details; the model photo stays as the card's second image.
PACK = ROOT / "design" / "olive" / "polo-olive-packshots.png"
PBOX = {
    "men": dict(front=(58, 12, 466, 434), keep=[(0, 0), (441, 0), (443, 150), (462, 208), (440, 214), (440, 434), (0, 434)], stage=(40, 8, 770, 436), broderie=(484, 473, 764, 724), col=(38, 776, 222, 981), maille=(413, 776, 589, 981), label=(20, 10, 130, 45)),
    "women": dict(front=(840, 12, 1178, 434), stage=(820, 8, 1505, 436), broderie=(1247, 473, 1503, 724), col=(807, 776, 975, 981), maille=(1156, 776, 1328, 981), label=(800, 10, 900, 45)),
}
def feather(im, r=24):
    """soft edge on the background only, so the board's uneven backdrop melts into the flat canvas; the garment stays opaque"""
    from PIL import ImageChops, ImageDraw as D
    m = Image.new("L", im.size, 0)
    D.Draw(m).rectangle((r, r, im.width - r, im.height - r), fill=255)
    garment = im.convert("L").point(lambda v: 255 if v < 205 else 0).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
    return ImageChops.lighter(m.filter(ImageFilter.GaussianBlur(r / 2)), garment)


if PACK.exists():
    pk = Image.open(PACK).convert("RGB")
    cream = pk.getpixel((8, 460))
    from PIL import ImageDraw
    for g, b in PBOX.items():
        slug = f"the-polo-{g}-olive"
        clean = pk.copy()
        ImageDraw.Draw(clean).rectangle(b["label"], fill=cream)
        # the model photo (made above as -front) becomes the hover image
        for ext in ("jpg", "webp", "avif"):
            (OUT / f"{slug}-front.{ext}").replace(OUT / f"{slug}-back.{ext}")
        (OUT / f"{slug}-front-400.webp").replace(OUT / f"{slug}-back-400.webp")
        fr = clean.crop(b["front"])
        if "keep" in b:  # men: the back view touches the front sleeve on the board, keep only the front garment
            m = Image.new("L", fr.size, 0)
            ImageDraw.Draw(m).polygon([(x - b["front"][0], y - b["front"][1]) for x, y in b["keep"]], fill=255)
            fr = Image.composite(fr, Image.new("RGB", fr.size, cream), m.filter(ImageFilter.GaussianBlur(1.5)))
        k = min(700 / fr.width, 900 / fr.height)
        fr = fr.resize((round(fr.width * k), round(fr.height * k)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1, percent=50, threshold=2))
        edge = clean.crop(b["front"]).crop((0, 0, 6, 420)).resize((1, 1), Image.BOX).getpixel((0, 0))
        card = Image.new("RGB", (800, 1000), edge)
        card.paste(fr, ((800 - fr.width) // 2, (1000 - fr.height) // 2), feather(fr))
        save(card, f"{slug}-front", small=True)
        st = clean.crop(b["stage"])
        k = min(1520 / st.width, 840 / st.height)
        st = st.resize((round(st.width * k), round(st.height * k)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1, percent=50, threshold=2))
        edge = clean.crop(b["stage"]).crop((0, 0, 6, 420)).resize((1, 1), Image.BOX).getpixel((0, 0))
        stage = Image.new("RGB", (1600, 880), edge)
        stage.paste(st, ((1600 - st.width) // 2, (880 - st.height) // 2), feather(st))
        save(stage, f"{slug}-stage")
        save(fit(clean.crop(b["broderie"]), 690, 796), f"{slug}-d-front")
        save(fit(clean.crop(b["maille"]), 690, 796), f"{slug}-d-fabric")
        save(fit(clean.crop(b["col"]), 690, 796), f"{slug}-d-collar")
        print(slug, "packshots ok")
