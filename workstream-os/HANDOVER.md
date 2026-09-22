# Handover notes

For whoever picks this up next — a different computer, a different Claude, or
the same one months later. Read this before changing anything.

The user is not a developer and does not want to become one. Explain things in
plain words, say whether something is done *locally* or *live*, and never fold
unrequested changes into a piece of work.

---

## What this is

A local-only workstream tracker for the Scicom AI department. It runs as a small
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
  store.js           JSON read/write, atomic saves, corrupt-file rescue, backups
  seed.js            the 8 standing workstreams, statuses, stages, starting rules
  ids.js             task refs (RES-T0007) and doc numbers (SCAI-RES-FRM-0007)
  catalog.js         reads resources/ off disk; works out policies vs forms
  analysis.js        metrics, theme grouping, finance concern detection
  rules.js           the Hard Rules chatbot (intent parsing, no AI needed)
  llm.js             optional Ollama client + rule-based fallbacks
  api.js             all routes
public/
  index.html         the shell
  styles.css         all styling; colour tokens at the top
  app.js             the whole screen: router, views, drawer, live clock
scripts/
  import_finance.py  one-time flattening of the cost spreadsheet
  demo.js            add/remove example tasks
data/                live data (JSON) — this is the user's actual work
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
  Imported rows carry `source: "spreadsheet-import"`; hand-entered ones carry
  `source: "manual"` and are never overwritten by a re-import.
- **`rules.json`** — hard rules. `scope` is `"global"` or a workstream id.
- **`masterlist.json`** — `{name, columns[], rows[]}`; rows carry `_id` and `_n`.
- **`counters.json`** — running numbers. **Never reset these**, or reference
  numbers will be reused and start pointing at two different things.

---

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
- Finance: 402 charges imported from the capitalised-cost spreadsheet, with
  RM/USD totals, exchange rates matched to the right month, spend by month, top
  vendors, an editable table, and automatic concern detection.
- Master list: CSV import, live search, click-to-edit cells, add/delete rows.
- Hard rules chatbot, working with no AI at all.
- Optional Ollama integration with graceful fallback everywhere.
- Backups on demand.

### Not built yet

1. **The guided form filler.** The biggest remaining piece. The intent: pick a
   form, the system asks one question per field (each skippable), optionally
   runs the answers through the local model to tighten wording, writes the
   answers into the real `.docx` template, auto-fills any date fields, and hands
   back a Word file to review and download.

   Groundwork already in place: all 22 forms are catalogued with a `fillable`
   flag; the 9 legacy `.doc`/`.xls` ones have modern twins in
   `templates/converted/`; `llm.polish()` already does the rewriting with a
   safe fallback; `exports/` and the `/exports/` download route exist.

   The approach that will work: fill the original `.docx` in place by writing
   text into its table cells (the forms are almost entirely tables), which
   preserves the Scicom letterhead and layout exactly. Do **not** rebuild the
   forms from scratch — they have to look like what colleagues approve.

   Note: the converted forms have not yet been checked side by side against the
   originals. Do that before relying on them.

2. **The rewritten new-joiner policy guides.** 25 policy PDFs to be turned into
   simple step-by-step guides, with the logo, professional-looking, downloadable.

3. **Attaching completed forms to tasks.** `linkedDocs[]` exists on every task
   but nothing writes to it yet.

---

## Known limitations, stated plainly

- Master list import is **CSV only**. Reading `.xlsx` in the browser would mean
  a dependency; the user saves as CSV from Excel instead.
- Finance concern detection is rule-based, not clever. It will not catch a
  wrong amount that looks plausible.
- Imported finance rows have no invoice number or card, because the spreadsheet
  has no such columns. This is surfaced as one summary concern rather than 402
  separate ones.
- There is no login. It listens on `127.0.0.1` only, so nothing outside the
  computer can reach it.
