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

**Step-by-step guide: [docs/UPDATING.md](docs/UPDATING.md).**

In short, the Rev-B tracking workbook is the single source of actual depths:

```bash
npm run import:revb -- "path/to/Rev-B_Tracking.xlsx"   # every update
npm run build:single                                    # optional: one-file copy to share
```

Only occasionally: add formation transition dates in `src/data/shafts.js`, or a reading newer than
the workbook in `src/data/progression.js`.

## Project layout

```
docs/
└── UPDATING.md            How to update the data
scripts/
├── import-revb.mjs        Rev-B workbook → src/data/revb.js
└── build-single.mjs       One-file offline copy → dist-single/
src/
├── data/
│   ├── shafts.js          VS7/VS8 specs + formations + lithology colours
│   ├── headframes.js      Simplified headframe outlines for the Section tab
│   ├── progression.js     Pre-workbook history + any reading newer than the workbook
│   ├── rates.js           Default rate groups + presets
│   └── revb.js            Generated from the Rev-B workbook; do not edit
├── engine/
│   ├── projection.js      Pure projection / curve / month functions
│   ├── periods.js         Forecast period bands (next N months) and colours
│   ├── actuals.js         Merges workbook actuals with progression.js
│   ├── revb.js            Rev-B status, milestone and monthly summaries
│   └── stats.js           Rate statistics from past performance (scenarios)
├── components/
│   ├── KPIBar.jsx
│   ├── LithologyColumn.jsx
│   ├── RatesPanel.jsx
│   ├── RevBStages.jsx     Rev-B stages rate mode: per-stage rates and event durations
│   ├── ScheduleTable.jsx
│   ├── SCurve.jsx
│   ├── GanttTimeline.jsx
│   ├── SectionView.jsx    Section tab: both shafts with headframes and period bands
│   ├── MonthlyRates.jsx   Timeline mode: monthly rates with apply-to-range
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
- Rate modes: **Geology** (per-formation rates), **Timeline** (monthly rates; set one rate across a range of months with Apply, add months with + 1/6/12), **Stats** (a constant rate from past performance) and **Rev-B** (the rest of the Rev-B stages from today's depth). In Stats mode, pick a look-back window (whole project, last 6 or 3 complete months) and a statistic (worst, P25, median, mean, P75, best of the monthly rates). The Scenarios tab compares all of them; click a cell to apply it. These follow the workbook's "Sched Summary" sheet but are calculated from `progression.js`, so they update with each new month-end row.
- In **Rev-B** mode the rates panel lists every Rev-B stage still ahead: change a sinking stage's rate or an event's duration, or set every sinking stage to 80%, 90% or 100% of its Rev-B rate, or to the share of Rev-B rate achieved to date. Each row shows when that stage ends and its slip against the Rev-B date. Events between sinking stages (e.g. VS7's shaft bottom breakthrough at 560m) hold the depth for their duration; events after final depth move only the finish date. Changes are remembered per shaft, by milestone name.
- **Forecast period bands** (like the Deswik period progress plot): choose how many months ahead to colour (3, 6, 9, 12, 18 or 24) from the shaft column or the Section tab. Each month gets its own colour, red through to blue, on the shaft column, a strip on the Gantt and the monthly rates list.
- **Section tab**: VS7 and VS8 as long sections side by side, with a simplified headframe, lithology, the mined shaft, hold point / stand-off / breakthrough, a status table (target, current depth and RL, remaining, % sunk, forecast final depth) and a table of the coloured periods. Scale Fit / ×2 / ×4; prints on one A4 landscape page.
- Rev-B slippage is shown per milestone (actual or forecast date minus the Rev-B date). Sinking stages also show Rev-B against actual rate and days, with the % of the Rev-B rate achieved. Forecasts add the remaining Rev-B event durations (breakthrough, punch list, etc.) to the projected sinking dates; in Rev-B mode they come straight from the stages, with any changed durations.
