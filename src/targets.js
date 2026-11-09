// Diff viewers the extension can open, and the user's choice of one. Shared by
// the background worker (importScripts), the content script, and the options
// page — loaded as a classic script, so it exposes a single global.
var DiffTargets = (() => {
  "use strict";

  // Every viewer mirrors GitHub's PR, compare, and commit paths, so only the origin changes.
  // `icon` is each site's own favicon.svg, inlined so the PR button needs no
  // network fetch or web-accessible resource.
  const PRESETS = [
    {
      id: "jayjay",
      name: "JayJay Diff",
      origin: "https://diff.hewig.dev",
      privateRepos: false,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2563EB"/><circle cx="32" cy="32" r="21" fill="#fff"/><circle cx="25" cy="29" r="8" fill="#2563EB"/></svg>',
    },
    {
      id: "diffshub",
      name: "Diffshub",
      origin: "https://diffshub.com",
      // With a GitHub token the user saves on diffshub.com.
      privateRepos: true,
      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.bg{fill:#000}.fg{fill:#fff}@media(prefers-color-scheme:dark){.bg{fill:#fff}.fg{fill:#000}}</style><path class="bg" d="M16 0C2.824 0 0 2.824 0 16C0 29.176 2.824 32 16 32C29.176 32 32 29.176 32 16C32 2.824 29.176 0 16 0Z"/><path class="fg" d="M21 16.625C21.6213 16.625 22.125 17.1287 22.125 17.75V19.875H24.25C24.8713 19.875 25.375 20.3787 25.375 21C25.375 21.6213 24.8713 22.125 24.25 22.125H22.125V24.25C22.125 24.8713 21.6213 25.375 21 25.375C20.3787 25.375 19.875 24.8713 19.875 24.25V22.125H17.75C17.1287 22.125 16.625 21.6213 16.625 21C16.625 20.3787 17.1287 19.875 17.75 19.875H19.875V17.75C19.875 17.1287 20.3787 16.625 21 16.625Z"/><path class="fg" d="M13.25 19.875C13.8713 19.875 14.375 20.3787 14.375 21C14.375 21.6213 13.8713 22.125 13.25 22.125H8.75C8.12868 22.125 7.625 21.6213 7.625 21C7.625 20.3787 8.12868 19.875 8.75 19.875H13.25Z"/><path class="fg" d="M11 6.625C11.6213 6.625 12.125 7.12868 12.125 7.75V9.875H14.25C14.8713 9.875 15.375 10.3787 15.375 11C15.375 11.6213 14.8713 12.125 14.25 12.125H12.125V14.25C12.125 14.8713 11.6213 15.375 11 15.375C10.3787 15.375 9.875 14.8713 9.875 14.25V12.125H7.75C7.12868 12.125 6.625 11.6213 6.625 11C6.625 10.3787 7.12868 9.875 7.75 9.875H9.875V7.75C9.875 7.12868 10.3787 6.625 11 6.625Z"/><path class="fg" d="M23.25 9.875C23.8713 9.875 24.375 10.3787 24.375 11C24.375 11.6213 23.8713 12.125 23.25 12.125H18.75C18.1287 12.125 17.625 11.6213 17.625 11C17.625 10.3787 18.1287 9.875 18.75 9.875H23.25Z"/></svg>',
    },
  ];
  const DEFAULT_ID = "jayjay";
  // What 1.0.x always opened, before the viewer was selectable.
  const LEGACY_ID = "diffshub";

  function resolve({ targetId } = {}) {
    return PRESETS.find((t) => t.id === targetId) ?? PRESETS.find((t) => t.id === DEFAULT_ID);
  }

  // An explicit choice (synced) wins over this device's upgrade default
  // (local, so it never overrides other devices or new installs).
  async function load() {
    try {
      const [{ targetId }, { legacyTargetId }] = await Promise.all([
        chrome.storage.sync.get("targetId"),
        chrome.storage.local.get("legacyTargetId"),
      ]);
      return resolve({ targetId: targetId ?? legacyTargetId });
    } catch (err) {
      console.warn("Open in Diff Viewer: couldn't read settings, using the default", err);
      return resolve();
    }
  }

  // Sub-pages of a PR (files, checks, …) open the PR itself; a PR's single-commit view is kept. Queries and anchors are GitHub-only.
  const DIFF_PATHS = [
    /^\/[\w.-]+\/[\w.-]+\/pull\/\d+(?:\/commits\/[0-9a-f]{40})?(?=\/|$)/,
    /^\/[\w.-]+\/[\w.-]+\/compare\/[^/].*?(?=\/?$)/,
    /^\/[\w.-]+\/[\w.-]+\/commit\/[0-9a-f]{7,40}(?=\/|$)/,
  ];

  // The target's URL for a GitHub PR, compare, or commit URL, or null for any other page.
  function urlFor(target, raw) {
    let url;
    try {
      url = new URL(raw ?? "");
    } catch {
      return null;
    }
    if (url.hostname !== "github.com") return null;
    const path = DIFF_PATHS.map((re) => re.exec(url.pathname)?.[0]).find(Boolean);
    return path ? target.origin + path : null;
  }

  // "owner/repo" of a GitHub URL, lowercased as GitHub matches names case-insensitively.
  function repoOf(raw) {
    const m = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)/.exec(raw ?? "");
    return m ? m[1].toLowerCase() : null;
  }

  return { PRESETS, LEGACY_ID, resolve, load, urlFor, repoOf };
})();
