# Changelog

## Unreleased

**Fixes**

- **A node with no `pivotAt` now actually rotates and scales about its own centre.** It was
  rotating about the SVG origin — the canvas's top-left corner. `applyInitialTransform` asked
  GSAP for `transformOrigin: "50% 50%"`, which GSAP resolves immediately against `getBBox()`,
  and at that point in `buildNode` the node's `<g>` is still empty and unattached (children,
  the rough.js art group, and drawOn's pen tip are all appended afterwards) — so the origin
  resolved to 0,0. Measured on a 60px square drawn at (140, 360): `rotateTo(45)` put it at
  roughly (-155, 353), fully off-canvas. The origin is now computed from the node's own
  authored geometry (`nodeBBox`), which is the same bbox centre `moveTo`/`moveAlong` anchor to,
  so a node's rotation centre and its placement reference are the same point by construction.
  Two things hid this for a long time: anything that needs a joint pivots explicitly, and a
  full 360-degree turn returns to identity regardless of its origin, so an unpivoted `spin`
  only misbehaves mid-tween. `sketch.walk`'s "un-pivoted arms visibly detach" note was this
  bug, not a limitation of arm rigging.

## 0.5.0

Driven by real feedback: five independent sessions (three on Claude Fable, two on GPT-5.6 Sol)
each built a 4+ minute film cold, then were asked for honest product feedback. This release is
the resulting punch list.

**New capabilities**

- Timeline labels and relative scheduling — the headline fix. `scene.label(name, seconds)`
  names a moment, and every `at` a node/camera op takes can be a label reference
  (`"liftoff"`, `"liftoff+0.4"`, `"liftoff-0.2"`) instead of a hand-computed absolute second.
  `node.endAt` (the end time of that node's own most recently added animation) chains a
  sequence without hand-summing durations. Answers the single most common complaint across
  all five feedback sessions: walls of hand-computed literals from everything living on one
  absolute-seconds timeline.
- `moveTo`/`moveAlong` take an `anchor?: "center" | "top" | "bottom" | "left" | "right"`
  option (default `"center"`, unchanged behavior) — fixes moving a lopsided character to a
  point by its bbox center landing it visibly off-mark.
- Radial gradient fills: `background: { stops, type: "radial" }` and a per-shape
  `fill.color` radial, for a light source's real falloff (candle, lantern, sun) instead of
  several flat-colored ellipses stacked at decreasing alpha.
- `sketch.ellipse(cx, cy, rx, ry, style, vertices?)` — a true wobble-free ellipse/circle;
  `sketch.blob()`'s own wobble floor (~15% of radius) never reaches zero, so this was the
  missing clean-disc primitive every project was hand-rolling.
- Particles: `shape?: "dot" | "streak"` (a short line along each particle's own
  instantaneous velocity, for rain/sparks/debris — a fast-moving dot still reads as a dot,
  not motion) and `moveTo?: {x, y, duration, ease?}` (the emitter's own spawn point moves
  along a path, so particles can trail a moving source without re-authoring that source's
  motion a second time).
- `node.rotateBy(degrees, opts)` / `camera().panBy(dx, dy, opts)` — relative ops using GSAP's
  own `"+="` resolution against whatever the property's live value is when the tween starts,
  the same pattern `moveBy` already used. `duration: 0` on any animation now means an instant
  set instead of the shortest tween GSAP can manage.
- `scene.duration(seconds)` declares the length a scene is intended to be, so the linter can
  warn when an op is scheduled to end past it — a silent overrun otherwise only noticed by
  the rendered video mysteriously running long.
- `node.lintIgnore(...checks)` suppresses a named Tier 0 check on that one node — for real
  intentional cases (an eye deliberately overlapping a head) instead of the check going
  silent everywhere.

**New lint checks (Tier 0)**

- Tween conflict: two animations writing the same property (`x`/`y`, `rotation`,
  `scaleX`/`scaleY`, `opacity`) on the same node over an overlapping window used to silently
  fight, with no error anywhere — the single most common real bug this library produces at
  scale. Now caught statically, per property/axis.
- IK reach-clamp: an `ikTo` target past a limb's own `len1 + len2` used to clamp silently
  (a subtle pop at moderate overage, a rigid "plank arm" that never bends at full overage).
  Now flagged at build time with the actual overage in pixels.
- Overlap check now distinguishes containment (one shape mostly inside a much larger one —
  demoted to `info`) from a real collision between comparably-sized shapes (`warn`) — cuts
  the noise from projects where nearly every finding was an intentional nested shape.

**Fixes**

- `drawOn()` silently no-op'd on a plain `Group` (there's no single path to reveal) with no
  warning anywhere — now a static lint check pointing at `.stagger({ effect: "drawOn" })`.
- `camera.follow()` ending before its scene did caused a visible snap-back to an earlier
  pan/zoom's held value on every seek past the follow's nominal end — the fix tracks which
  follow (if any) actually has the latest start time superseded by a real later op, not a
  fixed `[start, start+duration]` window.
- Inside a `Film`, a `transition: "fade"` cut's sound now gain-ramps through the same window
  its visuals already crossfade across (outgoing 1→0, incoming 0→1) instead of both scenes'
  sound playing at full authored volume through the overlap — an audible pop at the cut, and
  a moment louder than either scene alone.

**New examples**

- `examples/gallery/ellipse-shapes.ts`, `scheduling.ts`, `particle-streak-follow.ts`.

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
