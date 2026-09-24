import { fmtDate } from "../engine/projection.js";

export default function KPIBar({ activeShaft, setActiveShaft, shaft, curDepth, totalRemaining, pctComplete, weightedRate, projDays, projEnd, revbStatus }) {
  const kpis = [
    { l: "Depth",     v: `${curDepth.toFixed(1)}m`,           c: "#F5B216" },
    { l: "Remaining", v: `${totalRemaining.toFixed(1)}m`,     c: "#fff" },
    { l: "Complete",  v: `${pctComplete}%`,                   c: "#F5B216" },
    { l: "Wtd Rate",  v: `${weightedRate.toFixed(2)} m/d`,    c: "#fff" },
    { l: "Days Left", v: `${projDays}`,                       c: "#F5B216" },
    { l: "End Date",  v: projEnd ? fmtDate(projEnd) : "Extend qtrs", c: "#F5B216" },
    { l: "vs Rev-B",  v: `${revbStatus.variance >= 0 ? "+" : ""}${revbStatus.variance.toFixed(1)}m`, c: revbStatus.variance >= 0 ? "#8fd694" : "#ff8a8a" },
  ];
  return (
    <>
      <div style={{ background: "#E60033", padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: 1.5 }}>AVMA</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Shaft Schedule Visualiser</span>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {["VS7", "VS8"].map(k => (
            <button key={k} onClick={() => setActiveShaft(k)} style={{
              padding: "4px 16px", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 11,
              background: activeShaft === k ? "#fff" : "rgba(255,255,255,0.18)",
              color: activeShaft === k ? "#E60033" : "#fff",
            }}>{k}</button>
          ))}
        </div>
      </div>
      <div style={{ background: "#163D4C", padding: "5px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
        <div style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>
          {shaft.label} — Ø{shaft.diameter} — RL {shaft.braceRL}m — Final {shaft.finalDepth}m
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 7, textTransform: "uppercase", letterSpacing: 0.3 }}>{k.l}</div>
              <div style={{ color: k.c, fontSize: 11, fontWeight: 700 }}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
