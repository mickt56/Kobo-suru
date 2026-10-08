# Updating the AVMA Shaft Schedule Visualiser

The **Rev-B tracking workbook is the single source of actual depths.** The app takes every month-end
depth and the latest reading from its daily actuals, so a routine update is: import the workbook,
check, commit. Everything else is occasional.

## At a glance

| When | What to do | File that changes |
|---|---|---|
| **Every update** (weekly, month-end, or whenever you have a new copy of the workbook) | Import the workbook | `src/data/revb.js` (generated) |
| A formation boundary was crossed | Add the transition date | `src/data/shafts.js` |
| You have figures newer than your latest workbook | Add a dated reading | `src/data/progression.js` |
| Someone needs a copy without installing anything | Build the single-file version | `dist-single/AVMA_Schedule_Visualiser.html` |

The app's "Data as at" date is the latest actual reading, so it moves forward by itself on each
import. Nothing else in the code needs touching.

---

## Option A: ask Claude Code

Open a Claude Code session on this repository, attach what you have, and paste one of these:

**Routine update**
> Attached is the Rev-B tracking workbook. Import it into the visualiser with `npm run import:revb`,
> check that the header and the Rev-B tab show the workbook's latest date and depths, then commit,
> open a pull request and merge it.

**Figures ahead of the workbook**
> VS7 is at 331.2m and VS8 at 482.0m as at 5 Oct 2026. Add these to `progression.js` as readings
> newer than the workbook, check the app, then commit, open a pull request and merge it.

**Formation boundary crossed**
> VS8 passed from Bulgo Sandstone into Stanwell Park Claystone at 478m on 3 Oct 2026 (confirmed by
> the geotech). Record it in `shafts.js`, check the app, then commit, open a pull request and merge it.

## Option B: do it yourself

### One-time setup

