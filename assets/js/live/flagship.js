// Live renderer for flagship buy pages (HomePod, AirPods, Studio Display, Apple TV, ...).
// Data: tools/extractors/flagship.mjs. Rebuilds <main> from the extracted content, using the page's own
// layout classes (flagship.css) and shared components (configurator, accordion, gallery, modal).
Live.register("flagship", (data, L) => {
  const { esc, link } = L;

  // First dollar amount of a price line; the yearly figure wins for plans ("$14.99/yr.").
  const priceNum = (t) => {
    const yr = String(t || "").match(/\$([\d,]+(?:\.\d+)?)\s*\/\s*yr/);
    const any = String(t || "").match(/\$([\d,]+(?:\.\d+)?)/);
    const m = yr || any;
    return m ? Number(m[1].replace(/,/g, "")) : 0;
  };
  // "$129.00 or $21.50/mo. for 6 mo.*" -> ["$129.00", "or $21.50/mo. for 6 mo.*"]
  const splitPrice = (t) => {
    const m = String(t || "").match(/^(\s*(?:From\s+|Buy from\s+)?\$[\d,.]+)\s*(.*)$/);
    return m ? [m[1].trim(), m[2].trim()] : [String(t || "").trim(), ""];
  };

  // ---- Ribbon ----
  // Ribbon: the source shows it under the local bar, so it is rendered in <main> (the shell puts it above the bar).
  const ribbon = (data.ribbon || [])[0];
  const ribbonHTML = ribbon ? `<div class="live-ribbon"><p>${esc(ribbon.text)}${ribbon.link ? ` <a class="more-plus" href="${esc(link(ribbon.link.href))}">${esc(ribbon.link.text)}</a>` : ""}</p></div>` : "";
  document.body.classList.add("live-flagship");

  const hasSlides = (data.media?.slides || []).length > 1;
  const split = !!data.head?.centered && hasSlides;

  // Gallery slide for an option: the slide whose alt text shares the most words with the option title.
  const words = (t) => String(t || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const slideFor = (title) => {
    const w = words(title);
    let best = -1, score = 0;
    (data.media?.slides || []).forEach((im, i) => {
      const alt = words(im.alt);
      const n = w.filter((x) => alt.includes(x)).length;
      if (n > score) { score = n; best = i; }
    });
    return best;
  };

  // ---- Option markup ----
  const optionHTML = (o, kind, name, dim) => {
    const slide = slideFor(o.title);
    const attrs = `type="${o.type === "checkbox" ? "checkbox" : "radio"}" name="${esc(name)}" value="${esc(o.value)}" data-price="${priceNum(o.priceText)}" data-label="${esc(o.title)}"${slide >= 0 ? ` data-gallery-slide="${slide}"` : ""}${o.checked ? " checked" : ""}`;
    if (kind === "applecare") {
      const bullets = o.bullets?.length ? `<ul>${o.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
      const price = o.priceText ? `<span class="option-price">${esc(o.priceText)}</span>` : "";
      return `<label class="option option-rich"><input ${attrs}><span class="option-label">
        <span class="option-top"><span class="option-plan">${esc(o.title)}</span>${price}</span>
        ${o.sub ? `<span class="option-desc">${esc(o.sub)}</span>` : ""}${bullets}</span></label>`;
    }
    if (o.img) {
      return `<label class="option option-swatch"><input ${attrs}><span class="option-label">
        <span class="live-option-swatch"><img src="${esc(o.img.src)}" alt=""></span>
        <span class="option-name">${esc(o.title)}</span></span></label>`;
    }
    const [first, rest] = splitPrice(o.priceText);
    const price = first ? `<span class="option-price">${esc(first)}${rest ? `<span class="option-sub">${esc(rest)}</span>` : ""}</span>` : "";
    return `<label class="option"><input ${attrs}><span class="option-label">
      <span><span class="option-name">${esc(o.title)}</span>${o.sub ? `<span class="option-sub">${esc(o.sub)}</span>` : ""}</span>${price}</span></label>`;
  };

  const decisionHTML = (d) => (d && (d.header || d.desc))
    ? `<div class="helpcard"><span class="flagship-decision-text"><strong>${esc(d.header)}</strong>${esc(d.desc)}</span>${d.link ? `<a class="more-plus" href="${esc(link(d.link))}">More</a>` : ""}</div>`
    : "";

  // Steps: one fieldset per configurator group, in source order.
  const stepHTML = (s, i) => {
    const name = `step${i}`;
    const allChecks = s.options.length && s.options.every((o) => o.type === "checkbox");
    const optional = allChecks || /personal|accessor|engrav/i.test(s.title || "") && !s.applecare;
    const kind = s.applecare ? "applecare" : s.options.some((o) => o.img) ? "swatch" : "options";
    const cls = s.applecare ? "step flagship-plan" : "step";
    const title = s.title || (s.applecare ? data.applecare?.title || "AppleCare" : "");
    return `<fieldset class="${cls}"${optional ? ' data-optional="true"' : ""}>
      <legend class="step-title">${esc(title)}<span data-step-choice></span></legend>
      ${decisionHTML(s.decision)}
      <div class="options${kind === "swatch" ? " options-2" : ""}">${s.options.map((o) => optionHTML(o, kind, name, s)).join("")}</div>
    </fieldset>`;
  };

  // The configurator form (steps, then AppleCare as the last step, as on the source).
  // A single price (no "From" / "Buy from") is the base of the total; "From" prices start at 0 until a choice is made.
  const baseNum = /from/i.test(data.summary?.price || "") ? 0 : priceNum(data.summary?.price);
  const form = `<form class="flagship-steps" data-configurator data-base="${baseNum}">
      ${(data.steps || []).map(stepHTML).join("")}
      ${data.applecare?.decision ? decisionHTML(data.applecare.decision) : ""}
    </form>`;

  // Summary card: static price text (no JS total on live pages), CTA as on the source.
  const sm = data.summary || {};
  const [sumFirst, sumRest] = splitPrice(sm.price);
  // Restored after the page scripts ran (components.js writes $0 at start-up); live price kept until a choice is made.
  const restorePrice = () => {
    const t = document.querySelector("[data-total]");
    if (t && !document.querySelector("[data-configurator] input:checked")) t.textContent = sumFirst;
  };
  document.addEventListener("DOMContentLoaded", restorePrice);
  const summary = `<div class="flagship-card">
      <p class="live-card-name">${esc(sm.title || String(data.head?.title || "").replace(/^(Pre.order|Buy)\s+/i, ""))}</p>
      <p class="summary-price live-price"><span data-total>${esc(sumFirst || "")}</span></p>
      ${sumRest ? `<p class="live-price-rest">${esc(sumRest)}</p>` : ""}
      ${sm.monthly ? `<p class="live-price-or">${esc(sm.installments || "or")}</p><p class="live-price-monthly">${esc(sm.monthly)}</p>` : ""}
      ${sm.financing ? `<p class="live-price-financing"><span class="more-plus">${esc(sm.financing)}</span></p>` : ""}
      <button class="btn btn-block" type="button" data-add-to-bag="bag.html" disabled>${esc(sm.cta || "Continue")}</button>
      ${sm.moment?.title ? `<div class="live-moment"><h3>${esc(sm.moment.title)}</h3><p>${esc(sm.moment.text)}</p><span class="more">${esc(sm.moment.link)}</span></div>` : ""}
    </div>${data.requirement?.text ? `<p class="live-requirement">${esc(data.requirement.text)} ${data.requirement.link ? `<a href="${esc(link(data.requirement.link.href))}">${esc(data.requirement.link.text)}</a>` : ""}</p>` : ""}${data.purchaseNote ? `<p class="live-purchase-note">${esc(data.purchaseNote)}</p>` : ""}`;

  // ---- Media ----
  const media = split
    ? `<div class="gallery display-gallery" data-gallery><div class="gallery-track">${data.media.slides.map((im) => `<div class="gallery-slide"><img src="${esc(im.src)}" alt="${esc(im.alt)}"></div>`).join("")}</div></div>`
    : hasSlides && !data.media?.main
      ? `<div class="gallery live-main" data-gallery><div class="gallery-track">${data.media.slides.map((im) => `<div class="gallery-slide"><img src="${esc(im.src)}" alt="${esc(im.alt)}"></div>`).join("")}</div></div>`
      : `<div class="live-main"${data.media?.mainBox?.h ? ` style="min-height:${data.media.mainBox.h}px"` : ""}>${data.media?.main ? `<img src="${esc(data.media.main.src)}" alt="${esc(data.media.main.alt)}"${data.media.mainImgBox?.w ? ` style="width:${data.media.mainImgBox.w}px"` : ""}>` : ""}</div>`;
  const perks = (data.buystrip || []).length
    ? `<ul class="flagship-perks">${data.buystrip.map((b) => `<li class="flagship-perk">${b.icon ? `<span class="live-icon">${b.icon}</span>` : ""}<span>${esc(b.text)}</span></li>`).join("")}</ul>` : "";
  const chat = data.chat?.text ? `<p class="flagship-help"><span><strong>${esc(data.chat.text)}</strong>${data.chat.link ? `<a href="${esc(link(data.chat.link.href))}" class="more-ext">${esc(data.chat.link.text)}</a>` : ""}</span></p>` : "";

  // ---- Zoomable gallery: thumbnails under the buy area, viewer on click ----
  const thumbs = data.media?.thumbs || [];
  const slides = data.media?.slides || [];
  const zoom = thumbs.length && slides.length ? `<section class="zoom-strip" aria-label="Gallery">
      ${thumbs.map((t, i) => `<button type="button" class="zoom-thumb" data-zoom-open="${i}" aria-label="Open image ${i + 1}"><img src="${esc(t.src)}" alt="${esc(t.alt)}"></button>`).join("")}
    </section>
    <div class="zoom-viewer" hidden role="dialog" aria-modal="true" aria-label="Gallery">
      <button type="button" class="zoom-close" aria-label="Close"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
      <div class="zoom-track">${slides.map((im) => `<div class="zoom-slide"><img src="${esc(im.src)}" alt="${esc(im.alt)}"></div>`).join("")}</div>
      <button type="button" class="zoom-arrow zoom-prev" aria-label="Previous gallery image"><svg viewBox="0 0 10 16" aria-hidden="true"><path d="M8 1.5L1.8 8 8 14.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <button type="button" class="zoom-arrow zoom-next" aria-label="Next gallery image"><svg viewBox="0 0 10 16" aria-hidden="true"><path d="M2 1.5L8.2 8 2 14.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>` : "";

  // ---- Header ----
  const header = `${data.head?.badge ? `<p class="eyebrow eyebrow-new">${esc(data.head.badge)}</p>` : ""}
      <h1 class="flagship-h1">${esc(data.head?.title || "")}</h1>
      ${data.head?.subtitle ? `<p class="flagship-sub${data.head.compactSub ? " flagship-sub-small" : ""}">${esc(data.head.subtitle)}</p>` : ""}
      ${data.head?.note ? `<p class="flagship-note">${data.head.note.img ? `<img src="${esc(data.head.note.img.src)}" alt="">` : ""}<span>${esc(data.head.note.text)}</span>${data.head.note.link ? ` <a class="more-plus" href="${esc(link(data.head.note.link.href))}">${esc(data.head.note.link.text)}</a>` : ""}</p>` : ""}`;

  const grid = split
    ? `<div class="flagship-split"><div class="flagship-media">${media}</div><div class="flagship-side">${form}${summary}</div></div>`
    : `<div class="flagship-grid"><div class="flagship-media">${media}${perks}${chat}</div><div class="flagship-side">${header}${form}${summary}</div></div>`;
  const top = split ? `<header class="flagship-head-center">${header}</header>` : "";

  // ---- Product information (rows: title left, text right) ----
  const info = (data.productInfo?.rows || []).length ? `<section class="details live-info" id="details" aria-label="Product information">
      ${data.productInfo.title ? `<h2 class="details-title">${esc(data.productInfo.title)}</h2>` : ""}
      ${data.productInfo.rows.map((r) => `<div class="live-info-row"><h3 class="live-info-title">${esc(r.title)}</h3><div class="live-info-body">${(r.items || [{ lead: "", paras: r.paragraphs || [] }]).map((it) => `<div class="live-info-item">${it.lead ? `<strong>${esc(it.lead)}</strong>` : ""}${it.paras.map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}</div>`).join("")}</div></div>`).join("")}
      ${(data.witbFooter || []).length ? `<div class="live-info-note">${data.witbFooter.map((t) => `<p>${esc(t)}</p>`).join("")}</div>` : ""}
    </section>` : "";

  // ---- In the box ----
  // Markup and classes of the shared What's in the box component (components.css).
  const witb = (data.witb?.items || []).length ? `<section class="witb" aria-label="What's in the box">
      <div class="witb-head">${data.witb.title ? `<h2 class="witb-title">${esc(data.witb.title)}</h2>` : ""}
      ${data.witb.sub ? `<p class="witb-sub">${esc(data.witb.sub)}</p>` : ""}</div>
      <ul class="witb-items">
        ${data.witb.items.map((it) => `<li class="witb-item"><div class="witb-image">${it.img ? `<img src="${esc(it.img.src)}" alt="">` : ""}</div><p class="witb-label">${esc(it.label)}</p></li>`).join("")}
      </ul></section>` : "";

  // ---- FAQ accordion ----
  const faq = (data.faq || []).length ? `<section class="details live-faq"><div class="accordion accordion-compact" data-accordion>
      ${data.faq.map((f, i) => `<div class="acc-item"><button class="acc-btn" aria-expanded="${i === 0 ? "true" : "false"}">${esc(f.title)}</button>
        <div class="acc-panel"><div class="acc-panel-inner"><p>${esc(f.body)}</p></div></div></div>`).join("")}
    </div></section>` : "";

  // ---- Comparison table: device columns with picture, size, then icon rows ----
  const c = data.compare;
  // The shared comparison is used when it has product columns; otherwise the local table is.
  const dd = data.ddBlocks?.blocks?.some((b) => b.type === "compare" && b.columns?.length) && typeof Live.ddBlocksHTML === "function" ? data.ddBlocks : null;
  if (dd) Live.ddDone = true; // this page places the shared blocks itself
  const compare = dd ? `<div class="live-dd-blocks">${Live.ddBlocksHTML(dd, L)}</div>` : c && c.columns?.length ? `<section class="compare-live" id="compare" aria-label="Compare">
      ${c.title ? `<h2 class="compare-title">${esc(c.title)}</h2>` : ""}
      <div class="compare-cols" style="--n:${c.columns.length}">${c.columns.map((col) => `<div class="compare-col">
        <div class="compare-img">${col.img ? `<img src="${esc(col.img.src)}" alt="${esc(col.img.alt)}">` : ""}</div>
        <div class="compare-device">${col.badge ? `<p class="eyebrow eyebrow-new">${esc(col.badge)}</p>` : ""}<h3>${esc(col.name)}</h3><p class="compare-price">${esc(col.price)}</p></div>
        ${col.height ? `<div class="compare-dims"><p class="compare-dim-value">${esc(col.height)}</p><p class="compare-dim-label">${esc(col.heightLabel)}</p></div>` : ""}
        ${col.rows.map((r) => `<div class="compare-row">
          <div class="compare-row-head">${r.icon ? `<span class="live-icon">${r.icon}</span>` : ""}${r.stat ? `<p class="compare-stat">${esc(r.stat)}</p>` : ""}<p>${esc(r.title)}</p></div>
          <ul>${r.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul></div>`).join("")}
      </div>`).join("")}</div>
      ${c.link ? `<p class="compare-link"><a href="${esc(link(c.link.href))}" class="more">${esc(c.link.text)}</a></p>` : ""}
    </section>` : "";

  // ---- Promo band (between the comparison and the footer, or after the zoom gallery) ----
  const pr = data.promo;
  const headline = pr ? (pr.header || pr.title || pr.text || "") : "";
  const board = pr?.board;
  const boardHTML = board ? `<section class="live-board"><div class="live-board-plate">
      <div class="live-board-img">${board.hero ? `<img src="${esc(board.hero.src)}" alt="${esc(board.hero.alt)}">` : ""}</div>
      <div class="live-board-info">${board.logo ? `<img class="live-board-logo" src="${esc(board.logo.src)}" alt="">` : ""}
        <p class="live-board-headline">${esc(board.headline)}</p>
        <ul>${(board.links || []).map((l) => `<li><a class="${l.external ? "more-ext" : "more"}" href="${esc(link(l.href))}">${esc(l.text)}</a></li>`).join("")}</ul></div>
    </div></section>` : "";
  const promo = boardHTML ? boardHTML : pr && headline ? `<section class="live-promo${pr.flip ? " live-promo-flip" : ""}">
      <div class="live-promo-text"><p class="live-promo-title">${esc(headline)}</p>${pr.header && pr.text ? `<p class="live-promo-body">${esc(pr.text)}</p>` : ""}${pr.link ? `<a class="more-ext" href="${esc(link(pr.link.href))}">${esc(pr.link.text)}</a>` : ""}</div>
      <div class="live-promo-img">${pr.img ? `<img src="${esc(pr.img.src)}" alt="${esc(pr.img.alt)}">` : ""}</div>
    </section>` : "";

  // ---- Footnotes ----
  const notes = (data.footnotes || []).length ? `<ol class="footnotes">${data.footnotes.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>` : "";
  // Numbered notes go into the footer slot: shell.js shows them above the footer links, as on the source.
  // The legal text is already in the shell's footer copy line (from content/live/_nav.json), so it is not repeated.
  if (data.legal) Live.legalDone = true;
  const footSlot = document.querySelector('[data-shell="footer"]');
  if (footSlot && notes) footSlot.innerHTML = notes;

  const main = document.querySelector("main");
  main.className = "flagship";
  // Local bar: product name on the left, two anchors on the right (sticky under the global nav).
  const barTitle = String(data.head?.title || "").replace(/^(Pre.order|Buy)\s+/i, "");
  const localBar = `<nav class="live-localnav" aria-label="Local"><div class="container"><span class="live-localnav-title">${esc(barTitle)}</span>
      <span class="live-localnav-links"><a href="#details">Overview</a><a href="#compare">Tech Specs</a></span></div></nav>`;
  // Feature bands: text and picture, same layout as the promo band.
  const bandHTML = (b) => `<section class="live-promo">
      <div class="live-promo-text"><p class="live-promo-title">${esc(b.title)}</p>${(b.text || []).map((t) => `<p class="live-promo-body">${esc(t)}</p>`).join("")}${b.link ? `<a class="more-ext" href="${esc(link(b.link.href))}">${esc(b.link.text)}</a>` : ""}</div>
      <div class="live-promo-img">${b.img ? `<img src="${esc(b.img.src)}" alt="${esc(b.img.alt)}">` : ""}</div>
    </section>`;
  const bands = data.bands || [];
  const bandsBefore = bands.filter((b) => !b.after).map(bandHTML).join("");
  const bandsAfter = bands.filter((b) => b.after).map(bandHTML).join("");
  // Source order: billboard (Apple TV) before the box, feature bands before the product information,
  // the Apple Music band and the other bands after the comparison, then the FAQ.
  const billboard = pr?.flip ? promo : "";
  const band = pr?.flip ? "" : promo;
  const faqHTML = faq;
  main.innerHTML = `${localBar}${ribbonHTML}<div class="container">${top}${grid}${zoom}${billboard}${bandsBefore}${witb}${info}${compare}</div>${band}${bandsAfter}<div class="container">${faqHTML}</div>`;

  // ---- Zoomable viewer (opens from the thumbnails, arrows and keys move through the slides) ----
  const viewer = main.querySelector(".zoom-viewer");
  if (viewer) {
    const track = viewer.querySelector(".zoom-track");
    const count = slides.length;
    let index = 0;
    const show = (n) => {
      index = Math.max(0, Math.min(count - 1, n));
      track.style.transform = `translateX(${-index * 73}vw)`;
      // Arrows only where there is something to move to (the source shows a single arrow on the first image).
      viewer.querySelector(".zoom-prev").hidden = index === 0;
      viewer.querySelector(".zoom-next").hidden = index === count - 1;
    };
    const open = (n) => { show(n); viewer.hidden = false; document.documentElement.classList.add("modal-open"); viewer.querySelector(".zoom-close").focus({ preventScroll: true }); };
    const close = () => { viewer.hidden = true; document.documentElement.classList.remove("modal-open"); };
    main.querySelectorAll("[data-zoom-open]").forEach((b) => b.addEventListener("click", () => open(Number(b.dataset.zoomOpen))));
    viewer.querySelector(".zoom-close").addEventListener("click", close);
    viewer.querySelector(".zoom-prev").addEventListener("click", () => show(index - 1));
    viewer.querySelector(".zoom-next").addEventListener("click", () => show(index + 1));
    document.addEventListener("keydown", (e) => {
      if (viewer.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "ArrowLeft") show(index - 1);
    });
  }
});
