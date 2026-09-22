# Trying it out

Fifteen minutes, in the order that shows you the most. Nothing here can break
anything — and if you want a clean slate afterwards, the last section says how.

---

## Getting it running

1. **Get the code.** In a terminal:

   ```
   git clone https://github.com/lash-lan/personal-website.git
   cd personal-website
   git checkout claude/workstream-task-management-qsc5m9
   ```

   If you already have the repository on this laptop:

   ```
   cd <wherever personal-website is>
   git fetch origin
   git checkout claude/workstream-task-management-qsc5m9
   ```

2. **Add the content.** Unzip the content bundle and copy the four folders
   inside it — `resources`, `templates`, `content`, `data` — into the
   `scicom-axe` folder.

   These are not on GitHub on purpose. That repository is public, and one of
   the supplied HR files contains a person's passport and bank details.

3. **Start it.** In a terminal inside `personal-website/scicom-axe`:

   ```
   npm start
   ```

4. Open **http://localhost:4173**.

To stop it, press **Ctrl + C** in that terminal window.

You should see the dashboard, eight workstreams down the left, and a clock
ticking in the top right. If you do, everything is working.

---

## Worth trying, in this order

### 1. Watch the clock (10 seconds)

Look at the deadline on any task. It counts down on its own — anything due
today shows hours, minutes and seconds. Nothing needs refreshing.

### 2. Add a task the quick way (1 minute)

Click **+ New task** in the top right. Type a name, pick a workstream, pick a
deadline, click Add task. That is the whole thing — everything else on that
form is optional.

Then find it on the dashboard and click it to reopen it. Change the status to
Blocked and type a blocker. Save, and look at the History section at the bottom
— it recorded what changed.

### 3. Fill in a form (3 minutes) — *the part I would test hardest*

Go to **Department Finances → Action → Fill out a form → Purchase Requisition**.

Answer the questions however comes naturally — write badly on purpose for the
long ones. Skip at least one. Then make the Word file and open it.

Check: is the Scicom letterhead intact? Did your answers land in the right
boxes? Is the section the Finance department fills in still empty? Did the date
fill itself in?

Try the **Personnel Action Form** too, under Resource Administrative. That one
has tick-boxes — pick a movement type and check the right box is ticked in the
Word file and the other 94 are not.

### 4. Read a new joiner guide (2 minutes)

**New joiner guides** in the sidebar. Click **Read it** on Medical Leave and
Hospitalisation, then download it as Word.

Read it as if you were new. Does it tell you what you actually need? Is
anything wrong for how your department really works? That is the feedback I
need most — I wrote these from the policies, and you know the practice.

### 5. Look at the finances (2 minutes)

**Department Finances → Finances**. Your spreadsheet, flattened into 402
individual charges.

Look at the points of concern. It has noticed that the ChatGPT Plus and Cursor
subscriptions for Ganesan, Inam, Andrea and Maqsood have had no charge since
December 2025. Is that right? Were they cancelled?

Click any row to edit it. Add an invoice number and a card to one and watch it
drop off the incomplete list.

### 6. Talk to the hard rules (1 minute)

**Hard rules** in the sidebar. Type into the box at the bottom:

```
for finance add rule: every subscription must name the person it is for
```

It should add it and show it in the list above. Then try `show rules for
finance`, and `remove rule 6`.

### 7. Search the master list (1 minute)

**Master list**. There is a four-row sample in there. Type in the search box.
Click any cell and change it — it saves as soon as you click away.

When you have your real list, save it from Excel as CSV and import it over the
top.

### 8. Create a workstream (1 minute)

**New initiative**. Give it a name and tick "has its own forms". It appears in
the sidebar immediately with its own colour and its own task numbering.

---

## If something goes wrong

- **It will tell you.** Errors appear on screen in plain words, not codes.
- **Nothing is sent anywhere.** It listens only on this computer.
- **Back up before anything you are unsure about** — the button at the bottom
  of the sidebar copies everything into `data/_backups`.

---

## Clearing the test data

The tasks and the master list in the bundle are examples so the screens are not
empty. To remove them:

```
node scripts/demo.js clear
```

That removes only the example tasks. Anything you typed in yourself is kept.

To clear the master list, import your own CSV over it.

To start completely fresh, stop the system, delete everything inside the `data`
folder except `.gitkeep`, and start it again. You will get the eight
workstreams and the five starting rules back, and nothing else.
