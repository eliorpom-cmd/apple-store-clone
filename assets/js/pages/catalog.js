// Watch bands filter: hides band tiles and empty collections.
// Options inside one dimension combine with OR; the two dimensions combine with AND.
// Used by pages/watch-bands.html only.
(() => {
  const bar = document.querySelector("[data-band-filter]");
  if (!bar) return;

  // Mobile toggle first: it works in demo and live mode.
  const toggle = bar.querySelector("[data-filter-toggle]");
  toggle.addEventListener("click", () => {
    const open = !bar.classList.contains("is-open");
    bar.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Live mode renders static dimension labels (no checkboxes): nothing to filter.
  const boxes = [...bar.querySelectorAll('input[type="checkbox"]')];
  if (!boxes.length) return;

  const tiles = [...document.querySelectorAll("[data-band]")];
  const sections = [...document.querySelectorAll("[data-collection]")];
  const count = bar.querySelector("[data-count]");
  const reset = bar.querySelector("[data-reset]");
  const empty = document.querySelector("[data-empty]");

  // Values checked in one dimension, e.g. "size" -> ["40", "48"].
  const checked = (name) => boxes.filter((b) => b.name === name && b.checked).map((b) => b.value);

  const apply = () => {
    const sizes = checked("size");
    const types = checked("type");
    let shown = 0;

    tiles.forEach((tile) => {
      const okSize = !sizes.length || tile.dataset.sizes.split(" ").some((s) => sizes.includes(s));
      const okType = !types.length || types.includes(tile.dataset.type);
      tile.hidden = !(okSize && okType);
      if (!tile.hidden) shown += 1;
    });

    // A collection with no visible band disappears with its header.
    sections.forEach((section) => {
      section.hidden = ![...section.querySelectorAll("[data-band]")].some((t) => !t.hidden);
    });

    count.textContent = `${shown} ${shown === 1 ? "band" : "bands"}`;
    reset.hidden = !(sizes.length || types.length);
    if (empty) empty.hidden = shown > 0;
  };

  boxes.forEach((b) => b.addEventListener("change", apply));

  reset.addEventListener("click", () => {
    boxes.forEach((b) => { b.checked = false; });
    apply();
  });

  apply();
})();
