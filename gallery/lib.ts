// Shared timing contract for every gallery scene, plus the handful of authoring helpers
// that contract needs. Not a scene — `build.sh` skips it, the same way smoke-render.mjs
// skips examples/story/_shared.ts.
//
// THE LOOP CONTRACT
// ----------------
// A gallery scene is two phases on one timeline:
//
//   [0 .. LOOP_START)        the reveal — strokes drawing themselves in, entrances
//   [LOOP_START .. LOOP_END) the loop — cyclic motion that ends in exactly the state it
//                            started in, so the exported clip plays back seamlessly
//
// `build.sh` renders the whole timeline and then cuts frames [LOOP_START, LOOP_END) out of
// it. The numbers themselves live in loop.mjs (plain JS, so the shell scripts read the same
// source the scenes are authored against) along with why they aren't round-looking.
//
// Everything else is ordinary sketchling. The helpers here only exist because "return to
// the exact state you started in" is fiddly to hand-schedule 40-odd times.
//
// ONE RULE IF YOU HAND-AUTHOR OPS IN THE LOOP WINDOW: GSAP does not render a tween at
// exactly its own start time, so the state on the loop's FIRST frame is the state BEFORE any
// loop op has run — the node's authored/initial() transform. The last op in the window has to
// land back on exactly that, not on "whatever the first op starts from". Relative ops
// (`moveBy`, `rotateBy`) sum to zero and are safe by construction; absolute ones (`moveTo`,
// `rotateTo`, `scaleTo`, `fadeTo`) need their final target to equal the resting value, which
// is what every helper below is careful to do. `gallery/check-loop.sh` proves it either way.

import type { SketchNode } from "../src/index.js";
import { CLIP_FPS, LOOP_END, LOOP_LEN, LOOP_START } from "./loop.mjs";

export { CLIP_FPS, LOOP_END, LOOP_LEN, LOOP_START };

/** Sub-cycles of the loop window: `n` equal beats, each of which must return to its own
 * starting state. Any divisor of LOOP_LEN works — 1 (3.3s), 2 (1.65s), 3 (1.1s),
 * 4 (0.825s), 5 (0.66s), 6 (0.55s), 10 (0.33s). */
export function beats(n: number): { at: number; dur: number }[] {
  const dur = LOOP_LEN / n;
  return Array.from({ length: n }, (_, i) => ({ at: LOOP_START + i * dur, dur }));
}

/** Rotation swaying between -deg and +deg, `n` times across the loop. The neutral pose is
 * set to -deg so the shape is revealed already at the start of its own swing — otherwise
 * the first beat would start from 0 and the loop would never come back to it. */
export function swayRotate(node: SketchNode, deg: number, n = 2, ease = "sine.inOut"): void {
  node.initial({ rotation: -deg });
  for (const { at, dur } of beats(n)) {
    node.rotateTo(deg, { at, duration: dur / 2, ease });
    node.rotateTo(-deg, { at: at + dur / 2, duration: dur / 2, ease });
  }
}

/** Position drifting out to (dx, dy) and back, `n` times across the loop. Relative, so it
 * composes with wherever the node already sits. */
export function swayMove(node: SketchNode, dx: number, dy: number, n = 2, ease = "sine.inOut"): void {
  for (const { at, dur } of beats(n)) {
    node.moveBy(dx, dy, { at, duration: dur / 2, ease });
    node.moveBy(-dx, -dy, { at: at + dur / 2, duration: dur / 2, ease });
  }
}

/** Uniform scale pulsing to `s` and back — a breath, a glow swelling, a heartbeat. */
export function pulseScale(node: SketchNode, s: number, n = 2, ease = "sine.inOut"): void {
  for (const { at, dur } of beats(n)) {
    node.scaleTo(s, { at, duration: dur / 2, ease });
    node.scaleTo(1, { at: at + dur / 2, duration: dur / 2, ease });
  }
}

/** Opacity swinging between `from` and `to` — a flicker, a pulse, a blink. `from` is also
 * the resting opacity, so the node reads correctly before the loop starts. */
