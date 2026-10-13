// Catalog pages: accessories (curated picks), product grids (new arrivals, filtered lists) and watch bands.
// Runs in the page context: must stay self-contained (no imports, no outer variables).
export default async function extract() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Poll until fn returns true, or give up after the timeout.
  const until = async (fn, timeout = 6000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (fn()) return true; await sleep(100); }
    return false;
  };
  // Visible text only: drop screen-reader helpers and footnote markers.
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/‍/g, "").trim();
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  const uniq = (list, key) => { const seen = new Set(); return list.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
  // Best-resolution image of a box: largest rendered <img> with a source (swatches excluded).
  const img = (root) => {
    if (!root) return null;
    const list = [...root.querySelectorAll("img")].filter((i) => (i.currentSrc || i.src) && !i.closest("[class*='colorindicator'], [class*='colorimage'], [class*='swatch']"));
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  const swatches = (root) => [...(root?.querySelectorAll("[class*='colorindicator-swatch'] img, [class*='colorindicator'] img") || [])]
    .map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" })).slice(0, 12);

  if (document.querySelector("[class*='rf-wuipselect']")) return extractBands();
  if (document.querySelector(".re-productgrid-card")) return extractGrid();
  return extractAccessories();

  // ----- Product grid: cards with pagination, sort and a colour filter -----
  async function extractGrid() {
    const cardData = (c) => {
      const link = c.querySelector(".re-productgrid-card-title-link") || c.querySelector("a[href]");
      return {
        // Large cards span two columns on the source grid.
        size: /-large/.test(c.className) ? "2x1" : "1x1",
        href: abs(link?.getAttribute("href")),
        title: txt(c.querySelector("[class*='card-title']")),
        price: txt(c.querySelector("[class*='card-price']")),
        badge: txt(c.querySelector("[class*='badgetext']")),
        img: img(c.querySelector(".re-productgrid-card-img")),
        swatches: [...c.querySelectorAll(".re-productgrid-card-swatches li")].map((li) => ({
          name: li.getAttribute("title") || "",
          src: li.querySelector("img")?.currentSrc || li.querySelector("img")?.src || "",
        })),
      };
    };
    const cards = () => [...document.querySelectorAll(".re-productgrid-card")];
    // Pages load in place: click "Next page" until it is disabled, collecting each page's cards.
    const pages = [];
    for (let guard = 0; guard < 10; guard++) {
      const list = cards().map(cardData).filter((c) => c.title);
      pages.push(list);
      const next = document.querySelector("button[aria-label='Next page']:not([disabled])");
      if (!next) break;
      const firstHref = list[0]?.href;
      next.click();
      await until(() => cards()[0] && cardData(cards()[0]).href !== firstHref);
      await sleep(400);
    }
    const items = uniq(pages.flat(), (c) => c.href);
    const pageCount = Number((document.querySelector("nav.rc-pagination")?.textContent || "").match(/of\s*(\d+)/)?.[1]) || pages.length;
    return {
      template: "catalog",
      kind: "grid",
      head: {
        title: txt(document.querySelector("h1")),
        eyebrow: txt(document.querySelector("h1 [class*='eyebrow']")),
        headline: txt(document.querySelector("h1 [class*='headline']")),
      },
      filterNames: [...document.querySelectorAll(".rc-filter-button")].map(txt).filter(Boolean),
      sortOptions: [...document.querySelectorAll(".rc-sort-option")].map(txt).filter(Boolean),
      pageCount,
      items,
    };
  }

  // ----- Accessories: curated picks, chapters, gallery, value props, index -----
  async function extractAccessories() {
    // Category tabs of the curated grid only (the page also has dot carousels with tabs).
    const tabs = [...document.querySelectorAll("button.tabnav-link[role='tab']")];
    // Panels mount on demand: click each tab, let it render, then restore the first one.
    const panelsByTab = [];
    for (const tab of tabs) {
      tab.click();
      await sleep(450);
      panelsByTab.push(document.getElementById(tab.getAttribute("aria-controls")));
    }
    tabs[0]?.click();
    await sleep(450);

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
    // Link centred under the curated grid.
    const bottomA = document.querySelector("[class*='curated-grid-bottom-navlink'] a[href]");
    picks.bottomLink = bottomA ? { text: txt(bottomA), href: abs(bottomA.getAttribute("href")) } : null;

    // Chapter icons row (iPhone, iPad, Mac...), in page order.
    const chapters = uniq([...document.querySelectorAll(".re-chapternav-item a")].map((a) => ({
      label: txt(a.querySelector(".re-chapternav-label")),
      href: abs(a.getAttribute("href")),
      img: img(a.querySelector(".re-chapternav-icon")),
    })).filter((c) => c.label), (c) => c.label + c.href);

    // Header links on the right of the title (store locator, specialist chat).
    const headLinks = uniq([...document.querySelectorAll(".rs-accessories-header-right-section a")].map((a) => ({
      text: txt(a), href: abs(a.getAttribute("href")),
    })).filter((l) => l.text), (l) => l.text + l.href);

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

    // Value props: icon cards. Each link opens an overlay route whose modal text is fetched.
    const vp = document.querySelector(".rf-accessories-value-props-section");
    const valueProps = vp ? {
      title: txt(vp.querySelector("[class*='value-props-title']")),
      items: await Promise.all(uniq([...vp.querySelectorAll(".re-icon-card")].map((c) => {
        const a = c.querySelector(".re-icon-card-content-link-text");
        return {
          title: txt(c.querySelector(".re-icon-card-content-header")),
          desc: txt(c.querySelector(".re-icon-card-content-description")),
          link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null,
        };
      }).filter((i) => i.title), (i) => i.title).map(async (item) => {
        if (!item.link?.href) return { ...item, modal: null };
        try {
          const html = await (await fetch(item.link.href, { credentials: "include" })).text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          const d = doc.querySelector(".dd-modal, [role='dialog']");
          const modal = d ? {
            title: txt(d.querySelector("h1, h2, h3")),
            paragraphs: [...d.querySelectorAll("p")].map(txt).filter(Boolean),
          } : null;
          return { ...item, modal };
        } catch { return { ...item, modal: null }; }
      })),
    } : null;

    // Index: product and category link lists at the bottom.
    const index = uniq([...document.querySelectorAll(".rc-index-group")].map((g) => ({
      title: txt(g.querySelector("h3")),
      links: [...g.querySelectorAll("a")].map((a) => ({ text: txt(a), href: abs(a.getAttribute("href")) })).filter((l) => l.text),
    })).filter((g) => g.links.length), (g) => g.title);

    return {
      template: "catalog",
      kind: "accessories",
      head: { title: txt(document.querySelector("h1")), links: headLinks },
      chapters,
      gallery,
      picks,
      valueProps,
      index,
    };
  }

  // ----- Watch bands: header, filter dimensions (with membership per tile), collections -----
  async function extractBands() {
    const dimGroups = [...document.querySelectorAll(".rs-wuipselect-dimension")].map((d) => {
      const btn = (d.parentElement || d).querySelector(".rs-wuipselect-dimension-title") || d.querySelector(".rs-wuipselect-dimension-title");
      return {
        // The title button can hold no text node; its tracking label names the dimension.
        title: txt(btn) || (btn?.dataset.trackingLabel || "").replace(/^dimension/, "").replace(/([a-z])([A-Z])/g, "$1 $2"),
        labels: [...d.querySelectorAll("label.rs-wuipselect-dimension-label")],
      };
    }).filter((d) => d.labels.length);
    const dims = dimGroups.map((d) => ({ title: d.title, options: d.labels.map(txt).filter(Boolean) }));

    // Filter membership: tick each option, record which tiles stay visible, untick it.
    // Keyed by product URL: the filter can re-render the tile nodes.
    const hrefOf = (t) => abs(t.querySelector("[class*='title-link']")?.getAttribute("href"));
    const tiles = [...document.querySelectorAll(".rf-wuipselect-wuip")];
    const memberships = new Map(tiles.map((t) => [hrefOf(t), {}]));
    for (let d = 0; d < dimGroups.length; d++) {
      for (const label of dimGroups[d].labels) {
        const name = txt(label);
        label.click();
        await sleep(350);
        // Re-query: the filter re-renders tiles, so the list captured above can be detached.
        [...document.querySelectorAll(".rf-wuipselect-wuip")].forEach((t) => {
          const key = hrefOf(t);
          if (t.offsetParent !== null && memberships.has(key)) (memberships.get(key)[d] ||= []).push(name);
        });
        label.click();
        await sleep(200);
      }
    }
    document.querySelector("[data-autom='filterResetButton']")?.click();
    await sleep(300);

    const tileData = (t) => {
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
        filters: memberships.get(abs(link?.getAttribute("href"))) || {},
      };
    };
    const sections = [...document.querySelectorAll(".rf-wuipselect-collection-section")].map((s) => {
      const headerLink = s.querySelector("[class*='collection-header'] a[href]");
      // Background of the grid block, read from computed style (themes are not class-named consistently).
      const bgEl = s.querySelector("[class*='grid-background'], [class*='collection-background']") || s;
      return {
        // The heading holds a "New colors" badge followed by the collection name.
        badge: txt(s.querySelector("[class*='collection-title'] .badge")),
        title: txt(s.querySelector("[class*='collection-title'] div[role='text'] > div:last-child")) || txt(s.querySelector("[class*='collection-title']")),
        subtitle: txt(s.querySelector("[class*='collection-subtitle']")),
        link: headerLink ? { text: txt(headerLink), href: abs(headerLink.getAttribute("href")) } : null,
        bg: getComputedStyle(bgEl).backgroundColor,
        // Grid cells in page order: product tiles, marketing images and the header cell.
        items: [...s.querySelectorAll(".rf-wuipselect-collection-tile")].map((cell) => {
          if (/tile-header/.test(cell.className)) return { kind: "header" };
          if (/tile-marketing/.test(cell.className)) {
            const gridR = (s.querySelector(".rf-wuipselect-grid, [class*='wuipselect-grid']") || s).getBoundingClientRect();
            const w = cell.getBoundingClientRect().width;
            // Position from the rendered box: full width, left column or right column.
            const pos = w > 900 ? "full" : cell.getBoundingClientRect().left - gridR.left < 100 ? "left" : "right";
            return { kind: "marketing", pos, img: img(cell), w: 0, h: 0 };
          }
          const wu = cell.querySelector(".rf-wuipselect-wuip");
          return wu ? { kind: "tile", ...tileData(wu) } : null;
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
