// Extras for the configurator pages (PearBook Pro, Pear Watch Ultra). Load after components.js.
//   [data-gallery="compact"]  moves arrows and dots into one pill under the image
//   [data-gallery="split"]    same row, but each arrow is its own circle beside the dot pill
//   .cfg2-dots               one dot per .step; hidden steps hide their dot; the current step is stretched
(() => {
  // ---------- Compact gallery: arrows and dots in one pill; split: one row, arrows apart from the dots ----------
  document.querySelectorAll('[data-gallery="compact"], [data-gallery="split"]').forEach((g) => {
    const prev = g.querySelector(":scope > .paddle-prev");
    const next = g.querySelector(":scope > .paddle-next");
    const dots = g.querySelector(":scope > .dots");
    if (!prev || !next || !dots) return;
    const pill = document.createElement("div");
    pill.className = g.dataset.gallery === "split" ? "gallery-ctrl" : "gallery-pill";
    // Event listeners stay on the moved elements, so the gallery keeps working.
    pill.append(prev, dots, next);
    g.append(pill);
  });

  // ---------- Vertical progress indicator ----------
  const form = document.querySelector("[data-configurator]");
  const list = document.querySelector(".cfg2-dots");
  if (!form || !list) return;

  const steps = [...form.querySelectorAll(".step")];
  const items = steps.map((step, i) => {
    if (!step.id) step.id = "step-" + (i + 1);
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + step.id;
    // Label: an explicit data-dot-label, else the keyword of the step title.
    const label = step.dataset.dotLabel || step.querySelector(".step-title strong")?.textContent.replace(/\.$/, "") || "Step " + (i + 1);
    a.setAttribute("aria-label", label);
    a.title = label;
    li.append(a);
    list.append(li);
    return { step, li, a };
  });

  // Hidden steps (for example band size before a band is picked) hide their dot too.
  // components.js updates the steps on change first, so this listener runs after it.
  const syncHidden = () => items.forEach(({ step, li }) => { li.hidden = step.hidden; });

  // Active step: the first visible step in the reading band near the middle of the viewport.
  const visible = new Set();
  const mark = (step) => items.forEach((it) => {
    if (it.step === step) it.a.setAttribute("aria-current", "step");
    else it.a.removeAttribute("aria-current");
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    const current = steps.find((s) => visible.has(s) && !s.hidden);
    if (current) mark(current);
  }, { rootMargin: "-40% 0px -55% 0px" });
  steps.forEach((s) => io.observe(s));

  form.addEventListener("change", syncHidden);
  syncHidden();
  mark(steps.find((s) => !s.hidden) || steps[0]);
})();
