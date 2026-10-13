// Shared marketing blocks of buy flows (live mode): personal setup, services, and the model comparison.
// Data: tools/extractors/dd-blocks.mjs (data.ddBlocks). content.js inserts the result before the page's FAQ.
// The comparison is a grid: one row per feature group, one cell per product, so every group is as tall as its tallest cell.
Live.ddBlocksHTML = (dd, L) => {
  const { esc } = L;
  // Images are eager (no lazy loading): see configurator.js.
  const eimg = (i, cls = "") => (i && i.src ? `<img src="${esc(i.src)}" alt="${esc(i.alt || "")}"${cls ? ` class="${cls}"` : ""}>` : "");
  const img = (i, cls) => (i ? `<img class="${cls}" src="${esc(i.src)}" alt="${esc(i.alt || "")}">` : "");
  const more = (l) => (l ? `<a class="more-plus dd-live-link" href="${esc(l.href || "#")}" target="_blank" rel="noopener">${esc(l.text)}</a>` : "");

  const setup = (b) => `<section class="dd-live-block dd-live-setup"><div class="dd-live-plate dd-live-centered">
    <h2 class="dd-live-h2">${esc(b.title)}</h2>
    ${img(b.img, "dd-live-setup-img")}
    <p class="dd-live-intro">${esc(b.text)}</p>
    ${more(b.link)}
  </div></section>`;

  const services = (b) => `<section class="dd-live-block dd-live-services">
    ${img(b.img, "dd-live-services-art")}
    <div class="dd-live-plate dd-live-services-info"><h2 class="dd-live-h2">${esc(b.title)}</h2><p class="dd-live-intro">${esc(b.text)}</p></div>
  </section>`;

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
    const ls = f.lines.map((l) => (l.eyebrow ? `<p class="dd-live-eyebrow">${esc(l.text)}</p>` : `<p class="${l.none ? "dd-live-none" : ""}">${esc(l.text)}</p>`)).join("");
    return `<div class="dd-live-cell dd-live-feature">${mark}${ls}</div>`;
  };

  const compare = (b) => {
    const n = b.columns.length;
    const rows = b.keys.map((key) => `<div class="dd-live-row">${b.columns.map((c) => featureCell(c.features.find((f) => f.key === key))).join("")}</div>`).join("");
    const end = `<div class="dd-live-row dd-live-end">${b.columns.map(() => `<div class="dd-live-cell"><hr class="dd-live-sep"></div>`).join("")}</div>`;
    return `<section class="dd-live-block dd-live-compare"><div class="dd-live-plate">
      <div class="dd-live-compare-head"><h2 class="dd-live-h2">${esc(b.title)}</h2></div>
      <div class="dd-live-cmp-wrap"><div class="dd-live-cmp" style="--n:${n}">
        <div class="dd-live-row dd-live-head">${b.columns.map(headCell).join("")}</div>
        ${rows}${end}
      </div></div>
      <div class="dd-live-compare-foot">${more(b.link)}</div>
    </div></section>`;
  };

  return dd.blocks.map((b) => (b.type === "setup" ? setup(b) : b.type === "services" ? services(b) : b.type === "compare" ? compare(b) : "")).join("");
};

// Blocks are inserted by content.js once the page renderer has run; the call is a no-op before that.
Live.flushDd();
