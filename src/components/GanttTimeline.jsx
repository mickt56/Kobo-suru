import { LITHO_COLORS } from "../data/shafts.js";
import { MS_DAY, daysBetween, fmtDate, fmtShort } from "../engine/projection.js";

// Bars are sized relative to the row so they grow when rows stretch to fill the pane.
const LABEL_W = 180, PLAN_TOP = "16%", PROJ_TOP = "52%", BAR_H = "30%";

export default function GanttTimeline({
  shaft, ganttPlanned, projection, modeLabel, today, projEnd, projDays, ptdDays, setHoveredFm,
}) {
  const ganttStart = shaft.mainSinkStart;
  const ends = [
    ...ganttPlanned.map(g => g.exitDate.getTime()),
    ...projection.formations.filter(f => f.exitDate).map(f => f.exitDate.getTime()),
  ];
  const ganttEnd = new Date(Math.max(...ends) + 45 * MS_DAY);
  const ganttTotalDays = daysBetween(ganttStart, ganttEnd);
  const todayPct = (daysBetween(ganttStart, today) / ganttTotalDays) * 100;

  const ticks = [];
  let d = new Date(ganttStart.getFullYear(), Math.floor(ganttStart.getMonth() / 3) * 3, 1);
  while (d <= ganttEnd) {
    const p = (daysBetween(ganttStart, d) / ganttTotalDays) * 100;
    if (p >= 0 && p <= 100) ticks.push({ d: new Date(d), p });
    d = new Date(d.getFullYear(), d.getMonth() + 3, 1);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
        {[{ f: "#163D4C", o: 0.2, l: "Geology-rate plan (from main sink start)" }, { f: "litho", o: 1, l: `Projected (${modeLabel})` }].map((leg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 16, height: 8, background: leg.f === "litho" ? "#AACFE8" : leg.f, opacity: leg.o, borderRadius: 2, border: "1px solid rgba(0,0,0,0.15)" }} />
            <span style={{ fontSize: 11, color: "#444" }}>{leg.l}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="16" height="8"><rect width="16" height="8" fill="url(#mHd)" rx="2" /></svg>
          <span style={{ fontSize: 11, color: "#444" }}>Mined</span>
        </div>
      </div>

      <div style={{ overflowX: "auto", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ position: "relative", marginLeft: LABEL_W, height: 18, marginBottom: 1 }}>
          {ticks.map((t, i) => (
            <div key={i} style={{
              position: "absolute", left: `${t.p}%`, fontSize: 11, color: "#555", fontWeight: 600,
              whiteSpace: "nowrap", transform: "translateX(-50%)", borderLeft: "1px solid #ddd", paddingLeft: 2,
            }}>{fmtShort(t.d)}</div>
          ))}
        </div>

        {ganttPlanned.map((fm, i) => {
          const ps = (daysBetween(ganttStart, fm.entryDate) / ganttTotalDays) * 100;
          const pw = (fm.days / ganttTotalDays) * 100;
          const pf = projection.formations.find(f => f.code === fm.code);
          const isC = pf?.status === "complete";
          const isA = pf?.status === "active";
          const hp = pf?.entryDate && pf?.exitDate;
          const prs = hp ? (daysBetween(ganttStart, pf.entryDate) / ganttTotalDays) * 100 : 0;
          const prw = hp ? (daysBetween(pf.entryDate, pf.exitDate) / ganttTotalDays) * 100 : 0;
          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", flex: "1 1 18px", minHeight: 18, maxHeight: 44, marginBottom: 1 }}
              onMouseEnter={() => setHoveredFm(fm.code)}
              onMouseLeave={() => setHoveredFm(null)}
            >
              <div style={{
                width: LABEL_W, flexShrink: 0, fontSize: 11, fontWeight: 600, color: "#333",
                display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: LITHO_COLORS[fm.code], border: "1px solid rgba(0,0,0,0.2)", flexShrink: 0 }} />
                {fm.name}
              </div>
              <div style={{ flex: 1, position: "relative", height: "100%", background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 1, background: "#E60033", zIndex: 5, opacity: 0.4 }} />
                <div style={{ position: "absolute", left: `${ps}%`, width: `${pw}%`, top: PLAN_TOP, height: BAR_H, minHeight: 5, background: "#163D4C", opacity: 0.12, borderRadius: 2 }} />
                {(isC || isA) && (
                  <svg style={{ position: "absolute", left: `${ps}%`, width: `${isC ? pw : Math.max(0, todayPct - ps)}%`, top: PLAN_TOP, height: BAR_H, minHeight: 5, borderRadius: 2, overflow: "hidden" }}>
                    <rect width="100%" height="100%" fill="url(#mHd)" rx="2" />
                  </svg>
                )}
                {hp && !isC && (
                  <>
                    <div style={{
                      position: "absolute", left: `${prs}%`, width: `${prw}%`, top: PROJ_TOP, height: BAR_H, minHeight: 5,
                      background: LITHO_COLORS[fm.code], borderRadius: 2, border: "1px solid rgba(0,0,0,0.2)",
                      boxShadow: isA ? "0 0 0 1.5px #E60033" : "none",
                    }} />
                    {/* Day count just past the bar's end, so it stays readable however short the bar is */}
                    <div style={{
                      position: "absolute", left: `calc(${prs + prw}% + 4px)`, top: PROJ_TOP, height: BAR_H, minHeight: 5,
                      display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: "#333", whiteSpace: "nowrap",
                    }}>{pf.days.toFixed(0)}d</div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ position: "relative", marginLeft: LABEL_W, height: 16, marginTop: 2 }}>
          <div style={{
            position: "absolute", left: `${todayPct}%`, transform: "translateX(-50%)",
            fontSize: 11, fontWeight: 700, color: "#C4002B", whiteSpace: "nowrap",
          }}>▼ {fmtDate(today)}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, padding: "7px 12px", background: "#f8f8f8", borderRadius: 4, border: "1px solid #e0e0e0", fontSize: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div><span style={{ color: "#666" }}>Start:</span> <b>{fmtDate(shaft.mainSinkStart)}</b></div>
        <div><span style={{ color: "#666" }}>Elapsed:</span> <b>{ptdDays}d</b></div>
        <div><span style={{ color: "#666" }}>Remaining:</span> <b style={{ color: "#C4002B" }}>{typeof projDays === "number" ? `${projDays}d` : projDays}</b></div>
        <div><span style={{ color: "#666" }}>End:</span> <b style={{ color: "#163D4C" }}>{projEnd ? fmtDate(projEnd) : "—"}</b></div>
      </div>
    </div>
  );
}
