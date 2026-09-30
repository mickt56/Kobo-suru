import { RATE_GROUPS, LOWER_CODES, PRESETS } from "../data/rates.js";
import {
  addDays, daysBetween, fmtDate, fmtShort, getFormationAt, getRateKey, typeColor,
} from "../engine/projection.js";
import { WINDOWS, STATS } from "../engine/stats.js";
import RevBStages from "./RevBStages.jsx";

export default function RatesPanel({
  shaft, activeShaft, today, curDepth,
  rateMode, setRateMode,
  rates, setRates, handleRate,
  timelineRates, handleTimelineRate, addQuarter, curveReachesFinal,
  setHoveredFm,
  stats, choice, applyScenario, resetSettings,
  revbStages,
}) {
  const win = stats.windows[choice.window];
  return (
    <div className="no-print" style={{ width: 270, flexShrink: 0, background: "#fafafa", borderRight: "1px solid #ddd", padding: "10px 10px", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {[{ id: "geology", l: "Geology" }, { id: "timeline", l: "Timeline" }, { id: "stats", l: "Stats" }, { id: "revb", l: "Rev-B" }].map(m => (
          <button
            key={m.id}
            onClick={() => setRateMode(m.id)}
            aria-pressed={rateMode === m.id}
            style={{
              flex: "1 1 auto", padding: "4px 3px", border: "1px solid #ccc", borderRadius: 3, cursor: "pointer",
              fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.2,
              background: rateMode === m.id ? "#163D4C" : "#fff",
              color: rateMode === m.id ? "#fff" : "#163D4C",
            }}
          >{m.l}</button>
        ))}
      </div>

      {rateMode === "geology" && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#163D4C", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>{g.label}</span>
                  </div>
                  <input
                    type="number" step="0.01" min="0.10" max="2.00" value={rates[g.id]}
                    aria-label={`${g.label} rate, metres per day`}
                    onChange={e => handleRate(g.id, e.target.value)}
                    style={{ width: 44, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, fontSize: 11, fontWeight: 700, textAlign: "right", color: typeColor(g.type) }}
                  />
                </div>
                <input
                  type="range" min="0.10" max="1.50" step="0.01" value={rates[g.id]}
                  aria-label={`${g.label} rate slider`}
                  onChange={e => handleRate(g.id, e.target.value)}
                  style={{ width: "100%", height: 3, accentColor: typeColor(g.type) }}
                />
              </div>
            );
          })}
          <div style={{ marginTop: 8, borderTop: "1px solid #e0e0e0", paddingTop: 6 }}>
            <div style={{ fontSize: 10, color: "#666", marginBottom: 3, textTransform: "uppercase" }}>Presets</div>
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
                  fontSize: 11, fontWeight: 600, color: "#163D4C", textAlign: "left",
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
          <div style={{ fontSize: 11, fontWeight: 700, color: "#163D4C", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {activeShaft} Quarterly Rates (m/day)
          </div>
          {timelineRates[activeShaft].map((q, i) => {
            const depthAtQ = curDepth + timelineRates[activeShaft].slice(0, i).reduce((s, qq) => {
              const es = qq.start > today ? qq.start : today;
              return es >= qq.end ? s : s + qq.rate * daysBetween(es, qq.end);
            }, 0);
            const fm = getFormationAt(shaft, Math.min(shaft.finalDepth - 0.1, depthAtQ));
            const done = depthAtQ >= shaft.finalDepth;
            return (
              <div key={i} style={{ marginBottom: 5, opacity: q.end < today || done ? 0.75 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#163D4C" }}>{q.label}</span>
                    {fm && !done && <span style={{ fontSize: 10, color: "#666", marginLeft: 4 }}>~{fm.code}</span>}
                    {done && <span style={{ fontSize: 10, color: "#2a7a2a", marginLeft: 4 }}>✓ Complete</span>}
                  </div>
                  <input
                    type="number" step="0.01" min="0.10" max="2.00" value={q.rate} disabled={done}
                    aria-label={`${q.label} rate, metres per day`}
                    onChange={e => handleTimelineRate(activeShaft, i, e.target.value)}
                    style={{ width: 44, padding: "1px 2px", border: "1px solid #ccc", borderRadius: 3, fontSize: 11, fontWeight: 700, textAlign: "right", color: "#163D4C" }}
                  />
                </div>
                {!done && (
                  <input
                    type="range" min="0.10" max="1.50" step="0.01" value={q.rate}
                    aria-label={`${q.label} rate slider`}
                    onChange={e => handleTimelineRate(activeShaft, i, e.target.value)}
                    style={{ width: "100%", height: 3, accentColor: "#163D4C" }}
                  />
                )}
              </div>
            );
          })}
          {!curveReachesFinal && (
            <div role="status" style={{ fontSize: 11, color: "#7a2e00", background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: 3, padding: "4px 6px", margin: "4px 0" }}>
              These quarters end before final depth. Add a quarter or raise the rates.
            </div>
          )}
          <button
            onClick={() => addQuarter(activeShaft)}
            style={{ width: "100%", padding: "4px 0", marginTop: 2, border: "1px dashed #163D4C", borderRadius: 3, background: "#fff", color: "#163D4C", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
          >+ Add quarter</button>
          <div style={{ fontSize: 10, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
            Calendar-based rates, independent of formation boundaries. ~code shows expected formation at quarter start.
          </div>
        </>
      )}

      {rateMode === "stats" && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#163D4C", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {activeShaft} Rate from past performance
          </div>
          <div style={{ fontSize: 10, color: "#666", marginBottom: 3, textTransform: "uppercase" }}>Look-back window</div>
          <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
            {WINDOWS.map(w => (
              <button
                key={w.id}
                onClick={() => applyScenario(w.id, choice.stat)}
                aria-pressed={choice.window === w.id}
                style={{
                  flex: 1, padding: "3px 0", border: "1px solid #ccc", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: 600,
                  background: choice.window === w.id ? "#163D4C" : "#fff", color: choice.window === w.id ? "#fff" : "#163D4C",
                }}
              >{w.short}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>
            {win.n} months, {fmtShort(win.from)} to {fmtShort(win.to)} · st. dev. {win.sd.toFixed(3)}
          </div>
          {STATS.map(s => {
            const rate = win[s.id];
            const on = choice.stat === s.id;
            const finish = addDays(today, Math.max(0, shaft.finalDepth - curDepth) / rate);
            return (
              <button
                key={s.id}
                onClick={() => applyScenario(choice.window, s.id)}
                aria-pressed={choice.stat === s.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "4px 6px", marginBottom: 2,
                  border: `1px solid ${on ? "#163D4C" : "#ddd"}`, borderRadius: 3, cursor: "pointer",
                  background: on ? "#163D4C" : "#fff", color: on ? "#fff" : "#333", fontSize: 11, textAlign: "left",
                }}
              >
                <span style={{ fontWeight: 700 }}>
                  {s.label}{s.hint && <span style={{ fontWeight: 400, opacity: 0.7 }}> ({s.hint})</span>}
                </span>
                <span>
                  <b>{rate.toFixed(3)}</b> m/d · {fmtDate(finish)}
                </span>
              </button>
            );
          })}
          <div style={{ fontSize: 10, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
            Constant rate to final depth from today. P25/P75 are percentiles of the monthly rate: P75 is the faster month rate, not a 75%-confidence date. See the Scenarios tab to compare all of them.
          </div>
        </>
      )}

      {rateMode === "revb" && <RevBStages activeShaft={activeShaft} curDepth={curDepth} {...revbStages} />}

      <div style={{ marginTop: 14, paddingTop: 8, borderTop: "1px solid #e0e0e0", fontSize: 10, color: "#555", lineHeight: 1.4 }}>
        Your shaft, tab, rate mode and rates are remembered in this browser.{" "}
        <button
          onClick={resetSettings}
          style={{ background: "none", border: "none", padding: 0, color: "#163D4C", fontSize: 10, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}
        >Reset all to defaults</button>
      </div>
    </div>
  );
}
