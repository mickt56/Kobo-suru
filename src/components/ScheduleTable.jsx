import { LITHO_COLORS } from "../data/shafts.js";
import { dateAtDepth, daysBetween, fmtDate } from "../engine/projection.js";

const NAVY = "#163D4C", RED = "#E60033", GREEN = "#2a7a2a", AMBER = "#a33a00";
const RED_TEXT = "#C4002B"; // brand red darkened for text on tinted backgrounds
const COLS = [
  { h: "Formation" }, { h: "From", n: 1 }, { h: "To", n: 1 }, { h: "Thick.", n: 1 }, { h: "Rem.", n: 1 },
  { h: "Rate m/d", n: 1 }, { h: "Days", n: 1 }, { h: "Act. rate", n: 1 }, { h: "Entry" }, { h: "Exit" },
  { h: "Rev-B exit", sep: 1 }, { h: "vs Rev-B (d)", n: 1 }, { h: "" },
];
const cell = { padding: "5px 6px", whiteSpace: "nowrap" };
const num = { ...cell, textAlign: "right" };
const signed = v => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`;

export default function ScheduleTable({
  shaft, projection, modeLabel, revbPts, today, projEnd, projDays, totalRemaining, weightedRate, setHoveredFm,
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, textTransform: "uppercase", marginBottom: 4 }}>
        Projection by formation <span style={{ fontWeight: 400, color: "#555", textTransform: "none" }}>· {modeLabel}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: NAVY }}>
            {COLS.map(c => (
              <th key={c.h} style={{
                ...cell, color: "#fff", fontWeight: 600, fontSize: 11, textTransform: "uppercase",
                textAlign: c.n ? "right" : "left", borderLeft: c.sep ? "1px solid rgba(255,255,255,0.3)" : undefined,
              }}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projection.formations.map((fm, i) => {
            const isA = fm.status === "active";
            const isC = fm.status === "complete";
            const noDates = !isC && !fm.exitDate; // beyond the end of the Timeline quarters
            const origFm = shaft.formations.find(f => f.code === fm.code);
            const hasActual = origFm?.aStart && origFm?.aFin;
            const actDays = hasActual ? daysBetween(origFm.aStart, origFm.aFin) : null;
            const actRate = hasActual && actDays > 0 ? fm.thickness / actDays : null;
            const entry = isC && origFm?.aStart ? origFm.aStart : fm.entryDate;
            const exit = isC ? origFm?.aFin ?? null : fm.exitDate;
            const revbT = dateAtDepth(revbPts, fm.to);
            const revbExit = revbT != null ? new Date(revbT) : null;
            const slip = exit && revbExit ? daysBetween(revbExit, exit) : null;
            return (
              <tr
                key={i}
                onMouseEnter={() => setHoveredFm(fm.code)}
                onMouseLeave={() => setHoveredFm(null)}
                style={{
                  background: isA ? "#FFF8E8" : isC ? "#f3f3f3" : i % 2 === 0 ? "#fff" : "#fafafa",
                  borderBottom: "1px solid #e8e8e8",
                  color: isC ? "#555" : "#222",
                }}
              >
                <td style={{ ...cell, fontWeight: 600 }}>
                  <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, marginRight: 6, background: LITHO_COLORS[fm.code], border: "1px solid rgba(0,0,0,0.2)", verticalAlign: "middle" }} />
                  {fm.name}
                </td>
                <td style={num}>{fm.from}</td>
                <td style={num}>{fm.to}</td>
                <td style={num}>{fm.thickness.toFixed(1)}</td>
                <td style={{ ...num, fontWeight: isA ? 700 : 400, color: isA ? RED_TEXT : undefined }}>{isC ? "—" : `${fm.remaining}m`}</td>
                <td style={num}>{isC || noDates ? "—" : fm.rate.toFixed(2)}</td>
                <td style={{ ...num, fontWeight: 600 }}>{isC || noDates ? "—" : fm.days.toFixed(0)}</td>
                <td style={{ ...num, fontWeight: 700, color: actRate ? (actRate >= fm.rate || actRate > 0.6 ? GREEN : AMBER) : "#555" }}>
                  {actRate ? actRate.toFixed(2) : ""}
                  {actDays ? <span style={{ fontWeight: 400, color: "#555", fontSize: 11 }}> ({actDays}d)</span> : ""}
                </td>
                <td style={cell}>{entry ? fmtDate(entry) : "—"}</td>
                <td style={cell}>{exit ? fmtDate(exit) : noDates ? <i style={{ color: "#555" }}>after last quarter</i> : "—"}</td>
                <td style={{ ...cell, borderLeft: "1px solid #e8e8e8" }}>{revbExit ? fmtDate(revbExit) : "—"}</td>
                <td style={{ ...num, fontWeight: 700, color: slip == null ? "#555" : slip > 0 ? RED_TEXT : GREEN }}>{slip == null ? "—" : signed(slip)}</td>
                <td style={cell}>
                  {isC
                    ? <span style={{ fontSize: 11, color: "#555" }}>✓ Done</span>
                    : isA
                      ? <span style={{ fontSize: 11, color: RED_TEXT, fontWeight: 700 }}>● Active</span>
                      : <span style={{ fontSize: 11, color: "#555" }}>○ Next</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: RED, color: "#fff", fontWeight: 700 }}>
            <td style={cell}>TOTAL</td>
            <td style={num}>0</td>
            <td style={num}>{shaft.finalDepth}</td>
            <td style={num}>{shaft.finalDepth}</td>
            <td style={num}>{totalRemaining.toFixed(1)}m</td>
            <td style={num}>{weightedRate.toFixed(2)}</td>
            <td style={num}>{projDays}</td>
            <td style={cell}></td>
            <td style={cell}>{fmtDate(today)}</td>
            <td style={cell}>{projEnd ? fmtDate(projEnd) : "—"}</td>
            <td style={cell} colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
      </div>
      <div style={{ fontSize: 11, color: "#555", marginTop: 6, lineHeight: 1.5 }}>
        Completed formations show actual entry and exit dates where recorded. Rev-B exit is when the daily Rev-B baseline reaches the formation's base;
        vs Rev-B is the actual or projected exit minus that date (positive = late). Formations above the Rev-B start depth have no Rev-B date.
      </div>
    </div>
  );
}
