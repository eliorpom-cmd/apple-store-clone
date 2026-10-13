// Live renderer for the catalog-2 template: certified refurbished listing and upgrade program.
// Data: tools/extractors/catalog-2.mjs. Runs before shell.js and components.js, so it builds the
// markup those scripts then enhance. Both kinds share this renderer; data.kind picks the layout.
Live.register("catalog-2", (data, L) => {
  const { esc, link, img } = L;
  const main = document.querySelector("main");
  const bar = document.querySelector(".cat2-localnav-inner");

  // Local nav: source title on the left, source local links (or action) on the right.
  const links = (data.localnav?.links || []).filter((l) => l.text);
  if (bar) {
    bar.innerHTML = `<p class="cat2-localnav-title">${esc(data.localnav?.title)}</p>
      <nav class="cat2-localnav-links" aria-label="${esc(data.localnav?.title)}">
        ${links.map((l) => `<a class="cat2-localnav-anchors" href="${esc(link(l.href))}"${l.current ? ' aria-current="true"' : ""}>${esc(l.text)}</a>`).join("")}
        ${data.localnav?.action ? `<a class="btn" href="#">${esc(data.localnav.action)}</a>` : ""}
      </nav>`;
  }

  // Source image: one <img> per product visual, no color overrides.
  const im = (i, cls = "") => (i && i.src ? `<img class="${cls}" src="${esc(i.src)}" alt="${esc(i.alt || "")}" loading="lazy">` : "");

  if (data.kind === "refurb") {
    const b = data.banner || {};
    const tiles = (data.featured?.tiles || []).map((t) => `
      <a class="cat2-tile" href="${esc(link(t.href))}">
        <div class="cat2-tile-image">${im(t.img)}</div>
        <div class="cat2-tile-info">
          <h3 class="cat2-tile-title">${esc(t.title)}</h3>
          <div class="cat2-prices">
            <p class="cat2-price">${esc(t.price)}</p>
            ${t.was || t.saving ? `<p class="cat2-price-old">${t.was ? `<s>${esc(t.was)}</s>` : ""}${t.saving ? `<span class="cat2-saving">${esc(t.saving)}</span>` : ""}</p>` : ""}
            ${t.monthly ? `<p class="cat2-monthly">${esc(t.monthly)}</p>` : ""}
          </div>
        </div>
      </a>`).join("");
    const cats = (data.categories?.items || []).map((c) => `
      <a class="cat2-cat" href="${esc(link(c.href))}">${im(c.img)}<span>${esc(c.title)}</span></a>`).join("");
    // Promo cards: the first two (large) sit in a row of two, the rest in a row of three.
    const bentoCards = (data.bento?.cards || []).map((c) => {
      const dark = /rgb\((2[0-9][0-9]|1[0-9][0-9]), /.test(c.color || "") && !/rgb\(29, 29, 31\)/.test(c.color);
      return `<div class="cat2-bento-card${/why|applecare/.test(c.name) ? " is-large" : ""}${dark ? " is-dark" : ""}">
        ${c.lines.map((l) => (l.tag === "h2" || l.tag === "h3" ? `<h3 class="cat2-bento-title">${esc(l.text)}</h3>` : `<p class="cat2-bento-text">${esc(l.text)}</p>`)).join("")}
        ${c.img ? im(c.img, "cat2-bento-img") : ""}
        ${c.link ? `<a class="cat2-bento-link" href="${esc(link(c.link.href))}">${esc(c.link.text)}</a>` : ""}
      </div>`;
    }).join("");
    const bento = data.bento ? `<section class="cat2-bento"><div class="cat2-bento-grid">${bentoCards}</div></section>` : "";
    const legal = (data.legal || []).length ? `<div class="cat2-legal container">${data.legal.map((l) => `<p>${esc(l)}</p>`).join("")}</div>` : "";
    main.innerHTML = `
      <section class="cat2-banner live-banner${cats ? "" : " live-banner--listing"}" aria-label="${esc(b.title)}">
        ${b.strip ? `<div class="live-strip-wrap" style="height:${b.strip.height}px"><img class="live-strip" src="${esc(b.strip.src)}" alt="" style="width:${b.strip.width}px;height:${b.strip.height}px"></div>` : ""}
        ${b.icon ? `<img class="live-icon" src="${esc(b.icon.src)}" alt="" style="width:${b.icon.width}px;height:${b.icon.height}px">` : ""}
        <h1 class="cat2-display">${esc(b.title)}</h1>
        ${b.subtitle ? `<p class="cat2-lede">${esc(b.subtitle)}</p>` : ""}
      </section>
      ${cats ? `<section class="cat2-cats" id="categories" aria-label="${esc(data.categories?.title)}">
        <div class="cat2-cats-head"><h2 class="cat2-h32">${esc(data.categories?.title)}</h2></div>
        <div class="cat2-cats-list">${cats}</div>
      </section>` : ""}
      <section class="cat2-featured" aria-label="${esc(data.featured?.title)}">
        ${cats ? `<div class="cat2-featured-head"><h2 class="cat2-h32">${esc(data.featured?.title)}</h2></div>` : ""}
        <div class="cat2-tiles cat2-tiles-live${cats ? "" : " cat2-tiles-listing"}">${tiles}</div>
      </section>
      ${bento}
      ${legal}`;
    return;
  }

  if (data.kind === "upgrade") {
    const it = data.intro || {};
    const steps = (it.steps || []).map((st) => `<li class="cat2-step"><p>${esc(st.text)}</p></li>`).join("");
    const tabs = data.tabs || [];
    const tabBar = tabs.map((t, i) => `<button class="tab" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>${esc(t.text)}</button>`).join("");
    const panels = tabs.map((t, i) => {
      const cards = (data.models || []).filter((m) => m.tab === i).map((m) => `
        <article class="cat2-model">
          <div class="cat2-model-visual${m.swatches?.length ? " has-swatches" : ""}">${im(m.img)}</div>
          ${m.swatches?.length ? `<div class="cat2-swatches" aria-hidden="true">${m.swatches.map((sw) => `<img src="${esc(sw)}" alt="">`).join("")}</div>` : ""}
          <p class="cat2-model-badge">${esc(m.badge)}</p>
          <h3 class="cat2-model-title">${esc(m.title)}</h3>
          <p class="cat2-model-sub">${esc(m.subtitle)}</p>
          <p class="cat2-model-price">${esc(m.price)}</p>
          <a class="btn cat2-model-btn" href="${esc(link(m.href))}">${esc(m.button || "Select")}</a>
        </article>`).join("");
      return `<div class="tab-panel" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i ? " hidden" : ""}>
        <div class="scroller" data-scroller><div class="scroller-track cat2-track">${cards}</div></div></div>`;
    }).join("");
    // Section tone from the source background; height kept at the measured value.
    const toneOf = (bg) => (/rgb\(0, 0, 0\)|rgb\(29, 29, 31\)/.test(bg || "") ? " cat2-sec--dark" : /245, 245, 247/.test(bg || "") ? " cat2-sec--page" : " cat2-sec--light");
    const block = (sct) => `
      <section class="cat2-sec${toneOf(sct.bg)} cat2-live-sec" style="min-height:${sct.height}px">
        <div class="container cat2-sec-inner">
          <div><h2>${esc(sct.title)}</h2>${(sct.text || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
          <div class="cat2-sec-visual">${(sct.images || []).slice(0, 3).map((i) => im(i, "is-m")).join("")}</div>
        </div>
      </section>`;
    const sectionsBefore = (data.sections || []).filter((x) => !/-iphone$/.test(x.name)).map(block).join("");
    const sectionsAfter = (data.sections || []).filter((x) => /-iphone$/.test(x.name)).map(block).join("");
    // Feature-card shelf: one card per .re-feature-card, short height as in the source.
    const shelfCards = (data.shelf?.cards || []).map((c) => {
      const dark = /rgb\((2[0-9][0-9]|1[0-9][0-9]), /.test(c.color || "") && !/rgb\(29, 29, 31\)/.test(c.color);
      return `<a class="card card-w313 cat2-feature${dark ? " card-dark" : ""}" href="${esc(link(c.href))}" style="height:${c.height}px">
        <div class="card-body">${c.lines.map((l) => (l.tag === "h2" || l.tag === "h3" || l.tag === "h4" ? `<h3 class="card-title">${esc(l.text)}</h3>` : `<p class="card-desc">${esc(l.text)}</p>`)).join("")}</div>
        ${c.img ? `<div class="card-media">${im(c.img)}</div>` : ""}</a>`;
    }).join("");
    const shelf = shelfCards ? `<section class="shelf cat2-live-shelf"><div class="scroller" data-scroller><div class="scroller-track">${shelfCards}</div></div></section>` : "";
    const start = data.start ? `<section class="cat2-start live-start container" style="min-height:700px">
        ${data.start.logo ? im(data.start.logo, "live-logo") : ""}
        <h2 class="cat2-h40">${esc(data.start.title)}</h2>
        ${data.start.cta ? `<a class="btn btn-lg" href="${esc(link(data.start.cta.href))}">${esc(data.start.cta.text)}</a>` : ""}
      </section>` : "";
    // FAQ: each source group with its title ("Getting started", "Managing my lease", ...), then its questions.
    const faqItems = (items) => items.map((f) => `
      <div class="acc-item">
        <button class="acc-btn" aria-expanded="false">${esc(f.q)}</button>
        <div class="acc-panel"><div class="acc-panel-inner"><p>${esc(f.a)}</p></div></div>
      </div>`).join("");
    const faqGroupsHtml = (data.faqGroups || []).map((g) => `<h3 class="live-faq-title">${esc(g.title)}</h3><div class="accordion accordion-compact" data-accordion>${faqItems(g.items)}</div>`).join("");
    const faq = (data.faq || []).slice(0, 0).map((f) => `
      <div class="acc-item">
        <button class="acc-btn" aria-expanded="false">${esc(f.q)}</button>
        <div class="acc-panel"><div class="acc-panel-inner"><p>${esc(f.a)}</p></div></div>
      </div>`).join("");
    const heroH = it.posterHeight || it.heroHeight || 0;
    main.innerHTML = `
      <section class="cat2-up-hero live-hero" id="top">
        ${it.logo ? im(it.logo, "live-logo") : ""}
        <h1 class="cat2-display">${esc(it.title)}</h1>
        ${it.poster ? `<div class="cat2-up-visual" ${heroH ? `style="height:${heroH}px"` : ""}>${im(it.poster)}</div>` : ""}
        ${it.text ? `<p class="cat2-up-lede">${esc(it.text)}</p>` : ""}
        <ol id="how" class="cat2-steps">${steps}</ol>
        <div class="cat2-up-cta">${it.cta ? `<a class="btn btn-lg" href="${esc(link(it.cta.href))}">${esc(it.cta.text)}</a>` : ""}</div>
      </section>
      ${sectionsBefore}
      <section id="models" class="container cat2-live-select" aria-label="${esc(data.selectorTitle)}">
        <h2 class="cat2-h40">${esc(data.selectorTitle)}</h2>
        <div class="tabs tabs-pill cat2-tabs" role="tablist" aria-label="Device category" data-tabs>${tabBar}</div>
      </section>
      ${panels}
      ${shelf}
      ${sectionsAfter}
      ${start}
      <section class="container cat2-faq live-faq">${faqGroupsHtml}</section>`;
  }
});
