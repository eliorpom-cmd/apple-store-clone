// Carrier offers: the filter pills show every carrier block, or only the one picked.
// Blocks carry data-carrier="a..d"; the pills carry data-filter with the same key, or "all".
(() => {
  const pills = [...document.querySelectorAll("[data-carrier-filter] [role='tab']")];
  const blocks = [...document.querySelectorAll("[data-carrier]")];

  const show = (key) => {
    pills.forEach((pill) => {
      const on = pill.dataset.filter === key;
      pill.setAttribute("aria-selected", on);
      pill.tabIndex = on ? 0 : -1;
    });
    blocks.forEach((block) => {
      block.hidden = key !== "all" && block.dataset.carrier !== key;
    });
  };

  pills.forEach((pill) => pill.addEventListener("click", () => show(pill.dataset.filter)));
  show("all");
})();
