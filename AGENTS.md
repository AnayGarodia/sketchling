# AGENTS.md

Instructions for coding agents (Codex, Devin, Claude Code, or otherwise) working in this repo. If you're drawing or animating a scene rather than working on the library itself, read the "Drawing with sketchling" section below — it's the same reference as `.claude/skills/sketchling/SKILL.md` and `.agents/skills/sketchling/SKILL.md`, kept here too since not every agent reads a skills directory.

## Working on the library

- `npm run build` compiles TypeScript (`tsc -p tsconfig.json`) — run it before any `sketchling render` call picks up source changes, since the CLI imports the built `dist/`, not `src/` directly.
- No test suite yet — verification is rendering a scene and looking at the actual output (see "Verifying your own work" below), not unit tests.
- Core (`src/core/`) has no DOM dependency on purpose — it needs to run cheaply in plain Node for the Tier 0 linter and for `sketch.scene()`/`sketch.film()` construction. Don't introduce a DOM/browser dependency there; that layer belongs in `src/render/`.
- `src/render/renderer.ts` is the animation engine (mask-based `drawOn`, line boil, Film composition) — it's the most load-bearing file in the repo and the trickiest to get right blind; changes there deserve an actual rendered check at a genuinely mid-motion timestamp, not just a build check (see the file's own comments for two non-obvious GSAP behaviors already found the hard way).
- `examples/` are vocabulary demos (one concept each); `examples/story/` is a narrative sequence; `examples/launch/` is launch-video-specific source, not meant as a general example. Don't mix these purposes into one file.

## Drawing with sketchling

A hand-drawn illustration and animation vocabulary, rendered through rough.js + GSAP. Like Manim: a toolbox of primitives and animations, not a pipeline. Nothing below is mandatory — pick whatever combination of tools serves what you're actually drawing. The defaults (pacing, easing, single-pen scheduling) exist because they usually look good, not because anything enforces them; override any of them whenever the scene wants something different.

### Setup

```ts
import { sketch } from "sketchling"; // or "../src/index.js" if working inside this repo, pre-publish
const scene = sketch.scene({ width: 480, height: 420, background: "#7096c6", seed: "my-scene" });
// ... build nodes, add them, animate them ...
export default scene;
```

`width`/`height` are the world. Pass `viewport: { width, height }` too when the world is bigger than one screen and a `scene.camera()` (below) pans/zooms within it; omit it and the output frame is just the whole world, same as every scene not using a camera.

```
sketchling render scene.ts --out preview.png            # settled end state
sketchling render scene.ts --out mid.png --at 0.6        # a specific timeline moment
sketchling render scene.ts --crop --out thumb.png        # cropped to content (cheap iteration)
sketchling render scene.ts --video out.mp4 --fps 30      # the whole timeline, as an MP4 (~1s longer than the timeline's own duration — it holds on the settled end frame)
sketchling render scene.ts --serve                       # open live in a real browser
```

Tier 0 lint (off-canvas, degenerate shapes, heavy overlap, off-center composition) runs on every render automatically, for free, before any pixel exists. Nested detail (eyes on a face, a keyhole on a screen) routinely trips the overlap warning — that's expected for intentional nesting, not a problem to fix.

### Primitives

- `sketch.stroke(points, style)` — an open freehand line
- `sketch.loop(points, style)` — a closed freehand shape
- `sketch.blob(cx, cy, radius, style, vertices?)` — an organic, deliberately-not-a-perfect-circle shape. `vertices` (default `10`) controls outline complexity. Below roughly 8-9px radius the outline jitter overwhelms the fill and small blobs stop reading clearly — give a "bubble" radius ≥9-10 and a light weight, not a tiny radius.
- `sketch.group(children)` — groups nodes so they move/scale/rotate together. `.stagger(each, {duration, at, ease, effect})` choreographs children's entrances with rhythm.
- `sketch.text(str, x, y, style, {size?})` — hand-lettered text. Lowercase a-z, digits, basic punctuation (`. , ! ? ' -`); no case distinction. `size` is the approximate letter height in pixels (default `48`), not a raw scale multiplier. Returns a `Group` of one Stroke per letter-stroke — animate with `.stagger()` for a letter-by-letter reveal, or leave it static.
- `sketch.film({width, height, background})` — cuts several independent `Scene`s together (see Film below).
- `sketch.arrow(from, to, style, {headSize?, headAngle?})` — a shaft plus a two-stroke head, angled toward `to`. Thin composition, returns a `Group`.
- `sketch.speechBubble(x, y, width, height, style, {tailAt?, tailSize?})` — a rounded rectangle with a triangular tail (`tailAt`: `"bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-center" | "top-right"`). One closed stroke.

