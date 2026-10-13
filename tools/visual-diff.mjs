#!/usr/bin/env node
// Section-by-section visual diff between a source page and the local clone (live mode, same content).
// Sections are matched by heading text (h1–h3); each matched pair is cropped from its heading to the next
// matched heading, resized to the same size, and scored (0–100, pixel similarity on a grayscale thumbnail).
// Writes <out>/visual.md and <out>/worst-N.png (source left, local right) for the 5 lowest scores.
//
// Usage: node tools/visual-diff.mjs <local-url> <source-url> <out-dir> [--width 1440]

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

const req = createRequire(join(homedir(), ".cache", "adn-design", "noop.js"));
const { chromium } = req("playwright");
const { PNG } = req("pngjs");

const [local, source, out] = process.argv.slice(2);
const W = Number(process.argv.includes("--width") ? process.argv[process.argv.indexOf("--width") + 1] : 1440);
mkdirSync(out, { recursive: true });

async function grab(url) {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: W, height: 900 }, locale: "en-US" });
  await p.goto(url, { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(1500);
  for (let i = 0; i < 50; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(100); }
  await p.mouse.wheel(0, -100000); await p.waitForTimeout(1000);
  // Freeze motion and hide floating UI so both captures are comparable.
  await p.addStyleTag({ content: "*{animation:none!important;transition:none!important}.chat-bubble,[class*='chat-sticky'],.pbar,.rf-bfe-stickybar{display:none!important}video{visibility:hidden!important}" });
  const heads = await p.evaluate(() => [...document.querySelectorAll("main h1, main h2, main h3, h1, h2")]
    .filter((h) => h.getBoundingClientRect().height > 0 && !h.closest("nav, footer, #globalnav, .globalnav, .gnav, .gfoot, [class*='globalfooter']"))
    // Compare letters and digits only: spacing, nbsp and punctuation differ between the two pages.
    .map((h) => ({ t: h.textContent.normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 48), label: h.textContent.replace(/\s+/g, " ").trim().slice(0, 40), y: Math.round(h.getBoundingClientRect().top + scrollY) }))
    .filter((h) => h.t.length > 3));
  const png = PNG.sync.read(await p.screenshot({ fullPage: true }));
  await b.close();
  return { heads, png };
}

const [S, L] = [await grab(source), await grab(local)];
if (process.env.DEBUG_HEADS) { console.log("S", S.heads.slice(0, 14).map((h) => h.t + "@" + h.y).join(" | ")); console.log("L", L.heads.slice(0, 14).map((h) => h.t + "@" + h.y).join(" | ")); }

// Match headings in order (longest common subsequence on text).
const a = S.heads, bh = L.heads;
// Same heading if equal, or if one is the start of the other (the source sometimes splits a two-tone title).
const eq = (x, y) => x === y || (Math.min(x.length, y.length) >= 6 && (x.startsWith(y) || y.startsWith(x)));
const dp = Array.from({ length: a.length + 1 }, () => new Array(bh.length + 1).fill(0));
for (let i = a.length - 1; i >= 0; i--) for (let j = bh.length - 1; j >= 0; j--)
  dp[i][j] = eq(a[i].t, bh[j].t) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
const pairs = [];
for (let i = 0, j = 0; i < a.length && j < bh.length;) {
  if (eq(a[i].t, bh[j].t)) { if (!pairs.length || (a[i].y > pairs.at(-1).sy && bh[j].y > pairs.at(-1).ly)) pairs.push({ t: a[i].label, sy: a[i].y, ly: bh[j].y }); i++; j++; }
  else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
}

