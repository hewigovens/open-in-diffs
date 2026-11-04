# Open in Diff Viewer

A small Chrome / Edge extension (MV3) that opens a GitHub diff in a better diff viewer. On a pull request it adds a button next to the title; on compare pages — and PRs too — there's a right-click menu item and a toolbar-icon shortcut. Everything just swaps `github.com` for the viewer's host on the same path.

Pick the viewer in the extension's options (right-click the toolbar icon → **Options**): [JayJay Diff](https://diff.hewig.dev) (the default) or [Diffshub](https://diffshub.com).

[![Available in the Chrome Web Store](https://img.shields.io/chrome-web-store/v/pgmcdokikomeilbkobgfmlihmilingpl?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/open-in-diffshub/pgmcdokikomeilbkobgfmlihmilingpl)
[![CI](https://github.com/hewigovens/open-in-diffs/actions/workflows/ci.yml/badge.svg)](https://github.com/hewigovens/open-in-diffs/actions/workflows/ci.yml)

> **Not affiliated with diffshub.com.** The Diffshub option simply links to diffshub.com; this extension is not made, endorsed, or maintained by Diffshub.

## Demo

![Open in Diff Viewer demo](docs/demo.gif)

_Higher-quality recording: [docs/demo.webm](docs/demo.webm)._

## Features

- **PR button** — one click opens the current pull request in the chosen viewer; present on every PR sub-page (Conversation, Files changed, Checks, Commits), anchored to the PR title.
- **Right-click menu** — "Open in <viewer>" appears on PR and `/compare/...` pages (including `?expand=1` pre-PR views), which have no stable spot for an in-page button.
- **Toolbar icon** — click it from a GitHub PR or compare tab and the viewer's equivalent opens in a new tab (other tabs go to the viewer's home).
- **Options** — choose JayJay Diff or Diffshub; with browser sync on, the choice follows you.
- Works without a GitHub sign-in.

## How it works

- On a PR page the content script anchors the button on the title `<h1>` (identified by the `#<number>` in the URL), so it stays stable across GitHub's classic and new UIs.
- Compare pages have no equally stable, visible anchor (the "Comparing changes" heading is hidden on `?expand=1`), so they're covered by the right-click menu and toolbar icon instead — both handled by a tiny background service worker that does the same hostname swap. The context menu is scoped to PR and compare URLs so it only appears where it does something.
- The viewer list lives in `src/targets.js`, shared by the content script, the worker, and the options page.
- Vanilla JS — no bundler, no build step, no runtime dependencies.

## Privacy

The extension uses the `activeTab`, `contextMenus`, and `storage` permissions, with no host permissions. The in-page button only runs on GitHub pull request pages; the menu and toolbar icon read the current tab's URL to build the viewer link and open a new tab. The only thing stored is your viewer choice, in the browser's synced extension storage — nothing is collected or sent anywhere.

## Install

[**Install from the Chrome Web Store**](https://chromewebstore.google.com/detail/open-in-diffshub/pgmcdokikomeilbkobgfmlihmilingpl) — works in both Chrome and Edge.

### Unpacked (for development)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select this repo's `src/` folder.

## Develop

For local development you don't need a build — just **Load unpacked** from `src/` (above).

To produce the signed `.crx` the store accepts, you need `jq`, ImageMagick (`magick` or `convert`), a Chromium-based browser, and an RSA signing key:

```sh
npm run gen-icons              # rasterize src/icons/icon.svg → 16/48/128 PNGs
npm run pack -- path/key.pem   # sign src/ → dist/open-in-diffs-<version>.crx
npm run clean                  # rm -rf dist
```

`src/manifest.json` is the single source of truth for the version.

## Releasing

Releases are automated: bump `version` in `src/manifest.json` (and `package.json`) and push to `main`. If `v<version>` isn't tagged yet, the [release workflow](.github/workflows/release.yml) signs a `.crx`, creates the tag, and attaches the `.crx` to a new GitHub Release. Don't push the tag yourself; to retry a failed release, run the workflow manually from the Actions tab.

The package is signed with a private key held only in the `CWS_SIGNING_KEY` secret ([Verified CRX Uploads](https://developer.chrome.com/blog/verified-uploads-cws)), kept in the protected `chrome-web-store` environment.

Publishing to the store itself is manual.

## Layout

```
src/                              # the extension (Load Unpacked points here)
├── manifest.json                 # MV3, single source of truth for the version
├── targets.js                    # viewer list + stored choice, shared by everything below
├── content.js                    # injects the viewer button into PR pages
├── background.js                 # toolbar-icon + right-click menu handler (PR & compare)
├── options.html, options.js      # viewer picker
└── icons/
    ├── icon.svg                  # brand mark, committed
    └── icon{16,48,128}.png       # gitignored, generated from icon.svg
scripts/
├── gen-icons.sh                  # rasterize the SVG into PNGs (ImageMagick)
├── pack-crx.sh                   # sign src/ into a .crx (Chromium)
└── publish-cws.sh                # upload + publish to the Chrome Web Store
.github/workflows/                # ci.yml (build) and release.yml (sign + publish)
docs/                             # demo.gif, demo.webm, store screenshot
```
