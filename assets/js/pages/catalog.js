// Watch bands filter: hides band tiles and empty collections.
// Each tile carries data-f, a JSON map from dimension index to the option labels it matches.
// Checkboxes are named dim<index> and carry the option label as value.
// Options inside one dimension combine with OR; dimensions combine with AND.
// Used by pages/watch-bands.html (demo and live modes).
(() => {
  const bar = document.querySelector("[data-band-filter]");
  if (!bar) return;

  // Mobile toggle: opens the dimension list under the bar.
  const toggle = bar.querySelector("[data-filter-toggle]");
  toggle.addEventListener("click", () => {
    const open = !bar.classList.contains("is-open");
    bar.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Each dimension title opens its own option list.
  bar.querySelectorAll("[data-dim-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      btn.closest(".cat-dim").classList.toggle("is-open", open);
    });
  });

  const boxes = [...bar.querySelectorAll('input[type="checkbox"]')];
  const tiles = [...document.querySelectorAll("[data-band]")];
  const sections = [...document.querySelectorAll("[data-collection]")];
  const count = bar.querySelector("[data-count]");
  const reset = bar.querySelector("[data-reset]");
  const empty = document.querySelector("[data-empty]");
  const tileMap = tiles.map((t) => { try { return JSON.parse(t.dataset.f || "{}"); } catch { return {}; } });

  // Values checked in one dimension, e.g. "dim0" -> ["40", "48"].
  const checked = (name) => boxes.filter((b) => b.name === name && b.checked).map((b) => b.value);
  const dimNames = [...new Set(boxes.map((b) => b.name))];

  const apply = () => {
    const selected = Object.fromEntries(dimNames.map((n) => [n, checked(n)]));
    const active = dimNames.filter((n) => selected[n].length);
    let shown = 0;

    tiles.forEach((tile, i) => {
      const f = tileMap[i];
      // A tile passes when, in every active dimension, one of its options is selected.
      const ok = active.every((n) => {
        const idx = n.replace(/^dim/, "");
        return (f[idx] || []).some((v) => selected[n].includes(v));
      });
      tile.hidden = !ok;
      if (ok) shown += 1;
    });

    // A collection with no visible band disappears with its header.
    sections.forEach((section) => {
      section.hidden = ![...section.querySelectorAll("[data-band]")].some((t) => !t.hidden);
    });

    count.textContent = `${shown} ${shown === 1 ? "band" : "bands"}`;
    reset.hidden = !active.length;
    if (empty) empty.hidden = shown > 0;
  };

  boxes.forEach((b) => b.addEventListener("change", apply));

  reset.addEventListener("click", () => {
    boxes.forEach((b) => { b.checked = false; });
    apply();
  });

  apply();
})();
