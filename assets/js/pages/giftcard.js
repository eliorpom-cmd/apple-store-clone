// Gift card page: reveals the custom amount field and keeps the card preview and summary in sync with the form.
(() => {
  const form = document.querySelector("[data-giftcard]");
  if (!form) return;

  const card = document.querySelector("[data-gc-card]");
  const cardTo = document.querySelector("[data-gc-to]");
  const cardAmount = document.querySelector("[data-gc-amount]");
  const summaryType = document.querySelector("[data-gc-type-out]");
  const summaryAmount = document.querySelector("[data-gc-amount-out]");
  const custom = form.querySelector("[data-custom-amount]");
  const customInput = custom.querySelector("input");
  const nameInput = form.querySelector("#gc-to-name");

  // Returns the chosen amount as text, or null when no amount is picked yet.
  const amountText = () => {
    const picked = form.querySelector('input[name="amount"]:checked');
    if (!picked) return null;
    if (picked.value !== "other") return picked.dataset.label;
    const typed = customInput.value.trim().replace(/^\$/, "");
    return typed ? "$" + typed : "Other amount";
  };

  const sync = () => {
    const type = form.querySelector('input[name="type"]:checked');
    const amount = amountText();
    const name = nameInput.value.trim();

    // The physical card is drawn dark with a second card behind it.
    card.classList.toggle("is-physical", type?.value === "physical");
    summaryType.textContent = type ? type.dataset.label : "Choose a type";
    summaryAmount.textContent = amount ?? "Choose an amount";
    cardAmount.textContent = amount ?? "–";
    cardTo.textContent = name ? "For " + name : "For the recipient";

    // The custom field is shown only for "Other amount".
    custom.hidden = form.querySelector('input[name="amount"]:checked')?.value !== "other";
  };

  form.addEventListener("change", sync);
  form.addEventListener("input", sync);
  sync();
})();
