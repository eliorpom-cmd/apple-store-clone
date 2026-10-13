// Live renderer for product pages (accessory, case, charger) and the gift card page.
// Data: tools/extractors/product.mjs. Runs before shell.js and components.js, so it only writes markup:
// the shared components (configurator, gallery, accordion, scroller) start on their own afterwards.
Live.register("product", (data, L) => {
  const { esc, link } = L;
  const chev = '<svg viewBox="0 0 17 10" aria-hidden="true"><path d="M1.5 1.5l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pin = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const bookmark = '<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M1 1h10v14L6 11 1 15z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  // Localbar, shared by both kinds: section title on the left, one link on the right.
  const localbar = (nav) => nav?.title ? `<nav class="product-localbar" aria-label="Section">
      <div class="product-container product-localbar-row">
        <span class="product-localbar-title">${esc(nav.title)}</span>
        ${nav.link ? `<a class="product-localbar-link" href="${esc(link(nav.link.href))}">${esc(nav.link.text || nav.title)}</a>` : ""}
      </div></nav>` : "";

  // Image family of a product: "MK944" for the navy case, from its gallery and swatch URLs.
  // A color's gallery uses the same suffixes (_AV1, _AV2 ...) with that color's family name.
  const familyOf = (src, re) => { const m = String(src || "").match(re); return m ? m[1] : ""; };
  const galleryBase = () => familyOf(data.gallery?.[0]?.src, /\/is\/([A-Za-z0-9]+)/);
  const variantBase = (o) => familyOf(o.swatch?.src, /\/is\/([A-Za-z0-9]+)_SW_COLOR/);

  // Replace the demo content of <main>; the shell and scripts around it stay as they are.
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = data.kind === "giftcard" ? giftcard() : pdp();
  if (data.kind !== "giftcard") wireThumbs();

  function pdp() {
    // Size and model dropdowns from the source.
    const dims = (data.dims || []).map((d) => `<div class="product-field">
        <label class="product-select"><span class="product-select-label">${esc(d.label)}</span>
          <select class="product-select-input">${d.options.map((o) => `<option${o.selected ? " selected" : ""}>${esc(o.text)}</option>`).join("")}</select>
          <span class="product-select-chevron" aria-hidden="true">${chev}</span></label></div>`).join("");

    // Color swatches: the selected name is written into the group title by the configurator.
    let colors = "";
    if (data.colors?.options?.length) {
      const picked = data.colors.options.find((o) => o.selected) || data.colors.options[0];
      const title = data.colors.title || "";
      const cut = title.indexOf(" - ");
      const prefix = cut >= 0 ? title.slice(0, cut + 3) : "Color – ";
      colors = `<div class="step product-step">
          <h2 class="product-group-title">${esc(prefix)}<span class="swatch-label">${esc(picked.label)}</span></h2>
          <div class="swatches">${data.colors.options.map((o, i) => `<label class="swatch"><input type="radio" name="color" value="${i}"${o.selected ? " checked" : ""}${o.disabled ? " disabled" : ""} aria-label="${esc(o.label)}" data-label="${esc(o.label)}" data-base="${esc(variantBase(o))}"><span class="product-swatch-img" style="--swatch:url('${esc(o.swatch?.src || "")}')"></span></label>`).join("")}</div>
        </div>`;
    }

    const gallery = data.gallery || [];
    const media = gallery.length ? `<div class="product-media">
        <div class="gallery product-gallery product-thumbed" data-gallery data-gallery-base="${esc(galleryBase())}">
          <div class="gallery-track">${gallery.map((g) => `<div class="gallery-slide">${L.img(g)}</div>`).join("")}</div>
        </div>
        <div class="product-thumbs" role="tablist">${gallery.map((g, i) => `<button type="button" class="product-thumb${i ? "" : " is-current"}" aria-label="Image ${i + 1}" data-thumb="${i}"><img src="${esc(g.src)}" alt=""></button>`).join("")}</div>
      </div>` : "";

    const finance = data.financing?.text ? `<p class="product-finance"><button class="more-plus" type="button">${esc(data.financing.text)}</button></p>` : "";
    const buy = `<div class="product-actions">
          ${data.buy?.applePay ? `<button class="btn btn-neutral" type="button">${esc(data.buy.applePay)}</button>` : ""}
          <button class="btn" type="button" data-add-to-bag="bag.html">${esc(data.buy?.addToBag || "Add to Bag")}</button>
        </div>`;
    const save = data.save ? `<div class="product-save">
          <p class="product-save-title">${esc(data.save.title)}</p>
          <p class="product-save-text">${esc(data.save.text)}</p>
          <a class="product-save-link" href="#">${bookmark}${esc(data.save.link)}</a>
        </div>` : "";
    const help = data.help?.link ? `<p class="product-help">${pin}<strong>${esc(data.help.title)}</strong> <a class="more-ext" href="${esc(link(data.help.link.href))}">${esc(data.help.link.text)}</a></p>` : "";

    const info = `<form class="product-info" data-configurator>
        ${data.badge ? `<p class="eyebrow eyebrow-new">${esc(data.badge)}</p>` : ""}
        <h1 class="product-title">${esc(data.title)}</h1>
        <p class="product-price">${esc(data.price)}</p>
        ${data.monthly ? `<p class="product-price-sub">${esc(data.monthly)}</p>` : ""}
        ${finance}
        ${dims}
        ${colors}
        ${buy}
        ${save}
        ${help}
      </form>`;

    // Accordions: product information (panels with a title column) and compatibility (groups).
    const panel = (p) => {
      if (p.kind === "group") {
        return `<div class="product-panel"><h3 class="product-panel-title">${esc(p.title)}</h3>
          <ul class="product-compat">${p.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
      }
      const body = (p.blocks || []).map((b) => b.t === "h" ? `<h4 class="product-subhead">${esc(b.x)}</h4>` : b.t === "li" ? `<ul class="product-list"><li>${esc(b.x)}</li></ul>` : `<p>${esc(b.x)}</p>`).join("");
      return `<div class="product-panel"><h3 class="product-panel-title">${esc(p.title)}</h3><div class="product-panel-body">${body}</div></div>`;
    };
    const accordions = (data.accordions || []).length ? `<section class="product-container product-details" aria-label="Product details">
        <div class="accordion" data-accordion>${data.accordions.map((a) => `<div class="acc-item">
          <button class="acc-btn" aria-expanded="${a.expanded ? "true" : "false"}">${esc(a.title)}</button>
          <div class="acc-panel"><div class="acc-panel-inner product-panels">${a.panels.map(panel).join("")}</div></div></div>`).join("")}</div>
      </section>` : "";

    const recs = (data.recs || []).length ? `<section class="product-recs" aria-labelledby="recs-title">
        <h2 class="product-recs-title" id="recs-title">${esc(data.recsTitle || "")}</h2>
        <div class="scroller" data-scroller><div class="scroller-track">${data.recs.map((c) => `<a class="card pcard product-rec" href="${esc(link(c.href))}">
          ${c.eyebrow ? `<p class="eyebrow${/new|pre-?order/i.test(c.eyebrow) ? " eyebrow-new" : ""}">${esc(c.eyebrow)}</p>` : ""}
          <div class="card-media">${L.img(c.img)}</div>
          ${c.swatches?.length ? `<div class="product-rec-swatches">${c.swatches.map((s) => `<i style="--swatch:url('${esc(s)}')"></i>`).join("")}</div>` : ""}
          <h3 class="t-card product-rec-title">${esc(c.title)}</h3>
          <p class="pcard-price">${esc(c.price)}</p></a>`).join("")}</div></div>
        <div class="product-recs-dots" aria-hidden="true">${data.recs.map((_, i) => `<i${i ? "" : " class=\"is-current\""}></i>`).join("")}</div>
      </section>` : "";
    const legal = (data.legal || []).length ? legalBlock(data.legal) : "";

    // Cross-sell banner under the buy block (grey platter with heading, text, link and image).
    const b = data.banner;
    const banner = b ? `<section class="product-banner"><div class="product-container product-banner-row">
        <div class="product-banner-text"><h2 class="product-banner-title">${esc(b.title)}</h2>
          <p class="product-banner-body">${esc(b.text)}</p>
          ${b.link ? `<a class="more" href="${esc(link(b.link.href))}">${esc(b.link.text)}</a>` : ""}</div>
        ${b.img ? `<div class="product-banner-media">${L.img(b.img)}</div>` : ""}
      </div></section>` : "";

    return `${localbar(data.localnav)}
      <section class="product-container product-main" aria-labelledby="product-name">${info}${media}</section>
      ${banner}
      ${accordions}
      ${recs}
      ${legal}`;
  }

  function giftcard() {
    // Type, design and amount groups; the summary button needs a type and an amount (design is optional).
    const tiles = (name, items, extra = "") => items.map((o) => `<label class="option${extra}"><input type="radio" name="${name}" value="${esc(o.value)}"${o.selected ? " checked" : ""}><span class="option-label"><span class="option-name">${esc(o.label)}</span></span></label>`).join("");
    const designs = (data.designs || []).map((o) => `<label class="option gc-design"><input type="radio" name="design" value="${esc(o.value)}"${o.selected ? " checked" : ""} aria-label="${esc(o.label)}"><span class="option-label">${o.img ? `<img src="${esc(o.img.src)}" alt="">` : ""}</span></label>`).join("");
    const amounts = (data.amounts || []).map((o) => o.custom
      ? `<label class="option"><input type="radio" name="amount" value="other"${o.selected ? " checked" : ""}><span class="option-label"><span class="option-name">${esc(o.label)}</span></span></label>`
      : `<label class="option"><input type="radio" name="amount" value="${esc(o.value)}" data-label="${esc(o.label)}"${o.selected ? " checked" : ""}><span class="option-label"><span class="option-name">${esc(o.label)}</span></span></label>`).join("");
    const navBar = localbar(data.localnav);
    return `${navBar}
      <section class="product-container gc-main" aria-label="Gift card">
        <div class="gc-stage">${data.mainImage ? `<img class="gc-hero" src="${esc(data.mainImage.src)}" alt="${esc(data.mainImage.alt)}">` : ""}</div>
        <form class="gc-form" data-configurator>
          <h1 class="gc-title">${esc(data.title)}</h1>
          <p class="gc-intro">${esc(data.intro)}</p>
          <div class="step product-step">
            <h2 class="product-group-title">${esc(data.typeTitle)}</h2>
            <div class="options options-2 gc-options">${tiles("type", data.types || [])}</div>
          </div>
          <div class="step product-step">
            <h2 class="product-group-title">${esc(data.amountTitle)}</h2>
            <div class="options options-2 gc-options">${amounts}</div>
            <div class="gc-custom">
              <label class="gc-amount"><span class="gc-amount-prefix" aria-hidden="true">$</span>
                <input type="text" inputmode="decimal" name="custom_amount" placeholder="${esc(data.customLabel || "Other Amount")}" aria-label="${esc(data.customLabel || "Other Amount")}" autocomplete="off"></label>
            </div>
          </div>
          <!-- Designs appear once a card type is chosen (data-show-when) and never block the summary button. -->
          <div class="step product-step" data-optional data-show-when='input[name="type"]'>
            <h2 class="product-group-title">${esc(data.designTitle)}</h2>
            <div class="gc-designs">${designs}</div>
          </div>
          <div class="gc-summary">
            <div class="product-actions"><button class="btn" type="button" data-add-to-bag="bag.html">${esc(data.selectButton || "Select")}</button></div>
            ${data.save ? `<div class="product-save">
              <p class="product-save-title">${esc(data.save.title)}</p>
              <p class="product-save-text">${esc(data.save.text)}</p>
              <a class="product-save-link" href="#">${bookmark}${esc(data.save.link)}</a>
            </div>` : ""}
          </div>
          <p class="gc-help">${/need some help/i.test(data.help || "") ? "" : "Need some help? "}${esc(data.help || "")}</p>
        </form>
      </section>
      ${data.where ? `<section class="product-where" aria-labelledby="where-title">
        <h2 class="product-where-title" id="where-title">${esc(data.where.title)}</h2>
        ${data.where.rows.map((row) => `<ul class="product-where-row">${row.map((x) => `<li>${x.img ? `<img src="${esc(x.img.src)}" alt="">` : ""}<span>${esc(x.label)}</span></li>`).join("")}</ul>`).join("")}
      </section>` : ""}
      ${data.legal?.length ? legalBlock(data.legal) : ""}`;
  }

  function legalBlock(paras) {
    return `<section class="product-legal"><div class="product-container">${paras.map((t) => `<p>${esc(t)}</p>`).join("")}</div></section>`;
  }

  // Thumbnails drive the gallery once components.js has created it (DOMContentLoaded runs after all scripts).
  // A color swaps every gallery image to that color's family (same suffixes, other product name).
  function wireThumbs() {
    document.addEventListener("DOMContentLoaded", () => {
      const g = document.querySelector("[data-gallery]");
      const thumbs = [...document.querySelectorAll(".product-thumb")];
      thumbs.forEach((t) => t.addEventListener("click", () => {
        g?.goTo?.(Number(t.dataset.thumb));
        thumbs.forEach((x) => x.classList.toggle("is-current", x === t));
      }));
      const base = g?.dataset.galleryBase;
      const originals = (data.gallery || []).map((x) => x.src);
      document.querySelectorAll("input[name='color'][data-base]").forEach((input) => {
        input.addEventListener("change", () => {
          const family = input.dataset.base;
          if (!base || !family) return;
          // Each image keeps its own size and suffix; only the family name changes.
          const swap = (src) => src.replace("/is/" + base, "/is/" + family);
          g.querySelectorAll(".gallery-slide img").forEach((img, i) => { if (originals[i]) img.src = swap(originals[i]); });
          thumbs.forEach((t, i) => { const im = t.querySelector("img"); if (im && originals[i]) im.src = swap(originals[i].replace(/wid=\d+/, "wid=76").replace(/hei=\d+/, "hei=76")); });
        });
      });
    });
  }
});
