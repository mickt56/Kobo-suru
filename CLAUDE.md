# AVMA Shaft Schedule Visualiser — Project Context

Vite + React local web app for VS7 / VS8 shaft sink scheduling. Decomposed from the working single-file prototype in `reference/AVMA_Schedule_Visualiser.jsx` following the brief in `reference/AVMA_Schedule_Visualiser_Claude_Code_Handover.md`.

## Architecture

- **`src/data/`** — pure data, hand-edited monthly. No imports from anywhere except small helpers.
  - `shafts.js` — VS7 / VS8 specs, formation sequences, `LITHO_COLORS`, `DARK_CODES`
  - `progression.js` — monthly EOM actual depth arrays (`VS7_ACTUAL`, `VS8_ACTUAL`)
  - `rates.js` — `RATE_GROUPS` defaults, `LOWER_CODES`, `PRESETS`
- **`src/engine/projection.js`** — all pure compute functions: `computeProjection`, `computeTimelineProjection`, `buildPlannedCurve`, `buildProjectedCurve`, `buildPlannedTimeline`, `generateQuarters`, plus date helpers (`addDays`, `daysBetween`, `fmtDate`, `fmtShort`, `eom`). No React, no state.
- **`src/components/`** — presentation only. State lives in `App.jsx` and is passed down.
- **`src/App.jsx`** — composition, state ownership, memoised derived values. Assembles `SHAFTS = { VS7: {...VS7, actual: VS7_ACTUAL}, VS8: {...VS8, actual: VS8_ACTUAL} }`.

## Monthly update flow

1. Append one row per shaft in `src/data/progression.js`.
2. If a formation boundary was crossed, add `aStart`/`aFin` to the relevant formation in `src/data/shafts.js`.
3. Done — no other files touched.

## Conventions

- Months in `Date` constructors are 0-indexed (Jan = 0).
- `eom(y, m)` = end of month, i.e. `new Date(y, m+1, 0)`.
- `today` in `App.jsx` is the latest reporting date across both shafts' progression data, so it advances automatically when a new EOM row is added.
- Lithology colour palette and `DARK_CODES` (for white-on-dark text) live in `data/shafts.js` because they're geological metadata.
- The `LOWER` rate group covers Bulli Seam and everything below in VS7. VS8 terminates within Coalcliff SS so its `LOWER` slider is auto-hidden by `RatesPanel`.

## What NOT to do

- Don't add per-component data stores. Data is hand-edited monthly; centralising it in `src/data/` is intentional.
- Don't move projection logic into components. Keep `engine/projection.js` pure.
- Don't reorder `formations` arrays — `from`/`to` must be contiguous and ascending.
