// Helpers shared by the live server: global nav extraction and page scrolling (runs against the source page).

// Global nav labels and links, shared by every page (content/live/_nav.json).
export function extractNav() {
  const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  // Top-level links live in .globalnav-submenu-trigger-item; their flyout groups are in the closest .globalnav-item.
  const items = [...document.querySelectorAll(".globalnav-submenu-trigger-item > a.globalnav-link")].map((a) => {
    const li = a.closest(".globalnav-item") || a.parentElement;
    const groups = [...li.querySelectorAll(".globalnav-submenu-group")].map((g) => ({
      title: txt(g.querySelector(".globalnav-submenu-header")),
      links: [...g.querySelectorAll("a.globalnav-submenu-link")].map((l) => [txt(l), l.href]),
    })).filter((g) => g.links.length);
    return { label: txt(a.querySelector(".globalnav-link-text-container") || a), href: a.href, groups };
  });
  const F = "[class*='globalfooter-directory-column']";
  const footer = [...document.querySelectorAll(".as-globalfooter-directory-column, .ac-gf-directory-column")].map((col) =>
    [...col.querySelectorAll(".as-globalfooter-directory-column-section, .ac-gf-directory-column-section")].map((s) => [
      txt(s.querySelector("[class*='section-title-text'], [class*='section-title']")),
      [...s.querySelectorAll("a[class*='section-link']")].map((l) => txt(l)),
    ]));
  const legal = txt(document.querySelector("[class*='legal-copyright']"));
  const shop = txt(document.querySelector("[class*='footer-shop'], [class*='mini-shop']"));
  return { items, footer, legal, shop, _sel: F };
}

export async function scrollThrough(page) {
  // Wheel scrolling triggers the lazy shelves; "networkidle" is never reached on these pages.
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(150); }
  await page.mouse.wheel(0, -100000);
  await page.waitForTimeout(800);
}

