# Workstream OS

A local system for tracking every workstream, task, deadline, document and cost
in the Scicom AI department. It runs on your own computer. Nothing is published
to the internet and nothing is sent anywhere.

---

## Running it

You need Node 18 or newer. (You have Node 22, so you are fine.)

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

Copy the whole `workstream-os` folder. That is the entire move.

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
3. Leave Ollama running. Workstream OS finds it by itself.

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
