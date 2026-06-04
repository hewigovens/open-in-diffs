#!/usr/bin/env bash
set -euo pipefail

# Pack src/ into a signed .crx for Chrome Web Store Verified CRX Uploads (needs Chrome/Chromium). Usage: pack-crx.sh <privatekey.pem>

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v jq >/dev/null || { echo "jq not found in PATH" >&2; exit 1; }

KEY="${1:?usage: pack-crx.sh <privatekey.pem>}"
[ -f "$KEY" ] || { echo "signing key not found: $KEY" >&2; exit 1; }

# Find a Chromium-based browser to write the CRX3 (CI: google-chrome, local: Edge); override via $CHROME_BIN.
CHROME="${CHROME_BIN:-}"
if [ -z "$CHROME" ]; then
  for c in google-chrome google-chrome-stable chromium chromium-browser chrome \
           microsoft-edge microsoft-edge-stable msedge \
           "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
           "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CHROME="$c"; break; fi
  done
fi
[ -n "$CHROME" ] || { echo "No Chromium-based browser found (set CHROME_BIN)" >&2; exit 1; }

VERSION=$(jq -r .version src/manifest.json)

# Ensure icons exist, then stage exactly what ships (same as the zip, minus icon.svg).
bash scripts/gen-icons.sh >/dev/null
STAGE=$(mktemp -d)
CRX_TMP="$STAGE.crx"
trap 'rm -rf "$STAGE" "$CRX_TMP"' EXIT
cp src/manifest.json src/content.js src/background.js "$STAGE/"
mkdir -p "$STAGE/icons"
cp src/icons/icon16.png src/icons/icon48.png src/icons/icon128.png "$STAGE/icons/"

mkdir -p dist
# --pack-extension writes "<dir>.crx" next to the staged dir, signed with KEY.
"$CHROME" --no-sandbox --headless=new --pack-extension="$STAGE" --pack-extension-key="$KEY" || \
  "$CHROME" --no-sandbox --pack-extension="$STAGE" --pack-extension-key="$KEY"

OUT="dist/open-in-diffs-$VERSION.crx"
mv "$CRX_TMP" "$OUT"
echo "built $OUT"
