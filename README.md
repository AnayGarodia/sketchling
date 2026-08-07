# sketchling

A hand-drawn illustration and animation language for LLMs — Manim gave language models a way to express math visually in code; sketchling does the same for expressive, hand-drawn illustration and motion, in the register of Notion's and Anthropic's site illustrations.

![keyhole laptop, drawn and rendered by sketchling](docs/keyhole-laptop.png)

| | | |
|---|---|---|
| ![potted plant](docs/potted-plant.png) | ![doodle flourish](docs/doodle-flourish.png) | ![waving character](docs/waving-character.png) |
| ![rocket liftoff](docs/rocket-liftoff.png) | ![coffee steam](docs/coffee-steam.png) | |

Six scenes, different corners of the vocabulary: boxy geometry with solid fills, hachure and cross-hatch texture, pure open-stroke linework with no fills at all, an organic blob-built character that waves once it's drawn, a rocket that launches off the top of the frame leaving its exhaust behind, and rising coffee steam that drifts and fades after it draws. `examples/` has the source for all six — each also renders as an animation (`--video`), not just a still, and the motion is the point: nothing in these scenes goes still the instant it's drawn.

## Why

LLMs write code fluently but draw badly — ask one to hand-code an SVG path for a human figure and you get something crude. Two design choices make this tractable anyway:

