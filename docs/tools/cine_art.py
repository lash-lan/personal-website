import glob, os
from PIL import Image
src = r"C:\Users\lashl\Downloads\Animation images"
out = r"C:\Users\lashl\Projects\lashlan-com\public\cine"
os.makedirs(out, exist_ok=True)
fs = sorted(glob.glob(src + r"\*\*.png"), key=lambda f: os.path.basename(f))
names = ["atrium", "atrium-p", "arch", "core", "inside", "inside-p",
         "filaments", "facets", "corridor", "line", "dharmalogist", "legacy"]
# widths per file: phones get the smaller one
sizes = {"core": [520, 900], "atrium-p": [800], "inside-p": [800], "icetear": [640]}
gal = r"C:\Users\lashl\Projects\personal-website\public\images\gallery\full"
jobs = list(zip(fs, names)) + [(gal + r"\heavens-throat.jpg", "icetear")]
total = 0
for f, n in jobs:
    im = Image.open(f)
    alpha = im.mode == "RGBA"
    if n == "core":  # trim to the object, keep it square
        box = im.getbbox()
        im = im.crop(box)
        s = max(im.size)
        sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
        im = sq
    im = im if alpha else im.convert("RGB")
    for w in sizes.get(n, [960, 1600]):
        if w > im.width:
            w = im.width
        r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        p = os.path.join(out, f"{n}-{w}.webp")
        r.save(p, "WEBP", quality=78 if not alpha else 82, method=6)
        kb = os.path.getsize(p) // 1024
        total += kb
        print(n, w, r.size, kb, "KB")
print("total", total, "KB")
