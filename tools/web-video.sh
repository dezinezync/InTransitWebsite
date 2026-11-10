#!/bin/zsh
# Makes the web copies of one screen recording: a crop of it, at 2x, as HEVC and AV1, and a poster.
# Use it with _includes/video.html, which writes the markup for the copies.
#
# Usage: tools/web-video.sh [--preview] <source> <output base> <y> <height> [<x> <width>]
#   source       A screen recording from the Simulator or a device, for example a .mp4 or .mov file.
#   output base  The path of the copies, without the extension.
#                Example: assets/images/posts/20261110/stations-switch
#   y, height    The top and the height of the crop, in points.
#   x, width     The left and the width of the crop, in points. The default is the whole width.
#                The width is at most the width of the screen in points (402 on iPhone 18 Pro).
#
# The points of the screen are its pixels divided by the scale. The script takes the scale from
# the width of the recording and the width of the screen in points, SCREEN_POINTS (402 by default).
# Example: a 1206 px recording of a 402 pt screen has a scale of 3.
#
# With --preview, the script makes no copies. It draws the crop on three frames of the recording
# (at the start, the middle and the end) and writes one PNG file to the temporary folder, so you
# can check the crop before you encode. Change y and height, and run it again.
#
# The script writes:
#   <output base>-hevc.mp4    HEVC Main 10, for Safari and for browsers with HEVC decoding.
#   <output base>-av1.mp4     AV1 10-bit, for the other browsers.
#   <output base>-poster.webp The first frame, for the time before the video loads.
# Each copy is the crop at 2x, so a 402 pt crop is 804 px wide.
#
# The copies stay in the colour space of the recording, for example Display P3, at 10 bits for
# each channel. The script does not convert to sRGB, which would clip the wide-gamut colours.
# The copies have no sound. They play at 60 frames a second: a screen recording has a variable
# frame rate, which the AV1 encoder does not take.
#
# At the end, the script prints the `render` tag for _includes/video.html.
#
# Requires FFmpeg (ffmpeg and ffprobe, with libx265 and libsvtav1) and ImageMagick (magick).

set -euo pipefail

preview=false
if [[ ${1:-} == --preview ]]; then
  preview=true
  shift
fi

