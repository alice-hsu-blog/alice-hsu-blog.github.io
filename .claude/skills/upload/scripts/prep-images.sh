#!/bin/bash
# Resize new/modified blog images so their long edge is <= MAXDIM, then strip
# metadata from every image in static/images (keeping the ICC colour profile).
#
# Only touches JPG/JPEG/PNG files that are new or modified in the working tree.
# GIFs are skipped (resizing would break animation). Already-small images are
# left untouched (no upscaling).

set -uo pipefail

MAXDIM=1440
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT" || exit 1

echo "== Step 1: compress images (long edge -> ${MAXDIM}px) =="

# New / modified image files under static/images (NUL-safe, handles spaces)
FILES=()
while IFS= read -r line; do
  FILES+=("$line")
done < <(
  git status --porcelain=v1 --untracked-files=all -z \
  | tr '\0' '\n' \
  | sed -E 's/^(.{2}) //' \
  | grep -iE '^"?static/images/.*\.(jpe?g|png)"?$' \
  | sed -E 's/^"//; s/"$//'
)

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "  (no new or modified JPG/PNG images found)"
else
  for f in "${FILES[@]}"; do
    [ -f "$f" ] || continue
    w=$(sips -g pixelWidth  "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
    h=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/{print $2}')
    if [ -z "${w:-}" ] || [ -z "${h:-}" ]; then
      echo "  ?? could not read dimensions: $f"
      continue
    fi
    if [ "$w" -ge "$h" ]; then long=$w; else long=$h; fi
    if [ "$long" -gt "$MAXDIM" ]; then
      sips -Z "$MAXDIM" "$f" >/dev/null 2>&1
      nw=$(sips -g pixelWidth  "$f" 2>/dev/null | awk '/pixelWidth/{print $2}')
      nh=$(sips -g pixelHeight "$f" 2>/dev/null | awk '/pixelHeight/{print $2}')
      echo "  resized  ${w}x${h} -> ${nw}x${nh}   $f"
    else
      echo "  kept     ${w}x${h} (long edge <= ${MAXDIM})   $f"
    fi
  done
fi

echo
echo "== Step 3: strip metadata (exiftool, keep ICC profile) =="
exiftool -all= -tagsfromfile @ -icc_profile -overwrite_original \
  "${ROOT}/static/images/" -r
