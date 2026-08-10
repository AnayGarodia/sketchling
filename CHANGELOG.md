# Changelog

## 0.4.0

**New capabilities**

- `sketch.shade(base, {from, amount})`: derives a real light-direction gradient (highlight,
  base color, shadow) from one base color instead of hand picking two or three hex stops per
  shape.
- `sketch.walk()`'s new optional `arms` field: a phase-locked contralateral arm counter-swing
  for rigged walk cycles, instead of arms sitting motionless while the legs walk.

**New examples**

- *The Lantern Maker* (`examples/story/lantern-maker.ts`): a nine scene, three minute short
  film, the longest single piece in the repo, built cold by Devin.
- Ten new showcase scenes, also built cold: `quiet-crossing.ts`, `quiet-ride.ts`,
  `dawn-fisherman.ts`, `kite-field.ts`, `lighthouse-watch.ts`, `park-bench.ts`,
  `market-street.ts`, `summit-sunrise.ts`, `rain-city-night.ts`, `campfire-story.ts`,
  `snow-village.ts`, `moonlit-sail.ts`.
- Three new gallery demos: `shade-helper.ts`, `walk-cycle-arms.ts`, and `fishing-cast.ts`
  (natural hand held prop motion via `springTo` plus `sketch.connector`, instead of a rigid
  snap to target with no follow through).

**Renderer decomposition and tooling**

- `src/render/renderer.ts` split from a 1,650 line monolith into an 550 line spine plus one
  module per subsystem, with 25 new unit tests over the deterministic core.
- ESLint added, plus a `sketchling validate`/`inspect`/`contact-sheet` agent tooling surface
  with a manifest contract.
- CI now runs build, lint, unit tests, a render smoke test across every example, and a
  two-render byte identical determinism check on every push and PR.

**Fixes**

- `.pivotAt()` combined with `.initial({x, y})` on the same node: the pivot's own doc comment
  called it an absolute canvas point, which was only true when the node's own translate was
  zero.
- `moveBy`: two overlapping `moveBy` calls on the same node used to fight over any axis both
  happened to touch, since `+=0` is still a live tween. A hand built walk cycle (stride plus
  its own vertical bob) could cover a fraction of its intended distance with no error anywhere.
- `drawOn`: the reveal mask's row count is capped at 16, so a tall filled shape could end up
  with permanent horizontal gaps in it, not just during the reveal.
- `springTo`: a node placed with `initial({x, y})` and then sprung would snap to its
  untranslated origin on frame one instead of starting from its actual resting position.
- Particle emitters with a gradient `fill.color` rendered a broken color instead of collapsing
  to a flat one, unlike every other shape type.
- A camera framing that pans past the world's own edge now gets a direct lint warning instead
  of silently showing bare background where the content runs out.
- `Blob` no longer burns a throwaway `Math.random()` per build, so every scene renders
  byte identically run to run.

**Docs**

- New CONTRIBUTING.md and this changelog.
- README rewritten around the showcase videos instead of leading with API detail.
- GitHub topics added for discoverability.

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
