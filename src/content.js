(() => {
  "use strict";

  const BTN_ID = "diff-viewer-open-btn";

  // Chosen viewer (targets.js); loaded before injecting, refreshed on change.
  let target = DiffTargets.resolve();

  // The PR title <h1> carries the PR number, so we can find it without relying
  // on hashed class names. (Compare pages have no stable anchor — handled in
  // the background worker via the menu/toolbar instead.)
  function prNumberLabel() {
    const url = DiffTargets.urlFor(target, location.href);
    const m = url && /^\/[^/]+\/[^/]+\/pull\/(\d+)/.exec(new URL(url).pathname);
    return m ? "#" + m[1] : null;
  }

  function findPrTitle(needle) {
    for (const h of document.querySelectorAll("h1")) {
      if ((h.textContent ?? "").includes(needle)) return h;
    }
    return null;
  }

  // GitHub's analytics meta tags name the page's repository and its visibility; the name check skips tags left over from SPA navigation.
  function privateRepo() {
    const meta = (name) => document.querySelector(`meta[name="octolytics-dimension-repository_${name}"]`)?.content;
    const repo = DiffTargets.repoOf(location.href);
    return repo && meta("nwo")?.toLowerCase() === repo && meta("public") === "false" ? repo : null;
  }

  let reportedPrivate;
  function reportVisibility(repo) {
    if (repo === reportedPrivate) return;
    reportedPrivate = repo;
    try {
      chrome.runtime.sendMessage({ privateRepo: repo }).catch(() => {});
    } catch {
      // Orphaned by an extension update; the reloaded tab gets a fresh script.
    }
  }

  function buildButton() {
    const btn = document.createElement("a");
    btn.id = BTN_ID;
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    const img = document.createElement("img");
    img.alt = "";
    img.width = 16;
    img.height = 16;
    btn.appendChild(img);
    return btn;
  }

  function render(btn, blocked) {
    if (blocked) {
      btn.removeAttribute("href");
      btn.setAttribute("role", "link");
      btn.setAttribute("aria-disabled", "true");
      btn.tabIndex = 0;
      btn.title = `${target.name} opens public repositories only`;
      btn.setAttribute("aria-label", btn.title);
    } else {
      const href = DiffTargets.urlFor(target, location.href) ?? "";
      if (btn.getAttribute("href") !== href) btn.setAttribute("href", href);
      btn.removeAttribute("role");
      btn.removeAttribute("aria-disabled");
      btn.removeAttribute("tabindex");
      btn.title = `Open in ${target.name}`;
      btn.setAttribute("aria-label", `${btn.title} (opens in a new tab)`);
    }
    const src = "data:image/svg+xml," + encodeURIComponent(target.icon);
    const img = btn.querySelector("img");
    if (img.getAttribute("src") !== src) img.src = src;
  }

  function sync() {
    const repo = privateRepo();
    reportVisibility(repo);
    const blocked = repo !== null && !target.privateRepos;
    const existing = document.getElementById(BTN_ID);
    const needle = prNumberLabel();
    if (!needle) return existing?.remove();
    if (existing) return render(existing, blocked);
    const title = findPrTitle(needle);
    if (!title) return;
    const btn = buildButton();
    render(btn, blocked);
    // Outside the <h1> so it stays out of the heading's name; newer GitHub renders the visible "#123" as the next sibling.
    const suffix = title.nextElementSibling;
    if (suffix?.textContent.includes(needle)) suffix.appendChild(btn);
    else title.after(btn);
  }

  async function refreshTarget() {
    target = await DiffTargets.load();
    sync();
  }

  chrome.storage.onChanged.addListener(refreshTarget);

  // Inject only once the stored choice is known, so the button never shows
  // (or opens) the default viewer for a user who picked another.
  refreshTarget().then(() => {
    let lastHref = location.href;
    new MutationObserver(() => {
      if (location.href !== lastHref || (!document.getElementById(BTN_ID) && prNumberLabel())) {
        lastHref = location.href;
        sync();
      }
    }).observe(document.documentElement, { childList: true, subtree: true });

    // GitHub navigates via Turbo/SPA, not full loads, so the manifest injects
    // this on every github.com page: arriving at a PR from e.g. the PR list
    // never reloads, and a PR-only match would leave the button missing.
    document.addEventListener("turbo:load", sync);
    document.addEventListener("pjax:end", sync);
    window.addEventListener("popstate", sync);
    // A page restored from the back/forward cache keeps this script's state, but the worker
    // dropped the tab's visibility when it left github.com, so report it again.
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      reportedPrivate = undefined;
      sync();
    });
  });
})();
