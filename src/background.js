// Toolbar icon + right-click menu — the entry points that also cover compare
// pages, where there's no stable anchor for an in-page button.

const MENU_ID = "open-in-diffshub";

// github.com -> diffshub.com for PR/compare URLs; null otherwise.
function diffshubUrl(raw) {
  try {
    const url = new URL(raw ?? "");
    if (
      url.hostname === "github.com" &&
      (/\/pull\/\d+/.test(url.pathname) || /\/compare\//.test(url.pathname))
    ) {
      url.hostname = "diffshub.com";
      return url.toString();
    }
  } catch {}
  return null;
}

chrome.action.onClicked.addListener(async (tab) => {
  const target = diffshubUrl(tab?.url) ?? "https://diffshub.com";
  await chrome.tabs.create({ url: target, active: true });
});

// documentUrlPatterns keeps the item off pages where it'd do nothing.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Open in Diffshub",
    contexts: ["all"],
    documentUrlPatterns: [
      "https://github.com/*/*/pull/*",
      "https://github.com/*/*/compare/*",
    ],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const target = diffshubUrl(info.pageUrl ?? tab?.url);
  if (target) chrome.tabs.create({ url: target, active: true });
});
