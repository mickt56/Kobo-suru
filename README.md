# AVMA Shaft Schedule Visualiser

Local web app (Vite + React) for visualising VS7 / VS8 shaft sink schedules. Data-driven from `src/data/` so monthly EOM updates require no code changes.

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

## Monthly Update

After EOM reporting, edit `src/data/progression.js`:

- Add one entry per shaft: `{ date: eom(YYYY, M), depth: XXX.X }` (month is 0-indexed)
- Update the last MTD entry's date and depth if mid-month

If a formation boundary was crossed during the month, edit `src/data/shafts.js`:

- Add `aFin: new Date(YYYY, M, D)` to the formation just exited
- Add `aStart: new Date(YYYY, M, D)` to the formation just entered

No other code changes are needed.

## Project layout

```
src/
├── data/
│   ├── shafts.js          VS7/VS8 specs + formations + lithology colours
│   ├── progression.js     Monthly EOM actual depths
│   └── rates.js           Default rate groups + presets
├── engine/
│   └── projection.js      Pure projection / curve / quarter functions
├── components/
│   ├── KPIBar.jsx
│   ├── LithologyColumn.jsx
│   ├── RatesPanel.jsx
│   ├── ScheduleTable.jsx
│   ├── SCurve.jsx
│   ├── GanttTimeline.jsx
│   └── PatternDefs.jsx    Shared SVG hatch patterns
├── App.jsx                Composition + state
├── App.css
└── main.jsx
reference/                 Original single-file prototype + handover doc
```

## Notes

- `today` is hardcoded in `App.jsx` to `new Date(2026, 4, 19)`. Swap for `new Date()` to make it live.
- Depth scale, lithology column, projection table, S-curve, and Gantt are all driven from the same projection engine — change rates or override the current depth and everything updates.
