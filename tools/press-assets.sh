#!/bin/zsh
# Makes the iPhone screenshots of the press page (_pages/press.html).
# A copy of tools/press-assets.sh on the Elytra site, for the framed screenshots of
# InTransit, which are in one folder for each city. It does not export the app icon.
#
# Usage: tools/press-assets.sh [<screenshots folder>]
#   screenshots folder  The framed screenshots, with a folder for each city. The default is
#                       ~/Library/Mobile Documents/com~apple~CloudDocs/InTransit/Screenshots/Framed/2026.11.
#
# For each screenshot, the script writes into assets/images/press/:
#   <name>.png            The full-size file that the tile links to, with 8 bits for
#                         each channel, in Display P3. The framed screenshots have no
#                         profile, so the script assigns Display P3 to them (it does not
#                         convert the colours), as for the raw screenshots.
#   <name>-<width>w.webp  The previews that the tile shows (see tools/web-image.sh).
#
# The script keeps the file names, so the page needs no change when a screenshot changes.
#
# Requires tools/web-image.sh and ImageMagick (magick).

set -euo pipefail

cd "${0:A:h}/.."
source_dir=${1:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/InTransit/Screenshots/Framed/2026.11}
output=assets/images/press
display_p3=/System/Library/ColorSync/Profiles/Display\ P3.icc

mkdir -p "$output"

# Prints the one file in <folder> that matches <pattern>. The names of the screenshots
# have a narrow no-break space before "AM" or "PM", so the list below gives a pattern
# with the time of the screenshot, not the full name.
find_one() {
  local folder=$1 pattern=$2
  local matches=( "$folder"/${~pattern}(N) )
  if (( ${#matches} != 1 )); then
    print -u2 "Expected one file for \"$pattern\" in $folder, but found ${#matches}."
    exit 1
  fi
  print -r -- "$matches[1]"
}

# Each line: <name> <folder> <pattern> <preview widths>
# A space in the folder needs a backslash before it.
# The widths are 2x and 3x of the size of the tile on a wide screen (8rem high).
screenshots=(
  'iphone-delhi-map          New\ Delhi  *11.10.14*_framed.png  300,600'
  'iphone-kolkata-station    Kolkata     *10.27.12*_framed.png  300,600'
  'iphone-chennai-journey    Chennai     *10.42.42*_framed.png  300,600'
  'iphone-bengaluru-ride     Bengaluru   *9.24.26*_framed.png   300,600'
  'iphone-hyderabad-lock     Hyderabad   *11.21.52*_framed.png  300,600'
  'iphone-ahmedabad-change   Ahmedabad   *9.58.55*_framed.png   300,600'
  'iphone-mumbai-trip        Mumbai      *9.46.19*_framed.png   300,600'
  'iphone-pune-travelogue    Pune        *7.36.22*_framed.png  300,600'
  'iphone-nagpur-dark        Nagpur      *11.01.10*_framed.png  300,600'
  'iphone-delhi-underground  New\ Delhi  *3.55.45*_framed.png   300,600'
)

for line in $screenshots; do
  fields=( ${(z)line} )
  name=$fields[1]
  folder=${(Q)fields[2]}
  pattern=$fields[3]
  widths=( ${(s:,:)fields[4]} )

  source_file=$(find_one "$source_dir/$folder" "$pattern")
  target="$output/$name.png"
  # For an image with no profile, `-profile` assigns the profile and keeps the pixels.
  if [[ $(sips -g profile "$source_file" | tail -1) == *'<nil>'* ]]; then
    magick "$source_file" -profile "$display_p3" -depth 8 -define png:compression-level=9 "$target"
  else
    magick "$source_file" -depth 8 -define png:compression-level=9 "$target"
  fi
  print "$target: $(magick identify -format '%w x %h' "$target"), $(stat -f%z "$target") B"
  tools/web-image.sh "$target" "$output/$name" $widths
done
