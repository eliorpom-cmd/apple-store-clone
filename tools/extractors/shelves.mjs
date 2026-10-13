// Shelf pages (store home, category pages). Runs in the page context: must stay self-contained.
export default function extract() {
  // Visible text only: drop screen-reader helpers ("opens in a new window", footnote labels).
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/\u200d/g, "").trim();
  };
  const img = (root) => {
    const list = [...root.querySelectorAll("img")].filter((i) => i.currentSrc || i.src);
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
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

  const pnav = [...document.querySelectorAll(".rf-productnav-card")].map((c) => ({ title: txt(c.querySelector("[class*='title']")), href: abs(c.querySelector("a")?.getAttribute("href")), img: img(c) })).filter((p) => p.title);

  const shelves = [...document.querySelectorAll(".rs-cardsshelf")].filter((s) => !s.className.includes("productnav")).map((s) => {
    const main = txt(s.querySelector(".rs-cards-shelf-mainheader"));
    const secondary = txt(s.querySelector(".rs-cards-shelf-secondaryheader"));
    const cards = [...s.querySelectorAll(".rf-ccard, .rf-recommcard, .rf-hcard")].filter((c) => !c.parentElement.closest(".rf-ccard, .rf-recommcard, .rf-hcard")).map((card) => {
      const box = (card.querySelector("[class*='-content']") || card).getBoundingClientRect();
      const cls = card.className + " " + (card.querySelector("[class*='-content']")?.className || "");
      const bg = getComputedStyle(card.querySelector("[class*='-content']") || card).backgroundColor;
      const q = (sel) => txt(card.querySelector(sel));
      return {
        kind: /hcard/.test(cls) ? "product" : /recommcard/.test(cls) ? "recomm" : "card",
        width: width(box.width),
        short: box.height > 0 && box.height < 300,
        dark: /darkbg|bgblack/.test(cls) || bg === "rgb(0, 0, 0)" || bg === "rgb(29, 29, 31)",
        black: /bgblack/.test(cls) || bg === "rgb(0, 0, 0)",
        full: /withfullimg/.test(cls),
        bg,
        eyebrow: q("[class*='eyebrow']"),
        eyebrowNew: !!card.querySelector("[class*='msgtag-orange'], [class*='violator']"),
        title: (() => {
          const el = card.querySelector("[class*='headerlink'], [class*='content-title']") || card.querySelector("[class*='content-header']:not([class*='eyebrow']), [class*='card-title'], h3:not([class*='eyebrow'])");
          if (!el) return "";
          const c = el.cloneNode(true);
          c.querySelectorAll("[class*='eyebrow']").forEach((n) => n.remove());
          return txt(c);
        })(),
        desc: q("[class*='desccontent']") || (card.querySelector("[class*='descprice']") ? "" : q("[class*='content-desc'], [class*='description']")),
        price: q("[class*='descprice'], [class*='content-price'], [class*='scrim-price']"),
        imgFull: !!card.querySelector("img[class*='img-full'], [class*='withfullimg']"),
        cta: q("[class*='cta']"),
        swatches: [...card.querySelectorAll("[class*='swatch'] img, [class*='colorimage']")].map((i) => i.currentSrc || i.src).slice(0, 8),
        href: abs(card.querySelector("a")?.getAttribute("href")),
        img: img(card),
      };
    }).filter((c) => c && (c.title || c.img));
    return { main, secondary, cards };
  }).filter((s) => s.cards.length);

  return { template: "shelves", ribbon, head, tabs, pnav, shelves };
}
