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
  // A lease line starts a new price block (10 px gap on the source).
  const priceLines = (text) => (text || "").split("|").filter(Boolean).map((l) => `<span class="option-price-line${/^Lease /.test(l) ? " option-price-lease" : ""}">${esc(l)}</span>`).join("");
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
    if (o.po) {
      const icon = o.subIcon?.src ? `<img class="option-sub-icon" src="${esc(o.subIcon.src)}" alt="">` : "";
      const detail = o.bullets?.length ? bulletsHTML(o) : o.detail ? `<span class="option-detail">${esc(o.detail)}</span>` : "";
      return `<label class="option option-rich option-po">${input}<span class="option-label"><span class="option-name">${esc(o.name)}</span>${o.sub ? `<span class="option-sub">${icon}${esc(o.sub)}</span>` : ""}${detail}</span></label>`;
    }
    if (o.rich) {
      return `<label class="option option-rich">${input}<span class="option-label">
        <span class="option-top"><span class="option-title">${o.tag ? `<span class="option-tag">${esc(o.tag)}</span>` : ""}<span class="option-name">${o.icon ? `<span class="option-icon" aria-hidden="true">${o.icon}</span>` : ""}${esc(o.name)}</span>${o.sub ? `<span class="option-sub${o.subBlock ? " option-sub-block" : ""}">${esc(o.sub)}</span>` : ""}</span>${price}</span>${bulletsHTML(o)}${o.foot ? `<span class="${o.bullets?.length ? "option-note" : "option-foot"}">${esc(o.foot)}</span>` : ""}</span></label>`;
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
    // Media card: the source keeps its link text visually hidden and shows a play mark over the photo.
    if (media) return `<div class="helpcard helpcard-media${h.side ? " helpcard-side" : ""}">${media}<span class="cfg2-help-play" aria-hidden="true"></span><div class="cfg2-help-body">${text}${h.link ? `<span class="visuallyhidden">${esc(h.link)}</span>` : ""}</div></div>`;
    // Text card: same copy block, with the source's round "+" in the corner (its label is visually hidden).
    return `<div class="helpcard helpcard-text"><span class="more-plus cfg2-help-plus"><span class="visuallyhidden">${esc(h.link || "Show more")}</span></span><div class="cfg2-help-body">${text}</div></div>`;
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
        <div class="cfg2-recon-head"><span class="cfg2-recon-icon" aria-hidden="true"></span><h3>${esc(g.title)}</h3></div>
        ${g.desc ? `<p>${esc(g.desc)}</p>` : ""}${g.footer ? `<p class="cfg2-recon-foot">${esc(g.footer)}</p>` : ""}
      </div>`).join("");
    } else {
      if (s.swatches?.length) {
        body += `${s.swatchHeader ? `<p class="cfg2-sub">${esc(s.swatchHeader)}</p>` : ""}<div class="swatches">${s.swatches.map((o) => swatchHTML(o, name, delta(o))).join("")}</div><p class="swatch-label"></p>`;
      }
      if (s.options?.length) {
        body += `<div class="options">${s.options.map((o) => optionHTML(o, name, delta(o))).join("")}</div>`;
      }
    }
    if (s.select) {
      body += `<label class="select-field"><select name="${name}-select" required><option value="" selected disabled hidden></option>${s.select.options.map((o) => `<option value="${esc(o.value)}">${esc(o.text)}</option>`).join("")}</select><span class="select-field-label">${esc(s.select.label)}</span></label>`;
    }
    if (s.note) body += `<p class="t-note t-muted" style="margin-top:12px">${esc(s.note)}</p>`;
    const foot = s.footer ? `<div class="cfg2-step-foot">${s.footer.title ? `<h3>${esc(s.footer.title)}</h3>` : ""}<ul>${s.footer.images.map((im) => `<li><img src="${esc(im.src)}" alt="${esc(im.alt)}"></li>`).join("")}</ul></div>` : "";
    const help = (s.helpcards || []).map(helpHTML).join("") + foot;
    // Phone pass: the image carousel of this step (shown below 1024 px only).
    const mob = data.mobile?.steps?.[data.steps.indexOf(s)];
    const stepGallery = mob?.slides?.length ? `<div class="cfg2-step-gallery">${mob.caption ? `<p class="cfg2-step-caption">${esc(mob.caption)}</p>` : ""}<div class="gallery" data-gallery="default"><div class="gallery-track">${mob.slides.map((sl) =>
      `<div class="gallery-slide"><img src="${esc(sl.src)}" alt="${esc(sl.alt)}" loading="lazy"></div>`).join("")}</div></div></div>` : "";
    body = stepGallery + body;
    if (!(title || body || help)) return "";
    const box = s.margin ? ` style="margin:${esc(s.margin)}"` : "";
    return `<section class="step" id="live-step-${i}" data-kind="${esc(s.kind)}" data-dot-label="${esc(s.keyword || s.kind)}"${box}>${title}${body}${help}</section>`;
  }).join("");

  const slides = data.slides || [];
  const gallery = slides.length
    ? `<div class="cfg2-gallery"><div class="gallery" data-gallery="${data.kind === "watch" ? "default" : "split"}"><div class="gallery-track">${slides.map((sl) =>
        `<div class="gallery-slide">${sl.caption ? `<p class="gallery-caption">${esc(sl.caption)}</p>` : ""}<img src="${esc(sl.src)}" alt="${esc(sl.alt)}" loading="lazy"></div>`).join("")}</div></div></div>`
    : "";

  const pills = (data.pills || []).map((p) => `<a class="cfg2-pill${p.icon ? " more-plus" : ""}" href="${esc(link(p.href))}">${esc(p.text)}</a>`).join("");
  const lines = (data.lines || []).map((l) => `<p class="t-body cfg2-price-line">${esc(l)}</p>`).join("");
  const faq = (data.faq || []).map((f) => `<div class="acc-item">
      <button class="acc-btn" type="button" aria-expanded="false">${esc(f.q)}</button>
      <div class="acc-panel"><div class="acc-panel-inner"><p class="t-body">${esc(f.a)}</p></div></div></div>`).join("");

  const summary = data.summary || {};
  root.dataset.base = String(base);
  root.dataset.kind = data.kind || "";
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
        <div class="cfg2-rail">${stepsHTML}
          <section class="summary cfg2-summary" aria-label="Summary"${summary.margin ? ` style="margin:${esc(summary.margin)}"` : ""}>
            <div class="cfg2-sum-head"><h2 class="summary-title"><span class="cfg2-sum-ink">${esc(summary.title || "")}</span>${summary.subheader ? ` <span class="cfg2-sum-sub">${esc(summary.subheader)}</span>` : ""}</h2></div>
            <div class="cfg2-sum-body">
              ${(summary.priceBlocks?.length ? summary.priceBlocks : [summary.price || ""]).filter(Boolean).map((b) => `<p class="cfg2-sum-price-block">${esc(b)}</p>`).join("")}
              <span class="visuallyhidden" data-total>${fmt(base)}</span>
              ${summary.cashback ? `<p class="cfg2-sum-cash">${esc(summary.cashback)}</p>` : ""}
              <button class="btn btn-block cfg2-sum-cta" type="button" data-add-to-bag="bag.html" disabled>${esc(summary.cta || "Continue")}</button>
              ${summary.saveTitle ? `<div class="cfg2-sum-save"><h3>${esc(summary.saveTitle)}</h3>${summary.saveText ? `<p>${esc(summary.saveText)}</p>` : ""}<div class="cfg2-sum-links">${(summary.saveLinks || []).map((l) => `<span>${esc(l)}</span>`).join("")}</div></div>` : ""}
            </div>
          </section>
        </div>
      </div>
      <nav class="cfg2-progress" aria-label="Steps"><div class="cfg2-progress-inner"><ol class="cfg2-dots"></ol></div></nav>
    </div>
    ${faq ? `<section class="cfg2-faq" aria-label="Questions"><h2 class="t-section" style="margin-bottom:24px">Frequently asked questions</h2>
      <div class="accordion accordion-compact" data-accordion>${faq}</div></section>` : ""}
    <div class="pbar" data-pbar><div class="pbar-row"><span class="pbar-name">${esc(data.sticky?.name || data.title)}</span>
      <span class="pbar-price"><span data-total>${fmt(base)}</span></span></div></div>`;

  // Hide the demo-only modal and keep the page title in step with the product.
  document.querySelectorAll(".modal").forEach((m) => m.remove());
  if (data.title) document.title = `${data.title} — Demo Store`;
});
