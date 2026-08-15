#!/usr/bin/env bash
# Builds marketing/magic-moment.mp4 (1920x1080) and marketing/magic-moment-square.mp4
# (1080x1080) end to end, from nothing but this repository.
#
#   ./marketing/build.sh
#
# Pipeline:
#   1. build the library, so the CLI renders the current src/
#   2. render marketing/morning-plant.ts to a 30fps video with the sketchling CLI, and pull
#      its frames back out at the size the clip presents them (lanczos, once, up front)
#   3. composite every frame of the clip (typed prompt, streaming code, framed illustration,
#      end card) with marketing/compose.mjs — one Chromium page driven frame by frame
#   4. encode each format to h264 / yuv420p / 30fps with no audio track
#
# Requires ffmpeg on PATH and `npm install` already run (Playwright's Chromium included).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
WORK="$ROOT/marketing/.build"
SCENE="marketing/morning-plant.ts"
FPS=30

# The illustration is presented at exactly this size in the 16:9 layout (marketing/compose.mjs
# LAYOUTS["16x9"].art) — 2.2x the scene's own 640x400 canvas. Upscaling here with lanczos,
# rather than letting the browser or the encoder do it per frame, keeps the ink edges clean.
ART_W=1408
ART_H=880

rm -rf "$WORK"
mkdir -p "$WORK/art"

echo "==> 1/4  building the library"
npm run --silent build

# A .y4m intermediate, not an .mp4: `--video` hands its frames to ffmpeg, which for y4m stores
# them raw. Going through h264 here instead costs a real generation of quality (measured 37dB
# vs 43dB against a direct --out render of the same timestamp) and it is the paper grain and
# the ink edges that pay for it, since those are exactly what an inter-frame codec smooths.
echo "==> 2/4  rendering $SCENE with the sketchling CLI"
node bin/sketchling.js render "$SCENE" --video "$WORK/scene.y4m" --fps "$FPS" --json > "$WORK/scene.json"
python3 - "$WORK/scene.json" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
print(f"    {r['duration']:.2f}s timeline, {r['output']['width']}x{r['output']['height']} canvas")
for f in r["lint"]:
    print(f"    lint [{f['level']}]: {f['message']}")
PY
ffmpeg -y -loglevel error -i "$WORK/scene.y4m" \
  -vf "scale=${ART_W}:${ART_H}:flags=lanczos" -fps_mode passthrough "$WORK/art/%06d.png"
rm -f "$WORK/scene.y4m" # raw frames, ~150MB, and the PNGs above are what the compositor reads
echo "    $(find "$WORK/art" -name '*.png' | wc -l | tr -d ' ') illustration frames"

encode() { # <frames dir> <output>
  ffmpeg -y -loglevel error -framerate "$FPS" -i "$1/%06d.png" \
    -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -profile:v high \
    -movflags +faststart "$2"
}

echo "==> 3/4  compositing 1920x1080"
node marketing/compose.mjs --format 16x9 --code "$SCENE" \
  --scene-frames "$WORK/art" --out "$WORK/frames-16x9"
encode "$WORK/frames-16x9" "$ROOT/marketing/magic-moment.mp4"

echo "==> 4/4  compositing 1080x1080"
node marketing/compose.mjs --format 1x1 --code "$SCENE" \
  --scene-frames "$WORK/art" --out "$WORK/frames-1x1"
encode "$WORK/frames-1x1" "$ROOT/marketing/magic-moment-square.mp4"

echo
for f in marketing/magic-moment.mp4 marketing/magic-moment-square.mp4; do
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames \
    -show_entries format=duration,size,nb_streams -of default=nw=1 "$f" | sed "s|^|  $f  |"
done
