---
name: sketchling
description: Use when drawing or animating hand-drawn, Notion/Anthropic-style illustrations in code — building a scene, choreographing a drawOn animation, hand-lettering text, or cutting several scenes into one story/film with sketchling.
---

# sketchling

A hand-drawn illustration and animation vocabulary, rendered through rough.js + GSAP. Like Manim: a toolbox of primitives and animations, not a pipeline. Nothing below is mandatory — pick whatever combination of tools serves what you're actually drawing. The defaults (pacing, easing, single-pen scheduling) exist because they usually look good, not because anything enforces them; override any of them whenever the scene wants something different.

## Setup

```ts
import { sketch } from "sketchling"; // or "../src/index.js" if working inside this repo, pre-publish
const scene = sketch.scene({ width: 480, height: 420, background: "#7096c6", seed: "my-scene" });
// ... build nodes, add them, animate them ...
export default scene;
```

`width`/`height` are the world — where everything is authored/positioned, and what the background fills. Pass `viewport: { width, height }` too when the world is bigger than one screen and a `scene.camera()` (below) pans/zooms around inside it; omit it and the output frame is just the whole world, unchanged from every scene that isn't using a camera.

```
sketchling render scene.ts --out preview.png            # settled end state
sketchling render scene.ts --out mid.png --at 0.6        # a specific timeline moment
sketchling render scene.ts --crop --out thumb.png        # cropped to content (cheap iteration)
sketchling render scene.ts --video out.mp4 --fps 30      # the whole timeline, as an MP4
sketchling render scene.ts --serve                       # open live in a real browser
```

Tier 0 lint (off-canvas, degenerate shapes, heavy overlap, off-center composition) runs on every render automatically, for free, before any pixel exists. Nested detail (eyes on a face, a keyhole on a screen) routinely trips the overlap warning — that's expected for intentional nesting, not a problem to fix.

## Primitives

- `sketch.stroke(points, style)` — an open freehand line
- `sketch.loop(points, style)` — a closed freehand shape
- `sketch.blob(cx, cy, radius, style, vertices?)` — an organic, deliberately-not-a-perfect-circle shape. `vertices` (default `10`) controls outline complexity — more reads calmer/rounder, fewer looser/more angular. Below roughly 8-9px radius the outline jitter overwhelms the fill and small blobs stop reading clearly (a "bubble" wants radius ≥9-10 and a light weight, not a tiny radius).
- `sketch.group(children)` — groups nodes so they move/scale/rotate together. `.stagger(each, {duration, at, ease, effect})` choreographs children's entrances with rhythm (`effect: "drawOn" | "appear"`, default `drawOn`).
- `sketch.text(str, x, y, style, {size?})` — hand-lettered text. Lowercase a-z, digits, basic punctuation (`. , ! ? ' -`); no case distinction (uppercase input reuses the lowercase glyph). `size` is the approximate letter height in pixels (default `48`), not a raw scale multiplier. Returns a `Group` of one Stroke per letter-stroke — animate it with `.stagger()` for a letter-by-letter reveal, or leave it static. There's no general font renderer here, just enough of an alphabet to letter a caption.
- `sketch.film({width, height, background})` — cuts several independent `Scene`s together (see Film below).
- `sketch.arrow(from, to, style, {headSize?, headAngle?})` — a shaft plus a two-stroke head, angled toward `to`. Thin composition, returns a `Group`.
- `sketch.speechBubble(x, y, width, height, style, {tailAt?, tailSize?})` — a rounded rectangle with a triangular tail (`tailAt`: `"bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-center" | "top-right"`). One closed stroke.

All points are `[x, y]` pairs in the scene's own absolute canvas coordinates — draw shapes directly where they should appear, the way every example in `examples/` does it.

## Style

`color`, `weight` (`"light" | "confident" | "bold"` or a number), `looseness` (0-1, precise → wild, perturbs both the outline and the render jitter), `energy` (`"calm" | "quick" | "frantic"`), `smooth` (spline through points vs. straight edges — default `true`; use `false` for boxes/wedges that need sharp corners), `fill` (`{ color, style: "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots", density, angle }`).

