# AVMA Shaft Schedule Visualiser — Claude Code Handover

## Objective

Deploy the AVMA Shaft Schedule Visualiser as a **standalone local web app** (Vite + React) that runs in the browser from a local folder with no external dependencies beyond npm. The working prototype is in `reference/AVMA_Schedule_Visualiser.jsx` — this is a proven, tested Claude.ai artifact that needs to be scaffolded into a proper project structure with externalised data files for easy monthly updates.

---

## Project Setup

```bash
npm create vite@latest avma-schedule-visualiser -- --template react
cd avma-schedule-visualiser
npm install recharts
npm run dev
```

Target: opens at `localhost:5173`, zero-config, works offline after install.

---

## Architecture

```
avma-schedule-visualiser/
├── public/
│   └── favicon.ico                    # Redpath logo or shaft icon
├── src/
│   ├── data/
│   │   ├── shafts.js                  # Shaft specs, formations, actual dates
│   │   ├── progression.js             # Monthly EOM actual depth data
│   │   └── rates.js                   # Default rate groups & presets
│   ├── components/
│   │   ├── LithologyColumn.jsx        # Vertical litho column with mined overlay
│   │   ├── RatesPanel.jsx             # Geology + Timeline rate controls
│   │   ├── ScheduleTable.jsx          # Formation projection table
│   │   ├── SCurve.jsx                 # Actual vs Planned vs Projected chart
│   │   ├── GanttTimeline.jsx          # Horizontal formation timeline
│   │   └── KPIBar.jsx                 # Header KPI strip
│   ├── engine/
│   │   └── projection.js             # All computation functions (pure, no UI)
│   ├── App.jsx                        # Main layout + state management
│   ├── App.css                        # Global styles
│   └── main.jsx                       # Entry point
├── reference/
│   └── AVMA_Schedule_Visualiser.jsx   # Working prototype (single-file)
├── CLAUDE.md                          # Claude Code project context
└── package.json
```

**Key principle:** Separate data from logic from UI. The `data/` files are what gets updated monthly — everything else stays stable.

---

## Data Files (for externalisation)

### `src/data/shafts.js`

Contains shaft specifications, formation sequences, and actual formation transition dates. This is the reference data that changes infrequently (only when new formations are entered or shaft specs are revised).

