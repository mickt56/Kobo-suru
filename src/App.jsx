import { useState, useMemo, useCallback } from "react";
import { VS7, VS8 } from "./data/shafts.js";
import { VS7_ACTUAL, VS8_ACTUAL } from "./data/progression.js";
import { RATE_GROUPS } from "./data/rates.js";
import { REVB } from "./data/revb.js";
import {
  computeProjection, computeTimelineProjection, computeTimelineFormations,
  buildPlannedCurve, buildProjectedCurve, buildPlannedTimeline,
  generateQuarters, daysBetween, depthAtTime, MS_DAY,
} from "./engine/projection.js";
import { revbDaily, revbStatus, revbMilestones, revbMonthly } from "./engine/revb.js";
import { WINDOWS, STATS, scenarioStats, rollingRate, constantRatePoints } from "./engine/stats.js";

import PatternDefs from "./components/PatternDefs.jsx";
import KPIBar from "./components/KPIBar.jsx";
import LithologyColumn from "./components/LithologyColumn.jsx";
import RatesPanel from "./components/RatesPanel.jsx";
import ScheduleTable from "./components/ScheduleTable.jsx";
import SCurve from "./components/SCurve.jsx";
import GanttTimeline from "./components/GanttTimeline.jsx";
import RevBView from "./components/RevBView.jsx";
import ScenarioView from "./components/ScenarioView.jsx";

const SHAFTS = {
  VS7: { ...VS7, actual: VS7_ACTUAL },
  VS8: { ...VS8, actual: VS8_ACTUAL },
};

// "median", "P25": word labels lower-cased for use mid-sentence, percentile labels kept as-is.
const statLabel = id => {
  const l = STATS.find(s => s.id === id).label;
  return /^P\d/.test(l) ? l : l.toLowerCase();
};

