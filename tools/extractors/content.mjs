// Content pages: trade-in, carrier offers, delivery and pickup. Runs in the page context: must stay self-contained.
// Returns one JSON with a "kind" key; the renderer in assets/js/live/content.js rebuilds <main> from it.
// Tabs and channel switches are clicked in turn so that every panel is rendered before it is read.
export default async function extract() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Visible text only: drop screen-reader helpers and footnote marks.
  const txt = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll(".a11y, .visuallyhidden, [class*='visuallyhidden'], sup, .as-footnote, script, style").forEach((n) => n.remove());
    return (c.textContent || "").replace(/\s+/g, " ").replace(/‍/g, "").trim();
  };
  const abs = (h) => (h ? new URL(h, location.href).href : null);
  const link = (a) => (a ? { text: txt(a), href: abs(a.getAttribute("href")) } : null);
  const img = (root) => {
    if (!root) return null;
    const list = (root.tagName === "IMG" ? [root] : [...root.querySelectorAll("img")]).filter((i) => i.currentSrc || i.src);
    const best = list.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return best ? { src: best.currentSrc || best.src, alt: best.alt || "" } : null;
  };
  // Inline icons are read as data URIs so they can be shown as <img> in the local page.
  const svgUri = (root) => {
    const svg = root?.querySelector("svg");
    if (!svg) return null;
    const s = new XMLSerializer().serializeToString(svg);
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  };
  // Title: the first heading-like element of a block, without its eyebrow.
  const headline = (root) => root?.querySelector("h1, h2, h3, [class*='headline'], [class*='title']");
  // Plain text of a block as list of runs, marking the muted runs (grey spans).
  const runs = (el) => [...(el?.childNodes || [])].map((n) => {
    if (n.nodeType === 3) return { text: n.textContent.replace(/\s+/g, " "), muted: false };
    if (n.nodeType !== 1) return null;
    const t = txt(n);
    return t ? { text: t, muted: /glyph-gray/.test(n.className) && !/dark/.test(n.className) } : null;
  }).filter(Boolean);

  const faqGroups = (root) => {
    const items = (scope) => [...scope.querySelectorAll(":scope > ul > .rc-accordion-item, :scope > .rc-accordion-item, :scope .rc-accordion-item")]
      .filter((li) => !li.querySelector(".rc-accordion-item"))
      .map((li) => ({ q: txt(li.querySelector(".rc-accordion-title, .rc-accordion-button, button")), a: txt(li.querySelector(".rc-accordion-box-content, .rc-accordion-content, [class*='content']")) || txt(li.querySelector(":scope > div")) }))
      .filter((i) => i.q);
    const groups = [...root.querySelectorAll(".rc-accordion")].filter((acc) => !acc.parentElement.closest(".rc-accordion"));
    const all = groups.map((acc) => {
      const section = acc.closest(".group-faq-section, .rf-faqsection-wrapper, .rf-dcm-faq-accordion, .dd-carrier-offers-chat") || acc.parentElement;
      return { title: txt(section?.querySelector(":scope > h2, :scope > .rc-accordion-title, :scope h2")) || txt(acc.previousElementSibling), items: items(acc) };
    }).filter((g) => g.items.length);
    // The page repeats its groups in a tabbed copy: keep the first copy of each group title.
    const titles = new Set();
    return all.filter((g) => !titles.has(g.title) && titles.add(g.title));
  };

  // Run the given clickable tabs in order; read(i) is called after each one is shown.
  const eachTab = async (tabs, read) => {
    const out = [];
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].scrollIntoView({ block: "center" });
      await wait(200);
      tabs[i].click();
      await wait(1200);
      out.push(read(i));
    }
    return out;
  };

  const kind = document.querySelector(".dd-tradein-intro") ? "trade-in"
    : document.querySelector(".dd-carrier-offers-intro") ? "carrier"
    : document.querySelector(".dd-delivery-pickup-header") ? "shipping" : null;
  if (!kind) return { template: "content", kind: null };

  // Tabs must be in view for their panels to render.
  document.querySelector("main")?.scrollIntoView({ block: "start" });
  await wait(300);

  if (kind === "trade-in") {
    const intro = document.querySelector(".dd-tradein-intro");
    const valueTabs = [...document.querySelectorAll(".dd-tradein-value .tabnav-link")];
    const valuePanels = [...document.querySelectorAll(".dd-tradein-value .rf-dcmtab-panel")];
    const tabs = await eachTab(valueTabs, (i) => {
      const p = valuePanels[i];
      const rows = [...(p?.querySelectorAll("table tbody tr") || [])].map((tr) => [...tr.children].map((td) => txt(td)));
      const head = [...(p?.querySelectorAll("table thead th, table thead td") || [])].map((c) => txt(c));
      return {
        label: txt(valueTabs[i]), icon: svgUri(valueTabs[i]),
        title: runs(p?.querySelector("h2, h1")),
        head, rows,
        link: link(p?.querySelector(".dd-link a")),
        button: link(p?.querySelector(".dd-button a, .dd-button button")),
        text: txt(p?.querySelector(".dd-content > p:not(.dd-link):not(.dd-button)")),
        images: [...(p?.querySelectorAll(".dd-image img") || [])].map((i2) => ({ src: i2.currentSrc || i2.src, alt: i2.alt || "" })).filter((i2) => i2.src),
      };
    });
    valueTabs[0]?.click();

    const waysTabs = [...document.querySelectorAll(".dd-tradein-ways .tabnav-link")];
    const waysPanels = [...document.querySelectorAll(".dd-tradein-ways .rf-dcmtab-panel")];
    const ways = await eachTab(waysTabs, (i) => {
      const p = waysPanels[i];
      const steps = [...(p?.querySelectorAll(".dd-grid li") || [])].map((li) => {
        const ps = [...li.querySelectorAll(".dd-details p")];
        return { image: img(li.querySelector(".dd-image")), label: txt(ps[0]), title: txt(ps[1]), text: txt(ps[2]) };
      });
      // Each question appears once per carousel copy: keep the first copy of each question.
      const seen = new Set();
      const qa = [...(p?.querySelectorAll(".dd-qa-card") || [])].map((card) => ({
        question: txt(card.querySelector(".dd-question")),
        answer: txt(card.querySelector(".dd-copy")),
        avatar: img(card.querySelector(".dd-answer .dd-image")),
      })).filter((q) => q.question && !seen.has(q.question) && seen.add(q.question));
      return { label: txt(waysTabs[i]), heading: txt(p?.querySelector(".dd-header")), qaTitle: txt(p?.querySelector(".dd-tradein-qa h2")), steps, qa };
    });
    const waysRoot = document.querySelector(".dd-tradein-ways");
    waysTabs[0]?.click();

    const reasons = document.querySelector(".dd-tradein-reasons");
    const reasonRows = [...(reasons?.querySelectorAll(".dd-grid > ul.row") || [])].map((ul) => [...ul.querySelectorAll(":scope > li")].map((li) => ({
      size: /large-6/.test(li.className) ? 6 : 4,
      image: img(li.querySelector(".dd-image")),
      title: txt(li.querySelector("h3")),
      text: txt(li.querySelector(".t-body, p")),
      link: link(li.querySelector("a")),
    })));

    return {
      template: "content", kind,
      hero: { logo: img(intro?.querySelector("h1")), title: txt(intro?.querySelector("h2")), intro: txt(intro?.querySelector("p")) },
      localNav: { title: txt(document.querySelector(".as-localnav-title")), action: txt(document.querySelector(".as-localnav-action-button")) },
      value: { tabs },
      ways: { title: txt(waysRoot?.querySelector("h2")), intro: txt(waysRoot?.querySelector("p")), tabs: ways },
      reasons: { title: txt(reasons?.querySelector("h2")), rows: reasonRows },
      checkStatus: { lead: txt(document.querySelector(".dd-check-status strong")), link: link(document.querySelector(".dd-check-status a")) },
      faq: faqGroups(document),
    };
  }

  if (kind === "carrier") {
    const intro = document.querySelector(".dd-carrier-offers-intro");
    const pills = [...document.querySelectorAll(".rf-offers-tabsection .tabnav-link")];
    const panels = [...document.querySelectorAll(".rf-offers-tabsection .rf-dcmtab-panel")];
    const tabs = await eachTab(pills, (i) => {
      const p = panels[i];
      const blocks = [...(p?.querySelectorAll(".dd-deals") || [])].map((deals) => {
        const grid = deals.closest(".dd-grid") || deals.parentElement;
        const header = grid?.querySelector(".dd-header");
        return {
          logo: img(header?.querySelector(".dd-logo")) || (svgUri(header?.querySelector(".dd-logo")) ? { src: svgUri(header.querySelector(".dd-logo")), alt: "" } : null),
          title: txt(header?.querySelector("h2, h3, [class*='headline'], [class*='title']")) || txt(header),
          models: [...deals.querySelectorAll("li.dd-models")].map((li) => ({
            name: txt(li.querySelector("button, a")),
            credit: txt(li.querySelector("[class*='carrierprice']")),
            note: txt(li.querySelector("p")),
          })),
          note: txt(header?.querySelector("p")),
          shop: link(grid?.querySelector(".dd-button-shop a")),
        };
      });
      return { label: txt(pills[i]), blocks };
    });
    pills[0]?.click();
    const help = document.querySelector(".dd-carrier-offers-help");
    return {
      template: "content", kind,
      hero: { image: img(intro), title: txt(intro?.querySelector("h1")), intro: txt(intro?.querySelector("p")), play: txt(intro?.querySelector("button")) },
      tabs,
      help: {
        title: txt(help?.querySelector(".dd-intro h2, .dd-intro [class*='headline']")),
        text: txt(help?.querySelector(".dd-intro p")),
        cards: [...(help?.querySelectorAll(".dd-specialist, .dd-setup") || [])].map((c) => ({
          image: img(c.querySelector(".dd-image, .dd-visual") || c), title: txt(headline(c)), text: txt(c.querySelector("p")), link: link(c.querySelector("a")),
        })),
      },
      faq: faqGroups(document),
    };
  }

  // shipping
  const head = document.querySelector(".dd-delivery-pickup-header");
  const props = document.querySelector(".dd-delivery-pickup-value-props");
  return {
    template: "content", kind,
    hero: { eyebrow: txt(head?.querySelector("h1")), title: txt(head?.querySelector("h2")), image: img(head?.querySelector(".dd-image")) },
    columns: [...(head?.querySelectorAll(".dd-info .column") || [])].map((c) => ({
      title: txt(c.querySelector("h3")), text: txt(c.querySelector("p")), link: link(c.querySelector("a")),
    })),
    props: {
      title: txt(props?.querySelector("h2")),
      cards: [...(props?.querySelectorAll(".dd-content") || [])].map((c) => ({
        icon: svgUri(c.querySelector(".dd-image")), title: txt(c.querySelector("h3")), text: txt(c.querySelector("p.t-body")), link: link(c.querySelector("a")),
      })),
    },
    faq: faqGroups(document),
  };
}
