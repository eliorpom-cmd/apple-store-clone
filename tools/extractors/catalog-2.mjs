// Catalog pages 2: refurbished listing and upgrade program. Runs in the page context: must stay self-contained.
// Returns kind "refurb" or "upgrade" (both pages share this template), with visible text and image sources only.
export default function extract() {
  // Visible text only: drop screen-reader helpers, footnote markers and superscripts.
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".visuallyhidden, [class*='visuallyhidden'], .a11y, sup, .as-footnote, as-footnote").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/‍/g, "").trim();
  };
  // Largest image inside root, in its best published resolution.
  const img = (root) => {
    if (!root) return null;
    const list = [...root.querySelectorAll("img")].filter((i) => i.currentSrc || i.src);
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  // Icon of an element: an inline SVG (as a data URI) or the image URL of its CSS background or mask.
  const iconOf = (el) => {
    if (!el) return null;
    const svg = el.tagName === "svg" ? el : el.querySelector("svg");
    if (svg) {
      const c = svg.cloneNode(true);
      const r = svg.getBoundingClientRect();
      if (r.width) { c.setAttribute("width", Math.round(r.width)); c.setAttribute("height", Math.round(r.height)); }
      if (!c.getAttribute("xmlns")) c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      return { src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(c.outerHTML), width: Math.round(r.width), height: Math.round(r.height) };
    }
    const cs = getComputedStyle(el);
    const u = [cs.backgroundImage, cs.maskImage, cs.webkitMaskImage].map((v) => (v && v.match(/url\(["']?([^"')]+)/) || [])[1]).find(Boolean);
    const r = el.getBoundingClientRect();
    return u ? { src: abs(u), width: Math.round(r.width), height: Math.round(r.height) } : null;
  };
  // Skip the no-JS copies of each block, rendered for browsers without scripts and not shown.
  const visibleOnly = (el) => !el.closest("[class*='no-js'], nav, footer, .as-localnav, .as-globalnav, .as-globalfooter");
  const tone = (el) => {
    const bg = getComputedStyle(el).backgroundColor;
    return bg === "rgba(0, 0, 0, 0)" ? "" : bg;
  };

  const localnav = {
    title: txt(document.querySelector(".as-localnav-title .localnav-title, .localnav-title")),
    links: [...document.querySelectorAll(".as-localnav-menu-link")].map((a) => ({ text: txt(a), href: abs(a.getAttribute("href")), current: a.classList.contains("current") })),
    action: txt(document.querySelector(".as-localnav-button")),
  };

  if (document.querySelector("[class*='rf-modelselector']")) {
    // Upgrade program: intro, tabs with model cards, explanatory blocks, FAQ.
    const header = document.querySelector(".dd-apple-upgrade-overview-header");
    const intro = {
      logo: img(header?.querySelector(".dd-logo")),
      title: txt(header?.querySelector("h2")),
      // The poster is the video frame; the reduced-motion image is hidden on desktop, so read the video itself.
      poster: (() => { const v = header?.querySelector("video"); const src = v?.poster || header?.querySelector(".dd-hero-reduced-motion")?.src; return src ? { src: new URL(src, location.href).href, alt: "" } : null; })(),
      heroHeight: Math.round(header?.querySelector(".dd-video")?.getBoundingClientRect().height || 0),
      text: txt(header?.querySelector(".dd-info p")),
      steps: [...(header?.querySelectorAll(".dd-grid li") || [])].map((li) => ({ text: txt(li.querySelector("p")), icon: iconOf(li.querySelector(".dd-icon")) })),
      video: (() => { const v = header?.querySelector("video"); if (!v) return null; const r = v.getBoundingClientRect(); return { src: abs(v.currentSrc || v.querySelector("source")?.getAttribute("src")), poster: abs(v.poster), width: Math.round(r.width), height: Math.round(r.height) }; })(),
      cta: (() => { const a = header?.querySelector(".dd-button a"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
      more: (() => { const a = header?.querySelector(".dd-info a, .dd-cta a.more, a.more"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
    };
    const tabs = [...document.querySelectorAll(".rf-modelselector-tabs .tabnav-link")].map((t) => ({ text: txt(t), active: t.getAttribute("aria-selected") === "true" }));
    // One scroller per tab; cards are .rf-modelselector-scroller-itemview.
    const models = [...document.querySelectorAll(".rf-modelselector-scroller")].map((scroller, tab) =>
      [...scroller.querySelectorAll(".rf-modelselector-scroller-itemview")].map((card) => ({
        tab,
        title: txt(card.querySelector(".rf-modelselector-title")),
        subtitle: txt(card.querySelector(".rf-modelselector-subtitle")),
        badge: txt(card.querySelector(".rf-modelselector-badge")),
        price: txt(card.querySelector(".rf-modelselector-price")),
        button: txt(card.querySelector(".rf-modelselector-formbutton")),
        href: abs(card.querySelector(".rf-modelselector-formbutton")?.getAttribute("href")),
        img: (() => { const i = card.querySelector("img.rf-modelselector-image") || card.querySelector("img"); return i ? { src: i.currentSrc || i.src, alt: i.alt || "" } : null; })(),
        swatches: [...card.querySelectorAll(".rf-modelselector-content-colorimage img")].map((i) => i.currentSrc || i.src).slice(0, 8),
      })),
    );
    // Explanatory blocks: one per dd-apple-upgrade-overview-* section (header and start handled above).
    const sections = [...document.querySelectorAll("[class*='dd-apple-upgrade-overview-']")]
      .filter((el) => !/-header$|-start$/.test(el.className.split(" ").find((c) => c.startsWith("dd-apple-upgrade-overview-")) || ""))
      .map((el) => ({
        name: el.className.split(" ").find((c) => c.startsWith("dd-apple-upgrade-overview-")),
        title: txt(el.querySelector("h2")),
        text: [...el.querySelectorAll("p")].map(txt).filter(Boolean),
        images: [...el.querySelectorAll("img")].filter((i) => i.getBoundingClientRect().width > 60).map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" })),
        bg: tone(el),
        dark: /dark|tertiary/.test(el.className) || tone(el) === "rgb(29, 29, 31)" || tone(el) === "rgb(0, 0, 0)",
        height: Math.round(el.getBoundingClientRect().height),
      }));
    // The FAQ is rendered once per breakpoint: keep the first copy of each question.
    const faqRoot = document.querySelector(".rc-faqsection-wrapper");
    const faq = [...new Map([...(faqRoot?.querySelectorAll(".rc-accordion-button") || [])].filter(visibleOnly).map((b) => {
      const item = b.closest(".rc-accordion-item, li, [class*='accordion-item']") || b.parentElement;
      const content = item?.querySelector(".rc-accordion-content");
      return [txt(b), { q: txt(b), a: [...(content?.querySelectorAll("p") || [])].map(txt).filter(Boolean).join(" ") || txt(content) }];
    }).filter(([q]) => q)).values()];
    // Further FAQ groups: each has its own title and list (the first list above is the "All" group).
    // Each group is repeated per tab; keep the visible copy of each title once.
    const faqGroups = [...new Map([...document.querySelectorAll(".rc-group-faq-sections")].filter((g) => visibleOnly(g) && g.getBoundingClientRect().height > 0).map((g) => [txt(g.querySelector("h2, h3, h4, [class*='title'], [class*='header']") || g.firstElementChild), g])).values()].map((g) => g).map((g) => {
      const title = txt(g.querySelector("h2, h3, h4, [class*='title'], [class*='header']") || g.firstElementChild);
      const items = [...g.querySelectorAll(".rc-accordion-button")].map((b) => {
        const item = b.closest(".rc-accordion-item, li, [class*='accordion-item']") || b.parentElement;
        const content = item?.querySelector(".rc-accordion-content");
        return { q: txt(b), a: [...(content?.querySelectorAll("p") || [])].map(txt).filter(Boolean).join(" ") || txt(content) };
      }).filter((f) => f.q);
      return { title, items };
    }).filter((g) => g.items.length);
    // Selector title, the feature-card shelf under the selector, and the closing "start" block.
    const selectorTitle = txt(document.querySelector(".rf-modelselector-product-selection-title"));
    const shelfEl = document.querySelector(".re-feature-card-shelf-scroller");
    const shelfHead = (() => {
      if (!shelfEl) return "";
      const heads = [...document.querySelectorAll("h2")].filter((h) => h.compareDocumentPosition(shelfEl) & Node.DOCUMENT_POSITION_FOLLOWING);
      return txt(heads[heads.length - 1]);
    })();
    const shelf = shelfEl ? [...shelfEl.querySelectorAll(".re-feature-card")].filter(visibleOnly).map((c) => ({
      lines: [...c.querySelectorAll("p, h2, h3, h4")].map((el) => ({ tag: el.tagName.toLowerCase(), text: txt(el) })).filter((l) => l.text),
      img: img(c),
      bg: tone(c),
      color: getComputedStyle(c).color,
      href: abs(c.querySelector("a")?.getAttribute("href")),
      height: Math.round(c.getBoundingClientRect().height),
    })) : [];
    const startEl = document.querySelector(".dd-apple-upgrade-overview-start");
    const start = startEl ? {
      title: txt(startEl.querySelector("h2")),
      logo: img(startEl.querySelector(".dd-logo")),
      cta: (() => { const a = startEl.querySelector("a"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
    } : null;
    return { kind: "upgrade", localnav, intro, tabs, models: models.flat(), sections, faq, faqGroups, selectorTitle, shelf: { head: txt(document.querySelector(".rf-feature-shelf-header")) || shelfHead, cards: shelf }, start };
  }

  // Certified refurbished listing: banner, category list, featured tiles.
  // Listing pages (Mac, iPad) have no landing banner: their h1 is the page title.
  const bannerTitle = txt(document.querySelector(".dd-refurb-header h2")) || txt(document.querySelector("h1"));
  const headerEl = document.querySelector(".dd-refurb-header");
  // Vertical position of the banner title: everything above it belongs to the banner.
  const top = headerEl ? headerEl.getBoundingClientRect().top + scrollY : 0;
  // Banner: one full-width product strip above the title, plus a small icon between strip and title.
  const above = [...document.querySelectorAll("img")].filter((i) => visibleOnly(i) && i.getBoundingClientRect().width > 0 && i.getBoundingClientRect().top + scrollY <= top + 4);
  const stripEl = above.filter((i) => i.getBoundingClientRect().width > 1000).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
  const strip = stripEl ? { src: stripEl.currentSrc || stripEl.src, width: Math.round(stripEl.getBoundingClientRect().width), height: Math.round(stripEl.getBoundingClientRect().height) } : null;
  const iconEl = headerEl?.querySelector(".dd-icon img") || null;
  const icon = iconEl ? { src: iconEl.currentSrc || iconEl.src, width: Math.round(iconEl.getBoundingClientRect().width), height: Math.round(iconEl.getBoundingClientRect().height) } : null;
  const categories = [...new Map([...document.querySelectorAll(".rf-refurb-categorieslist-item")].filter(visibleOnly).map((li) => [abs(li.querySelector("a")?.getAttribute("href")), li])).values()].map((li) => ({
    href: abs(li.querySelector("a")?.getAttribute("href")),
    title: txt(li.querySelector(".rf-refurb-categorieslist-title")),
    img: img(li),
  }));
  const tiles = [...new Map([...document.querySelectorAll(".rf-refurb-featured-product-tile, .rf-refurb-producttile")].filter(visibleOnly).map((t) => [abs(t.querySelector(".rf-refurb-featured-product-link")?.getAttribute("href")) || t.innerText, t])).values()].map((t) => {
    const lines = (t.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    return {
      href: abs((t.querySelector(".rf-refurb-featured-product-link, .rf-refurb-producttile-link") || t.querySelector("a"))?.getAttribute("href")),
      title: txt(t.querySelector(".rf-refurb-featured-product-link, .rf-refurb-producttile-title, .rf-refurb-producttile-link")),
      img: img(t.querySelector(".rf-refurb-featured-product-tilehero, .rf-refurb-producttile-tilehero") || t),
      price: txt(t.querySelector(".rf-refurb-featured-product-currentprice, .rf-refurb-producttile-currentprice")),
      was: txt(t.querySelector(".rf-refurb-featured-product-previousprice, .rf-refurb-price-previousprice")),
      saving: txt(t.querySelector(".rf-refurb-featured-product-savingsprice, .rf-refurb-price-savingsprice")),
      monthly: lines.find((l) => /\/mo|per month|mo\./.test(l) && !/\$[\d,.]+$/.test(l)) || "",
    };
  });
  // Promo cards under the tiles: one block of cards (large row first, small row after).
  const bentoRoot = document.querySelector(".dd-refurb-bento");
  const bento = bentoRoot ? {
    bg: tone(bentoRoot),
    cards: [...bentoRoot.querySelectorAll("li.dd-bento-card")].map((li) => ({
      name: ([...li.classList].find((c) => /^dd-bento-(?!card)/.test(c)) || "").replace(/^dd-bento-/, ""),
      lines: [...li.querySelectorAll("p, h2, h3")].map((el) => ({ tag: el.tagName.toLowerCase(), text: txt(el) })).filter((l) => l.text),
      img: img(li),
      // Icons under 30 px are the plus buttons, not the card icon.
      icon: (ic => (ic && ic.width >= 30 ? ic : null))(iconOf(li.querySelector("svg, [class*='icon']"))),
      bg: tone(li),
      color: getComputedStyle(li).color,
      link: (() => { const a = li.querySelector("a"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
    })),
  } : null;
  // Promo strip that loads on scroll (listing pages): one card per .buystrip-item.
  const buystrip = [...document.querySelectorAll(".buystrip .buystrip-item")].filter(visibleOnly).map((it) => {
    const cta = it.querySelector("a");
    const body = [...it.querySelectorAll("p")].filter((p) => !p.closest(".buystrip-item-cta")).map(txt).filter(Boolean);
    return { title: txt(it.querySelector("h3, h2")), text: body.join(" "), cta: cta ? { text: txt(cta), href: abs(cta.getAttribute("href")) } : null, img: img(it) };
  }).filter((c) => c.title);
  // Legal footnotes printed under the page (one line per note).
  const legal = (document.querySelector(".footnotes")?.innerText || "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  return {
    kind: "refurb",
    bento,
    buystrip,
    legal,
    localnav,
    banner: { strip, icon, title: bannerTitle, subtitle: txt(headerEl?.querySelector("p")) },
    categories: { title: txt(document.querySelector(".rf-refurb-categories-header")), items: categories },
    // Landing: its own section title. Listing: the page title (the sort menu is not a title).
    featured: { title: categories.length ? txt(document.querySelector(".rf-refurb-featured-header")) : bannerTitle, tiles },
  };
}
