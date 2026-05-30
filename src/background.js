// Toolbar icon click: open the diffshub equivalent of the current PR.
// Falls back to diffshub.com home for non-PR tabs.
chrome.action.onClicked.addListener(async (tab) => {
  let target = "https://diffshub.com";
  try {
    const url = new URL(tab && tab.url);
    if (url.hostname === "github.com" && /\/pull\/\d+/.test(url.pathname)) {
      url.hostname = "diffshub.com";
      target = url.toString();
    }
  } catch {}
  await chrome.tabs.create({ url: target, active: true });
});
