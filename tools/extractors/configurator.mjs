// Configurator pages (iPhone, iPad, Vision: step-by-step buy flow). Runs in the page context: must stay self-contained.
// Output feeds assets/js/live/configurator.js.
export default function extract() {
  // Visible text only: drop screen-reader helpers, footnote markers and superscripts, then tidy the wording.
  const clean = (s) => String(s || "")
    .replace(/‍/g, "")
    .replace(/\s+/g, " ")
    .replace(/Footnote\s*[\d*※¶†‡∆#]+/g, "")
    .replace(/\bmo\.months\b/g, "mo.")
    .replace(/\bper month\b|\bper mo\.?\b/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  const text = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup, as-footnote, [class*='footnote']").forEach((n) => n.remove());
    c.querySelectorAll("div, p, h1, h2, h3, h4, li, br").forEach((n) => n.after(" "));
    return clean(c.textContent);
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  // Largest real image inside an element (lazy placeholders are data: URIs and are skipped).
  const best = (root) => {
    if (!root) return null;
    const imgs = [...root.querySelectorAll("img")].filter((i) => (i.currentSrc || i.src) && !/^data:/.test(i.currentSrc || i.src));
    if (!imgs.length) return null;
    const size = (i) => i.getBoundingClientRect().width || i.naturalWidth || 0;
    const i = imgs.sort((a, b) => size(b) - size(a))[0];
    return { src: i.currentSrc || i.src, alt: i.alt || "" };
  };
  // First dollar amount of a text (the "Buy from" price), or null.
  const priceOf = (s) => {
    const m = /\$([\d,]+(?:\.\d+)?)/.exec(s || "");
    return m ? Number(m[1].replace(/,/g, "")) : null;
  };
  // Price text split into lines: one for the purchase price, one for the lease price.
  const priceLines = (s) => clean(s).split(/(?=Lease from)/).map((x) => x.trim()).filter(Boolean);
  const ownText = (el) => clean([...(el?.childNodes || [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""));
  const uniqueBy = (list, key) => {
    const seen = new Set();
    return list.filter((x) => { const k = key(x); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  };

  // ---------- Ribbon (carrier offers, shown in the shell nav) ----------
  const ribbonLink = document.querySelector(".as-carrierpromotion-ribbonlearnmore");
  const ribbon = {
    title: text(document.querySelector(".as-carrierpromotion-offersheader")),
    items: uniqueBy([...document.querySelectorAll(".as-carrierpromotion-ribbon-item")].map(text), (t) => t),
    link: ribbonLink ? { text: text(ribbonLink), href: abs(ribbonLink.getAttribute("href")) } : null,
  };

  // ---------- Header ----------
  const h1 = document.querySelector("h1");
  const headWrap = h1?.closest("[class*='rf-bfe-header']") || h1?.parentElement;
  const eyebrowEl = headWrap?.querySelector(".badge, [class*='msgtag'], [class*='violator']");
  // The intro paragraph (Duo) is a bare text node in the header block, next to the title.
  const headBlock = document.querySelector("[data-autom='bfe-header']");
  const head = {
    eyebrow: text(eyebrowEl),
    intro: clean(ownText(headBlock)),
    title: text(h1),
    price: priceLines(text(document.querySelector(".rf-bfe-header-price"))),
    // Pills are links to the source overlays (opened in a new tab by the renderer).
    pills: uniqueBy([...document.querySelectorAll("[class*='rf-bfe-header-rightsection'] a, [class*='rf-bfe-header-rightsection'] button")].map((el) => ({ text: text(el), href: abs(el.getAttribute("href")) })), (p) => p.text),
  };

  // The page script defines each decision step's overlay URL: window.decisionSection[key].overlayLink.url.
  const html = document.documentElement.innerHTML.replace(/&amp;/g, "&").replace(/\\\//g, "/");
  const overlayOf = {};
  for (const m of html.matchAll(/decisionSection\["([^"]+)"\]\s*=\s*\{[\s\S]{0,800}?"overlayLink":\{"url":"([^"]+)"/g)) {
    overlayOf[m[1]] = abs(m[2]);
  }

  // ---------- Finish photos: the summary shows the photo of the chosen finish (one source URL per finish) ----------
  // Lazy images are not loaded yet, so the URLs are read from the page markup, not from <img> elements.
  const finishImages = uniqueBy([...html.matchAll(/https:\/\/[^"'\s<>\\]*?-finish-select-([a-z]+)-[^"'\s<>\\]*/g)]
    .filter((m) => !/-max-finish-select-/.test(m[0]))
    .map((m) => ({ color: m[1], src: m[0] })), (f) => f.color);
  const summaryImage = best(document.querySelector(".rf-bfe-summary-image-wrapper"));

  // ---------- Gallery slides: real images, or the video of the first slide (Duo) ----------
  const gallery = [...document.querySelectorAll(".rc-inline-gallery-item")].map((s) => {
    const v = s.querySelector("video");
    if (v) {
      return { type: "video", src: abs(v.currentSrc || v.querySelector("source")?.src || v.src), poster: abs(v.poster || null) };
    }
    const img = best(s);
    return img ? { type: "img", src: abs(img.src), alt: img.alt } : null;
  }).filter((s) => s && s.src);

  // ---------- Steps, in the order of their data-analytics-section ----------
  // A key can appear on several elements (responsive copies, split wrappers): their content is merged.
  const SKIP = new Set(["summary", "witb", "buyflow-faq"]);
  const keys = [];
  for (const sec of document.querySelectorAll("[data-analytics-section]")) {
    const key = sec.dataset.analyticsSection;
    // Promotional blocks (buyflow-*) and banners without choices are not configurator steps.
    if (key && !SKIP.has(key) && !/^buyflow-/.test(key) && !/^(fit|vision)$/.test(key) && !keys.includes(key)) keys.push(key);
  }
  const steps = [];
  for (const key of keys) {
    const secs = [...document.querySelectorAll(`[data-analytics-section="${key}"]`)];
    const within = (sel) => secs.flatMap((sec) => [...sec.querySelectorAll(sel)]);

    // Title: "Keyword." in the first span and the complement in .as-subheading, else the whole heading.
    const hdr = within(".rf-bfe-dimension-header")[0];
    const subEl = hdr?.querySelector(".as-subheading");
    const titleEl = hdr || within("h2, [class*='section-heading'], [class*='tradeup-header']")[0];
    const keyword = hdr ? text(hdr.querySelector("span:not(.as-subheading)")) : "";
    const rest = hdr ? text(subEl) : text(titleEl);

    // Swatches (finish colors) are thumbnails of the product in each finish.
    const swatches = uniqueBy(within(".colornav-link").map((l) => ({ label: text(l) || l.getAttribute("title") || "", img: best(l) })), (x) => x.label);

    // Option cards: title, subline (left column only), price lines and the price used for the total.
    const options = uniqueBy(within("label.form-selector-label").map((label) => {
      const input = document.getElementById(label.htmlFor) || label.previousElementSibling;
      const full = text(label);
      // Price starts at the first "Buy from", "Lease from" or dollar amount; the title ends there too.
      const tailAt = full.search(/Buy from|Lease from|\$\d/);
      const sub = text(label.querySelector(".form-selector-left-col .form-label-small"));
      // Carrier cards show a logo with the name in a visually hidden label: fall back to the raw text.
      const titleEl = label.querySelector(".form-selector-title");
      let title = text(titleEl) || clean(titleEl?.textContent) || (tailAt > 0 ? full.slice(0, tailAt) : full);
      title = title.split(/Buy from|Lease from/)[0].trim();
      if (sub && title.endsWith(sub)) title = title.slice(0, -sub.length).trim();
      const right = text(label.querySelector(".form-selector-right-col")) || (tailAt >= 0 ? full.slice(tailAt) : "");
      return { title, sub, lines: priceLines(right), price: priceOf(right), disabled: !!input?.disabled };
    }), (o) => o.title);

    // Help cards ("Need help choosing...") with their image when present.
    // Help cards link to their source overlay (the link sits in the card or right after it).
    const helpcards = uniqueBy(within(".rc-decisionsection").map((c) => {
      const link = c.querySelector("a[href]") || c.parentElement?.querySelector("a[href*='/browse/overlay/']") || c.closest("[data-trigger-click]")?.querySelector("a[href*='/browse/overlay/']");
      return {
        title: text(c.querySelector(".rc-decisionsection-header")),
        text: text(c.querySelector(".rc-decisionsection-desc")),
        img: best(c),
        href: abs(link?.getAttribute("href")) || overlayOf[key] || null,
      };
    }), (h) => h.title);

    const step = { key, keyword, rest, swatches, options, helpcards, optional: /applecare|tradein/.test(key) };
    if (keyword || rest || swatches.length || options.length || helpcards.length) steps.push(step);
  }

  // ---------- Summary ----------
  const sum = document.querySelector("[data-analytics-section='summary'], .rf-bfe-summary");
  const summary = {
    title: text(sum?.querySelector("h2, h3")),
    button: text(sum?.querySelector("button.button-block")),
  };

  // ---------- What's in the box ----------
  const witbSec = document.querySelector("[data-analytics-section='witb'], .rf-flagship-buyflow-witb");
  const witb = {
    title: text(witbSec?.querySelector("h2")),
    items: uniqueBy([...document.querySelectorAll(".rc-witb-item")].map((li) => ({ label: text(li.querySelector(".rc-witb-item-label")), img: best(li) })), (i) => i.label).filter((i) => i.label || i.img),
  };

  // ---------- FAQ ----------
  const faqSec = document.querySelector("[data-analytics-section='buyflow-faq']");
  const faq = {
    title: text(faqSec?.querySelector("h2")),
    items: uniqueBy([...document.querySelectorAll(".rc-accordion-item")].map((item) => ({
      q: text(item.querySelector(".rc-accordion-title")),
      a: text(item.querySelector(".rc-accordion-box-content")),
    })), (i) => i.q).filter((i) => i.q),
  };

  return { template: "configurator", ribbon, head, gallery, steps, summary: { ...summary, image: summaryImage, finishImages }, witb, faq };
}
