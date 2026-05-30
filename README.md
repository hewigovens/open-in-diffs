# Open in Diffshub

A small Chrome / Edge extension (MV3) that adds an **Open in Diffshub** button to every GitHub pull request page. Click it (or the toolbar icon) to open the same PR on [diffshub.com](https://diffshub.com).

## Demo

<video src="docs/demo.webm" controls width="100%" muted preload="metadata">
  <a href="docs/demo.webm">Watch the demo</a>
</video>

## Features

- One click opens any GitHub pull request on diffshub.com — same path, just the hostname swapped.
- Available on every PR sub-page: Conversation, Files changed, Checks, Commits.
- Works without a GitHub sign-in.
- Toolbar-icon shortcut — click it from any GitHub PR tab and the diffshub equivalent opens in a new tab (non-PR tabs go to the diffshub home).

## How it works

- The content script anchors on the PR title `<h1>` (identified by the `#<number>` in the URL), so it stays stable across GitHub's classic and new UIs.
- The toolbar action handler does the same hostname swap from a tiny background service worker.
- Vanilla JS — no bundler, no runtime dependencies.

## Install (unpacked)

1. Open `edge://extensions` (or `chrome://extensions`).
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select this repo's `src/` folder.

## Develop

Requires `bash`, `jq`, `zip`, and ImageMagick (`magick`).

```sh
npm run build       # rasterizes icons if stale, then zips src/ → dist/open-in-diffs-<version>.zip
npm run gen-icons   # one-off: rasterize src/icons/icon.svg into 16/48/128 PNGs
npm run clean       # rm -rf dist
```

Bump the version in `src/manifest.json` only — `package.json` is auto-synced on build.

## Layout

```
src/                              # the extension (Load Unpacked points here)
├── manifest.json                 # MV3, single source of truth for the version
├── content.js                    # injects the Diffshub button into PR pages
├── background.js                 # toolbar-icon click handler
└── icons/
    ├── icon.svg                  # brand mark, committed
    └── icon{16,48,128}.png       # gitignored, generated from icon.svg
scripts/
├── build.sh                      # bash + jq + zip
└── gen-icons.sh                  # bash + ImageMagick
docs/
└── demo.webm
```
