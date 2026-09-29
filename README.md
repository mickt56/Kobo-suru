# AVMA Shaft Schedule Visualiser

Local web app (Vite + React) for visualising VS7 / VS8 shaft sink schedules against the Rev-B baseline. Data-driven from `src/data/` so regular updates require no code changes.

## Run

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

## Updating the data

The Rev-B tracking workbook is the single source for actual depths: the app takes each month-end
depth and the latest reading from its daily actuals.

**Each update** (weekly, month-end, or whenever you have a new copy of the workbook):

```bash
npm run import:revb -- "path/to/Rev-B_Tracking.xlsx"
```

This rewrites `src/data/revb.js`. It needs the sheets `VS7 Rev-B`, `VS8 Rev-B` and `Rev-B Tables`;
columns are found by their header names. Commit the result. That's the whole update.

**Only when needed:**

- **A formation boundary was crossed** — edit `src/data/shafts.js`: add `aFin: new Date(YYYY, M, D)`
  to the formation just exited and `aStart: new Date(YYYY, M, D)` to the one entered (months are
  0-indexed, Jan = 0). If it was met at a different depth than modelled, adjust `to`/`from` too.
- **You have a newer reading than the workbook** (e.g. figures by message before the next copy) —
  add it to `src/data/progression.js` as `{ date: new Date(YYYY, M, D), depth: XXX.X }`. It's used
  until an imported workbook covers that date; the import then tells you the row can be deleted.

`progression.js` otherwise only holds history from before the workbook's first actual reading.

## Project layout

```
scripts/
└── import-revb.mjs        Rev-B workbook → src/data/revb.js
src/
├── data/
│   ├── shafts.js          VS7/VS8 specs + formations + lithology colours
│   ├── progression.js     Pre-workbook history + any reading newer than the workbook
│   ├── rates.js           Default rate groups + presets
│   └── revb.js            Generated from the Rev-B workbook; do not edit
├── engine/
│   ├── projection.js      Pure projection / curve / quarter functions
│   ├── actuals.js         Merges workbook actuals with progression.js
│   ├── revb.js            Rev-B status, milestone and monthly summaries
│   └── stats.js           Rate statistics from past performance (scenarios)
├── components/
│   ├── KPIBar.jsx
│   ├── LithologyColumn.jsx
│   ├── RatesPanel.jsx
│   ├── ScheduleTable.jsx
│   ├── SCurve.jsx
│   ├── GanttTimeline.jsx
│   ├── RevBView.jsx       Rev-B tab: chart, KPIs, milestone + monthly tables
│   ├── ScenarioView.jsx   Scenarios tab: statistical rate scenarios per shaft
│   ├── PatternDefs.jsx    Shared SVG hatch patterns
│   └── useElementHeight.js
├── App.jsx                Composition + state
├── App.css
└── main.jsx
reference/                 Original single-file prototype + handover doc
```

## Notes

- Your shaft, tab, rate mode, rates and chosen scenario are remembered in the browser (what-if depths are not). "Reset all to defaults" at the bottom of the rates panel clears them.
- **Print / PDF** in the header prints the current shaft and tab on A4 landscape (choose "Save as PDF" in the print dialog for a file).
- The app opens on the Rev-B tab. The header shows the data date and, when a depth is typed in, a what-if marker with the actual depth and a reset.
- Projections run from the latest actual reading (currently 28 Sep 2026), so each import moves "today" forward automatically.
- Depth scale, lithology column, projection table, S-curve, Gantt and Rev-B forecasts are all driven from the same projection engine: change rates or override the current depth and everything updates.
- Rate modes: **Geology** (per-formation rates), **Timeline** (quarterly rates) and **Stats** (a constant rate from past performance). In Stats mode, pick a look-back window (whole project, last 6 or 3 complete months) and a statistic (worst, P25, median, mean, P75, best of the monthly rates). The Scenarios tab compares all of them; click a cell to apply it. These follow the workbook's "Sched Summary" sheet but are calculated from `progression.js`, so they update with each new month-end row.
- Rev-B slippage is shown per milestone (actual or forecast date minus the Rev-B date). Sinking stages also show Rev-B against actual rate and days, with the % of the Rev-B rate achieved. Forecasts add the remaining Rev-B event durations (breakthrough, punch list, etc.) to the projected sinking dates.
