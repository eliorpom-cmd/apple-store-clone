// Behaviors for the service pages (bag, stores, today). Each block runs only when its markup is present.
(() => {
  const BAG_KEY = "demo-bag-count";
  const UNIT_PRICE = 999; // demo price in dollars, used for the single bag line

  const readCount = () => {
    try { return Number(localStorage.getItem(BAG_KEY) || 0); } catch { return 0; }
  };
  const writeCount = (n) => {
    try { localStorage.setItem(BAG_KEY, String(n)); } catch { /* storage blocked: keep the page usable */ }
  };
  const money = (v) => "$" + v.toFixed(2);

  // ---------- Bag: empty or filled, with a Remove action ----------
  const bagFull = document.querySelector("[data-bag-full]");
  if (bagFull) {
    const bagEmpty = document.querySelector("[data-bag-empty]");
    const badge = document.querySelector(".gnav-badge");

    // Render the view that matches the stored count and refresh the nav badge.
    const render = () => {
      const count = readCount();
      const total = count * UNIT_PRICE;
      bagFull.hidden = count <= 0;
      bagEmpty.hidden = count > 0;
      bagFull.querySelector("[data-bag-qty]").textContent = String(count);
      bagFull.querySelector("[data-bag-line-total]").textContent = money(total);
      bagFull.querySelector("[data-bag-subtotal]").textContent = money(total);
      bagFull.querySelector("[data-bag-total]").textContent = money(total);
      if (badge) {
        badge.textContent = count > 0 ? String(count) : "";
        badge.classList.toggle("has-count", count > 0);
      }
    };

    bagFull.querySelector("[data-bag-remove]").addEventListener("click", () => {
      writeCount(0);
      render();
    });

    render();
  }

  // ---------- Stores: filter the store cards by name or address ----------
  const storeSearch = document.querySelector("[data-store-search]");
  if (storeSearch) {
    const items = [...document.querySelectorAll("[data-store-item]")];
    const empty = document.querySelector("[data-store-empty]");
    storeSearch.addEventListener("input", () => {
      const q = storeSearch.value.trim().toLowerCase();
      let shown = 0;
      items.forEach((el) => {
        const match = !q || el.dataset.storeItem.toLowerCase().includes(q);
        el.hidden = !match;
        if (match) shown += 1;
      });
      if (empty) empty.hidden = shown > 0;
    });
  }

  // ---------- Today: filter session cards by topic ----------
  const filterBar = document.querySelector("[data-today-filters]");
  if (filterBar) {
    const tabs = [...filterBar.querySelectorAll(".tab")];
    const cards = [...document.querySelectorAll("[data-session]")];
    const select = (tab) => {
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      const topic = tab.dataset.filter;
      cards.forEach((card) => {
        card.hidden = topic !== "all" && card.dataset.session !== topic;
      });
    };
    tabs.forEach((tab) => tab.addEventListener("click", () => select(tab)));
  }
})();
