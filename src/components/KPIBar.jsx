import { fmtDate } from "../engine/projection.js";

const NAVY = "#163D4C", RED = "#E60033", GOLD = "#F5B216", AMBER = "#FFB74D";
const LABEL = { color: "rgba(255,255,255,0.78)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" };

function Kpi({ label, value, color = "#fff", sub, labelStyle }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...LABEL, ...labelStyle }}>{label}</div>
      <div style={{ color, fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 10, whiteSpace: "nowrap" }}>{sub}</div>}
    </div>
  );
}

export default function KPIBar({
  activeShaft, setActiveShaft, shaft, asOf, curDepth, actualDepth, overridden, resetDepth,
  totalRemaining, pctComplete, weightedRate, projDays, projEnd, modeLabel, revbGap, onPrint,
}) {
  const behind = revbGap.variance < 0;
  return (
    <div style={{ background: NAVY, padding: "8px 16px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", borderBottom: `3px solid ${RED}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ background: RED, color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: 1.5, padding: "6px 10px", borderRadius: 3 }}>AVMA</div>
        <div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>Shaft Schedule Visualiser</div>
          <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 11, whiteSpace: "nowrap" }}>
            {shaft.label} · Ø{shaft.diameter} · RL {shaft.braceRL}m · Final {shaft.finalDepth}m
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 3 }} role="group" aria-label="Shaft">
        {["VS7", "VS8"].map(k => (
          <button
            key={k}
            onClick={() => setActiveShaft(k)}
            aria-pressed={activeShaft === k}
            style={{
              padding: "6px 16px", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: activeShaft === k ? "#fff" : "rgba(255,255,255,0.14)", color: activeShaft === k ? RED : "#fff",
            }}
          >{k}</button>
        ))}
        <button
          onClick={onPrint}
          title="Print this shaft and tab, or choose Save as PDF in the print dialog"
          style={{ marginLeft: 8, padding: "6px 12px", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 12, background: "transparent", color: "#fff" }}
        >Print / PDF</button>
      </div>

      <div style={{ display: "flex", gap: 22, alignItems: "flex-start", marginLeft: "auto", flexWrap: "wrap" }}>
        {overridden ? (
          <div style={{ border: `1px solid ${AMBER}`, borderRadius: 4, padding: "2px 8px", background: "rgba(255,183,77,0.12)" }}>
            <div style={{ ...LABEL, color: AMBER, fontWeight: 700 }}>What-if depth</div>
            <div style={{ color: AMBER, fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{curDepth.toFixed(1)}m</div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, whiteSpace: "nowrap" }}>
              actual {actualDepth.toFixed(1)}m ·{" "}
              <button onClick={resetDepth} style={{ background: "none", border: "none", padding: 0, color: AMBER, fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>reset</button>
            </div>
          </div>
        ) : (
          <Kpi label="Depth" value={`${curDepth.toFixed(1)}m`} color={GOLD} />
        )}
        <Kpi label="Remaining" value={`${totalRemaining.toFixed(1)}m`} />
        <Kpi label="Complete" value={`${pctComplete}%`} color={GOLD} />
        <Kpi label="Wtd rate" value={weightedRate > 0 ? `${weightedRate.toFixed(2)} m/d` : "—"} />
        <Kpi label="Days left" value={`${projDays}`} color={GOLD} />
        <Kpi label="Projected end" value={projEnd ? fmtDate(projEnd) : "Extend qtrs"} color={GOLD} sub={modeLabel} />
        <Kpi
          label="vs Rev-B"
          value={`${behind ? "−" : "+"}${Math.abs(revbGap.variance).toFixed(1)}m`}
          color={behind ? "#ff9a9a" : "#8fd694"}
          sub={revbGap.daysBehind != null && behind ? `${revbGap.daysBehind} days behind` : null}
        />
        <div style={{ borderLeft: "1px solid rgba(255,255,255,0.25)", paddingLeft: 16 }}>
          <div style={LABEL}>Data as at</div>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", lineHeight: 1.2 }}>{fmtDate(asOf)}</div>
        </div>
      </div>
    </div>
  );
}
