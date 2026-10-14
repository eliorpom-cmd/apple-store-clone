// Flagship buy pages (AirPods, Studio Display, Apple TV, HomePod, ...). Runs in the source page context:
// fully self-contained, no imports, no outer variables.
export default function extract() {
  // Visible text only: drop screen-reader helpers, footnote markers and superscripts.
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".visuallyhidden, .a11y, [class*='visuallyhidden'], sup, script, style").forEach((n) => n.remove());
    return (c.textContent || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  };
  // Text of a block that uses <br> for line breaks: blank-line breaks split paragraphs, single breaks stay as "\n".
  const blocks = (el) => {
    if (!el) return [];
    const c = el.cloneNode(true);
    c.querySelectorAll(".visuallyhidden, .a11y, [class*='visuallyhidden'], sup, script, style").forEach((n) => n.remove());
    c.querySelectorAll("br").forEach((n) => n.replaceWith("\n"));
    return (c.textContent || "").replace(/ /g, " ").split(/\n[ \t]*\n+/).map((t) => t.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n")).filter(Boolean);
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  // Best image of a block: the largest rendered one, with its resolved URL.
  const imgOf = (root) => {
    if (!root) return null;
    const list = [...root.querySelectorAll("img")].filter((i) => i.currentSrc || i.src);
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  // Original inline icon (SVG markup), ids removed so it can sit next to other icons.
  const iconOf = (root) => {
    const svg = root?.querySelector("svg");
    if (!svg) return null;
    const c = svg.cloneNode(true);
    c.removeAttribute("class");
    c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    c.setAttribute("aria-hidden", "true");
    c.setAttribute("width", "100%"); c.setAttribute("height", "100%");
    return c.outerHTML;
  };
  const money = (s) => { const m = String(s || "").match(/\$\s?([\d,]+(?:\.\d+)?)/); return m ? Number(m[1].replace(/,/g, "")) : 0; };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const inBuy = (el) => !el.closest(".dd-compare, .as-globalfooter, .rs-productinfosection, .product-selection-area.noscript, .rc-accordion, .rc-witb-items, .rc-witb");

  // ---- Ribbon (promo messages above the nav) ----
  const ribbon = [...document.querySelectorAll(".rc-ribbon .rc-ribbon-content-item, .rc-ribbon [class*='ribbon-content'] p, [class*='rc-ribbon-content-item-base']")].filter((el) => visible(el.closest(".rc-ribbon") || el)).map((el) => {
    const a = el.querySelector("a");
    const c = el.cloneNode(true);
    c.querySelectorAll("a").forEach((n) => n.remove());
    return { text: txt(c), link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null };
  }).filter((r) => r.text).slice(0, 3);

  // ---- Header: badge, title, availability line ----
  const h1 = document.querySelector(".rf-flagship-product-header-h1, .rf-flagship h1, h1.fwl");
  const headerEl = document.querySelector(".rf-flagship-product-header");
  let subtitle = "";
  // Note row under the subtitle (picture, short text, link), e.g. "Siri AI  Learn more".
  let note = null;
  if (headerEl) {
    const c = headerEl.cloneNode(true);
    c.querySelectorAll(".badge, h1, .rf-flagship-product-header-h1").forEach((n) => n.remove());
    const row = headerEl.querySelector(".form-label-small");
    if (row) {
      const a = row.querySelector("a[href]");
      const t = row.cloneNode(true);
      t.querySelectorAll("a, img").forEach((n) => n.remove());
      note = { img: imgOf(row), text: txt(t), link: a ? { text: txt(a.cloneNode(true)).replace(/\s*Siri AI$/, ""), href: abs(a.getAttribute("href")) } : null };
      c.querySelectorAll(".form-label-small").forEach((n) => n.remove());
    }
    subtitle = txt(c);
  }
  // Centered title (Studio Display style): the H1 sits near the middle of a 1440 px viewport.
  const h1box = (h1 || document.querySelector("h1"))?.getBoundingClientRect();
  const head = {
    badge: txt(document.querySelector(".rf-flagship-product-header .badge")),
    title: txt(h1) || txt(document.querySelector("h1")),
    subtitle,
    note,
    // Subtitle set in the small body size (Apple TV: 14 px instead of 17 px).
    compactSub: !!headerEl && parseFloat(getComputedStyle(headerEl).fontSize) < 16,
    centered: !!h1box && Math.abs(h1box.left + h1box.width / 2 - innerWidth / 2) < 80,
  };

  // ---- Media: zoomable gallery (thumbnails + viewer), or a single main image ----
  const thumbs = [...document.querySelectorAll(".as-zoomable-gallery-thumbnail")].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" })).filter((i) => i.src);
  // Slides: zoomable gallery items, else the inline card gallery (Studio Display style), else nothing.
  let slides = [...document.querySelectorAll(".as-zoomable-gallery-item")].map((li) => imgOf(li)).filter(Boolean);
  if (!slides.length) slides = [...document.querySelectorAll(".rf-accessory-inline-cardgallery-item, .rc-inline-gallery-item")].map((li) => imgOf(li)).filter(Boolean);
  const mainImg = imgOf(document.querySelector(".rf-flagship-image-wrapper, .rf-flagship-media"));
  const media = {
    main: mainImg,
    thumbs: thumbs.length ? thumbs : [],
    slides: slides.length ? slides : (mainImg ? [mainImg] : []),
  };
  const buystrip = [...document.querySelectorAll(".rf-flagship-buystrip .as-buystrip-item")].map((li) => ({
    icon: iconOf(li), text: txt(li.querySelector(".as-buystrip-title")),
  })).filter((b) => b.text);
  const chatEl = document.querySelector(".as-chat-buyflow");
  const chat = chatEl ? {
    text: txt(chatEl.querySelector(".as-chat-buyflow-title")),
    link: (() => { const a = chatEl.querySelector("a"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
  } : null;

  // ---- Options: radios and checkboxes inside configurator fieldsets ----
  const option = (input) => {
    const row = input.closest(".rc-dimension-selector-row, .rf-applecare-option, .form-selector") || input.parentElement;
    const titleEl = row.querySelector(".form-selector-title, .rc-dimension-list-header .form-selector-title, .rf-applecare-selector ~ * .form-selector-title");
    const swatch = row.querySelector("img.form-selector-swatch");
    const labelEl = row.querySelector("label") || row;
    let title = "", sub = "";
    if (swatch) {
      title = txt(labelEl);
    } else if (titleEl) {
      const c = titleEl.cloneNode(true);
      const s = c.querySelector(".form-label-small, .rf-applecare-subheader");
      if (s) { sub = txt(s); s.remove(); }
      title = txt(c);
    } else {
      title = txt(labelEl);
    }
    if (!sub) sub = txt(row.querySelector(".rf-applecare-subheader, .form-label-small:not(:empty)")) || "";
    const right = row.querySelector(".form-selector-right-col") || row.querySelector(".rf-applecare-price");
    const priceText = right ? txt(right) : "";
    const bullets = [...row.querySelectorAll(".as-form-choiceselectordesc-listitem, li")].map((li) => txt(li)).filter(Boolean);
    return {
      type: input.type,
      name: input.name,
      value: input.value,
      title,
      sub,
      priceText,
      price: money(priceText),
      img: swatch ? { src: swatch.currentSrc || swatch.src, alt: "" } : null,
      bullets,
      checked: input.checked,
      disabled: input.disabled,
      applecare: !!row.closest(".rf-applecare-option, .rf-applecare-content") || row.classList.contains("rf-applecare-option"),
    };
  };
  const decisionOf = (scope) => {
    const d = scope?.querySelector(".rf-flagship-decisionsection, .rc-decisionsection");
    return d ? decisionFrom(d) : null;
  };
  const decisionFrom = (d) => {
    return {
      header: txt(d.querySelector("[class*='decisionsection-header']")),
      desc: txt(d.querySelector("[class*='decisionsection-desc']")),
      link: (() => { const a = d.querySelector("a[href]"); return a ? abs(a.getAttribute("href")) : null; })(),
    };
  };
  const claimed = new Set();
  const steps = [...document.querySelectorAll("fieldset.rc-dimension")].filter((fs) => inBuy(fs) && fs.querySelector("input"))
    .map((fs) => {
      const applecare = !!fs.closest(".rf-applecare-content, .rf-applecare-section");
      const legend = fs.querySelector("legend h2, legend");
      const inputs = [...fs.querySelectorAll("input[type=radio], input[type=checkbox]")].filter((i) => !i.closest(".rf-applecare-trayoption"));
      // Decision block: inside the fieldset, or right after it in the same column.
      // Decision block: inside the fieldset, or a sibling block in the same wrapper (not owned by another step).
      let decision = decisionOf(fs);
      const wrap = fs.closest(".rf-flagship-collapsable-dimension, .rf-applecare-content") || fs.parentElement?.parentElement || fs.parentElement;
      if (!decision && wrap) {
        const own = [...wrap.querySelectorAll(".rc-decisionsection, .rf-flagship-decisionsection")].find((d) => !d.closest("fieldset") && !claimed.has(d));
        if (own) { claimed.add(own); decision = decisionFrom(own); }
      }
      return {
        title: txt(legend),
        applecare,
        kind: inputs.some((i) => i.closest(".rf-applecare-option")) ? "applecare" : inputs.some((i) => i.closest(".rc-dimension-colornav-link, .rc-dimension-colornav-input") || i.closest(".form-selector-label")?.querySelector("img.form-selector-swatch")) ? "swatch" : "options",
        options: inputs.map(option),
        decision,
      };
    });

  // AppleCare heading sits outside the fieldset.
  const acHead = document.querySelector(".rf-applecare-section-heading");
  // "How does AppleCare work?" decision block that follows the plans.
  const acDecision = decisionOf(document.querySelector(".rf-applecare-decision-support"));
  const applecare = acHead ? {
    decision: acDecision,
    title: (() => { const c = acHead.cloneNode(true); c.querySelectorAll(".rf-applecare-section-subheading, sup").forEach((n) => n.remove()); return txt(c); })(),
    sub: txt(acHead.querySelector(".rf-applecare-section-subheading")),
  } : null;

  // ---- Summary: price, call to action, "save for later" block ----
  const sum = document.querySelector(".rc-summary");
  const summary = sum ? {
    price: txt(sum.querySelector(".rc-prices-fullprice")),
    priceLine: (() => { const t = txt(sum.querySelector(".rc-prices-fullprice")); return t; })(),
    title: txt(sum.querySelector(".rc-summary-title")),
    installments: txt(sum.querySelector(".rc-prices-acinstallments")),
    monthly: txt(sum.querySelector(".rc-monthly-price")),
    financing: txt(sum.querySelector(".rc-financing-message")),
    cta: txt(sum.querySelector(".rc-summary-button button, .rc-summary-button")),
    moment: { title: txt(sum.querySelector(".rf-saveditem-content-header")), text: txt(sum.querySelector(".rf-saveditem-content-description")), link: txt(sum.querySelector(".rf-saveditem-button")) },
  } : null;

  // Requirement line under the summary card ("Compatible with HD and 4K HD. More details.").
  const requirement = (() => {
    const el = document.querySelector(".rf-flagship-productrequirement-text");
    if (!el) return null;
    const a = el.querySelector("a");
    const t = el.cloneNode(true);
    t.querySelectorAll("a").forEach((n) => n.remove());
    return { text: txt(t), link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null };
  })();

  // ---- Footnotes (page footer block) ----
  // Footnotes: the numbered notes of the page footer (one copy of each).
  const footnotes = [...new Set([...document.querySelectorAll(".as-globalfooter-sosumi .rc-footnotelist li, .as-globalfooter-sosumi .rc-footnotelist-disclaimer")].map((p) => txt(p)))].filter(Boolean);
  // Purchase note under the summary card ("You can change the quantity of items in your bag").
  const purchaseNote = txt(document.querySelector(".rf-flagship-purchaseinfo-footernotes"));
  // Promo band: the Apple Music block (comparison page) or the billboard (Apple TV), text and picture.
  const promoEl = document.querySelector("[class*='apple-music'] .dd-l-plate, [class*='apple-music'], .billboard");
  const promo = promoEl ? {
    title: txt(promoEl.querySelector("h2, h3, .dd-header")),
    header: txt(promoEl.querySelector(".dd-header")),
    text: [...promoEl.querySelectorAll("p")].map((p) => txt(p)).filter((t) => t && t !== txt(promoEl.querySelector(".dd-header"))).join(" ").slice(0, 400),
    link: (() => { const a = promoEl.querySelector("a[href]"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
    img: imgOf(promoEl.querySelector(".dd-image, picture, img")?.closest("div, picture") || promoEl),
    flip: promoEl.classList.contains("billboard"),
    // Billboard (Apple TV): full-bleed picture, logo, headline and stacked links.
    board: promoEl.classList.contains("billboard") && promoEl.querySelector(".dd-hero") ? {
      hero: imgOf(promoEl.querySelector(".dd-image")),
      logo: imgOf(promoEl.querySelector(".dd-header")),
      headline: txt(promoEl.querySelector(".dd-headline")),
      links: [...promoEl.querySelectorAll(".links-stacked a")].map((a) => ({ text: txt(a), href: abs(a.getAttribute("href")), external: a.classList.contains("icon-after") })),
    } : null,
  } : null;

  // ---- Witness: What's in the box ----
  const witb = {
    title: txt(document.querySelector(".rf-flagship-buyflow-witbheader, .rc-witb-title")),
    sub: txt(document.querySelector(".rf-flagship-buyflow-witbsubheader")),
    items: [...new Map([...document.querySelectorAll(".rc-witb-item")].map((li) => [txt(li.querySelector(".rc-witb-item-label")), { label: txt(li.querySelector(".rc-witb-item-label")), img: imgOf(li) }])).values()].filter((i) => i.label),
  };

  // ---- Product information: rows (title + paragraphs) ----
  const productInfo = {
    title: txt(document.querySelector(".rs-productinfosection-header, .rc-productinfosection .rc-accordion-title")),
    rows: [...document.querySelectorAll(".rs-productinfosection .rc-pdsection-panel, .rc-productinfosection .rc-pdsection-panel")].map((p) => ({
      title: txt(p.querySelector(".rc-pdsection-title")),
      // One item per rendered list item: optional bold lead line, then its paragraphs (or the item text).
      // Hidden duplicates (one copy per model) are skipped: only rendered items count.
      items: (() => {
        const main = p.querySelector(".rc-pdsection-mainpanel");
        const seen = new Set();
        const out = [];
        for (const li of main?.querySelectorAll("li") || []) {
          if (!visible(li)) continue;
          const paras = [...li.querySelectorAll("p")].map((n) => txt(n)).filter(Boolean);
          const lead = paras.length ? txt(li.querySelector("strong")) : "";
          const item = { lead, paras: paras.length ? paras : blocks(li) };
          const key = lead + "|" + item.paras.join("|");
          if (!item.paras.length || seen.has(key)) continue;
          seen.add(key);
          out.push(item);
        }
        return out.length ? out : [{ lead: "", paras: blocks(main) }];
      })(),
    })).filter((r, i, all) => r.title && all.findIndex((x) => x.title === r.title) === i), // one copy per title
  };

  // Note under the product information ("AirPods Pro 3 do not include a USB-C Charge Cable ...").
  const witbFooter = [...document.querySelectorAll(".rs-buyflow-witbfooter > div")].map((n) => txt(n)).filter(Boolean);

  // ---- FAQ accordion ----
  const faq = [...document.querySelectorAll(".rc-accordion-item")].filter((li) => !li.classList.contains("rc-productinfosection")).map((li) => ({
    title: txt(li.querySelector(".rc-accordion-header, .rc-accordion-title")),
    body: txt(li.querySelector(".rc-accordion-content, .rc-accordion-box-content")),
  })).filter((f) => f.title);

  // ---- Comparison table (device columns, icons, spec rows) ----
  const cmp = document.querySelector(".dd-compare");
  // Two layouts: device cards with spec rows (.grid-column), or a feature grid (.dd-grid-column / .dd-feature).
  const featureCols = cmp ? [...cmp.querySelectorAll(".dd-grid-column")] : [];
  const cardCols = cmp ? [...cmp.querySelectorAll(".grid-column")] : [];
  const compare = cmp ? {
    title: txt(cmp.querySelector(".dd-compare-header")),
    columns: featureCols.length ? featureCols.map((col) => ({
      name: txt(col.querySelector(".dd-product-name, .dd-compare-product")),
      price: txt(col.querySelector(".dd-compare-price")),
      badge: txt(col.querySelector(".dd-violator")),
      img: imgOf(col.querySelector(".dd-compare-image")),
      height: "", heightLabel: "",
      rows: [...col.querySelectorAll(".dd-feature")].map((f) => {
        // A big figure ("4 hrs") is kept apart from the sentence that follows it.
        const body = f.cloneNode(true);
        body.querySelectorAll(".stat").forEach((n) => n.remove());
        return { icon: iconOf(f.querySelector(".dd-icon")), stat: txt(f.querySelector(".stat")), title: txt(body), items: [] };
      }).filter((r) => r.title || r.stat),
    })) : cardCols.map((col) => ({
      name: txt(col.querySelector(".dd-compare-product")),
      price: txt(col.querySelector(".dd-compare-price")),
      badge: txt(col.querySelector(".dd-violator")),
      img: imgOf(col.querySelector(".dd-compare-image")),
      height: txt(col.querySelector(".dd-device-dimensions .dd-list-title.t-eyebrow")),
      heightLabel: txt(col.querySelector(".dd-device-dimensions .t-caption")),
      rows: [...col.querySelectorAll(".row:not(.device):not(.dd-device-dimensions)")].map((r) => ({
        icon: iconOf(r.querySelector(".dd-icon")),
        title: txt(r.querySelector(".dd-list-title")),
        items: [...r.querySelectorAll(".dd-list-item")].map((li) => txt(li)),
      })).filter((r) => r.title || r.items.length),
    })),
    link: (() => { const a = cmp.querySelector(".dd-compare-link a"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
  } : null;

  // Feature bands: full-width blocks of text and picture (not the Apple Music band, kept as promo).
  // `after` tells whether the block sits below the comparison table on the source.
  const cmpTop = cmp ? cmp.getBoundingClientRect().top + scrollY : Infinity;
  const bandEls = [...document.querySelectorAll(".as-l-fullwidth")].filter((el) => {
    if (!visible(el) || el.closest("[class*='rf-flagship'], .dd-compare, .rc-accordion, .rs-productinfosection, .as-globalfooter, .product-selection-area, .as-localnav, .billboard")) return false;
    if (el.matches("[class*='apple-music']") || el.querySelector("[class*='apple-music']")) return false;
    if (el.querySelector("form, fieldset, .rs-productinfosection, .rc-productinfosection, .dd-compare, .rc-accordion, [class*='rf-flagship'], [class*='witb']")) return false;
    return !!el.querySelector("h2, h3") && el.getBoundingClientRect().height > 150;
  });
  const bands = bandEls.map((el) => {
    const h = el.querySelector("h2, h3");
    const body = [...el.querySelectorAll("p")].map((p) => txt(p)).filter((t) => t && t !== txt(h));
    const a = el.querySelector("a[href]");
    return {
      title: txt(h),
      text: body.slice(0, 3),
      link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null,
      img: imgOf(el),
      after: el.getBoundingClientRect().top + scrollY > cmpTop,
    };
  });

  return { template: "flagship", ribbon, head, media, buystrip, chat, steps, applecare, summary, requirement, purchaseNote, footnotes, witb, productInfo, witbFooter, faq, compare, promo, bands };
}
