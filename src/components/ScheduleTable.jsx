import { LITHO_COLORS } from "../data/shafts.js";
import { daysBetween, fmtDate } from "../engine/projection.js";

export default function ScheduleTable({ shaft, projection, today, projEnd, projDays, totalRemaining, weightedRate, setHoveredFm }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
      <thead>
        <tr style={{ background: "#163D4C" }}>
          {["Formation", "From", "To", "Thick.", "Rem.", "Rate", "Days", "Act. Rate", "Entry", "Exit", ""].map(h => (
            <th key={h} style={{ padding: "4px 4px", color: "#fff", fontWeight: 600, fontSize: 8, textAlign: "left", whiteSpace: "nowrap", textTransform: "uppercase" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projection.formations.map((fm, i) => {
          const isA = fm.status === "active";
          const isC = fm.status === "complete";
          const origFm = shaft.formations.find(f => f.code === fm.code);
          const hasActual = origFm?.aStart && origFm?.aFin;
          const actDays = hasActual ? daysBetween(origFm.aStart, origFm.aFin) : null;
          const actRate = hasActual && actDays > 0 ? fm.thickness / actDays : null;
          const showActStart = origFm?.aStart;
          const showActFin = origFm?.aFin;
          return (
            <tr
              key={i}
              onMouseEnter={() => setHoveredFm(fm.code)}
              onMouseLeave={() => setHoveredFm(null)}
              style={{
                background: isA ? "#FFF8E8" : isC ? "#f0f0f0" : i % 2 === 0 ? "#fff" : "#fafafa",
                borderBottom: "1px solid #eee",
                opacity: isC ? 0.4 : 1,
              }}
            >
              <td style={{ padding: "3px 4px", fontWeight: 600, whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 2, marginRight: 3, background: LITHO_COLORS[fm.code], border: "1px solid rgba(0,0,0,0.1)", verticalAlign: "middle" }} />
                {fm.name}
              </td>
              <td style={{ padding: "3px 4px", textAlign: "right" }}>{fm.from}</td>
              <td style={{ padding: "3px 4px", textAlign: "right" }}>{fm.to}</td>
              <td style={{ padding: "3px 4px", textAlign: "right" }}>{fm.thickness.toFixed(1)}</td>
              <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: isA ? 700 : 400, color: isA ? "#E60033" : undefined }}>
                {isC ? "—" : `${fm.remaining}m`}
              </td>
              <td style={{ padding: "3px 4px", textAlign: "right" }}>{isC ? "—" : fm.rate.toFixed(2)}</td>
              <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: 600 }}>{isC ? "—" : fm.days.toFixed(0)}</td>
              <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: 700, color: actRate ? (actRate > 0.6 ? "#2a7a2a" : "#e65100") : "#aaa" }}>
                {actRate ? `${actRate.toFixed(2)}` : (isC && showActFin ? "—" : "")}
                {actDays ? <span style={{ fontWeight: 400, color: "#888", fontSize: 8 }}> ({actDays}d)</span> : ""}
              </td>
              <td style={{ padding: "3px 4px", whiteSpace: "nowrap", fontSize: 9 }}>
                {isC && showActStart ? fmtDate(showActStart) : fm.entryDate ? fmtDate(fm.entryDate) : "—"}
              </td>
              <td style={{ padding: "3px 4px", whiteSpace: "nowrap", fontSize: 9 }}>
                {isC && showActFin ? fmtDate(showActFin) : fm.exitDate ? fmtDate(fm.exitDate) : "—"}
              </td>
              <td style={{ padding: "3px 4px" }}>
                {isC
                  ? <span style={{ fontSize: 7, color: "#888" }}>✓</span>
                  : isA
                    ? <span style={{ fontSize: 7, color: "#E60033", fontWeight: 700 }}>● ACTIVE</span>
                    : <span style={{ fontSize: 7, color: "#bbb" }}>○</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr style={{ background: "#E60033", color: "#fff", fontWeight: 700 }}>
          <td style={{ padding: "5px 4px" }}>TOTAL</td>
          <td style={{ padding: "5px 4px", textAlign: "right" }}>0</td>
          <td style={{ padding: "5px 4px", textAlign: "right" }}>{shaft.finalDepth}</td>
          <td style={{ padding: "5px 4px", textAlign: "right" }}>{shaft.finalDepth}</td>
          <td style={{ padding: "5px 4px", textAlign: "right" }}>{totalRemaining.toFixed(1)}m</td>
          <td style={{ padding: "5px 4px", textAlign: "right" }}>{weightedRate.toFixed(2)}</td>
          <td style={{ padding: "5px 4px", textAlign: "right" }}>{projDays}</td>
          <td style={{ padding: "5px 4px" }}></td>
          <td style={{ padding: "5px 4px", fontSize: 9 }}>{fmtDate(today)}</td>
          <td style={{ padding: "5px 4px", fontSize: 9 }}>{projEnd ? fmtDate(projEnd) : "—"}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}
