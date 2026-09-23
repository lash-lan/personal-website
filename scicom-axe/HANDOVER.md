# Scicom Axe — handover notes

For whoever picks this up next — a different computer, a different Claude, or
the same one months later. Read this before changing anything.

The user is not a developer and does not want to become one. Explain things in
plain words, say whether something is done *locally* or *live*, and never fold
unrequested changes into a piece of work.

---

## What this is

Scicom Axe is a local-only workstream tracker for the Scicom AI department. It runs as a small
Node HTTP server on `127.0.0.1:4173` and serves one page.

**Design constraint that drives everything: it must be liftable.** Copy the
folder, run `npm start`, carry on. That is why:

- there are **no npm dependencies at all** (`package.json` has an empty
  `dependencies` block, and it should stay that way unless there is no
  alternative);
- there is **no build step** — `public/app.js` is plain JavaScript served as-is;
- there is **no database** — every record is a JSON file in `data/`;
- the **local AI is optional** — every AI path has a rule-based fallback, and
  the system never fails because Ollama is absent.

If you add a dependency, a build step or a database, you have broken the main
requirement. Don't.

---

## Layout

```
server.js            HTTP server, static files, file downloads
lib/
  zip.js             minimal ZIP reader/writer, so a .docx can be opened
  docx.js            reads a Word form's tables; splices answers back in
  forms.js           turns a template's labels into questions, and fills them
  builder.js         builds a Word document from nothing, logo and all
  guides.js          lays out the new-joiner guides and loads their content
  store.js           JSON read/write, atomic saves, corrupt-file rescue, backups
  seed.js            the 8 standing workstreams, statuses, stages, starting rules
  ids.js             task refs (RES-T0007) and doc numbers (SCAI-RES-FRM-0007)
  catalog.js         reads resources/ off disk; works out policies vs forms
  analysis.js        metrics, theme grouping, finance concern detection
  rules.js           the Hard Rules chatbot (intent parsing, no AI needed)
  settings.js        the standing details every form asks for (names, titles)
  extract.js         text and tables out of csv/xlsx/docx/pdf; images refused
  intake.js          classifies an upload and proposes what to record from it
  llm.js             optional Ollama client + rule-based fallbacks
  api.js             all routes
public/
  index.html         the shell
  styles.css         all styling; colour tokens at the top
  app.js             the whole screen: router, views, drawer, live clock
scripts/
  import_finance.py  one-time flattening of the cost spreadsheet
  clear-finance.js   empties finance.json after backing everything up
  demo.js            add/remove example tasks
content/guides/      the new-joiner guide wording, one JSON file per guide
data/                live data (JSON) — this is the user's actual work
uploads/             uploaded originals, kept as they arrived
resources/           the supplied policies and forms, untouched
templates/converted/ modern .docx/.xlsx copies of the legacy .doc/.xls forms
```

---

## Data shapes

All in `data/`. Nothing is migrated automatically — if you change a shape,
write a migration in `scripts/`.

- **`workstreams.json`** — `{id, code, name, blurb, colour, hasPolicies,
  hasForms, hasFinance, resourceFolder, subcategories[], builtIn, archived}`.
  `code` drives the reference numbers and must be unique.
- **`tasks.json`** — `{id, ref, workstreamId, subcategory, theme, title,
  description, status, stage, priority, deadline, owner, nextActionBy,
  blockers[], linkedDocs[], notes, createdAt, updatedAt, completedAt,
  history[]}`. `status` is one of `open | in-progress | blocked | completed`.
  `deadline` is a plain date string (`YYYY-MM-DD`), treated as expiring at the
  end of that day.
- **`documents.json`** — the internal document register.
- **`finance.json`** — one record per *charge* (vendor × month), not per vendor.
  Imported rows carry `source: "spreadsheet-import"`, hand-entered ones
  `source: "manual"`, and ones taken from an upload `source: "uploaded"` plus
  `sourceUploadId`. **Emptied on 23 September 2026 at the user's request**; the
  402 imported rows are in `data/_backups/…-before-finance-clear`.
