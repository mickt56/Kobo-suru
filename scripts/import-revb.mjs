// Reads the Rev-B tracking workbook and writes src/data/revb.js.
// Usage: npm run import:revb -- "path/to/Rev-B_Tracking.xlsx"
//
// Expects sheets "VS7 Rev-B" and "VS8 Rev-B" (daily schedule + actuals) and
// "Rev-B Tables" (one task table per shaft). Columns are located by header text.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const SHAFTS = ["VS7", "VS8"];
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "revb.js");

const norm = s => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

// Unwrap exceljs cell values: formula results, rich text, and errors (#N/A -> null).
function val(cell) {
  let v = cell?.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) v = v.result;
    else if ("richText" in v) v = v.richText.map(t => t.text).join("");
    else if ("error" in v) v = null;
    else if ("text" in v) v = v.text;
  }
  if (v && typeof v === "object" && !(v instanceof Date) && "error" in v) v = null;
  return v ?? null;
}
const num = v => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !isNaN(+v) ? +v : null);
// Excel dates carry no timezone; exceljs returns them at UTC midnight.
const iso = v => (v instanceof Date ? v.toISOString().slice(0, 10) : null);
const round = (v, dp) => (v == null ? null : Math.round(v * 10 ** dp) / 10 ** dp);

function findColumns(ws, wanted, maxHeaderRow = 6) {
  for (let r = 1; r <= maxHeaderRow; r++) {
    const cols = {};
    ws.getRow(r).eachCell((cell, c) => {
      const h = norm(val(cell));
      for (const [key, label] of Object.entries(wanted)) if (h === norm(label) && !cols[key]) cols[key] = c;
    });
    if (Object.keys(cols).length === Object.keys(wanted).length) return { headerRow: r, cols };
  }
  throw new Error(`${ws.name}: could not find headers ${Object.values(wanted).join(", ")}`);
}

function readDaily(wb, shaft) {
  const ws = wb.getWorksheet(`${shaft} Rev-B`);
  if (!ws) throw new Error(`Missing sheet "${shaft} Rev-B"`);
  const { headerRow, cols } = findColumns(ws, {
    date: "Date",
    stage: "Schedule Stage",
    sch: "Schedule Cumulative Depth",
    act: "Actual Shaft Depth",
  });
  const daily = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const date = iso(val(row.getCell(cols.date)));
    const sch = num(val(row.getCell(cols.sch)));
    if (!date || sch == null) continue;
    const act = num(val(row.getCell(cols.act)));
    // The workbook stores depths as negative metres below collar.
    daily.push([date, round(Math.abs(sch), 2), act == null ? null : round(Math.abs(act), 2)]);
  }
  return daily;
}

function readTaskTables(wb) {
  const ws = wb.getWorksheet("Rev-B Tables");
  if (!ws) throw new Error('Missing sheet "Rev-B Tables"');
  const labels = {
    rate: "Rev-B Advance m/day", metres: "Metres", days: "Duration",
    revB: "Scheduled Date", actual: "Actual Date", schDepth: "Schedule Cumulative Depth",
  };
  const tables = {};
  for (let r = 1; r <= 6; r++) {
    ws.getRow(r).eachCell((cell, c0) => {
      if (norm(val(cell)) !== "task name") return;
      const cols = {};
      for (let c = c0 + 1; c <= c0 + 12; c++) {
        const h = norm(val(ws.getRow(r).getCell(c)));
        for (const [key, label] of Object.entries(labels)) if (h === norm(label) && !cols[key]) cols[key] = c;
      }
      const missing = Object.keys(labels).filter(k => !cols[k]);
      if (missing.length) throw new Error(`Rev-B Tables: task table at column ${c0} missing ${missing.join(", ")}`);

      // First row after the header is the "Main Sink" start row (start date + start depth).
      const startRow = ws.getRow(r + 1);
      const start = { date: iso(val(startRow.getCell(cols.revB))), depth: Math.abs(num(val(startRow.getCell(cols.schDepth)))) };
      const milestones = [];
      let depth = start.depth;
      for (let rr = r + 2; rr <= ws.rowCount; rr++) {
        const row = ws.getRow(rr);
        const name = String(val(row.getCell(c0)) ?? "").trim();
        if (!name) break;
        const metres = num(val(row.getCell(cols.metres)));
        const from = depth;
        if (metres) depth = round(depth + metres, 2);
        milestones.push({
          name,
          rate: round(num(val(row.getCell(cols.rate))), 4),
          metres: metres || null,
          days: num(val(row.getCell(cols.days))),
          from,
          to: depth,
          revB: iso(val(row.getCell(cols.revB))),
          actual: iso(val(row.getCell(cols.actual))),
        });
      }
      const counts = SHAFTS.map(s => milestones.filter(m => m.name.includes(s)).length);
      const shaft = counts[0] === counts[1] ? null : SHAFTS[counts.indexOf(Math.max(...counts))];
      if (!shaft) throw new Error(`Rev-B Tables: cannot tell which shaft the table at column ${c0} belongs to`);
      tables[shaft] = { start, milestones };
    });
  }
  for (const s of SHAFTS) if (!tables[s]) throw new Error(`Rev-B Tables: no task table found for ${s}`);
  return tables;
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run import:revb -- "path/to/Rev-B_Tracking.xlsx"');
  process.exit(1);
}
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const tables = readTaskTables(wb);

const REVB = {};
for (const s of SHAFTS) {
  const daily = readDaily(wb, s);
  const lastActual = daily.filter(d => d[2] != null).at(-1);
  REVB[s] = { ...tables[s], asOf: lastActual?.[0] ?? null, daily };
  console.log(`${s}: ${daily.length} days (${daily[0][0]} to ${daily.at(-1)[0]}), ` +
    `actuals to ${lastActual?.[0]} at ${lastActual?.[2]}m, ${tables[s].milestones.length} milestones`);
}

const body = SHAFTS.map(s => {
  const { start, asOf, milestones, daily } = REVB[s];
  return `  ${s}: {
    start: ${JSON.stringify(start)},
    asOf: ${JSON.stringify(asOf)},
    milestones: [
${milestones.map(m => `      ${JSON.stringify(m)},`).join("\n")}
    ],
    // [date, Rev-B schedule depth (m), actual depth (m) or null]
    daily: [
${daily.map(d => `      ${JSON.stringify(d)},`).join("\n")}
    ],
  },`;
}).join("\n");

fs.writeFileSync(OUT, `// Generated by scripts/import-revb.mjs from ${path.basename(file)}. Do not edit by hand:
// re-run \`npm run import:revb -- <workbook>\` instead. Depths are metres below collar (positive).
export const REVB = {
${body}
};
`);
console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
