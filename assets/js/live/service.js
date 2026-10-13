// Live renderer for service pages (help, bag, sitemap, stores, today, gift cards).
// Data: tools/extractors/service.mjs. Rebuilds <main> from the extracted source content, using the
// service classes of assets/css/pages/service.css. Runs before shell.js and components.js.
Live.register("service", (data, L) => {
  const main = document.querySelector("main");
  if (!main) return;
  const { esc, link } = L;
  // Image helper: source images are rendered as <img>, never as SVG.
  const img = (i, cls) => (i && i.src ? L.img(i, `class="${cls}"`) : "");
  const linkEl = (l, cls = "more") => (l && l.text ? `<a class="${cls}" href="${esc(link(l.href))}">${esc(l.text)}</a>` : "");
  const navBar = (nav) => {
    if (!nav) return "";
    const links = (nav.links || []).map((l) => `<a href="${esc(link(l.href))}"${l.current ? ' aria-current="page"' : ""}>${esc(l.text)}</a>`).join("");
    const action = nav.action && nav.action.text ? `<a class="svc-pill-link" href="${esc(link(nav.action.href))}">${esc(nav.action.text)}</a>` : "";
    const menu = nav.menu ? `<span class="svc-localnav-menu">${esc(nav.menu)}</span>` : "";
    return `<div class="svc-localnav"><div class="container svc-localnav-inner">
      <p class="svc-localnav-title">${esc(nav.title)}</p>
      <nav class="svc-localnav-links" aria-label="Section">${links}${menu}${action}</nav></div></div>`;
  };

  const render = {
    // Help: header, then one block per topic with its items and "Learn more" link.
    help() {
      // Topics fold on phones (details/summary) and stay open on wider screens.
      const open = window.matchMedia("(min-width: 735px)").matches ? " open" : "";
      const cats = (data.categories || []).map((c) => `
        <li class="help-category">
          <details class="help-detail"${open}>
            <summary class="help-category-title">${esc(c.title)}</summary>
            <ul class="help-links">${(c.items || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            ${linkEl(c.more, "more help-learnmore")}
          </details>
        </li>`).join("");
      return `${navBar(data.nav)}
      <div class="container">
        <header class="help-header">
          <div class="help-header-main">
            <h1 class="help-title">${esc(data.title)}</h1>
            <p class="help-lead">${esc(data.lead)}</p>
          </div>
          <aside class="help-aside">
            <h2>${esc(data.aside?.title)}</h2>
            <p>${esc(data.aside?.text)}</p>
            ${linkEl(data.aside?.link, "more")}
          </aside>
        </header>
        <ul class="help-categories">${cats}</ul>
      </div>`;
    },

    // Bag (empty): optional banner, heading, message, buttons, help line, spotlight, one accordion.
    bag() {
      const banner = data.banner ? `<div class="container"><div class="bag-banner">
          ${img(data.banner.img, "bag-banner-img")}
          <p class="bag-banner-text">${esc(data.banner.text)}</p>
          ${linkEl(data.banner.link)}
        </div></div>` : "";
      const buttons = (data.buttons || []).map((b, i) => `<a class="svc-btn ${i ? "svc-btn-outline" : "svc-btn-primary"}" href="${esc(link(b.href))}">${esc(b.text)}</a>`).join("");
      const spot = data.spotlight ? `<section class="bag-spotlight"><div class="container bag-spotlight-inner">
          <div class="bag-spotlight-info">
            <h2>${esc(data.spotlight.title)}</h2>
            <p>${esc(data.spotlight.text)}</p>
            ${linkEl(data.spotlight.link)}
          </div>
        </div>${img(data.spotlight.img, "bag-spotlight-img")}</section>` : "";
      const faq = data.faq ? `<section class="svc-faq" data-accordion><div class="container">
          <div class="acc-item">
            <button class="acc-btn" type="button" aria-expanded="false">${esc(data.faq.title)}</button>
            <div class="acc-panel"><div class="acc-panel-inner">${(data.faq.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div></div>
          </div>
        </div></section>` : "";
      return `${banner}
      <div class="container bag-main">
        <section class="bag-empty">
          <h1 class="bag-title">${esc(data.title)}</h1>
          <p class="bag-text">${esc(data.message)}</p>
          <div class="bag-actions">${buttons}</div>
        </section>
      </div>
      <div class="bag-help"><div class="container bag-help-inner">${esc(data.help)}</div></div>
      ${spot}
      ${faq}`;
    },

    // Site map: one section per category, with its groups of links in three columns.
    sitemap() {
      const cats = (data.categories || []).map((c) => `
        <section class="sitemap-cat">
          ${c.title ? `<h2 class="sitemap-cat-title">${esc(c.title)}</h2>` : ""}
          <div class="sitemap-cols">${(c.groups || []).map((g) => `
            <div class="sitemap-group">
              <h3 class="sitemap-group-title">${esc(g.title)}</h3>
              ${(g.links || []).map((a) => `<a href="${esc(link(a.href))}">${esc(a.text)}</a>`).join("")}
            </div>`).join("")}</div>
        </section>`).join("");
      return `<div class="container sitemap-main">
        <h1 class="sitemap-title">${esc(data.title)}</h1>
        ${cats}
      </div>`;
    },

    // Stores: search, store cards (photos), then the program sections.
    stores() {
      const cards = (data.stores || []).map((s) => {
        const addr = (s.address || []).map((x) => esc(x)).join("<br>");
        return `<a class="svc-store" href="${esc(link(s.href))}" data-store-item="${esc([s.name, ...(s.address || [])].join(" "))}">
          ${img(s.img, "svc-store-img")}
          <div class="svc-store-body">
            <h3 class="svc-store-name">${esc(s.name)}</h3>
            <p class="svc-store-address">${addr}</p>
            <p class="svc-store-hours">${esc(s.hours)}</p>
          </div></a>`;
      }).join("");
      const programs = (data.programs || []).map((p) => `
        <section class="stores-program-section${(p.cards || [])[0]?.size === "medium" ? " stores-program-section-medium" : ""}">
          <div class="stores-program-head">
            <h2>${esc(p.title)}</h2>
            ${p.sub ? `<p>${esc(p.sub)}</p>` : ""}
          </div>
          <ul class="stores-program-grid">${(p.cards || []).map((c) => `
            <li class="stores-program stores-program-${esc(c.size)}">
              <div class="stores-program-copy">
                ${c.eyebrow ? `<p class="stores-program-eyebrow">${esc(c.eyebrow)}</p>` : ""}
                <h3 class="stores-program-headline">${esc(c.headline)}</h3>
                ${c.body ? `<p class="stores-program-body">${esc(c.body)}</p>` : ""}
                ${(c.links || []).map((l) => (l.href ? linkEl(l) : `<button type="button" class="more-plus stores-program-plus">${esc(l.text)}</button>`)).join("")}
              </div>
              ${img(c.img, "stores-program-img")}
            </li>`).join("")}</ul>
        </section>`).join("");
      // Promo ribbon under the search row (full width, as on the source page).
      const ribbon = data.ribbon && data.ribbon.text ? `<div class="stores-ribbon"><p>${esc(data.ribbon.text)}${data.ribbon.link ? ` <a href="${esc(link(data.ribbon.link.href))}">${esc(data.ribbon.link.text)}</a>` : ""}</p></div>` : "";
      return `<div class="container">
        <div class="stores-search">
          <h1 class="svc-visually-hidden">${esc(data.title)}</h1>
          <p class="stores-label">${esc(data.title)}</p>
          <div class="stores-field">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
            <input type="search" aria-label="${esc(data.placeholder)}" placeholder="${esc(data.placeholder)}" data-store-search>
          </div>
          ${linkEl(data.complete, "more stores-complete")}
        </div>
        ${ribbon}
        <div class="stores-results">
          <h2 class="stores-heading">${esc(data.headline)}</h2>
          <div class="stores-list scroller" data-scroller><div class="scroller-track">${cards}</div></div>
          <p class="svc-empty stores-empty" data-store-empty hidden>No stores match that search.</p>
        </div>
        ${programs}
      </div>`;
    },

    // Today: hero with the start frame, location line, and the no-session message.
    today() {
      return `${navBar(data.nav)}
      <section class="today-hero">
        ${data.hero?.video
          ? `<video class="today-hero-img" src="${esc(data.hero.video)}"${data.hero.img ? ` poster="${esc(data.hero.img.src)}"` : ""} autoplay muted loop playsinline aria-hidden="true"></video>`
          : img(data.hero?.img, "today-hero-img")}
        <div class="container today-hero-inner">
          <p class="today-hero-title">${esc(data.hero?.title)}</p>
          <p>${esc(data.hero?.text)}</p>
        </div>
      </section>
      <div class="container">
        <div class="today-intro">
          <h1 class="svc-visually-hidden">${esc(data.hero?.title)}</h1>
          <p>${esc(data.location?.text)}</p>
          <a class="more" href="#">${esc(data.location?.button)}</a>
        </div>
        <section class="today-nosession">
          <p>${esc(data.noSession?.text)}</p>
          ${linkEl(data.noSession?.link)}
        </section>
      </div>`;
    },

    // Gift cards: hero with the card image, icon rows, footnote, account rows and business block.
    gift() {
      const icons = (list, cls) => (list || []).length ? `<ul class="gift-icon-grid ${cls}">${list.map((x) => `
        <li>${img(x.img, "gift-icon-img")}<span>${esc(x.label)}</span></li>`).join("")}</ul>` : "";
      const rows = (data.account?.rows || []).map((r, i) => `
        <div class="gift-row${i % 2 ? " is-reversed" : ""}">
          <div class="gift-row-info">
            ${r.heading ? `<h3>${esc(r.heading)}</h3>` : ""}
            ${(r.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}
            ${(r.links || []).map((l) => linkEl(l)).join("")}
          </div>
          ${img(r.img, "gift-row-img")}
        </div>`).join("");
      const biz = data.business ? `<section class="gift-business">
          ${img(data.business.img, "gift-business-img")}
          <div class="gift-business-info">
            <h2>${esc(data.business.heading)}</h2>
            ${(data.business.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}
            ${(data.business.links || []).map((l) => linkEl(l)).join("")}
          </div>
        </section>` : "";
      return `${navBar(data.nav)}
      <div class="container">
        <section class="gift-hero">
          <h1>${esc(data.hero?.title)}</h1>
          ${data.hero?.button ? `<a class="svc-btn svc-btn-primary" href="${esc(link(data.hero.button.href))}">${esc(data.hero.button.text)}</a>` : ""}
          ${img(data.hero?.img, "gift-hero-img")}
          <p class="gift-lead">${esc(data.hero?.lead)}</p>
        </section>
        ${icons(data.icons?.products, "is-products")}
        ${icons(data.icons?.apps, "is-apps")}
        <section class="gift-ftc">${(data.ftc || []).map((p) => `<p>${esc(p.text)}</p>`).join("")}</section>
        <section class="gift-account">
          <h2>${esc(data.account?.title)}</h2>
          ${rows}
        </section>
        ${biz}
      </div>`;
    },
  };

  const fn = render[data.kind] || render.help;
  main.innerHTML = fn();
});