- **`rules.json`** — hard rules. `scope` is `"global"` or a workstream id.
- **`masterlist.json`** — `{name, columns[], rows[]}`; rows carry `_id` and `_n`.
- **`uploads.json`** — one record per uploaded file: `{id, filename, savedAs,
  kind, readable, target, status, applied{}}`. `status` is `proposed |
  applied | set aside`. The proposal itself is **not** stored — the file is
  re-read and re-proposed on every view, so there is one source of truth.
- **`settings.json`** — the standing details: requester name and job title,
  department, and `hodApprover`, which defaults to Shefeeque Abdul Rahman.
- **`counters.json`** — running numbers. **Never reset these**, or reference
  numbers will be reused and start pointing at two different things.

---

## How the form filler works

`forms.js` reads the labels straight off the template. Scicom's forms lay their
fields out in four different ways and all four are handled — see the comment at
the top of that file. Nothing is hard-coded per form, so a form dropped into
`resources/` becomes fillable immediately; `OVERRIDES` at the bottom of
`forms.js` corrects the wording of a question where the automatic reading is
clumsy, keyed by filename.

Answers are written by **splicing runs into the original XML at recorded
character offsets**, never by rebuilding the document. Everything untouched
comes through byte for byte. `applyWrites` works backwards from the end of the
file so earlier edits never shift later positions.

Two traps worth knowing:

- **"To be filled by the Line Manager" is not an approval section.** It names
  the role that completes it, and the user is very often that role. Treating it
  as someone else's emptied three whole forms of every question. Only genuine
  sign-off blocks (`APPROVAL_RE`) are dropped.
- **Word has two kinds of tick-box** and Scicom's forms use both: real form
  fields (`<w:checkBox>`, 95 of them in the Personnel Action Form) and plain
  ballot characters (U+2610). `docx.tickCheckbox` handles each.

## How the guides work

`builder.js` writes a `.docx` from nothing — six XML parts plus the logo — on
top of `zip.js`. `guides.js` is the layout: header band, summary box, facts
table, numbered steps, who-does-what, watch-outs, questions, and the closing
note. The wording is data, in `content/guides/*.json`, so it can be corrected
without touching code. Adding a guide means adding a JSON file; nothing
registers it anywhere.

Two judgements worth keeping:

- **Every guide carries a footer disowning itself.** It states it is a summary,
  names the source document and version, and says the policy wins in a
  disagreement. Do not remove that — these guides get handed to new joiners who
  have no way of knowing what they do not cover.
- **Two of the 25 source PDFs are not procedures.** The MICARE Panel GP List
  (136,000 words) and the Allianz Panel Hospital Listing are directories. They
  are covered by one guide on how to search them, not rewritten as steps.

## Things that will bite you

- **`.append()` does not flatten arrays.** Use the `fill()` helper in `app.js`,
  never `node.append(someArray)` — you get `[object HTMLDivElement]`.
- **`hidden` loses to `display: flex`.** The drawer needs its explicit
  `.drawer[hidden] { display: none }` rule. Removing it leaves a white panel
  stuck over a third of the screen.
- **Hard rule numbers always index the full list**, never a filtered view.
  This is deliberate: "change rule 3" meaning different rules depending on what
  you last listed is how the wrong rule gets edited. Don't "improve" it.
- **A monthly subscription is not a duplicate charge.** `analysis.js` excludes
  recurring cost types from duplicate detection and uses a 20-day window.
  Widening it back to 35 days floods the screen with false alarms.
- **The countdowns tick client-side** off `[data-deadline]` attributes, once a
  second. Any new element showing a deadline must carry that attribute or it
  will freeze at whatever it said when it was drawn.
- **LibreOffice was used once, in a container, to convert the legacy forms.**
  It is not a runtime dependency and is not installed on the user's laptop.
  The converted files in `templates/converted/` are checked in on purpose.

---

## State of play

### Done and tested

- All 8 standing workstreams, plus create-new and update-existing.
- Live clock and per-second deadline countdowns across every screen.
- Add / update / delete tasks, with change history per task.
- Metrics (open, in-progress, blocked, completed, overdue, due within 7 days),
  per workstream and overall.
- Tasks grouped by theme, with stage, blockers and who acts next.
- Policies and forms read live off disk, with official numbers and versions
  parsed out of the filenames.
