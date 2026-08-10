# Changelog

## Unreleased

- `sketch.shade(base, {from, amount})`: derives a real light-direction gradient (highlight →
  base → shadow) from one base color instead of hand-picking 2-3 hex stops per shape.
- `sketch.walk()`'s new optional `arms` field: a phase-locked contralateral arm counter-swing
  for rigged walk cycles, instead of arms sitting motionless while the legs walk.
- New showcase scenes: `quiet-crossing.ts`, `quiet-ride.ts` (a restrained silhouette
  register — muted color, naturalistic proportions, patient timing), `dawn-fisherman.ts`,
  `kite-field.ts`, `lighthouse-watch.ts`, `park-bench.ts`, `market-street.ts`,
  `summit-sunrise.ts`, `rain-city-night.ts`, `campfire-story.ts`, `snow-village.ts`,
  `moonlit-sail.ts`.
- New gallery demos: `shade-helper.ts`, `walk-cycle-arms.ts`, `fishing-cast.ts` (natural
  hand-held-prop motion via `springTo` + `sketch.connector`, instead of a rigid snap-to-
  target with no follow-through).
- `.pivotAt()` combined with `.initial({x, y})` on the same node fixed — the pivot's own doc
  comment called it an "absolute canvas point," which was only true when the node's own
  translate was zero.

## 0.3.0

- WebGL/Three.js `"lit3d"`/`"toon3d"` rendering backend: real directional + ambient lighting,
  cast shadows, and cel-shaded banding with an inverted-hull outline, driven by the same
  `spin3d`/`moveTo`/`moveBy`/`scaleTo`/`squashTo` ops as everything else.
- `sketch.sound()`: a scheduled note/hit primitive on the same scene-global timeline,
  synthesized offline and muxed into `--video` export.
- `texture` split out from `look` as its own independent axis (`"watercolor"` /
  `"grain"` / `"pixel"`) — previously coupled to `look` in a way that made some real
  combinations (e.g. `look: "ink"` hachure fills plus `texture: "grain"`) impossible.

## 0.2.0

- `sketch.particles()`: a closed-form (non-simulated) particle emitter — sparks, dust,
  confetti, snow, firework bursts.
- `sketch.quickRig()`: auto-derives a headroom-safe two-legged rig from a drawn body's own
  bounding box instead of hand-picked hip coordinates and leg lengths.
- Gradient `fill.color` support (`{stops, direction}`, the same shape `scene.background`
  already took) for real per-shape volumetric shading.

## 0.1.1

- Fixes the broken 0.1.0 install (a fresh `npm install sketchling` had no `src/` to bundle
  the render harness from — pre-built and shipped `dist/harness.js` instead).

## 0.1.0

Initial release: the core scene graph (`Stroke`/`Blob`/`Group`), `drawOn`'s mask-based
reveal and line-boil, `sketch.limb`/`sketch.walk` IK rigging and procedural gait,
`springTo`/`sketch.connector` secondary motion, `sketch.film()` for cutting scenes
together, and the `"ink"`/`"flat"`/`"clay"` look axis.
