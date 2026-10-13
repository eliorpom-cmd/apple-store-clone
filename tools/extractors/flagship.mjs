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
  const ribbon = [...document.querySelectorAll(".rc-ribbon .rc-ribbon-content-item, .rc-ribbon [class*='ribbon-content'] p")].map((el) => {
    const a = el.querySelector("a");
    const c = el.cloneNode(true);
    c.querySelectorAll("a").forEach((n) => n.remove());
    return { text: txt(c), link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null };
  }).filter((r) => r.text).slice(0, 3);

  // ---- Header: badge, title, availability line ----
  const h1 = document.querySelector(".rf-flagship-product-header-h1, .rf-flagship h1, h1.fwl");
  const headerEl = document.querySelector(".rf-flagship-product-header");
  let subtitle = "";
  if (headerEl) {
    const c = headerEl.cloneNode(true);
    c.querySelectorAll(".badge, h1, .rf-flagship-product-header-h1").forEach((n) => n.remove());
    subtitle = txt(c);
  }
  // Centered title (Studio Display style): the H1 sits near the middle of a 1440 px viewport.
  const h1box = (h1 || document.querySelector("h1"))?.getBoundingClientRect();
  const head = {
    badge: txt(document.querySelector(".rf-flagship-product-header .badge")),
    title: txt(h1) || txt(document.querySelector("h1")),
    subtitle,
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
    cta: txt(sum.querySelector(".rc-summary-button button, .rc-summary-button")),
    moment: { title: txt(sum.querySelector(".rf-saveditem-content-header")), text: txt(sum.querySelector(".rf-saveditem-content-description")), link: txt(sum.querySelector(".rf-saveditem-button")) },
  } : null;

  // ---- Footnotes (page footer block) ----
  // Footnotes: every numbered note of the page footer block, in order.
  // Purchase note under the summary card ("You can change the quantity of items in your bag").
  const purchaseNote = txt(document.querySelector(".rf-flagship-purchaseinfo-footernotes"));
  const footnotes = [...new Set([...document.querySelectorAll(".as-globalfooter-sosumi .footnotes > *, .as-globalfooter-sosumi .footnotes li, .rc-footnotelist-disclaimer")].map((p) => txt(p)))].filter(Boolean);
  // Promo band (Apple Music style): title, lead line, link and picture, between the comparison and the footer.
  const promoEl = document.querySelector("[class*='apple-music'] .dd-l-plate, [class*='apple-music']");
  const promo = promoEl ? {
    title: txt(promoEl.querySelector("h2")),
    header: txt(promoEl.querySelector(".dd-header")),
    link: (() => { const a = promoEl.querySelector("a[href]"); return a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null; })(),
    img: imgOf(promoEl.querySelector(".dd-image")),
  } : null;

  // ---- Witness: What's in the box ----
  const witb = {
    title: txt(document.querySelector(".rf-flagship-buyflow-witbheader, .rc-witb-title")),
    sub: txt(document.querySelector(".rf-flagship-buyflow-witbsubheader")),
    items: [...new Map([...document.querySelectorAll(".rc-witb-item")].map((li) => [txt(li.querySelector(".rc-witb-item-label")), { label: txt(li.querySelector(".rc-witb-item-label")), img: imgOf(li) }])).values()].filter((i) => i.label),
  };

  // ---- Product information: rows (title + paragraphs) ----
  const productInfo = {
    title: txt(document.querySelector(".rs-productinfosection-header")),
    rows: [...document.querySelectorAll(".rs-productinfosection .rc-pdsection-panel")].map((p) => ({
      title: txt(p.querySelector(".rc-pdsection-title")),
      // List items when the panel has a list (What's in the box), else the panel text as paragraphs.
      paragraphs: (() => {
        const main = p.querySelector(".rc-pdsection-mainpanel");
        // Hidden duplicates (one copy per model) are skipped: only rendered items count.
        const items = [...new Set([...(main?.querySelectorAll("li") || [])].filter(visible).map((n) => txt(n)).filter(Boolean))];
        return items.length ? items : [txt(main)].filter(Boolean);
      })(),
    })).filter((r) => r.title),
  };

  // ---- FAQ accordion ----
  const faq = [...document.querySelectorAll(".rc-accordion-item")].map((li) => ({
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

  return { template: "flagship", ribbon, head, media, buystrip, chat, steps, applecare, summary, purchaseNote, footnotes, witb, productInfo, faq, compare, promo };
}
