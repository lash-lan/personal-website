import sys, os, glob
from PIL import Image, ImageDraw
d = sys.argv[1]
pat = sys.argv[2] if len(sys.argv) > 2 else "*.png"
out = sys.argv[3] if len(sys.argv) > 3 else d + "-grid.jpg"
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
W = int(sys.argv[5]) if len(sys.argv) > 5 else 480
fs = sorted(glob.glob(os.path.join(d, pat)))
ims = []
for f in fs:
    im = Image.open(f).convert("RGB")
    im.thumbnail((W, W * 2))
    ims.append((os.path.basename(f), im))
h = max(i.height for _, i in ims) + 18
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (W + 6), rows * h), (90, 90, 90))
dr = ImageDraw.Draw(sheet)
for k, (n, im) in enumerate(ims):
    x, y = (k % cols) * (W + 6), (k // cols) * h
    sheet.paste(im, (x, y))
    dr.text((x + 4, y + im.height + 3), n, fill=(255, 255, 255))
sheet.save(out, quality=85)
print(out, len(ims))
