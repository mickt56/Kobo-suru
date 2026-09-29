// Builds the whole app as one self-contained HTML file that opens offline by double-clicking,
// for sharing with people who don't run the project: dist-single/AVMA_Schedule_Visualiser.html
// Usage: npm run build:single
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(root, "dist-single", ".build");
const out = path.join(root, "dist-single", "AVMA_Schedule_Visualiser.html");

await build({ root, base: "./", logLevel: "warn", build: { outDir: tmp, emptyOutDir: true } });

let html = fs.readFileSync(path.join(tmp, "index.html"), "utf8");
const inline = file => fs.readFileSync(path.join(tmp, file), "utf8");
html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/,
  (_, f) => `<script type="module">${inline(f).replace(/<\/script/gi, "<\\/script")}</script>`);
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/,
  (_, f) => `<style>${inline(f)}</style>`);
html = html.replace(/<link rel="icon"[^>]*>/,
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(inline("favicon.svg").trim())}">`);
if (/(src|href)="\.\/assets/.test(html)) throw new Error("An asset was not inlined; the single file would be incomplete.");

fs.writeFileSync(out, html);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${path.relative(root, out)} (${Math.round(fs.statSync(out).size / 1024)} KB). Open it in a browser; no install needed.`);
