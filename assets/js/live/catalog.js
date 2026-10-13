// Live renderer for catalog pages: accessories (curated picks, category tabs), product grids
// (new arrivals and filtered lists) and watch bands (filter bar, collections).
// Data: tools/extractors/catalog.mjs. Runs before shell.js and components.js, so it only builds markup.
Live.register("catalog", (data, L) => {
  const { esc, link } = L;
  const PAGE_BG = "rgb(245, 245, 247)"; // page grey: sections in this colour keep the default background
  const PAGE_SIZE = 30;                 // cards per page on the source grid

  // Two-tone heading: first sentence in the dark tone, the rest in grey, as on the source page.
  const twoTone = (title) => {
    const m = (title || "").match(/^(.*?[.!?])\s*(.*)$/);
    if (!m) return `<strong>${esc(title)}</strong>`;
    return `<strong>${esc(m[1])}</strong>${m[2] ? ` <span>${esc(m[2])}</span>` : ""}`;
  };
  const scroller = (cards) => `<div class="scroller" data-scroller><div class="scroller-track">${cards.join("")}</div></div>`;
  // Source tiles carry their size as a span name: 2x2 is large, 2x1 is wide.
  const tileClass = (size) => ({ "2x2": "cat-tile cat-tile--large", "2x1": "cat-tile cat-tile--wide" }[size] || "cat-tile");
  const dotsOf = (swatches) => `<div class="cat-dots" aria-hidden="true">${(swatches || []).map((s) => `<i><img src="${esc(s.src)}" alt="" loading="lazy"></i>`).join("")}</div>`;

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
    ${dotsOf(t.swatches)}
    ${t.violator ? `<p class="cat-badge">${esc(t.violator)}</p>` : ""}
    <p class="cat-tile-title">${esc(t.title)}</p>
    <p class="cat-tile-price">${esc(t.price)}</p>
  </a>`;

  // Product-grid card (same tile, one size).
  const listTile = (t) => `
  <a class="${t.size === "2x1" ? "cat-tile cat-tile--wide cat-tile--list" : "cat-tile cat-tile--list"}" href="${esc(link(t.href))}">
    <div class="cat-tile-media">${L.img(t.img)}</div>
    ${dotsOf(t.swatches)}
    ${t.badge ? `<p class="cat-badge">${esc(t.badge)}</p>` : ""}
    <p class="cat-tile-title">${esc(t.title)}</p>
    <p class="cat-tile-price">${esc(t.price)}</p>
  </a>`;

  // Watch band tile. data-band and data-f feed the filter in catalog.js.
  const bandTile = (t) => `
    <a class="cat-band" href="${esc(link(t.href))}" data-band data-f="${esc(JSON.stringify(t.filters || {}))}">
      <div class="cat-band-media">${L.img(t.img)}</div>
      <p class="cat-band-badge${t.violator ? "" : " is-empty"}"${t.violator ? "" : ' aria-hidden="true"'}>${esc(t.violator || "New")}</p>
      <p class="cat-band-title">${esc(t.title)}</p>
      <p class="cat-band-price">${esc(t.price)}</p>
    </a>`;

  // Remove demo blocks that a data kind replaces.
  const drop = (...sels) => sels.forEach((s) => document.querySelectorAll(s).forEach((n) => n.remove()));

  // ----- Product grid mode -----
  const renderGrid = () => {
    const items = data.items || [];
    drop(".cat-chapters", ".cat-gallery", ".cat-picks", ".cat-value", ".cat-index", ".cat-lede");
    L.text("h1", data.head?.title);
    const head = document.querySelector(".cat-head");
    const colors = [...new Map(items.flatMap((i) => i.swatches || []).filter((s) => s.name).map((s) => [s.name, s])).keys()];
    const sortOpts = data.sortOptions?.length ? data.sortOptions : ["Featured"];
    const wrap = document.createElement("section");
    wrap.className = "cat-listing";
    wrap.innerHTML = `
      <div class="cat-wrap">
        <div class="cat-listbar">
          <div class="cat-listbar-filters">
            ${colors.length ? `<div class="cat-dim"><button class="cat-dim-title" type="button" aria-expanded="false" data-color-toggle>Color</button>
              <div class="cat-dim-options cat-color-options" data-color-options>${colors.map((c) => `<button class="cat-chip" type="button" aria-pressed="false" data-color="${esc(c)}">${esc(c)}</button>`).join("")}</div></div>` : ""}
          </div>
          <label class="cat-sort">${esc("Sort")} <select data-sort>${sortOpts.map((s, i) => `<option value="${i}">${esc(s)}</option>`).join("")}</select></label>
          <p class="cat-filter-count" data-listcount aria-live="polite"></p>
        </div>
        <div class="cat-grid cat-grid--list" data-list></div>
        <nav class="cat-pager" aria-label="Pagination" data-pager></nav>
      </div>`;
    const anchor = head && head.nextElementSibling;
    if (head) head.after(wrap);
    else document.querySelector("main")?.prepend(wrap);
    void anchor;

    const state = { color: new Set(), sort: 0, page: 1 };
    const list = wrap.querySelector("[data-list]");
    const pager = wrap.querySelector("[data-pager]");
    const priceOf = (t) => Number((t.price || "").replace(/[^0-9.]/g, "")) || 0;
    // Sort options: 0 keeps the source order; price options sort by the extracted price.
    const sorted = (list0) => {
      const label = (sortOpts[state.sort] || "").toLowerCase();
      if (label.includes("low to high")) return [...list0].sort((a, b) => priceOf(a) - priceOf(b));
      if (label.includes("high to low")) return [...list0].sort((a, b) => priceOf(b) - priceOf(a));
      return list0;
    };
    const render = () => {
      const matched = items.filter((i) => !state.color.size || (i.swatches || []).some((s) => state.color.has(s.name)));
      const ordered = sorted(matched);
      const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
      state.page = Math.min(state.page, pages);
      const slice = ordered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
      list.innerHTML = slice.map(listTile).join("");
      wrap.querySelector("[data-listcount]").textContent = `${matched.length} ${matched.length === 1 ? "result" : "results"}`;
      pager.innerHTML = pages > 1 ? `
        <button class="cat-pager-btn" type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>Previous page</button>
        ${Array.from({ length: pages }, (_, k) => `<button class="cat-pager-num" type="button" data-page="${k + 1}" aria-current="${k + 1 === state.page}">${k + 1}</button>`).join("")}
        <button class="cat-pager-btn" type="button" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""}>Next page</button>` : "";
    };
    wrap.querySelector("[data-color-toggle]")?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      btn.closest(".cat-dim").classList.toggle("is-open", open);
    });
    wrap.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-color]");
      if (chip) {
        const c = chip.dataset.color;
        state.color.has(c) ? state.color.delete(c) : state.color.add(c);
        chip.setAttribute("aria-pressed", String(state.color.has(c)));
        state.page = 1; render(); return;
      }
      const pg = e.target.closest("[data-page]");
      if (pg && !pg.disabled) { state.page = Number(pg.dataset.page); render(); window.scrollTo({ top: wrap.offsetTop, behavior: "smooth" }); }
    });
    wrap.querySelector("[data-sort]").addEventListener("change", (e) => { state.sort = Number(e.target.value); state.page = 1; render(); });
    render();
  };

  // ----- Accessories -----
  const renderAccessories = () => {
    const title = data.picks?.title || "";
    L.text("h1", data.head?.title);
    const h2 = document.getElementById("picks-title");
    if (h2 && title) h2.innerHTML = twoTone(title);
    drop(".cat-lede");

    // Header links on the right of the title.
    const head = document.querySelector(".cat-head");
    if (head && data.head?.links?.length) {
      head.insertAdjacentHTML("beforeend", `<div class="cat-head-links">${data.head.links.map((l) => `<a class="more-ext" href="${esc(link(l.href))}">${esc(l.text)}</a>`).join("")}</div>`);
    }

    // Order on the source page: header, chapter icons, media gallery, picks, value props, index.
    const picksSection = document.querySelector(".cat-picks");
    const tabs = document.querySelector(".cat-pills");
    const wrapPicks = document.querySelector(".cat-picks .cat-wrap");
    if (tabs && data.picks?.tabs?.length) {
      tabs.innerHTML = data.picks.tabs.map((t, i) => `<button class="tab" type="button" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t.text)}</button>`).join("");
      const panels = data.picks.panels.map((tiles, i) => `
      <div class="tab-panel cat-grid" id="panel-${i}" role="tabpanel" aria-labelledby="tab-${i}"${i === 0 ? "" : " hidden"}>${tiles.map(accessoryTile).join("")}</div>`).join("");
      wrapPicks.querySelectorAll(":scope > .tab-panel").forEach((p) => p.remove());
      tabs.insertAdjacentHTML("afterend", panels);
      const more = data.picks.bottomLink;
      if (more?.text) wrapPicks.insertAdjacentHTML("beforeend", `<p class="cat-grid-more"><a class="more" href="${esc(link(more.href))}">${esc(more.text)}</a></p>`);
    }
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

    // Value props: each card opens a modal with the overlay text fetched from the source.
    const modals = [];
    if (picksSection && data.valueProps?.items?.length) {
      const cards = data.valueProps.items.map((i, n) => {
        const id = `vp-modal-${n}`;
        if (i.modal) {
          modals.push(`
    <div class="modal" id="${id}">
      <div class="modal-panel"><div class="modal-content">
        <h2>${esc(i.modal.title || i.title)}</h2>
        ${(i.modal.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}
      </div></div>
    </div>`);
        }
        const action = i.modal
          ? `<a class="more card-link" href="#" data-modal-open="${id}">${esc(i.link?.text || "Learn more")}</a>`
          : i.link?.text ? `<a class="more card-link" href="${esc(link(i.link.href))}">${esc(i.link.text)}</a>` : "";
        return `
          <div class="card card-w313"><div class="card-body">
            <h3 class="card-title t-card">${esc(i.title)}</h3>
            ${i.desc ? `<p class="card-desc">${esc(i.desc)}</p>` : ""}
            ${action}
          </div></div>`;
      });
      picksSection.insertAdjacentHTML("afterend", `
    <section class="cat-value">
      <div class="cat-wrap"><h2 class="cat-h2">${twoTone(data.valueProps.title)}</h2>${scroller(cards)}</div>
    </section>`);
    }
    if (data.index?.length) {
      const groups = data.index.map((g) => `
          <div class="cat-index-group"><h3 class="cat-index-title">${esc(g.title)}</h3>
            <ul>${g.links.map((l) => `<li><a href="${esc(link(l.href))}">${esc(l.text)}</a></li>`).join("")}</ul></div>`);
      const after = document.querySelector(".cat-value") || picksSection;
      after?.insertAdjacentHTML("afterend", `
    <section class="cat-index"><div class="cat-wrap cat-index-groups">${groups.join("")}</div></section>`);
    }
    if (modals.length) document.querySelector('[data-shell="footer"]')?.insertAdjacentHTML("beforebegin", modals.join(""));
  };

  // ----- Watch bands -----
  const renderBands = () => {
    L.text(".cat-hero", data.head?.title);
    drop(".cat-bands-hero .cat-lede");

    // Filter bar: one dropdown per source dimension; the options are real checkboxes that filter the tiles.
    const total = data.sections.reduce((n, s) => n + s.items.filter((i) => i.kind === "tile").length, 0);
    const dims = document.querySelector(".cat-filter-dims");
    if (dims) dims.innerHTML = data.dims.map((d, i) => `
          <div class="cat-dim">
            <button class="cat-dim-title" type="button" aria-expanded="false" data-dim-toggle>${esc(d.title)}</button>
            <div class="cat-dim-options">${d.options.map((o) => `<label class="cat-opt"><input type="checkbox" name="dim${i}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>
          </div>`).join("");
    const count = document.querySelector("[data-count]");
    if (count) count.textContent = `${total} bands`;

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
      if (item.kind === "marketing") return `<div class="cat-band-mkt cat-band-mkt--${item.pos}">${L.img(item.img)}</div>`;
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
  };

  if (data.kind === "grid") return renderGrid();
  if (data.kind === "accessories") return renderAccessories();
  if (data.kind === "bands") return renderBands();
});
