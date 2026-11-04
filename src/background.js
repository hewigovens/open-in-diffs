// Toolbar icon + right-click menu — the entry points that also cover compare
// pages, where there's no stable anchor for an in-page button.
importScripts("targets.js");

const MENU_ID = "open-in-diff-viewer";

// The menu title and toolbar tooltip follow the chosen viewer.
// documentUrlPatterns keeps the item off pages where it'd do nothing.
async function applyUi() {
  const target = await DiffTargets.load();
  const title = `Open in ${target.name}`;
  await chrome.contextMenus.removeAll();
  await new Promise((resolve, reject) => {
    chrome.contextMenus.create(
      {
        id: MENU_ID,
        title,
        contexts: ["all"],
        documentUrlPatterns: ["https://github.com/*/*/pull/*", "https://github.com/*/*/compare/*"],
      },
      () => (chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())
    );
  });
  await chrome.action.setTitle({ title });
}

// Serialized: several events can trigger a sync at once, and interleaved
// removeAll/create pairs would create a duplicate menu id.
let uiSync = Promise.resolve();
function syncUi() {
  uiSync = uiSync.then(applyUi).catch((err) => {
    console.error("Open in Diff Viewer: couldn't update the menu", err);
  });
  return uiSync;
}

// Users updating from 1.0.x keep Diffshub, which is all that version opened;
// new installs get the default viewer.
async function keepLegacyViewer({ reason, previousVersion }) {
  if (reason !== "update" || !/^1\.0\./.test(previousVersion ?? "")) return;
  await chrome.storage.local.set({ legacyTargetId: DiffTargets.LEGACY_ID });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    await keepLegacyViewer(details);
  } catch (err) {
    console.error("Open in Diff Viewer: couldn't migrate the viewer setting", err);
  }
  await syncUi();
});
chrome.storage.onChanged.addListener(syncUi);
// The toolbar title doesn't persist across restarts or disable/enable, so
// refresh it whenever the worker starts.
syncUi();

chrome.action.onClicked.addListener(async (tab) => {
  const target = await DiffTargets.load();
  const url = DiffTargets.urlFor(target, tab?.url) ?? target.origin;
  await chrome.tabs.create({ url, active: true });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const target = await DiffTargets.load();
  const url = DiffTargets.urlFor(target, info.pageUrl ?? tab?.url);
  if (url) await chrome.tabs.create({ url, active: true });
});
