# AVMA Shaft Schedule Visualiser — Project Context

Vite + React local web app for VS7 / VS8 shaft sink scheduling. Decomposed from the working single-file prototype in `reference/AVMA_Schedule_Visualiser.jsx` following the brief in `reference/AVMA_Schedule_Visualiser_Claude_Code_Handover.md`.

## Architecture

- **`src/data/`** — pure data. No imports from anywhere except small helpers.
  - `shafts.js` — VS7 / VS8 specs, formation sequences, `LITHO_COLORS`, `DARK_CODES` (hand-edited)
  - `progression.js` — hand-entered readings (`VS7_ACTUAL`, `VS8_ACTUAL`): only history before the workbook's first actual, plus any reading newer than the workbook's last. Everything else comes from the workbook.
  - `rates.js` — `RATE_GROUPS` defaults, `LOWER_CODES`, `PRESETS` (hand-edited)
  - `revb.js` — `REVB`: Rev-B daily baseline + actuals and milestone table per shaft. **Generated** by `scripts/import-revb.mjs` from the Rev-B tracking workbook; never hand-edit.
- **`src/engine/projection.js`** — all pure compute functions: `computeProjection`, `computeTimelineProjection`, `computeTimelineFormations`, `buildPlannedCurve`, `buildProjectedCurve`, `buildPlannedTimeline`, `generateQuarters`, curve helpers (`depthAtTime`, `dateAtDepth`), plus date helpers (`addDays`, `daysBetween`, `fmtDate`, `fmtShort`, `eom`). No React, no state.
- **`src/engine/actuals.js`** — `mergeActuals` builds each shaft's readings (workbook month-ends + latest reading, plus the `progression.js` rows outside the workbook's range; the workbook wins where both exist); `extendDaily` adds newer hand readings to the Rev-B daily series so every view shares one as-of date.
- **`src/engine/revb.js`** — pure Rev-B comparisons: `revbDaily`, `revbStatus`, `revbMilestones` (slip per milestone, forecasts, and per-stage rate reconciliation), `revbMonthly`, plus `revbPlan` (the Rev-B stages rate mode's remaining stages and depth curve) and `achievedToDate`.
- **`src/engine/stats.js`** — rate statistics from past performance: `monthlyHistory`, `rateStats`, `scenarioStats` (per window), `rollingRate`, `constantRatePoints`. Drives the Stats rate mode and the Scenarios tab.
- **`scripts/build-single.mjs`** — `npm run build:single`; the app as one offline HTML file in `dist-single/` (gitignored).
- **`docs/UPDATING.md`** — the user-facing update guide; keep it in step with any change to the update flow, file names or import messages.
- **`scripts/import-revb.mjs`** — `npm run import:revb -- <workbook.xlsx>`; reads sheets `VS7 Rev-B`, `VS8 Rev-B`, `Rev-B Tables`, locating columns by header text.
- **`src/settings.js`** — remembers the viewer's choices in `localStorage` (key `avma-visualiser:settings:v1`) and validates everything read back. Stored: shaft, tab, rate mode, geology rates, scenario choice, Timeline quarter rates (by label), Rev-B stage changes (by milestone name). What-if depths are deliberately not stored.
- **`src/components/`** — presentation only. State lives in `App.jsx` and is passed down.
- **`src/App.jsx`** — composition, state ownership, memoised derived values. Assembles `SHAFTS = { VS7: {...VS7, actual: VS7_ACTUAL}, VS8: {...VS8, actual: VS8_ACTUAL} }`.

## Update flow

1. Re-import the Rev-B workbook: `npm run import:revb -- <path>`. This is normally the whole update; month-end and latest depths come from its daily actuals.
2. If a formation boundary was crossed, add `aStart`/`aFin` (and adjust `to`/`from` if met at a different depth) in `src/data/shafts.js`.
3. Figures newer than the latest workbook: add a dated row to `src/data/progression.js`; the next import reports when it's covered and can be deleted.
4. Done — no other files touched.

## Conventions

- Months in `Date` constructors are 0-indexed (Jan = 0).
- `eom(y, m)` = end of month, i.e. `new Date(y, m+1, 0)`.
- `today` in `App.jsx` is the latest actual reading across both shafts (workbook or newer hand row), so it advances with each import.
- Lithology colour palette and `DARK_CODES` (for white-on-dark text) live in `data/shafts.js` because they're geological metadata.
- Rev-B slippage is per milestone (actual/forecast date − Rev-B date). The workbook's "Cumulative Slippage" column sums those and double counts; don't reproduce it.
- Per-stage actual rate = depth change between the days the actuals reach the stage's start and end depths (to the as-of date while in progress). The workbook's reconciliation table instead averages the lagging "Act. Advance m/day" column, so rates differ slightly.
- Rev-B monthly figures come from the daily sheets, not the workbook's hand-entered monthly table (which drifts up to ~3m, and had VS7/VS8 Jul–Aug 2026 actual advances crossed).
- Rate modes are `geology`, `timeline`, `stats` and `revb`. Timeline, Stats and Rev-B all produce a calendar depth curve (`curvePts` in App); everything downstream treats them alike.
- Rev-B stages mode (`revbPlan`, panel in `components/RevBStages.jsx`): the milestones still ahead of the current depth, at the viewer's rates / durations (`revbAdjust` in App, per shaft, keyed by milestone name; only values that differ from Rev-B are stored). Events between sinking stages are flat steps in the curve; events after the last sinking stage follow final depth and only move the finish. The last sinking stage runs to the app's final depth (VS8 548.1m vs Rev-B 548m). Because the curve already holds the events, `revbMilestones` gets the plan and doesn't add event days on top. "Achieved to date" = metres sunk ÷ metres the Rev-B rates would have sunk over the same days, across sinking stages worked.
- Scenario statistics mirror the workbook's "Sched Summary" sheet (QUARTILE.INC percentiles, STDEV.P, mean of monthly rates) but are computed from `progression.js`. Differences, on purpose: the first month uses actual days since main sink start (the sheet divides by the calendar month), and rolling 180/90-day rates use depth change (the sheet averages the lagging "Act. Advance m/day" column). P25/P75 are percentiles of monthly *rate*: P75 is the faster one.
- The S-curve and header compare against Rev-B (`revbGap` in App: Rev-B depth at the as-of date vs the current, possibly what-if, depth). The Rev-B tab's own status uses the workbook's daily actuals. The geology-rate "plan" survives only as the faint Gantt bars, labelled as such.
- The Schedule table and Gantt use `modeProjection` in App, so they follow the active rate mode. When Timeline quarters end before final depth, `computeTimelineFormations` gives the formation in progress a `horizonDate`/`horizonDepth` (open-ended Gantt bar); later formations have no dates ("not reached by the last quarter").
- Timeline quarters start at the quarter containing `today`; "+ Add quarter" extends a shaft's list.
- Readability: no text below 10px (body 11–12px); muted text #555/#666; red *text* uses `RED_TEXT` #C4002B (brand #E60033 stays for fills, lines and the header). Keep new UI within WCAG AA contrast.
- Print: the header's Print / PDF button adds `html.printing` (A4-landscape width) so charts resize, then calls `window.print()`. CSS hooks in `App.css`: `.no-print` (side panels, tab bar, shaft toggle), `.print-only` (print heading), `.print-chart` (fixed chart height), `.app-root`, `.tab-pane`. New UI that shouldn't print needs `no-print`.
- Accessibility: anything clickable is a `<button>` (not a clickable `td`/`div`); every input has a label or `aria-label`; toggles use `aria-pressed`; views are `role="tab"`/`tabpanel`. Keyboard focus shows a gold ring (`:focus-visible` in `App.css`) — don't override `outline` inline on focusable elements.
- VS8's app final depth is 548.1m; the Rev-B daily sheet runs to 561m and is plotted as supplied.
- The `LOWER` rate group covers Bulli Seam and everything below in VS7. VS8 terminates within Coalcliff SS so its `LOWER` slider is auto-hidden by `RatesPanel`.

## What NOT to do

- Don't add per-component data stores. Data is hand-edited or imported; centralising it in `src/data/` is intentional.
- Don't move projection logic into components. Keep `engine/projection.js` pure.
- Don't reorder `formations` arrays — `from`/`to` must be contiguous and ascending.
