// Rewrites assets/img/products/*.svg as image placeholders (hatched frame, colour halo, label). Run: node tools/demo-placeholders.mjs
import { readFileSync, writeFileSync, readdirSync } from "fs";
const dir = "assets/img/products";
// Label and halo colours per file (two hues per category, picked to read as the product family).
const META = {
  phone: ["Phone", "#5a68d4", "#9ec3ff"], "phone-slim": ["Phone", "#7fa6d6", "#c8dcf0"], "phone-fold": ["Phone", "#b9a6ff", "#5a68d4"],
  laptop: ["Laptop", "#f1c6d0", "#a5c8ff"], desktop: ["Desktop", "#c2aaff", "#f2e26a"], display: ["Display", "#a5c8ff", "#c2aaff"],
  mini: ["Mini", "#9aa7b4", "#c5cde0"], keyboard: ["Keyboard", "#c9ccd3", "#8fa3c8"], tablet: ["Tablet", "#9bd3ae", "#a8c7e0"],
  watch: ["Watch", "#e0572f", "#f08a6c"], "watch-rugged": ["Watch", "#d4b26a", "#e0572f"], band: ["Band", "#f2c4d4", "#2f6f8f"],
  earbuds: ["Earbuds", "#c8ccd2", "#9ec3ff"], headphones: ["Headphones", "#7fa6d6", "#d9a3a0"], speaker: ["Speaker", "#b6663e", "#d8cfb8"],
  headset: ["Headset", "#8fa3c8", "#d6c7e8"], tvbox: ["TV box", "#5b5b66", "#9ec3ff"], tag: ["Tag", "#c9d96b", "#9aa3ad"],
  case: ["Case", "#7a2e4d", "#f0c8b8"], charger: ["Charger", "#c9c9ce", "#a8c7e0"], giftcard: ["Gift card", "#6e7fa0", "#f2c94c"],
};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
  const key = f.replace(".svg", ""); const m = META[key]; if (!m) { console.log("skip", f); continue; }
  const [, , w, h] = readFileSync(`${dir}/${f}`, "utf8").match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
  const [label, a, b] = m; const s = Math.min(w, h); const fs = Math.round(s * 0.06); const r = Math.round(s * 0.06);
  const pw = Math.round(fs * (label.length * 0.62 + 5.2)); const ph = Math.round(fs * 2.3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label} image placeholder">
  <defs>
    <pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="#76767f" fill-opacity=".07"/><rect width="8" height="16" fill="#76767f" fill-opacity=".06"/></pattern>
    <radialGradient id="ga"><stop offset="0" stop-color="${a}" stop-opacity=".9"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <radialGradient id="gb"><stop offset="0" stop-color="${b}" stop-opacity=".75"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>
    <clipPath id="frame"><rect width="${w}" height="${h}" rx="${r}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${w}" height="${h}" fill="url(#hatch)"/>
    <circle cx="${w * 0.42}" cy="${h * 0.45}" r="${s * 0.42}" fill="url(#ga)"/>
    <circle cx="${w * 0.6}" cy="${h * 0.58}" r="${s * 0.38}" fill="url(#gb)"/>
  </g>
  <style>@media (max-width: 160px) { .label { display: none; } }</style>
  <g class="label"><rect x="${(w - pw) / 2}" y="${(h - ph) / 2}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="#fff" fill-opacity=".92"/>
  <text x="${w / 2}" y="${h / 2}" dy=".35em" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif" font-size="${fs}" fill="#1d1d1f"><tspan font-weight="600">${label}</tspan><tspan fill="#6e6e73"> · image</tspan></text></g>
</svg>
`;
  writeFileSync(`${dir}/${f}`, svg);
}
console.log("done");
