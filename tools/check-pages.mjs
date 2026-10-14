#!/usr/bin/env node
// Health check of every local page in demo mode: JS errors, failed local requests, horizontal overflow
// at 1440 and 390 px, dead local links. Prints "ok" or the issues per page. Run before every commit.
//
// Usage: node tools/check-pages.mjs [--live]     (--live: also open each page with ?content=live)
// Needs: a server on port 4321 (tools/live-server.mjs, or any static server).

import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

// Playwright and pngjs: from the project (npm install), else from the shared cache ~/.cache/adn-design.
const req = (() => { try { createRequire(import.meta.url).resolve("playwright"); return createRequire(import.meta.url); } catch { return createRequire(join(homedir(), ".cache", "adn-design", "noop.js")); } })();
const { chromium } = req("playwright");
const live = process.argv.includes("--live");
const html = (dir) => readdirSync(dir).filter((f) => f.endsWith(".html")).map((f) => dir + "/" + f);
// The kit has no live mode: its pages are checked in demo runs only.
const pages = ["index.html", ...html("pages"), ...(live ? [] : ["kit/index.html", ...html("kit/examples")])];
const b = await chromium.launch();
let bad = 0;
for (const pg of pages) {
  const issues = [];
  for (const w of [1440, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    p.on("pageerror", (e) => issues.push(`${w} js: ${e.message.slice(0, 80)}`));
    p.on("response", (r) => { if (r.status() >= 400 && r.url().includes("localhost") && !/favicon|_nav\.json/.test(r.url())) issues.push(`${w} ${r.status()} ${r.url().replace(/^http:\/\/localhost:\d+\//, "")}`); });
    await p.goto(`http://localhost:4321/${pg}${live ? "?content=live" : "?content=demo"}`, { waitUntil: "load" }).catch(() => issues.push("load fail"));
    await p.waitForTimeout(400);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ov > 1) issues.push(`${w} overflow ${ov}px`);
    if (w === 1440 && !live) {
      const dead = await p.evaluate(async () => {
        const hrefs = [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin) && !h.includes("#") && !h.includes("/__")))];
        const out = []; for (const h of hrefs) { const r = await fetch(h, { method: "HEAD" }); if (!r.ok) out.push(h.replace(location.origin + "/", "")); } return out;
      });
      if (dead.length) issues.push("dead links: " + dead.join(", "));
    }
    await p.close();
  }
  if (issues.length) bad++;
  console.log(pg.padEnd(32), issues.length ? [...new Set(issues)].join(" | ") : "ok");
}
await b.close();
console.log(bad ? `${bad} page(s) with issues` : "all pages ok");
process.exit(bad ? 1 : 0);
