// Remembers the viewer's choices in this browser (localStorage), so a reload keeps the same view.
// Everything read back is validated: anything unknown or out of range falls back to the default.
// What-if depths are deliberately not stored, so the app always reopens on real progress.
import { generateMonths } from "./engine/projection.js";

const KEY = "avma-visualiser:settings:v1";
const RATE_MIN = 0.05, RATE_MAX = 2.0;
const okRate = v => typeof v === "number" && v >= RATE_MIN && v <= RATE_MAX;

export function readSettings() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {}; // storage blocked (private window, previews) or corrupt: use defaults
  }
}

export function writeSettings(settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable: settings just won't persist
  }
}

export function clearSettings() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}

export const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

// Geology rates: saved values for known groups, defaults for the rest.
export function restoreRates(saved, defaults) {
  const out = { ...defaults };
  if (saved && typeof saved === "object") {
    for (const id of Object.keys(defaults)) if (okRate(saved[id])) out[id] = saved[id];
  }
  return out;
}

// Scenario choice per shaft: { window, stat } with known ids only.
export function restoreChoice(saved, defaults, windowIds, statIds) {
  const out = {};
  for (const [shaft, def] of Object.entries(defaults)) {
    const s = saved?.[shaft];
    out[shaft] = {
      window: pick(s?.window, windowIds, def.window),
      stat: pick(s?.stat, statIds, def.stat),
    };
  }
  return out;
}

// Rev-B stage adjustments per shaft, keyed by milestone name: {rate} for sinking stages, {days}
// for events. Adjustments for milestones no longer in the workbook are dropped.
const okDays = v => Number.isInteger(v) && v >= 0 && v <= 365;
export function restoreRevbAdjust(saved, revb) {
  const out = {};
  for (const [shaft, r] of Object.entries(revb)) {
    out[shaft] = {};
    for (const m of r.milestones) {
      const s = saved?.[shaft]?.[m.name];
      if (m.metres ? okRate(s?.rate) : okDays(s?.days)) out[shaft][m.name] = m.metres ? { rate: s.rate } : { days: s.days };
    }
  }
  return out;
}

const monthIndex = key => {
  const m = /^(\d{4})-(\d{2})$/.exec(key ?? "");
  return m ? +m[1] * 12 + (+m[2] - 1) : null;
};
// Older saves held quarters ("Q3 2026"): each quarter's rate applies to its three months.
const quarterMonths = label => {
  const m = /^Q([1-4]) (\d{4})$/.exec(label ?? "");
  if (!m) return [];
  const first = (+m[1] - 1) * 3;
  return [0, 1, 2].map(i => `${m[2]}-${String(first + i + 1).padStart(2, "0")}`);
};

export const serializeTimeline = timeline =>
  Object.fromEntries(Object.entries(timeline).map(([shaft, ms]) => [shaft, ms.map(m => ({ key: m.key, rate: m.rate }))]));

// Months always start at the month containing `today` (24 by default). Saved rates are matched by
// month key; if the viewer had added months, the list runs to the last saved one (capped at 60).
export function restoreTimeline(saved, today, defaultRates) {
  const out = {};
  for (const [shaft, defaultRate] of Object.entries(defaultRates)) {
    const list = Array.isArray(saved?.[shaft]) ? saved[shaft] : [];
    const byKey = new Map();
    for (const item of list) {
      if (!okRate(item?.rate)) continue;
      if (monthIndex(item.key) != null) byKey.set(item.key, item.rate);
      else for (const k of quarterMonths(item.label)) byKey.set(k, item.rate);
    }
    const first = generateMonths(today, 1)[0];
    const lastSaved = Math.max(0, ...[...byKey.keys()].map(monthIndex));
    const count = Math.min(60, Math.max(24, lastSaved - monthIndex(first.key) + 1));
    out[shaft] = generateMonths(today, count, defaultRate).map(m => ({ ...m, rate: byKey.get(m.key) ?? defaultRate }));
  }
  return out;
}

export const PERIOD_COUNTS = [0, 3, 6, 9, 12, 18, 24];
export const restorePeriodCount = (saved, fallback) => (PERIOD_COUNTS.includes(saved) ? saved : fallback);
