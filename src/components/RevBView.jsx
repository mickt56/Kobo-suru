import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmtDate, fmtShort } from "../engine/projection.js";

const RED = "#E60033", NAVY = "#163D4C", GREEN = "#2a7a2a";
const th = { padding: "4px 5px", color: "#fff", fontWeight: 600, fontSize: 8, textAlign: "left", whiteSpace: "nowrap", textTransform: "uppercase" };
const td = { padding: "3px 5px", whiteSpace: "nowrap" };
const num = { ...td, textAlign: "right" };
const signed = (v, dp = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(dp)}`;
const slipColor = v => (v > 0 ? RED : GREEN);

function Stat({ label, value, sub, color = NAVY }) {
  return (
    <div style={{ flex: "1 1 130px", background: "#f8f8f8", border: "1px solid #e6e6e6", borderRadius: 4, padding: "5px 8px" }}>
      <div style={{ fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 8, color: "#888" }}>{sub}</div>}
    </div>
  );
}

function StatusCell({ m }) {
  if (m.status === "done") return <span style={{ fontSize: 7, color: "#888" }}>✓ Done</span>;
  if (m.status === "unrecorded") return <span style={{ fontSize: 7, color: "#aaa" }} title="Passed, but no actual date in the Rev-B workbook">No date</span>;
  const label = m.status === "active" ? "● In progress" : "○ Upcoming";
  return (
    <span style={{ fontSize: 7, fontWeight: m.status === "active" ? 700 : 400, color: m.status === "active" ? RED : "#999" }}>
      {label}{m.overdue && <span style={{ color: RED, fontWeight: 700 }}> · overdue</span>}
    </span>
  );
}

export default function RevBView({ shaft, rateMode, status, milestones, monthly, chartData }) {
  const lastSink = milestones.filter(m => m.sink).at(-1);
  const last = milestones.at(-1);
  const fcst = m => m.actualDate ?? m.forecastDate;
  const maxRevb = Math.max(...chartData.map(d => d.revb ?? 0));
  const yMin = Math.floor(chartData[0].revb / 50) * 50;
  const yMax = Math.ceil(Math.max(shaft.finalDepth, maxRevb) / 50) * 50;
  const yTicks = [];
  for (let d = yMin; d <= yMax; d += 50) yTicks.push(d);
  // Quarter starts across the chart; the daily data is too dense for Recharts' own tick choice.
  const t0 = new Date(chartData[0].time), t1 = chartData.at(-1).time;
  const xTicks = [];
  for (let d = new Date(t0.getFullYear(), Math.ceil(t0.getMonth() / 3) * 3, 1); d.getTime() <= t1; d = new Date(d.getFullYear(), d.getMonth() + 3, 1)) {
    xTicks.push(d.getTime());
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Stat label={`Actual · ${fmtDate(status.asOf)}`} value={`${status.actual.toFixed(1)}m`} />
        <Stat label="Rev-B planned" value={`${status.revbDepth.toFixed(1)}m`} />
        <Stat label="Variance" value={`${signed(status.variance)}m`} color={status.variance >= 0 ? GREEN : RED} />
        <Stat
          label="Behind Rev-B" value={status.daysBehind != null ? `${status.daysBehind} days` : "—"} color={RED}
          sub={status.reachedDate ? `Rev-B planned ${status.actual.toFixed(1)}m by ${fmtDate(status.reachedDate)}` : null}
        />
        <Stat
          label="Sink complete" value={fcst(lastSink) ? fmtDate(fcst(lastSink)) : "—"}
          sub={`Rev-B ${fmtDate(status.sinkComplete)}${lastSink.slip != null ? ` · ${signed(lastSink.slip, 0)}d` : ""}`}
          color={lastSink.slip > 0 ? RED : NAVY}
        />
        <Stat
          label="Finish (strip & inspect)" value={fcst(last) ? fmtDate(fcst(last)) : "—"}
          sub={`Rev-B ${fmtDate(status.finish)}${last.slip != null ? ` · ${signed(last.slip, 0)}d` : ""}`}
          color={last.slip > 0 ? RED : NAVY}
        />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {[
          { c: NAVY, l: "Rev-B baseline (daily)", d: false },
          { c: RED, l: "Actual (daily)", d: false },
          { c: RED, l: `Forecast (${rateMode})`, d: true },
        ].map((leg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 16, height: leg.d ? 0 : 3, background: leg.d ? "none" : leg.c, borderTop: leg.d ? `2px dashed ${leg.c}` : "none" }} />
            <span style={{ fontSize: 8, color: "#666" }}>{leg.l}</span>
          </div>
        ))}
        <div style={{ fontSize: 8, color: "#aaa", marginLeft: "auto" }}>
          Forecasts use the {rateMode} projection plus the remaining Rev-B event durations
        </div>
      </div>

      <div style={{ flex: "1 1 300px", minHeight: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 18, right: 56, left: 5, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={xTicks} tickFormatter={v => fmtShort(new Date(v))} tick={{ fontSize: 8 }} />
            <YAxis reversed domain={[yMin, yMax]} ticks={yTicks} interval={0} tick={{ fontSize: 8 }} label={{ value: "Depth (m)", angle: -90, position: "insideLeft", fontSize: 8, fill: "#888" }} />
            <Tooltip
              labelFormatter={v => fmtDate(new Date(v))}
              formatter={(v, n) => [v != null ? `${v.toFixed(1)}m` : "—", n === "revb" ? "Rev-B" : n === "actual" ? "Actual" : "Forecast"]}
              contentStyle={{ fontSize: 10, borderRadius: 4 }}
            />
            <ReferenceLine x={status.asOf.getTime()} stroke={RED} strokeDasharray="4 4" strokeWidth={1} label={{ value: fmtDate(status.asOf), position: "top", fontSize: 7, fill: RED }} />
            <ReferenceLine y={shaft.finalDepth} stroke="#999" strokeDasharray="4 2" strokeWidth={1} label={{ value: `Final ${shaft.finalDepth}m`, position: "right", fontSize: 7, fill: "#888" }} />
            <Line type="linear" dataKey="revb" stroke={NAVY} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line type="linear" dataKey="actual" stroke={RED} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
            <Line type="linear" dataKey="projected" stroke={RED} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "3 1 560px", minWidth: 0, overflowX: "auto" }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: NAVY, textTransform: "uppercase", marginBottom: 3 }}>Rev-B milestones</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: NAVY }}>
                <th style={th}>Milestone</th>
                <th style={{ ...th, textAlign: "right" }}>Depth (m)</th>
                <th style={th}>Rev-B</th>
                <th style={th}>Actual / forecast</th>
                <th style={{ ...th, textAlign: "right" }}>Slip (d)</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m, i) => {
                const done = m.status === "done";
                const when = fcst(m);
                return (
                  <tr key={i} style={{ background: m.status === "active" ? "#FFF8E8" : i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #eee", color: done || m.status === "unrecorded" ? "#888" : "#222" }}>
                    <td style={{ ...td, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }} title={m.name}>{m.name}</td>
                    <td style={num}>{m.sink ? `${m.from}–${m.to}` : `@ ${m.to}`}</td>
                    <td style={td}>{fmtDate(m.revBDate)}</td>
                    <td style={{ ...td, fontStyle: done ? "normal" : "italic" }}>
                      {when ? fmtDate(when) : "—"}
                      {!done && when && <span style={{ fontSize: 7, color: "#999" }}> fcst</span>}
                    </td>
                    <td style={{ ...num, fontWeight: 700, color: m.slip == null ? "#aaa" : slipColor(m.slip), opacity: done ? 1 : 0.75 }}>
                      {m.slip == null ? "—" : signed(m.slip, 0)}
                    </td>
                    <td style={td}><StatusCell m={m} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>
            Slip = actual (or forecast) date minus Rev-B date, per milestone. Positive = late.
          </div>
        </div>

        <div style={{ flex: "2 1 380px", minWidth: 0, overflowX: "auto" }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: NAVY, textTransform: "uppercase", marginBottom: 3 }}>Monthly summary</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: NAVY }}>
                <th style={th}>Month</th>
                <th style={{ ...th, textAlign: "right" }}>Rev-B adv.</th>
                <th style={{ ...th, textAlign: "right" }}>Actual adv.</th>
                <th style={{ ...th, textAlign: "right" }}>Rev-B cum.</th>
                <th style={{ ...th, textAlign: "right" }}>Actual cum.</th>
                <th style={{ ...th, textAlign: "right" }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((r, i) => (
                <tr key={i} style={{ background: r.mtd ? "#FFF8E8" : i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #eee", color: r.actCum == null ? "#999" : "#222" }}>
                  <td style={{ ...td, fontWeight: 600 }}>
                    {fmtShort(r.month)}
                    {r.mtd && <span style={{ fontSize: 7, color: RED, fontWeight: 700 }}> to {fmtDate(status.asOf)}</span>}
                  </td>
                  <td style={num}>{r.revbAdv.toFixed(1)}</td>
                  <td style={num}>{r.actAdv == null ? "—" : r.actAdv.toFixed(1)}</td>
                  <td style={num}>{r.revbCum.toFixed(1)}</td>
                  <td style={num}>{r.actCum == null ? "—" : r.actCum.toFixed(1)}</td>
                  <td style={{ ...num, fontWeight: 700, color: r.delta == null ? "#aaa" : r.delta >= 0 ? GREEN : RED }}>
                    {r.delta == null ? "—" : signed(r.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 8, color: "#999", marginTop: 3 }}>
            Metres, from the daily Rev-B baseline and daily actuals. Δ = actual − Rev-B cumulative.
          </div>
        </div>
      </div>
    </div>
  );
}
