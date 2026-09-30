import { useState, useMemo, useCallback, useEffect } from "react";
import { VS7, VS8 } from "./data/shafts.js";
import { VS7_ACTUAL, VS8_ACTUAL } from "./data/progression.js";
import { RATE_GROUPS } from "./data/rates.js";
import { REVB } from "./data/revb.js";
import {
  computeProjection, computeTimelineProjection, computeTimelineFormations,
  buildProjectedCurve, buildPlannedTimeline,
  generateQuarters, daysBetween, depthAtTime, dateAtDepth, fmtDate, MS_DAY,
} from "./engine/projection.js";
import { revbDaily, revbStatus, revbMilestones, revbMonthly, revbPlan, achievedToDate } from "./engine/revb.js";
import { mergeActuals, extendDaily } from "./engine/actuals.js";
import { WINDOWS, STATS, scenarioStats, rollingRate, constantRatePoints } from "./engine/stats.js";
import {
  readSettings, writeSettings, clearSettings, pick,
  restoreRates, restoreChoice, restoreTimeline, serializeTimeline, restoreRevbAdjust,
} from "./settings.js";

import PatternDefs from "./components/PatternDefs.jsx";
import KPIBar from "./components/KPIBar.jsx";
import LithologyColumn from "./components/LithologyColumn.jsx";
import RatesPanel from "./components/RatesPanel.jsx";
import ScheduleTable from "./components/ScheduleTable.jsx";
import SCurve from "./components/SCurve.jsx";
import GanttTimeline from "./components/GanttTimeline.jsx";
import RevBView from "./components/RevBView.jsx";
import ScenarioView from "./components/ScenarioView.jsx";
import { scaledRate } from "./components/RevBStages.jsx";

// Actual readings: the Rev-B workbook's month-ends and latest reading, plus hand-entered history
// before it and any reading newer than it (see engine/actuals.js).
const SHAFTS = {
  VS7: { ...VS7, actual: mergeActuals(VS7_ACTUAL, revbDaily(REVB.VS7)) },
  VS8: { ...VS8, actual: mergeActuals(VS8_ACTUAL, revbDaily(REVB.VS8)) },
};

// "median", "P25": word labels lower-cased for use mid-sentence, percentile labels kept as-is.
const statLabel = id => {
  const l = STATS.find(s => s.id === id).label;
  return /^P\d/.test(l) ? l : l.toLowerCase();
};

const TABS = [
  { id: "revb", l: "Rev-B" },
  { id: "schedule", l: "Schedule" },
  { id: "scurve", l: "S-Curve" },
  { id: "gantt", l: "Gantt" },
  { id: "scenarios", l: "Scenarios" },
];

const DEFAULT_RATES = Object.fromEntries(RATE_GROUPS.map(g => [g.id, g.default]));
const DEFAULT_CHOICE = { VS7: { window: "m3", stat: "median" }, VS8: { window: "m3", stat: "median" } };
const DEFAULT_QUARTER_RATE = { VS7: 0.60, VS8: 0.75 };
const RATE_MODES = ["geology", "timeline", "stats", "revb"];
const NO_ADJUST = { VS7: {}, VS8: {} };

// Projections run from the latest reporting date in the progression data.
const TODAY = new Date(Math.max(...Object.values(SHAFTS).map(s => s.actual[s.actual.length - 1].date.getTime())));

