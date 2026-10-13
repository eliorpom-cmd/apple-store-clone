// Live content mode (local study only): replaces the demo content of shelf pages with the JSON
// produced by tools/fetch-content.mjs (content/live/<slug>.json, git-ignored).
// Turn on with ?content=live, back to demo with ?content=demo. The choice is remembered per browser.
(() => {
  const params = new URLSearchParams(location.search);
  try {
    if (params.get("content")) localStorage.setItem("content-mode", params.get("content"));
  } catch {}
  let mode = "demo";
  try { mode = localStorage.getItem("content-mode") || "demo"; } catch {}
  if (mode !== "live") return;

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
    "/shop/gift-cards": "pages/gift-cards.html", "/retail": "pages/stores.html", "/today": "pages/today.html",
  };
  const link = (href) => {
    if (!href) return "#";
    try {
      const u = new URL(href);
      const path = u.pathname.replace(/^\/us/, "").replace(/\/$/, "");
      return LOCAL[path] ? root + LOCAL[path] : href;
    } catch { return href; }
  };
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const isNew = (s) => /new|pre-?order/i.test(s || "");

  const card = (c) => {
    const w = { 230: " card-w230", 313: " card-w313", 400: "", 480: " card-w480", 646: " card-w646" }[c.width] || "";
    const tone = c.black ? " card-black" : c.dark ? " card-dark" : "";
    const short = c.short ? " card-short" : "";
    const eyebrow = c.eyebrow ? `<p class="eyebrow${isNew(c.eyebrow) ? " eyebrow-new" : ""}">${esc(c.eyebrow)}</p>` : "";
    if (c.kind === "recomm" || c.kind === "product") {
      return `<a class="card card-w313 pcard live-pcard${tone}" href="${esc(link(c.href))}">
        ${eyebrow}<div class="card-media">${c.img ? `<img src="${esc(c.img.src)}" alt="${esc(c.img.alt)}" loading="lazy">` : ""}</div>
        <h3 class="t-card live-pcard-title">${esc(c.title)}</h3><p class="pcard-price">${esc(c.price)}</p></a>`;
    }
    const body = `<div class="card-body">${eyebrow}<h3 class="card-title${c.short ? " t-card" : ""}">${esc(c.title)}</h3>${c.desc ? `<p class="card-desc">${esc(c.desc)}</p>` : ""}${c.price ? `<p class="card-desc">${esc(c.price)}</p>` : ""}</div>`;
    const media = c.img ? `<div class="card-media live-full"><img src="${esc(c.img.src)}" alt="${esc(c.img.alt)}" loading="lazy"></div>` : "";
    return `<a class="card live-card${w}${tone}${short}" href="${esc(link(c.href))}" style="${c.bg && !c.dark && c.bg !== "rgb(255, 255, 255)" && c.bg !== "rgba(0, 0, 0, 0)" ? `background:${c.bg}` : ""}">${media}${body}</a>`;
  };

  const shelf = (s) => `<section class="shelf live-shelf">
    <div class="shelf-head"><h2><strong>${esc(s.main)}</strong> ${esc(s.secondary)}</h2></div>
    <div class="scroller" data-scroller><div class="scroller-track">${s.cards.map(card).join("")}</div></div></section>`;

  const pnav = (items) => `<section class="shelf live-shelf" aria-label="Shop by category" style="padding-bottom:62px">
    <div class="scroller" data-scroller><div class="scroller-track pnav-track">${items.map((p) => `<a class="pnav-item" href="${esc(link(p.href))}"><span class="pnav-img">${p.img ? `<img src="${esc(p.img.src)}" alt="">` : ""}</span><span>${esc(p.title)}</span></a>`).join("")}</div></div></section>`;

  // Runs before shell.js and components.js: rewrite the DOM synchronously from a blocking request,
  // so the shared scripts wire the new markup as if it were static.
  const req = new XMLHttpRequest();
  req.open("GET", `${root}content/live/${slug}.json`, false);
  try { req.send(); } catch { return; }
  if (req.status !== 200) return;
  const data = JSON.parse(req.responseText);
  document.documentElement.dataset.content = "live";

  const nav = document.querySelector('[data-shell="nav"]');
  if (nav && data.ribbon?.length) {
    nav.dataset.ribbon = [...new Map(data.ribbon.map((r) => [r.text, r])).values()]
      .map((r) => `${esc(r.text)} ${r.link ? `<a class="more" href="${esc(link(r.link.href))}">${esc(r.link.text)}</a>` : ""}`).join("||");
  }
  const h1 = document.querySelector(".page-head h1");
  if (h1 && data.head?.title) h1.textContent = data.head.title;
  const sub = document.querySelector(".page-head-aside h2");
  if (sub && data.head?.subtitle) sub.textContent = data.head.subtitle;

  const main = document.querySelector("main");
  const oldShelves = [...main.querySelectorAll(":scope > .shelf, :scope > section.shelf")];
  const anchor = oldShelves[0];
  if (!anchor) return;
  const html = (data.pnav?.length ? pnav(data.pnav) : "") + data.shelves.map(shelf).join("");
  anchor.insertAdjacentHTML("beforebegin", html);
  oldShelves.forEach((s) => s.remove());
})();
