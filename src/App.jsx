import { useState, useMemo, useCallback } from "react";
import { VS7, VS8 } from "./data/shafts.js";
import { VS7_ACTUAL, VS8_ACTUAL } from "./data/progression.js";
import { RATE_GROUPS } from "./data/rates.js";
import {
  computeProjection, computeTimelineProjection,
  buildPlannedCurve, buildProjectedCurve, buildPlannedTimeline,
  generateQuarters, daysBetween, MS_DAY,
} from "./engine/projection.js";

import PatternDefs from "./components/PatternDefs.jsx";
import KPIBar from "./components/KPIBar.jsx";
import LithologyColumn from "./components/LithologyColumn.jsx";
import RatesPanel from "./components/RatesPanel.jsx";
import ScheduleTable from "./components/ScheduleTable.jsx";
import SCurve from "./components/SCurve.jsx";
import GanttTimeline from "./components/GanttTimeline.jsx";

const SHAFTS = {
  VS7: { ...VS7, actual: VS7_ACTUAL },
  VS8: { ...VS8, actual: VS8_ACTUAL },
};

export default function App() {
  const [activeShaft, setActiveShaft] = useState("VS7");
  const [rates, setRates] = useState(() => {
    const r = {};
    RATE_GROUPS.forEach(g => { r[g.id] = g.default; });
    return r;
  });
  const [rateMode, setRateMode] = useState("geology");
  const [rightTab, setRightTab] = useState("schedule");
  const [hoveredFm, setHoveredFm] = useState(null);
  const [depthOverrides, setDepthOverrides] = useState({ VS7: null, VS8: null });

  const today = useMemo(() => new Date(2026, 4, 19), []);
  const shaft = SHAFTS[activeShaft];
  const otherKey = activeShaft === "VS7" ? "VS8" : "VS7";
  const defaultDepth = shaft.actual[shaft.actual.length - 1].depth;
  const curDepth = depthOverrides[activeShaft] ?? defaultDepth;

  const handleDepthChange = useCallback((val) => {
    const v = parseFloat(val);
    if (!isNaN(v) && v >= 0 && v <= SHAFTS[activeShaft].finalDepth) {
      setDepthOverrides(p => ({ ...p, [activeShaft]: v }));
    }
  }, [activeShaft]);

  const [timelineRates, setTimelineRates] = useState(() => {
    const qs = generateQuarters(new Date(2026, 3, 1), 8);
    return {
      VS7: qs.map(q => ({ ...q, rate: 0.60 })),
      VS8: qs.map(q => ({ ...q, rate: 0.75 })),
    };
  });

  const projection = useMemo(
    () => computeProjection(shaft, rates, curDepth, today),
    [shaft, rates, curDepth, today],
  );
  const otherProj = useMemo(
    () => computeProjection(
      SHAFTS[otherKey], rates,
      SHAFTS[otherKey].actual[SHAFTS[otherKey].actual.length - 1].depth,
      today,
    ),
    [otherKey, rates, today],
  );

  const totalRemaining = shaft.finalDepth - curDepth;
  const pctComplete = ((curDepth / shaft.finalDepth) * 100).toFixed(1);

  const timelinePts = useMemo(
    () => rateMode === "timeline"
      ? computeTimelineProjection(shaft, timelineRates[activeShaft], curDepth, today)
      : null,
    [rateMode, shaft, timelineRates, activeShaft, curDepth, today],
  );

  const projDays = rateMode === "geology"
    ? projection.totalDays
    : (() => {
        if (!timelinePts) return "—";
        const l = timelinePts[timelinePts.length - 1];
        return l.depth >= shaft.finalDepth
          ? Math.round((l.date - today.getTime()) / MS_DAY)
          : "Extend qtrs";
      })();

  const projEnd = rateMode === "geology"
    ? projection.completionDate
    : (() => {
        if (!timelinePts) return null;
        const l = timelinePts[timelinePts.length - 1];
        return l.depth >= shaft.finalDepth ? new Date(l.date) : null;
      })();

  const weightedRate = typeof projDays === "number" && projDays > 0 ? totalRemaining / projDays : 0;

  const ptdDays = daysBetween(shaft.mainSinkStart, today);
  const ptdRate = ((curDepth - shaft.preSink) / ptdDays).toFixed(3);

  const scurveData = useMemo(() => {
    const actualPts = shaft.actual.map(a => ({ date: a.date.getTime(), depth: a.depth }));
    const planned = buildPlannedCurve(shaft, rates);
    const projPts = rateMode === "geology"
      ? buildProjectedCurve(shaft, rates, curDepth, today)
      : computeTimelineProjection(shaft, timelineRates[activeShaft], curDepth, today);

    const all = new Set();
    [actualPts, planned, projPts].forEach(a => a.forEach(p => all.add(p.date)));
    const sorted = [...all].sort((a, b) => a - b);

    const interp = (arr, t) => {
      if (t < arr[0].date || t > arr[arr.length - 1].date) return null;
      for (let i = 0; i < arr.length - 1; i++) {
        if (t >= arr[i].date && t <= arr[i + 1].date) {
          const f = (t - arr[i].date) / (arr[i + 1].date - arr[i].date);
          return arr[i].depth + f * (arr[i + 1].depth - arr[i].depth);
        }
      }
      return arr[arr.length - 1].depth;
    };

    return sorted.map(t => ({
      time: t,
      planned: interp(planned, t),
      actual: interp(actualPts, t),
      projected: interp(projPts, t),
    }));
  }, [shaft, rates, curDepth, today, rateMode, timelineRates, activeShaft]);

  const ganttPlanned = useMemo(() => buildPlannedTimeline(shaft, rates), [shaft, rates]);

  const handleRate = useCallback((id, val) => {
    const v = parseFloat(val);
    if (!isNaN(v) && v >= 0.05 && v <= 2.0) setRates(p => ({ ...p, [id]: v }));
  }, []);

  const handleTimelineRate = useCallback((sk, idx, val) => {
    const v = parseFloat(val);
    if (!isNaN(v) && v >= 0.05 && v <= 2.0) {
      setTimelineRates(p => ({ ...p, [sk]: p[sk].map((q, i) => i === idx ? { ...q, rate: v } : q) }));
    }
  }, []);

  const plannedAtToday = useMemo(() => {
    const c = buildPlannedCurve(shaft, rates);
    const t = today.getTime();
    for (let i = 0; i < c.length - 1; i++) {
      if (t >= c[i].date && t <= c[i + 1].date) {
        const f = (t - c[i].date) / (c[i + 1].date - c[i].date);
        return c[i].depth + f * (c[i + 1].depth - c[i].depth);
      }
    }
    return c[c.length - 1].depth;
  }, [shaft, rates, today]);

  const variance = curDepth - plannedAtToday;

  return (
    <div style={{ fontFamily: "Arial,sans-serif", background: "#f3f3f3", minHeight: "100vh" }}>
      <PatternDefs />

      <KPIBar
        activeShaft={activeShaft}
        setActiveShaft={setActiveShaft}
        shaft={shaft}
        curDepth={curDepth}
        totalRemaining={totalRemaining}
        pctComplete={pctComplete}
        weightedRate={weightedRate}
        projDays={projDays}
        projEnd={projEnd}
      />

      <div style={{ display: "flex" }}>
        <LithologyColumn
          shaft={shaft}
          activeShaft={activeShaft}
          curDepth={curDepth}
          depthOverrides={depthOverrides}
          setDepthOverrides={setDepthOverrides}
          handleDepthChange={handleDepthChange}
          hoveredFm={hoveredFm}
          setHoveredFm={setHoveredFm}
        />

        <RatesPanel
          shaft={shaft}
          activeShaft={activeShaft}
          otherKey={otherKey}
          today={today}
          curDepth={curDepth}
          rateMode={rateMode}
          setRateMode={setRateMode}
          rates={rates}
          setRates={setRates}
          handleRate={handleRate}
          timelineRates={timelineRates}
          handleTimelineRate={handleTimelineRate}
          setHoveredFm={setHoveredFm}
          otherProj={otherProj}
          SHAFTS={SHAFTS}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #163D4C", background: "#fff" }}>
            {[{ id: "schedule", l: "Schedule" }, { id: "scurve", l: "S-Curve" }, { id: "gantt", l: "Gantt" }].map(t => (
              <button
                key={t.id}
                onClick={() => setRightTab(t.id)}
                style={{
                  padding: "6px 14px", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
                  background: rightTab === t.id ? "#163D4C" : "transparent",
                  color: rightTab === t.id ? "#fff" : "#163D4C",
                  borderRadius: "4px 4px 0 0", textTransform: "uppercase", letterSpacing: 0.3,
                }}
              >{t.l}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "10px 12px", background: "#fff" }}>
            {rightTab === "schedule" && (
              <ScheduleTable
                shaft={shaft}
                projection={projection}
                today={today}
                projEnd={projEnd}
                projDays={projDays}
                totalRemaining={totalRemaining}
                weightedRate={weightedRate}
                setHoveredFm={setHoveredFm}
              />
            )}
            {rightTab === "scurve" && (
              <SCurve
                shaft={shaft}
                scurveData={scurveData}
                rateMode={rateMode}
                today={today}
                curDepth={curDepth}
                variance={variance}
                plannedAtToday={plannedAtToday}
                ptdDays={ptdDays}
                ptdRate={ptdRate}
              />
            )}
            {rightTab === "gantt" && (
              <GanttTimeline
                shaft={shaft}
                ganttPlanned={ganttPlanned}
                projection={projection}
                today={today}
                projEnd={projEnd}
                projDays={projDays}
                ptdDays={ptdDays}
                setHoveredFm={setHoveredFm}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
