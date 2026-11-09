(() => {
  "use strict";

  const BTN_ID = "diff-viewer-open-btn";

  // Chosen viewer (targets.js); loaded before injecting, refreshed on change.
  let target = DiffTargets.resolve();

  // The PR title <h1> carries the PR number, so we can find it without relying
  // on hashed class names. (Compare pages have no stable anchor — handled in
  // the background worker via the menu/toolbar instead.)
  function prNumberLabel() {
    const m = location.pathname.match(/\/pull\/(\d+)/);
    return m ? "#" + m[1] : null;
  }

  function findPrTitle(needle) {
    for (const h of document.querySelectorAll("h1")) {
      if ((h.textContent ?? "").includes(needle)) return h;
    }
    return null;
  }

  function buildButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    const img = document.createElement("img");
    img.alt = "";
    img.width = 16;
    img.height = 16;
    img.style.display = "block";
    btn.appendChild(img);
    applyTarget(btn);

    // Icon-only, sized like GitHub's small icon buttons.
    Object.assign(btn.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "28px",
      height: "28px",
      padding: "0",
      marginLeft: "8px",
      boxSizing: "border-box",
      borderRadius: "6px",
      border:
        "1px solid var(--button-default-borderColor-rest, var(--borderColor-default, rgba(31,35,40,0.15)))",
      background: "var(--button-default-bgColor-rest, var(--color-btn-bg, #f6f8fa))",
      cursor: "pointer",
      // The baseline of an inline-flex box holding only an <img> is the image's
      // bottom (8px below the button's center). Raise that so the center sits
      // at the title's cap-height middle (~0.35em above the text baseline).
      verticalAlign: "calc(0.35em - 8px)",
    });

    return btn;
  }

  function applyTarget(btn) {
    btn.title = `Open in ${target.name}`;
    btn.setAttribute("aria-label", btn.title);
    btn.querySelector("img").src = "data:image/svg+xml," + encodeURIComponent(target.icon);
  }

  function tryInject() {
    const needle = prNumberLabel();
    if (!needle || document.getElementById(BTN_ID)) return;
    const title = findPrTitle(needle);
    if (!title) return;
    // Newer GitHub renders the visible "#123" as a sibling after the <h1>; go
    // after it so the button doesn't split the title from its number.
    const suffix = title.nextElementSibling;
    const anchor = suffix?.textContent.includes(needle) ? suffix : title;
    const btn = buildButton();
    anchor.appendChild(btn);
  }

  async function refreshTarget() {
    target = await DiffTargets.load();
    const btn = document.getElementById(BTN_ID);
    if (btn) applyTarget(btn);
  }

  chrome.storage.onChanged.addListener(refreshTarget);

  // Delegated, not on the button: Turbo restores pages from cloned snapshots
  // (Back/Forward), and a clone keeps the button but loses its own listeners.
  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element) || !e.target.closest("#" + BTN_ID)) return;
    e.preventDefault();
    e.stopPropagation();
    const url = DiffTargets.urlFor(target, location.href);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });

  // Inject only once the stored choice is known, so the button never shows
  // (or opens) the default viewer for a user who picked another.
  refreshTarget().then(() => {
    new MutationObserver(() => {
      if (!document.getElementById(BTN_ID)) tryInject();
    }).observe(document.documentElement, { childList: true, subtree: true });

    // GitHub navigates via Turbo/SPA, not full loads, so the manifest injects
    // this on every github.com page: arriving at a PR from e.g. the PR list
    // never reloads, and a PR-only match would leave the button missing.
    document.addEventListener("turbo:load", tryInject);
    document.addEventListener("pjax:end", tryInject);
    window.addEventListener("popstate", tryInject);

    tryInject();
  });
})();
