// Store kit — behaviours, wired by data attributes. Load once, after the markup (or with `defer`).
//   data-kit-shelf       shelf arrows: shown when the row can scroll that way, one page per click
//   data-kit-gallery     gallery arrows and dots ("compact" puts the dots in a pill)
//   data-kit-sticky      adds .is-stuck while the element is stuck (local bar rule)
//   data-kit-swatches    writes the checked swatch's value into the next .kit-swatches__label
//   data-kit-accordion   toggles aria-expanded on .kit-accordion__button (the CSS animates the panel)
(() => {
  const chevron = (dir) => `<svg viewBox="0 0 12 20" aria-hidden="true"><path d="${dir === "prev" ? "M10 2L2 10l8 8" : "M2 2l8 8-8 8"}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const arrow = (dir, label) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = `kit-arrow kit-arrow--${dir}`; b.innerHTML = chevron(dir); b.setAttribute("aria-label", label);
    return b;
  };

  // Shelf: one click scrolls by the visible width minus both edges, so the next card lands on the edge.
  document.querySelectorAll("[data-kit-shelf]").forEach((shelf) => {
    const track = shelf.querySelector(".kit-shelf__track");
    if (!track) return;
    const prev = arrow("prev", "Previous"), next = arrow("next", "Next");
    shelf.append(prev, next);
    const page = () => track.clientWidth - 2 * parseFloat(getComputedStyle(track).paddingLeft);
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    prev.addEventListener("click", () => track.scrollBy({ left: -page() }));
    next.addEventListener("click", () => track.scrollBy({ left: page() }));
    track.addEventListener("scroll", update, { passive: true });
    new ResizeObserver(update).observe(track);
  });

  // Gallery: the track moves through --slide-x; arrows and dots follow the current slide.
  document.querySelectorAll("[data-kit-gallery]").forEach((gallery) => {
    const track = gallery.querySelector(".kit-gallery__track");
    const slides = [...track.children];
    const prev = arrow("prev", "Previous image"), next = arrow("next", "Next image");
    const dots = document.createElement("div");
    dots.className = "kit-dots" + (gallery.dataset.kitGallery === "compact" ? " kit-dots--pill" : "");
    dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Image ${i + 1}"></button>`).join("");
    gallery.append(prev, next, dots);
    let current = 0;
    const go = (i) => {
      current = Math.max(0, Math.min(slides.length - 1, i));
      track.style.setProperty("--slide-x", `${-100 * current}%`);
      prev.disabled = current === 0;
      next.disabled = current === slides.length - 1;
      [...dots.children].forEach((d, k) => d.setAttribute("aria-current", k === current));
    };
    prev.addEventListener("click", () => go(current - 1));
    next.addEventListener("click", () => go(current + 1));
    [...dots.children].forEach((d, k) => d.addEventListener("click", () => go(k)));
    gallery.kitGoTo = go;
    go(0);
  });

  // Sticky: a sentinel just above the element leaves the viewport when the element sticks.
  document.querySelectorAll("[data-kit-sticky]").forEach((el) => {
    const sentinel = document.createElement("div");
    el.before(sentinel);
    new IntersectionObserver(([e]) => el.classList.toggle("is-stuck", !e.isIntersecting)).observe(sentinel);
  });

  // Swatches: the label under the row names the checked colour.
  document.querySelectorAll("[data-kit-swatches]").forEach((row) => {
    const label = row.nextElementSibling?.classList.contains("kit-swatches__label") ? row.nextElementSibling : null;
    const sync = () => { const c = row.querySelector("input:checked"); if (label) label.textContent = c ? c.value : ""; };
    row.addEventListener("change", sync);
    sync();
  });

  // Accordion
  document.querySelectorAll("[data-kit-accordion] .kit-accordion__button").forEach((btn) => {
    btn.addEventListener("click", () => btn.setAttribute("aria-expanded", btn.getAttribute("aria-expanded") !== "true"));
  });
})();