if (( $# != 4 && $# != 6 )); then
  print -u2 "Usage: $0 [--preview] <source> <output base> <y> <height> [<x> <width>]"
  exit 64
fi

source_file=$1
output_base=$2
crop_y=$3
crop_height=$4
screen_points=${SCREEN_POINTS:-402}
crop_x=${5:-0}
crop_width=${6:-$screen_points}

if [[ ! -f $source_file ]]; then
  print -u2 "$0: no file at $source_file"
  exit 66
fi

# The size, the duration and the colour of the recording.
probe() {
  ffprobe -v error -select_streams v:0 -show_entries "$1" -of default=nw=1:nk=1 "$source_file"
}
source_width=$(probe stream=width)
source_height=$(probe stream=height)
duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$source_file")
primaries=$(probe stream=color_primaries)
transfer=$(probe stream=color_transfer)
matrix=$(probe stream=color_space)
# A recording with no colour tags is sRGB.
[[ $primaries == unknown || -z $primaries ]] && primaries=bt709
[[ $transfer == unknown || -z $transfer ]] && transfer=iec61966-2-1
[[ $matrix == unknown || -z $matrix ]] && matrix=bt709

scale=$(( source_width / screen_points ))
if (( source_width != scale * screen_points )); then
  print -u2 "$0: the recording is $source_width px wide, which is not a whole multiple of $screen_points pt. Set SCREEN_POINTS."
  exit 65
fi
source_points_height=$(( source_height / scale ))

if (( crop_width > screen_points || crop_x + crop_width > screen_points )); then
  print -u2 "$0: the crop is wider than the screen ($screen_points pt)."
  exit 65
fi
if (( crop_y + crop_height > source_points_height )); then
  print -u2 "$0: the crop ends at $(( crop_y + crop_height )) pt, below the screen ($source_points_height pt)."
  exit 65
fi

# The crop in the pixels of the recording.
px=$(( crop_x * scale ))
py=$(( crop_y * scale ))
pw=$(( crop_width * scale ))
ph=$(( crop_height * scale ))
# The size of the copies: the crop at 2x. Video sizes must be even, and they are, at 2x.
out_width=$(( crop_width * 2 ))
out_height=$(( crop_height * 2 ))

if $preview; then
  work_dir=$(mktemp -d)
  trap 'rm -rf "$work_dir"' EXIT
  frames=()
  for at in 0 0.5 0.95; do
    t=$(( duration * at ))
    ffmpeg -v error -y -ss $t -i "$source_file" -frames:v 1 \
      -vf "drawbox=x=${px}:y=${py}:w=${pw}:h=${ph}:color=magenta@0.9:t=$(( scale * 2 )),scale=${screen_points}:-1" \
      "$work_dir/$at.png"
    frames+=("$work_dir/$at.png")
  done
  preview_file="${TMPDIR:-/tmp}/web-video-preview-${output_base:t}.png"
  magick "${frames[@]}" -background white -splice 8x0 +append -chop 8x0 "$preview_file"
  print "Crop: x $crop_x, y $crop_y, $crop_width × $crop_height pt (a ${out_width} × ${out_height} px copy)."
  print "Preview: $preview_file"
  exit 0
fi

mkdir -p "${output_base:h}"

filters="fps=60,crop=${pw}:${ph}:${px}:${py},scale=${out_width}:${out_height}:flags=lanczos,format=yuv420p10le"
colour_flags=(-color_primaries $primaries -color_trc $transfer -colorspace $matrix -color_range tv)

# HEVC Main 10. The hvc1 tag lets Safari play it.
ffmpeg -v error -y -i "$source_file" -an -vf "$filters" \
  -c:v libx265 -preset slow -crf 22 \
  -x265-params "log-level=error:colorprim=${primaries}:transfer=${transfer}:colormatrix=${matrix}:range=limited" \
  "${colour_flags[@]}" -tag:v hvc1 -movflags +faststart "$output_base-hevc.mp4"

# AV1 10-bit. SVT_LOG=1 keeps the encoder to its errors.
SVT_LOG=1 ffmpeg -v error -y -i "$source_file" -an -vf "$filters" \
  -c:v libsvtav1 -preset 5 -crf 32 -svtav1-params "tune=0" \
  "${colour_flags[@]}" -movflags +faststart "$output_base-av1.mp4"

# The poster: the first frame, in the colour profile of the recording.
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
ffmpeg -v error -y -i "$source_file" -frames:v 1 -vf "crop=${pw}:${ph}:${px}:${py}" "$work_dir/frame.png"
if [[ $primaries == smpte432 ]]; then
  # Tag the frame as Display P3, so the WebP file keeps the wide-gamut colours.
  p3_profile=/System/Library/ColorSync/Profiles/Display\ P3.icc
  magick "$work_dir/frame.png" -profile "$p3_profile" "$work_dir/frame-p3.png"
  mv "$work_dir/frame-p3.png" "$work_dir/frame.png"
fi
magick "$work_dir/frame.png" -filter Lanczos -resize "${out_width}x${out_height}!" -depth 16 "$work_dir/poster.png"
cwebp -quiet -q 85 -metadata icc "$work_dir/poster.png" -o "$output_base-poster.webp"

# The codec strings for the `type` attribute of each source.
hevc_level=$(ffprobe -v error -select_streams v:0 -show_entries stream=level -of default=nw=1:nk=1 "$output_base-hevc.mp4")
av1_level=$(ffprobe -v error -select_streams v:0 -show_entries stream=level -of default=nw=1:nk=1 "$output_base-av1.mp4")
hevc_codecs="hvc1.2.4.L${hevc_level}.B0"
av1_codecs=$(printf 'av01.0.%02dM.10' $av1_level)

url_base="/${output_base#./}"
print "Wrote ${output_base}-hevc.mp4 ($(du -h "$output_base-hevc.mp4" | cut -f1)), ${output_base}-av1.mp4 ($(du -h "$output_base-av1.mp4" | cut -f1)) and ${output_base}-poster.webp."
print
print "{% render \"video.html\", base: \"$url_base\", width: $crop_width, height: $crop_height, hevc: \"$hevc_codecs\", av1: \"$av1_codecs\", label: \"…\" %}"
