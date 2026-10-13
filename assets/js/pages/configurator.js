// Configurator page behavior (spec 03). Step locking, prices and the gallery color come from
// assets/js/components.js; this file only adds the replay button of the animated fold demo.
(() => {
  const replay = document.querySelector("[data-fold-replay]");
  if (!replay) return;
  const parts = [...document.querySelectorAll("[data-fold-demo] .pf-right")];

  // Restart the fold cycle: clear the animation, force a reflow, then let the stylesheet apply it again.
  replay.addEventListener("click", () => {
    parts.forEach((el) => {
      el.style.animation = "none";
      void el.getBoundingClientRect();
      el.style.animation = "";
    });
  });
})();
