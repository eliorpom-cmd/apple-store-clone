// Configurator pages with every step in the right rail (Mac, Watch and iPad buy flows). Runs in the source page: must stay self-contained.
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
  // Rendered text only: skips screen-reader text, footnote marks and hidden nodes.
  const shown = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts = [];
    let n;
    while ((n = w.nextNode())) {
      const el = n.parentElement;
      if (!el || el.closest(".visuallyhidden, sup, as-footnote") || !el.getClientRects().length || getComputedStyle(el).display === "none") continue;
      // Keep the source's unbreakable groups ("for 12 mo.") together.
      parts.push(el.closest(".nowrap") ? n.textContent.replace(/ /g, "\u00a0") : n.textContent);
    }
    // One space where the source has a space next to an unbreakable one; a lone nbsp stays.
    return parts.join("").replace(/[ \t\n\r]+/g, " ").replace(/[ \u00a0]* [ \u00a0]*/g, " ").trim();
  };

  // Rendered text split into the lines the source shows (text nodes grouped by their vertical position).
  const shownLines = (root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const lines = [];
    let n;
    while ((n = w.nextNode())) {
      const el = n.parentElement;
      if (!el || !n.textContent.trim() || el.closest(".visuallyhidden, sup, as-footnote") || !el.getClientRects().length) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const top = Math.round(r.getBoundingClientRect().top);
      const last = lines.at(-1);
      if (last && Math.abs(last.top - top) < 6) last.text += " " + n.textContent;
      else lines.push({ top, text: n.textContent });
    }
    return lines.map((l) => l.text.replace(/[ \t\n\r]+/g, " ").replace(/[ \u00a0]* [ \u00a0]*/g, " ").replace(/ +([/.])/g, "$1").trim()).filter(Boolean);
  };

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
    // Sub-line: in the title or the left column only (the right column's small text is the price).
    const subEl = titleEl?.querySelector(".form-label-small") || root.querySelector(".form-selector-left-col .form-label-small");
    let name;
    let sub = "";
    if (titleEl) {
      const c = titleEl.cloneNode(true);
      c.querySelectorAll(".form-label-small, .badge").forEach((n) => n.remove());
      name = clean(c);
      // Line breaks of the sub-line are kept ("Choice of GPS / or GPS + Cellular").
      if (subEl) {
        const c2 = subEl.cloneNode(true);
        c2.querySelectorAll(".visuallyhidden, [class*='visuallyhidden'], .a11y, sup, as-footnote").forEach((n) => n.remove());
        c2.querySelectorAll("br").forEach((n) => n.replaceWith("\n"));
        sub = c2.textContent.split("\n").map((l) => l.replace(/[ \t\r]+/g, " ").trim()).filter(Boolean).join("\n");
      }
    } else {
      const swatchName = clean(root.querySelector(".colornav-label"));
      const lines = (root.innerText || "").split("\n").map((l) => l.replace(/Footnote\s*\S*/g, "").trim()).filter(Boolean);
      name = swatchName || lines[0] || clean(root);
      sub = swatchName ? "" : lines.slice(1).join(" ");
    }
    // Accessory slot (iPad Pencil, Keyboard): optional tag, name (with its sub-copy), price lines on the right.
    const accLabel = root.querySelector(".rf-accessorybutton-left-label");
    if (accLabel) {
      const priceBox = root.querySelector(".rf-accessory-inline-price");
      const lines = priceBox ? shownLines(priceBox) : [];
      return {
        value: input.value,
        tag: clean(root.querySelector(".badge")),
        tagSize: root.querySelector(".badge-tiny") ? "tiny" : "reduced",
        // The sub-copy ("(USB-C)") is its own line on the source.
        name: (() => {
          const c = accLabel.cloneNode(true);
          const subcopy = c.querySelector(".rf-accessory-tile-subcopy");
          subcopy?.remove();
          return clean(c) + (subcopy ? "\n" + clean(subcopy) : "");
        })(),
        sub: "",
        price: lines.join("|"),
        amount: priceOf(lines[0]),
        bullets: [],
        rich: lines.length > 0,
      };
    }
    // Payment cards: title, optional sub-line with a logo, then a detail block (list or one line).
    const poTitle = root.querySelector(".rf-po-bfe-dimension-base-title");
    if (poTitle) {
      const subEl = root.querySelector(".rf-po-bfe-dimension-base-subtitle");
      const items = [...root.querySelectorAll(".rf-po-bfe-dimension-base-detail li")].map(clean).filter(Boolean);
      const logo = poTitle.querySelector("img");
      return {
        value: input.value,
        name: (() => { const c = poTitle.cloneNode(true); c.querySelectorAll(".visuallyhidden, img").forEach((n) => n.remove()); return clean(c); })(),
        // "Lease with [logo]": the logo image and its hidden label.
        nameLogo: logo ? { src: logo.currentSrc || logo.src, alt: clean(poTitle.querySelector(".visuallyhidden")) || logo.alt || "" } : null,
        // Price summary lines under the title (iPad).
        priceLines: [...root.querySelectorAll(".rf-po-bfe-purchaseoptions-prices-content")].filter((el) => !el.parentElement.closest(".rf-po-bfe-purchaseoptions-prices-content")).map(shown).filter(Boolean),
        sub: clean(subEl),
        subIcon: subEl?.querySelector("img") ? { src: subEl.querySelector("img").currentSrc || subEl.querySelector("img").src, alt: "" } : null,
        bullets: items,
        detail: items.length ? "" : clean(root.querySelector(".rf-po-bfe-dimension-base-detail")),
        price: "",
        amount: null,
        po: true,
      };
    }
    const priceEl = root.querySelector(".form-selector-right-col, .rf-bfe-selector-right-col, [class*='right-col']");
    const pointEls = [...root.querySelectorAll(".price-point")].filter((el) => !el.parentElement.closest(".price-point"));
    const pointLines = pointEls.filter((el) => el.getBoundingClientRect().width > 0).map(shown).filter(Boolean);
    const fullEl = root.querySelector(".as-pricepoint-fullprice") || priceEl;
    const full = pointLines.length ? pointLines[0] : (fullEl && fullEl.getClientRects().length ? shown(fullEl) : "");
    const bullets = [...root.querySelectorAll("li")].map(clean).filter(Boolean).slice(0, 6);
    const swatch = root.querySelector(".colornav-swatch");
    return {
      value: input.value,
      // Small orange tag above the name ("New finish") and the line under the card's rule.
      tag: clean(titleEl?.querySelector(".badge")),
      tagSize: titleEl?.querySelector(".badge-tiny") ? "tiny" : "reduced",
      // A block sub-line (div) sits 4 px under the name; an inline one (span) right under it.
      subBlock: subEl?.tagName === "DIV",
      foot: clean(root.querySelector(".rf-bfe-selector-subtext")),
      name,
      sub,
      price: pointLines.length ? pointLines.join("|") : full,
      amount: priceOf(full),
      bullets,
      disabled: input.disabled,
      swatch: swatch ? { src: swatch.currentSrc || swatch.src, alt: swatch.alt || "" } : null,
      rich: !!titleEl && !!priceEl && (!!subEl || pointLines.length > 0),
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
    if (step.querySelector(".rf-vq-banner")) return "guided";
    if (/applecare/.test(c)) return "applecare";
    if (/tradeup/.test(c)) return "tradeup";
    if (/purchase-options/.test(c)) return "purchase";
    if (/engraving/.test(c)) return "engraving";
    if (step.querySelector(".rs-mac-bfe-collapsible-config-section, .rc-accordion")) return "customizations";
    return "dimension";
  };

  // Top-level steps only, in document order. (Prices are visible only on the first step at load.)
  const all = [...document.querySelectorAll(".rf-bfe-step, .rf-bfe-purchase-options")];
  const top = all.filter((s) => !all.some((o) => o !== s && o.contains(s)));
  const steps = top.map((step) => {
    const kind = kindOf(step);
    const h = header(step);
    // The carrier step (iPad) only appears once a cellular model is chosen; at load it may still be fading out.
    const hidden = !step.getClientRects().length || !!step.closest(".rf-bfe-dimension-carriermodel-section, [class*='fade-transition-exit']");
    const inputs = [...step.querySelectorAll("input[type=radio]")];
    const swatches = inputs.filter((i) => i.closest(".colornav-item") && i.closest(".colornav-item").getClientRects().length);
    // Choices whose card is not shown (nested sub-choices such as engraving inside an accessory slot) are left out.
    const shownCard = (i) => { const l = (i.id && document.querySelector(`label[for="${CSS.escape(i.id)}"]`)) || i.closest("label"); return !l || l.getClientRects().length > 0; };
    const cards = inputs.filter((i) => !i.closest(".colornav-item") && shownCard(i));
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
      const title = clean(card.querySelector(".rc-decisionsection-header, h3, h4, strong, [class*='title']"));
      const desc = linkText && full.endsWith(linkText) ? full.slice(0, -linkText.length) : full;
      // The photo sits on top (Mac) or on the left (Watch trade-in).
      const photo = card.querySelector(".rc-decisionsection-image");
      const side = !!photo && photo.getBoundingClientRect().width < card.getBoundingClientRect().width / 2;
      const descEl = card.querySelector(".rc-decisionsection-desc");
      return { title, desc: descEl ? clean(descEl) : title && desc.startsWith(title) ? desc.slice(title.length).trim() : desc, foot: clean(card.querySelector(".rc-decisionsection-footer")), link: linkText, image: img(card), side };
    });
    // Spacing the source CSS puts between the title and the first choice, and between the last choice and
    // the help card (it differs per product family). Applied as CSS variables, never as heights.
    const visible = (el) => el && el.getClientRects().length;
    const h2 = step.querySelector("h2");
    const choices = [...step.querySelectorAll(".rf-bfe-product-dimension-colornav-header, .form-selector-label, select, .colornav-link, .rf-applecare-label, .rf-po-bfe-dimension-base-label")].filter(visible);
    const decision = [...step.querySelectorAll(".rc-decisionsection")].find(visible);
    // From the bottom of the title text (some titles carry their own bottom padding).
    const titleBottom = h2 ? h2.getBoundingClientRect().bottom - parseFloat(getComputedStyle(h2).paddingBottom) : 0;
    const gap = h2 && choices.length ? Math.round(choices[0].getBoundingClientRect().top - titleBottom) : null;
    const above = [...choices, ...[...step.querySelectorAll(".rf-po-bfe-payment-overlaylink")].filter(visible)];
    const lastChoice = above.filter((c) => !decision || c.getBoundingClientRect().top < decision.getBoundingClientRect().top)
      .sort((a, b) => a.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom).at(-1);
    const helpGap = decision && lastChoice ? Math.round(decision.getBoundingClientRect().top - lastChoice.getBoundingClientRect().bottom) : null;
    return {
      kind,
      hidden,
      gap,
      helpGap,
      // The source centres each step in the viewport with an inline margin it computes itself.
      margin: step.style.margin || "",
      keyword: h.keyword,
      complement: h.complement,
      swatches: swatches.map(option),
      swatchHeader: clean(step.querySelector(".rf-bfe-product-dimension-colornav-header")),
      options: groups.length ? [] : cards.map(option),
      groups,
      helpcards,
      // Guided step (Vision fitting and vision check): title, grey line or product lines, button, "Already started?".
      guided: kind === "guided" ? (() => {
        const b = step.querySelector(".rf-vq-banner");
        const foot = b.querySelector(".rf-vq-banner-cold-footer");
        return {
          title: clean(b.querySelector(".rf-vq-banner-header")),
          desc: clean(b.querySelector(".rf-vq-banner-description")),
          products: [...b.querySelectorAll(".rf-vq-banner-productinfo > div")].map(clean).filter(Boolean),
          button: clean(b.querySelector(".rf-vq-banner-getstarted-button, .button")),
          footText: clean(foot?.querySelector("div")),
          footLink: clean(foot?.querySelector("button, a")),
        };
      })() : null,
      // Footer under the choices (Watch connectivity: "Supported carriers" and their logos).
      footer: (() => {
        const f = step.querySelector(".rf-bfe-dimension-footer");
        if (!f) return null;
        return { title: clean(f.querySelector("h3")), images: [...f.querySelectorAll("img")].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" })) };
      })(),
      // Drop-down choice (keyboard language): its floating label and option texts.
      select: (() => {
        const sel = step.querySelector("select");
        if (!sel || !sel.getClientRects().length) return null;
        const label = clean(sel.parentElement.querySelector("label"));
        return { label, options: [...sel.options].filter((o) => o.value && o.value !== "none").map((o) => ({ value: o.value, text: o.text.trim() })) };
      })(),
      // Link under the payment choices ("Get Apple Upgrade details", iPad).
      poLink: (() => { const a = step.querySelector(".rf-po-bfe-payment-overlaylink a"); return a && a.getClientRects().length ? clean(a) : ""; })(),
      note: kind === "tradeup" ? clean(step.querySelector(".rf-bfe-tradeup-description, [class*='tradeup'] p")) : "",
    };
  });

  // Gallery: one slide per item, with the widest image of each.
  const items = [...document.querySelectorAll(".rc-inline-gallery-item")];
  const dots = document.querySelectorAll(".rc-gallery-dotnav-button").length;
  const slides = items.map((it) => {
    const caption = clean(it.querySelector("[class*='gallery-info'], [class*='caption']"));
    // Video slide (Vision): its file and poster; the frame crops it like a picture.
    const v = it.querySelector("video");
    if (v && (v.currentSrc || v.querySelector("source"))) return { video: v.currentSrc || v.querySelector("source").src, src: v.poster || "", alt: v.getAttribute("aria-label") || "", caption };
    const i = img(it);
    return i ? { src: i.src, alt: i.alt, caption } : null;
  }).filter(Boolean);
  if (!slides.length) {
    const fallback = [...document.querySelectorAll(".rf-bfe-gallery img")].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "", caption: "" }));
    slides.push(...fallback);
  }

  const pills = [...document.querySelectorAll("[class*='rf-bfe-header-rightsection'] a, [class*='rf-bfe-header-rightsection'] button")]
    // Plus-icon pills open an overlay; the Apple Card pill on Mac has no icon.
    .map((a) => ({ text: clean(a), href: abs(a.getAttribute("href")), icon: a.classList.contains("rf-bfe-header-plusicon") }))
    .filter((p) => p.text);

  const headerRoot = document.querySelector("[class*='rf-bfe-header-text-wrapper']") || document.querySelector("[class*='rf-bfe-header']");
  const title = clean(document.querySelector("h1")) || clean(headerRoot?.querySelector("[class*='title']"));
  const eyebrow = clean(document.querySelector(".rf-bfe-header .badge, [class*='rf-bfe-header'] [class*='eyebrow'], [class*='rf-bfe-header'] [class*='msgtag']"));
  // Header price: the first price block outside the sticky bar and the summary, one entry per rendered line.
  const priceBlock = [...document.querySelectorAll(".rc-prices")].find((e) => !e.closest(".rf-bfe-stickybar, .rf-bfe-summary, .rf-bfe-summary-price-content"));
  const lines = [];
  if (priceBlock) {
    const points = [...priceBlock.querySelectorAll(".price-point")].filter((el) => !el.parentElement.closest(".price-point"));
    let top = null;
    for (const el of points) {
      const t = shown(el);
      if (!t) continue;
      const y = Math.round(el.getBoundingClientRect().top);
      if (top !== null && Math.abs(y - top) < 4) lines[lines.length - 1] += " " + t;
      else lines.push(t);
      top = y;
    }
    if (!lines.length) lines.push(clean(priceBlock));
  }

  // Line under the header prices (iPad: Apple Intelligence mark, text, "Learn more" link).
  const footEl = document.querySelector(".rf-bfe-header-footer");
  const headFoot = footEl && footEl.getClientRects().length ? (() => {
    const a = footEl.querySelector("a");
    const c = footEl.cloneNode(true);
    c.querySelectorAll("a, img").forEach((n) => n.remove());
    const icon = footEl.querySelector("img");
    return { icon: icon ? { src: icon.currentSrc || icon.src, alt: icon.alt || "" } : null, text: clean(c), link: a ? { text: clean(a), href: abs(a.getAttribute("href")) } : null };
  })() : null;
  // Gallery: small arrows beside the dots (Mac) or large ones at the sides; picture contained or cropped to the frame (iPad).
  const arrow = document.querySelector(".rc-inline-gallery .paddlenav-arrow-next");
  const galImg = document.querySelector(".rf-bfe-gallery-image");
  const galleryStyle = {
    arrows: arrow && arrow.getBoundingClientRect().width < 44 ? "small" : "large",
    fit: document.querySelector(".rf-bfe-gallery-video-wrapper video") ? "cover" : galImg && galImg.getBoundingClientRect().width > galImg.closest(".rf-bfe-gallery-image-wrapper, .rf-bfe-gallery-content")?.getBoundingClientRect().width + 2 ? "cover" : "contain",
  };

  const summaryRoot = document.querySelector(".rf-bfe-summary-price-content, .rf-bfe-summary");
  // Visible text only: skips screen-reader text, footnote marks and hidden nodes.
  const visibleText = (root) => {
    if (!root) return "";
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts = [];
    let n;
    while ((n = w.nextNode())) {
      const el = n.parentElement;
      if (!el || el.closest(".visuallyhidden, [class*='visuallyhidden'], sup, as-footnote") || getComputedStyle(el).display === "none") continue;
      parts.push(n.textContent);
    }
    return parts.join(" ").replace(/\s+/g, " ").replace(/\s+\//g, "/").trim();
  };
  const summary = {
    title: clean(document.querySelector(".rf-bfe-summary h2, .rf-bfe-summary h3")),
    price: clean(summaryRoot?.querySelector(".as-pricepoint-fullprice")),
    priceAmount: priceOf(clean(summaryRoot?.querySelector(".as-pricepoint-fullprice"))),
    monthly: clean(summaryRoot?.querySelector(".as-pricepoint-installmentprice-comparative")),
    cta: clean(document.querySelector(".rc-summary-button")) || "Continue",
    subheader: clean(document.querySelector(".rf-bfe-summary-subheader")),
    priceBlocks: visibleText(document.querySelector(".rf-bfe-summary-price-content .rf-bfe-summary-price, .rf-bfe-summary-price"))
      .split(/(?= Lease from| Lease from)/).map((x) => x.trim()).filter(Boolean),
    cashback: (() => { const m = document.querySelector(".rf-bfe-summary .rf-ac-messages"); return m && m.getClientRects().length ? shown(m) : ""; })(),
    saveTitle: clean(document.querySelector(".rf-saveditem-content-header")),
    saveText: clean(document.querySelector(".rf-saveditem-content-description")),
    margin: document.querySelector(".rf-bfe-summary")?.style.margin || "",
    // iPad: product-name title (17 px), taller button, lease block apart; Mac and Watch: large two-tone title.
    variant: document.querySelector(".rf-bfe-summary-producttitle") ? "product" : "default",
    saveLinks: [...document.querySelectorAll(".rf-bfe-summary .rf-bfe-summary-buttons-container button, .rf-bfe-summary .rf-shareitem-content a, .rf-bfe-summary .rf-shareitem-content button")].map(clean).filter(Boolean),
  };

  // What's in the box: title and one item per picture (iPad); Mac and Watch pages have none.
  const witbSec = document.querySelector("[data-analytics-section='witb'], .rf-flagship-buyflow-witb");
  const seenWitb = new Set();
  const witb = witbSec ? {
    title: clean(witbSec.querySelector("h2")),
    // The 64/41 px space sits on the title itself (iPad) or on a wrapper around it (Vision).
    wrapped: !!witbSec.querySelector(".rf-flagship-buyflow-witbheadercontainer"),
    pair: (() => {
      // Two items pushed together at the centre by a side padding on each picture tile (iPhone).
      const w = witbSec.querySelector(".rc-witb-image-wrapper");
      return !!w && parseFloat(getComputedStyle(w).paddingLeft) + parseFloat(getComputedStyle(w).paddingRight) > 0;
    })(),
    note: (() => {
      // Note under the items (iPhone: "Our environmental goals." and two paragraphs split by blank lines).
      const f = document.querySelector(".rf-flagship-buyflow-witbfooter");
      if (!f || !f.getClientRects().length) return null;
      const c = f.cloneNode(true);
      const title = clean(c.querySelector("h2, h3, strong"));
      c.querySelectorAll("h2, h3, .visuallyhidden, sup, as-footnote").forEach((n) => n.remove());
      c.querySelectorAll("br").forEach((n) => n.replaceWith("\n"));
      const paras = c.textContent.split(/\n\s*\n/).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
      return title || paras.length ? { title, paras } : null;
    })(),
    // Row index of each item: the source wraps long lists (Vision) into rows of its own choosing.
    items: (() => {
      const lis = [...witbSec.querySelectorAll(".rc-witb-item")].filter((li) => li.getClientRects().length);
      const tops = [...new Set(lis.map((li) => Math.round(li.getBoundingClientRect().top)))];
      return lis.map((li) => ({ label: clean(li.querySelector(".rc-witb-item-label")), img: img(li), row: tops.indexOf(Math.round(li.getBoundingClientRect().top)) }))
        .filter((i) => (i.label || i.img) && !seenWitb.has(i.label) && seenWitb.add(i.label));
    })(),
  } : null;

  const faqRoot = document.querySelector("[data-analytics-section='buyflow-faq']") || document;
  const faq = [...faqRoot.querySelectorAll(".rc-accordion-button")].slice(0, 12).map((b) => {
    const item = b.closest(".rc-accordion-item, .rc-accordion") || b.parentElement;
    const panel = item?.querySelector(".rc-accordion-content");
    return { q: clean(b), a: clean(panel) };
  }).filter((f) => f.q);

  const railBottom = Math.max(0, ...[...document.querySelectorAll(".rf-bfe-step, .rf-bfe-summary")].filter((e) => !e.closest(".rf-bfe-stickybar")).map((e) => e.getBoundingClientRect().bottom + scrollY));
  // AppleCare: one card per plan row (title, subline, bullets). The term choices sit in a tray the source keeps closed.
  steps.forEach((st, i) => {
    if (st.kind !== "applecare") return;
    const rows = [...top[i].querySelectorAll(".rf-applecare-option")];
    st.options = rows.map((row) => {
      const input = row.querySelector("input[type=radio]");
      const head = row.querySelector(".rc-dimension-list-header");
      const text = (head?.innerText || "").trim() ? head.innerText : row.querySelector(".form-selector-label")?.innerText || "";
      const lines = text.split("\n").map((l) => l.replace(/Footnote\s*\S*/g, "").trim()).filter(Boolean);
      return {
        value: input?.value || lines[0] || "",
        name: lines[0] || "",
        sub: lines.slice(1).join(" "),
        price: "",
        amount: null,
        bullets: [...row.querySelectorAll("li")].map(clean).filter(Boolean).slice(0, 6),
        // Plan mark (inline SVG of the source) and the closing line under the list.
        icon: row.querySelector(".as-svgicon-container svg")?.outerHTML || null,
        foot: (() => {
          const box = row.querySelector("div.as-form-choiceselectordesc-list");
          if (!box) return "";
          const c = box.cloneNode(true);
          c.querySelectorAll("ul").forEach((n) => n.remove());
          return clean(c);
        })(),
        disabled: false,
        swatch: null,
        rich: true,
      };
    });
  });
  // Locked steps show prices on Watch but not on Mac: option() keeps only the price text that is rendered.
  const stickyName = clean(document.querySelector(".rf-bfe-stickybar h2, .rf-bfe-stickybar [class*='name'], .rf-bfe-stickybar"))
    .split(" ").slice(0, 3).join(" ");
  return {
    template: "configurator-2",
    kind: /buy-watch/.test(location.pathname) ? "watch" : "computer",
    title,
    eyebrow,
    lines,
    headFoot,
    galleryStyle,
    pills,
    slides,
    steps,
    summary,
    witb,
    faq,
    sticky: { name: stickyName || title },
  };
}

// Phone pass (390 x 844, run by the live server): the image carousel each step carries on narrow screens.
// Same top-level step order as the desktop extract, so the lists line up by index.
export function extractMobile() {
  const clean = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".visuallyhidden, [class*='visuallyhidden'], .a11y, sup, as-footnote, script, style").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").trim();
  };
  const all = [...document.querySelectorAll(".rf-bfe-step, .rf-bfe-purchase-options")];
  const top = all.filter((s) => !all.some((o) => o !== s && o.contains(s)));
  return {
    steps: top.map((step) => {
      const g = step.querySelector("[class*='gallerymow']");
      if (!g) return null;
      const seen = new Set();
      const slides = [...g.querySelectorAll("img")]
        .map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" }))
        .filter((i) => i.src && !seen.has(i.src) && seen.add(i.src));
      return { slides, caption: clean(g.querySelector("[class*='info'], [class*='caption'], [class*='desc']")) };
    }),
  };
}
