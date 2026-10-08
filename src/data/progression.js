// Hand-entered actual depths. Month-end depths and the latest reading normally come from the Rev-B
// workbook's daily actuals (src/data/revb.js, via `npm run import:revb`); src/engine/actuals.js
// merges the two. Only two kinds of row belong here:
//   1. History before the workbook's first actual reading (VS7 22 May 2025, VS8 19 May 2025).
//   2. A reading newer than the workbook's last actual, e.g. figures received before the next
//      workbook. Once an imported workbook covers that date, its value is used and the row can go.
const eom = (y, m) => new Date(y, m + 1, 0);

export const VS7_ACTUAL = [
  { date: new Date(2025, 2, 26), depth: 50.1 }, // main sink start
  { date: eom(2025, 3),  depth: 57.8 },
  // May 2025 onwards: from the Rev-B workbook
  { date: new Date(2026, 8, 28), depth: 323.8 }, // Sep 2026 MTD, ahead of the workbook (24 Sep)
  { date: new Date(2026, 9, 7), depth: 329.9 },  // Sink Status plot 7 Oct 2026
];

export const VS8_ACTUAL = [
  { date: new Date(2024, 9, 23), depth: 46.8 }, // main sink start
  { date: eom(2024, 11), depth: 63.8 },
  { date: eom(2025, 0),  depth: 71.6 },
  { date: eom(2025, 1),  depth: 84.8 },
  { date: eom(2025, 2),  depth: 99.4 },
  { date: eom(2025, 3),  depth: 116.6 },
  // May 2025 onwards: from the Rev-B workbook
  { date: new Date(2026, 8, 28), depth: 473.2 }, // Sep 2026 MTD, ahead of the workbook (24 Sep)
  { date: new Date(2026, 9, 7), depth: 477.3 },  // Sink Status plot 7 Oct 2026
];
