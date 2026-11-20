# Draws the app icon in code (no image assets): an ember sigil on ink.
from PIL import Image, ImageDraw, ImageFilter
import math, pathlib
out = pathlib.Path(__file__).resolve().parent.parent
def icon(size):
    s = size * 4
    img = Image.new('RGB', (s, s), (13, 12, 16))
    glow = Image.new('RGB', (s, s), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([s*.1, s*.1, s*.9, s*.9], fill=(120, 40, 8))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(s*.12)), .55)
    d = ImageDraw.Draw(img)
    c, r, w = s/2, s*.36, max(4, int(s*.028))
    ember = (255, 122, 58)
    d.ellipse([c-r, c-r, c+r, c+r], outline=ember, width=w)
    pts = [(c + math.cos(math.radians(-90 + i*72*2)) * r*.78, c + math.sin(math.radians(-90 + i*72*2)) * r*.78) for i in range(5)]
    d.line(pts + [pts[0]], fill=ember, width=w, joint='curve')
    ew, eh = r*.46, r*.2
    top = [(c + ew*math.cos(t), c - eh*math.sin(t)*1.6*(1-abs(math.cos(t))*.3)) for t in [i*math.pi/40 for i in range(41)]]
    bot = [(x, 2*c - y) for x, y in top[::-1]]
    d.polygon(top + bot, fill=(13, 12, 16))
    d.line(top + bot + [top[0]], fill=(234, 227, 210), width=max(3, int(w*.8)), joint='curve')
    d.ellipse([c-r*.1, c-r*.1, c+r*.1, c+r*.1], fill=(255, 122, 58))
    return img.resize((size, size), Image.LANCZOS)
for n in (180, 192, 512):
    icon(n).save(out / f'icon-{n}.png')
print('icons done')
