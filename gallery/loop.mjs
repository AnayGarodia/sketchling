// The gallery's loop contract, as plain JS so the build scripts can read the same numbers
// the scenes are authored against instead of keeping a second copy of them in shell. gallery/
// lib.ts re-exports these, so a scene never imports this file directly.
//
// Why these exact numbers (all three constraints have to hold at once):
//   * LOOP_LEN is a multiple of 0.33s — the renderer's line boil cycles through 3 variants
//     every 0.11s (src/render/boil.ts), so any other length lands the loop's last frame on a
//     different variant than its first and the whole drawing twitches once per cycle.
//   * LOOP_LEN is a multiple of 0.1s — the "clay" look quantizes seek time to a ~10fps hold
//     (CLAY_FRAME_HOLD in src/render/renderer.ts), so clay scenes loop on the same window.
//   * LOOP_START and LOOP_LEN are whole numbers of frames at CLIP_FPS, so build.sh can cut
//     the clip on exact frame boundaries rather than resampling.
export const CLIP_FPS = 30;
export const LOOP_START = 3.0; // frame 90 — everything before this is the drawing-on reveal
export const LOOP_LEN = 3.3; // 99 frames = 10 boil cycles = 33 clay holds
export const LOOP_END = LOOP_START + LOOP_LEN;
