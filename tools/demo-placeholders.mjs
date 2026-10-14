// Demo-mode product visuals: a transparent frame with one centred pill, "<Product> image (detail)".
// Source images are mostly cut-outs on a transparent background, so the placeholder marks nothing but the label.
//   node tools/demo-placeholders.mjs
// 1. Rewrites assets/img/products/<kind>.svg (no detail) and <kind>--<detail>.svg (one file per detail in use).
// 2. Points every <img> of the demo pages to the file that carries its detail: the alt text when there is one,
//    else the view of a gallery slide (front, back, side…).
// 3. Rewrites the inline placeholders of the configurators, accessories and band pages the same way.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const DIR = "assets/img/products";
const PAGES = ["index.html", ...readdirSync("pages").filter((f) => f.endsWith(".html")).map((f) => `pages/${f}`)];
const KIND = {
  phone: "Phone", "phone-slim": "Phone", "phone-fold": "Phone", laptop: "Laptop", desktop: "Desktop", display: "Display",
  mini: "Mini", keyboard: "Keyboard", tablet: "Tablet", watch: "Watch", "watch-rugged": "Watch", band: "Band",
  earbuds: "Earbuds", headphones: "Headphones", speaker: "Speaker", headset: "Headset", tvbox: "TV box", tag: "Tag",
  case: "Case", charger: "Charger", giftcard: "Gift card",
};
const VIEWS = ["front", "back", "side", "close-up", "in use", "detail"];
const FONT = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif`;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const n = (v) => +v.toFixed(1);

// One pill centred in a w × h frame: "<Label> image" on the first line, the detail in grey on a second line.
// Widths are estimated from the text (system font, ~0.56 em per character).
function pill(w, h, label, detail, fs, word = "image") {
  const head = word ? `${label} ${word}` : label;
  const sub = detail ? `(${detail})` : "";
  let size = fs;
  const width = () => Math.max(head.length, sub.length * 0.85) * size * 0.56 + size * 2.4;
  while (width() > w * 0.92 && size > 6) size -= 0.5;
  const pw = n(width()), ph = n(size * (sub ? 3.4 : 2.2)), y0 = (h - ph) / 2;
  const line1 = `<tspan font-weight="600">${xml(label)}</tspan>${word ? ` ${word}` : ""}`;
  return `<rect x="${n((w - pw) / 2)}" y="${n(y0)}" width="${pw}" height="${ph}" rx="${n(Math.min(ph / 2, size * 1.1))}" fill="#e8e8ed"/>
  <text text-anchor="middle" font-family="${FONT}" font-size="${n(size)}" fill="#1d1d1f"><tspan x="${n(w / 2)}" y="${n(y0 + size * 1.45)}">${line1}</tspan>${sub ? `<tspan x="${n(w / 2)}" y="${n(y0 + size * 2.65)}" font-size="${n(size * 0.85)}" fill="#6e6e73">${xml(sub)}</tspan>` : ""}</text>`;
}

// File version: below 200 px wide the full pill would be unreadable, so a larger short pill (label only) replaces it.
function fileSVG(w, h, label, detail) {
  const s = Math.min(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${xml(label)} image${detail ? ` (${xml(detail)})` : ""}">
  <style>.short { display: none; } @media (max-width: 200px) { .full { display: none; } .short { display: inline; } }</style>
  <g class="full">${pill(w, h, label, detail, s * 0.065)}</g>
  <g class="short">${pill(w, h, label, "", h * 0.14, "")}</g>
</svg>
`;
}

// Inline version (large slots only): the full pill.
const inlineBody = (w, h, label, detail, word) => pill(w, h, label, detail, Math.min(w, h) * 0.065, word);

const viewBoxOf = (kind) => readFileSync(`${DIR}/${kind}.svg`, "utf8").match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
const sizes = Object.fromEntries(Object.keys(KIND).map((k) => [k, viewBoxOf(k)]));
const files = new Map(); // file name -> [kind, detail]
for (const k of Object.keys(KIND)) files.set(`${k}.svg`, [k, ""]);

for (const page of PAGES) {
  let d = readFileSync(page, "utf8");

  // <img> placeholders: detail from the alt text, else from the slide position inside a gallery.
  let slide = -1, slideAt = -1e9;
  d = d.replace(/class="gallery-track"|class="gallery-slide[^"]*"|<img src="([^"]*img\/products\/)([a-z-]+?)(?:--[a-z0-9-]+)?\.svg"([^>]*)>/g, (m, base, kind, rest, at) => {
    if (m === 'class="gallery-track"') { slide = -1; return m; }
    if (m.startsWith('class="gallery-slide')) { slide++; slideAt = at; return m; }
    if (!KIND[kind]) return m;
    const alt = (rest.match(/alt="([^"]*)"/) || [])[1] || "";
    // A slide image sits right after its slide opening tag.
    const inSlide = at - slideAt < 200;
    const detail = alt ? alt.replace(/\.$/, "") : inSlide ? VIEWS[slide % VIEWS.length] : "";
    const file = detail ? `${kind}--${slug(detail)}.svg` : `${kind}.svg`;
    files.set(file, [kind, detail.toLowerCase().startsWith(KIND[kind].toLowerCase()) ? detail : detail.toLowerCase()]);
    return `<img src="${base}${file}"${rest}>`;
  });
  // Inline placeholders: <svg …viewBox="0 0 w h" … aria-label="…">…<text>…</text>…</svg> written by this tool.
  d = d.replace(/(<svg\b[^>]*viewBox="0 0 (\d+) (\d+)"[^>]*>)([\s\S]*?)<\/svg>/g, (m, open, w, h, body) => {
    const label = (body.match(/<tspan font-weight="600">([^<]*)<\/tspan>/) || [])[1];
    if (!label || !/(image|video)/.test(body) || !/fill="#e8e8ed"|-hatch"/.test(body)) return m;
    const aria = (open.match(/aria-label="([^"]*)"/) || [])[1] || "";
    // Configurator slides: "Phone Pro, front" -> "front". Cards: the product title next to the slot.
    let detail = aria.includes(",") ? aria.split(",").pop().trim() : "";
    if (!detail) {
      const after = d.slice(d.indexOf(m) + m.length, d.indexOf(m) + m.length + 1500);
      const title = (after.match(/<(?:h3|p)[^>]*class="[^"]*(?:name|title)[^"]*"[^>]*>([^<]*)/) || [])[1] || "";
      detail = title.replace(/\s+[–-]\s+/, ", ").trim().toLowerCase();
    }
    const video = /\bvideo</.test(body);
    const cleanOpen = open.replace(/\s*aria-label="[^"]*"/, "").replace(/>$/, ` aria-label="${xml(label)} ${video ? "video" : "image"}${detail ? ` (${xml(detail)})` : ""}">`);
    const inner = inlineBody(+w, +h, label, detail, video ? "video" : "image");
    return `${cleanOpen}\n  ${inner}\n</svg>`;
  });

  writeFileSync(page, d);
}

for (const [file, [kind, detail]] of files) {
  const [w, h] = sizes[kind];
  writeFileSync(`${DIR}/${file}`, fileSVG(w, h, KIND[kind], detail));
}
console.log(`${files.size} files written`);
