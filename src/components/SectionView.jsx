import { useState } from "react";
import { LITHO_COLORS, DARK_CODES } from "../data/shafts.js";
import { HEADFRAMES } from "../data/headframes.js";
import { PERIOD_COUNTS } from "../settings.js";
import { fmtDate } from "../engine/projection.js";
import useElementSize from "./useElementSize.js";

const NAVY = "#163D4C", RED = "#E60033", RED_TEXT = "#C4002B", GOLD = "#F5B216", SAGE = "#6D8F80";
const K = 3;            // px per metre for the headframe and the shaft's width (exaggerated)
const DEPTH_MAX = 600;  // shared depth scale so both shafts compare directly
const CX = 150;         // shaft centreline in the drawing
const AXIS_X = 42;
const ZOOMS = [{ id: 1, l: "Fit" }, { id: 2, l: "×2" }, { id: 4, l: "×4" }];
const HF_TOP = 8 + 40 * K + 4; // collar (ground) line: room for a 40 m headframe above it

const rl = (shaft, depth) => (shaft.braceRL - depth).toFixed(1);

// Spreads labels vertically so they don't overlap, keeping them as close as possible to their targets.
function spread(items, gap, maxY) {
  const out = [...items].sort((a, b) => a.y - b.y).map(i => ({ ...i, ly: i.y }));
  for (let i = 1; i < out.length; i++) out[i].ly = Math.max(out[i].ly, out[i - 1].ly + gap);
  if (out.length && out[out.length - 1].ly > maxY) {
    out[out.length - 1].ly = maxY;
    for (let i = out.length - 2; i >= 0; i--) out[i].ly = Math.min(out[i].ly, out[i + 1].ly - gap);
  }
  return out;
}

function Headframe({ hf, gy }) {
  const X = m => CX + m * K, Y = m => gy - m * K;
  const t = hf.tower;
  const lv = [0, ...t.levels, t.top];
  const p0 = [t.half, hf.backstay.topY], p1 = [hf.backstay.footX, 0];
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const n = [-(p1[1] - p0[1]) / len * 1.3, (p1[0] - p0[0]) / len * 1.3]; // rail offset, 1.3 m
  const rail = (t1, side) => [p0[0] + (p1[0] - p0[0]) * t1 + n[0] * side, p0[1] + (p1[1] - p0[1]) * t1 + n[1] * side];
  const zig = Array.from({ length: 15 }, (_, i) => rail(i / 14, i % 2)).map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");
  const h = hf.house, mid = (h.from + h.to) / 2;
  const sheaveR = 1.3;
  return (
    <g aria-hidden="true">
      {/* annex (winch / compressor building) */}
      <path d={`M${X(hf.annex.from)},${Y(0)} V${Y(hf.annex.eaves)} L${X(-t.half)},${Y(hf.annex.roofAtTower)} V${Y(0)} Z`}
        fill="#EEF2F3" stroke={NAVY} strokeWidth="0.8" />
      {/* tower: frame, levels, cross-bracing, gable */}
      <rect x={X(-t.half)} y={Y(t.top)} width={2 * t.half * K} height={t.top * K} fill="#fff" stroke={NAVY} strokeWidth="1.2" />
      {lv.slice(1, -1).map(l => <line key={l} x1={X(-t.half)} x2={X(t.half)} y1={Y(l)} y2={Y(l)} stroke={NAVY} strokeWidth="0.8" />)}
      {lv.slice(0, -1).map((l, i) => (
        <g key={`b${l}`} stroke={NAVY} strokeWidth="0.6" opacity="0.8">
          <line x1={X(-t.half)} y1={Y(l)} x2={X(t.half)} y2={Y(lv[i + 1])} />
          <line x1={X(t.half)} y1={Y(l)} x2={X(-t.half)} y2={Y(lv[i + 1])} />
        </g>
      ))}
      <polyline points={`${X(-t.half - 0.6)},${Y(t.top)} ${X(0)},${Y(t.ridge)} ${X(t.half + 0.6)},${Y(t.top)}`} fill="none" stroke={RED} strokeWidth="1.6" />
      {/* sheave deck and sheaves */}
      <rect x={X(-t.half)} y={Y(t.levels[t.levels.length - 1] + 2)} width={2 * t.half * K} height={2 * K} fill={GOLD} opacity="0.85" />
      {hf.sheaves.map(s => <circle key={s} cx={X(s)} cy={Y(hf.sheaveY)} r={sheaveR * K} fill="#fff" stroke={NAVY} strokeWidth="1" />)}
      {/* ropes to the winder drums */}
      {hf.drums.map(d => (
        <line key={d.x} x1={X(hf.sheaves[1] + sheaveR)} y1={Y(hf.sheaveY)} x2={X(d.x)} y2={Y(2 * d.r + 0.3)} stroke={SAGE} strokeWidth="0.8" />
      ))}
      {/* backstay leg */}
      <line x1={X(p0[0])} y1={Y(p0[1])} x2={X(p1[0])} y2={Y(p1[1])} stroke={NAVY} strokeWidth="1" />
      <line x1={X(rail(0, 1)[0])} y1={Y(rail(0, 1)[1])} x2={X(rail(1, 1)[0])} y2={Y(rail(1, 1)[1])} stroke={NAVY} strokeWidth="1" />
      <polyline points={zig} fill="none" stroke={RED} strokeWidth="0.6" />
      {/* winder house */}
      <path d={`M${X(h.from)},${Y(0)} V${Y(h.eaves)} L${X(mid)},${Y(h.ridge)} L${X(h.to)},${Y(h.eaves)} V${Y(0)} Z`} fill="#F6F7F8" stroke={NAVY} strokeWidth="0.8" />
      <polyline points={`${X(h.from)},${Y(h.eaves)} ${X(mid)},${Y(h.ridge)} ${X(h.to)},${Y(h.eaves)}`} fill="none" stroke={RED} strokeWidth="1.6" />
      {hf.drums.map(d => <circle key={d.x} cx={X(d.x)} cy={Y(d.r + 0.3)} r={d.r * K} fill={GOLD} stroke={NAVY} strokeWidth="0.8" />)}
      <rect x={X(hf.control.from)} y={Y(hf.control.h)} width={(hf.control.to - hf.control.from) * K} height={hf.control.h * K} fill="#DDE5E8" stroke={NAVY} strokeWidth="0.6" />
    </g>
  );
}

