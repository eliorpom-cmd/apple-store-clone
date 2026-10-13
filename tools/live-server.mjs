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
import { fileURLToPath } from "node:url";
import detect from "./extractors/detect.mjs";
import { extractNav, scrollThrough } from "./fetch-content.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
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

// One shared browser, relaunched if it crashed or was closed.
let browserP = null;
const browser = async () => {
  const b = browserP && (await browserP.catch(() => null));
  if (!b || !b.isConnected()) browserP = chromium.launch({ headless: true });
  return browserP;
};
const inflight = new Map();

async function extract(src, fresh = false) {
  if (!fresh && routes[src] && existsSync(join(CACHE, routes[src].key + ".json"))) return routes[src];
  if (inflight.has(src)) return inflight.get(src);
  const job = (async () => {
    try { return await run(); }
    catch (e) {
      if (!/closed|crash|Target/.test(String(e))) throw e;
      browserP = null; // force a relaunch, then retry once
      return await run();
    }
  })();
  inflight.set(src, job);
  job.finally(() => inflight.delete(src));
  return job;

  async function run() {
    const b = await browser();
    const page = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
    try {
      await page.goto(ORIGIN + src, { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(1500);
      await scrollThrough(page);
      const found = await page.evaluate(detect);
      const route = { key: keyOf(src), template: found.template, file: found.file || null };
      if (found.template) {
        // Cache-busting import: extractors are edited while the server runs.
        const xfile = join(ROOT, "tools/extractors", found.template + ".mjs");
        const mod = existsSync(xfile) ? await import(`./extractors/${found.template}.mjs?v=${statSync(xfile).mtimeMs}`).catch((e) => { console.error(e); return null; }) : null;
        if (!mod) { console.log(`no extractor yet for ${found.template} (${src})`); return { ...route, template: null, file: null }; }
        else {
          const data = await page.evaluate(mod.default);
          // Shelf rows (recommendations, help, offers) also close most non-shelf pages: extract them too.
          if (found.template !== "shelves" && (await page.$(".rs-cardsshelf"))) {
            const shelves = await import(`./extractors/shelves.mjs?v=${statSync(join(ROOT, "tools/extractors/shelves.mjs")).mtimeMs}`);
            data.extraShelves = (await page.evaluate(shelves.default)).shelves;
          }
          // Marketing blocks shared by buy flows (compare grid, personal setup, services): one module for all.
          const ddFile = join(ROOT, "tools/extractors/dd-blocks.mjs");
          if (found.template !== "shelves" && existsSync(ddFile) && (await page.$("[class*='dd-compare-grid'], [class*='dd-shared'], .dd-services, [class*='dd-compare-info']"))) {
            const dd = await import(`./extractors/dd-blocks.mjs?v=${statSync(ddFile).mtimeMs}`);
            data.ddBlocks = await page.evaluate(dd.default);
          }
          // Legal notes above the footer (footnotes, offers terms): same markup on every page.
          if (!data.legal) data.legal = await page.evaluate(() => {
            const box = document.querySelector(".as-globalfooter-sosumi, .ac-gf-sosumi, [class*='footnotes'] .rc-footnotelist, .rc-footnotes");
            if (!box) return "";
            const c = box.cloneNode(true);
            c.querySelectorAll("script, style, button, [aria-hidden='true']").forEach((n) => n.remove());
            // Keep text structure only: paragraphs, lists, links, superscripts.
            c.querySelectorAll("*").forEach((n) => { for (const a of [...n.attributes]) if (a.name !== "href") n.removeAttribute(a.name); });
            return c.innerHTML.replace(/\s+/g, " ").trim();
          });
          const navFile = join(ROOT, "content/live/_nav.json");
          if (!existsSync(navFile)) writeFileSync(navFile, JSON.stringify(await page.evaluate(extractNav), null, 1));
          Object.assign(data, { template: found.template, source: ORIGIN + src, fetched: new Date().toISOString() });
          writeFileSync(join(CACHE, route.key + ".json"), JSON.stringify(data, null, 1));
        }
      }
      routes[src] = route; saveRoutes();
      console.log(`extracted ${src} -> ${route.template || "no template"}`);
      return route;
    } finally { await page.close().catch(() => {}); }
  }
}

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === "/__ping") { res.end("live"); return; }
    if (url.pathname === "/__go" || url.pathname === "/__live") {
      const src = cleanSrc(url.searchParams.get("src"));
      const route = await extract(src, url.searchParams.has("fresh"));
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
