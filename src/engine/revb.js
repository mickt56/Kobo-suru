import { addDays, daysBetween, dateAtDepth, MS_DAY } from "./projection.js";

// "YYYY-MM-DD" -> local midnight Date, matching the app's date convention.
export const parseISODate = s => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Daily Rev-B series as [{date: ms, revb, actual}] (actual null after the last reading).
export function revbDaily(revb) {
  return revb.daily.map(([d, sch, act]) => ({ date: parseISODate(d).getTime(), revb: sch, actual: act }));
}

// Position against Rev-B on the last day with an actual reading (which may be a hand-entered
// reading newer than the workbook; see engine/actuals.js).
export function revbStatus(revb, daily) {
  const row = daily.filter(d => d.actual != null).at(-1);
  const asOf = new Date(row.date);
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
//
// Sinking stages also get a rate reconciliation: actual days from reaching the stage's start depth
// to reaching its end depth (or to the as-of date while in progress), and the actual rate as depth
// change over those days, against the Rev-B rate.
//
// With `plan` (from revbPlan, in the Rev-B stages rate mode) the projection already holds the
// events between sinking stages, so no event days are added to sinking stages, and planned events
// take their (possibly adjusted) end dates from the plan.
function stageActuals(m, readings) {
  const reach = depth => readings.find(r => r.actual >= depth - 1e-9) ?? null;
  const start = reach(m.from), end = reach(m.to);
  const out = { actualDate: end ? new Date(end.date) : null };
  if (start) {
    const stop = end ?? readings.at(-1);
    const days = daysBetween(new Date(start.date), new Date(stop.date));
    if (days > 0) {
      out.actualDays = days;
      out.actualRate = (stop.actual - start.actual) / days;
      out.achieved = m.rate ? out.actualRate / m.rate : null;
      out.rateToDate = !end; // still sinking this stage
    }
  }
  return out;
}

export function revbMilestones(revb, daily, projPoints, actualDepth, asOf, plan = null) {
  const readings = daily.filter(r => r.actual != null);
  const planEnd = new Map((plan?.stages ?? []).map(s => [s.index, s.end]));
  const rows = revb.milestones.map(m => {
    const sink = !!m.metres;
    const recorded = m.actual ? parseISODate(m.actual) : null;
    const a = sink ? stageActuals(m, readings) : {};
    return { ...m, sink, revBDate: parseISODate(m.revB), ...a, actualDate: sink ? a.actualDate ?? recorded : recorded, forecastDate: null };
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
      r.forecastDate = t == null ? null : addDays(new Date(t), plan ? 0 : eventDays);
      r.status = actualDepth > r.from ? "active" : "upcoming";
      prev = r.forecastDate;
    } else {
      const start = prev && new Date(Math.max(prev.getTime(), asOf.getTime()));
      r.forecastDate = planEnd.has(i) ? new Date(planEnd.get(i))
        : start && r.days != null ? addDays(start, r.days) : null;
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

// Rev-B stages rate mode: the milestones still ahead of `curDepth`, with the viewer's adjusted
// sinking rates and event durations (`adjust`: {[milestone name]: {rate} | {days}}), and the
// calendar depth curve they give from `today`. Events between sinking stages hold the depth for
// their duration; events after the last sinking stage (breakthrough, punch list, ...) follow final
// depth, so they only move the finish date. The last sinking stage runs on to the app's final
// depth where that differs from Rev-B's (VS8: 548 vs 548.1m). Each stage gets its `end` (ms).
export function revbPlan(revb, adjust, curDepth, today, finalDepth) {
  const lastSink = revb.milestones.findLastIndex(m => m.metres);
  const stages = [];
  revb.milestones.forEach((m, index) => {
    const sink = !!m.metres;
    const post = index > lastSink;
    if (sink ? m.to <= curDepth : m.actual || (!post && m.from < curDepth)) return;
    const a = adjust?.[m.name] ?? {};
    stages.push({
      index, name: m.name, sink, post, from: m.from, to: sink ? Math.min(m.to, finalDepth) : m.from,
      revRate: m.rate, revDays: m.days ?? 0, revBDate: parseISODate(m.revB),
      rate: sink ? a.rate ?? m.rate : null,
      days: sink ? null : a.days ?? m.days ?? 0,
    });
  });
  const lastPlanSink = stages.findLast(s => s.sink);
  if (lastPlanSink) lastPlanSink.to = finalDepth;
  let t = today.getTime(), depth = curDepth;
  const points = [{ date: t, depth }];
  for (const s of stages) {
    if (s.sink) {
      if (depth < s.to) {
        t += (s.to - depth) / s.rate * MS_DAY;
        depth = s.to;
        points.push({ date: t, depth });
      }
    } else if (s.days > 0) {
      t += s.days * MS_DAY;
      if (!s.post) points.push({ date: t, depth });
    }
    s.end = t;
  }
  return { stages, points };
}

// Share of Rev-B rate achieved so far: metres sunk over the sinking stages worked, against what
// the Rev-B rates would have sunk in the same days.
export function achievedToDate(revb, daily) {
  const readings = daily.filter(r => r.actual != null);
  let got = 0, plan = 0;
  for (const m of revb.milestones) {
    const a = m.metres ? stageActuals(m, readings) : null;
    if (a?.actualDays) {
      got += a.actualRate * a.actualDays;
      plan += m.rate * a.actualDays;
    }
  }
  return plan ? got / plan : null;
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
