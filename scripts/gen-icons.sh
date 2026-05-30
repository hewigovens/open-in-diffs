#!/usr/bin/env bash
set -euo pipefail

# Rasterize icons/icon.svg -> icons/icon{16,48,128}.png (transparent bg).
# Chrome/Edge require PNG for manifest icons, so these are derived from the SVG.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVG="$ROOT/src/icons/icon.svg"

command -v magick >/dev/null || { echo "magick (ImageMagick) not found in PATH" >&2; exit 1; }

for s in 16 48 128; do
  magick -background none -density 384 "$SVG" -resize "${s}x${s}" "$ROOT/src/icons/icon${s}.png"
  echo "wrote src/icons/icon${s}.png"
done
