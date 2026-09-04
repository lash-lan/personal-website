# Pulls "Red Rangers Saga: The Squire" out of the PDF into the shape the site
# reads, and saves the fifteen plates.
#
#   python scripts/extract-squire.py "path/to/The Squire.pdf"
#
# The plates sit on the page BEFORE each chapter opening, so each one is the
# opening image for the chapter that follows it. The last plate closes the
# story. Chapter One has no plate of its own.

import io, json, os, re, sys
import pymupdf

SRC = sys.argv[1] if len(sys.argv) > 1 else \
    r"C:\Users\lashlan.a\Downloads\Blood of Icetear- The Squire.pdf"
IMG_DIR = "public/images/sagas/the-squire"
OUT = "src/data/the-squire.json"

doc = pymupdf.open(SRC)
os.makedirs(IMG_DIR, exist_ok=True)

WORDS = {'One':1,'Two':2,'Three':3,'Four':4,'Five':5,'Six':6,'Seven':7,'Eight':8,
         'Nine':9,'Ten':10,'Eleven':11,'Twelve':12,'Thirteen':13,'Fourteen':14,'Fifteen':15}
ROMAN = {1:'I',2:'II',3:'III',4:'IV',5:'V',6:'VI',7:'VII',8:'VIII',9:'IX',10:'X',
         11:'XI',12:'XII',13:'XIII',14:'XIV',15:'XV'}

# ── where each chapter starts, and where each plate sits ──
chapter_pages = {}
for i, page in enumerate(doc):
    m = re.search(r'Chapter\s+([A-Z][a-z]+)\s*:?\s*\n\s*([^\n]{2,60})', page.get_text())
    if m and m.group(1) in WORDS:
        chapter_pages[WORDS[m.group(1)]] = (i, m.group(2).strip().rstrip(':').strip())

plate_pages = [i for i, p in enumerate(doc) if p.get_images(full=True)]

# ── save the plates, naming each for the chapter it opens ──
starts = {p: n for n, (p, _) in chapter_pages.items()}
plates = {}          # chapter number -> filename
closing = None
for pno in plate_pages:
    imgs = doc[pno].get_images(full=True)
    if not imgs:
        continue
    xref = imgs[0][0]
    pix = pymupdf.Pixmap(doc, xref)
    if pix.n - pix.alpha >= 4:                 # CMYK, convert first
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    opens = starts.get(pno + 1)
    name = f"chapter-{opens:02d}.jpg" if opens else "closing.jpg"
    pix.save(os.path.join(IMG_DIR, name), jpg_quality=82)
    if opens:
        plates[opens] = name
    else:
        closing = name
    pix = None

# ── the prose ──
def clean(t):
    t = t.replace('\u201c', '"').replace('\u201d', '"')
    t = t.replace('\u2018', "'").replace('\u2019', "'")
    # Lash does not use these anywhere on the site
    t = t.replace('\u2014', ', ').replace('\u2013', ', ')
    t = re.sub(r';\s*([a-z])', lambda m: '. ' + m.group(1).upper(), t)
    t = t.replace(';', '.')
    # The PDF loses the space when a sentence ends at a line break, giving
    # "road.And". Put it back, but leave initials like "J.R." alone.
    t = re.sub(r'([a-z"\'\)])([.!?])([A-Z])', r'\1\2 \3', t)
    return re.sub(r'[ \t]+', ' ', t).strip()

ordered = sorted(chapter_pages.items())
chapters = []
for idx, (num, (start, title)) in enumerate(ordered):
    end = ordered[idx + 1][1][0] if idx + 1 < len(ordered) else doc.page_count
    # The PDF's own layout blocks are the paragraphs. Splitting on blank lines
    # does not work here, because every line in the file is hard wrapped and
    # the blank lines fall inside paragraphs rather than between them.
    paras = []
    past_heading = False
    for pg in range(start, end):
        blocks = sorted(doc[pg].get_text("blocks"), key=lambda b: (round(b[1], 1), b[0]))
        for b in blocks:
            text = clean(" ".join(line.strip() for line in b[4].split("\n")))
            if len(text) < 2:
                continue
            if not past_heading:
                if re.fullmatch(r'Chapter\s+[A-Z][a-z]+\s*:?', text):
                    continue
                if text.rstrip(':').strip().lower() == title.lower():
                    past_heading = True
                    continue
            if re.fullmatch(r'\d{1,3}', text):          # a bare page number
                continue
            # running headers repeat the chapter or book title on later pages
            # compare against the cleaned title, since the heading keeps its
            # curly apostrophe while the body text has had them straightened
            low = text.rstrip(':').strip().lower()
            if low == clean(title).lower() or low.startswith('red rangers saga'):
                continue
            if re.fullmatch(r'Chapter\s+[A-Z][a-z]+\s*:?', text):
                continue
            # A paragraph broken over a page turn arrives as two blocks. If the
            # last one did not finish its sentence and this one opens in lower
            # case, they are one paragraph and belong back together.
            if paras and not re.search(r'[.!?"\'…]$', paras[-1]["x"]) and re.match(r'[a-z,]', text):
                paras[-1]["x"] = clean(paras[-1]["x"] + " " + text)
                continue
            paras.append({"t": "p", "x": text})
    chapters.append({
        "n": num,
        "numeral": ROMAN[num],
        "slug": re.sub(r'[^a-z0-9]+', '-', clean(title).lower()).strip('-'),
        "title": clean(title),
        "plate": plates.get(num),
        "paras": paras,
        "words": sum(len(p["x"].split()) for p in paras),
    })

story = {
    "slug": "the-squire",
    "title": "The Squire",
    "saga": "Red Rangers",
    "closingPlate": closing,
    "chapters": chapters,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with io.open(OUT, "w", encoding="utf-8") as f:
    json.dump(story, f, ensure_ascii=False)

total = sum(c["words"] for c in chapters)
print(f"chapters: {len(chapters)}   words: {total:,}")
print(f"plates saved: {len(plates)} chapter openers" + (f" + {closing}" if closing else ""))
for c in chapters:
    print(f"  {c['numeral']:>4}  {c['title'][:38]:<40} {c['words']:>6,} words  "
          f"{len(c['paras']):>4} paras  {c['plate'] or '-'}")
