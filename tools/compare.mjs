#!/usr/bin/env node
// Compare a local page (live mode) with its source page: rendering and computed styles.
// Writes <out>/report.md (style diffs) and <out>/side-NN.jpg (source left, local right, 1440 px tiles).
//
// Usage: node tools/compare.mjs <local-url> <source-url> <out-dir> [--width 1440]
// Example: node tools/compare.mjs "http://localhost:4321/pages/buy-phone.html?src=/shop/buy-iphone&content=live" \
//            https://www.apple.com/shop/buy-iphone _analysis/compare/buy-phone

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

const req = createRequire(join(homedir(), ".cache", "adn-design", "noop.js"));
const { chromium } = req("playwright");
const { PNG } = req("pngjs");

const [local, source, out] = process.argv.slice(2);
const W = Number(process.argv.includes("--width") ? process.argv[process.argv.indexOf("--width") + 1] : 1440);
if (!out) { console.error("usage: compare.mjs <local-url> <source-url> <out-dir>"); process.exit(1); }
mkdirSync(out, { recursive: true });

// Runs in the page: style signature of what is visible.
function signature() {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.opacity !== "0"; };
  const inNav = (e) => e.closest("#globalnav, .globalnav, .gnav, footer, #ac-globalfooter, .gfoot, .ac-gf-footer");
  const count = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  const type = new Map(), radii = new Map(), colors = new Map(), bgs = new Map(), shadows = new Map();
  const heads = [];
  for (const e of document.querySelectorAll("body *")) {
    if (!vis(e) || inNav(e)) continue;
    const cs = getComputedStyle(e);
    const ownText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (ownText) {
      const px = (v) => (v.endsWith("px") ? Math.round(parseFloat(v) * 10) / 10 + "px" : v);
      count(type, `${px(cs.fontSize)} / ${cs.fontWeight} / lh ${px(cs.lineHeight)} / ls ${px(cs.letterSpacing)}`);
      count(colors, cs.color);
    }
    if (cs.borderRadius !== "0px") count(radii, cs.borderRadius);
    if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") count(bgs, cs.backgroundColor);
    if (cs.boxShadow !== "none") count(shadows, cs.boxShadow);
    if (/^H[1-3]$/.test(e.tagName) && ownText) {
      const r = e.getBoundingClientRect();
      heads.push({ tag: e.tagName, y: Math.round(r.top + scrollY), x: Math.round(r.left), w: Math.round(r.width), fs: cs.fontSize, text: e.textContent.trim().replace(/\s+/g, " ").slice(0, 50) });
    }
  }
  const top = (m, n = 14) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  return { height: document.documentElement.scrollHeight, type: top(type, 18), radii: top(radii), colors: top(colors, 10), bgs: top(bgs, 10), shadows: top(shadows, 6), heads: heads.slice(0, 40) };
}

async function grab(url) {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: W, height: 900 }, locale: "en-US" });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(url, { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(1500);
  for (let i = 0; i < 50; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(100); }
  await p.mouse.wheel(0, -100000); await p.waitForTimeout(1000);
  // Hide fixed/sticky overlays that would repeat in a full-page shot (chat bubbles, sticky bars).
  await p.addStyleTag({ content: ".chat-bubble,.rc-chat-sticky,[class*='chat-sticky']{display:none!important}" });
  const sig = await p.evaluate(signature);
  const png = PNG.sync.read(await p.screenshot({ fullPage: true }));
  await b.close();
  return { sig, png, errors };
}

const [src, loc] = [await grab(source), await grab(local)];

// Side-by-side tiles at half scale: source | local.
const half = (png) => {
  const w = Math.floor(png.width / 2), h = Math.floor(png.height / 2), o = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y * 2) * png.width + x * 2) * 4, j = (y * w + x) * 4; png.data.copy(o.data, j, i, i + 4); }
  return o;
};
const a = half(src.png), bq = half(loc.png);
const TILE = 800, gap = 12, tw = a.width + gap + bq.width;
const n = Math.ceil(Math.max(a.height, bq.height) / TILE);
for (let t = 0; t < n; t++) {
  const tile = new PNG({ width: tw, height: TILE }); tile.data.fill(255);
  for (const [img, ox] of [[a, 0], [bq, a.width + gap]]) {
    for (let y = 0; y < TILE; y++) { const sy = t * TILE + y; if (sy >= img.height) break; img.data.copy(tile.data, (y * tw + ox) * 4, sy * img.width * 4, (sy + 1) * img.width * 4); }
  }
  for (let y = 0; y < TILE; y++) for (let x = a.width; x < a.width + gap; x++) { const i = (y * tw + x) * 4; tile.data[i] = 255; tile.data[i + 1] = 59; tile.data[i + 2] = 48; tile.data[i + 3] = 255; }
  writeFileSync(join(out, `side-${String(t).padStart(2, "0")}.png`), PNG.sync.write(tile));
}

// Report: what the source uses that the local page does not, and the reverse.
const diff = (s, l) => {
  const ls = new Set(l.map(([k]) => k)), ss = new Set(s.map(([k]) => k));
  return { missing: s.filter(([k]) => !ls.has(k)), extra: l.filter(([k]) => !ss.has(k)) };
};
const lines = [`# Comparaison ${W}px`, "", `- Source : ${source}`, `- Local : ${local}`, `- Hauteur : source ${src.sig.height}px · local ${loc.sig.height}px (${Math.round(loc.sig.height / src.sig.height * 100)} %)`, `- Erreurs JS locales : ${loc.errors.length ? loc.errors.join(" | ") : "aucune"}`, `- Tuiles : ${n} images side-NN.png (gauche source, droite local, échelle 1/2)`, ""];
for (const k of ["type", "radii", "colors", "bgs", "shadows"]) {
  const d = diff(src.sig[k], loc.sig[k]);
  lines.push(`## ${k}`, "", "| Source (×) | Local (×) |", "|---|---|");
  const sm = new Map(src.sig[k]), lm = new Map(loc.sig[k]);
  for (const key of new Set([...sm.keys(), ...lm.keys()])) lines.push(`| ${sm.has(key) ? `\`${key}\` ×${sm.get(key)}` : "—"} | ${lm.has(key) ? `\`${key}\` ×${lm.get(key)}` : "—"} |`);
  lines.push("", `Absents en local : ${d.missing.map(([x]) => `\`${x}\``).join(", ") || "aucun"}`, "");
}
lines.push("## Titres (position)", "", "| Source | Local |", "|---|---|");
for (let i = 0; i < Math.max(src.sig.heads.length, loc.sig.heads.length); i++) {
  const f = (h) => (h ? `${h.tag} y${h.y} x${h.x} ${h.fs} « ${h.text} »` : "—");
  lines.push(`| ${f(src.sig.heads[i])} | ${f(loc.sig.heads[i])} |`);
}
writeFileSync(join(out, "report.md"), lines.join("\n"));
console.log(`report: ${join(out, "report.md")} · ${n} tiles · height ${src.sig.height} vs ${loc.sig.height} · local errors ${loc.errors.length}`);