All points are `[x, y]` pairs in the scene's own absolute canvas coordinates — draw shapes directly where they should appear.

### Style

`color`, `weight` (`"light" | "confident" | "bold"` or a number), `looseness` (0-1, precise → wild), `energy` (`"calm" | "quick" | "frantic"`), `smooth` (spline vs. straight edges — default `true`, use `false` for boxes/wedges needing sharp corners), `fill` (`{ color, style: "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots", density, angle }`).

### Animation

Every node: `.drawOn({at, duration, ease})`, `.appear(...)`, `.moveTo(x, y, ...)`, `.moveBy(dx, dy, ...)`, `.scaleTo(s, ...)`, `.rotateTo(deg, ...)`, `.fadeTo(opacity, ...)`. `at` is an absolute position (seconds) on the scene's shared timeline.

- `drawOn`'s `duration` is optional — omitted, it scales with the path's own length.
- `moveTo(x, y)` is a true absolute position: the node's own geometric center ends up at canvas `(x, y)`, regardless of its current position. `moveBy(dx, dy)` is relative.
- `.pivotAt(x, y)` (any node) anchors `rotateTo`/`scaleTo` at an absolute canvas point instead of the node's own center — needed for e.g. a limb that should swing from a joint, not its own midpoint.
- `.morphTo(points, {at, duration, ease})` — a drawn stroke/loop/blob reshapes into new points instead of a new shape appearing (via GSAP's MorphSVGPlugin). Color/fill style stay the same, only geometry changes. Disables line-boil on that node (avoids a visible snap-back mid-morph). Not available on `Group`/`sketch.text()` nodes.
- `.drawOn()` only reveals `stroke`/`blob`/`loop` nodes and `sketch.text()` groups — a plain `Group` has no single path to trace, so `.drawOn()` on one is a no-op.
- A drawing doesn't have to go still once finished: chain `moveBy`/`rotateTo`/`scaleTo`/`fadeTo` after a `drawOn` window closes for motion that continues past the reveal. Optional, not an expectation.
- Two shapes drawing at once reads as two hands — sequential `drawOn` windows with a short gap is the default worth reaching for, but nothing prevents overlap when that's the actual effect wanted.
- Every already-drawn line keeps re-jittering a few times a second on its own — automatic, not something to configure.
- `.moveAlong(points, {at, duration, ease, rotate?})` — a curved path through `points` (GSAP MotionPathPlugin), not the straight segments a chain of `moveBy` would give. `rotate: true` faces the node into its direction of travel (off by default).
- `.squashTo(scaleX, scaleY, {at, duration, ease})` — non-uniform scale, the basic cartoon weight/impact cue (flatten on landing, stretch mid-jump, snap back). Unlike `scaleTo`, this is what makes motion read as having mass.
- **`moveTo`/`moveAlong` target the node's own bbox center, not the point you were thinking of when you built it.** A vertically lopsided shape (tall body, small feet) has a bbox center well away from the "obvious" reference point — animating a path authored at, say, the feet's height will land it floating or sinking. Work out the offset once, or render a mid-motion `--at` frame and check before trusting a longer path.

### Camera — panning and zooming within a world bigger than the screen

```ts
const scene = sketch.scene({ width: 4200, height: 700, viewport: { width: 640, height: 440 }, background: "#f2d4a3" });
const cam = scene.camera();
cam.panTo(500, 400, { at: 0, duration: 0 });
cam.follow(someNode, { at: 2, duration: 6 }); // tracks someNode's live position, mid-tween included
cam.zoomTo(1.3, { at: 4, duration: 1 });       // independent of pan — both can run at once
```

`scene.camera()` returns `.panTo(x, y, opts)`, `.zoomTo(scale, opts)`, `.follow(node, opts)` — same `{at, duration, ease}` as node animations. This is what gives continuity a Film cut can't: one continuous scene the camera moves through, instead of independent scenes where nothing can just *keep going* because every cut starts an unrelated Scene. Build once, travel through the world — don't rebuild the same thing at every stop. A scene that never calls `.camera()` renders exactly as before, at no cost.

**Parallax layers**: `scene.layer(depth, children?)` returns a `Group` pinned to a depth plane — when the camera pans, each layer moves by a fraction of that pan based on its depth (the 2D depth illusion, not literal 3D). `depth` 1 (default, no `.layer()` call needed) moves 1:1 with the camera; `<1` recedes (background), `>1` pops forward (foreground). Only visible alongside camera pan/follow; zoom applies uniformly. The scene's `background` always sits farthest back, behind every layer.

**Gradient backgrounds**: `background` takes a color string or `{ stops: [{offset, color}], direction? }` — one real SVG gradient instead of hand-authoring band rectangles to fake one.

**3D**: `sketch.box3d(w, h, d, style)` / `sketch.icosahedron3d(radius, style)` / `sketch.mesh3d(vertices, faces, style)` (custom — `[x,y,z]` vertices, faces are `{indices, color?}` wound CCW from outside) return a node placed with the usual `moveTo`/`moveBy`. `.spin3d(rx, ry, rz, opts)` is an absolute-target rotation in degrees, chainable like `rotateTo`. Every face is rough.js-sketched and flat-shaded against a key light (`lightDir`, defaults upper-left); backface culling and painter's-algorithm depth sort run automatically every frame — only correct for non-intersecting geometry. A spinning mesh rebuilds its projected silhouette every tick (costlier than a static 2D shape), so reach for it where rotation is the point, not as a default upgrade.

**IK limbs and walking**: `sketch.limb(rootX, rootY, len1, len2, style, {bend, capRadius, capColor})` is a 2-bone chain (leg/arm) whose joint angle is solved every frame from an end-effector target — `.ikTo(x, y, opts)` moves that target (absolute, local space), instead of hand-authoring a rotateTo per segment. Give `len1+len2` real headroom over the distance it needs to reach (a chain at full extension gets its target silently clamped, which reads as a subtle pop). `sketch.walk({body, legs: [{limb, hipX}, {limb, hipX}], steps, stepLength, groundY, stepDuration?, liftHeight?, bodyBob?, at?})` generates a full bipedal gait — foot planting, lift-and-swing, body bob — over two limbs; returns `{endAt}` to chain what follows.

**Look**: `sketch.scene({..., look: "ink" | "flat" })` — the same authored scene (geometry, physics, timing) painted differently. Default `"ink"` is the hand-drawn treatment (sketchy jitter, line boil, a visible pen tip during drawOn); `"flat"` renders the identical scene crisp and precise instead — no jitter, no boil, solid fills, no pen tip. One authored scene, not a rewrite, to switch looks.

### Film — cutting scenes together

```ts
const film = sketch.film({ width: 640, height: 480, background: "#111" });
film.addScene(sceneA, { transition: "cut", hold: 0.4 });
film.addScene(sceneB, { transition: "fade", transitionDuration: 0.5, hold: 0.4 });
export default film; // renders/lints/videos exactly like a Scene
```

Each scene keeps its own size, background, and animation, fully independent — `Film` scales/centers each into a shared canvas and sequences them. No shared runtime state between scenes; a recurring character across a longer sequence needs its own shared builder function reused across scene files (see `examples/story/_shared.ts`).

### Things that look like bugs but aren't

- Tier 0's "heavy overlap" warning on shapes nested on purpose (an eye inside a head) — expected noise.
- A `--video` render running ~1s past the scene's own `totalDuration` — the settled-frame hold, not a bug.
- An element that's within `width`/`height` but never visible, in a scene using `camera()` — lint checks the world, not wherever the camera happens to be framed at a given moment. Work out roughly where the camera actually is when an element should be seen before assuming its placement is right.

### Verifying your own work

Render a still at a genuinely mid-motion timestamp (`--at 0.3`, not just the settled end state) before trusting an animation looks right. `--crop` gives a cheap, small image for fast iteration.
