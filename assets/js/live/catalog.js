// Live renderer for catalog pages: accessories (curated picks, category tabs) and watch bands
// (sticky filter bar, collections). Data: tools/extractors/catalog.mjs.
// Runs before shell.js and components.js, so it only builds markup for them.
Live.register("catalog", (data, L) => {
  const { esc, link } = L;
  const PAGE_BG = "rgb(245, 245, 247)"; // page grey: sections in this colour keep the default background

  // Source tiles carry their size as a span name: 2x2 is large, 2x1 is wide.
  const tileClass = (size) => ({ "2x2": "cat-tile cat-tile--large", "2x1": "cat-tile cat-tile--wide" }[size] || "cat-tile");

  const promoTile = (t) => `
  <a class="${tileClass(t.size)} cat-tile--promo${t.dark ? " is-dark" : ""}" href="${esc(link(t.href))}">
    <div class="cat-promo-media">${L.img(t.img)}</div>
    <div class="cat-promo-text">
      ${t.eyebrow ? `<p class="cat-promo-eyebrow">${esc(t.eyebrow)}</p>` : ""}
      <p class="cat-promo-title">${esc(t.title)}</p>
    </div>
  </a>`;

  const accessoryTile = (t) => t.kind === "promo" ? promoTile(t) : `
  <a class="${tileClass(t.size)}" href="${esc(link(t.href))}">
    <div class="cat-tile-media">${L.img(t.img)}</div>
    <div class="cat-dots" aria-hidden="true">${(t.swatches || []).map((s) => `<i><img src="${esc(s.src)}" alt="" loading="lazy"></i>`).join("")}</div>
    ${t.violator ? `<p class="cat-badge">${esc(t.violator)}</p>` : ""}
    <p class="cat-tile-title">${esc(t.title)}</p>
    <p class="cat-tile-price">${esc(t.price)}</p>
  </a>`;

  const bandTile = (t) => `
    <a class="cat-band" href="${esc(link(t.href))}">
      <div class="cat-band-media">${L.img(t.img)}</div>
      <p class="cat-band-badge${t.violator ? "" : " is-empty"}"${t.violator ? "" : ' aria-hidden="true"'}>${esc(t.violator || "New")}</p>
      <p class="cat-band-title">${esc(t.title)}</p>
      <p class="cat-band-price">${esc(t.price)}</p>
    </a>`;

  // Two-tone heading: first sentence in the dark tone, the rest in grey, as on the source page.
  const twoTone = (title) => {
    const m = (title || "").match(/^(.*?[.!?])\s*(.*)$/);
    if (!m) return `<strong>${esc(title)}</strong>`;
    return `<strong>${esc(m[1])}</strong>${m[2] ? ` <span>${esc(m[2])}</span>` : ""}`;
  };
  const scroller = (cards) => `<div class="scroller" data-scroller><div class="scroller-track">${cards.join("")}</div></div>`;

  if (data.kind === "accessories") {
    const title = data.picks?.title || "";
    L.text("h1", data.head?.title);
    const h2 = document.getElementById("picks-title");
    if (h2 && title) h2.innerHTML = twoTone(title);
    document.querySelector(".cat-lede")?.remove();

    // Header links on the right of the title.
    const head = document.querySelector(".cat-head");
    if (head && data.head?.links?.length) {
      head.insertAdjacentHTML("beforeend", `<div class="cat-head-links">${data.head.links.map((l) => `<a class="more-ext" href="${esc(link(l.href))}">${esc(l.text)}</a>`).join("")}</div>`);
    }

    // Order on the source page: header, chapter icons, media gallery, picks, value props, index.
    const picksSection = document.querySelector(".cat-picks");
    if (picksSection && data.chapters?.length) {
      picksSection.insertAdjacentHTML("beforebegin", `
    <nav class="cat-chapters" aria-label="Browse by product">
      <ul class="cat-chapters-row">${data.chapters.map((c) => `<li><a class="cat-chapter" href="${esc(link(c.href))}"><span class="cat-chapter-icon">${L.img(c.img)}</span><span class="cat-chapter-label">${esc(c.label)}</span></a></li>`).join("")}</ul>
    </nav>`);
    }
    if (picksSection && data.gallery?.items?.length) {
      const cards = data.gallery.items.map((i) => `
          <div class="card cat-media-card">
            <div class="cat-media-img">${L.img(i.img)}</div>
            <div class="cat-media-body">
              ${i.badge ? `<p class="cat-badge">${esc(i.badge)}</p>` : ""}
              <h3 class="cat-media-title">${esc(i.title)}</h3>
              ${i.desc ? `<p class="cat-media-desc">${esc(i.desc)}</p>` : ""}
              ${i.link?.text ? `<a class="more" href="${esc(link(i.link.href))}">${esc(i.link.text)}</a>` : ""}
            </div>
          </div>`);
      picksSection.insertAdjacentHTML("beforebegin", `
    <section class="cat-gallery">
      <div class="cat-wrap"><h2 class="cat-h2">${twoTone(data.gallery.title)}</h2>${scroller(cards)}</div>
    </section>`);
    }
    if (picksSection && data.valueProps?.items?.length) {
      const cards = data.valueProps.items.map((i) => `
          <div class="card card-w313"><div class="card-body">
            <h3 class="card-title t-card">${esc(i.title)}</h3>
            ${i.desc ? `<p class="card-desc">${esc(i.desc)}</p>` : ""}
            ${i.link?.text ? `<a class="more card-link" href="${esc(link(i.link.href))}">${esc(i.link.text)}</a>` : ""}
          </div></div>`);
      picksSection.insertAdjacentHTML("afterend", `
    <section class="cat-value">
      <div class="cat-wrap"><h2 class="cat-h2">${twoTone(data.valueProps.title)}</h2>${scroller(cards)}</div>
    </section>`);
    }
    if (picksSection && data.index?.length) {
      const groups = data.index.map((g) => `
          <div class="cat-index-group"><h3 class="cat-index-title">${esc(g.title)}</h3>
            <ul>${g.links.map((l) => `<li><a href="${esc(link(l.href))}">${esc(l.text)}</a></li>`).join("")}</ul></div>`);
      const after = document.querySelector(".cat-value") || picksSection;
      after.insertAdjacentHTML("afterend", `
    <section class="cat-index"><div class="cat-wrap cat-index-groups">${groups.join("")}</div></section>`);
    }

    const tabs = document.querySelector(".cat-pills");
    const wrap = document.querySelector(".cat-picks .cat-wrap");
    const oldPanels = [...wrap.querySelectorAll(":scope > .tab-panel")];
    if (tabs && data.picks?.tabs?.length) {
      tabs.innerHTML = data.picks.tabs.map((t, i) => `<button class="tab" type="button" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t.text)}</button>`).join("");
      const panels = data.picks.panels.map((tiles, i) => `
      <div class="tab-panel cat-grid" id="panel-${i}" role="tabpanel" aria-labelledby="tab-${i}"${i === 0 ? "" : " hidden"}>${tiles.map(accessoryTile).join("")}</div>`).join("");
      oldPanels.forEach((p) => p.remove());
      tabs.insertAdjacentHTML("afterend", panels);
      const more = data.picks.bottomLink;
      if (more?.text) wrap.insertAdjacentHTML("beforeend", `<p class="cat-grid-more"><a class="more" href="${esc(link(more.href))}">${esc(more.text)}</a></p>`);
    }
    return;
  }

  if (data.kind === "bands") {
    L.text(".cat-hero", data.head?.title);
    document.querySelector(".cat-bands-hero .cat-lede")?.remove();

    // Filter bar: the source's dimension names only (the options open on the source page, and
    // per-tile filter data is not extracted, so the live bar does not filter).
    const total = data.sections.reduce((n, s) => n + s.items.filter((i) => i.kind === "tile").length, 0);
    const dims = document.querySelector(".cat-filter-dims");
    if (dims) dims.innerHTML = data.dims.map((d) => `<div class="cat-dim"><p class="cat-dim-title">${esc(d.title)}</p></div>`).join("");
    const count = document.querySelector("[data-count]");
    if (count) count.textContent = `${total} bands`;
    document.querySelector("[data-reset]")?.remove();

    // One grid per collection: the header cell and the marketing images sit among the tiles.
    const cell = (item, s) => {
      if (item.kind === "header") {
        return `<div class="cat-band-head">
          ${s.badge ? `<p class="cat-badge">${esc(s.badge)}</p>` : ""}
          <h2 class="cat-collection-title">${esc(s.title)}</h2>
          ${s.subtitle ? `<p class="cat-collection-sub">${esc(s.subtitle)}</p>` : ""}
          ${s.link?.text ? `<a class="more" href="${esc(link(s.link.href))}">${esc(s.link.text)}</a>` : ""}
        </div>`;
      }
      if (item.kind === "marketing") {
        return `<div class="cat-band-mkt cat-band-mkt--${item.pos}">${L.img(item.img)}</div>`;
      }
      return bandTile(item);
    };
    const anchor = document.querySelector(".cat-empty");
    document.querySelectorAll("[data-collection]").forEach((s) => s.remove());
    const sections = data.sections.map((s, i) => {
      const bg = s.bg && s.bg !== PAGE_BG && !["rgba(0, 0, 0, 0)"].includes(s.bg) ? ` style="background:${esc(s.bg)}"` : "";
      // A left-column marketing image comes before the header cell; the other items keep page order.
      const items = [...s.items];
      const left = items.findIndex((x) => x.kind === "marketing" && x.pos === "left");
      if (left > 0) items.unshift(items.splice(left, 1)[0]);
      return `
    <section class="cat-section" data-collection aria-labelledby="col-live-${i}"${bg}>
      <div class="cat-wrap">
        <div class="cat-band-grid">${items.map((x) => cell(x, s)).join("")}</div>
      </div>
    </section>`;
    });
    if (anchor) anchor.insertAdjacentHTML("beforebegin", sections.join(""));
  }
});