## Animation

Every node: `.drawOn({at, duration, ease})`, `.appear(...)`, `.moveTo(x, y, ...)`, `.moveBy(dx, dy, ...)`, `.scaleTo(s, ...)`, `.rotateTo(deg, ...)`, `.fadeTo(opacity, ...)`. `at` is an absolute position (seconds) on the scene's shared timeline.

- `drawOn`'s `duration` is optional — omitted, it scales with the path's own length (a long outline doesn't flash by as fast as a short one). Set it explicitly whenever you want a specific pace instead.
- `moveTo(x, y)` is a true absolute position: the node's own geometric center ends up at canvas `(x, y)`, regardless of where it currently sits (even after prior `moveBy`/`moveTo` calls). `moveBy(dx, dy)` is relative to wherever the node currently is.
- `.pivotAt(x, y)` (on any node) anchors `rotateTo`/`scaleTo` at an absolute canvas point instead of the node's own center — needed whenever something should swing from a point other than its middle (a raised arm pivots at the shoulder, not its own midpoint).
- `.morphTo(points, {at, duration, ease})` — a drawn stroke/loop/blob reshapes into new points instead of a new shape appearing (via GSAP's MorphSVGPlugin). Color/fill style stay the same, only geometry changes. Disables line-boil on that node (avoids a visible snap-back mid-morph). Not available on `Group`/`sketch.text()` nodes.
- `.moveAlong(points, {at, duration, ease, rotate?})` — travels a curved path through `points` (via GSAP's MotionPathPlugin) instead of the straight-line segments a chain of `moveBy` calls would produce. `rotate: true` orients the node to face its direction of travel (off by default — most things should stay upright while they move, not pitch into the turn).
- `.squashTo(scaleX, scaleY, {at, duration, ease})` — non-uniform scale, the basic cartoon weight/impact cue: flatten wide+short on landing, stretch tall+thin mid-jump, then snap back. Unlike `scaleTo` (uniform), this is what makes motion read as having mass instead of being a rigid shape sliding around. A believable bounce is squash on impact (~0.1-0.15s, a fast ease-out) immediately followed by an overshoot-then-settle back to `(1, 1)` (`ease: "back.out(...)"` reads as springy).
- **`moveTo`/`moveAlong` target the node's own geometric bbox center, not whatever point you were thinking of when you built it.** For a vertically lopsided shape (a tall envelope with a small basket hanging off the bottom, a character whose head is much bigger than its feet), the bbox center can sit well away from the "obvious" reference point — animating to a path authored at, say, the *feet's* height will land the shape floating or sinking relative to where it visually should be. Work out the offset once (`your intended y − the shape's own bbox-center y`) and add it to every point in the path, or just render an early mid-motion frame (`--at`) and check the silhouette sits where you meant it to, before trusting a longer path.
- `.drawOn()` only reveals `stroke`/`blob`/`loop` nodes and Groups built by `sketch.text()` — a plain `Group` has no single path to trace, so calling `.drawOn()` on one directly is a no-op (mask its children individually, or use `.stagger()`).
- A drawing doesn't have to go still the moment it's finished: chain `moveBy`/`rotateTo`/`scaleTo`/`fadeTo` onto a node after its `drawOn` window closes for motion that continues past the reveal (a limb that waves, a rocket that launches, steam that drifts and fades). This is optional, not an expectation every scene needs to satisfy.
- Two shapes drawing themselves at once reads as two hands, not one — sequential `drawOn` windows with a short gap between them is the default look worth reaching for, but scenes can absolutely overlap or run things in parallel when that's the actual effect wanted (simultaneous motion, a burst of things appearing together).
- Every already-drawn line keeps re-jittering a few times a second on its own for as long as it's on screen (rendering detail, not something to configure) — a static scene still reads as hand-drawn rather than laser-cut, with no extra work.

## Camera — panning and zooming within a world bigger than the screen

```ts
const scene = sketch.scene({ width: 4200, height: 700, viewport: { width: 640, height: 440 }, background: "#f2d4a3" });
// ... build a world across the full 4200x700, not just the 640x440 output frame ...
const cam = scene.camera();
cam.panTo(500, 400, { at: 0, duration: 0 });          // starting frame
cam.follow(someNode, { at: 2, duration: 6 });          // tracks someNode's live position, mid-tween included
cam.zoomTo(1.3, { at: 4, duration: 1 });                // independent of pan — both can run at once
```

- `scene.camera()` returns a controller with `.panTo(x, y, opts)` (centers the viewport on a world-space point), `.zoomTo(scale, opts)` (1 = authored size, >1 closer in), and `.follow(node, opts)` (keeps the viewport centered on a node for the duration, tracking wherever its own `moveTo`/`moveBy`/`moveAlong` actually takes it — not a fixed point recorded once). `.follow` only holds for its own `[at, at+duration]` window — unlike `panTo`/`zoomTo` (real GSAP tweens that hold their end value for any later seek), a seek past the window falls back to whatever the underlying pan/zoom tweens resolve to there, not a freeze-frame of the last followed position. Cover the whole span you want tracked, including any settle/hold tail past the node's own last motion (a `--out` still defaults to the timeline's true end) — an under-covered window shows up as a hard camera snap right at its boundary.
- Every op takes the same `{at, duration, ease}` as node animations. `panTo`/`zoomTo`/`follow` all animate independent state (pan position vs. zoom level), so a `zoomTo` can run concurrently with a `follow` without fighting it.
- This is the tool for continuity a Film cut can't give you: one continuous scene the camera moves through, instead of independent scenes stitched together (where nothing — a character, a hand-drawn craft — can just *keep going*, because every cut starts a new, unrelated Scene). Build once, travel through the world; don't rebuild the same thing at every stop.
- A scene that never calls `.camera()` renders exactly as if this didn't exist — no cost, no behavior change.

### Parallax layers — depth without literal 3D

`scene.layer(depth, children?)` returns a `Group` (same API as `scene.group()`) pinned to a depth plane. When the camera pans, each layer moves by a *fraction* of that pan based on its own depth — the same illusion of depth 2D animation has always used (distant hills drift slowly behind a character that whips past fast up close), not a 3D engine.

```ts
const hills = scene.layer(0.3);   // distant — recedes, moves slowly as the camera pans
hills.add(sketch.blob(200, 380, 140, style)).drawOn();

scene.add(character);             // no .layer() call = depth 1, the default plane

const branch = scene.layer(1.4);  // close foreground — pops, moves more than the camera itself
branch.add(sketch.stroke(points, style)).drawOn();
```

- `depth` 1 (the default — anything added via `scene.add()`/`scene.group()` without going through `.layer()`) moves exactly with the camera. `< 1` recedes (background); `> 1` pops forward (foreground) and can even overshoot the camera's own motion.
- Only visible alongside camera motion (`panTo`/`follow`) — zoom applies uniformly to every layer, only *pan* creates the differential. A scene with layers but no camera renders every layer at its authored position, flat, no offset.
- The scene's own `background` (see Style below) always sits at the farthest-back depth, behind every `.layer()`, since it's the backdrop everything else is in front of.

### Gradient backgrounds

`background` accepts a flat color string (as before) or a gradient: `{ stops: [{offset, color}, ...], direction? }` (`offset` 0-1, `direction` `"vertical"` (default) or `"horizontal"`). Renders as one real SVG gradient, not hand-sketched — smooth, cheap, and a real sky/backdrop shouldn't look pen-traced. Prefer this over hand-authoring rows of solid-color band rectangles to fake a gradient; the real thing is both less code and looks better (no banding).

## 3D — genuine rotating solids, sketched

```ts
const die = sketch.box3d(90, 90, 90, { color: "#241d14", weight: "confident", fill: { color: "#e8794a", style: "solid" } });
scene.add(die);
die.moveTo(300, 220, { at: 0, duration: 0.001 }); // place it like any 2D node
die.spin3d(360, 720, 0, { at: 0.4, duration: 2.2, ease: "sine.inOut" }); // absolute-target rotation, degrees
```

- `sketch.box3d(w, h, d, style)`, `sketch.icosahedron3d(radius, style)`, and `sketch.mesh3d(vertices, faces, style)` (fully custom — vertices are `[x,y,z]` triples in local space, faces are `{indices, color?}` with indices wound counter-clockwise as seen from outside the solid) all return a node with the same placement API as everything else: `moveTo`/`moveBy`/`scaleTo`/`fadeTo` animate its flat on-screen position exactly like a 2D shape.
- `.spin3d(rx, ry, rz, opts)` is the 3D-specific animation — an absolute-target rotation in degrees around each axis (matches `rotateTo`'s absolute-target convention), independent of `rotateTo` itself, which still spins the mesh's flat 2D placement. Chain multiple `spin3d` calls the way you'd chain `rotateTo`/`moveBy` — each one continues from wherever the last left off.
- Every face is sketched with rough.js like any other shape here (a loose outline, not a crisp CAD edge) and flat-shaded by how directly it faces the mesh's own light direction (`lightDir`, defaults to an upper-left key light) — this is hand-inked 3D, not photoreal 3D. A face's fill color is the mesh's own `style.fill.color` (or `style.color`) lightened/darkened by that shading, unless the face itself sets `color`.
- Backface culling and painter's-algorithm depth sorting happen automatically, every frame — faces facing away from the camera aren't drawn, and visible faces paint back-to-front so nearer ones correctly occlude farther ones. This assumes non-intersecting geometry: two meshes that interpenetrate, or a mesh whose own faces cross each other, have no depth order painter's-algorithm can resolve correctly.
- A rotating mesh's whole silhouette changes every frame (which faces are even visible depends on the current rotation), so unlike a 2D shape's `cleanPathD` (computed once at build time), a mesh's paths are rebuilt on every tick its `spin3d` tween is live. That's more render cost per mesh than a static 2D shape — reach for 3D where the rotation itself is the point (a die tumbling, a globe spinning, a logo turning into place), not as a blanket upgrade for shapes that were never meant to turn.

## Rigging and walking — IK limbs instead of hand-tuned rotation

```ts
const leg = sketch.limb(150, 100, 40, 40, { color: "#241a12", weight: "bold" }, { bend: 1, capRadius: 10 });
scene.add(leg);
leg.ikTo(190, 130, { at: 0.5, duration: 0.4 }); // foot reaches for a target; the knee solves itself

// or generate a whole gait at once:
sketch.walk({
  body: character.group,
  legs: [{ limb: character.legL, hipX: 142 }, { limb: character.legR, hipX: 158 }],
  steps: 8, stepLength: 100, groundY: 446,
});
```

- `sketch.limb(rootX, rootY, len1, len2, style, {bend, capRadius, capColor})` is a 2-bone IK chain (a leg or arm): two segments whose joint (knee/elbow) angle is solved every frame from an end-effector target, instead of a hand-authored `rotateTo` per segment. `.ikTo(x, y, opts)` moves that target — absolute, in the same local coordinate space as `rootX/rootY` — and is chainable like any other animation call. `bend` (1 or -1) picks which of the two valid knee/elbow solutions; whichever reads correctly for the limb's own orientation, check with a render. `capRadius > 0` draws a foot/hand blob at the end.
- **Give the chain real reach headroom.** `len1 + len2` should comfortably exceed the distance it actually needs to cover — a chain at or near full extension gets its target silently clamped onto the reachable radius the moment it's asked to reach slightly further, which distorts the effective foot position (and, in a walk cycle, breaks the planted-foot-doesn't-slide guarantee below). Some bend at rest reads as more natural anyway.
- `sketch.walk({body, legs: [{limb, hipX}, {limb, hipX}], steps, stepLength, groundY, stepDuration?, liftHeight?, bodyBob?, at?})` generates a full bipedal gait — foot planting, lift-and-swing, body bob — over exactly two limbs, alternating which leads each step. Returns `{endAt}` so you can chain whatever comes after the walk without hand-computing the total duration. `body` is driven with `moveBy` (relative), so it composes with wherever the character already is.
- The planted (trailing) leg's foot is provably fixed in world space for the whole time it's grounded, not just close at the keyframes — it works by giving that foot's `ikTo` for each half-step the *exact same* `{at, duration, ease}` as the body's own `moveBy` for that half-step, with the negated delta, so both tweens trace the identical ease curve and cancel at every sampled instant. Trust this rather than re-deriving your own countershift math for a custom gait.

```ts
const rig = sketch.quickRig(body, { groundY: 265, stepLength: 42, capRadius: 9 });
const character = sketch.group([rig.legL, rig.legR, body, head]);
```

- `sketch.quickRig(body, {groundY, stepLength?, hipDrop?, hipSpread?, reachMargin?, legStyle?, capRadius?})` auto-derives a headroom-safe two-legged rig from `body`'s own bounding box (a `Stroke`/`Blob`/`Group`) instead of hand-picking hip coordinates and leg lengths — the exact worst-case-reach math from the reach-headroom bullet above (`sqrt(stepLength² + hipToGroundDrop²)` sized with `reachMargin`, default `1.35` = 35% headroom), done for you. Returns `{legL, legR, hipY, hipLX, hipRX, len1, len2}` — pass `legL`/`legR` straight into `sketch.walk`'s `legs` array, `hipLX`/`hipRX` as its `hipX` values.
- Named honestly: this derives proportions from a bounding box (center, width, bottom edge) — NOT a real skeleton extracted from an arbitrary drawn silhouette, a much harder problem it doesn't attempt. Good for a round or roughly-humanoid body; an unusual or asymmetric shape may still want hand-placed joints via `sketch.limb` directly. See `examples/gallery/quickrig-walk.ts` — the same character as `walk-cycle.ts`, with one `quickRig` call replacing five hand-picked constants.

## Secondary motion — springs that chase another node

```ts
const bead = sketch.blob(128, 108, 14, style);
scene.add(bead);
bead.springTo(body, { offset: [8, -82], stiffness: 90, damping: 7, at: 1.7 });
```

- `node.springTo(driver, {offset?, stiffness?, damping?, at?})` makes `node` chase `driver`'s live position (plus a fixed `[dx, dy]` offset) with damped-spring lag and overshoot, rather than a hand-authored delay — a trailing bead, a bobble, anything that should react to what another node does. `stiffness` (default `120`) higher reads snappier/less lag; `damping` (default `12`) higher means less overshoot (`2*sqrt(stiffness)` is critically damped — no overshoot at all). Runs from `at` (default `0`) through the end of the timeline.
- Precomputed once per scene build — a dense forward scan of the driver's own resolved position, integrated offline into a lookup table — rather than evaluated live on each seek, so seeking anywhere stays exact and repeatable, the same guarantee every other animation here has. One consequence: a spring isn't itself a tween on the timeline, so it reserves its own settle time automatically (roughly `9.2/damping` seconds after whatever else on the timeline ends) instead of needing one hand-authored — a spring's overshoot-and-settle would otherwise get cut off right when its driver stops moving.
- Only moves the one node's own position, not a whole flexible connector — pair it with `sketch.connector(anchor, target, style)` for that. A nearby accessory with no rigid connection drawn to its driver (an earring, a bobble) is what `springTo` alone is for; see `examples/gallery/spring-follow.ts`.

```ts
const antenna = sketch.connector([120, 156], tip, { color: "#2a2a2a", weight: "bold" });
scene.add(antenna);
```

- `sketch.connector(anchor, target, style?)` is a stroke that rebuilds itself every seek from the fixed `anchor` point to `target`'s own live resolved position — the same live-position read `camera.follow` and `springTo`'s own drivers use, so it tracks a `springTo`'d node exactly, not approximately. Bowed through one synthetic offset midpoint rather than drawn as a straight segment, so it reads as a flexible rod bending under the tip's motion. `target` doesn't have to be springing — a connector tracks any node's live position — but pairing it with a `springTo`'d node is what turns a trailing accessory into an actual bendy ear/antenna/tail; see `examples/gallery/bendy-antenna.ts`.
- No `drawOn` on a connector (there's no stable path length to reveal against geometry that changes every frame) and no line-boil (it already fully rebuilds each seek); `fadeTo`/`moveTo`/etc. on its own transform still work normally. Both `connector` and `springTo` read only a node's own local offset — a `target`/`driver` whose motion comes entirely from an animated ancestor group (e.g. a body placed inside a `sketch.walk` character) reads as stationary; give it its own tween if it needs to be tracked or spring-driven.

## Particles — sparks, dust, confetti, a firework burst

```ts
const burst = sketch.particles(200, 220, { color: "#f2c94c" }, {
  count: 40, angle: -90, spread: 100, speedMin: 80, speedMax: 220,
  gravity: 260, lifetime: 1.4, at: 0.3,
});
scene.add(burst);
```

- `sketch.particles(x, y, style, {count?, angle?, spread?, speedMin?, speedMax?, gravity?, lifetime?, duration?, at?, sizeMin?, sizeMax?, fade?})` launches `count` (default 24) small dots from `(x, y)` within a cone (`angle` ± `spread`/2 degrees, screen convention 0 = +x/right, 90 = +y/down — default `angle: -90` is straight up) under constant `gravity` (default 220 px/sec², pulls toward +y). `duration` (default 0) spreads emission across a window instead of firing all at once; `lifetime` (default 1.2s) is how long each particle stays visible, `fade` (default true) ramping its opacity in then out over that span.
- Deliberately not a simulation: every particle's spawn time, launch angle, speed, and size are drawn once from a seeded PRNG at build time, so its position at any `t` is a closed-form ballistic formula (`x0 + vx·age, y0 + vy·age + ½·gravity·age²`) with no history and no dependency on any other node — unlike `springTo`, this needs no precomputed lookup table at all; seeking anywhere is exact for free, the same way a plain `moveTo` already is.
- One gotcha worth knowing: since a particle's motion is never itself a `tl.to()` call, nothing naturally extends the timeline to cover it — `sketch.particles` reserves duration through the latest particle's own `spawnTime + lifetime` automatically, the same fix `springTo`'s settle-window needed for the same underlying reason. See `examples/gallery/particle-burst.ts`. `examples/showcase/` composes these together rather than demonstrating one at a time — `critter-hop.ts` (springTo + connector + particles), `quickrig-parade.ts` (quickRig + walk + camera.follow + particles), `toon-tumble.ts` (toon3d + squashTo choreography), `fireworks-finale.ts` (particles alone, six concurrent emitters). Both `critter-hop.ts` and `quickrig-parade.ts` document why their dust puffs are precomputed rather than connector/springTo-tracked (see the local-offset limitation noted above).

## Look — the same scene, painted differently

```ts
const scene = sketch.scene({ width: 480, height: 420, background: "#7096c6", look: "flat" });
```

- `look` on `sketch.scene(...)` picks the visual treatment: `"ink"` (default) is the hand-drawn look everything above assumes — sketchy jitter, line boil, a visible pen tip tracing `drawOn`. `"flat"` renders the *identical* authored scene — same geometry, same physics, same timing — crisp and precise instead: no jitter, no boil, solid fills instead of hachure/cross-hatch, no pen tip.
- `"clay"`: subtler, hand-molded jitter than `"ink"` (less chaotic — pressed, not sketched), solid fills, no boil — and, distinctly, time itself is quantized to a ~10fps hold rather than tweened continuously, a genuine stop-motion cadence applied at the seek level. Every downstream system (camera, drawOn, IK) needs no special handling for this — it just sees time move in discrete jumps.
- `"watercolor"`: the same crisp geometry as `"flat"`, with a whole-frame SVG filter (fractal-noise displacement plus a soft blur) bleeding every edge like wet pigment on paper — a post-process over the same pipeline, not a different stroke style underneath.
- `"lit3d"`: a genuinely separate rendering pipeline — WebGL/Three.js, not SVG/rough.js — with real directional + ambient lighting and cast shadows, driven by the exact same `spin3d`/`moveTo`/`moveBy`/`scaleTo`/`squashTo` calls as every other look. Only `mesh3d` nodes (`box3d`/`icosahedron3d`/custom `mesh3d`) have a 3D representation: every 2D-only node in the same scene (a stroke, a blob, a limb, text) simply doesn't appear in a `"lit3d"` render, and the scene still lints and serializes normally either way. This is lit real-time 3D — one key light, one fill light, soft shadows — not a path tracer; call it "lit 3D rendering," not "photorealistic."
- `"pixel"`: `"flat"`'s crisp geometry again, plus a raster post-process on every captured frame — downsample to a low-res grid, then nearest-neighbor upscale back to size, so every cell lands as one flat-colored block. Applied outside the DOM, in the CLI, on the captured PNG bytes (via `ffmpeg`), not as an SVG filter like watercolor's — the only look that needs `ffmpeg` on `PATH` outside of `--video`. Because it lives in the CLI's capture step rather than the renderer, it's scene-only (a `Film` entry using it doesn't get pixelated) and doesn't show under `--serve` (which skips the capture step entirely).
- `"toon3d"`: `"lit3d"`'s exact pipeline — same camera, lights, shadows, `mesh3d`-only scope — with `MeshToonMaterial` and a 4-step gradient map on each mesh instead of a continuous PBR response, for flat cel-shaded bands, plus a black inverted-hull outline (a second back-face-only mesh scaled up ~4%, parented to the real mesh so it inherits every animated transform through Three.js's own scene graph — no separate GSAP tween needed). The outline is what actually reads as "toon"; the banding alone is subtle. A shading variant of `"lit3d"`, not a third pipeline. Because every `mesh3d` face is already flat-shaded (one uniform normal per face, not interpolated), the banding shows up as a difference in which of the 4 steps each face's brightness lands on relative to `"lit3d"`'s continuous value, not a gradient within a face — real, and verified with a pixel-diff against the same scene under `"lit3d"` (well above noise), but subtler than cel-shading on smooth geometry would read, since every mesh here is low-poly and flat-shaded to begin with.
- Nothing about how you author a scene changes based on `look` — every primitive, animation, and this whole reference applies the same either way. `look` is a rendering decision, not an authoring one.

## Film — cutting scenes together

```ts
const film = sketch.film({ width: 640, height: 480, background: "#111" });
film.addScene(sceneA, { transition: "cut", hold: 0.4 });
film.addScene(sceneB, { transition: "fade", transitionDuration: 0.5, hold: 0.4 });
export default film; // renders/lints/videos exactly like a Scene — same CLI, same flags
```

Each scene keeps its own width/height/background and animates completely independently; `Film` just scales/centers each one into its own canvas (letterboxing whatever doesn't match the film's aspect ratio) and sequences them. `transition` is `"cut"` (instant, default) or `"fade"` (crossfade over `transitionDuration` seconds). `hold` is how long a scene sits on its settled frame before the next one takes over. Lint runs per-scene, prefixed with the scene's index.

For a longer sequence without a shared runtime (characters/state don't carry between scenes automatically — each scene redraws its own world), a `Group` factory function shared across scene files keeps a recurring character's geometry consistent from scene to scene (see how `jellyfish-drift.ts`-style scenes or a multi-file story would share a `buildCharacter()` helper).

## Things that look like bugs but aren't

- Tier 0's "heavy overlap" warning on two shapes you nested on purpose (an eye inside a head) — expected noise, only meaningful for two *unrelated* shapes stacked by mistake.
- A `--video` render is ~1s longer than the scene's own `totalDuration` — the CLI holds on the settled end frame before the video cuts, rather than ending on the exact last drawn frame.
- An element that's clearly on-canvas (within `width`/`height`) but never shows up on screen, in a scene using `camera()` — the *world* can be bigger than the *viewport*, and Tier 0 lint checks against the world, not against wherever the camera happens to be framed at any given moment. Work out roughly where the camera actually is at the time an element should be visible (what's it panned/zoomed/following, and when) before assuming a placement is right.

## Verifying your own work without burning tokens

Render a still at a genuinely mid-motion timestamp (`--at 0.3`, not just the settled end state) before trusting an animation looks right — a shape can look correct at rest and still be revealing itself in the wrong order or overlapping badly mid-draw. `--crop` gives a cheap, small image for fast iteration; a full render is for the final look.
