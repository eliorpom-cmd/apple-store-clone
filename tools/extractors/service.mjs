// Service pages: help, bag, sitemap, stores (retail), today, gift cards. Runs in the page context:
// must stay self-contained (no imports, no outer variables). The kind is chosen from the URL path.
export default function extract() {
  // Visible text only: drop screen-reader helpers ("opens in a new window", footnote labels).
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup, script, style").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/‍/g, "").trim();
  };
  const abs = (h) => (h ? new URL(h, location.href).href : "");
  const link = (a) => (a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null);
  // Largest image inside a root element, at its best resolution.
  const img = (root) => {
    if (!root) return null;
    const list = [...root.querySelectorAll("img")].filter((i) => i.currentSrc || i.src);
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  // Local navigation bar: source pages use either the store bar or the today bar.
  const localnav = () => {
    const bar = document.querySelector(".as-localnav");
    const today = document.querySelector("nav.localnav");
    if (bar) {
      return {
        title: txt(bar.querySelector(".localnav-title")),
        links: [...bar.querySelectorAll(".as-localnav-menu-link")].map((a) => ({ ...link(a), current: a.classList.contains("current") })),
        action: link(bar.querySelector(".as-localnav-action a")),
        // Label of the "browse all" menu button, when the bar has one (help).
        menu: txt(bar.querySelector(".as-localnav-browseall-menu-title")) || null,
      };
    }
    if (today) {
      return {
        title: txt(today.querySelector(".localnav-title")),
        links: [...today.querySelectorAll(".localnav-menu-link")].map((a) => link(a)),
        action: null,
      };
    }
    return null;
  };

  const path = location.pathname.replace(/^\/us(?=\/)/, "").replace(/\/$/, "");
  const kind = { "/shop/help": "help", "/shop/bag": "bag", "/shop/browse/sitemap": "sitemap", "/sitemap": "sitemap", "/retail": "stores", "/today": "today", "/shop/gift-cards": "gift" }[path] || "help";
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];

  if (kind === "help") {
    return {
      kind,
      nav: localnav(),
      title: txt(q(".rf-help-headertitle")),
      lead: txt(q(".rf-help-headerdescription")),
      aside: { title: txt(q(".rf-help-yourselftitle")), text: txt(q(".rf-help-yourselfdescription")), link: link(q(".rf-help-orderslink")) },
      categories: qa(".rf-help-categoryitem").map((li) => ({
        title: txt(q(".rf-help-categorytitle", li)),
        // Topic items are plain list entries on the source page, not links.
        items: qa(".rf-help-categoryitemcontainer li", li).map((x) => txt(x)).filter(Boolean),
        more: link(q(".rf-help-learnmore a", li)),
      })),
    };
  }

  if (kind === "bag") {
    const banner = q(".rs-grbanner");
    const bill = q(".dd-billboard");
    const faq = q(".rs-faq .rc-accordion-item");
    const panel = faq && q(".r-height-transition-exit-done", faq);
    return {
      kind,
      nav: localnav(),
      banner: banner ? { text: txt(q(".rs-grbanner-info", banner)), img: img(banner), link: link(q("a", banner)) } : null,
      title: txt(q(".rs-bag-header")),
      message: txt(q(".rs-bagempty-message")),
      buttons: qa(".rs-bagempty-actions a").map((a) => link(a)),
      help: txt(q(".rs-bag-chat-wrapper")),
      spotlight: bill ? {
        title: txt(q(".dd-billboard-header", bill)),
        text: txt(q(".dd-billboard-subcopy", bill)),
        link: link(q(".dd-billboard-link a", bill)),
        img: img(q(".dd-billboard-background", bill)),
      } : null,
      faq: faq ? {
        title: txt(q(".rc-accordion-title", faq)),
        paragraphs: panel ? qa("p, li", panel).map((p) => txt(p)).filter(Boolean) : [],
      } : null,
    };
  }

  if (kind === "sitemap") {
    return {
      kind,
      nav: localnav(),
      title: txt(q("h1")),
      categories: qa("main > section.category").map((sec) => ({
        title: txt(q(":scope > h2", sec)),
        groups: qa(".category-section", sec).map((g) => ({
          title: txt(q("h3", g)),
          links: qa("a", g).map((a) => link(a)),
        })),
      })),
    };
  }

  if (kind === "stores") {
    return {
      kind,
      nav: localnav(),
      title: txt(q("h1.store-search-heading")),
      placeholder: txt(q(".form-textbox-label")),
      complete: link(q(".store-search-section-storelist a")),
      headline: txt(q("h2.headline")),
      stores: qa(".storecard .store-card").map((a) => ({
        href: abs(a.getAttribute("href")),
        name: txt(q(".store-name", a)),
        // Address lines are separate blocks on the source page: keep them apart.
        address: q("address", a) ? q("address", a).innerText.split("\n").map((x) => x.trim()).filter(Boolean) : [],
        hours: txt(q(".search-result-status-current-status", a)),
        img: img(a),
      })),
      programs: qa("section[class*='Programs_programs-section__']").map((s) => ({
        title: txt(q("h2", s)),
        sub: txt(q("p[class*='subheadline']", s)),
        cards: qa("li[class*='Card_program-card__']", s).map((c) => ({
          size: (c.className.match(/card-(wide|small|medium)/) || [, "wide"])[1],
          eyebrow: txt(q("[class*='eyebrow']", c)),
          headline: txt(q("[class*='content__headline']", c)),
          body: txt(q("[class*='body-copy']", c)),
          links: qa("a[class*='cms-link']", c).map((a) => link(a)),
          img: img(c),
        })),
      })),
    };
  }

  if (kind === "today") {
    const bg = q(".hero-background-wrapper");
    const poster = bg && q("video[poster]", bg);
    // The hero is a looping video: its start frame is a CSS background on the figure.
    const frame = bg && q("figure", bg);
    const bgUrl = frame ? (getComputedStyle(frame).backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] : null;
    return {
      kind,
      nav: localnav(),
      hero: {
        title: txt(q(".hero-title")),
        text: txt(q(".hero-description")),
        img: img(bg) || (poster ? { src: abs(poster.getAttribute("poster")), alt: "" } : null) || (bgUrl ? { src: abs(bgUrl), alt: "" } : null),
      },
      location: { text: txt(q(".location-selector__header-description")), button: txt(q(".discover-location-button")) },
      noSession: { text: txt(q(".no-session-section .typography-body")), link: link(q(".no-session-section a")) },
    };
  }

  // Gift cards
  const hero = q(".dd-gift-cards-intro .dd-section");
  const grids = qa("ul.dd-icon-grid");
  const icons = (ul) => qa("li", ul).map((li) => ({ label: txt(q("p", li)), img: img(li) }));
  const row = (el) => el ? {
    heading: txt(q("h2, h3", el)),
    paragraphs: qa("p", el).map((p) => txt(p)).filter(Boolean),
    links: qa("a", el).map((a) => link(a)),
    img: img(el),
  } : null;
  const biz = q(".dd-gift-cards-business");
  return {
    kind,
    nav: localnav(),
    hero: hero ? { title: txt(q("h1", hero)), lead: txt(q("p.t-intro", hero)), button: link(q("a", hero)), img: img(hero) } : null,
    icons: { products: grids[0] ? icons(grids[0]) : [], apps: grids[1] ? icons(grids[1]) : [] },
    ftc: qa(".dd-gift-cards-ftc p").map((p) => ({ text: txt(p), links: qa("a", p).map((a) => link(a)) })),
    account: { title: txt(q(".dd-gift-cards-account h2")), rows: qa(".dd-gift-cards-account .dd-section-one, .dd-gift-cards-account .dd-section-two").map((el) => row(el)) },
    business: biz ? {
      img: img(q(".dd-background", biz)),
      heading: txt(q("h2", biz)),
      paragraphs: qa("p", biz).map((p) => txt(p)).filter(Boolean),
      links: qa("a", biz).map((a) => link(a)),
    } : null,
  };
}