```javascript
// VS7 Shaft Specifications
export const VS7 = {
  label: "VS7 — Downcast",
  diameter: "7.5m",
  braceRL: 1101.4,
  finalDepth: 591.0,
  preSink: 50.1,            // Depth at main sink start
  mainSinkStart: new Date(2025, 2, 26),  // 26 Mar 2025
  holdPoint: 533.7,          // 20m hold point depth
  standOff: 545.7,           // B/T stand-off depth (scheduling endpoint)
  roadwayRoof: 553.7,        // UG roadway roof depth
  sumpDepth: 36,             // Sump below coal seam
  formations: [
    { name: "Ashfield Shale",            code: "ASSH", from: 0,   to: 29  },
    { name: "Hawkesbury Sandstone",      code: "HBSS", from: 29,  to: 179, aFin: new Date(2026, 1, 16) },
    { name: "Newport Formation",         code: "NPFM", from: 179, to: 218, aStart: new Date(2026, 1, 16), aFin: new Date(2026, 3, 24) },
    { name: "Garie Formation",           code: "GRFM", from: 218, to: 222, aStart: new Date(2026, 3, 24), aFin: new Date(2026, 3, 27) },
    { name: "Bald Hill Claystone",       code: "BACS", from: 222, to: 244, aStart: new Date(2026, 3, 27) },
    { name: "Bulgo Sandstone",           code: "BGSS", from: 244, to: 470 },
    { name: "Stanwell Park Claystone",   code: "SPCS", from: 470, to: 481 },
    { name: "Scarborough Sandstone",     code: "SBSS", from: 481, to: 496 },
    { name: "Wombarra Claystone",        code: "WBCS", from: 496, to: 523 },
    { name: "Coalcliff Sandstone",       code: "CCSS", from: 523, to: 551 },
    { name: "Bulli Seam",               code: "BUSM", from: 551, to: 554 },
    { name: "Loddon Sandstone",          code: "LDSS", from: 554, to: 565 },
    { name: "Balgownie Coal",            code: "BASM", from: 565, to: 566 },
    { name: "Lawrence Sandstone",        code: "LRSS", from: 566, to: 574 },
    { name: "Cape Horn Seam",            code: "CHSM", from: 574, to: 575 },
    { name: "Unnamed",                   code: "UNNM", from: 575, to: 582 },
    { name: "Unclassified",              code: "UNCL", from: 582, to: 591 },
  ],
};

// VS8 Shaft Specifications
export const VS8 = {
  label: "VS8 — Upcast",
  diameter: "5.55m",
  braceRL: 1102.4,
  finalDepth: 548.1,           // Shaft terminates at coal seam breakthrough
  preSink: 46.8,
  mainSinkStart: new Date(2024, 9, 23),  // 23 Oct 2024
  holdPoint: 528.1,
  standOff: 541.4,
  roadwayRoof: 548.1,
  sumpDepth: 0,                // No sump — upcast shaft
  formations: [
    { name: "Ashfield Shale",            code: "ASSH", from: 0,   to: 30  },
    { name: "Hawkesbury Sandstone",      code: "HBSS", from: 30,  to: 187, aFin: new Date(2025, 7, 28) },
    { name: "Newport Formation",         code: "NPFM", from: 187, to: 217, aStart: new Date(2025, 7, 28), aFin: new Date(2025, 9, 16) },
    { name: "Garie Formation",           code: "GRFM", from: 217, to: 222, aStart: new Date(2025, 9, 16), aFin: new Date(2025, 9, 21) },
    { name: "Bald Hill Claystone",       code: "BACS", from: 222, to: 251, aStart: new Date(2025, 9, 21), aFin: new Date(2025, 10, 30) },
    { name: "Bulgo Sandstone",           code: "BGSS", from: 251, to: 478, aStart: new Date(2025, 10, 30) },
    { name: "Stanwell Park Claystone",   code: "SPCS", from: 478, to: 485 },
    { name: "Scarborough Sandstone",     code: "SBSS", from: 485, to: 499 },
    { name: "Wombarra Claystone",        code: "WBCS", from: 499, to: 531 },
    { name: "Coalcliff Sandstone",       code: "CCSS", from: 531, to: 548.1 },
    // VS8 terminates at 548.1m within Coalcliff Sandstone (coal seam B/T)
    // Formations below (Bulli, Loddon, Balgownie, Lawrence) are geological column only
  ],
};
```

**Update trigger:** When a new formation boundary is crossed (shaft transitions from one lithological unit to the next), add `aStart` and `aFin` dates to the relevant formations. These dates come from the daily shaft log.

### `src/data/progression.js`

Monthly EOM (end-of-month) actual depth readings from the Sink Progression tracker. This is the file that gets updated monthly.

