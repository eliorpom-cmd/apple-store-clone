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
    const pointLines = pointEls.filter((el) => el.getBoundingClientRect().width > 0).map(clean).filter(Boolean);
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

  // Top-level steps only, in document order. (Prices are visible only on the first step at load.)
  const all = [...document.querySelectorAll(".rf-bfe-step, .rf-bfe-purchase-options")];
  const top = all.filter((s) => !all.some((o) => o !== s && o.contains(s)));
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
        disabled: false,
        swatch: null,
        rich: true,
      };
    });
  });
  // Later steps are locked at load: the source shows no price text on them, so only the amounts are kept.
  steps.forEach((st, i) => { if (i > 0) for (const o of [...st.options, ...st.groups.flatMap((g) => g.options)]) o.price = ""; });
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
    summary,
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
