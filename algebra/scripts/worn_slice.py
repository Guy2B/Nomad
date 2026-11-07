"""Slice the owner's worn boards (design/refs/worn/*.png) into tiles along their white gutters."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "refs" / "worn"


def gutters(profile, n, length, th=0.33):
    """n-1 gutters: white runs across the board (merged when a few px apart), each matched to the nearest
    expected position; an equal split where no run is visible."""
    runs, start = [], None
    for i, v in enumerate(profile > th):
        if v and start is None:
            start = i
        if not v and start is not None:
            runs.append([start, i]); start = None
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] <= 5:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    merged = [r for r in merged if 0 < r[0] and r[1] < length]
    res = []
    for k in range(1, n):
        c = length * k / n
        cand = [r for r in merged if abs((r[0] + r[1]) / 2 - c) < length / n * 0.45]
        if cand:
            r = min(cand, key=lambda r: abs((r[0] + r[1]) / 2 - c)); res.append((r[0], r[1]))
        else:
            res.append((int(c), int(c)))
    return res


def trim(t):
    ta = np.asarray(t).min(axis=2) > 228
    kx = np.where(ta.mean(axis=0) < 0.4)[0]; ky = np.where(ta.mean(axis=1) < 0.4)[0]
    return t.crop((kx.min(), ky.min(), kx.max() + 1, ky.max() + 1))


def tiles(path, rows, cols):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    white = (a.min(axis=2) > 225).astype(np.float32)
    H, W = white.shape
    rg = gutters(white.mean(axis=1), rows, H)
    ys = [0] + [y for g in rg for y in g] + [H]
    out = {}
    for r in range(rows):
        y0, y1 = ys[2 * r], ys[2 * r + 1]
        band = white[y0:y1]
        cg = gutters(band.mean(axis=0), cols, W)
        xs = [0] + [x for g in cg for x in g] + [W]
        for c in range(cols):
            out[(r, c)] = trim(im.crop((xs[2 * c], y0, xs[2 * c + 1], y1)))
    return out


if __name__ == "__main__":
    from PIL import ImageDraw
    for f in sorted(SRC.glob("*.png")):
        r, c = (2, 4) if "2x4" in f.name else (6, 4)
        ts = tiles(f, r, c)
        sizes = sorted({v.size for v in ts.values()})
        print(f.name, min(s[0] for s in sizes), max(s[0] for s in sizes), min(s[1] for s in sizes), max(s[1] for s in sizes))
