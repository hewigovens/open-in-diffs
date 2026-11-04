// Diff viewers the extension can open, and the user's choice of one. Shared by
// the background worker (importScripts), the content script, and the options
// page — loaded as a classic script, so it exposes a single global.
var DiffTargets = (() => {
  "use strict";

  // Every viewer mirrors GitHub's PR and compare paths, so only the origin changes.
  const PRESETS = [
    { id: "jayjay", name: "JayJay Diff", origin: "https://diff.hewig.dev" },
    { id: "diffshub", name: "Diffshub", origin: "https://diffshub.com" },
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

  const DIFF_PATH = /^\/[^/]+\/[^/]+\/(?:pull\/\d+(?:\/|$)|compare\/)/;

  // The target's URL for a GitHub PR/compare URL, or null for any other page.
  function urlFor(target, raw) {
    let url;
    try {
      url = new URL(raw ?? "");
    } catch {
      return null;
    }
    if (url.hostname !== "github.com" || !DIFF_PATH.test(url.pathname)) return null;
    return target.origin + url.pathname + url.search + url.hash;
  }

  return { PRESETS, LEGACY_ID, resolve, load, urlFor };
})();
