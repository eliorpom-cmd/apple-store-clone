// Catalog pages: accessories (all, iPhone, Mac, iPad, new arrivals, Watch accessories) and watch bands.
// Runs in the page context: must stay self-contained (no imports, no outer variables).
export default async function extract() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Visible text only: drop screen-reader helpers and footnote markers.
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/‍/g, "").trim();
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  const uniq = (list, key) => { const seen = new Set(); return list.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
  // Best-resolution image of a box: largest rendered <img> with a source.
  const img = (root) => {
    if (!root) return null;
    const list = [...root.querySelectorAll("img")].filter((i) => (i.currentSrc || i.src) && !i.closest("[class*='colorindicator'], [class*='colorimage'], [class*='swatch']"));
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  const swatches = (root) => [...(root?.querySelectorAll("[class*='colorindicator-swatch'] img, [class*='colorindicator'] img") || [])]
    .map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" })).slice(0, 12);

  if (document.querySelector("[class*='rf-wuipselect']")) return extractBands();

  // ----- Accessories -----
  // Category tabs of the curated grid only (the page also has dot carousels with tabs).
  const tabs = [...document.querySelectorAll("button.tabnav-link[role='tab']")];
  // Panels mount on demand: click each tab, let it render, then restore the first one.
  const panelsByTab = [];
  for (const tab of tabs) {
    tab.click();
    await wait(450);
    panelsByTab.push(document.getElementById(tab.getAttribute("aria-controls")));
  }
  tabs[0]?.click();
  await wait(450);
  const panelTiles = (panel) => [...panel.querySelectorAll("[class*='rf-accessory-curated-grid-item']")].map((t) => {
    // Promo tiles (creative cards): full-bleed image with an eyebrow and a headline.
    const promo = t.querySelector(".re-creative-card");
    if (promo) {
      const sizeClass = (promo.className.match(/tile-(\w+)/) || [])[1] || "";
      return {
        kind: "promo",
        size: sizeClass === "large" ? "2x2" : sizeClass === "medium" ? "2x1" : "1x1",
        dark: /theme-dark/.test(promo.className),
        img: img(promo.querySelector(".re-creative-card-image-full-wrapper")),
        eyebrow: txt(promo.querySelector(".re-creative-card-topic-label")),
        title: txt(promo.querySelector(".re-creative-card-title")),
        href: abs(t.querySelector("a[href]")?.getAttribute("href")),
      };
    }
    const card = t.querySelector(".re-productcard-content") || t;
    return {
      kind: "product",
      size: t.dataset.cardSize || "1x1",
      img: img(card.querySelector(".re-productcard-content-img")),
      swatches: swatches(card),
      violator: txt(card.querySelector("[class*='violatortext']")),
      title: txt(card.querySelector("[class*='content-title']")),
      price: txt(card.querySelector("[class*='content-price']")),
      href: abs(card.querySelector("a[href]")?.getAttribute("href") || t.querySelector("a[href]")?.getAttribute("href")),
    };
  }).filter((t) => t.title || t.kind === "promo");
  const picks = {
    title: txt(document.querySelector("[class*='curated-grid-title']")),
    tabs: tabs.map((tab) => ({ text: txt(tab), active: tab.getAttribute("aria-selected") === "true" })),
    panels: panelsByTab.map((panel) => (panel ? panelTiles(panel) : [])),
  };
  // Chapter icons row (iPhone, iPad, Mac...), in page order.
  const chapters = [...document.querySelectorAll(".re-chapternav-item a")].map((a) => ({
    label: txt(a.querySelector(".re-chapternav-label")),
    href: abs(a.getAttribute("href")),
    img: img(a.querySelector(".re-chapternav-icon")),
  })).filter((c) => c.label);
  const chaptersU = uniq(chapters, (c) => c.label + c.href);

  // Header links on the right of the title (store locator, specialist chat).
  const headLinks = [...document.querySelectorAll(".rs-accessories-header-right-section a")].map((a) => ({
    text: txt(a), href: abs(a.getAttribute("href")),
  })).filter((l) => l.text);
  const headLinksU = uniq(headLinks, (l) => l.text + l.href);

  // Media gallery: wide cards in a carousel.
  const gal = document.querySelector(".rf-accessories-media-gallery");
  const gallery = gal ? {
    title: txt(gal.querySelector("[class*='media-gallery-title']")),
    items: uniq([...gal.querySelectorAll(".re-media-card")].map((c) => {
      const a = c.querySelector(".re-media-card-link-container a");
      return {
        img: img(c.querySelector(".re-media-card-image-container")),
        badge: txt(c.querySelector(".re-media-card-badge")),
        title: txt(c.querySelector(".re-media-card-content-header")),
        desc: txt(c.querySelector(".re-media-card-content-description")),
        link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null,
      };
    }).filter((i) => i.title), (i) => i.title),
  } : null;

  // Value props: small icon cards (the icon itself is an SVG and is not copied).
  const vp = document.querySelector(".rf-accessories-value-props-section");
  const valueProps = vp ? {
    title: txt(vp.querySelector("[class*='value-props-title']")),
    items: uniq([...vp.querySelectorAll(".re-icon-card")].map((c) => {
      const a = c.querySelector(".re-icon-card-content-link-text");
      return {
        title: txt(c.querySelector(".re-icon-card-content-header")),
        desc: txt(c.querySelector(".re-icon-card-content-description")),
        link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null,
      };
    }).filter((i) => i.title), (i) => i.title),
  } : null;

  // Index: product and category link lists at the bottom.
  const index = uniq([...document.querySelectorAll(".rc-index-group")].map((g) => ({
    title: txt(g.querySelector("h3")),
    links: [...g.querySelectorAll("a")].map((a) => ({ text: txt(a), href: abs(a.getAttribute("href")) })).filter((l) => l.text),
  })).filter((g) => g.links.length), (g) => g.title);

  // Link centred under the curated grid.
  const bottomA = document.querySelector("[class*='curated-grid-bottom-navlink'] a[href]");
  picks.bottomLink = bottomA ? { text: txt(bottomA), href: abs(bottomA.getAttribute("href")) } : null;

  return {
    template: "catalog",
    kind: "accessories",
    head: { title: txt(document.querySelector("h1")), links: headLinksU },
    chapters: chaptersU,
    gallery,
    picks,
    valueProps,
    index,
  };

  function extractBands() {
    const dims = [...document.querySelectorAll(".rs-wuipselect-dimension")].map((d) => {
      const btn = (d.parentElement || d).querySelector(".rs-wuipselect-dimension-title") || d.querySelector(".rs-wuipselect-dimension-title");
      return {
        // The title button can hold no text node; its tracking label names the dimension.
        title: txt(btn) || (btn?.dataset.trackingLabel || "").replace(/^dimension/, "").replace(/([a-z])([A-Z])/g, "$1 $2"),
        options: [...d.querySelectorAll("[class*='dimension-label']")].map(txt).filter(Boolean),
      };
    }).filter((d) => d.options.length);
    const tile = (t) => {
      const link = t.querySelector("[class*='title-link']");
      return {
        img: img(t.querySelector("[class*='imagecontainer']") || t),
        violator: txt(t.querySelector("[class*='violators']")),
        title: txt(link || t.querySelector("[class*='wuip-title']")),
        href: abs(link?.getAttribute("href")),
        price: txt(t.querySelector("[class*='wuip-price']")),
        savings: txt(t.querySelector("[class*='price-savings']")),
        details: txt(t.querySelector("[class*='wuip-details']")),
        swatches: swatches(t),
      };
    };
    const sections = [...document.querySelectorAll(".rf-wuipselect-collection-section")].map((s) => {
      // Background of the grid block, read from computed style (themes are not class-named consistently).
      const bgEl = s.querySelector("[class*='grid-background'], [class*='collection-background']") || s;
      const theme = getComputedStyle(bgEl).backgroundColor;
      const headerLink = s.querySelector("[class*='collection-header'] a[href]");
      return {
        // The heading holds a "New colors" badge followed by the collection name.
        badge: txt(s.querySelector("[class*='collection-title'] .badge")),
        title: txt(s.querySelector("[class*='collection-title'] div[role='text'] > div:last-child")) || txt(s.querySelector("[class*='collection-title']")),
        subtitle: txt(s.querySelector("[class*='collection-subtitle']")),
        link: headerLink ? { text: txt(headerLink), href: abs(headerLink.getAttribute("href")) } : null,
        bg: theme,
        // Grid cells in page order: product tiles, marketing images and the header cell.
        items: [...s.querySelectorAll(".rf-wuipselect-collection-tile")].map((cell) => {
          if (/tile-header/.test(cell.className)) return { kind: "header" };
          if (/tile-marketing/.test(cell.className)) {
            const gridR = (s.querySelector(".rf-wuipselect-grid, [class*='wuipselect-grid']") || s).getBoundingClientRect();
            const w = cell.getBoundingClientRect().width;
            // Position from the rendered box: full width, left column or right column.
            const pos = w > 900 ? "full" : cell.getBoundingClientRect().left - gridR.left < 100 ? "left" : "right";
            return { kind: "marketing", pos, img: img(cell) };
          }
          const wu = cell.querySelector(".rf-wuipselect-wuip");
          return wu ? { kind: "tile", ...tile(wu) } : null;
        }).filter((i) => i && (i.kind !== "tile" || i.title)),
      };
    }).filter((s) => s.items.some((i) => i.kind === "tile"));
    return {
      template: "catalog",
      kind: "bands",
      head: { title: txt(document.querySelector("h1")), subtitle: txt(document.querySelector("[class*='rf-bands'] p, [class*='rf-bands'] h2")) },
      dims,
      sections,
    };
  }
}
