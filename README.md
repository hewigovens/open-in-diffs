# Open in Diffshub

A small Chrome / Edge extension (MV3) that opens the diffshub.com equivalent of a GitHub diff. On a pull request it adds an **Open in Diffshub** button; on compare pages — and PRs too — there's a right-click menu item and a toolbar-icon shortcut. Everything just swaps `github.com` for [diffshub.com](https://diffshub.com) on the same path.

[![Available in the Chrome Web Store](https://img.shields.io/chrome-web-store/v/pgmcdokikomeilbkobgfmlihmilingpl?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/open-in-diffshub/pgmcdokikomeilbkobgfmlihmilingpl)
[![CI](https://github.com/hewigovens/open-in-diffs/actions/workflows/ci.yml/badge.svg)](https://github.com/hewigovens/open-in-diffs/actions/workflows/ci.yml)

> **Not affiliated with diffshub.com.** This is an unofficial, community-built extension that simply links to diffshub.com. It is not made, endorsed, or maintained by Diffshub.

## Demo

![Open in Diffshub demo](docs/demo.gif)

_Higher-quality recording: [docs/demo.webm](docs/demo.webm)._

## Features

- **PR button** — one click opens the current pull request on diffshub.com; present on every PR sub-page (Conversation, Files changed, Checks, Commits), anchored to the PR title.
- **Right-click menu** — "Open in Diffshub" appears on PR and `/compare/...` pages (including `?expand=1` pre-PR views), which have no stable spot for an in-page button.
- **Toolbar icon** — click it from any GitHub PR or compare tab and the diffshub equivalent opens in a new tab (other tabs go to the diffshub home).
- Works without a GitHub sign-in.

## How it works

- On a PR page the content script anchors the button on the title `<h1>` (identified by the `#<number>` in the URL), so it stays stable across GitHub's classic and new UIs.
- Compare pages have no equally stable, visible anchor (the "Comparing changes" heading is hidden on `?expand=1`), so they're covered by the right-click menu and toolbar icon instead — both handled by a tiny background service worker that does the same hostname swap. The context menu is scoped to PR and compare URLs so it only appears where it does something.
- Vanilla JS — no bundler, no build step, no runtime dependencies.

## Privacy

The extension uses the `activeTab` and `contextMenus` permissions, with no host permissions. The in-page button only runs on GitHub pull request pages; the menu and toolbar icon read the current tab's URL to build the diffshub link and open a new tab — nothing is collected, stored, or sent anywhere.

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

Releases are automated. Tag a version and push:

```sh
git tag v1.0.1 && git push --tags
```

The [release workflow](.github/workflows/release.yml) signs a `.crx`, attaches it to a GitHub Release, and publishes to the Chrome Web Store. Publishing uses [Verified CRX Uploads](https://developer.chrome.com/blog/verified-uploads-cws): the package is signed with a private key held only in the `CWS_SIGNING_KEY` secret, and the step is gated behind a protected environment that requires manual approval.

## Layout

```
src/                              # the extension (Load Unpacked points here)
├── manifest.json                 # MV3, single source of truth for the version
├── content.js                    # injects the Diffshub button into PR pages
├── background.js                 # toolbar-icon + right-click menu handler (PR & compare)
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
