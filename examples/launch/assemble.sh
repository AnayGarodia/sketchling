#!/usr/bin/env bash
# Pads every source clip (scenes render at their own canvas size) to a common W×H, then
# concatenates them via the concat demuxer. Padding is required first — concat can't join
# clips of differing resolution.
set -euo pipefail

W=640
H=480
PAD_COLOR="0xefe8d8"
OUT_DIR="/tmp/sketchling-launch"
mkdir -p "$OUT_DIR/norm"

CLIPS=("$@")
if [ ${#CLIPS[@]} -eq 0 ]; then
  echo "usage: assemble.sh clip1.mp4 clip2.mp4 ..." >&2
  exit 1
fi

LIST_FILE="$OUT_DIR/concat-list.txt"
: > "$LIST_FILE"

i=0
for clip in "${CLIPS[@]}"; do
  i=$((i + 1))
  norm="$OUT_DIR/norm/$(printf '%02d' "$i").mp4"
  ffmpeg -y -i "$clip" \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${PAD_COLOR},setsar=1,fps=30" \
    -c:v libx264 -pix_fmt yuv420p -profile:v high -crf 18 \
    "$norm" -loglevel error
  echo "file '$norm'" >> "$LIST_FILE"
done

ffmpeg -y -f concat -safe 0 -i "$LIST_FILE" -c copy "$OUT_DIR/final.mp4" -loglevel error
echo "Assembled -> $OUT_DIR/final.mp4"
