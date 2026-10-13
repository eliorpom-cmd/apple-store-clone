// Upgrade page: the model scrollers measure their paddles when the script runs.
// Tab panels after the first start hidden, so their paddles would stay disabled.
// Dispatching a resize after each tab change makes every scroller re-measure.
(() => {
  document.querySelectorAll("[data-tabs]").forEach((list) => {
    // Bubbling runs after components.js has already switched the panel.
    const remeasure = () => window.dispatchEvent(new Event("resize"));
    list.addEventListener("click", remeasure);
    list.addEventListener("keydown", remeasure);
  });
})();