const TABS = [
  { id: "schedule", l: "Schedule" },
  { id: "scurve", l: "S-Curve" },
  { id: "gantt", l: "Gantt" },
  { id: "revb", l: "Rev-B" },
  { id: "scenarios", l: "Scenarios" },
];

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

  // Projections run from the latest reporting date in the progression data.
  const today = useMemo(
    () => new Date(Math.max(...Object.values(SHAFTS).map(s => s.actual[s.actual.length - 1].date.getTime()))),
    [],
  );
  const shaft = SHAFTS[activeShaft];
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

  // Stats mode: a constant rate taken from the shaft's monthly history (window + statistic).
  const [statsChoice, setStatsChoice] = useState({
    VS7: { window: "m3", stat: "median" },
    VS8: { window: "m3", stat: "median" },
  });
  const shaftStats = useMemo(() => scenarioStats(shaft.actual), [shaft]);
  const choice = statsChoice[activeShaft];
  const statsRate = shaftStats.windows[choice.window][choice.stat];
  const applyScenario = useCallback((window, stat) => {
    setStatsChoice(p => ({ ...p, [activeShaft]: { window, stat } }));
    setRateMode("stats");
  }, [activeShaft]);

  const modeLabel = rateMode === "geology" ? "geology rates"
    : rateMode === "timeline" ? "quarterly rates"
    : `${WINDOWS.find(w => w.id === choice.window).short} ${statLabel(choice.stat)}, ${statsRate.toFixed(2)} m/d`;

  const projection = useMemo(
    () => computeProjection(shaft, rates, curDepth, today),
    [shaft, rates, curDepth, today],
  );

  const totalRemaining = shaft.finalDepth - curDepth;
  const pctComplete = ((curDepth / shaft.finalDepth) * 100).toFixed(1);

  // Calendar-driven depth curve for Timeline and Stats modes (null in Geology mode).
  const curvePts = useMemo(
    () => rateMode === "timeline" ? computeTimelineProjection(shaft, timelineRates[activeShaft], curDepth, today)
      : rateMode === "stats" ? constantRatePoints(curDepth, today, statsRate, shaft.finalDepth)
      : null,
    [rateMode, shaft, timelineRates, activeShaft, curDepth, today, statsRate],
  );

  // Projected depth curve for the active rate mode.
  const projPts = useMemo(
    () => curvePts ?? buildProjectedCurve(shaft, rates, curDepth, today),
    [curvePts, shaft, rates, curDepth, today],
  );

  const projDays = rateMode === "geology"
    ? projection.totalDays
    : (() => {
        if (!curvePts) return "—";
        const l = curvePts[curvePts.length - 1];
        return l.depth >= shaft.finalDepth
          ? Math.round((l.date - today.getTime()) / MS_DAY)
          : "Extend qtrs";
      })();

  const projEnd = rateMode === "geology"
    ? projection.completionDate
    : (() => {
        if (!curvePts) return null;
        const l = curvePts[curvePts.length - 1];
        return l.depth >= shaft.finalDepth ? new Date(l.date) : null;
      })();

  const weightedRate = typeof projDays === "number" && projDays > 0 ? totalRemaining / projDays : 0;

  const ptdDays = daysBetween(shaft.mainSinkStart, today);
  const ptdRate = ((curDepth - shaft.preSink) / ptdDays).toFixed(3);

  const scurveData = useMemo(() => {
    const actualPts = shaft.actual.map(a => ({ date: a.date.getTime(), depth: a.depth }));
    const planned = buildPlannedCurve(shaft, rates);
    const all = new Set();
    [actualPts, planned, projPts].forEach(a => a.forEach(p => all.add(p.date)));
    return [...all].sort((a, b) => a - b).map(t => ({
      time: t,
      planned: depthAtTime(planned, t),
      actual: depthAtTime(actualPts, t),
      projected: depthAtTime(projPts, t),
    }));
  }, [shaft, rates, projPts]);

  const ganttPlanned = useMemo(() => buildPlannedTimeline(shaft, rates), [shaft, rates]);
  const ganttProjection = useMemo(
    () => curvePts ? computeTimelineFormations(shaft, curvePts, curDepth) : projection,
    [curvePts, shaft, curDepth, projection],
  );

  // Rev-B baseline comparison. Status uses the workbook's own daily actuals; forecasts use projPts.
  const revb = REVB[activeShaft];
  const revbRows = useMemo(() => revbDaily(revb), [revb]);
  const revbSt = useMemo(() => revbStatus(revb, revbRows), [revb, revbRows]);
  const revbMs = useMemo(
    () => revbMilestones(revb, revbRows, projPts, revbSt.actual, revbSt.asOf),
    [revb, revbRows, projPts, revbSt],
  );
  const revbMonths = useMemo(() => revbMonthly(revbRows, revbSt.asOf), [revbRows, revbSt]);
  const perf = useMemo(() => {
    const act = revbRows.filter(d => d.actual != null);
    return {
      sinceRevb: (revbSt.actual - act[0].actual) / daysBetween(new Date(act[0].date), revbSt.asOf),
      rolling180: rollingRate(revbRows, 180),
      rolling90: rollingRate(revbRows, 90),
    };
  }, [revbRows, revbSt]);
  const revbChartData = useMemo(() => {
    const revbPts = revbRows.map(d => ({ date: d.date, depth: d.revb }));
    const actualPts = revbRows.filter(d => d.actual != null).map(d => ({ date: d.date, depth: d.actual }));
    const all = new Set(revbRows.map(d => d.date));
    projPts.forEach(p => all.add(p.date));
    return [...all].sort((a, b) => a - b).map(t => ({
      time: t,
      revb: depthAtTime(revbPts, t),
      actual: depthAtTime(actualPts, t),
      projected: depthAtTime(projPts, t),
    }));
  }, [revbRows, projPts]);

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
    <div style={{ fontFamily: "Arial,sans-serif", background: "#f3f3f3", height: "100vh", minHeight: 640, display: "flex", flexDirection: "column" }}>
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
        revbStatus={revbSt}
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
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
          stats={shaftStats}
          choice={choice}
          applyScenario={applyScenario}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #163D4C", background: "#fff" }}>
            {TABS.map(t => (
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
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "10px 12px", background: "#fff", display: "flex", flexDirection: "column" }}>
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
                modeLabel={modeLabel}
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
                projection={ganttProjection}
                modeLabel={modeLabel}
                today={today}
                projEnd={projEnd}
                projDays={projDays}
                ptdDays={ptdDays}
                setHoveredFm={setHoveredFm}
              />
            )}
            {rightTab === "revb" && (
              <RevBView
                shaft={shaft}
                modeLabel={modeLabel}
                status={revbSt}
                milestones={revbMs}
                monthly={revbMonths}
                chartData={revbChartData}
              />
            )}
            {rightTab === "scenarios" && (
              <ScenarioView
                shaft={shaft}
                today={today}
                curDepth={curDepth}
                stats={shaftStats}
                perf={perf}
                revbRows={revbRows}
                revbSinkComplete={revbSt.sinkComplete}
                choice={choice}
                statsActive={rateMode === "stats"}
                applyScenario={applyScenario}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