```javascript
// Helper: end of month date
const eom = (y, m) => new Date(y, m + 1, 0);

// VS7 Monthly Actual Progression (EOM depths)
// Source: AVMA Sink Progression tracker, EOM Presentation Helper Tables
// Convention: Each entry = cumulative shaft depth at END of the labeled month
export const VS7_ACTUAL = [
  { date: new Date(2025, 2, 26), depth: 50.1 },   // Main sink start
  { date: eom(2025, 3),  depth: 57.8 },            // End Apr 2025
  { date: eom(2025, 4),  depth: 61.5 },            // End May 2025
  { date: eom(2025, 5),  depth: 66.6 },            // End Jun 2025
  { date: eom(2025, 6),  depth: 81.2 },            // End Jul 2025
  { date: eom(2025, 7),  depth: 87.6 },            // End Aug 2025
  { date: eom(2025, 8),  depth: 102.0 },           // End Sep 2025
  { date: eom(2025, 9),  depth: 115.6 },           // End Oct 2025
  { date: eom(2025, 10), depth: 132.2 },           // End Nov 2025
  { date: eom(2025, 11), depth: 150.0 },           // End Dec 2025
  { date: eom(2026, 0),  depth: 169.1 },           // End Jan 2026
  { date: eom(2026, 1),  depth: 185.1 },           // End Feb 2026
  { date: eom(2026, 2),  depth: 206.4 },           // End Mar 2026
  { date: eom(2026, 3),  depth: 223.4 },           // End Apr 2026
  { date: new Date(2026, 4, 18), depth: 233.0 },   // MTD 18 May 2026
];

// VS8 Monthly Actual Progression (EOM depths)
export const VS8_ACTUAL = [
  { date: new Date(2024, 9, 23), depth: 46.8 },    // Main sink start
  { date: eom(2024, 11), depth: 63.8 },             // End Dec 2024
  { date: eom(2025, 0),  depth: 71.6 },             // End Jan 2025
  { date: eom(2025, 1),  depth: 84.8 },             // End Feb 2025
  { date: eom(2025, 2),  depth: 99.4 },             // End Mar 2025
  { date: eom(2025, 3),  depth: 116.6 },            // End Apr 2025
  { date: eom(2025, 4),  depth: 128.4 },            // End May 2025
  { date: eom(2025, 5),  depth: 144.1 },            // End Jun 2025
  { date: eom(2025, 6),  depth: 165.3 },            // End Jul 2025
  { date: eom(2025, 7),  depth: 178.8 },            // End Aug 2025
  { date: eom(2025, 8),  depth: 205.8 },            // End Sep 2025
  { date: eom(2025, 9),  depth: 227.8 },            // End Oct 2025
  { date: eom(2025, 10), depth: 251.9 },            // End Nov 2025
  { date: eom(2025, 11), depth: 271.6 },            // End Dec 2025
  { date: eom(2026, 0),  depth: 292.6 },            // End Jan 2026
  { date: eom(2026, 1),  depth: 313.3 },            // End Feb 2026
  { date: eom(2026, 2),  depth: 334.4 },            // End Mar 2026
  { date: eom(2026, 3),  depth: 351.4 },            // End Apr 2026
  { date: new Date(2026, 4, 18), depth: 369.1 },    // MTD 18 May 2026
];
```

**Update trigger:** Monthly, after EOM reporting. Add one new entry per shaft with the EOM date and cumulative depth. Update the last MTD entry to the current reporting date and depth.

**CRITICAL DATE CONVENTION:** The source Excel progression tracker uses serial dates representing the 1st of each reporting month, with depths being the cumulative depth at END of that month. In JavaScript, use `eom(year, month)` where month is 0-indexed (Jan=0). The advance rate displayed for each month = `(depth[n] - depth[n-1]) / daysBetween(date[n-1], date[n])`.

---

## Rate Configuration

### `src/data/rates.js`

Default advance rates per geological domain and presets. These rarely change — only when operational experience suggests different defaults.

```javascript
export const RATE_GROUPS = [
  { id: "HBSS", label: "Hawkesbury SS",      default: 0.70, color: "#FCE4B0", type: "sandstone" },
  { id: "NPFM", label: "Newport Fm",         default: 0.55, color: "#AACFE8", type: "transitional" },
  { id: "GRFM", label: "Garie Fm",           default: 0.55, color: "#CBC4E0", type: "transitional" },
  { id: "BACS", label: "Bald Hill CS",        default: 0.45, color: "#E8A87C", type: "claystone" },
  { id: "BGSS", label: "Bulgo SS",           default: 0.80, color: "#FFF2CC", type: "sandstone" },
  { id: "SPCS", label: "Stanwell Park CS",    default: 0.45, color: "#D9C4A0", type: "claystone" },
  { id: "SBSS", label: "Scarborough SS",      default: 0.70, color: "#FCE4B0", type: "sandstone" },
  { id: "WBCS", label: "Wombarra CS",         default: 0.45, color: "#E8A87C", type: "claystone" },
  { id: "CCSS", label: "Coalcliff SS",        default: 0.70, color: "#FCE4B0", type: "sandstone" },
  { id: "LOWER", label: "Lower Fms",          default: 0.50, color: "#B0B0B0", type: "mixed" },
];

// Codes that map to the "LOWER" rate group
export const LOWER_CODES = new Set(["BUSM","LDSS","BASM","LRSS","CHSM","UNNM","UNCL"]);

// Presets: offset applied to all default rates
export const PRESETS = [
  { label: "Conservative", offset: -0.10 },
  { label: "Base Case",    offset:  0.00 },
  { label: "Optimistic",   offset:  0.10 },
];
```

