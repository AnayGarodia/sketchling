#!/usr/bin/env bash
# Regenerates the whole gallery from the scenes, end to end.
#
#   gallery/build.sh           # everything: npm build, every scene's still, all 12 clips
#   gallery/build.sh stills    # just re-render every scene to gallery/work/stills/
#   gallery/build.sh clips     # just re-export the clips listed in gallery/picks.txt
#   gallery/build.sh sheets    # contact sheets (6 frames each) of the picks, for reviewing motion
#
# Everything under gallery/work/ is scratch (git-ignored); gallery/clips/ is the committed
# output. Needs ffmpeg on PATH — the same dependency `sketchling render --video` already has.
set -euo pipefail
cd "$(dirname "$0")/.."

SCENES_DIR=gallery/scenes
WORK=gallery/work
CLIPS=gallery/clips
PICKS=gallery/picks.txt
JOBS="${JOBS:-4}" # concurrent Chromium renders; 4 is comfortable on a laptop

# One source of truth for the loop window (gallery/loop.mjs), read here as frame numbers.
eval "$(node -e '
import("./gallery/loop.mjs").then((m) => {
  const start = Math.round(m.LOOP_START * m.CLIP_FPS);
  console.log(`FPS=${m.CLIP_FPS}`);
  console.log(`LOOP_START=${m.LOOP_START}`);
  console.log(`LOOP_LEN=${m.LOOP_LEN}`);
  // A third of the way into the cycle, not its first frame: anything that falls, drifts or
  // ripples is transparent exactly at the seam (which is how those motions close a loop at
  // all), so a still rendered there is a still with the rain missing.
  console.log(`STILL_AT=${m.LOOP_START + m.LOOP_LEN / 3}`);
  console.log(`START_FRAME=${start}`);
  console.log(`END_FRAME=${start + Math.round(m.LOOP_LEN * m.CLIP_FPS)}`);
});
')"
export STILL_AT WORK

# Every scene in gallery/scenes/, minus the leading-underscore convention for shared
# non-scene files (the same rule scripts/smoke-render.mjs uses on examples/).
scenes() { find "$SCENES_DIR" -name '*.ts' -not -name '_*' | sort; }
picks() { grep -v -e '^[[:space:]]*#' -e '^[[:space:]]*$' "$PICKS"; }

# Rendered a third of the way into the loop window (see STILL_AT above). A worker that fails
# leaves its stderr behind as <name>.err,
# which is also how the caller counts failures after waiting — simpler and more portable than
# collecting exit codes from background pids (and BSD xargs -I can't take a script this long).
render_still() {
  local scene="$1" name
  name=$(basename "$scene" .ts)
  if node bin/sketchling.js render "$scene" --at "$STILL_AT" --out "$WORK/stills/$name.png" --json >/dev/null 2>"$WORK/stills/$name.err"; then
    echo "    ok   $name"
    rm -f "$WORK/stills/$name.err"
  else
    echo "    FAIL $name (see $WORK/stills/$name.err)"
  fi
}

stills() {
  mkdir -p "$WORK/stills"
  rm -f "$WORK"/stills/*.err
  echo "==> rendering $(scenes | wc -l | tr -d ' ') scenes to $WORK/stills (JOBS=$JOBS)"
  local n=0
  for scene in $(scenes); do
    render_still "$scene" &
    n=$((n + 1))
    if [ $((n % JOBS)) -eq 0 ]; then wait; fi
  done
  wait
  local failed
  failed=$(find "$WORK/stills" -name '*.err' | wc -l | tr -d ' ')
  if [ "$failed" != "0" ]; then echo "==> $failed scene(s) FAILED to render"; return 1; fi
}

clips() {
  mkdir -p "$CLIPS" "$WORK/full"
  echo "==> exporting $(picks | wc -l | tr -d ' ') clips: frames $START_FRAME..$((END_FRAME - 1)), ${LOOP_LEN}s at ${FPS}fps"
  for name in $(picks); do
    scene="$SCENES_DIR/$name.ts"
    [ -f "$scene" ] || { echo "    no such scene: $scene" >&2; exit 1; }

    # A y4m intermediate rather than an mp4: the CLI encodes to whatever extension it is
    # handed, and h264 -> trim -> h264 is two lossy generations on line art that shows the
    # ringing. yuv4mpegpipe is raw frames in a container, so the cut below is the only encode.
    echo "    $name: rendering timeline"
    node bin/sketchling.js render "$scene" --video "$WORK/full/$name.y4m" --fps "$FPS" --json >/dev/null

    # Frame-exact cut, not a timestamp seek: [LOOP_START, LOOP_END). end_frame is exclusive,
    # so the frame that would duplicate the first one is dropped and playback wraps cleanly.
    echo "    $name: cutting the loop window"
    ffmpeg -loglevel error -y -i "$WORK/full/$name.y4m" \
      -vf "trim=start_frame=$START_FRAME:end_frame=$END_FRAME,setpts=PTS-STARTPTS" \
      -an -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
      "$CLIPS/$name.mp4"

    # Two passes over the same frames: one to pick a palette for this clip specifically, one
    # to map onto it. A generic 256-color palette bands these flat washes badly.
    echo "    $name: gif"
    ffmpeg -loglevel error -y -i "$CLIPS/$name.mp4" \
      -vf "fps=$FPS,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
      -loop 0 "$CLIPS/$name.gif"

    printf '    %s: %s mp4, %s gif\n' "$name" \
      "$(du -h "$CLIPS/$name.mp4" | cut -f1 | tr -d ' ')" \
      "$(du -h "$CLIPS/$name.gif" | cut -f1 | tr -d ' ')"
  done
  echo "==> $CLIPS total: $(du -sh "$CLIPS" | cut -f1 | tr -d ' ')"
}

# Rewrites index.html's clip grid in place, between its two marker comments, so the page can't
# drift out of sync with picks.txt. Everything else in that file is hand-written.
page() {
  local tmp="$WORK/index.html.tmp"
  mkdir -p "$WORK"
  {
    awk '{ print } /<!-- CLIPS:BEGIN -->/ { exit }' gallery/index.html
    for name in $(picks); do
      printf '        <figure>\n'
      printf '          <video src="clips/%s.mp4" autoplay loop muted playsinline preload="metadata"></video>\n' "$name"
      printf '          <figcaption>%s</figcaption>\n' "$name"
      printf '        </figure>\n'
    done
    awk '/<!-- CLIPS:END -->/ { f = 1 } f' gallery/index.html
  } >"$tmp"
  mv "$tmp" gallery/index.html
  echo "==> wrote $(picks | wc -l | tr -d ' ') figures into gallery/index.html"
}

sheets() {
  mkdir -p "$WORK/sheets"
  echo "==> contact sheets (6 frames each) for the picks"
  local n=0
  for name in $(picks); do
    node bin/sketchling.js contact-sheet "$SCENES_DIR/$name.ts" --out "$WORK/sheets/$name.png" >/dev/null &
    n=$((n + 1))
    if [ $((n % JOBS)) -eq 0 ]; then wait; fi
  done
  wait
  echo "    -> $WORK/sheets"
}

case "${1:-all}" in
  all) npm run build; stills; clips; page ;;
  stills) stills ;;
  clips) clips; page ;;
  page) page ;;
  sheets) sheets ;;
  *) echo "usage: gallery/build.sh [all|stills|clips|page|sheets]" >&2; exit 2 ;;
esac
