#!/usr/bin/env bash
# Proves a scene's loop actually closes: renders the first frame of the loop window and the
# frame one full loop later, and compares them. Renders are deterministic (seeded jitter,
# randomize:false eases, precomputed springs), so "identical bytes" is a real, available
# guarantee here — not an approximation.
#
#   gallery/check-loop.sh gallery/scenes/koi-pond.ts [...more scenes]
#
# Byte-identical is the pass everything should hit. The one exception the threshold below
# exists for: a node carried around by a full 360-degree rotateBy lands on a matrix whose
# sin(360deg) is -2.4e-16 rather than 0, which can flip the antialiasing of a pixel or two
# along one edge. That reads as ~70dB PSNR — three orders of magnitude below anything an h264
# or GIF encode preserves, let alone an eye. Anything genuinely mis-seamed (a shape a pixel
# out of place, a fade caught at the wrong opacity) lands in the 25-40dB range instead.
#
# A mismatch prints the PSNR and leaves the two frames plus a difference image in
# gallery/work/loop-check/ to look at.
set -uo pipefail
cd "$(dirname "$0")/.."

START=$(node -e 'import("./gallery/loop.mjs").then(m => console.log(m.LOOP_START))')
END=$(node -e 'import("./gallery/loop.mjs").then(m => console.log(m.LOOP_END))')
OUT=gallery/work/loop-check
mkdir -p "$OUT"

fail=0
for scene in "$@"; do
  name=$(basename "$scene" .ts)
  node bin/sketchling.js render "$scene" --at "$START" --out "$OUT/$name-a.png" --quiet-lint >/dev/null || { echo "$name: RENDER FAILED"; fail=1; continue; }
  node bin/sketchling.js render "$scene" --at "$END" --out "$OUT/$name-b.png" --quiet-lint >/dev/null || { echo "$name: RENDER FAILED"; fail=1; continue; }
  if cmp -s "$OUT/$name-a.png" "$OUT/$name-b.png"; then
    echo "$name: loop closes (frames at ${START}s and ${END}s are byte-identical)"
    rm -f "$OUT/$name-a.png" "$OUT/$name-b.png"
    continue
  fi
  psnr=$(ffmpeg -loglevel info -i "$OUT/$name-a.png" -i "$OUT/$name-b.png" -filter_complex psnr -f null - 2>&1 | grep -o 'average:[0-9.]*' | head -1 | cut -d: -f2)
  if [ -n "$psnr" ] && awk "BEGIN{exit !($psnr >= 55)}"; then
    echo "$name: loop closes (${psnr}dB — sub-pixel antialiasing on a 360-degree turn, see header)"
    rm -f "$OUT/$name-a.png" "$OUT/$name-b.png"
    continue
  fi
  ffmpeg -loglevel error -y -i "$OUT/$name-a.png" -i "$OUT/$name-b.png" \
    -filter_complex "blend=all_mode=difference,format=gray,eq=contrast=8" -frames:v 1 "$OUT/$name-diff.png"
  echo "$name: LOOP SEAM DIFFERS (${psnr:-no psnr}dB) -> $OUT/$name-diff.png"
  fail=1
done
exit $fail