---

## Branding

Redpath Mining corporate identity:

| Token | Hex | Usage |
|-------|-----|-------|
| Redpath Red | `#E60033` | Header, primary actions, current depth marker |
| Navy Blue | `#163D4C` | KPI bar, table headers, planned curves |
| Gold | `#F5B216` | KPI highlights, stand-off marker |
| White | `#FFFFFF` | Backgrounds, text on dark |
| Charcoal | `#6D6D6D` | Body text |
| Sage Green | `#6D8F80` | Safety/environmental (future use) |

Typography: **Arial** throughout. No decorative fonts.

---

## Lithology Colour Palette

```javascript
export const LITHO_COLORS = {
  ASSH: "#B0B0B0",   // Ashfield Shale — grey
  HBSS: "#FCE4B0",   // Hawkesbury Sandstone — warm sand
  NPFM: "#AACFE8",   // Newport Formation — light blue
  GRFM: "#CBC4E0",   // Garie Formation — lavender
  BACS: "#E8A87C",   // Bald Hill Claystone — orange clay
  BGSS: "#FFF2CC",   // Bulgo Sandstone — pale yellow
  SPCS: "#D9C4A0",   // Stanwell Park Claystone — tan
  SBSS: "#FCE4B0",   // Scarborough Sandstone — warm sand
  WBCS: "#E8A87C",   // Wombarra Claystone — orange clay
  CCSS: "#FCE4B0",   // Coalcliff Sandstone — warm sand
  BUSM: "#404040",   // Bulli Seam — dark coal (white text)
  LDSS: "#FCE4B0",   // Loddon Sandstone — warm sand
  BASM: "#404040",   // Balgownie Coal — dark coal (white text)
  LRSS: "#FCE4B0",   // Lawrence Sandstone — warm sand
  CHSM: "#404040",   // Cape Horn Seam — dark coal (white text)
  UNNM: "#D9D9D9",   // Unnamed — light grey
  UNCL: "#E8E8E8",   // Unclassified — very light grey
};
```

---

## Features (all implemented in reference prototype)

### 1. Lithology Column (left panel)
- Proportionally scaled vertical column showing geological formations
- Grey diagonal hatch overlay for mined section with "MINED" label
- Red current depth marker line
- Gold dashed stand-off marker
- Depth scale alongside (left of) the column, not overlaid
- Editable depth input with reset-to-actual button (↺)
- Shaft reference card (hold point, stand-off, roadway roof, final depth)
- Hover highlights linked to schedule table and rate sliders

### 2. Rate Controls (centre panel)
- **Geology mode:** Individual slider + numeric input per geological domain
- **Timeline mode:** Quarterly rate targets (Q2 2026 → Q1 2028) with formation code hints
- Three presets: Conservative (-0.10), Base Case (default), Optimistic (+0.10)
- Rates colour-coded: green=sandstone, amber=claystone, purple=transitional
- Other shaft summary below sliders
- Toggle between modes via button pair at top

### 3. Schedule Table (right panel — tab 1)
- Formation-by-formation projection with entry/exit dates
- Columns: Formation, From, To, Thickness, Remaining, Rate, Days, **Actual Rate**, Entry, Exit, Status
- Completed formations: greyed out, show actual dates and achieved rate (green/amber coded)
- Active formation: yellow highlight, entry date from actual geological transition (not today)
- Pending formations: projected dates from slider rates
- Footer: totals row in Redpath Red
- Actual rate shows achieved m/d with day count in parentheses