export function pulseFade(node: SketchNode, from: number, to: number, n = 2, ease = "sine.inOut"): void {
  node.initial({ opacity: from });
  for (const { at, dur } of beats(n)) {
    node.fadeTo(to, { at, duration: dur / 2, ease });
    node.fadeTo(from, { at: at + dur / 2, duration: dur / 2, ease });
  }
}

/** A full turn (or `turns` of them) spread linearly across the whole loop window — a wheel,
 * a spinner, a record. 360 degrees renders identically to 0, so the seam is exact. */
export function spin(node: SketchNode, turns = 1, ease = "none"): void {
  node.rotateBy(360 * turns, { at: LOOP_START, duration: LOOP_LEN, ease });
}

/** An expanding ring that fades out and then restarts small — a water ripple, a sonar ping,
 * a click, a wifi arc. The reset back to its authored size happens during the tail of each
 * beat, while the ring is already fully transparent, which is what makes an inherently
 * one-directional motion loop at all. */
export function ripple(node: SketchNode, to = 1.6, n = 2, peak = 0.55): void {
  node.initial({ opacity: 0 });
  for (const { at, dur } of beats(n)) {
    node.scaleTo(to, { at, duration: dur * 0.8, ease: "sine.out" });
    node.scaleTo(1, { at: at + dur * 0.8, duration: dur * 0.2, ease: "none" });
    node.fadeTo(peak, { at, duration: dur * 0.2, ease: "sine.out" });
    node.fadeTo(0, { at: at + dur * 0.2, duration: dur * 0.55, ease: "sine.in" });
  }
}

/** Non-uniform scale pulsing to (sx, sy) and back — breathing, a bellows, a heartbeat.
 * `.pivotAt()` the node first if it should swell from its base instead of its middle. */
export function pulseSquash(node: SketchNode, sx: number, sy: number, n = 2, ease = "sine.inOut"): void {
  for (const { at, dur } of beats(n)) {
    node.squashTo(sx, sy, { at, duration: dur / 2, ease });
    node.squashTo(1, 1, { at: at + dur / 2, duration: dur / 2, ease });
  }
}

/** One pass of something travelling (dx, dy) and fading as it goes, over a single beat — a
 * raindrop, a petal, a spark, a rising "z". It flies back to its start during the tail of the
 * beat, by which point it is fully transparent, so a one-way motion becomes a cycle. Take the
 * beat from `beats(n)`, which is what makes staggering several of these across the loop (a
 * different beat each, rather than all of them in lockstep) a one-liner. */
export function driftOnce(
  node: SketchNode,
  dx: number,
  dy: number,
  beat: { at: number; dur: number },
  opts: { ease?: string; peak?: number } = {}
): void {
  const { ease = "none", peak = 1 } = opts;
  const { at, dur } = beat;
  node.initial({ opacity: 0 });
  node.moveBy(dx, dy, { at, duration: dur * 0.8, ease });
  node.moveBy(-dx, -dy, { at: at + dur * 0.8, duration: dur * 0.2, ease: "none" });
  node.fadeTo(peak, { at, duration: dur * 0.15, ease: "none" });
  node.fadeTo(0, { at: at + dur * 0.6, duration: dur * 0.2, ease: "none" });
}

/** `driftOnce` on every beat — the same node falling/rising over and over. */
export function fallLoop(
  node: SketchNode,
  dx: number,
  dy: number,
  n = 2,
  opts: { ease?: string; peak?: number } = {}
): void {
  for (const beat of beats(n)) driftOnce(node, dx, dy, beat, opts);
}

/** `laps` complete circuits of a closed path across the loop window — a fish circling, a bee
 * on a figure-eight, a hand on a dial. Whole laps only: half a lap would leave the node on
 * the far side of the path at the seam.
 *
 * `turn` is the net rotation, in degrees, the node should accumulate per lap (+/-360 for a
 * `ringPath`, 0 for anything that comes back facing the way it left). It is authored as its
 * own linear `rotateBy` rather than through MotionPathPlugin's `rotate: true`, deliberately:
 * autoRotate reads the tangent of an OPEN curve, so at the end of a closed path it sees the
 * one-sided tangent of the last segment instead of the first — measured at 16 steps that is a
 * ~22 degree flip at the seam, the one thing in this whole library that broke a loop. A
 * constant-speed circuit turns at a constant rate anyway, and 360 renders identically to 0. */
