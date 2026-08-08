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

All points are `[x, y]` pairs in the scene's own absolute canvas coordinates — draw shapes directly where they should appear, the way every example in `examples/` does it.

## Style

`color`, `weight` (`"light" | "confident" | "bold"` or a number), `looseness` (0-1, precise → wild, perturbs both the outline and the render jitter), `energy` (`"calm" | "quick" | "frantic"`), `smooth` (spline through points vs. straight edges — default `true`; use `false` for boxes/wedges that need sharp corners), `fill` (`{ color, style: "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots", density, angle }`).

## Animation

Every node: `.drawOn({at, duration, ease})`, `.appear(...)`, `.moveTo(x, y, ...)`, `.moveBy(dx, dy, ...)`, `.scaleTo(s, ...)`, `.rotateTo(deg, ...)`, `.fadeTo(opacity, ...)`. `at` is an absolute position (seconds) on the scene's shared timeline.

- `drawOn`'s `duration` is optional — omitted, it scales with the path's own length (a long outline doesn't flash by as fast as a short one). Set it explicitly whenever you want a specific pace instead.
- `moveTo(x, y)` is a true absolute position: the node's own geometric center ends up at canvas `(x, y)`, regardless of where it currently sits (even after prior `moveBy`/`moveTo` calls). `moveBy(dx, dy)` is relative to wherever the node currently is.
- `.pivotAt(x, y)` (on any node) anchors `rotateTo`/`scaleTo` at an absolute canvas point instead of the node's own center — needed whenever something should swing from a point other than its middle (a raised arm pivots at the shoulder, not its own midpoint).
- `.drawOn()` only reveals `stroke`/`blob`/`loop` nodes and Groups built by `sketch.text()` — a plain `Group` has no single path to trace, so calling `.drawOn()` on one directly is a no-op (mask its children individually, or use `.stagger()`).
- A drawing doesn't have to go still the moment it's finished: chain `moveBy`/`rotateTo`/`scaleTo`/`fadeTo` onto a node after its `drawOn` window closes for motion that continues past the reveal (a limb that waves, a rocket that launches, steam that drifts and fades). This is optional, not an expectation every scene needs to satisfy.
- Two shapes drawing themselves at once reads as two hands, not one — sequential `drawOn` windows with a short gap between them is the default look worth reaching for, but scenes can absolutely overlap or run things in parallel when that's the actual effect wanted (simultaneous motion, a burst of things appearing together).
- Every already-drawn line keeps re-jittering a few times a second on its own for as long as it's on screen (rendering detail, not something to configure) — a static scene still reads as hand-drawn rather than laser-cut, with no extra work.

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

## Verifying your own work without burning tokens

Render a still at a genuinely mid-motion timestamp (`--at 0.3`, not just the settled end state) before trusting an animation looks right — a shape can look correct at rest and still be revealing itself in the wrong order or overlapping badly mid-draw. `--crop` gives a cheap, small image for fast iteration; a full render is for the final look.
