// Shared marketing blocks of buy flows (live mode): personal setup, services, and the model comparison.
// Data: tools/extractors/dd-blocks.mjs (data.ddBlocks). content.js inserts the result before the page's FAQ.
// The comparison is a grid: one row per feature group, one cell per product, so every group is as tall as its tallest cell.
Live.ddBlocksHTML = (dd, L) => {
  const { esc } = L;
  // Images are eager (no lazy loading): see configurator.js.
  const eimg = (i, cls = "") => (i && i.src ? `<img src="${esc(i.src)}" alt="${esc(i.alt || "")}"${cls ? ` class="${cls}"` : ""}>` : "");
  const img = (i, cls) => (i ? `<img class="${cls}" src="${esc(i.src)}" alt="${esc(i.alt || "")}"${i.w && i.h ? ` width="${i.w}" height="${i.h}"` : ""}>` : "");
  const more = (l) => (l ? `<a class="more-plus dd-live-link" href="${esc(l.href || "#")}" target="_blank" rel="noopener">${esc(l.text)}</a>` : "");

  const setup = (b) => `<section class="dd-live-block dd-live-setup${b.large ? " dd-live-setup-lg" : ""}"><div class="dd-live-plate dd-live-centered">
    <h2 class="dd-live-h2">${esc(b.title)}</h2>
    ${img(b.img, "dd-live-setup-img")}
    <p class="dd-live-setup-text">${esc(b.text)}</p>
    ${b.link ? `<p class="dd-live-setup-text dd-live-setup-more">${more(b.link)}</p>` : ""}
  </div></section>`;

  const services = (b) => `<section class="dd-live-block dd-live-services"${b.bg ? ` style="background:${esc(b.bg)}"` : ""}>
    ${img(b.img, "dd-live-services-art")}
    <div class="dd-live-plate dd-live-services-info"><h2 class="dd-live-h2">${esc(b.title)}</h2><p class="dd-live-intro">${esc(b.text)}</p></div>
  </section>`;

  // Centred billboard on a grey band: title, line, "more" link.
  const billboard = (b) => `<section class="dd-live-block dd-live-billboard${b.large ? " dd-live-billboard-lg" : ""}"><div class="dd-live-plate dd-live-centered">
    <h2 class="dd-live-billboard-title">${esc(b.title)}</h2>
    <p class="dd-live-billboard-text">${esc(b.text)}</p>
    ${b.link ? `<p class="dd-live-billboard-text"><a class="more" href="${esc(b.link.href || "#")}" target="_blank" rel="noopener">${esc(b.link.text)}</a></p>` : ""}
  </div></section>`;

  // Column header: hero, finish swatches, badge, name, subtitle, price.
  const headCell = (c) => `<div class="dd-live-cell dd-live-col">
    ${c.href ? `<a class="dd-live-hero-link" href="${esc(c.href)}" target="_blank" rel="noopener">${img(c.hero, "dd-live-hero")}</a>` : img(c.hero, "dd-live-hero")}
    <div class="dd-live-swatches">${c.swatches.map((s) => img(s, "dd-live-swatch")).join("")}</div>
    <span class="dd-live-badge">${esc(c.badge)}</span>
    <p class="dd-live-name">${c.href ? `<a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}</p>
    <p class="dd-live-subtitle">${esc(c.subtitle)}</p>
    <p class="dd-live-price">${c.price.map(esc).join("<br>")}</p>
  </div>`;

  // Feature cell: glyph (inline SVG from the source) or icon, eyebrow line, then the lines of the group.
  const featureCell = (f) => {
    if (!f) return `<div class="dd-live-cell"></div>`;
    const mark = f.glyph ? `<div class="dd-live-glyph">${f.glyph}</div>` : img(f.icon, "dd-live-icon");
    const inset = (l) => (l.inset ? ` style="margin-inline:${l.inset}px"` : "");
    const ls = f.lines.map((l) => (l.eyebrow ? `<p class="dd-live-eyebrow">${esc(l.text)}</p>` : `<p class="${l.none ? "dd-live-none" : ""}"${inset(l)}>${esc(l.text)}</p>`)).join("");
    return `<div class="dd-live-cell dd-live-feature">${mark}${ls}</div>`;
  };

  const compare = (b) => {
    const n = b.columns.length;
    const rows = b.keys.map((key) => `<div class="dd-live-row">${b.columns.map((c) => featureCell(c.features.find((f) => f.key === key))).join("")}</div>`).join("");
    const end = `<div class="dd-live-row dd-live-end">${b.columns.map(() => `<div class="dd-live-cell"><hr class="dd-live-sep"></div>`).join("")}</div>`;
    return `<section class="dd-live-block dd-live-compare${b.roomy ? " dd-live-compare-roomy" : ""}"><div class="dd-live-plate">
      <div class="dd-live-compare-head"><h2 class="dd-live-h2">${esc(b.title)}</h2>${b.linkTop && b.link ? `<p class="dd-live-compare-link"><a href="${esc(b.link.href || "#")}" target="_blank" rel="noopener">${esc(b.link.text)}</a></p>` : ""}</div>
      <div class="dd-live-cmp-wrap"><div class="dd-live-cmp" style="--n:${n}">
        <div class="dd-live-row dd-live-head">${b.columns.map(headCell).join("")}</div>
        ${rows}${end}
      </div></div>
      ${b.linkTop ? "" : `<div class="dd-live-compare-foot">${more(b.link)}</div>`}
    </div></section>`;
  };

  return dd.blocks.map((b) => (b.type === "setup" ? setup(b) : b.type === "services" ? services(b) : b.type === "compare" ? compare(b) : b.type === "billboard" ? billboard(b) : "")).join("");
};

// What's in the box (configurators): title, one list per source row, optional note. Data shape:
// { title, wrapped, pair, rows via items[].row, items: [{ label, img }], note: { title, paras } }.
Live.witbHTML = (w, L) => {
  if (!w?.items?.length) return "";
  const { esc } = L;
  const rows = [];
  w.items.forEach((i) => (rows[i.row || 0] ||= []).push(i));
  const li = (i) => `<li class="witb-item"><div class="witb-image">${i.img ? `<img src="${esc(i.img.src)}" alt="${esc(i.img.alt || "")}">` : ""}</div><p class="witb-label">${esc(i.label)}</p></li>`;
  const title = `<h2 class="witb-title">${esc(w.title)}</h2>`;
  const note = w.note ? `<div class="witb-note">${w.note.title ? `<h3>${esc(w.note.title)}</h3>` : ""}${w.note.paras.map((p) => `<p>${esc(p)}</p>`).join("")}</div>` : "";
  const cls = ["witb", rows.length > 1 && "witb-rows", w.pair && "witb-pair"].filter(Boolean).join(" ");
  return `<section class="${cls}" aria-label="${esc(w.title)}">${w.wrapped ? `<div class="witb-head">${title}</div>` : title}
    ${rows.filter(Boolean).map((r) => `<ul class="witb-items">${r.map(li).join("")}</ul>`).join("")}${note}</section>`;
};

// Blocks are inserted by content.js once the page renderer has run; the call is a no-op before that.
Live.flushDd();