1. **The vocabulary is expressive, not geometric.** No `Circle()`, no `Arc()`. Primitives take character parameters — `weight`, `looseness`, `energy` — not just coordinates. A "loose" stroke hides imprecision by design instead of exposing it.
2. **The renderer is forgiving by default.** Every shape draws through a [rough.js](https://roughjs.com)-based sketchy engine (jittered strokes, imperfect closure, variable width). Slightly-off geometry reads as *style*, not as a mistake — the same slack that makes a hand-drawn line hide a shaky hand.

The result is meant to be driven by an LLM writing TypeScript, not a human hand-authoring vector art.

## Quick example

```ts
import { sketch } from "sketchling";

const scene = sketch.scene({ width: 480, height: 420, background: "#7096c6" });

const lid = sketch.loop(
  [[70, 55], [330, 55], [330, 245], [70, 245]],
  { color: "#15130f", weight: "bold", looseness: 0.22, smooth: false }
);
scene.add(lid).drawOn({ at: 0, duration: 0.5 });

export default scene;
```

```
sketchling render scene.ts --out preview.png
```

## Vocabulary

- `sketch.stroke(points, style)` — an open freehand line
- `sketch.loop(points, style)` — a closed freehand shape
- `sketch.blob(cx, cy, radius, style)` — an organic, deliberately-not-a-perfect-circle shape
- `sketch.group(children)` — groups nodes; `.stagger(each)` choreographs their entrance with rhythm

**Style:** `color`, `weight` (`"light" | "confident" | "bold"` or a number), `looseness` (0–1, precise → wild — perturbs both the shape's outline and the render jitter), `energy` (`"calm" | "quick" | "frantic"`), `smooth` (spline through points for organic shapes vs. straight edges for boxes/wedges — default `true`), `fill` (`{ color, style: "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots", density, angle }`).

**Animation:** every node — `.drawOn({at, duration, ease})` (the line draws itself; `duration` is optional — omitted, it's derived from the path's own length, so a long outline doesn't flash on screen a beat after a short one), `.appear(...)` (fade in), `.moveTo(x, y, ...)`, `.moveBy(dx, dy, ...)`, `.scaleTo(s, ...)`, `.rotateTo(deg, ...)`, `.fadeTo(opacity, ...)`. `at` is an absolute timeline position in seconds, shared across the whole scene — the same vocabulary Manim's `self.play` gives you, but for a browser timeline instead of a math diagram. `.pivotAt(x, y)` anchors `rotateTo`/`scaleTo` at an absolute canvas point instead of the shape's own center — a raised arm should swing from the shoulder, not spin around its own midpoint (see `waving-character.ts`).

A single scene animates only what it's told to — nothing loops or idles on its own. `.drawOn()` currently only reveals `stroke`/`blob`/`loop` nodes; calling it on a `Group` is a no-op, since a group has no single path to trace (mask each child individually instead).

A hand-drawn scene shouldn't go still the moment it's drawn. Chain motion onto a node after its `drawOn` window closes — a limb that rotates (`waving-character.ts`), a group that launches off-frame (`rocket-liftoff.ts`), a line that drifts and fades (`coffee-steam.ts`). Every already-drawn line also re-jitters a few times a second on its own (see "line boil" below) even with no animation chained onto it at all — a static scene still reads as hand-drawn, not laser-cut.

## Self-verification, without burning tokens

Rendering a full screenshot after every edit is slow and expensive. sketchling checks in three tiers, cheapest first:

- **Tier 0 (free, every render).** A deterministic structural linter — off-canvas elements, degenerate paths, heavy overlaps, off-center composition — runs in plain code, zero LLM tokens, before any pixel exists.
- **Tier 1 (cheap).** `--crop` renders just the content's bounding box instead of the full canvas, for a cheap visual check while iterating.
- **Tier 2 (occasional).** A full-resolution render, for a final look.

```
sketchling render scene.ts --out preview.png            # full render, settled end state
sketchling render scene.ts --out preview.png --at 0.6    # a specific point in the timeline
sketchling render scene.ts --crop --out thumb.png        # cropped to content
sketchling render scene.ts --video out.mp4 --fps 24      # the whole timeline, as an MP4
sketchling render scene.ts --serve                       # open it live in a real browser
```

## How it works

A scene graph (`Scene` → `Stroke`/`Blob`/`Group`, styled and timed) is built by running your `scene.ts` in Node — the core library has no DOM dependency, so this is cheap and lets the Tier 0 linter run before any rendering happens. The serialized scene is then handed to a headless Chromium page, where [rough.js](https://roughjs.com) draws it as SVG and [GSAP](https://gsap.com) drives the timeline.

`drawOn` does **not** dash-reveal rough.js's own output path — rough.js authors its `d` as several short overlapping passes for sketchy texture, not one sequential sweep, so a direct dash-reveal doesn't trace in visual order (a rectangle can render fully closed a fifth of the way through its draw). Instead, each shape is revealed through an SVG mask built from the *clean* geometric path: a stroked copy of it drives the dash-reveal (the pen trace), and for closed shapes a filled copy fades in behind it once the trace is mostly through (the interior flood, like ink catching up to a pen) — together they reveal the real rendered artwork, hachure fills included, in the order a hand would actually draw it. A small dot rides the trace's leading edge as the pen tip. The pace itself uses GSAP's `RoughEase` rather than linear or classically-eased timing, so the draw hesitates and quickens unevenly instead of moving at a constant or smoothly-accelerating rate — both of which read as mechanical.

**Line boil.** A hand never traces the exact same wobble twice — a line that stops moving the instant it lands reads as dead, no matter how well it got there. Every stroke is actually rendered two or three times, each with a different rough.js seed, stacked in the same spot; visibility cycles between them a few times a second for as long as the shape is on screen, drawn or not. It's a small, continuous re-jitter — never a jump — running for the life of the scene, including during the end-of-video hold.

**Pacing.** One pen draws at a time: examples schedule each shape's `drawOn` window after the previous one finishes, with a short gap standing in for a pen lift, rather than starting several shapes at once. A scene *can* run shapes concurrently (nothing enforces single-pen scheduling), but two things drawing themselves simultaneously reads as two hands, not one — schedule sequentially, with gaps, unless you deliberately want that effect.

## Status

Early and opinionated by design: v1 targets one aesthetic (flat, hand-drawn line illustration, the Notion/Anthropic register) rather than being a general illustration engine. The bet is that a small, well-designed vocabulary in one register beats a sprawling API that does everything adequately. Broader styles come once this one is genuinely good.

## License

MIT
