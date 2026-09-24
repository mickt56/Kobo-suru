import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { daysBetween, fmtDate, fmtShort, getFormationAt } from "../engine/projection.js";

export default function SCurve({
  shaft, scurveData, modeLabel, today, curDepth,
  variance, plannedAtToday, ptdDays, ptdRate,
}) {
  const legend = [
    { c: "#163D4C", l: "Planned (geology rates)", d: false },
    { c: "#E60033", l: "Actual (EOM data)", d: false },
    { c: "#E60033", l: `Projected (${modeLabel})`, d: true },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {legend.map((leg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 16, height: leg.d ? 0 : 3, background: leg.d ? "none" : leg.c, borderTop: leg.d ? `2px dashed ${leg.c}` : "none" }} />
            <span style={{ fontSize: 8, color: "#666" }}>{leg.l}</span>
          </div>
        ))}
        <div style={{ fontSize: 8, color: "#aaa", marginLeft: "auto" }}>PTD: {ptdRate} m/d over {ptdDays}d</div>
      </div>

      <div style={{ flex: 1, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scurveData} margin={{ top: 18, right: 48, left: 5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={v => fmtShort(new Date(v))} tick={{ fontSize: 8 }} />
            <YAxis reversed domain={[0, shaft.finalDepth]} tick={{ fontSize: 8 }} label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#888" }} />
            <Tooltip
              labelFormatter={v => fmtDate(new Date(v))}
              formatter={(v, n) => [v != null ? `${v.toFixed(1)}m` : "—", n === "planned" ? "Planned" : n === "actual" ? "Actual" : "Projected"]}
              contentStyle={{ fontSize: 10, borderRadius: 4 }}
            />
            <ReferenceLine x={today.getTime()} stroke="#E60033" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Today", position: "top", fontSize: 7, fill: "#E60033" }} />
            <ReferenceLine y={curDepth} stroke="#E60033" strokeDasharray="2 3" strokeWidth={0.6} />
            {shaft.standOff && (
              <ReferenceLine y={shaft.standOff} stroke="#F5B216" strokeDasharray="4 2" strokeWidth={1} label={{ value: "Stand-off", position: "right", fontSize: 7, fill: "#F5B216" }} />
            )}
            {shaft.formations.filter(f => f.to < shaft.finalDepth && f.to > shaft.preSink).map(f => (
              <ReferenceLine key={f.code} y={f.to} stroke="#eee" strokeWidth={0.5} />
            ))}
            <Line type="monotone" dataKey="planned" stroke="#163D4C" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="actual" stroke="#E60033" strokeWidth={2.5} dot={{ r: 2, fill: "#E60033" }} connectNulls />
            <Line type="monotone" dataKey="projected" stroke="#E60033" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        marginTop: 6, padding: "6px 10px", borderRadius: 4,
        background: variance > 0 ? "#e8f5e9" : "#fff3e0",
        border: `1px solid ${variance > 0 ? "#a5d6a7" : "#ffcc80"}`,
        fontSize: 10, display: "flex", alignItems: "center", gap: 10,
      }}>
        <b style={{ color: variance > 0 ? "#2a7a2a" : "#e65100" }}>
          {variance > 0 ? "▲" : "▼"} {Math.abs(variance).toFixed(1)}m {variance > 0 ? "ahead" : "behind"} plan
        </b>
        <span style={{ color: "#666" }}>
          Day {ptdDays} — Planned: {plannedAtToday.toFixed(1)}m vs Actual: {curDepth.toFixed(1)}m
        </span>
      </div>

      <div style={{ marginTop: 10, fontSize: 9 }}>
        <div style={{ fontWeight: 700, color: "#163D4C", marginBottom: 3, textTransform: "uppercase", fontSize: 8 }}>Monthly Actual Rates</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {shaft.actual.slice(1).map((a, i) => {
            const prev = shaft.actual[i];
            const adv = a.depth - prev.depth;
            const days = daysBetween(prev.date, a.date);
            const rate = days > 0 ? adv / days : 0;
            const fm = getFormationAt(shaft, a.depth);
            return (
              <div key={i} style={{ padding: "3px 5px", background: "#f8f8f8", borderRadius: 3, border: "1px solid #eee", minWidth: 58 }}>
                <div style={{ fontWeight: 600, color: "#333", fontSize: 9 }}>{fmtShort(a.date)}</div>
                <div style={{ color: rate > 0.6 ? "#2a7a2a" : rate > 0.4 ? "#e65100" : "#c00", fontWeight: 700, fontSize: 10 }}>{rate.toFixed(2)}</div>
                <div style={{ color: "#aaa", fontSize: 6 }}>{adv.toFixed(1)}m/{days}d · {fm?.code}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
