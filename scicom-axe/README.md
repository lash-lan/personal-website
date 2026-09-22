# Scicom Axe

A local system for tracking every workstream, task, deadline, document and cost
in the Scicom AI department. It runs on your own computer. Nothing is published
to the internet and nothing is sent anywhere.

---

**Trying it for the first time?** Read `TESTING.md` — it is a fifteen-minute
walkthrough in the order that shows you the most.

## Running it

You need Node 18 or newer. (You have Node 22, so you are fine.)

**Moving it to a new laptop needs two things**, not one: this code, and the
content bundle. The policies, forms, guides and your data are deliberately kept
out of GitHub because that repository is public and one of the supplied HR
files contains a person's passport and bank details. Copy the whole folder, or
use the bundle.

1. Open a terminal in this folder.
2. Type:

   ```
   npm start
   ```

3. Open **http://localhost:4173** in your browser.

To stop it, go back to the terminal window and press **Ctrl + C**.

There is nothing to install. No packages are downloaded, no build step runs.
`npm start` simply starts the small server in `server.js`.

If the port is busy, start it somewhere else:

```
PORT=4174 npm start
```

---

## Moving it to another computer

Copy the whole `scicom-axe` folder. That is the entire move.

Everything the system knows lives inside the folder:

| Folder       | What is in it                                               |
|--------------|-------------------------------------------------------------|
| `data/`      | Your tasks, rules, documents, finance records, master list   |
| `resources/` | The Scicom policies and forms, exactly as supplied           |
| `templates/` | Modern copies of the old `.doc` / `.xls` forms               |
| `lib/`       | The logic                                                    |
| `public/`    | The screen                                                   |
| `scripts/`   | One-off helpers (importing, examples, backups)               |

On the new computer, open a terminal in the copied folder and run `npm start`.
It will pick up exactly where it left off.

**Handing it to a different Claude**, or picking it up again months later: point
it at `HANDOVER.md` in this folder. That file explains how everything is put
together, what is finished and what is not.

---

## On a phone

`npm run phone` instead of `npm start`. It prints an address like
`http://192.168.1.42:4173` — open that on your phone, on the same Wi-Fi.
Add it to your home screen and it opens like an app.

The laptop has to be on and running it; the phone is only a window onto it.

**There is no password.** Anyone else on the same Wi-Fi who knows the address
can open it. Fine at home; think first on an office network. The system says so
when you start it that way, and `npm start` goes back to this computer only.

## Backing up

Click **Back up my data now** at the bottom of the sidebar. It copies every
`data/*.json` file into `data/_backups/<date and time>/`.

Do this before anything you are unsure about. Restoring is a matter of copying
the files back out of the backup folder.

---

## The local AI (optional)

The system works completely without AI. Where you type a short note, it is
tidied up using fixed rules and kept as close to what you typed as possible.

If you want it to phrase things more smoothly, install **Ollama** — a free
program that runs a small AI on your own laptop, with no internet connection
and no cost per use:

1. Download it from <https://ollama.com/download>.
2. After installing, open a terminal and run: `ollama pull llama3.2`
3. Leave Ollama running. Scicom Axe finds it by itself.

The badge in the top right tells you which of the two it is using. Click the
badge to make it check again.

To use a particular model instead:

```
OLLAMA_MODEL=mistral npm start
```

---

## Useful commands

| Command                       | What it does                                     |
|-------------------------------|--------------------------------------------------|
| `npm start`                   | Start the system                                 |
| `npm run phone`               | Start it so a phone on the same Wi-Fi can reach it |
| `node scripts/demo.js add`    | Put the example tasks in                         |
| `node scripts/demo.js clear`  | Take the example tasks back out                  |
| `python3 scripts/import_finance.py` | Re-import the cost spreadsheet             |

The finance importer needs Python with `openpyxl` (`pip install openpyxl`).
It is only needed when the spreadsheet changes; the system itself does not use
Python at all.

---

## Adding or replacing a policy or a form

You do not need to touch any code.

- **To add one:** drop the file into the right folder inside `resources/`, under
  `Procedures - Policies` or `Forms`.
- **To replace one:** overwrite the file, keeping the same name.
- **To remove one:** delete the file, or move it somewhere else.

Refresh the page and the list updates itself. The **Update a workstream** screen
shows you the exact folder for each workstream.

---

## Filling in a form

Open a workstream, go to **Action**, then **Fill out a form**. Pick one and it
asks you what it needs, one question at a time.

- **Every question can be skipped.** A blank here is a blank on the form, the
  same as leaving a box empty on paper.
- **Dates the form wants for itself** — "Date of Requisition" and the like —
  are filled in for you. Dates you give are written out properly: type
  14/11/2026 and the form says 14 November 2026.
- **Tick-boxes** are offered as a list. Tick any number, or skip.
- **Long answers get tidied.** Write it however it comes out; the wording is
  cleaned up before it goes on the form. With Ollama installed it is reworded
  properly; without it, it is tidied by fixed rules and your words are kept.
- **Sections somebody else signs** — approvals, budget sign-off — are never
  asked for and never filled in.

At the end you get a Word file to download and an internal document number, so
that copy stays tracked. **Read it through in Word before you send it
anywhere.** Nothing is signed and nothing is submitted.

Six of the forms are spreadsheets rather than Word files. Those are offered as
downloads to fill in by hand.

## New joiner guides

**New joiner guides** in the sidebar holds 23 Scicom policies rewritten in plain
English: what it is for, what you need before you start, then the steps, who
does what, what to watch out for, and the questions people actually ask.

- **Read it** shows the guide on screen.
- **Word** downloads it as a Word file with the logo on it, ready to hand over.
- **Download all of them** writes the whole set into the `exports/` folder.

Every guide ends with a note saying it is a summary and not the policy, and
names the Scicom document and version it came from. Read one through before you
give it to anybody — policies are revised, and a guide is only as current as the
policy behind it.

The wording lives in `content/guides/`, one plain text file per guide. To change
what a guide says, edit that file and download it again. Nothing needs code
changing.

## Internal document numbers

When the official Scicom number is unknown, or when several copies of the same
form share one official number, the system assigns its own:

```
SCAI-RES-FRM-0007
 │    │   │    └── running number, never reused
 │    │   └─────── kind of document (FRM form, POL policy, INV invoice…)
 │    └─────────── which workstream
 └──────────────── fixed prefix, so it is obviously ours and not Scicom's
```

Assign one from **Action → Assign an internal document number** inside any
workstream.

Tasks are numbered the same way, more simply: `RES-T0007`.
