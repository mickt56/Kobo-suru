import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmtDate, fmtShort } from "../engine/projection.js";

const NAVY = "#163D4C", RED = "#E60033";
const NAMES = { revb: "Rev-B", actual: "Actual", projected: "Projected" };

export default function SCurve({ shaft, scurveData, modeLabel, today, curDepth, revbGap, ptdDays, ptdRate }) {
  const legend = [
    { c: NAVY, l: "Rev-B baseline", d: false },
    { c: RED, l: "Actual (month-end readings)", d: false },
    { c: RED, l: `Projected (${modeLabel})`, d: true },
  ];
  const yMax = Math.ceil(Math.max(shaft.finalDepth, ...scurveData.map(d => d.revb ?? 0)) / 50) * 50;
  const behind = revbGap.variance < 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 14, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {legend.map((leg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 18, height: leg.d ? 0 : 3, background: leg.d ? "none" : leg.c, borderTop: leg.d ? `2px dashed ${leg.c}` : "none" }} />
            <span style={{ fontSize: 11, color: "#444" }}>{leg.l}</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#666", marginLeft: "auto" }}>Average since main sink start: {ptdRate} m/d over {ptdDays} days</div>
      </div>

      <div style={{ flex: 1, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scurveData} margin={{ top: 20, right: 56, left: 5, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={v => fmtShort(new Date(v))} tick={{ fontSize: 11 }} />
            <YAxis reversed domain={[0, yMax]} tick={{ fontSize: 11 }} label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#666" }} />
            <Tooltip
              labelFormatter={v => fmtDate(new Date(v))}
              formatter={(v, n) => [v != null ? `${v.toFixed(1)}m` : "—", NAMES[n]]}
              contentStyle={{ fontSize: 12, borderRadius: 4 }}
            />
            <ReferenceLine x={today.getTime()} stroke={RED} strokeDasharray="4 4" strokeWidth={1} label={{ value: fmtDate(today), position: "top", fontSize: 11, fill: RED }} />
            <ReferenceLine y={curDepth} stroke={RED} strokeDasharray="2 3" strokeWidth={0.6} />
            {shaft.standOff && (
              <ReferenceLine y={shaft.standOff} stroke="#F5B216" strokeDasharray="4 2" strokeWidth={1} label={{ value: "Stand-off", position: "right", fontSize: 11, fill: "#9a6b00" }} />
            )}
            <ReferenceLine y={shaft.finalDepth} stroke="#999" strokeDasharray="4 2" strokeWidth={1} label={{ value: `Final ${shaft.finalDepth}m`, position: "right", fontSize: 11, fill: "#666" }} />
            {shaft.formations.filter(f => f.to < shaft.finalDepth && f.to > shaft.preSink).map(f => (
              <ReferenceLine key={f.code} y={f.to} stroke="#eee" strokeWidth={0.5} />
            ))}
            <Line type="linear" dataKey="revb" stroke={NAVY} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line type="linear" dataKey="actual" stroke={RED} strokeWidth={2.5} dot={{ r: 2.5, fill: RED }} connectNulls isAnimationActive={false} />
            <Line type="linear" dataKey="projected" stroke={RED} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        marginTop: 6, padding: "7px 12px", borderRadius: 4,
        background: behind ? "#fff3e0" : "#e8f5e9",
        border: `1px solid ${behind ? "#ffcc80" : "#a5d6a7"}`,
        fontSize: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <b style={{ color: behind ? "#a33a00" : "#2a7a2a", fontSize: 13 }}>
          {behind ? "▼" : "▲"} {Math.abs(revbGap.variance).toFixed(1)}m {behind ? "behind" : "ahead of"} Rev-B
          {behind && revbGap.daysBehind != null && ` · ${revbGap.daysBehind} days`}
        </b>
        <span style={{ color: "#444" }}>
          {fmtDate(today)}: Rev-B {revbGap.revbDepth.toFixed(1)}m vs {curDepth.toFixed(1)}m
        </span>
      </div>
    </div>
  );
}
