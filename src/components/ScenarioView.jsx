import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { MS_DAY, addDays, daysBetween, depthAtTime, fmtDate, fmtShort } from "../engine/projection.js";
import { WINDOWS, STATS, constantRatePoints } from "../engine/stats.js";

const RED = "#E60033", NAVY = "#163D4C", GREEN = "#2a7a2a", GOLD = "#F5B216", SAGE = "#6D8F80", CHARCOAL = "#6D6D6D";
// How each statistic is drawn on the fan chart.
const LINE = {
  worst: { stroke: "#aaa", width: 1, dash: "2 3" },
  p25: { stroke: SAGE, width: 1.5, dash: "6 3" },
  median: { stroke: GOLD, width: 2.5, dash: null },
  mean: { stroke: CHARCOAL, width: 1.5, dash: "4 4" },
  p75: { stroke: SAGE, width: 1.5, dash: "6 3" },
  best: { stroke: "#aaa", width: 1, dash: "2 3" },
};
const th = { padding: "4px 5px", color: "#fff", fontWeight: 600, fontSize: 8, textAlign: "left", whiteSpace: "nowrap", textTransform: "uppercase" };
const signed = (v, dp = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}`;

function Stat({ label, value, sub, color = NAVY }) {
  return (
    <div style={{ flex: "1 1 130px", background: "#f8f8f8", border: "1px solid #e6e6e6", borderRadius: 4, padding: "5px 8px" }}>
      <div style={{ fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 8, color: "#888" }}>{sub}</div>}
    </div>
  );
}

export default function ScenarioView({
  shaft, today, curDepth, stats, perf, revbRows, revbSinkComplete, choice, statsActive, applyScenario,
}) {
  const remaining = Math.max(0, shaft.finalDepth - curDepth);
  const win = stats.windows[choice.window];
  const finishFor = rate => addDays(today, remaining / rate);
  const daysToRevb = daysBetween(today, revbSinkComplete);
  const peak = Math.max(...stats.months.map(m => m.rate));

  // Fan chart: actual history, Rev-B baseline and one straight line per statistic in the chosen window.
  const actualPts = shaft.actual.map(a => ({ date: a.date.getTime(), depth: a.depth }));
  const revbPts = revbRows.map(d => ({ date: d.date, depth: d.revb }));
  const fan = Object.fromEntries(STATS.map(s => [s.id, constantRatePoints(curDepth, today, win[s.id], shaft.finalDepth)]));
  const times = new Set([...actualPts, ...revbPts].map(p => p.date));
  Object.values(fan).forEach(pts => pts.forEach(p => times.add(p.date)));
  const readings = new Map(actualPts.map(p => [p.date, p.depth]));
  const chartData = [...times].sort((a, b) => a - b).map(t => ({
    time: t,
    actual: readings.get(t) ?? null, // only at reading dates, so dots mark the readings
    revb: depthAtTime(revbPts, t),
    ...Object.fromEntries(STATS.map(s => [s.id, depthAtTime(fan[s.id], t)])),
  }));
  const xMin = shaft.mainSinkStart.getTime();
  // Keep the slow tail (worst month) from squashing the rest; it runs off the right edge instead.
  const xMax = Math.max(fan.p25[1].date, revbPts.at(-1).date, today.getTime()) + 60 * MS_DAY;
  const xTicks = [];
  for (let d = new Date(shaft.mainSinkStart.getFullYear(), Math.ceil(shaft.mainSinkStart.getMonth() / 3) * 3, 1); d.getTime() <= xMax; d = new Date(d.getFullYear(), d.getMonth() + 3, 1)) {
    xTicks.push(d.getTime());
  }
  const yMax = Math.ceil(Math.max(shaft.finalDepth, ...revbPts.map(p => p.depth)) / 50) * 50;

  const monthStart = win.from.getTime();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Stat label={`Remaining · ${fmtDate(today)}`} value={`${remaining.toFixed(1)}m`} sub={`at ${curDepth.toFixed(1)}m of ${shaft.finalDepth}m`} />
        <Stat label="Rate since Rev-B start" value={`${perf.sinceRevb.toFixed(3)} m/d`} />
        <Stat label="Rolling 180-day" value={`${perf.rolling180.toFixed(3)} m/d`} />
        <Stat label="Rolling 90-day" value={`${perf.rolling90.toFixed(3)} m/d`} />
        <Stat label="Peak month" value={`${peak.toFixed(3)} m/d`} />
        <Stat
          label="Needed for Rev-B sink complete"
          value={daysToRevb > 0 ? `${(remaining / daysToRevb).toFixed(2)} m/d` : "Date passed"}
          sub={`Rev-B ${fmtDate(revbSinkComplete)}`}
          color={RED}
        />
      </div>

      <div style={{ flex: "1 0 auto", minHeight: 300, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "3 1 520px", minWidth: 0, display: "flex", flexDirection: "column", minHeight: 300 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            {[
              { c: RED, l: "Actual", dash: null, w: 2.5 },
              { c: NAVY, l: "Rev-B", dash: null, w: 2 },
              ...STATS.filter(s => s.id !== "p75" && s.id !== "best").map(s => ({
                c: LINE[s.id].stroke, dash: LINE[s.id].dash, w: LINE[s.id].width,
                l: s.id === "p25" ? "P25 / P75" : s.id === "worst" ? "Worst / best" : s.label,
              })),
            ].map((leg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={leg.c} strokeWidth={leg.w} strokeDasharray={leg.dash ?? undefined} /></svg>
                <span style={{ fontSize: 8, color: "#666" }}>{leg.l}</span>
              </div>
            ))}
            <div style={{ fontSize: 8, color: "#aaa", marginLeft: "auto" }}>
              {WINDOWS.find(w => w.id === choice.window).label} ({win.n} months)
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 18, right: 56, left: 5, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="time" type="number" scale="time" domain={[xMin, xMax]} allowDataOverflow ticks={xTicks} tickFormatter={v => fmtShort(new Date(v))} tick={{ fontSize: 8 }} />
                <YAxis reversed domain={[0, yMax]} tick={{ fontSize: 8 }} label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#888" }} />
                <Tooltip
                  labelFormatter={v => fmtDate(new Date(v))}
                  formatter={(v, n) => [v != null ? `${v.toFixed(1)}m` : "—", n === "revb" ? "Rev-B" : n === "actual" ? "Actual" : STATS.find(s => s.id === n)?.label]}
                  contentStyle={{ fontSize: 10, borderRadius: 4 }}
                />
                <ReferenceLine x={today.getTime()} stroke={RED} strokeDasharray="4 4" strokeWidth={1} label={{ value: fmtDate(today), position: "top", fontSize: 7, fill: RED }} />
                <ReferenceLine y={shaft.finalDepth} stroke="#999" strokeDasharray="4 2" strokeWidth={1} label={{ value: `Final ${shaft.finalDepth}m`, position: "right", fontSize: 7, fill: "#888" }} />
                <Line type="linear" dataKey="revb" stroke={NAVY} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                <Line type="linear" dataKey="actual" stroke={RED} strokeWidth={2.5} dot={{ r: 1.5, fill: RED }} connectNulls isAnimationActive={false} />
                {STATS.map(s => (
                  <Line
                    key={s.id} type="linear" dataKey={s.id} stroke={LINE[s.id].stroke} strokeDasharray={LINE[s.id].dash ?? undefined}
                    strokeWidth={statsActive && choice.stat === s.id ? LINE[s.id].width + 1.5 : LINE[s.id].width}
                    dot={false} connectNulls isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: "2 1 380px", minWidth: 0 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: NAVY, textTransform: "uppercase", marginBottom: 3 }}>
            Sink complete by scenario (click to apply)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: NAVY }}>
                <th style={th}>Monthly rate</th>
                {WINDOWS.map(w => <th key={w.id} style={th}>{w.short} <span style={{ fontWeight: 400, opacity: 0.7 }}>({stats.windows[w.id].n})</span></th>)}
              </tr>
            </thead>
            <tbody>
              {STATS.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "3px 5px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {s.label}{s.hint && <span style={{ fontWeight: 400, color: "#999", fontSize: 8 }}> {s.hint}</span>}
                  </td>
                  {WINDOWS.map(w => {
                    const rate = stats.windows[w.id][s.id];
                    const finish = finishFor(rate);
                    const slip = daysBetween(revbSinkComplete, finish);
                    const picked = choice.window === w.id && choice.stat === s.id;
                    const on = picked && statsActive;
                    return (
                      <td
                        key={w.id}
                        onClick={() => applyScenario(w.id, s.id)}
                        title={`Apply ${w.short} ${s.label} (${rate.toFixed(3)} m/d)`}
                        style={{
                          padding: "3px 5px", cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1.25,
                          background: on ? NAVY : undefined, color: on ? "#fff" : undefined,
                          outline: picked && !on ? `1px dashed ${NAVY}` : "none", outlineOffset: -2,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{rate.toFixed(3)} <span style={{ fontWeight: 400, fontSize: 8, opacity: 0.7 }}>m/d</span></div>
                        <div style={{ fontSize: 9 }}>
                          {fmtDate(finish)}{" "}
                          <b style={{ color: on ? "#fff" : slip > 0 ? RED : GREEN }}>{signed(slip)}d</b>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid #ddd", color: "#888" }}>
                <td style={{ padding: "3px 5px", fontWeight: 700 }}>St. dev.</td>
                {WINDOWS.map(w => <td key={w.id} style={{ padding: "3px 5px" }}>{stats.windows[w.id].sd.toFixed(3)}</td>)}
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 8, color: "#999", marginTop: 4, lineHeight: 1.4 }}>
            Statistics of complete months' average rate (m/day) in each window, applied as a constant rate from {fmtDate(today)} to final depth.
            Days are against Rev-B sink complete ({fmtDate(revbSinkComplete)}). P25/P75 are percentiles of the monthly rate, so P75 is the faster rate.
          </div>
        </div>
      </div>

      <div style={{ flex: "0 0 150px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: NAVY, textTransform: "uppercase", marginBottom: 3 }}>
          Monthly rate history <span style={{ fontWeight: 400, color: "#999", textTransform: "none" }}>(dark = in the selected window; lines = its P25, median, P75)</span>
        </div>
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.months.map(m => ({ month: fmtShort(m.month), rate: m.rate, t: m.month.getTime(), sink: m.sink, days: m.days }))} margin={{ top: 4, right: 56, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 8 }} interval={0} />
              <YAxis tick={{ fontSize: 8 }} domain={[0, Math.ceil(peak * 10) / 10]} />
              <Tooltip
                formatter={(v, n, item) => [`${v.toFixed(3)} m/d (${item.payload.sink.toFixed(1)}m / ${item.payload.days}d)`, "Rate"]}
                contentStyle={{ fontSize: 10, borderRadius: 4 }}
              />
              <Bar dataKey="rate" isAnimationActive={false}>
                {stats.months.map((m, i) => <Cell key={i} fill={m.month.getTime() >= monthStart ? NAVY : "#cfd8dc"} />)}
              </Bar>
              <ReferenceLine y={win.p25} stroke={SAGE} strokeDasharray="6 3" />
              <ReferenceLine y={win.median} stroke={GOLD} strokeWidth={2} label={{ value: "Median", position: "right", fontSize: 7, fill: "#b8860b" }} />
              <ReferenceLine y={win.p75} stroke={SAGE} strokeDasharray="6 3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
