#!/bin/zsh
# Makes the web copies of one image: a WebP file for each width.
# A copy of tools/web-image.sh on the Elytra site (itself from the Pockity site, without its
# SQUARE and ROTATE options, and without its AVIF copies).
#
# Usage: tools/web-image.sh <source> <output base> <width> [<width> ...]
#   source       A PNG file or a JPEG file.
#   output base  The path of the copies, without the width and the extension.
#                Example: assets/images/press/iphone-duo-folded
#   width        The width of one copy, in pixels.
#
# The script writes <output base>-<width>w.webp.
# It does not make a copy that is wider than the source.
#
# Each copy keeps the colour profile of the source, for example Display P3.
# The script resizes the image at 16 bits for each channel. The WebP copy has 8 bits for
# each channel.
#
# _includes/picture.html writes the markup for the copies.
#
# Requires ImageMagick (magick) and libwebp (cwebp).

set -euo pipefail

if (( $# < 3 )); then
  print -u2 "Usage: $0 <source> <output base> <width> [<width> ...]"
  exit 64
fi

source_file=$1
output_base=$2
shift 2

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT

# The work files are RGB PNG files, with an alpha channel only if the source has one.
# Without this, ImageMagick writes a grey PNG file for an image that has only neutral
# colours. A grey PNG file cannot keep an RGB profile, so the copies would have no profile.
if [[ $(magick identify -format '%A' "$source_file") == Undefined ]]; then
  color_type=2
else
  color_type=6
fi

work_file="$work_dir/source.png"
magick "$source_file" -depth 16 -define png:color-type=$color_type "$work_file"

source_width=$(magick identify -format "%w" "$work_file")
mkdir -p "$(dirname "$output_base")"

for width in "$@"; do
  if (( width > source_width )); then
    print "Skipped ${width}w: the source is only ${source_width} px wide."
    continue
  fi

  resized="$work_dir/${width}.png"
  magick "$work_file" -filter Lanczos -resize "${width}x" -depth 16 -define png:color-type=$color_type "$resized"

  cwebp -quiet -q 82 -alpha_q 100 -sharp_yuv -metadata icc "$resized" -o "${output_base}-${width}w.webp"

  height=$(magick identify -format "%h" "$resized")
  print "${output_base}-${width}w: ${width} x ${height}, WebP $(stat -f%z "${output_base}-${width}w.webp") B"
done
