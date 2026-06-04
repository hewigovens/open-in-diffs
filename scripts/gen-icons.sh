#!/usr/bin/env bash
set -euo pipefail

# Rasterize icons/icon.svg -> icons/icon{16,48,128}.png (transparent bg).
# Chrome/Edge require PNG for manifest icons, so these are derived from the SVG.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVG="$ROOT/src/icons/icon.svg"

# ImageMagick 7 ships `magick`; IM6 (e.g. on Ubuntu CI) ships `convert`.
if command -v magick >/dev/null; then
  IM=(magick)
elif command -v convert >/dev/null; then
  IM=(convert)
else
  echo "ImageMagick not found in PATH (need 'magick' or 'convert')" >&2; exit 1
fi

for s in 16 48 128; do
  "${IM[@]}" -background none -density 384 "$SVG" -resize "${s}x${s}" "$ROOT/src/icons/icon${s}.png"
  echo "wrote src/icons/icon${s}.png"
done
