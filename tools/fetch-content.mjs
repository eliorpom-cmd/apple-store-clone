#!/usr/bin/env node
// Fetch the content of the reference store pages for LOCAL, PERSONAL study.
// Writes content/live/<slug>.json (git-ignored). Images stay on the original CDN: only their URLs are saved.
// Never publish the generated files or a site built from them.
//
// Usage: node tools/fetch-content.mjs [slug ...]     (default: every page in PAGES)
// Needs Playwright: npm i -D playwright && npx playwright install chromium
//
// Each page names an extractor in tools/extractors/<name>.mjs. An extractor default-exports one
// self-contained function that runs in the page and returns { template: "<name>", ... }.
// The matching renderer is assets/js/live/<name>.js (see assets/js/content.js).

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = createRequire(join(homedir(), ".cache", "adn-design", "noop.js"))("playwright")); }

const ORIGIN = "https://www.apple.com";
// Local slug -> [source path, extractor name]
export const PAGES = {
  "index": ["/store", "shelves"],
  "buy-phone": ["/shop/buy-iphone", "shelves"],
  "buy-computer": ["/shop/buy-mac", "shelves"],
  "buy-watch": ["/shop/buy-watch", "shelves"],
  "buy-headset": ["/shop/buy-vision", "shelves"],
  "education": ["/shop/education-pricing", "shelves"],
  "config-phone": ["/shop/buy-iphone/iphone-18-pro", "configurator"],
  "config-phone-duo": ["/shop/buy-iphone/iphone-duo", "configurator"],
  "config-computer": ["/shop/buy-mac/macbook-pro", "configurator-2"],
  "config-watch": ["/shop/buy-watch/apple-watch-ultra", "configurator-2"],
  "buy-earbuds": ["/shop/buy-airpods/airpods-5", "flagship"],
  "buy-display": ["/shop/buy-mac/studio-display", "flagship"],
  "buy-tvbox": ["/shop/buy-tv/apple-tv-4k", "flagship"],
  "product-case": ["/shop/product/mk944zm/a/iphone-18-pro-max-silicone-case-with-magsafe-navy-blue", "product"],
  "product-charger": ["/shop/product/mwvv3am/a/20w-usb-c-power-adapter", "product"],
  "giftcard": ["/shop/buy-giftcard/giftcard", "product"],
  "accessories": ["/shop/accessories/all", "catalog"],
  "watch-bands": ["/shop/watch/bands", "catalog"],
  "refurbished": ["/shop/refurbished", "catalog-2"],
  "upgrade": ["/shop/apple-upgrade", "catalog-2"],
  "trade-in": ["/shop/trade-in", "content"],
  "carrier-offers": ["/shop/buy-iphone/carrier-offers", "content"],
  "shipping": ["/shop/shipping-pickup", "content"],
  "help": ["/shop/help", "service"],
  "bag": ["/shop/bag", "service"],
  "sitemap": ["/shop/browse/sitemap", "service"],
  "stores": ["/retail/", "service"],
  "today": ["/today/", "service"],
  "gift-cards": ["/shop/gift-cards", "service"],
};

// Global nav labels and links, shared by every page (content/live/_nav.json).
export function extractNav() {
  const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  // Top-level links live in .globalnav-submenu-trigger-item; their flyout groups are in the closest .globalnav-item.
  const items = [...document.querySelectorAll(".globalnav-submenu-trigger-item > a.globalnav-link")].map((a) => {
    const li = a.closest(".globalnav-item") || a.parentElement;
    const groups = [...li.querySelectorAll(".globalnav-submenu-group")].map((g) => ({
      title: txt(g.querySelector(".globalnav-submenu-header")),
      links: [...g.querySelectorAll("a.globalnav-submenu-link")].map((l) => [txt(l), l.href]),
    })).filter((g) => g.links.length);
    return { label: txt(a.querySelector(".globalnav-link-text-container") || a), href: a.href, groups };
  });
  const F = "[class*='globalfooter-directory-column']";
  const footer = [...document.querySelectorAll(".as-globalfooter-directory-column, .ac-gf-directory-column")].map((col) =>
    [...col.querySelectorAll(".as-globalfooter-directory-column-section, .ac-gf-directory-column-section")].map((s) => [
      txt(s.querySelector("[class*='section-title-text'], [class*='section-title']")),
      [...s.querySelectorAll("a[class*='section-link']")].map((l) => txt(l)),
    ]));
  const legal = txt(document.querySelector("[class*='legal-copyright']"));
  const shop = txt(document.querySelector("[class*='footer-shop'], [class*='mini-shop']"));
  return { items, footer, legal, shop, _sel: F };
}

export async function scrollThrough(page) {
  // Wheel scrolling triggers the lazy shelves; "networkidle" is never reached on these pages.
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(150); }
  await page.mouse.wheel(0, -100000);
  await page.waitForTimeout(800);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const slugs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PAGES);
  mkdirSync("content/live", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
  let navDone = false;
  for (const slug of slugs) {
    const [path, name] = PAGES[slug] || [];
    if (!path) { console.log(slug, "unknown slug"); continue; }
    try {
      const { default: extract } = await import(`./extractors/${name}.mjs`);
      await page.goto(ORIGIN + path, { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(1500);
      await scrollThrough(page);
      if (!navDone) { writeFileSync("content/live/_nav.json", JSON.stringify(await page.evaluate(extractNav), null, 1)); navDone = true; }
      const data = await page.evaluate(extract);
      data.template ??= name;
      data.source = ORIGIN + path;
      data.fetched = new Date().toISOString();
      writeFileSync(`content/live/${slug}.json`, JSON.stringify(data, null, 1));
      console.log(slug.padEnd(18), name.padEnd(15), `${Math.round(JSON.stringify(data).length / 1024)} KB`);
    } catch (e) {
      console.log(slug.padEnd(18), name.padEnd(15), "FAILED", String(e.message || e).split("\n")[0].slice(0, 120));
    }
  }
  await browser.close();
}
