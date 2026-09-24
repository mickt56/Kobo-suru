import { addDays, daysBetween } from "./projection.js";

// Look-back windows and statistics, matching the "Sched Summary" sheet of the Rev-B workbook.
export const WINDOWS = [
  { id: "project", label: "Whole project", short: "Project" },
  { id: "m6", label: "Last 6 months", short: "6-month", n: 6 },
  { id: "m3", label: "Last 3 months", short: "3-month", n: 3 },
];
// Ordered slowest to fastest. P25/P75 are percentiles of the monthly *rate*, so P75 is the faster one.
export const STATS = [
  { id: "worst", label: "Worst" },
  { id: "p25", label: "P25", hint: "slower" },
  { id: "median", label: "Median" },
  { id: "mean", label: "Mean" },
  { id: "p75", label: "P75", hint: "faster" },
  { id: "best", label: "Best" },
];

const isMonthEnd = d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate();

// Complete months from the progression rows (a trailing month-to-date row is left out). Each
// month's rate uses the actual days since the previous reading, so a first period that started
// mid-month is not overstated.
export function monthlyHistory(actual) {
  const months = [];
  for (let i = 1; i < actual.length; i++) {
    const cur = actual[i], prev = actual[i - 1];
    if (!isMonthEnd(cur.date)) continue;
    const days = daysBetween(prev.date, cur.date);
    const sink = cur.depth - prev.depth;
    months.push({ month: new Date(cur.date.getFullYear(), cur.date.getMonth(), 1), end: cur.date, sink, days, rate: sink / days });
  }
  return months;
}

// Excel PERCENTILE.INC / QUARTILE.INC.
function percentile(sorted, p) {
  const i = p * (sorted.length - 1), lo = Math.floor(i);
  return lo + 1 < sorted.length ? sorted[lo] + (i - lo) * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
}

export function rateStats(rates) {
  const s = [...rates].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return {
    n: s.length,
    worst: s[0],
    p25: percentile(s, 0.25),
    median: percentile(s, 0.5),
    mean,
    p75: percentile(s, 0.75),
    best: s[s.length - 1],
    sd: Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length), // population, as STDEV.P
  };
}

// Rate statistics per window, from the progression rows.
export function scenarioStats(actual) {
  const months = monthlyHistory(actual);
  const windows = {};
  for (const w of WINDOWS) {
    const inWindow = w.n ? months.slice(-w.n) : months;
    windows[w.id] = { ...rateStats(inWindow.map(m => m.rate)), from: inWindow[0].month, to: inWindow.at(-1).month };
  }
  return { months, windows };
}

// Average rate over the last `days` days, from depth change in the daily actuals ([{date, actual}]).
export function rollingRate(daily, days) {
  const act = daily.filter(d => d.actual != null);
  const last = act.at(-1);
  const start = act.find(d => d.date >= last.date - days * 86400000);
  return (last.actual - start.actual) / daysBetween(new Date(start.date), new Date(last.date));
}

// Straight-line depth curve at a constant rate from today to final depth.
export function constantRatePoints(curDepth, today, rate, finalDepth) {
  const end = addDays(today, Math.max(0, finalDepth - curDepth) / rate);
  return [{ date: today.getTime(), depth: curDepth }, { date: end.getTime(), depth: finalDepth }];
}
