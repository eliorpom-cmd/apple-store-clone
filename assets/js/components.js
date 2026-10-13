// Shared behaviors, attached by data attributes. Include once per page after shell.js.
//   data-scroller        horizontal card row with prev/next paddles
//   data-modal-open="id" opens <div class="modal" id="id">
//   data-accordion       accordion container (.acc-btn + .acc-panel)
//   data-tabs            tablist; buttons have aria-controls pointing to .tab-panel
//   data-gallery         slide gallery with paddles and dots
//   data-catbar          sticky category bar that gets .is-stuck
//   data-pbar            product sticky bar shown after scrolling past [data-pbar-after]
//   data-configurator    step lock/unlock, swatch labels, price summary
(() => {
  const CHEV = (d) => `<svg viewBox="0 0 12 20" aria-hidden="true"><path d="${d === "prev" ? "M10 2L2 10l8 8" : "M2 2l8 8-8 8"}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const CHEV_DOWN = '<svg viewBox="0 0 17 10" aria-hidden="true"><path d="M1.5 1.5l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- Scroller ----------
  document.querySelectorAll("[data-scroller]").forEach((root) => {
    const track = root.querySelector(".scroller-track");
    if (!track) return;
    const prev = Object.assign(document.createElement("button"), { className: "paddle paddle-prev", innerHTML: CHEV("prev") });
    const next = Object.assign(document.createElement("button"), { className: "paddle paddle-next", innerHTML: CHEV("next") });
    prev.setAttribute("aria-label", "Previous"); next.setAttribute("aria-label", "Next");
    root.append(prev, next);
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    // One click moves by the visible width minus the left edge, so the next card lands on the edge.
    const page = () => track.clientWidth - parseFloat(getComputedStyle(track).paddingLeft) * 2;
    prev.addEventListener("click", () => track.scrollBy({ left: -page() }));
    next.addEventListener("click", () => track.scrollBy({ left: page() }));
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
  });

  // ---------- Modal ----------
  const openModal = (m) => {
    if (!m.querySelector(".modal-cover")) {
      m.insertAdjacentHTML("afterbegin", '<div class="modal-cover"></div>');
      const panel = m.querySelector(".modal-panel");
      panel.insertAdjacentHTML("afterbegin", `<button class="modal-close" aria-label="Close"><span>${CLOSE}</span></button>`);
      m.querySelector(".modal-cover").addEventListener("click", () => closeModal(m));
      m.querySelector(".modal-close").addEventListener("click", () => closeModal(m));
      m.addEventListener("click", (e) => { if (e.target === m) closeModal(m); });
    }
    m.classList.add("is-open");
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
    document.documentElement.classList.add("modal-open");
    m.querySelector(".modal-close").focus({ preventScroll: true });
  };
  const closeModal = (m) => { m.classList.remove("is-open"); document.documentElement.classList.remove("modal-open"); };
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-modal-open]");
    if (!t) return;
    const m = document.getElementById(t.dataset.modalOpen);
    if (m) { e.preventDefault(); openModal(m); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal.is-open").forEach(closeModal); });
  window.DemoModal = { open: openModal, close: closeModal };

  // ---------- Accordion ----------
  document.querySelectorAll("[data-accordion] .acc-btn").forEach((btn) => {
    if (!btn.querySelector("svg")) btn.insertAdjacentHTML("beforeend", CHEV_DOWN);
    const panel = btn.closest(".acc-item").querySelector(".acc-panel");
    const set = (open, animate = true) => {
      btn.setAttribute("aria-expanded", open);
      if (!animate) { panel.style.height = open ? "auto" : "0px"; return; }
      const from = panel.offsetHeight;
      panel.style.height = "auto";
      const to = open ? panel.offsetHeight : 0;
      panel.style.height = from + "px";
      requestAnimationFrame(() => { panel.style.height = to + "px"; });
      if (open) panel.addEventListener("transitionend", () => { if (btn.getAttribute("aria-expanded") === "true") panel.style.height = "auto"; }, { once: true });
    };
    set(btn.getAttribute("aria-expanded") === "true", false);
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  });

  // ---------- Tabs ----------
  document.querySelectorAll("[data-tabs]").forEach((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab) => tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute("aria-controls"));
      if (p) p.hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n); }
      });
    });
    select(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
  });

  // ---------- Gallery ----------
  document.querySelectorAll("[data-gallery]").forEach((g) => {
    const track = g.querySelector(".gallery-track");
    const slides = [...track.children];
    let i = 0;
    const prev = Object.assign(document.createElement("button"), { className: "paddle paddle-prev", innerHTML: CHEV("prev") });
    const next = Object.assign(document.createElement("button"), { className: "paddle paddle-next", innerHTML: CHEV("next") });
    prev.setAttribute("aria-label", "Previous image"); next.setAttribute("aria-label", "Next image");
    const dots = document.createElement("div");
    dots.className = "dots" + (g.dataset.gallery === "compact" ? " dots-compact" : "");
    dots.innerHTML = slides.map((_, n) => `<button aria-label="Image ${n + 1}"></button>`).join("");
    g.append(prev, next, dots);
    const go = (n) => {
      i = Math.max(0, Math.min(slides.length - 1, n));
      track.style.transform = `translateX(${-100 * i}%)`;
      prev.disabled = i === 0; next.disabled = i === slides.length - 1;
      [...dots.children].forEach((d, k) => d.setAttribute("aria-current", k === i));
    };
    prev.addEventListener("click", () => go(i - 1));
    next.addEventListener("click", () => go(i + 1));
    [...dots.children].forEach((d, k) => d.addEventListener("click", () => go(k)));
    g.goTo = go;
    go(0);
  });


  // ---------- Autoplay carousel with timed dotnav ----------
  // <div class="autoplay" data-autoplay><div class="autoplay-viewport"><div class="autoplay-track">
  //   <div class="autoplay-slide">…</div>…</div></div></div>  (controls are added here)
  document.querySelectorAll("[data-autoplay]").forEach((root) => {
    const track = root.querySelector(".autoplay-track");
    const slides = [...track.children];
    const ctrls = document.createElement("div");
    ctrls.className = "dotnav-controls";
    ctrls.innerHTML = `<div class="dotnav-bubble"><div class="dotnav-list">${slides.map((_, i) => `<button style="--i:${i}" aria-label="Item ${i + 1}"></button>`).join("")}</div></div>
      <button class="dotnav-play" aria-label="Pause"><svg class="i-pause" viewBox="0 0 18 18"><rect x="4" y="3" width="3.4" height="12" rx="1.2" fill="currentColor"/><rect x="10.6" y="3" width="3.4" height="12" rx="1.2" fill="currentColor"/></svg><svg class="i-play" viewBox="0 0 18 18"><path d="M5 3.2v11.6c0 .7.8 1.1 1.4.7l8.4-5.8a.85.85 0 0 0 0-1.4L6.4 2.5C5.8 2.1 5 2.5 5 3.2z" fill="currentColor"/></svg></button>`;
    root.append(ctrls);
    const dots = [...ctrls.querySelectorAll(".dotnav-list button")];
    let i = 0;
    const go = (n) => {
      if (ctrls.classList.contains("is-in") && n !== 0) ctrls.classList.add("is-running");
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(${-100 * i}%)`;
      dots.forEach((d, k) => {
        d.setAttribute("aria-current", k === i);
        // Restart the fill animation on the new current dot.
        if (k === i) { d.style.animation = "none"; void d.offsetWidth; d.style.animation = ""; }
      });
    };
    dots.forEach((d, k) => d.addEventListener("click", () => go(k)));
    // Advance when the current dot finishes filling.
    dots.forEach((d) => d.addEventListener("animationend", (e) => { if (e.animationName === "dot-fill" && !root.classList.contains("is-paused")) go(i + 1); }));
    const play = ctrls.querySelector(".dotnav-play");
    play.addEventListener("click", () => {
      const paused = root.classList.toggle("is-paused");
      play.setAttribute("aria-label", paused ? "Play" : "Pause");
    });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) root.classList.add("is-paused");
    // Controls make their entrance when the carousel scrolls into view.
    new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { ctrls.classList.add("is-in"); obs.disconnect(); } }, { threshold: .4 }).observe(root);
    go(0);
  });

  // ---------- Sticky category bar ----------
  document.querySelectorAll("[data-catbar]").forEach((bar) => {
    const sentinel = document.createElement("div");
    bar.before(sentinel);
    new IntersectionObserver(([e]) => bar.classList.toggle("is-stuck", !e.isIntersecting)).observe(sentinel);
  });

  // ---------- Product sticky bar ----------
  const pbar = document.querySelector("[data-pbar]");
  const after = document.querySelector("[data-pbar-after]");
  if (pbar && after) {
    new IntersectionObserver(([e]) => pbar.classList.toggle("is-on", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(after);
  }

  // ---------- Configurator ----------
  // Steps are .step elements in order; a step unlocks once every radio group in the previous step has a value.
  // Inputs may carry data-price (number) and data-label; data-gallery-slide moves the gallery.
  document.querySelectorAll("[data-configurator]").forEach((form) => {
    const steps = [...form.querySelectorAll(".step")];
    const fmt = (n) => "$" + n.toLocaleString("en-US");
    const gallery = document.querySelector("[data-gallery]");
    const refresh = () => {
      let open = true, total = Number(form.dataset.base || 0), complete = true;
      steps.forEach((s) => {
        if (s.dataset.showWhen) s.hidden = !form.querySelector(s.dataset.showWhen + ":checked");
        if (s.hidden) return;
        s.classList.toggle("is-locked", !open);
        const groups = [...new Set([...s.querySelectorAll("input[type=radio]")].map((r) => r.name))];
        const done = groups.every((n) => form.querySelector(`input[name="${n}"]:checked`));
        if (!s.dataset.optional && !done) { open = false; complete = false; }
        s.querySelectorAll("input:checked").forEach((r) => { total += Number(r.dataset.price || 0); });
        const label = s.querySelector("[data-step-choice]");
        const chosen = s.querySelector("input:checked[data-label]");
        if (label) label.textContent = chosen ? " – " + chosen.dataset.label : "";
      });
      document.querySelectorAll("[data-total]").forEach((el) => { el.textContent = fmt(total); });
      document.querySelectorAll("[data-monthly]").forEach((el) => { el.textContent = fmt(Math.round(total / 24 * 100) / 100); });
      document.querySelectorAll("[data-add-to-bag]").forEach((b) => { b.disabled = !complete; });
    };
    form.addEventListener("change", (e) => {
      const r = e.target;
      if (r.matches(".swatch input")) {
        const out = r.closest(".step").querySelector(".swatch-label");
        if (out) out.textContent = r.dataset.label || "";
        document.querySelectorAll("[data-product-color]").forEach((el) => el.style.setProperty("--product-color", r.dataset.color));
      }
      if (r.dataset.gallerySlide && gallery?.goTo) gallery.goTo(Number(r.dataset.gallerySlide));
      refresh();
    });
    document.querySelectorAll("[data-add-to-bag]").forEach((b) => b.addEventListener("click", () => {
      try { localStorage.setItem("demo-bag-count", Number(localStorage.getItem("demo-bag-count") || 0) + 1); } catch {}
      location.href = b.dataset.addToBag;
    }));
    refresh();
  });
})();
