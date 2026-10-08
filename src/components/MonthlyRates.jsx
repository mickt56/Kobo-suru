import { useState } from "react";
import { daysBetween, getFormationAt } from "../engine/projection.js";

const NAVY = "#163D4C";

// Timeline mode: one rate per calendar month, with a quick "apply to a range of months".
// Each row shows the formation and depth expected at the start of the month; the swatch is the
// month's colour in the forecast period bands (shaft column, Gantt, Section tab).
export default function MonthlyRates({
  shaft, activeShaft, today, curDepth, months, handleTimelineRate, addMonths, applyRange, curveReachesFinal, periods,
}) {
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(2);
  const [rangeRate, setRangeRate] = useState("0.70");
  const colorOf = new Map(periods.map(p => [p.key, p.color]));

  let depth = curDepth;
  const rows = months.map(m => {
    const atStart = depth;
    const es = m.start > today ? m.start : today;
    if (es < m.end) depth = Math.min(shaft.finalDepth, depth + m.rate * daysBetween(es, m.end));
    return { m, atStart, done: atStart >= shaft.finalDepth };
  });
  const lastIdx = months.length - 1;
  const rr = parseFloat(rangeRate);
  const rangeOk = rr >= 0.05 && rr <= 2 && from <= to;
  const select = { fontSize: 11, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, color: NAVY, fontWeight: 600 };

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {activeShaft} Monthly Rates (m/day)
      </div>

      <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 3, padding: "5px 6px", marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 3, textTransform: "uppercase" }}>Apply one rate to a range</div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
          <select aria-label="First month of the range" value={from} onChange={e => { const v = +e.target.value; setFrom(v); if (v > to) setTo(v); }} style={select}>
            {months.map((m, i) => <option key={m.key} value={i}>{m.label}</option>)}
          </select>
          <span style={{ fontSize: 11, color: "#555" }}>to</span>
          <select aria-label="Last month of the range" value={to} onChange={e => { const v = +e.target.value; setTo(v); if (v < from) setFrom(v); }} style={select}>
            {months.map((m, i) => <option key={m.key} value={i}>{m.label}</option>)}
          </select>
          <input
            type="number" step="0.01" min="0.05" max="2.00" value={rangeRate} aria-label="Rate for the range, metres per day"
            onChange={e => setRangeRate(e.target.value)}
            style={{ width: 44, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, fontSize: 11, fontWeight: 700, textAlign: "right", color: NAVY }}
          />
          <button
            onClick={() => applyRange(activeShaft, from, to, rr)} disabled={!rangeOk}
            style={{ padding: "2px 7px", border: "none", borderRadius: 3, background: rangeOk ? NAVY : "#bbb", color: "#fff", fontSize: 11, fontWeight: 700, cursor: rangeOk ? "pointer" : "default" }}
          >Apply</button>
        </div>
      </div>

      <div role="list" aria-label={`${activeShaft} monthly rates`}>
        {rows.map(({ m, atStart, done }, i) => {
          const fm = getFormationAt(shaft, Math.min(shaft.finalDepth - 0.1, atStart));
          const swatch = colorOf.get(m.key);
          return (
            <div key={m.key} role="listitem" style={{ display: "flex", alignItems: "center", gap: 4, height: 22, opacity: done ? 0.55 : 1 }}>
              <span aria-hidden="true" style={{ width: 7, height: 14, borderRadius: 2, flexShrink: 0, background: swatch ?? "transparent", border: swatch ? "none" : "1px solid #e4e4e4" }} />
              <span style={{ width: 42, fontSize: 11, fontWeight: 700, color: NAVY, flexShrink: 0 }}>{m.label}</span>
              <span style={{ width: 62, fontSize: 10, color: "#666", flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden" }}>
                {done ? "✓ done" : `${fm.code} ${atStart.toFixed(0)}m`}
              </span>
              <input
                type="range" min="0.10" max="1.50" step="0.01" value={m.rate} disabled={done}
                aria-label={`${m.label} rate slider`}
                onChange={e => handleTimelineRate(activeShaft, i, e.target.value)}
                style={{ flex: 1, minWidth: 0, height: 3, accentColor: NAVY }}
              />
              <input
                type="number" step="0.01" min="0.10" max="2.00" value={m.rate} disabled={done}
                aria-label={`${m.label} rate, metres per day`}
                onChange={e => handleTimelineRate(activeShaft, i, e.target.value)}
                style={{ width: 44, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, fontSize: 11, fontWeight: 700, textAlign: "right", color: NAVY, flexShrink: 0 }}
              />
            </div>
          );
        })}
      </div>

      {!curveReachesFinal && (
        <div role="status" style={{ fontSize: 11, color: "#7a2e00", background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: 3, padding: "4px 6px", margin: "4px 0" }}>
          These months end before final depth. Add months or raise the rates.
        </div>
      )}
      <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
        {[1, 6, 12].map(n => (
          <button
            key={n}
            onClick={() => addMonths(activeShaft, n)} disabled={lastIdx + n >= 60}
            style={{ flex: 1, padding: "4px 0", border: `1px dashed ${NAVY}`, borderRadius: 3, background: "#fff", color: NAVY, cursor: "pointer", fontSize: 11, fontWeight: 700 }}
          >+ {n} month{n > 1 ? "s" : ""}</button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
        Calendar rates, independent of formation boundaries. Each row shows the formation and depth expected at the
        start of the month; the swatch is its colour in the period bands.
      </div>
    </>
  );
}
