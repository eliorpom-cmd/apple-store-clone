#!/usr/bin/env node
// Visual 1:1 scoreboard: runs tools/visual-diff.mjs on every known source page (3 at a time) and writes
// _analysis/visual/SCORES.md, sorted from the weakest page. Each page also keeps its own visual.md and
// worst-N.png (source left, clone right) in _analysis/visual/<key>/.
//
// Usage: node tools/scoreboard.mjs [filter] [--only-table]
//   filter        substring of the source path (optional)
//   --only-table  do not re-run the diffs, just rebuild SCORES.md from the existing reports
// Needs: node tools/live-server.mjs running on port 4321.

import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const onlyTable = args.includes("--only-table");
const filter = args.find((a) => !a.startsWith("--")) || "";
const routes = JSON.parse(readFileSync("content/live/routes.json", "utf8"));
const jobs = Object.entries(routes).filter(([p, r]) => r.template && p.includes(filter)).map(([p, r]) => ({
  key: r.key, src: p,
  local: `http://localhost:4321/${r.file}?src=${encodeURIComponent(p)}&content=live`,
  source: `https://www.apple.com${p}`,
}));

if (!onlyTable) {
  let i = 0;
  const next = () => {
    if (i >= jobs.length) return Promise.resolve();
    const j = jobs[i++];
    return new Promise((res) => execFile("node", ["tools/visual-diff.mjs", j.local, j.source, `_analysis/visual/${j.key}`], { timeout: 400000 },
      (e, out) => { console.log((out || "").trim().split("\n").pop() || `${j.key}: FAILED`); res(); })).then(next);
  };
  await Promise.all([next(), next(), next()]);
}

// Table from every report present (all pages, not only the filtered ones).
const rows = Object.entries(routes).filter(([, r]) => r.template).map(([p, r]) => {
  const f = join("_analysis/visual", r.key, "visual.md");
  if (!existsSync(f)) return { p, score: null };
  const md = readFileSync(f, "utf8");
  const score = Number((md.match(/Score moyen : (\d+)/) || [])[1]);
  const weak = [...md.matchAll(/^\| (.+?) \| \d+ \| \d+ \| \d+ \| \d+ \| \d+ \| \d+ \| \*\*(\d+)\*\* \|$/gm)]
    .map((m) => [m[1], Number(m[2])]).filter(([, s]) => s < 95).sort((a, b) => a[1] - b[1]).slice(0, 4)
    .map(([t, s]) => `${t.slice(0, 32)} ${s}`).join(" · ");
  return { p, score, template: r.template, weak };
}).sort((a, b) => (a.score ?? -1) - (b.score ?? -1));
const scored = rows.filter((r) => r.score != null);
const mean = scored.reduce((s, r) => s + r.score, 0) / (scored.length || 1);
const lines = [`# Scores visuels 1:1 — ${new Date().toISOString().slice(0, 10)}`, "",
  `- Pages notées : ${scored.length} · **moyenne ${mean.toFixed(1)}/100** · ≥ 95 : ${scored.filter((r) => r.score >= 95).length} · < 90 : ${scored.filter((r) => r.score < 90).length}`,
  "- Score = similarité par section (pixels 60 % + hauteur 40 %), sections appariées par titre. 97+ = indiscernable à l'œil.", "",
  "| Score | Page d'origine | Gabarit | Sections < 95 |", "|---|---|---|---|",
  ...rows.map((r) => `| ${r.score ?? "—"} | ${r.p} | ${r.template ?? ""} | ${r.weak ?? ""} |`)];
writeFileSync("_analysis/visual/SCORES.md", lines.join("\n"));
console.log(`SCORES.md: ${scored.length} pages, mean ${mean.toFixed(1)}`);