### 4. S-Curve (right panel — tab 2)
- Recharts LineChart, depth (reversed Y) vs date (X)
- **Navy solid:** Planned curve (slider rates applied from main sink start)
- **Red solid with dots:** Actual (real EOM monthly data from progression tables)
- **Red dashed:** Projected (from today forward, using active rate mode — geology or timeline)
- "Today" vertical reference line
- Stand-off horizontal reference line (gold)
- Formation boundary faint horizontal lines
- Variance callout: ahead/behind plan in metres with day count
- Monthly actual rates card grid below chart (rate, advance, days, formation code)

### 5. Gantt Timeline (right panel — tab 3)
- One row per formation
- Faint navy bars = planned duration (from slider rates)
- Grey hatch overlay = mined (completed + active partial)
- Colour-coded bars = projected remaining duration with day count labels
- Red "Today" vertical marker
- Quarterly date labels across top
- Summary bar: start date, elapsed days, remaining days, projected end

---

## Projection Engine Logic

### Geology Mode
For each formation from current depth to final depth:
1. Calculate remaining metres in formation: `remaining = fm.to - max(fm.from, currentDepth)`
2. Look up rate from slider: `rate = rates[getRateKey(fm.code)]`
3. Calculate days: `days = remaining / rate`
4. Chain dates: each formation's entry = previous formation's exit

**Active formation entry date:** Use `fm.aStart` if available (actual geological transition date), not today.

### Timeline Mode
Walk forward through quarterly periods from today:
1. For each quarter, calculate advance: `advance = rate × daysInQuarter`
2. Accumulate depth, cap at `shaft.finalDepth`
3. If quarter starts before today, use effective start from today

### S-Curve Construction
- **Planned:** Apply slider rates from `mainSinkStart` through every formation boundary
- **Actual:** Direct from progression data (real monthly EOM readings)
- **Projected:** From today forward using active rate mode
- Merge all three curves into unified time-series with interpolation at each timestamp

### Rate Key Mapping
Formations below Coalcliff Sandstone (Bulli Seam, Loddon SS, Balgownie Coal, Lawrence SS, Cape Horn, Unnamed, Unclassified) all map to the `LOWER` rate group. VS8 has no lower formations in scope (terminates at 548.1m within Coalcliff). The `LOWER` slider is hidden for VS8.

---

## Monthly Update Procedure

When new EOM data arrives:

1. **`src/data/progression.js`** — Add one line per shaft:
   ```javascript
   { date: eom(2026, 4), depth: XXX.X },   // End May 2026
   ```
   Update the last MTD entry date and depth if it's mid-month.

2. **`src/data/shafts.js`** — If a new formation boundary was crossed:
   - Add `aFin: new Date(YYYY, M, D)` to the exited formation
   - Add `aStart: new Date(YYYY, M, D)` to the entered formation

3. **No code changes required** — the UI is fully data-driven.

---

## Technical Notes

- `today` is currently hardcoded to `new Date(2026, 4, 19)`. For production, replace with `new Date()` or make configurable.
- The `eom(y, m)` helper creates end-of-month dates: `new Date(y, m+1, 0)`. Month is 0-indexed.
- `daysBetween()` rounds to nearest integer day — sufficient for schedule-level precision.
- Recharts `<YAxis reversed>` makes depth increase downward on the S-curve.
- SVG pattern definitions (`#mH`, `#mHd`) create the diagonal hatch for mined overlay. These must be in the DOM before any elements reference them.
- The depth override state is per-shaft (`depthOverrides.VS7`, `depthOverrides.VS8`) so you can scenario-test each independently.
- Timeline quarterly rates are also per-shaft, with sensible defaults (VS7: 0.60, VS8: 0.75).

---

## Reference File

The working single-file prototype is at `reference/AVMA_Schedule_Visualiser.jsx`. This is 540 lines of tested, working code that renders as a Claude.ai artifact. It should be decomposed into the component structure above but the logic, data, and UI are all proven.

---

## Future Enhancements (not in scope for initial deployment)

- Auto-import from Excel progression tracker (drag-and-drop or file watch)
- Daily data overlay (currently monthly EOM only)
- Schedule milestone markers (client hold points, planned maintenance windows)
- Export to PDF/PNG for inclusion in weekly schedule releases
- Comparison mode: side-by-side VS7 and VS8 S-curves
- Actual formation duration bars in Gantt (using aStart/aFin data)
