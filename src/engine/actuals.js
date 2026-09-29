// Actual depth readings for a shaft, combining the two sources:
//  - the Rev-B workbook's daily actuals (src/data/revb.js), which are the source of truth wherever
//    they exist: month-end depths plus the latest reading are taken from them;
//  - hand-entered rows in src/data/progression.js, which only fill what the workbook can't:
//    history before its first reading, and any reading newer than its last one (superseded
//    automatically once a newer workbook is imported).
// Rows are { date: Date, depth: number }, sorted by date.

const isMonthEnd = d => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate();

// `daily` is revbDaily(...) output: [{ date: ms, revb, actual }].
export function mergeActuals(handRows, daily) {
  const readings = daily.filter(d => d.actual != null);
  if (!readings.length) return [...handRows].sort((a, b) => a.date - b.date);
  const first = readings[0].date, last = readings.at(-1).date;
  const fromWorkbook = readings
    .filter(d => isMonthEnd(new Date(d.date)) || d.date === last)
    .map(d => ({ date: new Date(d.date), depth: d.actual }));
  const fromHand = handRows.filter(r => r.date.getTime() < first || r.date.getTime() > last);
  return [...fromHand, ...fromWorkbook].sort((a, b) => a.date - b.date);
}

// Adds hand-entered readings newer than the workbook's last actual to the daily series, so the
// Rev-B tab reports against the same latest reading as the rest of the app.
export function extendDaily(daily, actualRows) {
  const lastActual = daily.filter(d => d.actual != null).at(-1)?.date ?? -Infinity;
  const newer = new Map(actualRows.filter(r => r.date.getTime() > lastActual).map(r => [r.date.getTime(), r.depth]));
  if (!newer.size) return daily;
  return daily.map(d => (newer.has(d.date) ? { ...d, actual: newer.get(d.date) } : d));
}