// Grayscale thumbnail of a crop, resized to tw x th (box sampling).
const thumb = (png, y0, y1, tw, th) => {
  const out = new Float32Array(tw * th);
  const h = Math.max(1, y1 - y0);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    const sx0 = Math.floor(tx * png.width / tw), sx1 = Math.max(sx0 + 1, Math.floor((tx + 1) * png.width / tw));
    const sy0 = y0 + Math.floor(ty * h / th), sy1 = Math.max(sy0 + 1, y0 + Math.floor((ty + 1) * h / th));
    let sum = 0, n = 0;
    for (let y = sy0; y < Math.min(sy1, png.height); y += 2) for (let x = sx0; x < sx1; x += 2) {
      const i = (y * png.width + x) * 4; sum += 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2]; n++;
    }
    out[ty * tw + tx] = n ? sum / n : 255;
  }
  return out;
};

const rows = [];
for (let k = 0; k < pairs.length; k++) {
  const p = pairs[k], next = pairs[k + 1];
  const sy1 = next ? next.sy : Math.min(S.png.height, p.sy + 1500), ly1 = next ? next.ly : Math.min(L.png.height, p.ly + 1500);
  const sh = sy1 - p.sy, lh = ly1 - p.ly;
  if (sh < 40 || lh < 40) continue;
  const tw = 96, th = Math.max(8, Math.round(96 * sh / W));
  const ts = thumb(S.png, p.sy, sy1, tw, th), tl = thumb(L.png, p.ly, ly1, tw, th);
  let d = 0; for (let i = 0; i < ts.length; i++) d += Math.abs(ts[i] - tl[i]);
  const pix = 100 - (d / ts.length) / 2.55;
  const hr = Math.min(sh, lh) / Math.max(sh, lh) * 100;
  rows.push({ t: p.t, sy: p.sy, ly: p.ly, sh, lh, pix: Math.round(pix), hr: Math.round(hr), score: Math.round(pix * 0.6 + hr * 0.4) });
}

// Side-by-side crops of the worst sections (half scale).
const crop = (png, y0, y1) => {
  const h = Math.min(y1, png.height) - y0, o = new PNG({ width: png.width, height: Math.max(1, h) });
  png.data.copy(o.data, 0, y0 * png.width * 4, (y0 + h) * png.width * 4); return o;
};
const worst = [...rows].sort((x, y) => x.score - y.score).slice(0, 5);
worst.forEach((r, n) => {
  const cs = crop(S.png, r.sy, r.sy + Math.min(r.sh, 1400)), cl = crop(L.png, r.ly, r.ly + Math.min(r.lh, 1400));
  const h = Math.max(cs.height, cl.height), w2 = Math.floor(W / 2), o = new PNG({ width: w2 * 2 + 12, height: Math.floor(h / 2) });
  o.data.fill(255);
  for (const [img, ox] of [[cs, 0], [cl, w2 + 12]]) for (let y = 0; y < Math.floor(img.height / 2); y++) for (let x = 0; x < w2; x++) {
    const i = ((y * 2) * img.width + x * 2) * 4, j = (y * o.width + ox + x) * 4; img.data.copy(o.data, j, i, i + 4);
  }
  writeFileSync(join(out, `worst-${n + 1}.png`), PNG.sync.write(o));
});

const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
const lines = [`# Diff visuel ${W}px`, "", `- Source : ${source}`, `- Local : ${local}`,
  `- Sections appariées par titre : ${rows.length} (titres source ${a.length}, local ${bh.length})`,
  `- **Score moyen : ${avg}/100** (pixels 60 % + hauteur 40 %)`, `- 5 pires sections : worst-1..5.png (gauche source, droite local)`, "",
  "| Section | y source | y local | h source | h local | pixels | hauteur | score |", "|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.t} | ${r.sy} | ${r.ly} | ${r.sh} | ${r.lh} | ${r.pix} | ${r.hr} | **${r.score}** |`)];
writeFileSync(join(out, "visual.md"), lines.join("\n"));
console.log(`${out}: ${rows.length} sections, score ${avg}/100, worst: ${worst.map((r) => `${r.t.slice(0, 24)}=${r.score}`).join(", ")}`);
