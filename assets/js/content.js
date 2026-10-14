// Live content mode (local study only). Loads content/live/<slug>.json (made by tools/fetch-content.mjs,
// git-ignored) and lets the page's renderer rewrite the demo content before shell.js and components.js run.
// Turn on with ?content=live, back with ?content=demo. The choice is remembered per browser.
//
// Script order on a page:
//   content.js  ->  live/<template>.js (calls Live.register)  ->  shell.js  ->  components.js
(() => {
  const params = new URLSearchParams(location.search);
  try { if (params.get("content")) localStorage.setItem("content-mode", params.get("content")); } catch {}
  let mode = "demo";
  try { mode = localStorage.getItem("content-mode") || "demo"; } catch {}

  const inPages = location.pathname.includes("/pages/");
  const root = inPages ? "../" : "";
  const slug = document.body.dataset.content || (location.pathname.split("/").pop().replace(".html", "") || "index");

  // Source paths that have a local template; everything else opens the source site.
  const LOCAL = {
    "/store": "index.html", "/shop/buy-iphone": "pages/buy-phone.html", "/shop/buy-mac": "pages/buy-computer.html",
    "/shop/buy-watch": "pages/buy-watch.html", "/shop/buy-vision": "pages/buy-headset.html",
    "/shop/education-pricing": "pages/education.html", "/shop/buy-iphone/iphone-18-pro": "pages/config-phone.html",
    "/shop/buy-iphone/iphone-duo": "pages/config-phone-duo.html", "/shop/buy-mac/macbook-pro": "pages/config-computer.html",
    "/shop/buy-watch/apple-watch-ultra": "pages/config-watch.html", "/shop/buy-airpods/airpods-5": "pages/buy-earbuds.html",
    "/shop/buy-mac/studio-display": "pages/buy-display.html", "/shop/buy-tv/apple-tv-4k": "pages/buy-tvbox.html",
    "/shop/accessories/all": "pages/accessories.html", "/shop/watch/bands": "pages/watch-bands.html",
    "/shop/refurbished": "pages/refurbished.html", "/shop/apple-upgrade": "pages/upgrade.html",
    "/shop/trade-in": "pages/trade-in.html", "/shop/buy-iphone/carrier-offers": "pages/carrier-offers.html",
    "/shop/shipping-pickup": "pages/shipping.html", "/shop/help": "pages/help.html", "/shop/bag": "pages/bag.html",
    "/shop/gift-cards": "pages/gift-cards.html", "/shop/buy-giftcard/giftcard": "pages/giftcard.html",
    "/retail": "pages/stores.html", "/today": "pages/today.html", "/shop/browse/sitemap": "pages/sitemap.html", "/sitemap": "pages/sitemap.html",
    "/shop/product/mk944zm/a/iphone-18-pro-max-silicone-case-with-magsafe-navy-blue": "pages/product-case.html",
    "/shop/product/mwvv3am/a/20w-usb-c-power-adapter": "pages/product-charger.html",
  };

  // Marketing page -> store page that sells the same product (live mode). Exact pages first, then families.
  const STORE_PAGES = {
    "/macbook-neo": "/shop/buy-mac/macbook-neo", "/macbook-air": "/shop/buy-mac/macbook-air",
    "/macbook-pro": "/shop/buy-mac/macbook-pro", "/imac": "/shop/buy-mac/imac", "/mac-mini": "/shop/buy-mac/mac-mini",
    "/mac-studio": "/shop/buy-mac/mac-studio", "/displays": "/shop/buy-mac/studio-display",
    "/ipad-pro": "/shop/buy-ipad/ipad-pro", "/ipad-air": "/shop/buy-ipad/ipad-air", "/ipad-mini": "/shop/buy-ipad/ipad-mini",
    "/ipad-11": "/shop/buy-ipad", "/apple-pencil": "/shop/accessories/all", "/ipad-keyboards": "/shop/accessories/all",
    "/iphone-duo": "/shop/buy-iphone/iphone-duo", "/iphone-18-pro": "/shop/buy-iphone/iphone-18-pro",
    "/iphone-air": "/shop/buy-iphone/iphone-air", "/iphone-17": "/shop/buy-iphone/iphone-17",
    "/iphone-17e": "/shop/buy-iphone/iphone-17e", "/iphone-16": "/shop/buy-iphone/iphone-16",
    "/apple-watch-series-12": "/shop/buy-watch/apple-watch", "/apple-watch-ultra-4": "/shop/buy-watch/apple-watch-ultra",
    "/apple-watch-se-3": "/shop/buy-watch/apple-watch-se", "/apple-watch-hermes": "/shop/buy-watch/apple-watch-hermes",
    "/apple-watch-nike": "/shop/buy-watch/apple-watch", "/apple-vision-pro": "/shop/buy-vision/apple-vision-pro",
    "/airpods-5": "/shop/buy-airpods/airpods-5", "/airpods-pro": "/shop/buy-airpods/airpods-pro-3",
    "/airpods-max": "/shop/buy-airpods/airpods-max-2", "/homepod-mini": "/shop/buy-homepod/homepod-mini",
    "/apple-tv-4k": "/shop/buy-tv/apple-tv-4k", "/apple-homeview": "/shop/buy-home/apple-homeview",
    "/homepod-2nd-generation": "/shop/buy-home", "/home": "/shop/buy-home", "/support": "/shop/help",
  };
  const STORE_FAMILIES = [["/mac", "/shop/buy-mac"], ["/ipad", "/shop/buy-ipad"], ["/iphone", "/shop/buy-iphone"],
    ["/watch", "/shop/buy-watch"], ["/airpods", "/shop/goto/airpods/accessories"], ["/tv-home", "/shop/buy-home"]];
  const storePath = (path) => {
    const top = "/" + (path.split("/")[1] || "");
    if (STORE_PAGES[top]) return STORE_PAGES[top];
    const fam = STORE_FAMILIES.find(([m]) => top === m);
    return fam ? fam[1] : path;
  };

  // Reverse map: local page -> source path (used when a page is opened without ?src=).
  const SRC_OF = Object.fromEntries(Object.entries(LOCAL).map(([path, file]) => [file.replace(/^pages\//, "").replace(".html", ""), path]));
  const srcParam = params.get("src");

  const getJSON = (url) => {
    const req = new XMLHttpRequest();
    req.open("GET", url, false); // synchronous on purpose: the DOM must be rewritten before shell.js runs
    try { req.send(); } catch { return null; }
    return req.status === 200 ? JSON.parse(req.responseText) : null;
  };

  const Live = {
    on: false,
    data: null,
    nav: null,
    root,
    slug,
    // Map a source URL to the local page when one exists.
    server: false,
    link(href) {
      if (!href) return "#";
      try {
        const u = new URL(href, "https://www.apple.com");
        if (u.hostname === "support.apple.com" && Live.server) return "/__go?src=" + encodeURIComponent("/shop/help");
        if (u.hostname !== "www.apple.com") return u.href;
        let path = u.pathname.replace(/^\/us(?=\/)/, "").replace(/\/$/, "") || "/";
        // Marketing pages are not cloned: send them to the matching store page instead of the source site.
        if (Live.server) path = storePath(path);
        // With the live server, every store page gets its own local page (extracted on demand).
        if (Live.server && /^\/(store|shop|retail|today)(\/|$)/.test(path)) return "/__go?src=" + encodeURIComponent(path);
        return LOCAL[path] ? root + LOCAL[path] : u.href;
      } catch { return href; }
    },
    esc(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },
    img(i, attrs = "") { return i && i.src ? `<img src="${Live.esc(i.src)}" alt="${Live.esc(i.alt || "")}" loading="lazy" ${attrs}>` : ""; },
    // Set text of the first element matching sel (inside scope) when value is non-empty.
    text(sel, value, scope = document) { const el = scope.querySelector(sel); if (el && value) el.textContent = value; return el; },
    renderers: {},
    register(name, fn) {
      Live.renderers[name] = fn;
      if (Live.on && Live.data?.template === name) {
        try { fn(Live.data, Live); document.documentElement.dataset.liveRendered = name; }
        catch (e) { console.error("live renderer failed:", name, e); }
      }
      Live.flushDd();
      Live.flushExtras();
      Live.flushLegal();
    },
    // Shared marketing blocks (data.ddBlocks, markup from Live.ddBlocksHTML in live/dd-blocks.js), placed before
    // the page's FAQ when there is one, otherwise at the end of <main>.
    flushDd() {
      const d = Live.data;
      if (!Live.on || Live.ddDone || !d?.ddBlocks || typeof Live.ddBlocksHTML !== "function" || !document.documentElement.dataset.liveRendered) return;
      const main = document.querySelector("main");
      if (!main) return;
      const html = `<div class="live-dd-blocks">${Live.ddBlocksHTML(d.ddBlocks, Live)}</div>`;
      const faq = [...main.querySelectorAll("[data-accordion]")].pop();
      const anchor = faq?.closest("section") || faq;
      anchor ? anchor.insertAdjacentHTML("beforebegin", html) : main.insertAdjacentHTML("beforeend", html);
      Live.ddDone = true;
    },
    // Legal notes go into the footer slot (shell.js wraps it in the footer) unless the renderer filled it.
    flushLegal() {
      const d = Live.data;
      if (!Live.on || Live.legalDone || typeof d?.legalHTML !== "string" || !d.legalHTML || !document.documentElement.dataset.liveRendered) return;
      const slot = document.querySelector('[data-shell="footer"]');
      if (!slot || slot.innerHTML.trim()) { Live.legalDone = true; return; }
      const box = document.createElement("div");
      box.innerHTML = d.legalHTML;
      box.querySelectorAll("a[href]").forEach((a) => a.setAttribute("href", Live.link(a.getAttribute("href"))));
      slot.innerHTML = `<div class="live-legal">${box.innerHTML}</div>`;
      Live.legalDone = true;
    },
    // Shelf rows found under a non-shelf page (data.extraShelves) are appended to <main> once both the
    // page renderer and the shelf markup builder (Live.shelvesHTML, from live/shelves.js) are available.
    flushExtras() {
      const d = Live.data;
      if (!Live.on || Live.extrasDone || !d?.extraShelves?.length || d.template === "shelves") return;
      if (typeof Live.shelvesHTML !== "function" || !document.documentElement.dataset.liveRendered) return;
      const main = document.querySelector("main");
      if (!main) return;
      main.insertAdjacentHTML("beforeend", `<div class="live-extra-shelves">${Live.shelvesHTML(d.extraShelves)}</div>`);
      Live.extrasDone = true;
    },
  };
  window.Live = Live;
  if (mode !== "live") return;

  // Live server running (tools/live-server.mjs)? Then content comes from it, for any source page.
  let ping = null;
  try { ping = sessionStorage.getItem("live-server"); } catch {}
  if (ping === null) {
    const r = new XMLHttpRequest();
    try { r.open("GET", "/__ping", false); r.send(); ping = r.status === 200 && r.responseText === "live" ? "1" : "0"; } catch { ping = "0"; }
    try { sessionStorage.setItem("live-server", ping); } catch {}
  }
  Live.server = ping === "1";
  const src = srcParam || SRC_OF[slug];
  const data = Live.server && src
    ? getJSON("/__live?src=" + encodeURIComponent(src))
    : getJSON(`${root}content/live/${slug}.json`);
  if (!data) return;
  Live.on = true;
  Live.data = data;
  Live.nav = getJSON(`${root}content/live/_nav.json`);
  // The demo ribbon is fictional content: in live mode a ribbon shows only if the renderer sets one from the source.
  document.querySelector('[data-shell="nav"]')?.removeAttribute("data-ribbon");
  document.documentElement.dataset.content = "live";
})();
