// Global shell: injects the nav bar, ribbon and footer, then wires flyouts, search, bag and mobile menu.
// Every page includes <div data-shell="nav"></div> at the top and <div data-shell="footer"></div> at the bottom.
(() => {
  const root = document.currentScript?.src.replace(/assets\/js\/shell\.js.*$/, "") || "/";
  const url = (p) => (/^(https?:|#)/.test(p) ? p : root + p);

  // Navigation model: label, flyout groups (first group is "elevated": large links).
  const NAV = [
    ["Store", [["Shop", [["Shop the latest", "index.html"], ["Phones", "pages/buy-phone.html"], ["Computers", "pages/buy-computer.html"], ["Watches", "pages/buy-watch.html"], ["Accessories", "pages/accessories.html"]]], ["Quick links", [["Find a store", "pages/stores.html"], ["Order status", "pages/help.html"], ["Financing", "pages/carrier-offers.html"], ["Trade in", "pages/trade-in.html"]]], ["Shop special stores", [["Certified refurbished", "pages/refurbished.html"], ["Education", "pages/education.html"], ["Upgrade program", "pages/upgrade.html"]]]]],
    ["Computers", [["Explore computers", [["Laptop Air", "pages/config-computer.html"], ["Laptop Pro", "pages/config-computer.html"], ["Desktop", "pages/config-computer.html"], ["Mini", "pages/config-computer.html"], ["Displays", "pages/buy-display.html"]]], ["Shop", [["Shop computers", "pages/buy-computer.html"], ["Accessories", "pages/accessories.html"]]], ["More", [["Compare", "pages/buy-computer.html"], ["Support", "pages/help.html"]]]]],
    ["Tablets", [["Explore tablets", [["Tablet Pro", "pages/buy-computer.html"], ["Tablet Air", "pages/buy-computer.html"], ["Tablet mini", "pages/buy-computer.html"]]], ["Shop", [["Shop tablets", "pages/buy-computer.html"], ["Accessories", "pages/accessories.html"]]]]],
    ["Phones", [["Explore phones", [["Phone Pro", "pages/config-phone.html"], ["Phone Duo", "pages/config-phone-duo.html"], ["Phone Air", "pages/config-phone.html"], ["Phone", "pages/config-phone.html"]]], ["Shop", [["Shop phones", "pages/buy-phone.html"], ["Accessories", "pages/accessories.html"], ["Carrier offers", "pages/carrier-offers.html"]]], ["More", [["Trade in", "pages/trade-in.html"], ["Support", "pages/help.html"]]]]],
    ["Watches", [["Explore watches", [["Watch Series", "pages/config-watch.html"], ["Watch Ultra", "pages/config-watch.html"], ["Watch SE", "pages/config-watch.html"]]], ["Shop", [["Shop watches", "pages/buy-watch.html"], ["Bands", "pages/watch-bands.html"]]]]],
    ["Spatial", [["Explore spatial", [["Headset", "pages/buy-headset.html"]]], ["Shop", [["Shop headset", "pages/buy-headset.html"], ["Accessories", "pages/accessories.html"]]]]],
    ["Audio", [["Explore audio", [["Earbuds", "pages/buy-earbuds.html"], ["Headphones", "pages/buy-earbuds.html"], ["Speakers", "pages/buy-earbuds.html"]]], ["Shop", [["Shop audio", "pages/buy-earbuds.html"], ["Accessories", "pages/accessories.html"]]]]],
    ["Home", [["Explore home", [["TV box", "pages/buy-tvbox.html"], ["Speaker mini", "pages/buy-earbuds.html"]]], ["Shop", [["Shop home", "pages/buy-tvbox.html"]]]]],
    ["Entertainment", [["Explore", [["Gift cards", "pages/gift-cards.html"], ["Events", "pages/today.html"]]]]],
    ["Accessories", [["Shop accessories", [["All accessories", "pages/accessories.html"], ["Cases", "pages/product-case.html"], ["Chargers", "pages/product-charger.html"], ["Watch bands", "pages/watch-bands.html"]]]]],
    ["Support", [["Explore support", [["Help", "pages/help.html"], ["Shipping & pickup", "pages/shipping.html"], ["Find a store", "pages/stores.html"]]], ["More", [["Site map", "pages/sitemap.html"]]]]],
  ];

  // Live content mode: real nav labels and footer directory (content/live/_nav.json, see content.js).
  const liveNav = window.Live?.on && window.Live.nav;
  const rel = (href) => { const l = window.Live.link(href); return window.Live.root && l.startsWith(window.Live.root) ? l.slice(window.Live.root.length) : l; };
  if (liveNav?.items?.length) {
    NAV.splice(0, NAV.length, ...liveNav.items.map((it) => [it.label, it.groups.length
      ? it.groups.map((g) => [g.title || it.label, g.links.map(([t, h]) => [t, rel(h)])])
      : [[it.label, [[it.label, rel(it.href)]]]]]));
  }

  const ICON = {
    logo: '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="7" r="2.4" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 15 44" aria-hidden="true"><circle cx="6.5" cy="21" r="5.3" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M10.4 25l4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
    bag: '<svg viewBox="0 0 14 44" aria-hidden="true"><path d="M1.5 17.5h11v12a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M4.5 17.5v-1a2.5 2.5 0 0 1 5 0v1" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
    arrow: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 5h8M5.5 1.5L9 5 5.5 8.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevL: '<svg viewBox="0 0 10 16" aria-hidden="true"><path d="M8 1.5L1.8 8 8 14.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevR: '<svg viewBox="0 0 10 16" aria-hidden="true"><path d="M2 1.5L8.2 8 2 14.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevD: '<svg viewBox="0 0 11 11" aria-hidden="true"><path d="M1 3.5l4.5 4.5L10 3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sep: '<svg class="sep" viewBox="0 0 6 10" aria-hidden="true"><path d="M1 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
  };

  const groupsHTML = (groups, idx) => groups.map(([title, links], g) => {
    const elevated = g === 0 ? " gnav-group-elevated" : "";
    const items = links.map(([l, h], i) => `<li class="gnav-fly-item" data-i="${i}" data-g="${g}"><a href="${url(h)}">${l}</a></li>`).join("");
    return `<div class="gnav-group${elevated}"><h2 class="gnav-group-title gnav-fly-item" data-i="-1" data-g="${g}">${title}</h2><ul>${items}</ul></div>`;
  }).join("");

  const navHTML = `
<nav class="gnav" aria-label="Global">
  <div class="gnav-content">
    <ul class="gnav-list">
      <li class="gnav-item gnav-logo-item"><a class="gnav-link gnav-logo" href="${url("index.html")}" aria-label="Home">${ICON.logo}</a></li>
      ${NAV.map(([label], i) => `<li class="gnav-item" data-flyout="${i}"><a class="gnav-link" href="${url(NAV[i][1][0][1][0][1])}" aria-expanded="false">${label}</a></li>`).join("")}
      <li class="gnav-item gnav-icon"><a class="gnav-link" href="#" data-panel="search" aria-label="Search" aria-expanded="false">${ICON.search}</a></li>
      <li class="gnav-item gnav-icon gnav-bag"><a class="gnav-link" href="${url("pages/bag.html")}" data-panel="bag" aria-label="Bag" aria-expanded="false">${ICON.bag}<span class="gnav-badge"></span></a></li>
      <li class="gnav-item gnav-menu-item"><button class="gnav-menutrigger" aria-label="Menu" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 18 18"><line class="bread-top" x1="2" y1="5" x2="16" y2="5"/><line class="bread-bottom" x1="2" y1="12" x2="16" y2="12"/></svg></button></li>
    </ul>
  </div>
  <div class="gnav-flyout">
    ${NAV.map(([, groups], i) => `<div class="gnav-flyout-inner" data-panel-id="${i}">${groupsHTML(groups, i)}</div>`).join("")}
    <div class="gnav-flyout-inner gnav-panel-wide" data-panel-id="search">
      <label class="gnav-search-field">${ICON.search.replace('viewBox="0 0 15 44"', 'viewBox="0 13 15 18"')}<input type="search" placeholder="Search the store" aria-label="Search the store"></label>
      <div class="gnav-group"><h2 class="gnav-group-title gnav-fly-item" data-i="-1" data-g="0">Quick links</h2>
        <ul class="gnav-quicklinks">${[["Find a store", "pages/stores.html"], ["Accessories", "pages/accessories.html"], ["Phones", "pages/buy-phone.html"], ["Gift cards", "pages/gift-cards.html"], ["Trade in", "pages/trade-in.html"]].map(([l, h], i) => `<li class="gnav-fly-item" data-i="${i}" data-g="0"><a href="${url(h)}">${ICON.arrow}${l}</a></li>`).join("")}</ul></div>
    </div>
    <div class="gnav-flyout-inner gnav-panel-wide" data-panel-id="bag">
      <div class="gnav-group"><p class="gnav-bag-empty gnav-fly-item" data-i="0" data-g="0">Your bag is empty.</p>
      <p class="gnav-bag-note gnav-fly-item" data-i="1" data-g="0">Sign in to see if you have any saved items.</p>
      <h2 class="gnav-group-title gnav-fly-item" data-i="2" data-g="0">My profile</h2>
      <ul>${[["Bag", "pages/bag.html"], ["Orders", "pages/help.html"], ["Saves", "pages/bag.html"], ["Account", "pages/help.html"], ["Sign in", "pages/bag.html"]].map(([l, h], i) => `<li class="gnav-fly-item" data-i="${i + 3}" data-g="0"><a href="${url(h)}">${l}</a></li>`).join("")}</ul></div>
    </div>
    <div class="gnav-flyout-inner" data-panel-id="menu"><ul class="gnav-mobile-list">${NAV.map(([label], i) => `<li class="gnav-fly-item" data-i="${i}" data-g="0"><a href="${url(NAV[i][1][0][1][0][1])}">${label}</a></li>`).join("")}</ul></div>
  </div>
</nav>
<div class="gnav-curtain"></div>
<div class="gnav-placeholder"></div>`;

  let FOOT = [
    [["Shop and Learn", ["Store", "Computers", "Tablets", "Phones", "Watches", "Spatial", "Audio", "Home", "Accessories", "Gift cards"]]],
    [["Account", ["Manage your account", "Store account", "Cloud"]], ["Entertainment", ["Music", "TV", "Arcade", "Podcasts"]]],
    [["Store", ["Find a store", "Events", "Trade in", "Financing", "Carrier deals", "Order status", "Shopping help"]]],
    [["For Business", ["Business", "Shop for business"]], ["For Education", ["Education", "Shop for college"]], ["For Healthcare", ["Health"]]],
    [["Values", ["Accessibility", "Environment", "Privacy", "Supply chain"]], ["About", ["Newsroom", "Leadership", "Careers", "Contact"]]],
  ];
  if (liveNav?.footer?.length) FOOT = liveNav.footer.map((col) => col.map(([t, links]) => [t, links]));
  const footHTML = (notes) => `
<footer class="gfoot">
  <div class="gfoot-inner">
    ${notes ? `<div class="gfoot-notes">${notes}</div>` : ""}
    <nav class="gfoot-crumbs" aria-label="Breadcrumbs"><a href="${url("index.html")}" aria-label="Home">${ICON.logo}</a>${ICON.sep}<span>${document.title.split(" — ")[0]}</span></nav>
    <nav class="gfoot-dir" aria-label="Directory">${FOOT.map((col) => `<div class="gfoot-col">${col.map(([t, links]) => `<div class="gfoot-section"><button class="gfoot-title" aria-expanded="false">${t}${ICON.chevD}</button><ul class="gfoot-list">${links.map((l) => `<li><a href="${url("pages/sitemap.html")}">${l}</a></li>`).join("")}</ul></div>`).join("")}</div>`).join("")}</nav>
    <p class="gfoot-shop">More ways to shop: <a href="${url("pages/stores.html")}">Find a store</a> or other retailer near you. Or call 0-000-000-0000.</p>
    <div class="gfoot-legal"><span class="gfoot-copy">${liveNav?.legal ? window.Live.esc(liveNav.legal) : "Demo store. Design study, not affiliated with any brand."}</span>
      <ul><li><a href="${url("pages/sitemap.html")}">Privacy Policy</a></li><li><a href="${url("pages/sitemap.html")}">Terms of Use</a></li><li><a href="${url("pages/sitemap.html")}">Sales Policy</a></li><li><a href="${url("pages/sitemap.html")}">Site Map</a></li></ul>
      <span class="gfoot-locale">United States</span></div>
  </div>
</footer>`;

  const ribbonHTML = (msgs) => `
<div class="ribbon"><div class="ribbon-inner">
  ${msgs.length > 1 ? `<button class="ribbon-arrow ribbon-prev" aria-label="Previous">${ICON.chevL}</button>` : ""}
  ${msgs.map((m, i) => `<p class="ribbon-msg${i ? "" : " is-current"}">${m}</p>`).join("")}
  ${msgs.length > 1 ? `<button class="ribbon-arrow ribbon-next" aria-label="Next">${ICON.chevR}</button>` : ""}
</div></div>`;

  // ---------- Inject ----------
  const navSlot = document.querySelector('[data-shell="nav"]');
  if (navSlot) {
    navSlot.outerHTML = navHTML + (navSlot.dataset.ribbon ? ribbonHTML(navSlot.dataset.ribbon.split("||")) : "");
  }
  const footSlot = document.querySelector('[data-shell="footer"]');
  if (footSlot) footSlot.outerHTML = footHTML(footSlot.innerHTML.trim());

  const nav = document.querySelector(".gnav");
  if (!nav) return;
  const flyout = nav.querySelector(".gnav-flyout");
  const curtain = document.querySelector(".gnav-curtain");
  const panels = [...nav.querySelectorAll(".gnav-flyout-inner")];
  const mobile = matchMedia("(max-width: 833px)");
  let current = null, closeTimer = 0;

  // Stagger delays: link delay = index * 20ms + (group + 1) * 80ms; headers get the group delay + 80ms.
  const stagger = (panel) => {
    const items = [...panel.querySelectorAll(".gnav-fly-item")];
    items.forEach((el, n) => {
      const i = Number(el.dataset.i), g = Number(el.dataset.g);
      const d = i < 0 ? g * 80 + 80 : i * 20 + (g + 1) * 80;
      el.style.setProperty("--d", d + "ms");
      el.style.setProperty("--fly-out", Math.min(160 + 20 * (items.length - n), 240) + "ms");
    });
  };

  const open = (id, trigger) => {
    clearTimeout(closeTimer);
    const panel = panels.find((p) => p.dataset.panelId === String(id));
    if (!panel) return;
    const switching = current !== null && current !== String(id);
    panels.forEach((p) => p.classList.toggle("is-current", p === panel));
    stagger(panel);
    nav.querySelectorAll("[aria-expanded]").forEach((a) => a.setAttribute("aria-expanded", "false"));
    nav.querySelectorAll(".gnav-item").forEach((li) => li.classList.remove("is-active"));
    if (trigger) { trigger.setAttribute("aria-expanded", "true"); trigger.closest(".gnav-item")?.classList.add("is-active"); }
    const h = mobile.matches ? window.innerHeight : Math.min(panel.offsetHeight + nav.querySelector(".gnav-content").offsetHeight, window.innerHeight - 88);
    flyout.style.setProperty("--flyout-h", h + "px");
    nav.classList.add("is-open");
    nav.classList.toggle("is-switching", switching);
    if (switching) setTimeout(() => nav.classList.remove("is-switching"), 420);
    if (!mobile.matches) curtain.classList.add("is-on");
    current = String(id);
    if (id === "search") setTimeout(() => panel.querySelector("input")?.focus(), 240);
  };
  const close = () => {
    if (current === null) return;
    nav.classList.remove("is-open", "is-menu", "is-switching");
    flyout.style.removeProperty("--flyout-h");
    curtain.classList.remove("is-on");
    nav.querySelectorAll("[aria-expanded]").forEach((a) => a.setAttribute("aria-expanded", "false"));
    nav.querySelectorAll(".gnav-item").forEach((li) => li.classList.remove("is-active"));
    document.documentElement.style.overflow = "";
    current = null;
  };
  const closeSoon = () => { clearTimeout(closeTimer); closeTimer = setTimeout(close, 120); };

  // Desktop: hover opens flyouts; leaving the nav closes after 120ms.
  nav.querySelectorAll("[data-flyout]").forEach((li) => {
    li.addEventListener("mouseenter", () => { if (!mobile.matches && matchMedia("(hover: hover)").matches) open(li.dataset.flyout, li.querySelector("a")); });
  });
  nav.querySelectorAll(".gnav-logo-item, .gnav-icon").forEach((li) => li.addEventListener("mouseenter", () => { if (current !== null && !["search", "bag"].includes(current)) closeSoon(); }));
  nav.addEventListener("mouseleave", () => { if (current !== null && !["search", "bag", "menu"].includes(current)) closeSoon(); });
  nav.addEventListener("mouseenter", () => clearTimeout(closeTimer));

  // Search and bag panels open on click.
  nav.querySelectorAll("[data-panel]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    current === a.dataset.panel ? close() : open(a.dataset.panel, a);
  }));
  curtain.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  // Mobile menu.
  const trigger = nav.querySelector(".gnav-menutrigger");
  trigger.addEventListener("click", () => {
    if (nav.classList.contains("is-menu")) return close();
    open("menu", trigger);
    nav.classList.add("is-menu");
    document.documentElement.style.overflow = "hidden";
  });
  mobile.addEventListener("change", close);

  // Bag badge reads the demo bag count from localStorage.
  try {
    const n = Number(localStorage.getItem("demo-bag-count") || 0);
    const badge = nav.querySelector(".gnav-badge");
    if (n > 0) { badge.textContent = n; badge.classList.add("has-count"); }
  } catch {}

  // Ribbon carousel.
  const ribbon = document.querySelector(".ribbon");
  if (ribbon) {
    const msgs = [...ribbon.querySelectorAll(".ribbon-msg")];
    let i = 0;
    const show = (n) => { msgs[i].classList.remove("is-current"); i = (n + msgs.length) % msgs.length; msgs[i].classList.add("is-current"); };
    ribbon.querySelector(".ribbon-prev")?.addEventListener("click", () => show(i - 1));
    ribbon.querySelector(".ribbon-next")?.addEventListener("click", () => show(i + 1));
  }

  // Footer accordions on mobile.
  document.querySelectorAll(".gfoot-title").forEach((b) => b.addEventListener("click", () => {
    if (!mobile.matches) return;
    const s = b.closest(".gfoot-section");
    s.classList.toggle("is-open");
    b.setAttribute("aria-expanded", s.classList.contains("is-open"));
  }));
})();
