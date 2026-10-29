"""Controlled upscale of the Graphic Series drawings: design-source (1024 x 1536) -> print-master CANDIDATES.

Classical resampling only (Lanczos in two x2 steps, light unsharp mask after each), in premultiplied alpha so edges
get no dark fringe. Nothing is generated, redrawn or reinterpreted: every pixel comes from the owner's drawing.
Output: 4096 x 6144 px RGBA PNG, sRGB, 300 dpi tag. At 33 x 49.5 cm (fits a 39 x 49 cm print area at 49 cm high)
that is about 315 dpi.

Candidates are not print-masters until the owner approves each one and a test print confirms it
(design/print-master/README.md). Run: python3 scripts/upscale.py <out_dir> [slug ...]
"""
import hashlib
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "prints"
DESIGNS = ["big-bang", "entanglement", "euler", "feynman", "higgs", "lorenz", "mandelbrot", "maxwell", "mobius"]


def step2(rgb, a):
    W, H = rgb.width * 2, rgb.height * 2
    rgb = rgb.resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=2))
    a = a.resize((W, H), Image.LANCZOS)
    return rgb, a


def upscale(path):
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im).astype(np.float32)
    alpha = arr[..., 3:4] / 255
    pre = Image.fromarray(np.clip(arr[..., :3] * alpha, 0, 255).astype(np.uint8))   # premultiplied colour
    a = im.split()[3]
    for _ in range(2):
        pre, a = step2(pre, a)
    P = np.asarray(pre).astype(np.float32)
    A = np.asarray(a).astype(np.float32)[..., None] / 255
    rgb = np.where(A > 1 / 255, P / np.maximum(A, 1 / 255), 0)
    out = np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


if __name__ == "__main__":
    out_dir = Path(sys.argv[1]); out_dir.mkdir(parents=True, exist_ok=True)
    only = sys.argv[2:] or DESIGNS
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    for slug in only:
        big = upscale(SRC / f"{slug}.png")
        f = out_dir / f"{slug}-print-master-candidate-4096x6144.png"
        big.save(f, dpi=(300, 300), icc_profile=icc, optimize=False, compress_level=6)
        print(slug, big.size, f"{f.stat().st_size / 1e6:.1f} MB", hashlib.sha256(f.read_bytes()).hexdigest()[:16], flush=True)
