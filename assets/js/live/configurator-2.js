// Live renderer for configurator pages (Mac and Watch buy flows). Data: tools/extractors/configurator-2.mjs.
// Rebuilds .cfg2 from the extracted steps, options, gallery, summary and FAQ, using the shared classes
// (.step, .option, .swatch, .summary, .pbar, [data-gallery], [data-accordion]) so components.js drives it.
// Source disabled states are not copied: the page's own step locking decides what is selectable.
Live.register("configurator-2", (data, L) => {
  const { esc, link } = L;
  const root = document.querySelector("[data-configurator]");
  if (!root) return;

  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");
  // Price lines come as "a|b|c" (one per price block of the source).
  const priceLines = (text) => (text || "").split("|").filter(Boolean).map((l) => `<span class="option-price-line">${esc(l)}</span>`).join("");
  const base = data.summary?.priceAmount || 0;
  // Deltas: each option costs its amount minus the first priced option of its step (the default choice).
  const deltaOf = (step) => {
    const priced = (step.options || []).find((o) => o.amount != null);
    const ref = priced ? priced.amount : 0;
    return (o) => (o.amount != null ? o.amount - ref : 0);
  };

  const bulletsHTML = (o) => (o.bullets?.length ? `<ul>${o.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "");

  // Rich card (name, sub-line, price on the right, bullet list) or plain option card.
  const optionHTML = (o, name, delta) => {
    const price = o.price ? `<span class="option-price">${priceLines(o.price)}</span>` : "";
    const input = `<input type="radio" name="${name}" value="${esc(o.value)}" data-label="${esc(o.name)}" data-price="${delta}" aria-label="${esc(o.name)}">`;
    if (o.rich) {
      return `<label class="option option-rich">${input}<span class="option-label">
        <span class="option-top"><span class="option-title"><span class="option-name">${esc(o.name)}</span>${o.sub ? `<span class="option-sub">${esc(o.sub)}</span>` : ""}</span>${price}</span>${bulletsHTML(o)}</span></label>`;
    }
    const main = `<span class="option-main"><span class="option-name">${esc(o.name)}</span>${o.sub ? `<span class="option-sub">${esc(o.sub)}</span>` : ""}</span>`;
    return `<label class="option${o.bullets?.length ? " option-rich" : ""}">${input}<span class="option-label">${o.bullets?.length ? `<span class="option-top">${main}${price}</span>${bulletsHTML(o)}` : `${main}${price}`}</span></label>`;
  };

  const swatchHTML = (o, name, delta) => {
    const img = o.swatch?.src ? `<img src="${esc(o.swatch.src)}" alt="" loading="lazy">` : "";
    return `<label class="swatch"><input type="radio" name="${name}" value="${esc(o.value)}" data-label="${esc(o.name)}" data-price="${delta}" aria-label="${esc(o.name)}"><span style="--c:transparent">${img}</span></label>`;
  };

  // Help card: a photo on top when the source has one, then the text and its link.
  const helpHTML = (h) => {
    const text = `<span class="cfg2-help-text">${h.title ? `<strong>${esc(h.title)}</strong>` : ""}${esc(h.desc)}</span>`;
    const media = h.image?.src ? `<img src="${esc(h.image.src)}" alt="" loading="lazy">` : "";
    if (media) return `<div class="helpcard helpcard-media">${media}<div class="cfg2-help-body">${text}${h.link ? `<span class="more-plus">${esc(h.link)}</span>` : ""}</div></div>`;
    return `<div class="helpcard"><span>${h.title ? `<strong>${esc(h.title)}</strong>` : ""}${esc(h.desc)}</span>${h.link ? `<span class="more-plus">${esc(h.link)}</span>` : ""}</div>`;
  };

  // Source hides some steps until a choice we cannot replay: they are not rendered.
  const stepsHTML = data.steps.filter((s) => !s.hidden).map((s, i) => {
    const name = `s${i}`;
    const delta = deltaOf(s);
    const title = s.keyword
      ? `<h2 class="step-title"><strong>${esc(s.keyword)}.</strong> ${esc(s.complement)}<span data-step-choice></span></h2>`
      : "";
    let body = "";
    if (s.kind === "customizations") {
      // Static cards: the source loads its options on demand, so only the card text is shown.
      body = (s.groups || []).map((g) => `<div class="cfg2-recon">
        <h3 class="t-card">${esc(g.title)}</h3>
        ${g.desc ? `<p class="t-body">${esc(g.desc)}</p>` : ""}${g.footer ? `<p class="t-note t-muted">${esc(g.footer)}</p>` : ""}
      </div>`).join("");
    } else {
      if (s.swatches?.length) {
        body += `${s.swatchHeader ? `<p class="cfg2-sub">${esc(s.swatchHeader)}</p>` : ""}<div class="swatches">${s.swatches.map((o) => swatchHTML(o, name, delta(o))).join("")}</div><p class="swatch-label"></p>`;
      }
      if (s.options?.length) {
        body += `<div class="options">${s.options.map((o) => optionHTML(o, name, delta(o))).join("")}</div>`;
      }
    }
    if (s.note) body += `<p class="t-note t-muted" style="margin-top:12px">${esc(s.note)}</p>`;
    const help = (s.helpcards || []).map(helpHTML).join("");
    if (!(title || body || help)) return "";
    // Measured source box: same height and same gap to the next step.
    const box = s.box ? ` style="min-height:${s.box.h}px;margin-bottom:${s.box.gap}px"` : "";
    return `<section class="step" id="live-step-${i}" data-dot-label="${esc(s.keyword || s.kind)}"${box}>${title}${body}${help}</section>`;
  }).join("");

  const slides = data.slides || [];
  const gallery = slides.length
    ? `<div class="cfg2-gallery"><div class="gallery" data-gallery="${data.kind === "watch" ? "default" : "compact"}"><div class="gallery-track">${slides.map((sl) =>
        `<div class="gallery-slide">${sl.caption ? `<p class="gallery-caption">${esc(sl.caption)}</p>` : ""}<img src="${esc(sl.src)}" alt="${esc(sl.alt)}" loading="lazy"></div>`).join("")}</div></div></div>`
    : "";

  // Full-width promo block: centred text and image, or a backdrop image with text beside it.
  const promoHTML = (b) => {
    const style = ` style="${b.bg && b.bg !== "rgba(0, 0, 0, 0)" ? `background:${esc(b.bg)};` : ""}min-height:${b.box.h}px;margin-bottom:${b.box.gap}px"`;
    const linkHTML = b.link ? `<a class="live-link" href="${esc(link(b.link.href))}">${esc(b.link.text)}</a>` : "";
    const text = b.text ? `<p class="live-promo-text">${esc(b.text)}</p>` : "";
    if (b.image && b.image.w > 900) {
      return `<section class="live-block live-promo live-backdrop"${style}>
        <img class="live-backdrop-img" src="${esc(b.image.src)}" alt="" style="width:${b.image.w}px;height:${b.image.h}px" loading="lazy">
        <div class="live-backdrop-text"><h2 class="live-promo-title">${esc(b.heading)}</h2>${text}${linkHTML}</div></section>`;
    }
    const img = b.image ? `<img class="live-promo-img" src="${esc(b.image.src)}" alt="${esc(b.image.alt)}" style="width:${b.image.w}px;height:${b.image.h}px" loading="lazy">` : "";
    return `<section class="live-block live-promo"${style}><div class="live-promo-inner">
      <h2 class="live-promo-title">${esc(b.heading)}</h2>${img}${text}${linkHTML}</div></section>`;
  };

  // Model comparison grid: one column per model, then one row per feature (rows line up across columns).
  const compareHTML = (b) => {
    const cols = b.columns || [];
    const keys = [...new Set(cols.flatMap((c) => c.features.map((f) => f.key)))];
    const cell = (c) => c.image ? `<img class="live-cmp-img" src="${esc(c.image.src)}" alt="${esc(c.image.alt)}" loading="lazy">` : "";
    const cfg = `grid-template-columns:repeat(${cols.length}, 310px)`;
    return `<section class="live-block live-compare" style="margin-bottom:${b.box.gap}px;min-height:${b.box.h}px">
      <div class="live-compare-head"><h2 class="live-promo-title">${esc(b.heading)}</h2>${b.text ? `<p class="live-promo-text">${esc(b.text)}</p>` : ""}</div>
      <div class="live-cmp-grid" style="${cfg}">${cols.map((c) => `<div class="live-cmp-col">${cell(c)}
        <div class="live-cmp-swatches">${c.swatches.map((s) => `<img src="${esc(s)}" alt="">`).join("")}</div>
        ${c.badge ? `<span class="live-cmp-badge">${esc(c.badge)}</span>` : ""}
        <h3 class="live-cmp-name">${esc(c.name)}</h3><p class="live-cmp-price">${esc(c.price)}</p></div>`).join("")}</div>
      ${keys.map((k) => `<div class="live-cmp-row" style="${cfg}">${cols.map((c) => {
        const f = c.features.find((x) => x.key === k);
        return `<div class="live-cmp-cell">${f ? `${f.glyph}<ul>${f.items.filter(Boolean).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}</div>`;
      }).join("")}</div>`).join("")}
    </section>`;
  };
  const blocksHTML = (data.blocks || []).map((b) => (b.kind === "compare" ? compareHTML(b) : promoHTML(b))).join("");

  const pills = (data.pills || []).map((p) => `<a class="cfg2-pill more-plus" href="${esc(link(p.href))}">${esc(p.text)}</a>`).join("");
  const lines = (data.lines || []).map((l) => `<p class="t-body cfg2-price-line">${esc(l)}</p>`).join("");
  const faq = (data.faq || []).map((f) => `<div class="acc-item">
      <button class="acc-btn" type="button" aria-expanded="false">${esc(f.q)}</button>
      <div class="acc-panel"><div class="acc-panel-inner"><p class="t-body">${esc(f.a)}</p></div></div></div>`).join("");

  const summary = data.summary || {};
  root.dataset.base = String(base);
  // The summary sits at the foot of the right rail, as in the source.
  root.innerHTML = `
    <header class="cfg2-head" data-pbar-after>
      <div class="cfg2-head-main">
        ${data.eyebrow ? `<p class="eyebrow eyebrow-new">${esc(data.eyebrow)}</p>` : ""}
        <h1 class="t-hero">${esc(data.title)}</h1>
        ${lines}
      </div>
      <div class="cfg2-pills">${pills}</div>
    </header>
    <div class="cfg2-wrap">
      <div class="cfg2-layout">
        ${gallery}
        <div class="cfg2-rail" style="padding-top:${data.railOffset || 0}px;min-height:${data.railMin || 0}px">${stepsHTML}
          <section class="summary cfg2-summary" aria-label="Summary">
            <div>${summary.title ? `<h2 class="summary-title">${esc(summary.title)}</h2>` : ""}</div>
            <div>
              ${summary.price ? `<p class="summary-price-label">${esc(summary.price.replace(/\$[\d,.]+$/, "").trim())}</p>` : `<p class="summary-price-label">Total</p>`}
              <p class="summary-price" data-total>${fmt(base)}</p>
              ${summary.monthly ? `<p class="summary-fin">${esc(summary.monthly)}</p>` : ""}
              <button class="btn btn-block" type="button" data-add-to-bag="bag.html" disabled>${esc(summary.cta || "Continue")}</button>
            </div>
          </section>
        </div>
      </div>
      <nav class="cfg2-progress" aria-label="Steps"><div class="cfg2-progress-inner"><ol class="cfg2-dots"></ol></div></nav>
    </div>
    <div class="live-blocks" style="margin-top:${data.blocksLead || 0}px">${blocksHTML}</div>
    ${faq ? `<section class="cfg2-faq" aria-label="Questions"><h2 class="t-section" style="margin-bottom:24px">Frequently asked questions</h2>
      <div class="accordion accordion-compact" data-accordion>${faq}</div></section>` : ""}
    <div class="pbar" data-pbar><div class="pbar-row"><span class="pbar-name">${esc(data.sticky?.name || data.title)}</span>
      <span class="pbar-price"><span data-total>${fmt(base)}</span></span></div></div>`;

  // Legal footnote lines of the source, under the FAQ, with the measured height.
  if (data.footnotes?.lines?.length) {
    root.insertAdjacentHTML("beforeend", `<section class="live-footnotes" style="margin-top:${data.footnotes.lead}px;min-height:${data.footnotes.h}px"><ol>${data.footnotes.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ol></section>`);
  }

  // Hide the demo-only modal and keep the page title in step with the product.
  document.querySelectorAll(".modal").forEach((m) => m.remove());
  if (data.title) document.title = `${data.title} — Demo Store`;
});
