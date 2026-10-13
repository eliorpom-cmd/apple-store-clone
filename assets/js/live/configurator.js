// Live renderer for configurator pages (iPhone, iPad, Vision buy flow). Data: tools/extractors/configurator.mjs.
// Runs before shell.js and components.js: it rebuilds <main> from the extracted data, so the shared
// behaviors ([data-configurator], [data-gallery], [data-accordion], [data-pbar]) attach to the new markup.
Live.register("configurator", (data, L) => {
  const { esc } = L;

  // ---------- Prices (components.js sums the checked data-price of every step) ----------
  // The first step with prices (the model, or storage when there is no model) carries absolute prices.
  // Later steps carry the premium over their cheapest option. Payment options carry no total.
  let absoluteDone = false;
  const priceFor = (step) => {
    if (/paymentOptions/.test(step.key)) return () => 0;
    const prices = step.options.map((o) => o.price).filter((p) => p != null);
    if (!prices.length) return () => 0;
    if (!absoluteDone) {
      absoluteDone = true;
      return (o) => o.price ?? 0;
    }
    const min = Math.min(...prices);
    return (o) => (o.price != null ? o.price - min : 0);
  };

  // ---------- Option cards and swatches ----------
  const option = (o, name, price, checked = false, noPrice = false) => {
    const size = o.title.match(/^(\d[\d.]*)\s*(GB|TB)$/i);
    const body = size
      ? `<span class="option-big">${esc(size[1])}<small>${esc(size[2])}</small></span>`
      : `<span class="option-text"><span class="option-name">${esc(o.title)}</span>${o.sub ? `<span class="option-sub">${esc(o.sub)}</span>` : ""}</span>`;
    // Payment cards show their description, not prices (as in the source).
    const right = o.lines?.length && !noPrice ? `<span class="option-price">${o.lines.map(esc).join("<br>")}</span>` : "";
    const tall = o.lines?.length > 1 ? " cfg-tall" : "";
    return `<label class="option${tall}"><input type="radio" name="${name}" data-price="${price}" data-label="${esc(o.title)}"${checked ? " checked" : ""}><span class="option-label">${body}${right}</span></label>`;
  };

  // Help cards open the source overlay in a new tab; those with a picture show it as a 120 x 125 thumbnail.
  const helpcard = (h) => {
    const inner = `${h.img ? `<span class="helpcard-thumb">${L.img(h.img)}</span>` : ""}<span class="helpcard-text"><strong>${esc(h.title)}</strong>${esc(h.text)}</span><span class="more-plus" aria-hidden="true"></span>`;
    return h.href
      ? `<a class="helpcard${h.img ? " helpcard-img" : ""}" href="${esc(h.href)}" target="_blank" rel="noopener">${inner}</a>`
      : `<button type="button" class="helpcard${h.img ? " helpcard-img" : ""}">${inner}</button>`;
  };
  const helps = (s) => s.helpcards.map(helpcard).join("");

  // Steps that the source lays out full width under the gallery (trade-in, payment, carrier, AppleCare).
  const WIDE = /^(tradein|paymentOptions|carrierModel|applecare)$/;
  // The source opens with the first choice (the model) unlocked but not chosen, so the next step is open.
  // That step is optional for the chain, and a gate on the form keeps Add to Bag off until it is chosen.
  const firstChoice = data.steps[0]?.options.length ? data.steps[0] : null;

  // A step with choices is a .step (it locks until the previous one is complete); the rest are information.
  const step = (s, i, withHelps = true) => {
    const id = `s${i}`;
    const title = `<h2 class="step-title" id="${id}-title">${s.keyword ? `<strong>${esc(s.keyword)}</strong> ` : ""}${esc(s.rest)}<span data-step-choice></span></h2>`;
    const choosable = s.options.length || s.swatches.length;
    if (!choosable) {
      return `<section class="cfg-info" aria-labelledby="${id}-title">${title}${withHelps ? helps(s) : ""}</section>`;
    }
    let body = "";
    if (s.swatches.length) {
      // data-finish is the first word of the finish name, the key of its photo in the summary.
      const sw = s.swatches.map((c) => `<label class="swatch swatch-live"><input type="radio" name="${id}" data-price="0" data-label="${esc(c.label)}" data-finish="${esc((c.label.split(" ")[0] || "").toLowerCase())}" aria-label="${esc(c.label)}"><span>${L.img(c.img)}</span></label>`).join("");
      body += `<div class="swatches" role="radiogroup" aria-labelledby="${id}-title">${sw}</div><p class="swatch-label" aria-live="polite"></p>`;
    }
    if (s.options.length) {
      const priceOf = priceFor(s);
      const wide = WIDE.test(s.key);
      // Wide steps line their cards up in one row; payment and carrier use the 153 px layout.
      const n = s.options.length;
      const row = wide ? (n === 2 ? " options-2" : n === 3 ? " options-3" : n >= 4 ? " options-4" : "") : "";
      const kind = /paymentOptions|carrierModel/.test(s.key) ? " cfg-cards-c" : "";
      body += `<div class="options${row}${kind}">${s.options.map((o) => option(o, id, priceOf(o), false, /paymentOptions/.test(s.key))).join("")}</div>`;
    }
    // Source spacing measured per step: a finish step leaves room below it, and the last rail step is followed by a gap.
    const spacing = s.swatches.length ? " cfg-swatch-step" : "";
    // data-optional needs a value: components.js reads dataset.optional, and "" is falsy.
    const gate = s === firstChoice ? ' data-optional="true" data-gate' : s.optional ? ' data-optional="true"' : "";
    return `<section class="step${spacing}" role="group" aria-labelledby="${id}-title"${gate}>${title}${body}${withHelps ? helps(s) : ""}</section>`;
  };

  // ---------- Gallery: real images, or the video of the first slide ----------
  const slides = data.gallery.map((g) => g.type === "video"
    ? `<div class="gallery-slide"><video class="cfg-live-media cfg-live-video" src="${esc(g.src)}"${g.poster ? ` poster="${esc(g.poster)}"` : ""} autoplay muted loop playsinline></video><button type="button" class="fold-replay" aria-label="Replay video" onclick="const v=this.previousElementSibling;v.currentTime=0;v.play()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19.5 4.5v4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>`
    : `<div class="gallery-slide"><img class="cfg-live-media" src="${esc(g.src)}" alt="${esc(g.alt || "")}" loading="lazy"></div>`).join("");

  // ---------- Header ----------
  const h = data.head;
  const header = `<header class="cfg-head" data-pbar-after><div class="cfg-head-main">
      ${h.eyebrow ? `<p class="cfg-eyebrow">${esc(h.eyebrow)}</p>` : ""}
      <h1 class="cfg-title">${esc(h.title)}</h1>
      ${h.intro ? `<p class="cfg-intro">${esc(h.intro)}</p>` : ""}
      <div class="cfg-price">${h.price.map((l) => `<p>${esc(l)}</p>`).join("")}</div>
    </div>
    <div class="cfg-pills">${h.pills.map((p) => p.href
      ? `<a class="cfg-pill" href="${esc(p.href)}" target="_blank" rel="noopener">${esc(p.text)}</a>`
      : `<button type="button" class="cfg-pill">${esc(p.text)}</button>`).join("")}</div>
  </header>`;

  // ---------- Steps, summary, in the box, FAQ ----------
  const rail = [], wide = [];
  data.steps.forEach((s, i) => {
    if (WIDE.test(s.key) || !(s.options.length || s.swatches.length)) {
      wide.push(`<div class="cfg-wide-step">${step(s, i, false)}</div><div class="cfg-wide-aside">${helps(s)}</div>`);
    } else {
      rail.push(step(s, i));
    }
  });


  const sum = data.summary;
  // The summary shows the photo of the chosen finish; the first one is shown until a finish is chosen.
  const finishPhotos = (sum.finishImages || []).map((f, k) => `<img class="cfg-finish-img" data-finish="${esc(f.color)}" src="${esc(f.src)}" alt="" loading="lazy"${k === 0 && !sum.image ? "" : " hidden"}>`).join("");
  const summaryMedia = sum.image || finishPhotos ? `<div class="cfg-summary-media">${sum.image ? `<img class="cfg-finish-img" src="${esc(sum.image.src)}" alt="${esc(sum.image.alt || "")}" loading="lazy">` : ""}${finishPhotos}</div>` : "";
  const summary = `<section class="summary cfg-summary"><div><h2 class="summary-title">${esc(sum.title)}</h2>${summaryMedia}</div>
    <div><p class="summary-price-label">Total</p><p class="summary-price" data-total>$0</p>
    <p class="summary-fin">or <span data-monthly>$0</span>/mo. for 24 mo.</p>
    <button type="button" class="btn btn-lg btn-block" data-add-to-bag="bag.html" disabled>${esc(sum.button || "Continue")}</button></div></section>`;

  const witb = data.witb?.items?.length ? `<section class="cfg-box"><h2 class="step-title"><strong>${esc(data.witb.title)}</strong></h2>
    <ul class="cfg-box-list cfg-box-live">${data.witb.items.map((i) => `<li>${L.img(i.img)}<span class="cfg-box-name">${esc(i.label)}</span></li>`).join("")}</ul></section>` : "";

  const faq = data.faq?.items?.length ? `<section class="cfg-faq"><h2 class="cfg-faq-title">${esc(data.faq.title)}</h2>
    <div class="accordion accordion-compact" data-accordion>${data.faq.items.map((it, k) => `<div class="acc-item">
      <button class="acc-btn" aria-expanded="${k === 0}" aria-controls="faq-${k}">${esc(it.q)}</button>
      <div class="acc-panel" id="faq-${k}"><div class="acc-panel-inner"><p>${esc(it.a)}</p></div></div></div>`).join("")}</div></section>` : "";

  // ---------- Shell ribbon, product bar, page ----------
  const nav = document.querySelector('[data-shell="nav"]');
  if (nav && data.ribbon?.items?.length) nav.dataset.ribbon = data.ribbon.items.map(esc).join("||");

  // Demo-only parts go: the demo modals and product bar belong to the fictional content.
  document.querySelectorAll(".modal, .pbar").forEach((el) => el.remove());
  const main = document.querySelector("main");
  main.insertAdjacentHTML("beforebegin", `<div class="pbar" data-pbar><div class="pbar-row"><span class="pbar-name">${esc(h.title)}</span><span class="pbar-price"><span data-total>$0</span><small>Your total</small></span></div></div>`);
  main.innerHTML = `<div class="cfg-wrap">${header}
    <div class="cfg-grid" data-configurator>
      <div class="cfg-stage"><div class="gallery cfg-gallery" data-gallery><div class="gallery-track">${slides}</div></div></div>
      <div class="cfg-rail">${rail.join("").replace(/(<section class="step)(?![\s\S]*<section class="step)/, '$1 cfg-rail-end')}</div>
      ${wide.join("")}
    </div>
    ${summary}${witb}${faq}</div>`;
  document.title = `${h.title} — Demo Store`;
});