function ShaftSection({ k, data, width, height, today }) {
  const { shaft, curDepth, periods } = data;
  const gy = HF_TOP;
  const py = Math.max(0.2, (height - gy - 26) / DEPTH_MAX);
  const y = d => gy + d * py;
  const bw = parseFloat(shaft.diameter) * K, bx = CX - bw / 2;
  const final = shaft.finalDepth;
  const lx = CX + bw / 2 + 40;

  const fmLabels = spread(
    shaft.formations.map(fm => ({ key: fm.code + fm.from, y: Math.max(gy + 14, y((fm.from + fm.to) / 2) + 3.5), text: fm.name, mid: (fm.from + fm.to) / 2 })),
    11, height - 6,
  );
  const markers = [
    { key: "cur", d: curDepth, text: `${curDepth.toFixed(1)} m`, color: RED_TEXT, bold: true, above: true },
    shaft.holdPoint && { key: "hold", d: shaft.holdPoint, text: `Hold pt ${shaft.holdPoint}`, color: RED_TEXT, dash: "4 2", line: RED },
    shaft.standOff && { key: "so", d: shaft.standOff, text: `Stand-off ${shaft.standOff}`, color: "#8a6100", dash: "4 2", line: GOLD },
    shaft.roadwayRoof && shaft.roadwayRoof < final - 0.5 && { key: "bt", d: shaft.roadwayRoof, text: `B/through ${shaft.roadwayRoof}`, color: NAVY, line: NAVY },
    { key: "fin", d: final, text: `Final ${final.toFixed(1)}`, color: NAVY, bold: true },
  ].filter(Boolean);
  const leftLabels = spread(markers.map(m => ({ ...m, y: y(m.d) + (m.above ? -4 : 3) })), 12, height - 4);
  const remaining = Math.max(0, final - curDepth);
  const minedPx = curDepth * py;

  return (
    <svg width={width} height={height} role="img" aria-label={`${k} shaft section with forecast period bands`} style={{ display: "block" }}>
      {/* ground */}
      <line x1={0} x2={width} y1={gy} y2={gy} stroke="#7A6A55" strokeWidth="1.5" />
      {Array.from({ length: Math.floor(width / 10) }, (_, i) => (
        <line key={i} x1={i * 10} y1={gy + 1} x2={i * 10 - 5} y2={gy + 6} stroke="#B5A88F" strokeWidth="0.7" />
      ))}
      <Headframe hf={HEADFRAMES[k]} gy={gy} />

      {/* depth axis */}
      <line x1={AXIS_X} x2={AXIS_X} y1={y(0)} y2={y(final)} stroke="#999" strokeWidth="0.8" />
      {Array.from({ length: Math.floor(final / 50) + 1 }, (_, i) => i * 50).map(d => (
        <g key={d}>
          <line x1={AXIS_X - 4} x2={AXIS_X} y1={y(d)} y2={y(d)} stroke="#999" strokeWidth="0.8" />
          <text x={AXIS_X - 6} y={y(d) + 3.5} textAnchor="end" fontSize="10" fontWeight={d % 100 === 0 ? 700 : 400} fill="#555">{d}</text>
          {py * 50 >= 24 && <text x={AXIS_X - 6} y={y(d) + 13} textAnchor="end" fontSize="9" fill="#888">{(shaft.braceRL - d).toFixed(0)}RL</text>}
        </g>
      ))}

      {/* barrel: lithology, mined, forecast periods */}
      {shaft.formations.map(fm => (
        <rect key={fm.code + fm.from} x={bx} y={y(fm.from)} width={bw} height={Math.max(0.5, (fm.to - fm.from) * py)} fill={LITHO_COLORS[fm.code]} />
      ))}
      <rect x={bx} y={y(0)} width={bw} height={minedPx} fill="url(#mH)" />
      {periods.map(p => (
        <rect key={p.key} x={bx} y={y(p.from)} width={bw} height={Math.max(1, (p.to - p.from) * py)} fill={p.color}>
          <title>{`${p.label}: ${p.from.toFixed(1)}–${p.to.toFixed(1)} m (${p.metres.toFixed(1)} m)`}</title>
        </rect>
      ))}
      {periods.slice(1).map(p => <line key={`s${p.key}`} x1={bx} x2={bx + bw} y1={y(p.from)} y2={y(p.from)} stroke="#fff" strokeWidth="0.8" />)}
      <rect x={bx} y={y(0)} width={bw} height={final * py} fill="none" stroke="#555" strokeWidth="1" />
      {minedPx > 130 && (
        <text transform={`translate(${CX + 3.5},${y(curDepth) - 10}) rotate(-90)`} fontSize="10" fontWeight="700" fill="#333" letterSpacing="1">
          {k} MINED SHAFT
        </text>
      )}

      {/* breakthrough roadway stub (VS8 breaks through at final depth; VS7 above its sump) */}
      {shaft.roadwayRoof && (
        <rect x={bx + bw} y={y(shaft.roadwayRoof) - Math.max(2, 4 * py)} width={34} height={Math.max(2, 4 * py)} fill="#8C8C8C" opacity="0.8" />
      )}

      {/* markers across the barrel */}
      {markers.filter(m => m.line).map(m => (
        <line key={m.key} x1={bx - 5} x2={bx + bw + 5} y1={y(m.d)} y2={y(m.d)} stroke={m.line} strokeWidth="1.3" strokeDasharray={m.dash} />
      ))}
      <line x1={AXIS_X} x2={bx + bw + 6} y1={y(curDepth)} y2={y(curDepth)} stroke={RED} strokeWidth="2" />

      {/* remaining dimension */}
      {remaining * py > 24 && (
        <g stroke={NAVY} strokeWidth="0.8" fill={NAVY}>
          <line x1={bx - 10} x2={bx - 10} y1={y(curDepth)} y2={y(final)} />
          <path d={`M${bx - 13},${y(curDepth) + 5} L${bx - 10},${y(curDepth)} L${bx - 7},${y(curDepth) + 5}`} fill="none" />
          <path d={`M${bx - 13},${y(final) - 5} L${bx - 10},${y(final)} L${bx - 7},${y(final) - 5}`} fill="none" />
          <text stroke="none" transform={`translate(${bx - 13},${(y(curDepth) + y(final)) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fontWeight="700">
            {remaining.toFixed(1)} m
          </text>
        </g>
      )}

      {/* marker labels (left) and formation labels (right) */}
      {leftLabels.map(m => (
        <text key={m.key} x={bx - 24} y={m.ly} textAnchor="end" fontSize="10" fontWeight={m.bold ? 700 : 400} fill={m.color}>{m.text}</text>
      ))}
      {fmLabels.map(l => (
        <g key={l.key}>
          <polyline points={`${bx + bw + 1},${y(l.mid)} ${lx - 14},${y(l.mid)} ${lx - 4},${l.ly - 3.5}`} fill="none" stroke="#bbb" strokeWidth="0.6" />
          <text x={lx} y={l.ly} fontSize="10" fill={l.mid < curDepth ? "#666" : "#222"}>{l.text}</text>
        </g>
      ))}
    </svg>
  );
}

function StatusTable({ k, data, today }) {
  const { shaft, curDepth, actualDepth, projEnd, modeLabel } = data;
  const whatIf = Math.abs(curDepth - actualDepth) > 1e-6;
  const rows = [
    { l: `${k} target depth`, v: `${shaft.finalDepth.toFixed(1)} m`, lc: RED_TEXT },
    { l: whatIf ? "What-if depth" : `Current depth · ${fmtDate(today)}`, v: `${curDepth.toFixed(1)} m`, bg: "#E3F2DF" },
    { l: "Remaining", v: `${(shaft.finalDepth - curDepth).toFixed(1)} m`, bg: "#FCE6D2" },
    { l: "Current RL", v: `${rl(shaft, curDepth)} m` },
    { l: "% sunk", v: `${Math.round((curDepth / shaft.finalDepth) * 100)}%`, bg: "#FDF0CD", vc: NAVY },
    { l: "Forecast final depth", v: projEnd ? fmtDate(projEnd) : "beyond the months set" },
  ];
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, marginBottom: 6 }}>
      <tbody>
        {rows.map(r => (
          <tr key={r.l}>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", textAlign: "right", color: r.lc ?? "#333", fontWeight: r.lc ? 700 : 400, background: r.bg }}>{r.l}</td>
            <td style={{ border: "1px solid #ccc", padding: "3px 6px", fontWeight: 700, color: r.vc ?? "#222", whiteSpace: "nowrap", background: r.bg }}>{r.v}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={2} style={{ padding: "3px 2px 0", fontSize: 10, color: "#666" }}>Forecast at {modeLabel}</td>
        </tr>
      </tbody>
    </table>
  );
}

function PeriodLegend({ periods }) {
  if (!periods.length) return <div style={{ fontSize: 11, color: "#666" }}>Period bands off.</div>;
  const total = periods.reduce((s, p) => s + p.metres, 0);
  const th = { padding: "3px 4px", background: NAVY, color: "#fff", fontWeight: 700, fontSize: 10, textAlign: "right", whiteSpace: "nowrap" };
  const td = { padding: "2px 4px", borderBottom: "1px solid #eee", textAlign: "right", whiteSpace: "nowrap" };
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
      <thead>
        <tr>
          <th style={{ ...th, textAlign: "left" }} colSpan={2}>Period</th>
          <th style={th}>Depth (m)</th>
          <th style={th}>Adv. m</th>
          <th style={th}>m/d</th>
        </tr>
      </thead>
      <tbody>
        {periods.map(p => (
          <tr key={p.key}>
            <td style={{ ...td, width: 14, padding: "2px 2px 2px 0" }}><span aria-hidden="true" style={{ display: "block", width: 14, height: 12, background: p.color, borderRadius: 2 }} /></td>
            <td style={{ ...td, textAlign: "left", fontWeight: 700, color: NAVY }}>{p.label}{p.partial ? "*" : ""}</td>
            <td style={td}>{p.from.toFixed(1)}–{p.to.toFixed(1)}</td>
            <td style={{ ...td, fontWeight: 700 }}>{p.metres.toFixed(1)}</td>
            <td style={td}>{p.rate.toFixed(2)}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={3} style={{ ...td, textAlign: "left", fontWeight: 700, borderBottom: "none" }}>Total {periods.length} period{periods.length > 1 ? "s" : ""}</td>
          <td style={{ ...td, fontWeight: 700, borderBottom: "none" }}>{total.toFixed(1)}</td>
          <td style={{ ...td, borderBottom: "none" }} />
        </tr>
      </tbody>
      {periods[0].partial && (
        <caption style={{ captionSide: "bottom", textAlign: "left", fontSize: 10, color: "#666", paddingTop: 2 }}>
          * from {fmtDate(periods[0].start)} to month end
        </caption>
      )}
    </table>
  );
}

// Section tab: both shafts as long sections (like the Deswik sink status plot), with the next N
// months of forecast advance coloured by period.
export default function SectionView({ shafts, activeShaft, setActiveShaft, today, periodCount, setPeriodCount }) {
  const [zoom, setZoom] = useState(1);
  const [bodyRef, measured] = useElementSize();
  // Print (html.printing, see App.css): lay out at a fixed virtual page and scale it to the paper
  // width, so both shafts fit one A4 landscape page.
  const printing = typeof document !== "undefined" && document.documentElement.classList.contains("printing");
  const PRINT_W = 1380, PRINT_H = 750;
  const printScale = printing && measured.width ? measured.width / PRINT_W : 1;
  const { width, height } = printing ? { width: PRINT_W, height: PRINT_H } : measured;
  const zoomNow = printing ? 1 : zoom;
  const keys = Object.keys(shafts);
  const panelW = Math.max(0, width / keys.length - 8);
  const wide = panelW >= 620;
  const sideW = 250;
  const svgW = Math.max(380, (wide ? panelW - sideW - 10 : panelW) - 18); // less panel padding and border
  const baseH = Math.max(420, (wide ? height - 34 : height * 0.64));
  const svgH = baseH * zoomNow;
  const exaggeration = K / Math.max(0.2, (svgH - HF_TOP - 26) / DEPTH_MAX);

  const btn = on => ({
    padding: "3px 9px", border: "1px solid #ccc", borderRadius: 3, cursor: "pointer", fontSize: 11, fontWeight: 700,
    background: on ? NAVY : "#fff", color: on ? "#fff" : NAVY,
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }} role="group" aria-label="Forecast months">
          <span style={{ fontSize: 11, color: "#555", marginRight: 3 }}>Forecast months</span>
          {PERIOD_COUNTS.map(n => (
            <button key={n} onClick={() => setPeriodCount(n)} aria-pressed={periodCount === n} style={btn(periodCount === n)}>{n === 0 ? "Off" : n}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }} role="group" aria-label="Drawing scale">
          <span style={{ fontSize: 11, color: "#555", marginRight: 3 }}>Scale</span>
          {ZOOMS.map(z => <button key={z.id} onClick={() => setZoom(z.id)} aria-pressed={zoom === z.id} style={btn(zoom === z.id)}>{z.l}</button>)}
        </div>
        <span style={{ fontSize: 10, color: "#666" }}>
          Depth to scale. Headframe and shaft width drawn {exaggeration.toFixed(1)}× larger (schematic, traced from the long elevations).
        </span>
      </div>

      <div ref={bodyRef} style={printing
        ? { flex: "0 0 auto", height: PRINT_H * printScale, overflow: "hidden" }
        : { flex: 1, minHeight: 0, overflow: "auto" }}>
       <div style={{
         display: "flex", gap: 8,
         ...(printing ? { width: PRINT_W, transform: `scale(${printScale})`, transformOrigin: "0 0" } : {}),
       }}>
        {keys.map(k => {
          const data = shafts[k];
          const active = k === activeShaft;
          return (
            <section
              key={k} aria-label={`${k} section`}
              style={{ flex: `0 0 ${panelW}px`, display: "flex", flexDirection: wide ? "row" : "column", gap: 10, border: `1.5px solid ${active ? NAVY : "#ddd"}`, borderRadius: 4, padding: 6, minWidth: 0, alignSelf: "flex-start" }}
            >
              <div style={{ flex: "0 0 auto", overflowX: "auto" }}>
                <ShaftSection k={k} data={data} width={svgW} height={svgH} today={today} />
              </div>
              <div style={{ flex: wide ? `0 0 ${sideW}px` : "1 1 auto", minWidth: 0 }}>
                <button
                  onClick={() => setActiveShaft(k)} aria-pressed={active}
                  title={active ? "Rates panel and header show this shaft" : "Show this shaft in the rates panel and header"}
                  style={{ ...btn(active), width: "100%", fontSize: 13, padding: "5px 8px", marginBottom: 6, textAlign: "left" }}
                >{data.shaft.label}{active ? "  ·  selected" : ""}</button>
                <StatusTable k={k} data={data} today={today} />
                <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, margin: "8px 0 3px", textTransform: "uppercase", letterSpacing: 0.3 }}>
                  Forecast periods
                </div>
                <PeriodLegend periods={data.periods} />
              </div>
            </section>
          );
        })}
       </div>
      </div>
    </div>
  );
}
