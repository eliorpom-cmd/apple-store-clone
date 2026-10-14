// Configurator page behavior (spec 03). Step locking, prices and the swatch-to-gallery link come from
// assets/js/components.js; this file adds the live-mode gate and the mobile gallery dots.
(() => {
  // ---------- Live mode: the first choice is optional for the chain, so Add to Bag needs it as well ----------
  const gates = [...document.querySelectorAll("[data-gate]")];
  const buttons = [...document.querySelectorAll("[data-add-to-bag]")];
  const syncGate = () => {
    if (!gates.length) return;
    const chosen = gates.every((g) => g.querySelector("input:checked"));
    if (!chosen) buttons.forEach((b) => { b.disabled = true; });
  };
  // Runs after components.js has refreshed the form for the same change event.
  document.addEventListener("change", () => setTimeout(syncGate, 0));
  setTimeout(syncGate, 0);

  // ---------- Live mode: the summary photo follows the chosen finish ----------
  document.addEventListener("change", (e) => {
    const input = e.target.closest?.(".swatch-live input");
    if (!input) return;
    document.querySelectorAll(".cfg-finish-img").forEach((img) => { img.hidden = img.dataset.finish !== input.dataset.finish; });
  });

  // ---------- Mobile gallery: dots move the horizontal scroll and follow it ----------
  const narrow = matchMedia("(max-width: 1023px)");
  document.querySelectorAll("[data-gallery]").forEach((g) => {
    const track = g.querySelector(".gallery-track");
    const dots = [...g.querySelectorAll(".dots button")];
    if (!track || !dots.length) return;
    const slides = [...track.children];
    const current = () => {
      let best = 0;
      slides.forEach((s, k) => { if (Math.abs(s.offsetLeft - track.scrollLeft) < Math.abs(slides[best].offsetLeft - track.scrollLeft)) best = k; });
      return best;
    };
    dots.forEach((d, k) => d.addEventListener("click", () => {
      if (narrow.matches) track.scrollTo({ left: slides[k].offsetLeft, behavior: "smooth" });
    }));
    track.addEventListener("scroll", () => {
      if (!narrow.matches) return;
      const c = current();
      dots.forEach((d, k) => d.setAttribute("aria-current", k === c));
    }, { passive: true });
  });
})();
