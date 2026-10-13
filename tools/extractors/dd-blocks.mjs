// Shared marketing blocks of buy flows: personal setup, services, the model comparison
// (columns for iPhone, iPad and Watch) and the centred billboard (education offer on Mac). Runs in the source page: must stay self-contained.
// Output feeds assets/js/live/dd-blocks.js. Blocks come back in page order.
export default function extract() {
  // Visible text only: drop visually hidden labels, footnote markers and superscripts.
  const clean = (s) => String(s || "")
    .replace(/‍/g, "")
    .replace(/\s+/g, " ")
    .replace(/Footnote\s*[\d*※¶†‡∆#±]+/g, "")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  const text = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup, as-footnote, [class*='footnote']").forEach((n) => n.remove());
    c.querySelectorAll("br").forEach((n) => n.replaceWith(" "));
    return clean(c.textContent);
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  // Image with its source URL and alt text; lazy placeholders (data: URIs) are skipped.
  const img = (el) => {
    if (!el) return null;
    const i = el.tagName === "IMG" ? el : el.querySelector("img");
    if (!i) return null;
    const src = i.currentSrc || i.getAttribute("src") || "";
    if (!src || /^data:/.test(src)) return null;
    // Display size from the source's own width/height attributes (half the file size on retina images).
    return { src: abs(src), alt: i.alt || "", w: Number(i.getAttribute("width")) || null, h: Number(i.getAttribute("height")) || null };
  };
  const link = (a) => (a ? { text: text(a), href: abs(a.getAttribute("href")) } : null);
  const lines = (s) => clean(s).split(/(?=Lease from)/).map((x) => x.trim()).filter(Boolean);

  const blocks = [];
  // Document order: one entry per block as it appears on the page.
  const ordered = [...document.querySelectorAll(".dd-shared-personal-setup, .dd-services, .dd-compare, .dd-fill-tertiary:has(.dd-billboard-link), .dd-billboard")];

  for (const el of ordered) {
    if (el.classList.contains("dd-shared-personal-setup")) {
      blocks.push({
        type: "setup",
        title: text(el.querySelector("h2")),
        text: text(el.querySelector("p.t-intro-elevated, p")),
        img: img(el.querySelector("img.dd-hero, .dd-image img")),
        link: link(el.querySelector(".dd-link a, a[href]")),
        // Copy size changes per page (17 px on iPhone, 24 px on Mac).
        large: parseFloat(getComputedStyle(el.querySelector("p.t-intro-elevated, p") || el).fontSize) >= 24,
      });
    } else if (el.classList.contains("dd-services")) {
      blocks.push({
        type: "services",
        title: text(el.querySelector("h2")),
        text: text(el.querySelector(".dd-subcopy, p")),
        img: img(el.querySelector("img.dd-hero, .dd-image img")),
        // The band colour changes per product family (grey on iPhone, tinted on Mac).
        bg: getComputedStyle(el).backgroundColor,
      });
    } else if (el.querySelector(".dd-billboard-link")) {
      blocks.push({
        type: "billboard",
        // Shared "shop for business" billboard: larger title on a lighter band; Mac education offer: grey band.
        large: el.classList.contains("dd-billboard"),
        title: text(el.querySelector("h2, .dd-headline")),
        text: text(el.querySelector(".dd-billboard-subcopy, p.t-body, p:not(.dd-billboard-link)")),
        link: link(el.querySelector(".dd-billboard-link a")),
      });
    } else if (el.classList.contains("dd-compare")) {
      // Columns: one per product. Feature groups are matched across columns by their class (display, camera, ...).
      const cols = [...el.querySelectorAll(".dd-grid-column")];
      const keys = [];
      const columns = cols.map((col) => {
        const feats = [...col.querySelectorAll(":scope .dd-features > .dd-feature")];
        return {
          name: text(col.querySelector(".dd-product-name")),
          href: abs(col.querySelector(".dd-product-name a")?.getAttribute("href")),
          hero: img(col.querySelector(".dd-compare-hero")),
          swatches: [...col.querySelectorAll(".dd-color-swatch")].map((s) => img(s)).filter(Boolean),
          badge: text(col.querySelector(".badge, .dd-violator")),
          subtitle: text(col.querySelector(".dd-subtitle")),
          price: lines(text(col.querySelector(".dd-compare-price"))),
          features: feats.map((f) => {
            const key = [...f.classList].find((c) => c !== "dd-feature") || "";
            if (key && !keys.includes(key)) keys.push(key);
            const ps = [...f.querySelectorAll("p")];
            return {
              key,
              glyph: f.querySelector("svg.dd-glyph-svg") ? f.querySelector("svg.dd-glyph-svg").outerHTML : null,
              icon: img(f.querySelector("img.dd-icon")),
              lines: ps.map((p) => ({
                text: text(p),
                // Narrow lines: the source insets some lines on both sides (dd-compact-* classes).
                inset: Math.round(parseFloat(getComputedStyle(p).marginLeft)) || 0,
                eyebrow: /dd-display-size|dd-case-size|t-eyebrow-elevated/.test(p.className),
                none: text(p) === "—",
              })).filter((l) => l.text),
            };
          }),
        };
      });
      const info = el.querySelector(".dd-compare-info");
      // Roomy variant (iPad): 17/25 subtitles, 14/20 feature lines; dense (iPhone, Watch): 17/21 and 12/16.
      const sub = el.querySelector(".dd-subtitle");
      const roomy = !!sub && !sub.classList.contains("t-body-tight") && sub.classList.contains("t-body");
      const linkEl = el.querySelector(".dd-compare-link");
      const heroEl = el.querySelector(".dd-compare-hero");
      const linkTop = !!linkEl && !!heroEl && linkEl.getBoundingClientRect().top < heroEl.getBoundingClientRect().top;
      blocks.push({
        type: "compare",
        roomy,
        linkTop,
        title: text(info?.querySelector(".dd-compare-header")),
        link: link(el.querySelector(".dd-compare-link a")),
        keys,
        columns,
      });
    }
  }
  return { blocks };
}
