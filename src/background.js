// Toolbar icon + right-click menu — the entry points that also cover compare
// and commit pages, where there's no stable anchor for an in-page button.
importScripts("targets.js");

const MENU_ID = "open-in-diff-viewer";

// Per tab: the private repository the content script reported, or null; present once the tab showed a diff page.
const tabKey = (tabId) => `tab:${tabId}`;
async function storedTab(tabId) {
  const key = tabKey(tabId);
  return (await chrome.storage.session.get(key))[key];
}

async function isPrivateRepo(tab) {
  const repo = await storedTab(tab.id);
  return repo != null && repo === DiffTargets.repoOf(tab.url);
}

async function tabAction(target, tab) {
  const url = DiffTargets.urlFor(target, tab?.url);
  if (!url) return { url: target.origin, title: `Open ${target.name} home page`, onDiff: false, enabled: true };
  if (!target.privateRepos && (await isPrivateRepo(tab)))
    return { title: `${target.name} opens public repositories only`, onDiff: true, enabled: false };
  return { url, title: `Open in ${target.name}`, onDiff: true, enabled: true };
}

async function applyTab(target, tab) {
  const action = await tabAction(target, tab);
  if (action.onDiff && (await storedTab(tab.id)) === undefined)
    await chrome.storage.session.set({ [tabKey(tab.id)]: null });
  await chrome.action.setTitle({ tabId: tab.id, title: action.title });
  await (action.enabled ? chrome.action.enable(tab.id) : chrome.action.disable(tab.id));
}

// The menu is global, so it mirrors the only tab it can be opened on: the focused window's active one.
async function applyMenu(target) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return;
  const action = await tabAction(target, tab);
  await chrome.contextMenus.update(MENU_ID, { title: action.title, visible: action.onDiff, enabled: action.enabled });
}

async function applyUi() {
  const target = await DiffTargets.load();
  await chrome.contextMenus.removeAll();
  await new Promise((resolve, reject) => {
    chrome.contextMenus.create(
      {
        id: MENU_ID,
        title: `Open in ${target.name}`,
        contexts: ["page", "selection"],
        documentUrlPatterns: [
          "https://github.com/*/*/pull/*",
          "https://github.com/*/*/compare/*",
          "https://github.com/*/*/commit/*",
        ],
      },
      () => (chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve())
    );
  });
  await chrome.action.setTitle({ title: (await tabAction(target)).title });
  // allSettled: a tab can close mid-update.
  await Promise.allSettled((await chrome.tabs.query({})).map((tab) => applyTab(target, tab)));
  await applyMenu(target);
}

// Serialized: several events can trigger an update at once, and interleaved
// removeAll/create pairs would create a duplicate menu id.
let uiSync = Promise.resolve();
function enqueue(work) {
  uiSync = uiSync.then(work).catch((err) => {
    console.error("Open in Diff Viewer: couldn't update the toolbar or menu", err);
  });
  return uiSync;
}
const syncUi = () => enqueue(applyUi);
const syncMenu = () => enqueue(async () => applyMenu(await DiffTargets.load()));
const syncTab = (getTab) =>
  enqueue(async () => {
    const tab = await getTab();
    if (!tab) return;
    const target = await DiffTargets.load();
    await applyTab(target, tab);
    if (tab.active) await applyMenu(target);
  });

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
  if (details.reason === "install") chrome.runtime.openOptionsPage();
  await syncUi();
});
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync" || area === "local") syncUi();
});
// The toolbar title doesn't persist across restarts or disable/enable, so
// refresh it whenever the worker starts.
syncUi();

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (!("url" in change || "status" in change)) return;
  // Without host access to the new page the URL is hidden; only a tab that showed a diff page has a title to reset.
  if (tab.url !== undefined) return syncTab(() => tab);
  syncTab(async () => {
    if ((await storedTab(tabId)) === undefined) return null;
    await chrome.storage.session.remove(tabKey(tabId));
    return tab;
  });
});
chrome.tabs.onActivated.addListener(({ tabId }) => syncTab(() => chrome.tabs.get(tabId)));
chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(tabKey(tabId)));
chrome.runtime.onMessage.addListener(({ privateRepo }, sender) => {
  const tab = sender.tab;
  if (!tab) return;
  syncTab(async () => {
    await chrome.storage.session.set({ [tabKey(tab.id)]: privateRepo });
    return tab;
  });
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) syncMenu();
});

chrome.action.onClicked.addListener(async (tab) => {
  const { url } = await tabAction(await DiffTargets.load(), tab);
  if (url) await chrome.tabs.create({ url, active: true });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const { url, onDiff } = await tabAction(await DiffTargets.load(), tab);
  if (url && onDiff) await chrome.tabs.create({ url, active: true });
});
