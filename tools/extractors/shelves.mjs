// Shelf pages (store home, category pages). Runs in the page context: must stay self-contained.
export default async function extract() {
  // Lazy images enter the DOM only while their card is in view and are removed again when it leaves,
  // so each card is read right after it is scrolled into view (see the shelves loop below).
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/\u200d/g, "").trim();
  };
  // Swatch thumbnails are never product media: they live in colour lists.
  const SWATCH = "[class*='swatch'], [class*='colorimage']";
  const usable = (i) => (i.currentSrc || i.src) && !i.closest(SWATCH) && i.getBoundingClientRect().width > 20;
  const pick = (imgs) => imgs.filter(usable).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
  const imgOut = (i) => (i ? { src: i.currentSrc || i.src, alt: i.alt || "" } : null);
  // Media of one card, by container in priority order. Each kind has its own container, so a logo or
  // decorative image elsewhere in the card cannot be picked by mistake.
  const IMG_SELECTORS = ["img[class*='img-full']", "[class*='img-full'] img", "[class*='content-img'] img", "[class*='img-wrapper'] img", "[class*='media-wrapper'] img", "picture img"];
  const mediaOf = (card, abs) => {
    const v = card.querySelector("video");
    if (v) {
      const src = v.querySelector("source")?.getAttribute("src") || v.currentSrc || v.src;
      return { type: "video", src: abs(src), poster: abs(v.getAttribute("poster")), alt: v.getAttribute("aria-label") || "" };
    }
    const svg = card.querySelector("[class*='content-icon'] svg");
    if (svg) {
      const c = svg.cloneNode(true);
      c.removeAttribute("class");
      c.setAttribute("aria-hidden", "true");
      return { type: "icon", svg: c.outerHTML, color: getComputedStyle(svg).color };
    }
    for (const sel of IMG_SELECTORS) {
      const i = pick([...card.querySelectorAll(sel)]);
      if (i) return { type: "image", ...imgOut(i) };
    }
    const any = pick([...card.querySelectorAll("img")]);
    return any ? { type: "image", ...imgOut(any) } : null;
  };
  // "full": the image covers the card and the text sits on it; "below": the image is a block under the text.
  const mediaMode = (card, media) => {
    if (!media || media.type !== "image") return media?.type === "video" ? "full" : null;
    const el = [...card.querySelectorAll("img")].find((i) => (i.currentSrc || i.src) === media.src);
    if (!el) return "below";
    const c = card.getBoundingClientRect().height, m = el.getBoundingClientRect().height;
    return m > c * 0.8 ? "full" : "below";
  };
  const swatchesOf = (card) => [...card.querySelectorAll("[class*='swatchescontainer'] img, [class*='swatchescontainer'] [class*='colorimage'] img")]
    .map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || "" })).filter((s) => s.src).slice(0, 8);

  const width = (w) => [230, 313, 400, 480, 646, 980].reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
  const abs = (h) => (h ? new URL(h, location.href).href : null);

  const ribbon = [...document.querySelectorAll(".rc-ribbon .rc-ribbon-content-item, .rc-ribbon [class*='ribbon-content'] p")].map((el) => {
    const a = el.querySelector("a");
    const c = el.cloneNode(true);
    c.querySelectorAll("a").forEach((n) => n.remove());
    return { text: txt(c), link: a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null };
  }).filter((r) => r.text).slice(0, 4);

  const head = {
    title: txt(document.querySelector("h1")),
    subtitle: txt(document.querySelector(".rs-shop-subheader")),
    links: [...document.querySelectorAll(".rs-shop-neareststore a, .rs-shop-header-section a")].map((a) => ({ text: txt(a), href: abs(a.getAttribute("href")) })).filter((l) => l.text).slice(0, 3),
  };

  const tabs = [...document.querySelectorAll(".rf-navbar-item a")].map((a) => ({ text: txt(a), href: abs(a.getAttribute("href")), active: a.className.includes("active") }));

  const pnav = [...document.querySelectorAll(".rf-productnav-card")].map((c) => ({ title: txt(c.querySelector("[class*='title']")), href: abs(c.querySelector("a")?.getAttribute("href")), img: imgOut(pick([...c.querySelectorAll("img")])) })).filter((p) => p.title);

  // Title as light HTML: text, <strong> and <span> where the colour differs from the title's own colour.
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rich = (node, base) => {
    if (node.nodeType === 3) return esc(node.textContent);
    if (node.nodeType !== 1) return "";
    if (/^(SUP|SCRIPT|STYLE)$/.test(node.tagName) || node.matches(".visuallyhidden, [class*='visuallyhidden'], .a11y, [class*='eyebrow']")) return "";
    const inner = [...node.childNodes].map((n) => rich(n, base)).join("");
    if (node.tagName === "BR") return "<br>";
    if (node.tagName === "STRONG" || node.tagName === "B") return `<strong>${inner}</strong>`;
    const color = getComputedStyle(node).color;
    if (node.tagName === "SPAN" && color !== base) return `<span style="color:${color}">${inner}</span>`;
    return inner;
  };
  // Reads one card: called only while the card is in view.
  const readCard = (card) => {
    const box = card.getBoundingClientRect();
    const cls = card.className + " " + (card.querySelector("[class*='-content']")?.className || "");
    const bg = getComputedStyle(card.querySelector("[class*='-content']") || card).backgroundColor;
    const q = (sel) => txt(card.querySelector(sel));
    const media = mediaOf(card, abs);
    return {
      kind: /hcard/.test(cls) ? "product" : /recommcard/.test(cls) ? "recomm" : "card",
      width: width(box.width),
      short: box.height > 0 && box.height < 300,
      dark: /darkbg|bgblack/.test(cls) || bg === "rgb(0, 0, 0)" || bg === "rgb(29, 29, 31)",
      black: /bgblack/.test(cls) || bg === "rgb(0, 0, 0)",
      mode: mediaMode(card, media),
      bg,
      eyebrow: q("[class*='eyebrow']"),
      eyebrowNew: !!card.querySelector("[class*='msgtag-orange'], [class*='violator']"),
      titleHtml: (() => {
        const el = card.querySelector("[class*='headerlink'], [class*='content-title']") || card.querySelector("[class*='content-header']:not([class*='eyebrow']), [class*='card-title'], h3:not([class*='eyebrow'])");
        return el ? rich(el, getComputedStyle(el).color).trim() : "";
      })(),
      title: (() => {
        const el = card.querySelector("[class*='headerlink'], [class*='content-title']") || card.querySelector("[class*='content-header']:not([class*='eyebrow']), [class*='card-title'], h3:not([class*='eyebrow'])");
        if (!el) return "";
        const c = el.cloneNode(true);
        c.querySelectorAll("[class*='eyebrow']").forEach((n) => n.remove());
        return txt(c);
      })(),
      desc: q("[class*='desccontent']") || (card.querySelector("[class*='descprice']") ? "" : q("[class*='content-desc'], [class*='description']")),
      price: q("[class*='descprice'], [class*='content-price'], [class*='scrim-price']"),
      cta: q("[class*='cta']"),
      swatches: swatchesOf(card),
      href: abs(card.querySelector("a")?.getAttribute("href")),
      media,
    };
    };
  const shelves = [];
  for (const s of document.querySelectorAll(".rs-cardsshelf")) {
    if (s.className.includes("productnav")) continue;
    const cards = [];
    let col = -1, lastItem = null;
    for (const card of s.querySelectorAll(".rf-ccard, .rf-recommcard, .rf-hcard")) {
      if (card.parentElement.closest(".rf-ccard, .rf-recommcard, .rf-hcard")) continue;
      if (!card.getBoundingClientRect().width) continue;
      card.scrollIntoView({ block: "center", inline: "center" });
      await wait(200);
      // Cards sharing one scroller item stack in a column (the short cards of a grid row).
      const item = card.closest("[data-core-scroller-item]");
      if (item !== lastItem) { col++; lastItem = item; }
      cards.push({ ...readCard(card), col });
    }
    if (cards.length) {
      shelves.push({
        main: txt(s.querySelector(".rs-cards-shelf-mainheader")),
        secondary: txt(s.querySelector(".rs-cards-shelf-secondaryheader")),
        cards,
      });
    }
  }
  window.scrollTo(0, 0);

  // Quick links under the rows: a title and pill links.
  const ql = document.querySelector("[class*='rs-quicklinks']");
  const quick = ql ? {
    title: txt(ql.querySelector("h2, h3, [class*='title']")),
    links: [...ql.querySelectorAll("a")].map((a) => ({ text: txt(a), href: abs(a.getAttribute("href")) })).filter((l) => l.text).slice(0, 8),
  } : null;

  // Footnotes: the legal notes of the page, kept as HTML (links only, no attributes but href).
  const footnotes = [...document.querySelectorAll(".rc-footnotelist li")].map((li) => {
    const c = li.cloneNode(true);
    c.querySelectorAll(".visuallyhidden, [class*='visuallyhidden'], .a11y, style, script").forEach((n) => n.remove());
    c.querySelectorAll("a").forEach((a) => { const h = abs(a.getAttribute("href")); [...a.attributes].forEach((at) => a.removeAttribute(at.name)); if (h) a.setAttribute("href", h); });
    c.querySelectorAll("*").forEach((n) => { if (!["A", "P", "SPAN", "SUP", "BR", "STRONG", "EM"].includes(n.tagName)) n.replaceWith(...n.childNodes); else if (n.tagName !== "A") [...n.attributes].forEach((at) => n.removeAttribute(at.name)); });
    return c.innerHTML.replace(/\s+/g, " ").trim();
  }).filter(Boolean);

  return { template: "shelves", ribbon, head, tabs, pnav, shelves, quick, footnotes };
}
