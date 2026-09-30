import { daysBetween, fmtDate } from "../engine/projection.js";

const NAVY = "#163D4C", GOLD = "#b8860b", GREEN = "#2a7a2a";
const RED_TEXT = "#C4002B"; // brand red darkened for text on tinted backgrounds
const slipColor = v => (v > 0 ? RED_TEXT : GREEN);
const fmtSlip = v => (v > 0 ? `+${v}` : `${v}`);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDay = d => `${d.getDate()} ${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
const round2 = v => Math.round(v * 100) / 100;
const fmtM = v => (Number.isInteger(v) ? `${v}` : v.toFixed(1));

// Short row label from the workbook's milestone name, e.g. "-247 to -457mBC - Ground Support
// Pattern Type A" -> "Type A"; events lose the shaft prefix.
const sinkNote = name => {
  const type = /Pattern Type ([A-Z])/.exec(name)?.[1];
  return [/sump/i.test(name) && "Sump", type && `Type ${type}`, /non permitted/i.test(name) && "NPE"].filter(Boolean).join(" · ");
};
const eventName = name => name.replace(/^VS[78]\s+/, "");

// Rates the "All sinking stages" buttons apply: a share of each stage's Rev-B rate.
export const scaledRate = (revRate, factor) => Math.min(2, Math.max(0.05, round2(revRate * factor)));

export default function RevBStages({
  activeShaft, curDepth, plan, adjusted, achieved,
  setStageRate, setEventDays, scaleStages, resetStages,
}) {
  const sinks = plan.stages.filter(s => s.sink);
  const factors = [
    ...(achieved ? [{ f: achieved, l: `Achieved to date (${Math.round(achieved * 100)}%)`, wide: true }] : []),
    { f: 0.8, l: "80%" }, { f: 0.9, l: "90%" }, { f: 1, l: "Rev-B" },
  ];
  const isFactor = f => sinks.length > 0 && sinks.every(s => s.rate === scaledRate(s.revRate, f));
  const lastSink = sinks.at(-1);
  const last = plan.stages.at(-1);
  const input = { width: 44, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, fontSize: 11, fontWeight: 700, textAlign: "right", color: NAVY };

  const endLine = s => {
    const slip = daysBetween(s.revBDate, new Date(s.end));
    return (
      <div style={{ fontSize: 10, color: "#666", marginTop: 1 }}>
        {s.sink ? `Rev-B ${s.revRate.toFixed(2)} m/d` : `Rev-B ${s.revDays} d`} · ends {fmtDay(new Date(s.end))}{" "}
        <span style={{ color: slipColor(slip), fontWeight: 700 }}>{fmtSlip(slip)} d</span>
      </div>
    );
  };

  const row = s => {
    const changed = s.sink ? s.rate !== s.revRate : s.days !== s.revDays;
    const border = changed ? `1px solid ${GOLD}` : "1px solid #ccc";
    return (
      <div key={s.index} title={s.name} style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
          {s.sink ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, whiteSpace: "nowrap" }}>
              {fmtM(Math.round(Math.max(s.from, curDepth) * 10) / 10)}–{fmtM(s.to)}m
              <span style={{ fontWeight: 400, color: "#666", marginLeft: 4 }}>{sinkNote(s.name)}</span>
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {eventName(s.name)}
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            {s.sink ? (
              <input
                type="number" step="0.01" min="0.05" max="2.00" value={s.rate}
                aria-label={`${s.name} rate, metres per day`}
                onChange={e => setStageRate(s.name, e.target.value)}
                style={{ ...input, border }}
              />
            ) : (
              <input
                type="number" step="1" min="0" max="365" value={s.days}
                aria-label={`${s.name} duration, days`}
                onChange={e => setEventDays(s.name, e.target.value)}
                style={{ ...input, width: 38, border }}
              />
            )}
            <span style={{ fontSize: 10, color: "#666", width: 22 }}>{s.sink ? "m/d" : "days"}</span>
          </span>
        </div>
        {s.sink && (
          <input
            type="range" min="0.10" max="2.00" step="0.01" value={s.rate}
            aria-label={`${s.name} rate slider`}
            onChange={e => setStageRate(s.name, e.target.value)}
            style={{ display: "block", width: "100%", height: 3, margin: "8px 0 9px", accentColor: NAVY }}
          />
        )}
        {endLine(s)}
      </div>
    );
  };

  const heading = text => (
    <div style={{ fontSize: 10, color: "#666", margin: "6px 0 3px", textTransform: "uppercase", borderTop: "1px solid #e0e0e0", paddingTop: 5 }}>{text}</div>
  );

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {activeShaft} Rev-B stages from {fmtM(Math.round(curDepth * 10) / 10)}m
      </div>

      {plan.stages.length === 0 ? (
        <div style={{ fontSize: 11, color: "#555" }}>No Rev-B stages left below this depth.</div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: "#333", background: "#fff", border: "1px solid #ddd", borderRadius: 3, padding: "5px 6px", marginBottom: 8, lineHeight: 1.5 }}>
            {lastSink && (() => {
              const slip = daysBetween(lastSink.revBDate, new Date(lastSink.end));
              return <div>Final depth <b>{fmtDate(new Date(lastSink.end))}</b> <span style={{ color: slipColor(slip), fontWeight: 700 }}>{fmtSlip(slip)} d</span></div>;
            })()}
            {last && (() => {
              const slip = daysBetween(last.revBDate, new Date(last.end));
              return <div>Finish <b>{fmtDate(new Date(last.end))}</b> <span style={{ color: slipColor(slip), fontWeight: 700 }}>{fmtSlip(slip)} d</span> <span style={{ color: "#666" }}>vs Rev-B</span></div>;
            })()}
          </div>

          {sinks.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "#666", marginBottom: 3, textTransform: "uppercase" }}>All sinking stages at</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 8 }}>
                {factors.map(({ f, l, wide }) => {
                  const on = isFactor(f);
                  return (
                    <button
                      key={l}
                      onClick={() => scaleStages(f)}
                      aria-pressed={on}
                      title={f === 1 ? "Rev-B rates" : `${Math.round(f * 100)}% of each stage's Rev-B rate`}
                      style={{
                        flex: wide ? "1 0 100%" : 1, padding: "3px 0", border: "1px solid #ccc", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: 600,
                        background: on ? NAVY : "#fff", color: on ? "#fff" : NAVY,
                      }}
                    >{l}</button>
                  );
                })}
              </div>
            </>
          )}

          {plan.stages.filter(s => !s.post).map(row)}
          {plan.stages.some(s => s.post) && heading("After final depth")}
          {plan.stages.filter(s => s.post).map(row)}
        </>
      )}

      <div style={{ fontSize: 10, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
        The rest of Rev-B from today&apos;s depth, stage by stage. Events hold the depth for their duration. Days are
        slip against each milestone&apos;s Rev-B date. Changed values have a gold outline.
        {adjusted && (
          <>
            {" "}
            <button
              onClick={resetStages}
              style={{ background: "none", border: "none", padding: 0, color: NAVY, fontSize: 10, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}
            >Reset {activeShaft} to Rev-B</button>
          </>
        )}
      </div>
    </>
  );
}