export function lapAlong(
  node: SketchNode,
  path: [number, number][],
  laps = 1,
  opts: { turn?: number; ease?: string } = {}
): void {
  const { turn = 0, ease = "none" } = opts;
  const dur = LOOP_LEN / laps;
  // Anchor the node onto the path's own start point up front. moveAlong places a node's bbox
  // CENTER on each path point, so its position under the tween is offset from its authored
  // position by (path start - bbox center) — a pixel or two for anything not authored dead on
  // the path. That offset is present on the loop's LAST frame (the tween is at progress 1) but
  // not on its FIRST (GSAP does not render a tween at exactly its own start time — measured,
  // not assumed: transform was matrix(1,0,0,1,0,0) at LOOP_START and matrix(1,0,0,1,-1,0) at
  // LOOP_END). Same point on the path, a sub-pixel apart on screen, and the seam misses. A
  // zero-duration pass at t=0 applies the offset before anything is even drawn.
  node.moveAlong(path, { at: 0, duration: 0 });
  for (let i = 0; i < laps; i++) {
    node.moveAlong(path, { at: LOOP_START + i * dur, duration: dur, ease });
  }
  if (turn !== 0) node.rotateBy(turn * laps, { at: LOOP_START, duration: LOOP_LEN, ease: "none" });
}

/** A closed elliptical path for `lapAlong`, starting (and ending) at the TOP of the ellipse —
 * where the tangent is exactly horizontal, so a node authored facing right (`dir: 1`, running
 * clockwise on screen) sits at its own travel angle from frame one with no starting rotation
 * to work out. `dir: -1` runs counter-clockwise and wants a node authored facing left. */
export function ringPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opts: { steps?: number; dir?: 1 | -1 } = {}
): [number, number][] {
  const { steps = 16, dir = 1 } = opts;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = -Math.PI / 2 + dir * (i / steps) * Math.PI * 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as [number, number];
  });
}

/** One eye-blink at `at` — a fast squash to a closed lid and back. Sits inside the loop
 * window and returns to (1, 1), so it needs no special seam handling. */
export function blink(node: SketchNode, at: number, close = 0.1): void {
  node.squashTo(1, close, { at, duration: 0.09, ease: "power2.in" });
  node.squashTo(1, 1, { at: at + 0.09, duration: 0.12, ease: "power2.out" });
}

/** Draws a list of shapes on one after another, spread evenly across [from, to] so the
 * whole reveal always lands before the loop window opens no matter how many shapes there
 * are. Returns the time the last one finishes. */
export function drawIn(
  nodes: SketchNode[],
  opts: { from?: number; to?: number; each?: number; ease?: string } = {}
): number {
  const { from = 0, to = LOOP_START - 0.1, ease } = opts;
  const n = nodes.length;
  if (n === 0) return from;
  const step = n > 1 ? (to - from) / n : to - from;
  const each = opts.each ?? Math.min(0.6, step * 1.35);
  nodes.forEach((node, i) => node.drawOn({ at: from + i * step, duration: each, ease }));
  return from + (n - 1) * step + each;
}

/** Fades a list of shapes in together but not quite — a short stagger, for the many small
 * scattered things (stars, grass, dots) that a one-at-a-time drawIn would spend the whole
 * reveal budget on. */
export function appearIn(
  nodes: SketchNode[],
  opts: { from?: number; to?: number; each?: number } = {}
): number {
  const { from = 0.2, to = LOOP_START - 0.4, each = 0.5 } = opts;
  const n = nodes.length;
  if (n === 0) return from;
  const step = n > 1 ? (to - from) / n : 0;
  nodes.forEach((node, i) => node.appear({ at: from + i * step, duration: each }));
  return from + (n - 1) * step + each;
}

/** mulberry32 — a seeded PRNG, so a scattered field (stars, grass, rain) is the same field
 * on every render. Math.random would make "did my edit do that?" unanswerable. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
