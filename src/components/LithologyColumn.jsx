import { LITHO_COLORS, DARK_CODES } from "../data/shafts.js";
import useElementHeight from "./useElementHeight.js";

export default function LithologyColumn({
  shaft, activeShaft, curDepth, depthOverrides, setDepthOverrides,
  handleDepthChange, hoveredFm, setHoveredFm,
}) {
  // The column stretches to the available height; 2px allows for its border.
  const [colRef, colH] = useElementHeight();
  const px = Math.max(0, colH - 2) / shaft.finalDepth;

  return (
    <div style={{ width: 160, flexShrink: 0, background: "#fff", borderRight: "1px solid #ddd", padding: "10px 6px", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#163D4C", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>Lithology</div>

      <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
        <label style={{ fontSize: 10, color: "#666" }}>Depth:</label>
        <input
          type="number" step="0.1" value={curDepth}
          onChange={e => handleDepthChange(e.target.value)}
          style={{ width: 56, padding: "2px 4px", border: "1px solid #ccc", borderRadius: 3, fontSize: 12, fontWeight: 600 }}
        />
        <span style={{ fontSize: 10, color: "#666" }}>m</span>
        {depthOverrides[activeShaft] !== null && (
          <button
            onClick={() => setDepthOverrides(p => ({ ...p, [activeShaft]: null }))}
            style={{ fontSize: 10, color: "#E60033", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >↺</button>
        )}
      </div>

      <div ref={colRef} style={{ display: "flex", gap: 0, flex: 1, minHeight: 240 }}>
        <div style={{ width: 28, flexShrink: 0, position: "relative", height: "100%" }}>
          {[0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, Math.round(shaft.finalDepth)]
            .filter(d => d <= shaft.finalDepth)
            .map(d => (
              <div key={d} style={{
                position: "absolute", top: d * px - 5, right: 2, fontSize: 9, color: "#666",
                fontWeight: d % 100 === 0 ? 600 : 400, lineHeight: "10px", textAlign: "right",
              }}>{d}</div>
            ))}
          <div style={{
            position: "absolute", top: curDepth * px - 5, right: 2, fontSize: 10, color: "#E60033",
            fontWeight: 700, lineHeight: "10px", textAlign: "right",
          }}>{curDepth.toFixed(0)}</div>
        </div>

        <div style={{ flex: 1, position: "relative", height: "100%", boxSizing: "border-box", border: "1px solid #888", borderRadius: 2, overflow: "hidden" }}>
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
                  color: DARK_CODES.has(fm.code) ? "#fff" : "#222",
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
              fontSize: 10, fontWeight: 800, color: "#666", letterSpacing: 2, zIndex: 5, pointerEvents: "none",
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

      <div style={{ marginTop: 4, display: "flex", alignItems: "center", columnGap: 8, rowGap: 2, flexWrap: "wrap", fontSize: 10, color: "#555" }}>
        {[
          { key: <svg width="10" height="10"><rect width="10" height="10" fill="url(#mH)" stroke="#999" strokeWidth="0.5" rx="1" /></svg>, l: "Mined" },
          { key: <div style={{ width: 10, height: 2, background: "#E60033", borderRadius: 1 }} />, l: "Current" },
          { key: <div style={{ width: 10, height: 0, borderTop: "1.5px dashed #F5B216" }} />, l: "Stand-off" },
        ].map(item => (
          <span key={item.l} style={{ display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>{item.key}{item.l}</span>
        ))}
      </div>

      <div style={{ marginTop: 5, fontSize: 10, color: "#555", lineHeight: 1.5, background: "#f8f8f8", borderRadius: 3, padding: "3px 6px", border: "1px solid #eee" }}>
        {[
          ["Hold point", shaft.holdPoint], ["Stand-off", shaft.standOff], ["Roadway roof", shaft.roadwayRoof],
          ["Final", shaft.finalDepth], ...(shaft.sumpDepth > 0 ? [["Sump", shaft.sumpDepth]] : []),
        ].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between" }}><span>{l}</span><b style={{ color: "#333" }}>{v}m</b></div>
        ))}
      </div>
    </div>
  );
}
