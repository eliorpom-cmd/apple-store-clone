// Live renderer for shelf pages (store home, category pages). Data: tools/extractors/shelves.mjs.
Live.register("shelves", (data, L) => {
  const { esc, link } = L;
  const isNew = (s) => /new|pre-?order/i.test(s || "");

  const card = (c) => {
    const w = { 230: " card-w230", 313: " card-w313", 400: "", 480: " card-w480", 646: " card-w646" }[c.width] || "";
    const tone = c.black ? " card-black" : c.dark ? " card-dark" : "";
    const eyebrow = c.eyebrow ? `<p class="eyebrow${isNew(c.eyebrow) ? " eyebrow-new" : ""}">${esc(c.eyebrow)}</p>` : "";
    if (c.kind === "recomm" || c.kind === "product") {
      return `<a class="card card-w313 pcard live-pcard${tone}" href="${esc(link(c.href))}">
        ${eyebrow}<div class="card-media">${L.img(c.img)}</div>
        <h3 class="t-card live-pcard-title">${esc(c.title)}</h3><p class="pcard-price">${esc(c.price)}</p></a>`;
    }
    const body = `<div class="card-body">${eyebrow}<h3 class="card-title${c.short ? " t-card" : ""}">${esc(c.title)}</h3>${c.desc ? `<p class="card-desc">${esc(c.desc)}</p>` : ""}${c.price ? `<p class="card-desc">${esc(c.price)}</p>` : ""}</div>`;
    const media = c.img ? `<div class="card-media live-full">${L.img(c.img)}</div>` : "";
    const bg = c.bg && !c.dark && !["rgb(255, 255, 255)", "rgba(0, 0, 0, 0)"].includes(c.bg) ? ` style="background:${c.bg}"` : "";
    return `<a class="card live-card${w}${tone}${c.short ? " card-short" : ""}" href="${esc(link(c.href))}"${bg}>${media}${body}</a>`;
  };

  const shelf = (s) => `<section class="shelf live-shelf">
    <div class="shelf-head"><h2><strong>${esc(s.main)}</strong> ${esc(s.secondary)}</h2></div>
    <div class="scroller" data-scroller><div class="scroller-track">${s.cards.map(card).join("")}</div></div></section>`;

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

  const main = document.querySelector("main");
  const old = [...main.querySelectorAll(":scope > section.shelf, :scope > .shelf")];
  if (!old.length) return;
  old[0].insertAdjacentHTML("beforebegin", (data.pnav?.length ? pnav(data.pnav) : "") + data.shelves.map(shelf).join(""));
  old.forEach((s) => s.remove());
});
