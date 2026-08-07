# sketchling

A hand-drawn illustration and animation language for LLMs — Manim gave language models a way to express math visually in code; sketchling does the same for expressive, hand-drawn illustration and motion, in the register of Notion's and Anthropic's site illustrations.

![keyhole laptop, drawn and rendered by sketchling](docs/keyhole-laptop.png)

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

**Animation:** every node — `.drawOn({at, duration, ease})` (the line draws itself), `.appear(...)` (fade in), `.moveTo(x, y, ...)`, `.moveBy(dx, dy, ...)`, `.scaleTo(s, ...)`, `.rotateTo(deg, ...)`, `.fadeTo(opacity, ...)`. `at` is an absolute timeline position in seconds, shared across the whole scene — the same vocabulary Manim's `self.play` gives you, but for a browser timeline instead of a math diagram.

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

A scene graph (`Scene` → `Stroke`/`Blob`/`Group`, styled and timed) is built by running your `scene.ts` in Node — the core library has no DOM dependency, so this is cheap and lets the Tier 0 linter run before any rendering happens. The serialized scene is then handed to a headless Chromium page, where [rough.js](https://roughjs.com) draws it as SVG and [GSAP](https://gsap.com) drives the timeline. `drawOn` is implemented as a stroke-dasharray reveal on the actual rough.js-generated path (steady pace, not eased — an ease-out here reads as mechanical rather than drawn), so the hand-drawn jitter draws in stroke-by-stroke, not as a generic wipe. A filled shape's fill isn't a separate concurrent fade: it trails the outline (starting partway through the stroke, settling shortly after it finishes), like ink catching up to a pen, rather than two unrelated motions layered on top of each other.

## Status

Early and opinionated by design: v1 targets one aesthetic (flat, hand-drawn line illustration, the Notion/Anthropic register) rather than being a general illustration engine. The bet is that a small, well-designed vocabulary in one register beats a sprawling API that does everything adequately. Broader styles come once this one is genuinely good.

## License

MIT
