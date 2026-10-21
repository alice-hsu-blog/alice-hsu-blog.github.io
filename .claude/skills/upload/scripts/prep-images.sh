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
    # Phone photos are often stored sideways with an EXIF Orientation tag that
    # tells viewers how to turn them. Step 3 strips that tag, so bake the
    # rotation into the pixels first and reset the tag to 1 (normal).
    o=$(exiftool -s3 -n -Orientation "$f" 2>/dev/null)
    case "${o:-1}" in
      2) sips -f horizontal "$f" >/dev/null 2>&1 ;;
      3) sips -r 180 "$f" >/dev/null 2>&1 ;;
      4) sips -f vertical "$f" >/dev/null 2>&1 ;;
      5) sips -f horizontal "$f" >/dev/null 2>&1; sips -r 270 "$f" >/dev/null 2>&1 ;;
      6) sips -r 90 "$f" >/dev/null 2>&1 ;;
      7) sips -f horizontal "$f" >/dev/null 2>&1; sips -r 90 "$f" >/dev/null 2>&1 ;;
      8) sips -r 270 "$f" >/dev/null 2>&1 ;;
    esac
    if [ "${o:-1}" != "1" ]; then
      exiftool -n -Orientation=1 -overwrite_original "$f" >/dev/null 2>&1
      echo "  rotated  (EXIF orientation $o -> upright)   $f"
    fi
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
echo "== Step 3: strip metadata (exiftool, keep ICC profile + orientation) =="
# -orientation is kept as a safety net so an image is never shown sideways.
exiftool -all= -tagsfromfile @ -icc_profile -orientation -overwrite_original \
  "${ROOT}/static/images/" -r
