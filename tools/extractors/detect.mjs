// Detect which local template fits a source page, from its markup. Runs in the page context.
// Returns { template, file } or { template: null } when no local template matches.
export default function detect() {
  const has = (sel) => !!document.querySelector(sel);
  const path = location.pathname.replace(/^\/us/, "");
  if (has(".rf-wuipselect, [class*='rf-wuipselect']")) return { template: "catalog", file: "pages/watch-bands.html" };
  if (has("[class*='rf-modelselector']")) return { template: "catalog-2", file: "pages/upgrade.html" };
  if (has("[class*='rf-refurb']")) return { template: "catalog-2", file: "pages/refurbished.html" };
  if (has(".rf-po-bfe, [class*='rf-bfe-']")) {
    const file = /buy-mac/.test(path) ? "pages/config-computer.html" : /buy-watch/.test(path) ? "pages/config-watch.html" : /iphone-duo/.test(path) ? "pages/config-phone-duo.html" : "pages/config-phone.html";
    return { template: /buy-mac|buy-watch/.test(path) ? "configurator-2" : "configurator", file };
  }
  if (has("[class*='rf-flagship'], .rc-witb-item")) return { template: "flagship", file: /buy-tv/.test(path) ? "pages/buy-tvbox.html" : /buy-mac/.test(path) ? "pages/buy-display.html" : "pages/buy-earbuds.html" };
  if (has("[class*='rf-giftcard']")) return { template: "product", file: "pages/giftcard.html" };
  if (has("[class*='rf-pdp']")) return { template: "product", file: /case|cover|band|loop/i.test(path) ? "pages/product-case.html" : "pages/product-charger.html" };
  if (has("[class*='rf-accessory'], .rf-producttile, [class*='rf-producttile']")) return { template: "catalog", file: "pages/accessories.html" };
  if (has("[class*='rf-dcm']")) return { template: "content", file: /carrier/.test(path) ? "pages/carrier-offers.html" : /shipping/.test(path) ? "pages/shipping.html" : "pages/trade-in.html" };
  if (has("[class*='rf-help']")) return { template: "service", file: "pages/help.html" };
  if (has(".rs-cardsshelf")) return { template: "shelves", file: path === "/store" ? "index.html" : "pages/buy-phone.html" };
  return { template: null };
}