- Internal document numbering and a document register.
- Finance: RM/USD totals, exchange rates matched to the right month, spend by
  month, top vendors, an editable table, and automatic concern detection. The
  records themselves start empty; they come from uploads or by hand.
- **The uploader.** Drop in a PDF invoice, an Excel or CSV sheet, a Word report
  or a photo. It reads what it can, proposes what should be recorded, and
  writes nothing until the user has checked it on screen and pressed the
  button. Amounts and dates always come from the text, never from the model.
- **Standing details.** The requester's name and the second-level approver are
  filled into every form from Settings, including the approval grid at the foot
  of a change request, where the column heading names whose box it is. Only
  empty boxes are ever written into.
- Master list: CSV import, live search, click-to-edit cells, add/delete rows.
- Hard rules chatbot, working with no AI at all.
- Optional Ollama integration with graceful fallback everywhere.
- Backups on demand.
- **The new-joiner guides.** 23 Scicom policies rewritten in plain English,
  each downloadable as a Word file built from scratch with the logo on it.
- **The guided form filler.** Pick a form, answer one question at a time (every
  one skippable), and the answers are written into the real Scicom template.
  Letterhead, borders, footers and signature blocks come through untouched.
  Dates the form wants for itself are filled in automatically; dates you give
  are reformatted to "14 November 2026". Tick-boxes are offered as a choice and
  ticked in place. Each finished form gets an internal document number and is
  added to the register.

### Not built yet

1. **Spreadsheet forms.** Six forms are `.xlsx`/`.xls` (timesheets, payout
   lists, the Access Control List). The filler covers Word only; these are
   offered as downloads. Filling them would mean a `sheet.js` alongside
   `docx.js` — `zip.js` already does the container half of the work, and
   `xl/worksheets/sheet1.xml` plus `xl/sharedStrings.xml` are the two files
   that matter.

2. **Attaching completed forms to tasks.** `linkedDocs[]` exists on every task
   but nothing writes to it yet. A form filled from inside a task should link
   back to it — `POST /api/forms/:id/fill` already accepts `taskId` and stores
   it on the document, so it is half done.

3. **Side-by-side check of the converted forms.** Still outstanding. The nine
   converted from `.doc` have not been compared against the originals in Word.

---

## Known limitations, stated plainly

- Master list import is **CSV only**. Reading `.xlsx` in the browser would mean
  a dependency; the user saves as CSV from Excel instead.
- Finance concern detection is rule-based, not clever. It will not catch a
  wrong amount that looks plausible.
- Imported finance rows have no invoice number or card, because the spreadsheet
  has no such columns. This is surfaced as one summary concern rather than one
  per row.
- **Photographs and scans are not read.** There is no OCR, deliberately: it
  would mean installing something. The file is kept and attached and the boxes
  come up blank. A PDF that is really a scan behaves the same way and says so.
- PDF text extraction handles computer-made PDFs. A font with a private
  encoding can still come out as nonsense; that shows in the excerpt, which is
  why the excerpt is on screen.
- `.xls` and `.doc` cannot be opened at all. The uploader says so and names the
  fix (save as `.xlsx` / `.docx`).
- There is no login. It listens on `127.0.0.1` only, so nothing outside the
  computer can reach it.

## The QR code

`lib/qr.js` is a QR encoder written from scratch — byte mode, versions 1 to 10,
levels L and M. It exists so that starting in phone mode prints a code you can
point a camera at, instead of an IP address you have to type into a phone.

It is verified against a real decoder (`pyzbar`): all ten versions, both levels,
and the terminal output itself parsed back and scanned. Re-run that check if you
touch it — a QR code that is subtly wrong looks completely convincing.

**The bug that cost the most time, in case it recurs:** the fifteen format bits
run most-significant-first along their positions — bit 14 first, bit 0 last.
Writing them the other way round produces a code with perfect finder patterns,
perfect timing, correct data and correct error correction, that no scanner on
earth will read, because format is the first thing a scanner decodes and it
fails before reaching anything else.

The terminal rendering sets its colours explicitly rather than inheriting the
theme. A QR code must be dark-on-light; a terminal may be either way round, so
inheriting means it works on one machine and silently fails on the next.
