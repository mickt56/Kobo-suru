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

**Rev-B tracking workbook** (daily baseline, daily actuals, milestone table): re-import it whenever you have a new copy.

```bash
npm run import:revb -- "path/to/Rev-B_Tracking.xlsx"
```

This rewrites `src/data/revb.js`. It needs the sheets `VS7 Rev-B`, `VS8 Rev-B` and `Rev-B Tables`; columns are found by their header names.

**Month-end depths**: edit `src/data/progression.js`:

- Add one entry per shaft: `{ date: eom(YYYY, M), depth: XXX.X }` (month is 0-indexed)
- Update the last month-to-date entry to the latest reporting date and depth (matching the Rev-B workbook's latest actual)

**Formation boundaries**: if one was crossed, edit `src/data/shafts.js`:

- Add `aFin: new Date(YYYY, M, D)` to the formation just exited
- Add `aStart: new Date(YYYY, M, D)` to the formation just entered

No other code changes are needed.

## Project layout

```
scripts/
└── import-revb.mjs        Rev-B workbook → src/data/revb.js
src/
├── data/
│   ├── shafts.js          VS7/VS8 specs + formations + lithology colours
│   ├── progression.js     Month-end (and latest month-to-date) actual depths
│   ├── rates.js           Default rate groups + presets
│   └── revb.js            Generated from the Rev-B workbook; do not edit
├── engine/
│   ├── projection.js      Pure projection / curve / quarter functions
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

- Projections run from the latest reporting date in `src/data/progression.js` (currently 24 Sep 2026), so adding a new row moves "today" forward automatically.
- Depth scale, lithology column, projection table, S-curve, Gantt and Rev-B forecasts are all driven from the same projection engine: change rates or override the current depth and everything updates.
- Rate modes: **Geology** (per-formation rates), **Timeline** (quarterly rates) and **Stats** (a constant rate from past performance). In Stats mode, pick a look-back window (whole project, last 6 or 3 complete months) and a statistic (worst, P25, median, mean, P75, best of the monthly rates). The Scenarios tab compares all of them; click a cell to apply it. These follow the workbook's "Sched Summary" sheet but are calculated from `progression.js`, so they update with each new month-end row.
- Rev-B slippage is shown per milestone (actual or forecast date minus the Rev-B date). Sinking stages also show Rev-B against actual rate and days, with the % of the Rev-B rate achieved. Forecasts add the remaining Rev-B event durations (breakthrough, punch list, etc.) to the projected sinking dates.
