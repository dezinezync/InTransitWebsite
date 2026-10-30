#!/bin/zsh
# Makes the app icons of the site from the two 1024 px icons of the app.
#
# Usage: tools/app-icons.sh [<light icon> [<dark icon>]]
#   light icon  The default icon, 1024 px, Display P3, with its rounded corners. The default is
#               ~/Desktop/Assets/MT/AppIcon-iOS-Default-1024@1x.png.
#   dark icon   The dark icon, the same size. The default is
#               ~/Desktop/Assets/MT/AppIcon-iOS-Dark-1024@1x.png.
#
# It writes:
#   assets/images/appicon/apple-touch-icon-<size>x<size>.png  60, 76, 152, 180 px, and
#   assets/images/appicon/apple-touch-icon.png                180 px
#       The icons of the <link> tags in _includes/head.html. The 180 px icon is also the
#       logo of the structured data and the share image until the social card exists.
#   assets/images/favicon.png                                  32 px
#   assets/images/press/intransit-icon-light.png and intransit-icon-dark.png
#       The full-size icons, 1024 px, that the press page offers.
#   assets/images/appicon/icon-light-<width>w.webp and icon-dark-<width>w.webp
#       The previews of the press page (128, 256, 384 px).
#
# `sips` scales the icons, and keeps their profile (Display P3).
#
# Requires sips (macOS) and libwebp (cwebp).

set -euo pipefail

cd "${0:A:h}/.."
light=${1:-$HOME/Desktop/Assets/MT/AppIcon-iOS-Default-1024@1x.png}
dark=${2:-$HOME/Desktop/Assets/MT/AppIcon-iOS-Dark-1024@1x.png}

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
mkdir -p assets/images/appicon assets/images/press

# Scales <source> to <size> px square and writes <target>.
scale() {
  local source=$1 size=$2 target=$3
  sips --resampleHeightWidth "$size" "$size" "$source" --out "$target" > /dev/null
  print "$target: ${size} px, $(stat -f%z "$target") B"
}

for size in 60 76 152 180; do
  scale "$light" $size "assets/images/appicon/apple-touch-icon-${size}x${size}.png"
done
cp "assets/images/appicon/apple-touch-icon-180x180.png" "assets/images/appicon/apple-touch-icon.png"
scale "$light" 32 assets/images/favicon.png

for appearance in light dark; do
  source=${(P)appearance}
  cp "$source" "assets/images/press/intransit-icon-$appearance.png"
  print "assets/images/press/intransit-icon-$appearance.png: 1024 px"
  for width in 128 256 384; do
    sips --resampleHeightWidth $width $width "$source" --out "$work_dir/icon-$appearance-$width.png" > /dev/null
    target="assets/images/appicon/icon-$appearance-${width}w.webp"
    cwebp -quiet -q 90 -alpha_q 100 -sharp_yuv -metadata icc "$work_dir/icon-$appearance-$width.png" -o "$target"
    print "$target: ${width} px, $(stat -f%z "$target") B"
  done
done
