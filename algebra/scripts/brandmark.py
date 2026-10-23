"""The official Algebra A, read from brand/algebra-a-signature-master.svg (never redrawn, never approximated by hand).

Every raster use of the A (embroidery and print on product images, campaign retouches) goes through mask():
the master's own path and two bars, flattened at high resolution, scaled uniformly. Only size and colour vary.
"""
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

MASTER = Path(__file__).resolve().parent.parent / "brand" / "algebra-a-signature-master.svg"


def _geometry():
    svg = MASTER.read_text()
    d = re.search(r'<path[^>]*\sd="([^"]+)"', svg).group(1)
    rects = [tuple(float(v) for v in m) for m in re.findall(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"', svg)]
    if len(rects) != 2 or rects[0][2:] != rects[1][2:] or rects[0][0] != rects[1][0]:
        raise SystemExit("master A: the two equality bars must be identical and aligned")
    tok = re.findall(r"[MLCZ]|-?\d+(?:\.\d+)?", d)
    polys, cur, pt, i = [], [], None, 0
    while i < len(tok):
        c = tok[i]
        if c == "M":
            cur = [(float(tok[i + 1]), float(tok[i + 2]))]; pt = cur[0]; i += 3
        elif c == "L":
            pt = (float(tok[i + 1]), float(tok[i + 2])); cur.append(pt); i += 3
        elif c == "C":
            p1, p2, p3 = [(float(tok[i + k]), float(tok[i + k + 1])) for k in (1, 3, 5)]
            for t in np.linspace(0, 1, 49)[1:]:
                u = 1 - t
                cur.append((u**3 * pt[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                            u**3 * pt[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
            pt = p3; i += 7
        elif c == "Z":
            polys.append(cur); i += 1
        else:
            raise SystemExit(f"master A: unsupported path token {c}")
    xs = [x for p in polys for x, _ in p]; ys = [y for p in polys for _, y in p]
    return polys, rects, (min(xs), min(ys), max(xs), max(ys))


POLYS, BARS, BOX = _geometry()
ASPECT = (BOX[3] - BOX[1]) / (BOX[2] - BOX[0])  # height / width of the A


def mask(width):
    """Float mask (H, W) of the A, W = width px (the A's own width), tight bounding box, antialiased."""
    W = max(4, int(round(width)))
    H = max(3, int(round(W * ASPECT)))
    ss = 8
    sx = W * ss / (BOX[2] - BOX[0])
    im = Image.new("L", (W * ss, H * ss), 0)
    dr = ImageDraw.Draw(im)
    f = lambda x, y: ((x - BOX[0]) * sx, (y - BOX[1]) * sx)
    for p in POLYS:
        dr.polygon([f(x, y) for x, y in p], fill=255)
    for x, y, w, h in BARS:
        dr.polygon([f(x, y), f(x + w, y), f(x + w, y + h), f(x, y + h)], fill=255)
    return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
