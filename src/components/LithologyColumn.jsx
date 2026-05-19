import { LITHO_COLORS, DARK_CODES } from "../data/shafts.js";

const COL_HEIGHT = 500;

export default function LithologyColumn({
  shaft, activeShaft, curDepth, depthOverrides, setDepthOverrides,
  handleDepthChange, hoveredFm, setHoveredFm,
}) {
  const px = COL_HEIGHT / shaft.finalDepth;

  return (
    <div style={{ width: 160, flexShrink: 0, background: "#fff", borderRight: "1px solid #ddd", padding: "10px 6px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#163D4C", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>Lithology</div>

      <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 8, color: "#888" }}>Depth:</label>
        <input
          type="number" step="0.1" value={curDepth}
          onChange={e => handleDepthChange(e.target.value)}
          style={{ width: 56, padding: "2px 4px", border: "1px solid #ccc", borderRadius: 3, fontSize: 11, fontWeight: 600 }}
        />
        <span style={{ fontSize: 7, color: "#aaa" }}>m</span>
        {depthOverrides[activeShaft] !== null && (
          <button
            onClick={() => setDepthOverrides(p => ({ ...p, [activeShaft]: null }))}
            style={{ fontSize: 7, color: "#E60033", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >↺</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ width: 28, flexShrink: 0, position: "relative", height: COL_HEIGHT }}>
          {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, Math.round(shaft.finalDepth)]
            .filter(d => d <= shaft.finalDepth)
            .map(d => (
              <div key={d} style={{
                position: "absolute", top: d * px - 5, right: 2, fontSize: 6, color: "#888",
                fontWeight: d % 100 === 0 ? 600 : 400, lineHeight: "10px", textAlign: "right",
              }}>{d}</div>
            ))}
          <div style={{
            position: "absolute", top: curDepth * px - 5, right: 2, fontSize: 7, color: "#E60033",
            fontWeight: 700, lineHeight: "10px", textAlign: "right",
          }}>{curDepth.toFixed(0)}</div>
        </div>

        <div style={{ flex: 1, position: "relative", height: COL_HEIGHT, border: "1px solid #888", borderRadius: 2, overflow: "hidden" }}>
          {shaft.formations.map((fm, i) => {
            const top = fm.from * px;
            const h = (fm.to - fm.from) * px;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredFm(fm.code)}
                onMouseLeave={() => setHoveredFm(null)}
                style={{
                  position: "absolute", top, left: 0, right: 0, height: h,
                  background: LITHO_COLORS[fm.code], borderBottom: "1px solid rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: h > 22 ? 7 : 0, fontWeight: 700,
                  color: DARK_CODES.has(fm.code) ? "#fff" : "#444",
                  outline: hoveredFm === fm.code ? "2px solid #E60033" : "none",
                  outlineOffset: -2,
                  zIndex: hoveredFm === fm.code ? 3 : 1,
                }}
              >{h > 28 ? fm.code : ""}</div>
            );
          })}
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: curDepth * px, zIndex: 4, pointerEvents: "none" }}>
            <rect width="100%" height="100%" fill="url(#mH)" opacity="0.65" />
          </svg>
          {curDepth * px > 30 && (
            <div style={{
              position: "absolute", top: (curDepth * px) / 2 - 6, left: 0, right: 0, textAlign: "center",
              fontSize: 7, fontWeight: 800, color: "#777", letterSpacing: 2, zIndex: 5, pointerEvents: "none",
            }}>MINED</div>
          )}
          <div style={{ position: "absolute", top: curDepth * px - 1, left: 0, right: 0, height: 2, background: "#E60033", zIndex: 6 }} />
          {shaft.standOff && (
            <div style={{ position: "absolute", top: shaft.standOff * px, left: 0, right: 0, height: 0, zIndex: 3, borderTop: "1.5px dashed #F5B216" }} />
          )}
          {[0, 100, 200, 300, 400, 500].filter(d => d <= shaft.finalDepth).map(d => (
            <div key={d} style={{ position: "absolute", top: d * px, left: 0, width: 4, borderTop: "1px solid rgba(0,0,0,0.2)", zIndex: 2 }} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <svg width="10" height="10"><rect width="10" height="10" fill="url(#mH)" stroke="#999" strokeWidth="0.5" rx="1" /></svg>
        <span style={{ fontSize: 7, color: "#888" }}>Mined</span>
        <div style={{ width: 10, height: 2, background: "#E60033", borderRadius: 1 }} />
        <span style={{ fontSize: 7, color: "#888" }}>Current</span>
        <div style={{ width: 10, height: 0, borderTop: "1.5px dashed #F5B216" }} />
        <span style={{ fontSize: 7, color: "#888" }}>Stand-off</span>
      </div>

      <div style={{ marginTop: 5, fontSize: 7, color: "#666", lineHeight: 1.5, background: "#f8f8f8", borderRadius: 3, padding: "3px 5px", border: "1px solid #eee" }}>
        <div>Hold: <b>{shaft.holdPoint}m</b> · Stand-off: <b>{shaft.standOff}m</b></div>
        <div>Roadway: <b>{shaft.roadwayRoof}m</b> · Final: <b>{shaft.finalDepth}m</b></div>
        {shaft.sumpDepth > 0 && <div>Sump: <b>{shaft.sumpDepth}m</b></div>}
      </div>
    </div>
  );
}