export default function App() {
  // Choices are remembered in this browser (see settings.js); what-if depths are not.
  const [saved] = useState(readSettings);
  const [activeShaft, setActiveShaft] = useState(() => pick(saved.shaft, Object.keys(SHAFTS), "VS7"));
  const [rates, setRates] = useState(() => restoreRates(saved.rates, DEFAULT_RATES));
  const [rateMode, setRateMode] = useState(() => pick(saved.mode, RATE_MODES, "geology"));
  const [rightTab, setRightTab] = useState(() => pick(saved.tab, TABS.map(t => t.id), "revb"));
  const [hoveredFm, setHoveredFm] = useState(null);
  const [depthOverrides, setDepthOverrides] = useState({ VS7: null, VS8: null });

  const today = TODAY;
  const shaft = SHAFTS[activeShaft];
  const defaultDepth = shaft.actual[shaft.actual.length - 1].depth;
  const curDepth = depthOverrides[activeShaft] ?? defaultDepth;

  const resetDepth = useCallback(() => setDepthOverrides(p => ({ ...p, [activeShaft]: null })), [activeShaft]);

  const handleDepthChange = useCallback((val) => {
    const v = parseFloat(val);
    if (!isNaN(v) && v >= 0 && v <= SHAFTS[activeShaft].finalDepth) {
      setDepthOverrides(p => ({ ...p, [activeShaft]: v }));
    }
  }, [activeShaft]);

  // Quarterly rates start at the current quarter; more quarters can be added per shaft.
  const [timelineRates, setTimelineRates] = useState(() => restoreTimeline(saved.timeline, TODAY, DEFAULT_QUARTER_RATE));
  const addQuarter = useCallback(sk => setTimelineRates(p => {
    const last = p[sk].at(-1);
    const [next] = generateQuarters(new Date(last.end.getFullYear(), last.end.getMonth() + 1, 1), 1);
    return { ...p, [sk]: [...p[sk], { ...next, rate: last.rate }] };
  }), []);

  // Stats mode: a constant rate taken from the shaft's monthly history (window + statistic).
  const [statsChoice, setStatsChoice] = useState(() =>
    restoreChoice(saved.statsChoice, DEFAULT_CHOICE, WINDOWS.map(w => w.id), STATS.map(s => s.id)));

  // Rev-B stages mode: the viewer's changes to the remaining Rev-B stage rates and event
  // durations, per shaft, keyed by milestone name ({rate} or {days}).
  const [revbAdjust, setRevbAdjust] = useState(() => restoreRevbAdjust(saved.revbAdjust, REVB));

  useEffect(() => {
    writeSettings({
      shaft: activeShaft, tab: rightTab, mode: rateMode, rates, statsChoice,
      timeline: serializeTimeline(timelineRates), revbAdjust,
    });
  }, [activeShaft, rightTab, rateMode, rates, statsChoice, timelineRates, revbAdjust]);

  // Print: lay the page out at A4-landscape width first so the charts resize, then print.
  const printView = useCallback(() => {
    const root = document.documentElement;
    root.classList.add("printing");
    const done = () => { root.classList.remove("printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => window.print(), 200)));
  }, []);
  // Ctrl+P / browser menu: apply the same layout (best effort; charts may not have time to resize).
  useEffect(() => {
    const before = () => document.documentElement.classList.add("printing");
    const after = () => document.documentElement.classList.remove("printing");
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);

  const resetSettings = useCallback(() => {
    clearSettings();
    setActiveShaft("VS7");
    setRightTab("revb");
    setRateMode("geology");
    setRates(DEFAULT_RATES);
    setStatsChoice(DEFAULT_CHOICE);
    setTimelineRates(restoreTimeline(null, TODAY, DEFAULT_QUARTER_RATE));
    setRevbAdjust(NO_ADJUST);
    setDepthOverrides({ VS7: null, VS8: null });
  }, []);
  const shaftStats = useMemo(() => scenarioStats(shaft.actual), [shaft]);
  const choice = statsChoice[activeShaft];
  const statsRate = shaftStats.windows[choice.window][choice.stat];
  const applyScenario = useCallback((window, stat) => {
    setStatsChoice(p => ({ ...p, [activeShaft]: { window, stat } }));
    setRateMode("stats");
  }, [activeShaft]);

  // Rev-B baseline comparison. Status uses the workbook's own daily actuals; forecasts use projPts.
  const revb = REVB[activeShaft];
  // Daily Rev-B series, with any hand-entered reading newer than the workbook added, so the Rev-B
  // tab reports as at the same date as the rest of the app.
  const revbRows = useMemo(() => extendDaily(revbDaily(revb), shaft.actual), [revb, shaft]);

  // The remaining Rev-B stages from the current depth, with the viewer's changes.
  const plan = useMemo(
    () => revbPlan(revb, revbAdjust[activeShaft], curDepth, today, shaft.finalDepth),
    [revb, revbAdjust, activeShaft, curDepth, today, shaft],
  );
  const planAdjusted = plan.stages.some(s => (s.sink ? s.rate !== s.revRate : s.days !== s.revDays));
  const achieved = useMemo(() => achievedToDate(revb, revbRows), [revb, revbRows]);
  const adjustStage = useCallback((name, value) => setRevbAdjust(p => {
    const shaftAdj = { ...p[activeShaft] };
    if (value) shaftAdj[name] = value;
    else delete shaftAdj[name];
    return { ...p, [activeShaft]: shaftAdj };
  }), [activeShaft]);
  const setStageRate = useCallback((name, val) => {
    const v = parseFloat(val);
    const m = revb.milestones.find(x => x.name === name);
    if (!isNaN(v) && v >= 0.05 && v <= 2.0) adjustStage(name, v === m.rate ? null : { rate: v });
  }, [revb, adjustStage]);
  const setEventDays = useCallback((name, val) => {
    const v = Number(val);
    const m = revb.milestones.find(x => x.name === name);
    if (val !== "" && Number.isInteger(v) && v >= 0 && v <= 365) adjustStage(name, v === m.days ? null : { days: v });
  }, [revb, adjustStage]);
  // Sets every remaining sinking stage to a share of its Rev-B rate (1 = Rev-B); events keep theirs.
  const scaleStages = useCallback(factor => setRevbAdjust(p => {
    const shaftAdj = { ...p[activeShaft] };
    plan.stages.filter(s => s.sink).forEach(s => {
      const rate = scaledRate(s.revRate, factor);
      if (rate === s.revRate) delete shaftAdj[s.name];
      else shaftAdj[s.name] = { rate };
    });
    return { ...p, [activeShaft]: shaftAdj };
  }), [activeShaft, plan]);
  const resetStages = useCallback(() => setRevbAdjust(p => ({ ...p, [activeShaft]: {} })), [activeShaft]);

  const modeLabel = rateMode === "geology" ? "geology rates"
    : rateMode === "timeline" ? "quarterly rates"
    : rateMode === "revb" ? (planAdjusted ? "adjusted Rev-B stages" : "Rev-B stage rates")
    : `${WINDOWS.find(w => w.id === choice.window).short} ${statLabel(choice.stat)}, ${statsRate.toFixed(2)} m/d`;

  const projection = useMemo(
    () => computeProjection(shaft, rates, curDepth, today),
    [shaft, rates, curDepth, today],
  );

  const totalRemaining = shaft.finalDepth - curDepth;
  const pctComplete = ((curDepth / shaft.finalDepth) * 100).toFixed(1);

  // Calendar-driven depth curve for Timeline, Stats and Rev-B stages modes (null in Geology mode).
  const curvePts = useMemo(
    () => rateMode === "timeline" ? computeTimelineProjection(shaft, timelineRates[activeShaft], curDepth, today)
      : rateMode === "stats" ? constantRatePoints(curDepth, today, statsRate, shaft.finalDepth)
      : rateMode === "revb" ? plan.points
      : null,
    [rateMode, shaft, timelineRates, activeShaft, curDepth, today, statsRate, plan],
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

  const revbPts = useMemo(() => revbRows.map(d => ({ date: d.date, depth: d.revb })), [revbRows]);
  // Position against Rev-B at the current (possibly what-if) depth, used by the header and S-curve.
  const revbGap = useMemo(() => {
    const revbDepth = depthAtTime(revbPts, today.getTime()) ?? revbPts.at(-1).depth;
    const reached = dateAtDepth(revbPts, curDepth);
    return { revbDepth, variance: curDepth - revbDepth, daysBehind: reached != null ? daysBetween(new Date(reached), today) : null };
  }, [revbPts, curDepth, today]);

  const scurveData = useMemo(() => {
    const actualPts = shaft.actual.map(a => ({ date: a.date.getTime(), depth: a.depth }));
    const readings = new Map(actualPts.map(p => [p.date, p.depth]));
    const all = new Set();
    [actualPts, revbPts, projPts].forEach(a => a.forEach(p => all.add(p.date)));
    return [...all].sort((a, b) => a - b).map(t => ({
      time: t,
      revb: depthAtTime(revbPts, t),
      actual: readings.get(t) ?? null, // only at readings, so the line's dots mark them
      projected: depthAtTime(projPts, t),
    }));
  }, [shaft, revbPts, projPts]);

  const ganttPlanned = useMemo(() => buildPlannedTimeline(shaft, rates), [shaft, rates]);
  // Formation-by-formation projection for the active rate mode (Schedule table and Gantt).
  const modeProjection = useMemo(
    () => curvePts ? computeTimelineFormations(shaft, curvePts, curDepth) : projection,
    [curvePts, shaft, curDepth, projection],
  );

  const revbSt = useMemo(() => revbStatus(revb, revbRows), [revb, revbRows]);
  const revbMs = useMemo(
    () => revbMilestones(revb, revbRows, projPts, revbSt.actual, revbSt.asOf, rateMode === "revb" ? plan : null),
    [revb, revbRows, projPts, revbSt, rateMode, plan],
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
    const actualPts = revbRows.filter(d => d.actual != null).map(d => ({ date: d.date, depth: d.actual }));
    const all = new Set(revbRows.map(d => d.date));
    projPts.forEach(p => all.add(p.date));
    return [...all].sort((a, b) => a - b).map(t => ({
      time: t,
      revb: depthAtTime(revbPts, t),
      actual: depthAtTime(actualPts, t),
      projected: depthAtTime(projPts, t),
    }));
  }, [revbRows, revbPts, projPts]);

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

  return (
    <div className="app-root" style={{ fontFamily: "Arial,sans-serif", background: "#f3f3f3", height: "100vh", minHeight: 640, display: "flex", flexDirection: "column" }}>
      <PatternDefs />

      <KPIBar
        activeShaft={activeShaft}
        setActiveShaft={setActiveShaft}
        shaft={shaft}
        asOf={today}
        curDepth={curDepth}
        actualDepth={defaultDepth}
        overridden={depthOverrides[activeShaft] !== null}
        resetDepth={resetDepth}
        totalRemaining={totalRemaining}
        pctComplete={pctComplete}
        weightedRate={weightedRate}
        projDays={projDays}
        projEnd={projEnd}
        modeLabel={modeLabel}
        revbGap={revbGap}
        onPrint={printView}
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
          addQuarter={addQuarter}
          curveReachesFinal={!curvePts || curvePts.at(-1).depth >= shaft.finalDepth}
          setHoveredFm={setHoveredFm}
          stats={shaftStats}
          choice={choice}
          applyScenario={applyScenario}
          resetSettings={resetSettings}
          revbStages={{ plan, adjusted: planAdjusted, achieved, setStageRate, setEventDays, scaleStages, resetStages }}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div className="no-print" role="tablist" aria-label="Views" style={{ display: "flex", gap: 0, borderBottom: "2px solid #163D4C", background: "#fff" }}>
            {TABS.map(t => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                aria-selected={rightTab === t.id}
                aria-controls="tab-panel"
                onClick={() => setRightTab(t.id)}
                style={{
                  padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: rightTab === t.id ? "#163D4C" : "transparent",
                  color: rightTab === t.id ? "#fff" : "#163D4C",
                  borderRadius: "4px 4px 0 0", textTransform: "uppercase", letterSpacing: 0.3,
                }}
              >{t.l}</button>
            ))}
          </div>
          <div className="tab-pane" id="tab-panel" role="tabpanel" aria-labelledby={`tab-${rightTab}`} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "10px 12px", background: "#fff", display: "flex", flexDirection: "column" }}>
            <div className="print-only" style={{ fontSize: 13, fontWeight: 700, color: "#163D4C", marginBottom: 8 }}>
              {shaft.label} · {TABS.find(t => t.id === rightTab).l} · projection at {modeLabel} · data as at {fmtDate(today)}
            </div>
            {rightTab === "schedule" && (
              <ScheduleTable
                shaft={shaft}
                projection={modeProjection}
                modeLabel={modeLabel}
                revbPts={revbPts}
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
                revbGap={revbGap}
                ptdDays={ptdDays}
                ptdRate={ptdRate}
              />
            )}
            {rightTab === "gantt" && (
              <GanttTimeline
                shaft={shaft}
                ganttPlanned={ganttPlanned}
                projection={modeProjection}
                modeLabel={modeLabel}
                horizon={curvePts && curvePts.at(-1).depth < shaft.finalDepth ? new Date(curvePts.at(-1).date) : null}
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
                stagesMode={rateMode === "revb"}
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
