import { LOWER_CODES } from "../data/rates.js";

export const MS_DAY = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const addDays = (d, n) => new Date(d.getTime() + Math.round(n) * MS_DAY);
export const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / MS_DAY);
export const fmtDate = d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const fmtShort = d => `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
export const eom = (y, m) => new Date(y, m + 1, 0);

export const getRateKey = c => (LOWER_CODES.has(c) ? "LOWER" : c);

export const typeColor = t =>
  t === "claystone" ? "#c05000"
  : t === "sandstone" ? "#2a7a2a"
  : t === "transitional" ? "#6668a8"
  : "#163D4C";

export function getFormationAt(shaft, depth) {
  for (const fm of shaft.formations) {
    if (depth >= fm.from && depth < fm.to) return fm;
  }
  return shaft.formations[shaft.formations.length - 1];
}

export function computeProjection(shaft, rates, curDepth, today) {
  const results = [];
  let runDate = new Date(today);
  for (const fm of shaft.formations) {
    const thick = fm.to - fm.from;
    if (fm.to <= curDepth) {
      results.push({ ...fm, thickness: thick, remaining: 0, days: 0, rate: 0, entryDate: null, exitDate: null, status: "complete" });
      continue;
    }
    const rem = fm.from < curDepth ? fm.to - curDepth : thick;
    const rate = rates[getRateKey(fm.code)] || 0.5;
    const days = rem / rate;
    const isActive = fm.from < curDepth;
    const entry = isActive && fm.aStart ? fm.aStart : new Date(runDate);
    const exit = addDays(runDate, days);
    results.push({
      ...fm,
      thickness: thick,
      remaining: Math.round(rem * 10) / 10,
      days: Math.round(days * 10) / 10,
      rate,
      entryDate: entry,
      exitDate: exit,
      status: isActive ? "active" : "pending",
    });
    runDate = exit;
  }
  return { formations: results, totalDays: Math.round(daysBetween(today, runDate)), completionDate: runDate };
}

export function computeTimelineProjection(shaft, quarters, curDepth, today) {
  let depth = curDepth;
  let date = new Date(today);
  const points = [{ date: date.getTime(), depth }];
  for (const q of quarters) {
    if (depth >= shaft.finalDepth) break;
    const effectiveStart = date > q.start ? date : q.start;
    if (effectiveStart >= q.end) continue;
    const daysInQ = daysBetween(effectiveStart, q.end);
    const advance = Math.min(q.rate * daysInQ, shaft.finalDepth - depth);
    depth += advance;
    date = advance < q.rate * daysInQ ? addDays(effectiveStart, advance / q.rate) : q.end;
    points.push({ date: date.getTime(), depth });
    if (depth >= shaft.finalDepth) break;
  }
  return points;
}

export function buildPlannedCurve(shaft, rates) {
  const pts = [{ date: shaft.mainSinkStart.getTime(), depth: shaft.preSink }];
  let cum = 0;
  for (const fm of shaft.formations) {
    if (fm.to <= shaft.preSink) continue;
    const s = Math.max(fm.from, shaft.preSink);
    const sink = fm.to - s;
    if (sink <= 0) continue;
    cum += sink / (rates[getRateKey(fm.code)] || 0.5);
    pts.push({ date: addDays(shaft.mainSinkStart, cum).getTime(), depth: fm.to });
  }
  return pts;
}

export function buildProjectedCurve(shaft, rates, curDepth, today) {
  const pts = [{ date: today.getTime(), depth: curDepth }];
  let rd = new Date(today);
  for (const fm of shaft.formations) {
    if (fm.to <= curDepth) continue;
    const rem = fm.from < curDepth ? fm.to - curDepth : fm.to - fm.from;
    rd = addDays(rd, rem / (rates[getRateKey(fm.code)] || 0.5));
    pts.push({ date: rd.getTime(), depth: fm.to });
  }
  return pts;
}

export function buildPlannedTimeline(shaft, rates) {
  const bars = [];
  let rd = new Date(shaft.mainSinkStart);
  for (const fm of shaft.formations) {
    if (fm.to <= shaft.preSink) continue;
    const sink = fm.to - Math.max(fm.from, shaft.preSink);
    if (sink <= 0) continue;
    const days = sink / (rates[getRateKey(fm.code)] || 0.5);
    bars.push({ ...fm, thickness: fm.to - fm.from, entryDate: new Date(rd), exitDate: addDays(rd, days), days: Math.round(days) });
    rd = addDays(rd, days);
  }
  return bars;
}

export function generateQuarters(startDate, count) {
  const qs = [];
  const y = startDate.getFullYear();
  const m = Math.floor(startDate.getMonth() / 3) * 3;
  for (let i = 0; i < count; i++) {
    const qm = m + i * 3;
    const qy = y + Math.floor(qm / 12);
    const qmn = qm % 12;
    qs.push({
      label: `Q${Math.floor(qmn / 3) + 1} ${qy}`,
      start: new Date(qy, qmn, 1),
      end: new Date(qy, qmn + 3, 0),
      rate: 0.65,
    });
  }
  return qs;
}
