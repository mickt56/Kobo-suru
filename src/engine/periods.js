import { depthAtTime, fmtShort, MS_DAY } from "./projection.js";

// Period colours, red through to blue, like the Deswik period progress plots.
const STOPS = ["#C8423B", "#C9713F", "#C79A46", "#B8C44B", "#7FC24A", "#3FBB5C", "#33B9A2", "#3BA3C6", "#3F6FC4"];

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

// `n` colours spread evenly across the palette (one period gets the first colour).
export function periodColors(n) {
  if (n <= 1) return [STOPS[0]];
  return Array.from({ length: n }, (_, i) => {
    const pos = (i / (n - 1)) * (STOPS.length - 1);
    const k = Math.min(STOPS.length - 2, Math.floor(pos));
    return mix(STOPS[k], STOPS[k + 1], pos - k);
  });
}

// The next `count` calendar months of a depth curve ([{date: ms, depth}]) from `today`: the first
// period runs from today to the end of the current month, the rest are whole months. Each period
// has its depth range and advance; periods after final depth is reached are left out.
export function forecastPeriods(points, today, count, finalDepth) {
  if (!count || !points?.length) return [];
  const last = points[points.length - 1];
  const at = t => Math.min(finalDepth, depthAtTime(points, t) ?? last.depth);
  const colors = periodColors(count);
  const out = [];
  for (let i = 0; i < count; i++) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const start = i === 0 ? today : monthStart;
    const end = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
    const from = at(start.getTime());
    if (from >= finalDepth - 1e-6) break;
    const to = at(end.getTime());
    const days = (end - start) / MS_DAY;
    out.push({
      key: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
      label: fmtShort(monthStart).replace("'", ""),
      start, end, from, to, metres: to - from, days, rate: (to - from) / days,
      partial: i === 0 && today.getDate() > 1,
      reachesFinal: to >= finalDepth - 1e-6,
      color: colors[i],
    });
  }
  return out;
}

// Dark or white text, whichever reads better on a period colour.
export function textOn(color) {
  const [r, g, b] = hex(color).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? "#1a1a1a" : "#ffffff";
}
