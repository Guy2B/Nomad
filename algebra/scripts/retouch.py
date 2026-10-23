"""Campaign image retouch (reversible: the source in design/refs/ is never changed).

campaign-graphic: the generated image shows an invented chest mark (a triangle A with a star), which is not the
Algebra symbol and sat directly above the hero wordmark (A + Algebra stacked). It is removed from the plain black
fabric by inpainting; the rest of the image is untouched.

Run: python3 scripts/retouch.py
"""
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "refs" / "campaign-graphic.jpg"
OUT = ROOT / "site" / "assets" / "photos"

img = cv2.imread(str(SRC))
x0, y0, x1, y1 = 312, 405, 376, 482           # chest mark + star, plain black jersey around it
roi = img[y0:y1, x0:x1]
grey = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
mask_roi = (grey > 46).astype(np.uint8) * 255  # the light print on black fabric
mask = np.zeros(img.shape[:2], np.uint8)
mask[y0:y1, x0:x1] = cv2.dilate(mask_roi, np.ones((5, 5), np.uint8), iterations=2)
out = cv2.inpaint(img, mask, 6, cv2.INPAINT_TELEA)
# a touch of grain so the patch matches the jersey
noise = np.random.default_rng(7).normal(0, 2.2, out.shape).astype(np.float32)
m3 = (cv2.GaussianBlur(mask, (9, 9), 0).astype(np.float32) / 255)[..., None]
out = np.clip(out.astype(np.float32) + noise * m3, 0, 255).astype(np.uint8)

im = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
im.save(OUT / "campaign-graphic.jpg", quality=86, optimize=True, progressive=True)
im.save(OUT / "campaign-graphic.webp", quality=84)
im.save(OUT / "campaign-graphic.avif", quality=62)
im.resize((800, round(800 * im.height / im.width)), Image.LANCZOS).save(OUT / "campaign-graphic-800.webp", quality=84)
im.crop((240, 360, 440, 560)).resize((400, 400)).save(ROOT.parent / "pass" / "cg-after.png")
print("campaign-graphic retouched")
