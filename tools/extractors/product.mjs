// Product pages (accessory, case, charger) and the gift card page. Runs in the page context: must stay self-contained.
// Returns the visible content the local product renderer needs (assets/js/live/product.js).
export default function extract() {
  // Visible text only: drop screen-reader helpers and footnote markers.
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/‍/g, "").trim();
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  // Largest image inside an element: the best resolution the page has loaded.
  const img = (root) => {
    if (!root) return null;
    const list = [...root.querySelectorAll("img")].filter((i) => i.currentSrc || i.src);
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  // Source wording for a block of text: one entry per visible block, with its tag kind.
  // Keep the innermost text blocks of a panel; ancestors up to the panel root are checked, not the page.
  const blocks = (root) => {
    const inList = (el) => { for (let n = el.parentElement; n && n !== root; n = n.parentElement) if (n.tagName === "LI") return true; return false; };
    return [...root.querySelectorAll("p, li, h3, h4, h5")]
      .filter((el) => !inList(el))
      .filter((el) => !el.querySelector("p, li, h3, h4, h5"))
      .map((el) => ({ t: el.tagName === "LI" ? "li" : /^H/.test(el.tagName) ? "h" : "p", x: txt(el) }))
      .filter((b) => b.x);
  };

  if (document.querySelector("[class*='rf-giftcard']")) return giftcard();
  return product();

  function product() {
    const nav = document.querySelector(".as-localnav");
    const titleLink = nav?.querySelector("a.localnav-title, .as-localnav-title");
    const localnav = nav ? { title: txt(titleLink), href: abs(titleLink?.closest("a")?.getAttribute("href")), browse: txt(nav.querySelector(".as-localnav-browseall-menu-title")) } : null;

    // Options: a select dropdown (size or model) and color swatches.
    const dims = [...document.querySelectorAll(".rf-pdp-dimension select")].map((sel) => ({
      label: txt(document.querySelector(`label[for="${sel.id}"]`)),
      options: [...sel.options].map((o) => ({ text: (o.textContent || "").replace(/\s+/g, " ").trim(), selected: o.selected })),
    }));
    // Radio-tile groups (case size, band size): a title, tiles with an optional small line, and an optional footnote.
    const tiles = [...document.querySelectorAll(".rf-pdp-dimension")].filter((d) => d.querySelector("input.form-selector-input")).map((d) => {
      const foot = d.querySelector(".as-pdp-prodvariation-footer");
      const fl = foot?.querySelector("a");
      return {
        title: txt(d.querySelector(".rf-pdp-dimension-group-header")),
        name: d.querySelector("input.form-selector-input")?.name || "",
        options: [...d.querySelectorAll(".form-selector")].map((o) => ({
          label: txt(o.querySelector(".form-selector-title")),
          sub: txt(o.querySelector(".form-label-small")),
          selected: !!o.querySelector("input:checked"),
          disabled: !!o.querySelector("input:disabled"),
        })),
        footnote: txt(foot?.querySelector("p")),
        link: fl ? { text: txt(fl), href: abs(fl.getAttribute("href")) } : null,
      };
    });
    const colorRoot = document.querySelector(".rf-pdp-colornav");
    const colors = colorRoot ? {
      title: txt(colorRoot.querySelector(".rf-pdp-dimension-group-header")),
      options: [...colorRoot.querySelectorAll(".colornav-item")].map((li) => ({
        label: txt(li.querySelector(".colornav-label")),
        swatch: img(li),
        selected: !!li.querySelector("input:checked"),
        disabled: !!li.querySelector("input:disabled"),
      })),
    } : null;

    // Gallery: one main image per slide (not the thumbnails).
    const gallery = [...document.querySelectorAll("[class~='rf-pdp-inline-gallery-item']")].map((el) => img(el)).filter(Boolean);

    const prices = document.querySelector(".rc-prices");
    const financing = document.querySelector(".rc-financing-message");
    // The financing line is a button that opens an overlay: keep its visible text only.
    const finLink = financing?.querySelector("button, a");

    const save = document.querySelector(".rf-saveditem-content");
    const chat = document.querySelector(".rf-pdp-chat");
    const chatLink = chat?.querySelector("a");

    // Accordions: product information (panels) and compatibility (groups).
    const accordions = [...document.querySelectorAll(".rf-pdp-accordionbox")].map((box) => {
      const btn = box.querySelector("button[aria-expanded]");
      const panels = [];
      box.querySelectorAll(".rc-pdsection-panel").forEach((p) => {
        panels.push({ kind: "panel", title: txt(p.querySelector(".rc-pdsection-title")), blocks: blocks(p.querySelector(".rc-pdsection-mainpanel") || p) });
      });
      box.querySelectorAll(".rf-pdp-compatibility-list").forEach((g) => {
        panels.push({ kind: "group", title: txt(g.querySelector("h3")), items: [...g.querySelectorAll("li")].map((li) => txt(li)).filter(Boolean) });
      });
      return { title: txt(box.querySelector(".rc-accordion-title")), expanded: btn?.getAttribute("aria-expanded") === "true", panels };
    });

    // Cross-sell banner: the platter that holds the big heading (heading class of the source banner).
    const bannerHead = document.querySelector("h2.t-custom-headline");
    const plat = bannerHead?.closest(".platter");
    const plate = bannerHead?.closest(".dd-l-plate") || plat;
    const bigImg = plate ? [...plate.querySelectorAll("img")].filter((i) => i.getBoundingClientRect().width > 200).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] : null;
    const banner = plat ? {
      title: txt(bannerHead),
      text: txt(plat.querySelector("p")),
      // The banner link sits in its own info block and starts with "Shop now"; keep that wording only.
      link: (() => {
        const a = (bannerHead.closest(".dd-info") || plat).querySelector("a");
        return a ? { text: (txt(a).match(/^Shop now/) || [txt(a)])[0], href: abs(a.getAttribute("href")) } : null;
      })(),
      img: bigImg ? { src: bigImg.currentSrc || bigImg.src, alt: bigImg.alt || "" } : null,
    } : null;

    // Recommendations: cards with their own link, price and color swatches.
    const recs = [...document.querySelectorAll(".rf-recommendations-accessory")].slice(0, 12).map((card) => {
      const rel = (card.getAttribute("data-trigger-click") || "").match(/data-relatedlink='([^']+)'/);
      const link = rel ? document.querySelector(`[data-relatedlink="${rel[1]}"]`) : card.querySelector("a");
      return {
        href: abs(link?.getAttribute("href")),
        eyebrow: txt(card.querySelector("[class*='violator']")),
        title: txt(card.querySelector("[class*='accessory-title']")),
        price: txt(card.querySelector("[class*='accessory-price']")),
        img: img(card.querySelector("[class*='accessory-image']")),
        swatches: [...card.querySelectorAll("[class*='swatchescontainer'] img")].map((i) => i.currentSrc || i.src).slice(0, 8),
        moreSwatches: !!card.querySelector("[class*='moretext']"),
      };
    }).filter((c) => c.title);

    return {
      template: "product",
      kind: "pdp",
      localnav,
      badge: txt(document.querySelector(".rf-pdp-badge")),
      // The badge row keeps its height when it is empty.
      hasBadge: !!document.querySelector(".rf-pdp-badge"),
      title: txt(document.querySelector("h1.rf-pdp-title, h1")),
      price: txt(prices?.querySelector(".rc-price")),
      // Monthly line: visible lines after the price, minus the financing line and the footnote marker.
      monthly: (() => {
        if (!prices) return "";
        const lines = prices.innerText.split("\n").map((l) => l.trim()).filter(Boolean);
        const cut = lines.findIndex((l) => l === txt(prices.querySelector(".rc-price")));
        const fin = txt(financing);
        return lines.slice(cut + 1).filter((l) => l !== fin && l !== "months" && l !== "Footnote").join(" ").replace(/\s+\*/g, "*").replace(/\s+/g, " ").trim();
      })(),
      // Instalment as the source shows it: the "or" lead-in, then the monthly amount (hidden helper text dropped).
      monthlyLines: [txt(prices?.querySelector(".rc-prices-acinstallments")), txt(prices?.querySelector(".rc-monthly-price"))].filter(Boolean).map((l) => l.replace(/\s+\*/g, "*")),
      financing: financing ? { text: txt(finLink) || txt(financing) } : null,
      dims,
      tiles,
      colors,
      gallery,
      buy: {
        applePay: txt(document.querySelector("#pdp-options-applePay")),
        addToBag: txt(document.querySelector("#add-to-cart")),
      },
      save: save ? { title: txt(save.querySelector(".rf-saveditem-content-header")), text: txt(save.querySelector(".rf-saveditem-content-description")), link: txt(document.querySelector(".rf-saveditem-button")) } : null,
      help: chat ? { title: txt(chat.querySelector(".as-chat-title")), link: chatLink ? { text: txt(chatLink), href: abs(chatLink.getAttribute("href")) } : null } : null,
      accordions,
      banner,
      recsTitle: txt(document.querySelector(".rf-recommendations-title")),
      recs,
    };
  }

  function giftcard() {
    const root = document.querySelector(".rf-giftcard") || document.body;
    const nav = document.querySelector(".as-localnav");
    const navTitle = nav?.querySelector(".as-localnav-title, a.localnav-title");
    const navLink = [...(nav?.querySelectorAll("a") || [])].find((a) => a !== navTitle);
    // The label element tied to a radio (by id, or wrapping it).
    const labelEl = (input) => (input.id && document.querySelector(`label[for="${input.id}"]`)) || input.closest("label");
    const labelOf = (input) => { const lab = labelEl(input); return txt(lab) || lab?.querySelector("img")?.alt || input.value; };
    const group = (name) => [...document.querySelectorAll(`input[name="${name}"]`)].map((i) => ({
      label: labelOf(i),
      value: i.value,
      selected: i.checked,
      img: img(labelEl(i) || i.parentElement),
    }));
    const findText = (re) => [...document.querySelectorAll("p, span, div, h2, h3")].find((e) => e.childElementCount === 0 && re.test(e.textContent)) || null;
    const amountInputs = [...document.querySelectorAll("input[name='giftcard-amount']")];
    const custom = document.querySelector("input[type='text'], input[type='number']");
    const selectBtn = [...document.querySelectorAll("button")].find((b) => /^Select$/.test(txt(b)));
    const sum = document.querySelector(".rf-giftcard-summary");
    return {
      template: "product",
      kind: "giftcard",
      localnav: nav ? { title: txt(navTitle), link: navLink ? { text: txt(navLink), href: abs(navLink.getAttribute("href")) } : null } : null,
      title: txt(root.querySelector("h1")),
      intro: txt(root.querySelector("h1 + p, p")),
      mainImage: img(root.querySelector(".rf-giftcard-main-image")) || img(root.querySelector(".rf-giftcard-image-preview")) || img(root.querySelector(".rf-giftcard-sticky")),
      typeTitle: txt(root.querySelector(".selection-title")),
      typeNote: txt(root.querySelector(".rf-productselection-dimension-header small")),
      types: group("dimensionGiftCardType"),
      designTitle: txt(findText(/^Choose a design/)),
      designs: group("dimensionGiftCardTheme"),
      amountTitle: txt(root.querySelector(".rf-choose-amount-section-title")),
      amounts: amountInputs.map((i) => ({ label: labelOf(i), value: i.value, selected: i.checked, custom: i.value === "custom" })),
      customLabel: txt(root.querySelector(".form-textbox-label, label.form-textbox-label")) || (custom ? custom.placeholder || "" : ""),
      selectButton: txt(selectBtn),
      save: sum ? { title: txt(sum.querySelector("[class*='saveditem-content-header'], h3, span")), text: txt(sum.querySelector("[class*='saveditem-content-description'], .rf-saveditem-content-description")), link: txt(findText(/^Save for later$/)) } : null,
      help: txt(findText(/Need some help/)) || txt(findText(/1.800.MY.APPLE/)?.parentElement),
      // "Where can I use" band: one row of devices, one row of apps, each item an icon and a label.
      where: (() => {
        const sec = document.querySelector(".dd-gift-cards-pdp-where");
        if (!sec) return null;
        return {
          title: txt(sec.querySelector("h2")),
          rows: [...sec.querySelectorAll("ul")].map((ul) => [...ul.querySelectorAll("li")].map((li) => ({ label: txt(li), img: img(li) })).filter((x) => x.label)).filter((r) => r.length),
        };
      })(),
    };
  }
}
