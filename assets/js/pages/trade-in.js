// Trade-in: the local bar shows its action button once the hero has scrolled out of view.
// The bar gets .is-stuck when the sentinel above the device tabs leaves the screen.
(() => {
  const bar = document.querySelector("[data-localnav]");
  const hero = document.querySelector(".content-hero");
  if (!bar || !hero || !("IntersectionObserver" in window)) return;
  // Sentinel at the bottom of the hero: the bar is "stuck" once it is out of view.
  new IntersectionObserver(([e]) => bar.classList.toggle("is-stuck", !e.isIntersecting && e.boundingClientRect.top < 0)).observe(hero);
})();
