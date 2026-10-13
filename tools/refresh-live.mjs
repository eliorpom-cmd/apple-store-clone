#!/usr/bin/env node
// Re-extract every known source page through the running live server (tools/live-server.mjs), so the
// cache in content/live/pages/ matches the source site of today. Run after an extractor change or when
// the source content moved (new products, prices, banners).
//
// Usage: node tools/refresh-live.mjs [filter]      filter = substring of the source path (optional)
// Needs: node tools/live-server.mjs running on port 4321.

import { readFileSync } from "node:fs";

const filter = process.argv[2] || "";
const routes = JSON.parse(readFileSync("content/live/routes.json", "utf8"));
const paths = Object.entries(routes).filter(([p, r]) => r.template && p.includes(filter)).map(([p]) => p);
console.log(`${paths.length} pages to refresh`);
let ok = 0;
for (const p of paths) {
  const t0 = Date.now();
  const res = await fetch(`http://localhost:4321/__live?src=${encodeURIComponent(p)}&fresh=1`).catch((e) => ({ status: 0, e }));
  const fine = res.status === 200;
  ok += fine;
  console.log(`${fine ? "ok " : "ERR"} ${res.status} ${p} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
console.log(`${ok}/${paths.length} refreshed`);
