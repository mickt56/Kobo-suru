import { addDays, daysBetween, dateAtDepth } from "./projection.js";

// "YYYY-MM-DD" -> local midnight Date, matching the app's date convention.
export const parseISODate = s => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Daily Rev-B series as [{date: ms, revb, actual}] (actual null after the last reading).
export function revbDaily(revb) {
  return revb.daily.map(([d, sch, act]) => ({ date: parseISODate(d).getTime(), revb: sch, actual: act }));
}

// Position against Rev-B on the last day with an actual reading.
export function revbStatus(revb, daily) {
  const asOf = parseISODate(revb.asOf);
  const row = daily.find(d => d.date === asOf.getTime());
  const reached = daily.find(d => d.revb >= row.actual - 1e-9);
  const sinks = revb.milestones.filter(m => m.metres);
  return {
    asOf,
    actual: row.actual,
    revbDepth: row.revb,
    variance: row.actual - row.revb,
    // When Rev-B planned to be at today's actual depth, and how long ago that was.
    reachedDate: reached ? new Date(reached.date) : null,
    daysBehind: reached ? daysBetween(new Date(reached.date), asOf) : null,
    sinkComplete: parseISODate(sinks.at(-1).revB),
    finish: parseISODate(revb.milestones.at(-1).revB),
  };
}

// Milestone table rows. Sinking stages take their actual date from the daily actuals (first day
// at or below the stage's end depth); events use the date recorded in the Rev-B Tables sheet.
// Open milestones get a forecast: sinking stages from the projected depth curve, events chained
// on from the previous milestone by their Rev-B duration (which also delays later sinking stages,
// since the projection itself has no stoppages). Slip = (actual or forecast) - Rev-B, in days.
export function revbMilestones(revb, daily, projPoints, actualDepth, asOf) {
  const reachDate = depth => {
    const d = daily.find(r => r.actual != null && r.actual >= depth - 1e-9);
    return d ? new Date(d.date) : null;
  };
  const rows = revb.milestones.map(m => {
    const sink = !!m.metres;
    const recorded = m.actual ? parseISODate(m.actual) : null;
    return { ...m, sink, revBDate: parseISODate(m.revB), actualDate: sink ? reachDate(m.to) ?? recorded : recorded, forecastDate: null };
  });
  const lastDoneSink = rows.findLastIndex(r => r.sink && r.actualDate);
  let prev = null;
  let eventDays = 0;
  rows.forEach((r, i) => {
    if (r.actualDate) {
      r.status = "done";
      prev = r.actualDate;
    } else if (!r.sink && i < lastDoneSink) {
      r.status = "unrecorded"; // passed, but no date in the workbook
    } else if (r.sink) {
      const t = dateAtDepth(projPoints, r.to);
      r.forecastDate = t == null ? null : addDays(new Date(t), eventDays);
      r.status = actualDepth > r.from ? "active" : "upcoming";
      prev = r.forecastDate;
    } else {
      const start = prev && new Date(Math.max(prev.getTime(), asOf.getTime()));
      r.forecastDate = start && r.days != null ? addDays(start, r.days) : null;
      r.status = "upcoming";
      eventDays += r.days ?? 0;
      prev = r.forecastDate;
    }
    const d = r.actualDate ?? r.forecastDate;
    r.slip = d ? daysBetween(r.revBDate, d) : null;
    r.overdue = !r.actualDate && r.status !== "unrecorded" && r.revBDate < asOf;
  });
  return rows;
}

// Monthly summary: Rev-B vs actual advance and cumulative depth per calendar month. The month
// containing the as-of date is reported to that date (mtd), for both Rev-B and actual.
export function revbMonthly(daily, asOf) {
  const valueAt = (t, key) => {
    let v = null;
    for (const d of daily) {
      if (d.date > t) break;
      if (d[key] != null) v = d[key];
    }
    return v;
  };
  const first = new Date(daily[0].date);
  const last = new Date(daily.at(-1).date);
  const rows = [];
  let prevRevb = daily[0].revb;
  let prevAct = daily[0].actual;
  for (let ms = new Date(first.getFullYear(), first.getMonth(), 1); ms <= last; ms = new Date(ms.getFullYear(), ms.getMonth() + 1, 1)) {
    const monthEnd = new Date(ms.getFullYear(), ms.getMonth() + 1, 0);
    const end = monthEnd < last ? monthEnd : last;
    const mtd = asOf >= ms && asOf < monthEnd;
    const revbCum = valueAt((mtd ? asOf : end).getTime(), "revb");
    const row = { month: ms, mtd, revbAdv: revbCum - prevRevb, revbCum, actAdv: null, actCum: null, delta: null };
    prevRevb = valueAt(end.getTime(), "revb");
    if (ms <= asOf) {
      row.actCum = valueAt(Math.min(end.getTime(), asOf.getTime()), "actual");
      row.actAdv = row.actCum - prevAct;
      row.delta = row.actCum - row.revbCum;
      prevAct = row.actCum;
    }
    rows.push(row);
  }
  return rows;
}