1. Install [Node.js](https://nodejs.org) 18 or later (`node --version` to check).
2. Get the code and install its packages:
   ```bash
   git clone https://github.com/mickt56/Kobo-suru.git
   cd Kobo-suru
   npm install
   ```

### 1. Routine update: import the workbook

```bash
git pull
npm run import:revb -- ~/Downloads/Rev-B_Tracking.xlsx
```

Put the path in quotes if it contains spaces. The file name doesn't matter; the sheet and column
names do (see Troubleshooting). Close the workbook in Excel first.

The output looks like this:

```
VS7: 647 days (2025-05-22 to 2027-02-27), actuals to 2026-10-05 at 331.2m, 19 milestones
VS8: 524 days (2025-05-19 to 2026-10-24), actuals to 2026-10-05 at 482.0m, 13 milestones
Wrote src/data/revb.js
```

- **"actuals to …"** should be the last day with a depth in the workbook, for both shafts.
- If it also says **"the workbook now covers … hand-entered reading(s) … can be deleted"**, delete
  those rows from `src/data/progression.js` (the workbook's values are already being used).

Check the app (`npm run dev`, then open http://localhost:5173), then commit:

```bash
git add src/data/revb.js src/data/progression.js
git commit -m "Rev-B data to 5 Oct 2026"
git push
```

### 2. A formation boundary was crossed

In `src/data/shafts.js`, find the shaft and add the date to both formations: `aFin` on the one
exited, `aStart` on the one entered. **Months count from 0** (Jan = 0 … Oct = 9 … Dec = 11).

```js
// VS8 left Bulgo Sandstone and entered Stanwell Park Claystone on 3 Oct 2026
{ name: "Bulgo Sandstone",         code: "BGSS", from: 251, to: 478, aStart: new Date(2025, 10, 30), aFin: new Date(2026, 9, 3) },
{ name: "Stanwell Park Claystone", code: "SPCS", from: 478, to: 485, aStart: new Date(2026, 9, 3) },
```

If the boundary was met at a different depth from the model, change the exited formation's `to`
and the entered formation's `from` to the actual depth. They must stay equal, as with Bald Hill
Claystone / Bulgo Sandstone at 250m for VS7.

### 3. Figures ahead of the workbook

If you're sent depths before the next copy of the workbook, add them at the bottom of each shaft's
list in `src/data/progression.js`:

```js
{ date: new Date(2026, 9, 5), depth: 331.2 }, // 5 Oct 2026, ahead of the workbook
```

The app uses the reading until you import a workbook that covers that date. From then on the
workbook's value is used, and the import tells you the row can be deleted.

### 4. Share a copy with someone who doesn't run the project

```bash
npm run build:single
```

This writes `dist-single/AVMA_Schedule_Visualiser.html`, the whole app in one file. Email it or put
it on Teams; it opens by double-clicking and works offline. It's a snapshot: rebuild it after each
update.

For a report instead, use **Print / PDF** in the app's header. It prints the current shaft and tab
on A4 or A3 landscape: pick the size with the **A4 / A3** buttons next to it (A3 prints larger, for presentations). Choose "Save as PDF" in the print dialog.

---

## After any update, check

- The header's **Data as at** date is the latest reading, and **Depth** matches the workbook for
  each shaft.
- The **Rev-B** tab's first card ("Actual · <date>") shows the same date and depth.
- If you added a formation date: the Schedule tab shows the formation as done, with its actual
  entry/exit dates and achieved rate.
- `npm run build` finishes with "✓ built".

## Troubleshooting

| Message or symptom | Cause and fix |
|---|---|
| `Missing sheet "VS7 Rev-B"` (or `VS8 Rev-B`, `Rev-B Tables`) | A sheet was renamed. The names must match exactly. |
| `VS7 Rev-B: could not find headers …` | A daily-sheet column heading changed. Needed: **Date**, **Schedule Stage**, **Schedule Cumulative Depth**, **Actual Shaft Depth** (in the first 6 rows). |
| `Rev-B Tables: task table at column … missing …` | A task-table heading changed. Needed: **Task Name**, **Rev-B Advance m/day**, **Metres**, **Duration**, **Scheduled Date**, **Actual Date**, **Schedule Cumulative Depth**. |
| `Rev-B Tables: cannot tell which shaft …` | Task names in a table must mostly include "VS7" or "VS8". |
| `… formula cell(s) have no stored value …` or `… no rows with a date and a Schedule Cumulative Depth` | The workbook was saved without calculating (e.g. by a tool other than Excel). Open it in Excel, save, and import again. |
| Import fails with a file-lock error | Close the workbook in Excel and retry. |
| The import's "actuals to …" date is older than expected | The daily sheets' **Actual Shaft Depth** column is linked to the shaft log workbooks (`VS7_ShaftLog` / `VS8_ShaftLog`). Open the Rev-B workbook with the shaft logs available, let Excel update the links, save, and import again. |
| Rev-B mode lost some changed rates or durations after an import | They're remembered by milestone name, so a milestone renamed in the workbook's **Rev-B Tables** starts again from its Rev-B value. |
| Timeline months moved after an update | Monthly rates are kept by calendar month. The list always starts at the month of the latest reading, so months that have passed drop off and the rest keep their rates. |
| A date is a month out | Months count from 0 in `new Date(…)` (Oct = 9). |
| App monthly figures differ from the workbook's **Rev-B Tables** monthly table | Expected: the app builds them from the daily sheets. That table is hand-entered, drifts up to ~3m, and had VS7/VS8 Jul–Aug 2026 actual advances crossed. |
| Whole-project statistics or rolling rates differ from **Sched Summary** | Expected: the app uses actual days for the first month and depth change for rolling rates. The 6- and 3-month windows match. |

## Don't edit

- `src/data/revb.js`: it's generated. Re-import instead; hand edits are overwritten.
- Rows in `src/data/progression.js` for dates the workbook covers: they're ignored.
- VS8's final depth (548.1m) unless the design changes. Rev-B's daily sheet runs to 561m and is
  plotted as supplied.
