import { RATE_GROUPS, LOWER_CODES, PRESETS } from "../data/rates.js";
import {
  daysBetween, fmtDate, getFormationAt, getRateKey, typeColor,
} from "../engine/projection.js";

export default function RatesPanel({
  shaft, activeShaft, otherKey, today,
  rateMode, setRateMode,
  rates, setRates, handleRate,
  timelineRates, handleTimelineRate,
  setHoveredFm,
  otherProj, SHAFTS,
}) {
  return (
    <div style={{ width: 250, flexShrink: 0, background: "#fafafa", borderRight: "1px solid #ddd", padding: "10px 10px", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {[{ id: "geology", l: "Geology" }, { id: "timeline", l: "Timeline" }].map(m => (
          <button
            key={m.id}
            onClick={() => setRateMode(m.id)}
            style={{
              flex: 1, padding: "4px 0", border: "1px solid #ccc", borderRadius: 3, cursor: "pointer",
              fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3,
              background: rateMode === m.id ? "#163D4C" : "#fff",
              color: rateMode === m.id ? "#fff" : "#163D4C",
            }}
          >{m.l}</button>
        ))}
      </div>

      {rateMode === "geology" && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#163D4C", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Advance Rates (m/day)
          </div>
          {RATE_GROUPS.map(g => {
            const hasFormation = shaft.formations.some(f => getRateKey(f.code) === g.id);
            if (!hasFormation && g.id !== "LOWER") return null;
            if (g.id === "LOWER" && !shaft.formations.some(f => LOWER_CODES.has(f.code))) return null;
            return (
              <div
                key={g.id}
                style={{ marginBottom: 5 }}
                onMouseEnter={() => setHoveredFm(g.id === "LOWER" ? null : g.id)}
                onMouseLeave={() => setHoveredFm(null)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: g.color, border: "1px solid rgba(0,0,0,0.1)" }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#333" }}>{g.label}</span>
                  </div>
                  <input
                    type="number" step="0.01" min="0.10" max="2.00" value={rates[g.id]}
                    onChange={e => handleRate(g.id, e.target.value)}
                    style={{ width: 44, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, fontSize: 10, fontWeight: 700, textAlign: "right", color: typeColor(g.type) }}
                  />
                </div>
                <input
                  type="range" min="0.10" max="1.50" step="0.01" value={rates[g.id]}
                  onChange={e => handleRate(g.id, e.target.value)}
                  style={{ width: "100%", height: 3, accentColor: typeColor(g.type) }}
                />
              </div>
            );
          })}
          <div style={{ marginTop: 8, borderTop: "1px solid #e0e0e0", paddingTop: 6 }}>
            <div style={{ fontSize: 8, color: "#888", marginBottom: 3, textTransform: "uppercase" }}>Presets</div>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => {
                  const r = {};
                  RATE_GROUPS.forEach(g => { r[g.id] = Math.max(0.1, +(g.default + p.offset).toFixed(2)); });
                  setRates(r);
                }}
                style={{
                  display: "block", width: "100%", padding: "3px 5px", marginBottom: 2,
                  border: "1px solid #ccc", borderRadius: 3, background: "#fff", cursor: "pointer",
                  fontSize: 9, fontWeight: 600, color: "#163D4C", textAlign: "left",
                }}
              >
                {p.label} {p.offset > 0 ? `(+${p.offset})` : p.offset < 0 ? `(${p.offset})` : "(default)"}
              </button>
            ))}
          </div>
        </>
      )}

      {rateMode === "timeline" && (
        <>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#163D4C", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {activeShaft} Quarterly Rates (m/day)
          </div>
          {timelineRates[activeShaft].map((q, i) => {
            const curDepth = SHAFTS[activeShaft].actual[SHAFTS[activeShaft].actual.length - 1].depth;
            const depthAtQ = curDepth + timelineRates[activeShaft].slice(0, i).reduce((s, qq) => {
              const es = qq.start > today ? qq.start : today;
              return es >= qq.end ? s : s + qq.rate * daysBetween(es, qq.end);
            }, 0);
            const fm = getFormationAt(shaft, Math.min(shaft.finalDepth - 0.1, depthAtQ));
            const done = depthAtQ >= shaft.finalDepth;
            return (
              <div key={i} style={{ marginBottom: 5, opacity: q.end < today || done ? 0.35 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#163D4C" }}>{q.label}</span>
                    {fm && !done && <span style={{ fontSize: 7, color: "#888", marginLeft: 4 }}>~{fm.code}</span>}
                    {done && <span style={{ fontSize: 7, color: "#2a7a2a", marginLeft: 4 }}>✓ Complete</span>}
                  </div>
                  <input
                    type="number" step="0.01" min="0.10" max="2.00" value={q.rate} disabled={done}
                    onChange={e => handleTimelineRate(activeShaft, i, e.target.value)}
                    style={{ width: 44, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, fontSize: 10, fontWeight: 700, textAlign: "right", color: "#163D4C" }}
                  />
                </div>
                {!done && (
                  <input
                    type="range" min="0.10" max="1.50" step="0.01" value={q.rate}
                    onChange={e => handleTimelineRate(activeShaft, i, e.target.value)}
                    style={{ width: "100%", height: 3, accentColor: "#163D4C" }}
                  />
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 8, color: "#888", marginTop: 4, lineHeight: 1.4 }}>
            Calendar-based rates, independent of formation boundaries. ~code shows expected formation at quarter start.
          </div>
        </>
      )}

      <div style={{ marginTop: 8, borderTop: "1px solid #e0e0e0", paddingTop: 6 }}>
        <div style={{ fontSize: 8, color: "#888", marginBottom: 2, textTransform: "uppercase" }}>{otherKey}</div>
        <div style={{ fontSize: 10, color: "#333", lineHeight: 1.5 }}>
          Depth: <b>{SHAFTS[otherKey].actual[SHAFTS[otherKey].actual.length - 1].depth.toFixed(1)}m</b> / {SHAFTS[otherKey].finalDepth}m<br />
          PTD: <b>{(
            (SHAFTS[otherKey].actual[SHAFTS[otherKey].actual.length - 1].depth - SHAFTS[otherKey].preSink) /
            daysBetween(SHAFTS[otherKey].mainSinkStart, today)
          ).toFixed(3)} m/d</b><br />
          {rateMode === "geology" && <>End: <b>{fmtDate(otherProj.completionDate)}</b></>}
        </div>
      </div>
    </div>
  );
}
