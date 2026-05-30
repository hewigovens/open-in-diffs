#!/usr/bin/env bash
set -euo pipefail

# Build the unpacked extension into a versioned zip in dist/.
# Extension sources live in src/ so Chrome/Edge can Load Unpacked from there.
# src/manifest.json is the single source of truth for the version;
# package.json is kept in sync. PNG icons are derived from src/icons/icon.svg
# via gen-icons.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v jq >/dev/null || { echo "jq not found in PATH" >&2; exit 1; }

# Read manifest version.
VERSION=$(jq -r .version src/manifest.json)
if [ -z "$VERSION" ] || [ "$VERSION" = "null" ]; then
  echo "src/manifest.json has no version" >&2; exit 1
fi

# Sync package.json version.
PKGVER=$(jq -r .version package.json)
if [ "$PKGVER" != "$VERSION" ]; then
  TMP=$(mktemp)
  jq --arg v "$VERSION" '.version = $v' package.json > "$TMP"
  mv "$TMP" package.json
  echo "synced package.json version $PKGVER -> $VERSION"
fi

# Required files.
for f in src/manifest.json src/content.js src/background.js src/icons/icon.svg; do
  [ -e "$f" ] || { echo "missing required file: $f" >&2; exit 1; }
done

# Regenerate PNGs if missing or older than the SVG (they're gitignored).
SVG_MTIME=$(stat -f %m src/icons/icon.svg)
NEED_GEN=0
for s in 16 48 128; do
  PNG="src/icons/icon${s}.png"
  if [ ! -f "$PNG" ] || [ "$(stat -f %m "$PNG")" -lt "$SVG_MTIME" ]; then
    NEED_GEN=1
    break
  fi
done
if [ "$NEED_GEN" = 1 ]; then
  echo "icons missing or stale — running gen-icons.sh"
  bash scripts/gen-icons.sh
fi

# Zip from inside src/ so manifest.json sits at the archive root.
# icon.svg is the source for gen-icons.sh; only PNGs ship.
rm -rf dist
mkdir -p dist
ZIP="$ROOT/dist/open-in-diffs-$VERSION.zip"
(cd src && zip -r -q -X "$ZIP" manifest.json content.js background.js icons -x "*.DS_Store" "icons/icon.svg")

SIZE=$(du -h "$ZIP" | awk '{print $1}')
echo "built dist/open-in-diffs-$VERSION.zip ($SIZE)"
