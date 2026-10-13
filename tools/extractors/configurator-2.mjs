// Configurator pages (Mac and Watch buy flows). Runs in the source page: must stay self-contained.
// Returns the visible content of the step-by-step configurator; assets/js/live/configurator-2.js rebuilds it.
export default function extract() {
  // Visible text only: drop screen-reader helpers, footnote markers and superscripts.
  const clean = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".visuallyhidden, [class*='visuallyhidden'], .a11y, sup, as-footnote, script, style").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/‍/g, "").trim();
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  // Best image of a root: the widest one that has a source.
  const img = (root) => {
    if (!root) return null;
    const list = [...root.querySelectorAll("img")].filter((i) => i.currentSrc || i.src);
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  const priceOf = (text) => {
    const m = /\$([\d,]+(?:\.\d+)?)/.exec(text || "");
    return m ? Number(m[1].replace(/,/g, "")) : null;
  };
  // Option from one radio input and its label.
  const option = (input) => {
    const label = (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)) || input.closest("label");
    const root = label || input.parentElement;
    const titleEl = root.querySelector(".form-selector-title");
    const subEl = titleEl?.querySelector(".form-label-small") || root.querySelector(".form-label-small");
    let name;
    let sub = "";
    if (titleEl) {
      const c = titleEl.cloneNode(true);
      c.querySelectorAll(".form-label-small").forEach((n) => n.remove());
      name = clean(c);
      sub = clean(subEl);
    } else {
      name = clean(root.querySelector(".colornav-label")) || clean(root.querySelector(".form-selector-label-title, [class*='title']")) || clean(root);
    }
    const priceEl = root.querySelector(".form-selector-right-col, .rf-bfe-selector-right-col, [class*='right-col']");
    const pointEls = [...root.querySelectorAll(".price-point")].filter((el) => !el.parentElement.closest(".price-point"));
    const pointLines = pointEls.map(clean).filter(Boolean);
    const full = pointLines.length ? pointLines[0] : clean(root.querySelector(".as-pricepoint-fullprice")) || clean(priceEl);
    const bullets = [...root.querySelectorAll("li")].map(clean).filter(Boolean).slice(0, 6);
    const swatch = root.querySelector(".colornav-swatch");
    return {
      value: input.value,
      name,
      sub,
      price: pointLines.length ? pointLines.join("|") : full,
      amount: priceOf(full),
      bullets,
      disabled: input.disabled,
      swatch: swatch ? { src: swatch.currentSrc || swatch.src, alt: swatch.alt || "" } : null,
      rich: !!titleEl && !!subEl && !!priceEl,
    };
  };
  // Step header: keyword (first span) and complement (second span), separated like the source.
  const header = (step) => {
    const h = step.querySelector("h2");
    if (!h) return { keyword: "", complement: "" };
    const spans = [...h.querySelectorAll(":scope > span")];
    if (spans.length >= 2) return { keyword: clean(spans[0]).replace(/\.$/, ""), complement: clean(spans[1]) };
    return { keyword: clean(h), complement: "" };
  };
  const kindOf = (step) => {
    const c = step.className;
    if (/applecare/.test(c)) return "applecare";
    if (/tradeup/.test(c)) return "tradeup";
    if (/purchase-options/.test(c)) return "purchase";
    if (step.querySelector(".rs-mac-bfe-collapsible-config-section, .rc-accordion")) return "customizations";
    return "dimension";
  };

  // Top-level steps only, in document order.
  const all = [...document.querySelectorAll(".rf-bfe-step, .rf-bfe-purchase-options")];
  const top = all.filter((s) => !all.some((o) => o !== s && o.contains(s)));
  // Measured box of each visible step: its height and the gap to the next visible step.
  const shown = top.filter((el) => el.getBoundingClientRect().height > 0);
  const boxes = new Map(shown.map((el, i) => {
    const r = el.getBoundingClientRect();
    const next = shown[i + 1];
    const gap = next ? Math.max(0, Math.round(next.getBoundingClientRect().top - r.bottom)) : 0;
    return [el, { h: Math.round(r.height), gap }];
  }));
  // Offset of the first step from the top of the gallery column.
  const firstStep = shown[0]?.getBoundingClientRect();
  const galleryBox = document.querySelector(".rf-bfe-gallery-wrapper")?.getBoundingClientRect();
  const railOffset = firstStep && galleryBox ? Math.round(firstStep.top - galleryBox.top) : 0;
  const steps = top.map((step) => {
    const kind = kindOf(step);
    const h = header(step);
    const hidden = getComputedStyle(step).display === "none";
    const inputs = [...step.querySelectorAll("input[type=radio]")];
    const swatches = inputs.filter((i) => i.closest(".colornav-item"));
    const cards = inputs.filter((i) => !i.closest(".colornav-item"));
    // Nested option groups (collapsible customizations): one group per collapsible section.
    const groups = [];
    if (kind === "customizations") {
      // Each card: title, description and footer. The source loads its options on demand, so none are listed.
      step.querySelectorAll(".re-configure-card").forEach((card) => {
        groups.push({
          title: clean(card.querySelector(".re-configure-card-title, h3")),
          desc: clean(card.querySelector(".re-configure-card-description")),
          footer: clean(card.querySelector(".re-configure-card-footer")),
          options: [...card.querySelectorAll("input[type=radio]")].map(option),
        });
      });
    }
    const helpcards = [...step.querySelectorAll(".rc-decisionsection")].map((card) => {
      const link = card.querySelector("a, button");
      const linkText = clean(link);
      const full = clean(card);
      const title = clean(card.querySelector("h3, h4, strong, [class*='title']"));
      const desc = linkText && full.endsWith(linkText) ? full.slice(0, -linkText.length) : full;
      return { title, desc: title && desc.startsWith(title) ? desc.slice(title.length).trim() : desc, link: linkText, image: img(card) };
    });
    return {
      kind,
      hidden,
      box: boxes.get(step) || null,
      keyword: h.keyword,
      complement: h.complement,
      swatches: swatches.map(option),
      swatchHeader: clean(step.querySelector(".rf-bfe-product-dimension-colornav-header")),
      options: groups.length ? [] : cards.map(option),
      groups,
      helpcards,
      note: kind === "tradeup" ? clean(step.querySelector(".rf-bfe-tradeup-description, [class*='tradeup'] p")) : "",
    };
  });

  // Gallery: one slide per item, with the widest image of each.
  const items = [...document.querySelectorAll(".rc-inline-gallery-item")];
  const dots = document.querySelectorAll(".rc-gallery-dotnav-button").length;
  const slides = items.map((it) => {
    const i = img(it);
    return i ? { src: i.src, alt: i.alt, caption: clean(it.querySelector("[class*='gallery-info'], [class*='caption']")) } : null;
  }).filter(Boolean);
  if (!slides.length) {
    const fallback = [...document.querySelectorAll(".rf-bfe-gallery img")].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "", caption: "" }));
    slides.push(...fallback);
  }

  const pills = [...document.querySelectorAll("[class*='rf-bfe-header-rightsection'] a, [class*='rf-bfe-header-rightsection'] button")]
    .map((a) => ({ text: clean(a), href: abs(a.getAttribute("href")) }))
    .filter((p) => p.text);

  const headerRoot = document.querySelector("[class*='rf-bfe-header-text-wrapper']") || document.querySelector("[class*='rf-bfe-header']");
  const title = clean(document.querySelector("h1")) || clean(headerRoot?.querySelector("[class*='title']"));
  const eyebrow = clean(document.querySelector("[class*='rf-bfe-header'] [class*='eyebrow'], [class*='rf-bfe-header'] [class*='msgtag']"));
  // Header price: the first price block outside the sticky bar and the summary.
  const priceBlock = [...document.querySelectorAll(".rc-prices")].find((e) => !e.closest(".rf-bfe-stickybar, .rf-bfe-summary, .rf-bfe-summary-price-content"));
  const lines = priceBlock ? [clean(priceBlock)].filter(Boolean) : [];

  const summaryRoot = document.querySelector(".rf-bfe-summary-price-content, .rf-bfe-summary");
  const summary = {
    title: clean(document.querySelector(".rf-bfe-summary h2, .rf-bfe-summary h3")),
    price: clean(summaryRoot?.querySelector(".as-pricepoint-fullprice")),
    priceAmount: priceOf(clean(summaryRoot?.querySelector(".as-pricepoint-fullprice"))),
    monthly: clean(summaryRoot?.querySelector(".as-pricepoint-installmentprice-comparative")),
    cta: clean(document.querySelector(".rc-summary-button")) || "Continue",
  };

  const faqRoot = document.querySelector("[data-analytics-section='buyflow-faq']") || document;
  const faq = [...faqRoot.querySelectorAll(".rc-accordion-button")].slice(0, 12).map((b) => {
    const item = b.closest(".rc-accordion-item, .rc-accordion") || b.parentElement;
    const panel = item?.querySelector(".rc-accordion-content");
    return { q: clean(b), a: clean(panel) };
  }).filter((f) => f.q);

  // Full-width blocks between the configurator and the FAQ: promos, services and the model comparison grid.
  const blockSel = ".dd-shared-personal-setup, .as-l-fullwidth, .dd-mac-btr-education";
  const rawBlocks = [...document.querySelectorAll(blockSel)].filter((el) => !el.closest(".rf-bfe, .rf-po-bfe, .rf-bfe-stickybar"));
  const topBlocks = rawBlocks.filter((el) => !rawBlocks.some((o) => o !== el && o.contains(el)) && el.getBoundingClientRect().height > 0);
  const extraBox = (el, i) => {
    const r = el.getBoundingClientRect();
    const next = topBlocks[i + 1];
    return { h: Math.round(r.height), gap: next ? Math.max(0, Math.round(next.getBoundingClientRect().top - r.bottom)) : 0 };
  };
  // Keep the origin pictogram markup (inline SVG) without ids, so it can be shown in live mode.
  const glyph = (el) => {
    const g = el?.querySelector("svg.dd-glyph-svg, svg[class*='glyph']");
    if (!g) return "";
    const c = g.cloneNode(true);
    c.removeAttribute("aria-hidden");
    c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    return c.outerHTML;
  };
  // Space between the bottom of the configurator rail and the first full-width block.
  const railBottom = Math.max(0, ...[...document.querySelectorAll(".rf-bfe-step, .rf-bfe-summary")].filter((e) => !e.closest(".rf-bfe-stickybar")).map((e) => e.getBoundingClientRect().bottom + scrollY));
  // Rail height in the source: from the top of the rail (first step minus its offset) to the bottom.
  const firstStepTop = shown[0] ? shown[0].getBoundingClientRect().top + scrollY : 0;
  const railMin = Math.max(0, Math.round(railBottom - firstStepTop + railOffset));
  const blocksLead = topBlocks[0] ? Math.max(0, Math.round(topBlocks[0].getBoundingClientRect().top + scrollY - railBottom)) : 0;
  const blocks = topBlocks.map((el, i) => {
    const box = extraBox(el, i);
    if (el.querySelector(".dd-compare-grid")) {
      const info = el.querySelector(".dd-compare-info");
      const columns = [...el.querySelectorAll(".dd-column-header")].map((head) => {
        const col = head.parentElement;
        const features = [...col.querySelectorAll(".dd-feature")].map((f) => {
          const key = [...f.classList].find((c) => c !== "dd-feature" && !c.startsWith("dd-color")) || "";
          return { key, glyph: glyph(f), items: [...f.querySelectorAll("p")].map(clean) };
        });
        return {
          name: clean(head.querySelector(".dd-product-name")),
          badge: clean(head.querySelector(".badge")),
          price: clean(head.querySelector(".dd-compare-price")),
          image: img(head.querySelector(".dd-compare-image")),
          swatches: [...head.querySelectorAll(".dd-color-swatch")].map((i) => i.currentSrc || i.src).slice(0, 6),
          features,
        };
      });
      return { kind: "compare", box, heading: clean(info?.querySelector("h2")), text: clean(info?.querySelector("p")), columns };
    }
    const heading = clean(el.querySelector("h2"));
    const text = clean(el.querySelector("p:not(.dd-link)"));
    const link = el.querySelector("a");
    const pic = img(el);
    const picEl = el.querySelector("img");
    const picRect = picEl ? picEl.getBoundingClientRect() : null;
    return {
      kind: "promo",
      box,
      bg: getComputedStyle(el).backgroundColor,
      heading,
      text,
      link: link ? { text: clean(link), href: abs(link.getAttribute("href")) } : null,
      image: pic ? { ...pic, w: Math.round(picRect.width), h: Math.round(picRect.height) } : null,
    };
  });

  // Legal footnotes under the FAQ: their measured height, the lead above them, and the lines.
  const fnRoot = document.querySelector("#footnotes") || document.querySelector(".rc-footnotelist")?.parentElement;
  const fnBox = fnRoot ? fnRoot.getBoundingClientRect() : null;
  const fnLines = fnRoot ? [...new Set([...fnRoot.querySelectorAll(".rc-footnotelist-symbol, .rc-footnotelist-numeric")].map(clean).filter(Boolean))] : [];
  const contentBottom = Math.max(0, ...[...document.querySelectorAll(".rc-accordion, .as-l-fullwidth, .dd-shared-personal-setup, .rf-bfe-summary")].filter((e) => !e.closest(".rf-bfe-stickybar")).map((e) => e.getBoundingClientRect().bottom + scrollY));
  const footnotes = fnBox ? {
    h: Math.round(fnBox.height),
    lead: Math.max(0, Math.round(fnBox.top + scrollY - contentBottom)),
    lines: fnLines,
  } : null;

  const stickyName = clean(document.querySelector(".rf-bfe-stickybar h2, .rf-bfe-stickybar [class*='name'], .rf-bfe-stickybar"))
    .split(" ").slice(0, 3).join(" ");
  return {
    template: "configurator-2",
    kind: /buy-watch/.test(location.pathname) ? "watch" : "computer",
    title,
    eyebrow,
    lines,
    pills,
    slides,
    steps,
    railOffset,
    blocks,
    blocksLead,
    railMin,
    footnotes,
    summary,
    faq,
    sticky: { name: stickyName || title },
  };
}
