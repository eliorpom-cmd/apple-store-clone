// Live shelf markup, shared by every live template (store, category, configurators, catalogues).
// Data: tools/extractors/shelves.mjs. Loaded on every page; it only defines Live.shelvesHTML and registers
// the "shelves" template renderer. Other templates render their extra shelves with Live.flushExtras().

// Markup of a list of shelves: two-tone title, then the scroller with its cards in order.
// Cards that share a column (col) are stacked, as the short cards of a grid row on the original.
Live.shelvesHTML = (shelves) => {
  const { esc, link } = Live;
  const isNew = (s) => /new|pre-?order/i.test(s || "");
  const WIDTHS = { 230: " card-w230", 313: " card-w313", 400: "", 480: " card-w480", 646: " card-w646" };

  // Media block: the image, video or pictogram the extractor found for this card.
  const media = (c) => {
    const m = c.media;
    if (!m) return "";
    if (m.type === "video") {
      const poster = m.poster ? ` poster="${esc(m.poster)}"` : "";
      const src = m.src ? `<source src="${esc(m.src)}" type="video/mp4">` : "";
      return `<div class="card-media live-media"><video class="live-video" autoplay muted loop playsinline aria-label="${esc(m.alt)}"${poster}>${src}</video></div>`;
    }
    if (m.type === "icon") return `<div class="live-icon" style="color:${esc(m.color || "inherit")}">${m.svg}</div>`;
    return `<div class="card-media live-media">${Live.img(m)}</div>`;
  };

  // Colour swatches of a product card: small round images, one per colour.
  const swatches = (list) => (list?.length ? `<div class="pcard-swatches live-swatches">${list.map((s) => `<img src="${esc(s.src)}" alt="${esc(s.alt)}">`).join("")}</div>` : "");

  const card = (c) => {
    const w = WIDTHS[c.width] ?? "";
    const tone = c.black ? " card-black" : c.dark ? " card-dark" : "";
    const eyebrow = c.eyebrow ? `<p class="eyebrow${isNew(c.eyebrow) || c.eyebrowNew ? " eyebrow-new" : ""}">${esc(c.eyebrow)}</p>` : "";
    const href = c.href ? esc(link(c.href)) : "#";

    // Product and recommendation cards: swatches, media, title, price and an optional button.
    if (c.kind === "recomm" || c.kind === "product") {
      const cta = c.cta ? `<a class="btn" href="${href}">${esc(c.cta)}</a>` : "";
      return `<article class="card${w || " card-w313"} pcard live-pcard${tone}">
        <div class="pcard-head">${eyebrow}</div>${c.kind === "recomm" ? swatches(c.swatches) + media(c) : media(c) + swatches(c.swatches)}
        <h3 class="pcard-name live-pcard-title">${esc(c.title)}</h3>
        <div class="pcard-info">${c.price ? `<p class="pcard-price">${esc(c.price)}</p>` : ""}${cta}</div></article>`;
    }

    // Generic cards. The media is either a full-bleed background (text on top) or a block under the text.
    const full = c.mode === "full" && c.media && c.media.type !== "icon";
    const isIcon = c.media?.type === "icon";
    const title = c.titleHtml || esc(c.title);
    const body = `<div class="card-body">${eyebrow}<h3 class="card-title${c.short ? " t-card" : ""}">${title}</h3>${c.desc ? `<p class="card-desc">${esc(c.desc)}</p>` : ""}${c.price ? `<p class="card-desc">${esc(c.price)}</p>` : ""}</div>`;
    const bg = c.bg && !c.dark && !["rgb(255, 255, 255)", "rgba(0, 0, 0, 0)"].includes(c.bg) ? ` style="background:${esc(c.bg)}"` : "";
    const cls = [`card${w}`, tone, c.short ? "card-short" : "", full ? "card-full" : "", isIcon ? "card-icon" : ""].join(" ").replace(/\s+/g, " ");
    return `<a class="${cls.trim()}" href="${href}"${bg}>${isIcon || full ? media(c) : ""}${body}${!full && !isIcon ? media(c) : ""}</a>`;
  };

  // Group consecutive cards by column: a single card stands alone, several cards stack in a column.
  const columns = (cards) => {
    const out = [];
    for (const c of cards) {
      const last = out[out.length - 1];
      if (last && c.col !== undefined && last.col === c.col) last.items.push(c);
      else out.push({ col: c.col, items: [c] });
    }
    return out.map((g) => (g.items.length > 1 ? `<div class="live-col">${g.items.map(card).join("")}</div>` : card(g.items[0]))).join("");
  };

  return shelves.map((s) => `<section class="shelf live-shelf">
    <div class="shelf-head"><h2><strong>${esc(s.main)}</strong> ${esc(s.secondary)}</h2></div>
    <div class="scroller" data-scroller><div class="scroller-track">${columns(s.cards)}</div></div></section>`).join("");
};

Live.register("shelves", (data, L) => {
  const { esc, link } = L;
  const pnav = (items) => `<section class="shelf live-shelf" aria-label="Shop by category" style="padding-bottom:62px">
    <div class="scroller" data-scroller><div class="scroller-track pnav-track">${items.map((p) => `<a class="pnav-item" href="${esc(link(p.href))}"><span class="pnav-img">${L.img(p.img)}</span><span>${esc(p.title)}</span></a>`).join("")}</div></div></section>`;

  const nav = document.querySelector('[data-shell="nav"]');
  if (nav && data.ribbon?.length) {
    nav.dataset.ribbon = [...new Map(data.ribbon.map((r) => [r.text, r])).values()]
      .map((r) => `${esc(r.text)} ${r.link ? `<a class="more" href="${esc(link(r.link.href))}">${esc(r.link.text)}</a>` : ""}`).join("||");
  }
  L.text(".page-head h1", data.head?.title);
  L.text(".page-head-aside h2", data.head?.subtitle);
  const tabs = document.querySelector(".catbar .tabs");
  if (tabs && data.tabs?.length) {
    tabs.innerHTML = data.tabs.map((t) => `<a href="${esc(link(t.href))}"${t.active ? ' aria-current="page"' : ""}>${esc(t.text)}</a>`).join("");
  }

  // Quick links (pills) replace the demo block that has id="quick-links"; pages without one get it at the end of <main>.
  const ql = document.getElementById("quick-links");
  if (data.quick?.links?.length) {
    const block = `<section class="shell-container live-quick" id="quick-links"><h2 class="t-card">${esc(data.quick.title)}</h2>
      <div class="pills">${data.quick.links.map((l) => `<a class="btn btn-outline" href="${esc(link(l.href))}">${esc(l.text)}</a>`).join("")}</div></section>`;
    if (ql) ql.outerHTML = block;
    else document.querySelector("main")?.insertAdjacentHTML("beforeend", block);
  }

  // Legal footnotes go into the footer slot; shell.js wraps that slot's content in the footer.
  const foot = document.querySelector('[data-shell="footer"]');
  if (foot && data.footnotes?.length) {
    const notes = data.footnotes.map((n) => `<li>${n.replace(/href="([^"]*)"/g, (m, h) => `href="${esc(link(h))}"`)}</li>`).join("");
    foot.innerHTML = `<ol class="footnotes live-footnotes">${notes}</ol>`;
  }

  const main = document.querySelector("main");
  const old = [...main.querySelectorAll(":scope > section.shelf, :scope > .shelf")];
  if (!old.length) return;
  old[0].insertAdjacentHTML("beforebegin", (data.pnav?.length ? pnav(data.pnav) : "") + Live.shelvesHTML(data.shelves));
  old.forEach((s) => s.remove());
});

Live.flushExtras();
