#!/usr/bin/env node
// Local live server (personal study only, never expose it publicly).
// Serves the site, and extracts any source store page on demand:
//   GET /__go?src=/shop/...    -> extract (or reuse cache), detect template, 302 to the local template ?src=...
//   GET /__live?src=/shop/...  -> JSON content for that page (from cache, extracted if missing)
//   GET /__ping                -> "live"
// Cache: content/live/pages/<key>.json and content/live/routes.json (git-ignored).
//
// Usage: node tools/live-server.mjs [port]    (default 4321)

import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { extname, join, normalize, resolve } from "node:path";
import detect from "./extractors/detect.mjs";
import { scrollThrough } from "./fetch-content.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const PORT = Number(process.argv[2] || 4321);
const ORIGIN = "https://www.apple.com";
const CACHE = join(ROOT, "content/live/pages");
const ROUTES = join(ROOT, "content/live/routes.json");
mkdirSync(CACHE, { recursive: true });

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = createRequire(join(homedir(), ".cache", "adn-design", "noop.js"))("playwright")); }

const routes = existsSync(ROUTES) ? JSON.parse(readFileSync(ROUTES, "utf8")) : {};
const saveRoutes = () => writeFileSync(ROUTES, JSON.stringify(routes, null, 1));
const keyOf = (src) => src.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 120) || "store";
const cleanSrc = (s) => {
  const u = new URL(s || "/store", ORIGIN);
  return u.pathname.replace(/^\/us(?=\/)/, "").replace(/\/$/, "") || "/store";
};

let browserP = null;
const browser = () => (browserP ??= chromium.launch({ headless: true }));
const inflight = new Map();

async function extract(src) {
  if (routes[src] && existsSync(join(CACHE, routes[src].key + ".json"))) return routes[src];
  if (inflight.has(src)) return inflight.get(src);
  const job = (async () => {
    const b = await browser();
    const page = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
    try {
      await page.goto(ORIGIN + src, { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(1500);
      await scrollThrough(page);
      const found = await page.evaluate(detect);
      const route = { key: keyOf(src), template: found.template, file: found.file || null };
      if (found.template) {
        const mod = await import(`./extractors/${found.template}.mjs`).catch(() => null);
        if (!mod) { console.log(`no extractor yet for ${found.template} (${src})`); return { ...route, template: null, file: null }; }
        else {
          const data = await page.evaluate(mod.default);
          Object.assign(data, { template: found.template, source: ORIGIN + src, fetched: new Date().toISOString() });
          writeFileSync(join(CACHE, route.key + ".json"), JSON.stringify(data, null, 1));
        }
      }
      routes[src] = route; saveRoutes();
      console.log(`extracted ${src} -> ${route.template || "no template"}`);
      return route;
    } finally { await page.close(); inflight.delete(src); }
  })();
  inflight.set(src, job);
  return job;
}

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === "/__ping") { res.end("live"); return; }
    if (url.pathname === "/__go" || url.pathname === "/__live") {
      const src = cleanSrc(url.searchParams.get("src"));
      const route = await extract(src);
      if (url.pathname === "/__go") {
        const to = route.template ? `/${route.file}?src=${encodeURIComponent(src)}` : ORIGIN + src;
        res.writeHead(302, { Location: to }); res.end(); return;
      }
      if (!route.template) { res.writeHead(404); res.end("{}"); return; }
      res.writeHead(200, { "Content-Type": "application/json" });
      createReadStream(join(CACHE, route.key + ".json")).pipe(res); return;
    }
    let file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end(String(e.message || e));
  }
}).listen(PORT, () => console.log(`Live server on http://localhost:${PORT}/?content=live`));
