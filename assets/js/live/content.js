// Live renderer for content pages: trade-in, carrier offers, delivery and pickup.
// Data: tools/extractors/content.mjs. Rebuilds <main> from the extracted data; the demo markup is left as is.
Live.register("content", (data, L) => {
  const { esc, link } = L;
  const img = (i, cls = "") => (i && i.src ? `<img src="${esc(i.src)}" alt="${esc(i.alt || "")}"${cls ? ` class="${cls}"` : ""}>` : "");
  const tabId = (prefix, i) => `${prefix}-${i}`;
  const paragraphs = (t) => (t ? `<p class="content-lead">${esc(t)}</p>` : "");

  // Title runs: grey runs stay grey, the others are dark (two-tone titles).
  const runs = (rs) => (rs || []).map((r) => (r.muted ? `<span>${esc(r.text)}</span>` : `<strong>${esc(r.text)}</strong>`)).join(" ");

  // Shared FAQ block: groups with subtitles, each a compact accordion.
  const faqGroups = (groups, heading) => {
    const list = (items) => `<div class="accordion accordion-compact" data-accordion>${items.map((it) => `<div class="acc-item">
      <button class="acc-btn" aria-expanded="false">${esc(it.q)}</button>
      <div class="acc-panel"><div class="acc-panel-inner"><p>${esc(it.a)}</p></div></div></div>`).join("")}</div>`;
    return `<section class="content-band content-band-surface"><div class="container">
      ${heading ? `<h2 class="content-title">${esc(heading)}</h2>` : ""}
      ${groups.map((g) => `<div class="tradein-faq-group">${g.title ? `<h3>${esc(g.title)}</h3>` : ""}${list(g.items)}</div>`).join("")}
    </div></section>`;
  };
  // Carrier and shipping FAQ: one large accordion holding every question.
  // open: the source shows the outer list open on delivery and closed on carrier offers.
  const bigFaq = (groups, open = true, band = "content-band content-band-surface") => {
    const items = groups.flatMap((g) => g.items);
    const title = groups[0]?.title || "";
    return `<section class="${band}"><div class="container">
      <div class="ship-faq accordion" data-accordion><div class="acc-item">
        <button class="acc-btn" aria-expanded="${open}">${esc(title)}</button>
        <div class="acc-panel"><div class="acc-panel-inner"><div class="accordion accordion-compact" data-accordion>
          ${items.map((it, n) => `<div class="acc-item"><button class="acc-btn" aria-expanded="${n === 0}">${esc(it.q)}</button>
          <div class="acc-panel"><div class="acc-panel-inner"><p>${esc(it.a)}</p></div></div></div>`).join("")}
        </div></div></div></div></div></div></section>`;
  };

  // ----- Trade-in -----
  const tradein = () => {
    const h = data.hero;
    const hero = `<header class="content-band content-band-surface content-hero content-hero-tall"><div class="container">
      ${h.eyebrow ? `<p class="content-eyebrow">${esc(h.eyebrow)}</p>` : `<div class="content-lockup" aria-hidden="true"></div>`}
      <h1 class="content-display">${esc(h.title)}</h1>
      ${h.intro ? `<p class="content-intro">${esc(h.intro)}</p>` : ""}</div>
      <div class="container">
        <div class="tabs tradein-tabs" role="tablist" data-tabs aria-label="Device type">
          ${data.value.tabs.map((t, i) => `<button class="tab" role="tab" id="${tabId("tab", i)}" aria-controls="${tabId("tp", i)}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>
            ${t.icon ? `<img class="tradein-tab-icon" src="${esc(t.icon)}" alt="">` : ""}<span>${esc(t.label)}</span></button>`).join("")}
        </div>
        <div class="tradein-panels">
          ${data.value.tabs.map((t, i) => `<div class="tab-panel" role="tabpanel" id="${tabId("tp", i)}" aria-labelledby="${tabId("tab", i)}"${i ? " hidden" : ""}>
            <div class="tradein-card"><div>
              <h2 class="tradein-value-title">${runs(t.title)}</h2>
              ${t.rows.length ? `<div class="tradein-table">
                <div class="tradein-table-head">${t.head.map((c) => `<span>${esc(c)}</span>`).join("")}</div>
                ${t.rows.map((r) => `<div class="tradein-table-row">${r.map((c) => `<span>${esc(c)}</span>`).join("")}</div>`).join("")}</div>` : ""}
              ${t.text ? `<p class="tradein-card-text">${esc(t.text)}</p>` : ""}
              <div class="tradein-card-links">
                ${t.link ? `<a class="more-plus" href="${esc(link(t.link.href))}">${esc(t.link.text)}</a>` : ""}
                ${t.button ? `<a class="btn btn-lg" href="${esc(link(t.button.href))}">${esc(t.button.text || t.button.label || "")}</a>` : ""}
              </div></div>
              <div class="tradein-gamme">${t.images.map((im, n) => img(im, n ? "is-small" : "")).join("")}</div>
            </div></div>`).join("")}
        </div>
        ${data.checkStatus?.link ? `<p class="tradein-status">${esc(data.checkStatus.lead)} <a class="more" href="${esc(link(data.checkStatus.link.href))}">${esc(data.checkStatus.link.text)}</a></p>` : ""}
      </div></header>`;

    const ways = `<section class="content-band content-band-page">
      <div class="container">
        <h2 class="content-title">${esc(data.ways.title)}</h2>
        ${paragraphs(data.ways.intro)}
        <div class="tabs tabs-segmented tradein-switch" role="tablist" data-tabs aria-label="Trade-in method">
          ${data.ways.tabs.map((w, i) => `<button class="tab" role="tab" id="${tabId("tab-way", i)}" aria-controls="${tabId("tp-way", i)}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>${esc(w.label)}</button>`).join("")}
        </div>
        <div class="tradein-panels tradein-panels-steps">
          ${data.ways.tabs.map((w, i) => `<div class="tab-panel" role="tabpanel" id="${tabId("tp-way", i)}" aria-labelledby="${tabId("tab-way", i)}"${i ? " hidden" : ""}>
            ${w.heading ? `<h2 class="content-title tradein-steps-head"><strong>${esc(w.heading)}</strong></h2>` : ""}
            <div class="tradein-steps">${w.steps.map((s) => `<article class="tradein-step">
              <div class="tradein-step-art">${img(s.image)}</div>
              <div class="tradein-step-body"><p class="tradein-step-label">${esc(s.label)}</p>
                <h3 class="tradein-step-title">${esc(s.title)}</h3><p class="tradein-step-text">${esc(s.text)}</p></div></article>`).join("")}</div>
            ${w.qa.length ? `<h2 class="content-title tradein-qa-title"><strong>${esc(w.qaTitle)}</strong></h2>
            <div class="gallery tradein-qa-gallery" data-gallery="qa"><div class="gallery-track">
              ${w.qa.map((q) => `<div class="gallery-slide"><article class="tradein-qa-card">
                <h3 class="tradein-qa-q">${esc(q.question)}</h3>
                <div class="tradein-qa-a"><span class="tradein-qa-avatar">${q.avatar ? `<img src="${esc(q.avatar.src)}" alt="">` : ""}</span>${esc(q.answer)}</div>
              </article></div>`).join("")}
            </div></div>` : ""}
          </div>`).join("")}
        </div>
      </div></section>`;

    const reasons = `<section class="content-band content-band-surface"><div class="container">
      <h2 class="content-display tradein-reasons-title">${esc(data.reasons.title)}</h2>
      ${data.reasons.rows.map((row) => `<div class="tradein-reasons-row${row.length === 3 ? " tradein-reasons-row-3" : ""}">${row.map((c) => !c.image && row.length === 3 ? `<article class="tradein-reason-intro">
        <h3>${esc(c.title)}</h3>${c.text ? `<p>${esc(c.text)}</p>` : ""}
        ${c.link ? `<a class="btn btn-lg" href="${esc(link(c.link.href))}">${esc(c.link.text)}</a>` : ""}</article>` : `<article class="tradein-reason tradein-reason-${c.size}">
        ${c.image ? `<div class="tradein-reason-media">${img(c.image)}</div>` : ""}
        <div class="tradein-reason-body">${c.title ? `<h3>${esc(c.title)}</h3>` : ""}${c.text ? `<p>${esc(c.text)}</p>` : ""}
          ${c.link ? `<a class="more-plus" href="${esc(link(c.link.href))}">${esc(c.link.text)}</a>` : ""}</div></article>`).join("")}</div>`).join("")}
      </div></section>`;

    // The page also lists one all-questions group; the topic groups above already cover it.
    const topics = (data.faq.filter((g) => !/^More questions/.test(g.title)) || []);
    const groups = topics.length ? topics : data.faq;
    // Pills filter the topic groups; "All" shows every group (rendered here, so no page script is needed).
    const pills = `<div class="carrier-filter tabs tabs-pill tradein-faq-filter" role="tablist" aria-label="Filter questions">
      <button class="tab" role="tab" data-faq-filter="all" aria-selected="true">All</button>
      ${groups.map((g, i) => `<button class="tab" role="tab" data-faq-filter="${i}" aria-selected="false" tabindex="-1">${esc(g.title)}</button>`).join("")}</div>`;
    const faqHtml = `<section class="content-band content-band-surface"><div class="container">
      <h2 class="content-title"><strong>More questions? More answers.</strong></h2>${pills}
      ${groups.map((g, i) => `<div class="tradein-faq-group" data-faq-group="${i}">${g.title ? `<h3>${esc(g.title)}</h3>` : ""}
        <div class="accordion accordion-compact" data-accordion>${g.items.map((it) => `<div class="acc-item">
          <button class="acc-btn" aria-expanded="false">${esc(it.q)}</button>
          <div class="acc-panel"><div class="acc-panel-inner"><p>${esc(it.a)}</p></div></div></div>`).join("")}</div></div>`).join("")}
    </div></section>`;
    return { hero, ways, reasons, faq: faqHtml, faqGroups: groups.length };
  };

  // ----- Carrier offers -----
  const carrier = () => {
    const h = data.hero;
    const letters = "abcdefghijklmnop";
    const blocks = data.tabs[0]?.blocks || [];
    const hero = `<header class="content-band content-band-surface content-hero"><div class="container">
      ${img(h.image, "carrier-hero-img")}
      <h1 class="content-display">${esc(h.title)}</h1>
      ${h.intro ? `<p class="content-intro">${esc(h.intro)}</p>` : ""}
      ${h.play ? `<p class="content-note" style="margin-top:24px"><a class="more" href="#">${esc(h.play)}</a></p>` : ""}</div></header>`;
    const pills = data.tabs.map((t, i) => {
      const key = i === 0 ? "all" : letters[i - 1];
      return `<button class="tab" role="tab" data-filter="${key}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>${esc(t.label)}</button>`;
    }).join("");
    const offers = `<section class="content-band content-band-surface carrier-offers-list">
      <div class="container">
        <div class="carrier-filter tabs tabs-pill" role="tablist" aria-label="Filter by carrier" data-carrier-filter>${pills}</div>
        ${blocks.map((b, i) => `<section class="carrier-block" data-carrier="${letters[i]}" aria-label="${esc(b.title)}">
          ${b.logo ? img(b.logo, "carrier-logo") : ""}
          <h2 class="carrier-title">${esc(b.title)}</h2>
          ${b.note ? `<p class="carrier-note">${esc(b.note)}</p>` : ""}
          <div class="carrier-grid">${b.models.map((m) => `<a class="carrier-row" href="#"><span><span class="carrier-row-name">${esc(m.name)}</span><span class="carrier-row-credit">${esc(m.credit)}</span></span><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v8M6 10h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></a>`).join("")}</div>
          ${b.shop ? `<div class="carrier-cta"><a class="btn btn-lg" href="${esc(link(b.shop.href))}">${esc(b.shop.text)}</a></div>` : ""}
        </section>`).join("")}
      </div></section>`;
    const help = `<section class="carrier-help content-band-page"><div class="container">
      <h2 class="content-title"><strong>${esc(data.help.title)}</strong></h2>
      ${paragraphs(data.help.text)}
      ${data.help.cards.map((c) => `<article class="carrier-help-card"><div class="carrier-help-text">
        <h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>
        ${c.link ? `<a class="more" href="${esc(link(c.link.href))}">${esc(c.link.text)}</a>` : ""}</div>${img(c.image)}</article>`).join("")}
      </div></section>`;
    return { hero, offers, help, faq: bigFaq(data.faq, false) };
  };

  // ----- Delivery and pickup -----
  const shipping = () => {
    const h = data.hero;
    const hero = `<header class="content-band content-band-surface content-hero"><div class="container">
      <p class="content-eyebrow">${esc(h.eyebrow)}</p>
      <h1 class="content-display">${esc(h.title)}</h1></div>
      <div class="container"><div class="ship-gamme ship-gamme-single">${img(h.image, "ship-hero-img")}</div></div></header>`;
    const cols = `<section class="content-band content-band-surface" style="padding-top:0"><div class="container"><div class="ship-cols">
      ${data.columns.map((c) => `<div class="ship-col"><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p>
        ${c.link ? `<a class="more" href="${esc(link(c.link.href))}">${esc(c.link.text)}</a>` : ""}</div>`).join("")}
      </div></div></section>`;
    const props = data.props?.cards?.length ? `<section class="content-band content-band-page"><div class="container">
      <h2 class="content-display ship-props-title">${esc(data.props.title)}</h2>
      <div class="ship-props">${data.props.cards.map((c) => `<article class="ship-prop">
        ${c.icon ? `<img class="ship-prop-icon" src="${esc(c.icon)}" alt="">` : ""}
        <h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${c.link ? `<a class="more" href="${esc(link(c.link.href))}">${esc(c.link.text)}</a>` : ""}</article>`).join("")}</div>
      </div></section>` : "";
    return { hero, cols, props, faq: bigFaq(data.faq, true, "ship-faq-band") };
  };

  const main = document.querySelector("main");
  if (!main) return;
  let html;
  if (data.kind === "trade-in") { const t = tradein(); html = t.hero + t.ways + t.reasons + t.faq; }
  else if (data.kind === "carrier") { const c = carrier(); html = c.hero + c.offers + c.help + c.faq; }
  else if (data.kind === "shipping") { const s = shipping(); html = s.hero + s.cols + s.faq + s.props; }
  else return;
  main.innerHTML = html;
  // Topic pills: show one group, or all of them.
  const pills = [...main.querySelectorAll("[data-faq-filter]")];
  const showGroup = (key) => {
    pills.forEach((p) => { const on = p.dataset.faqFilter === key; p.setAttribute("aria-selected", on); p.tabIndex = on ? 0 : -1; });
    main.querySelectorAll("[data-faq-group]").forEach((g) => { g.hidden = key !== "all" && g.dataset.faqGroup !== key; });
  };
  pills.forEach((p) => p.addEventListener("click", () => showGroup(p.dataset.faqFilter)));
});
