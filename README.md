# sketchling

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A hand-drawn illustration and animation language for LLMs. Manim gave language models a way to express math visually in code; sketchling does the same for expressive, hand-drawn illustration and motion, in the register of Notion's and Anthropic's site illustrations.

![potted plant, drawn and animated by sketchling](docs/potted-plant.gif)

```
npm install -g sketchling
```

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

If you're working inside a clone of this repo rather than a published install, `examples/*.ts` import from `../src/index.js` instead of `"sketchling"` — same API, just a relative path to the unbuilt source until you `npm link` or install the published package.

## Gallery

Seven scenes, different corners of the vocabulary — source for all of them is in `examples/`, and each one renders as an animation (`--video`), not just a still. Nothing in these scenes goes still the instant it's drawn.

| | | |
|---|---|---|
| ![keyhole laptop](docs/keyhole-laptop.png) | ![doodle flourish](docs/doodle-flourish.png) | ![waving character](docs/waving-character.png) |
| ![rocket liftoff](docs/rocket-liftoff.png) | ![coffee steam](docs/coffee-steam.png) | ![jellyfish drift](docs/jellyfish-drift.png) |

Boxy geometry with solid fills, hachure and cross-hatch texture, pure open-stroke linework with no fills at all, an organic blob-built character that waves once it's drawn, a rocket that launches off the top of the frame leaving its exhaust behind, rising coffee steam that drifts and fades after it draws, and a jellyfish with independently-waving tentacles and a slow breathing pulse.

That last one — `jellyfish-drift.ts` — wasn't written by us. It was written by a fresh Claude agent given nothing but this README and the other six example files: no access to the renderer's source, no conversation history, no hints. It built and rendered on the first attempt, no fixes needed. That's the actual test of "an LLM can pick this up," not just a claim — see [`docs/launch-reel.mp4`](docs/launch-reel.mp4) for the full sequence.

A second, larger cold test went further: [`story/`](story/) is a six-scene short — *Pip and the Sapling* — written the same way (README and `examples/` only, nothing else), with a real beginning, middle, and end, and one character drawn consistently across every scene. [`docs/pip-and-the-sapling.mp4`](docs/pip-and-the-sapling.mp4) is the result, kept exactly as written.

## Vocabulary

- `sketch.stroke(points, style)` — an open freehand line
- `sketch.loop(points, style)` — a closed freehand shape
- `sketch.blob(cx, cy, radius, style, vertices?)` — an organic, deliberately-not-a-perfect-circle shape. `vertices` (default `10`) controls how many points make up the outline — more reads as a rounder, calmer blob, fewer as looser and more angular. Below roughly 8–9px radius, the outline's own jitter starts to overwhelm the interior fill and small blobs (bubbles, dots) stop reading clearly — for tiny details, favor a larger radius and a lighter `weight` over shrinking the outline.
- `sketch.group(children)` — groups nodes; `.stagger(each, opts)` choreographs their entrance with rhythm:
  ```ts
  const dots = sketch.group();
  scene.add(dots);
  for (const [x, y] of positions) dots.add(sketch.blob(x, y, 18, style));
  dots.stagger(0.3, { duration: 0.5 }); // each child's drawOn starts 0.3s after the last
  ```
- `sketch.text(str, x, y, style, {size?})` — hand-lettered text: lowercase a-z, digits, basic punctuation, no case distinction (uppercase input reuses the lowercase glyph). There's no outline-font renderer behind this, just a hand-plotted alphabet — enough for a caption or a title, not a general typesetting system. Returns a `Group` of per-letter strokes; animate with `.stagger()` for a letter-by-letter reveal.
- `sketch.film({width, height, background})` — cuts several independent `Scene`s together into one render (see Film below).

**Style:** `color`, `weight` (`"light" | "confident" | "bold"` or a number), `looseness` (0–1, precise → wild — perturbs both the shape's outline and the render jitter), `energy` (`"calm" | "quick" | "frantic"`), `smooth` (spline through points for organic shapes vs. straight edges for boxes/wedges — default `true`), `fill` (`{ color, style: "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots", density, angle }`).

**Animation:** every node — `.drawOn({at, duration, ease})` (the line draws itself; `duration` is optional — omitted, it's derived from the path's own length, so a long outline doesn't flash on screen as fast as a short one), `.appear(...)` (fade in), `.moveTo(x, y, ...)`, `.moveBy(dx, dy, ...)`, `.scaleTo(s, ...)`, `.rotateTo(deg, ...)`, `.fadeTo(opacity, ...)`. `at` is an absolute timeline position in seconds, shared across the whole scene — the same vocabulary Manim's `self.play` gives you, but for a browser timeline instead of a math diagram. `.pivotAt(x, y)` anchors `rotateTo`/`scaleTo` at an absolute canvas point instead of the shape's own center — a raised arm should swing from the shoulder, not spin around its own midpoint (see `waving-character.ts`).

`moveTo(x, y)` is a true absolute position — the node's own geometric center lands on canvas `(x, y)`, regardless of where it currently sits, even after earlier `moveBy`/`moveTo` calls. `moveBy(dx, dy)` is relative to wherever the node currently is.

A single scene animates only what it's told to — nothing loops or idles on its own. `.drawOn()` only reveals `stroke`/`blob`/`loop` nodes and the groups `sketch.text()` builds; calling it on a plain `Group` is a no-op, since a group has no single path to trace (mask each child individually, or use `.stagger()`, instead).

A hand-drawn scene shouldn't go still the moment it's drawn. Chain motion onto a node after its `drawOn` window closes — a limb that rotates (`waving-character.ts`), a group that launches off-frame (`rocket-liftoff.ts`), a line that drifts and fades (`coffee-steam.ts`). Every already-drawn line also re-jitters a few times a second on its own (see "line boil" below) even with no animation chained onto it at all — a static scene still reads as hand-drawn, not laser-cut. None of this is required, though — a still composition with no post-draw motion at all is a completely normal thing to build.

## Film — cutting scenes together

```ts
const film = sketch.film({ width: 640, height: 480, background: "#111" });
film.addScene(sceneA, { transition: "cut", hold: 0.4 });
film.addScene(sceneB, { transition: "fade", transitionDuration: 0.5, hold: 0.4 });
export default film; // same CLI, same flags, same lint — a Film renders exactly like a Scene
```

Each scene keeps its own size, background, and animation, entirely independent of the others — `Film` scales and centers each one into its own shared canvas (letterboxing whatever doesn't match) and sequences them with a `"cut"` (instant, default) or `"fade"` (crossfade over `transitionDuration`) between each. `hold` is how long a scene sits on its settled frame before the next takes over. There's no shared runtime state between scenes — each one draws its own world from scratch — so a recurring character across a longer sequence needs its own shared builder function reused across scene files (see `story/_shared.ts`).

## Self-verification, without burning tokens

Rendering a full screenshot after every edit is slow and expensive. sketchling checks in three tiers, cheapest first:

- **Tier 0 (free, every render).** A deterministic structural linter — off-canvas elements, degenerate paths, heavy overlaps, off-center composition — runs in plain code, zero LLM tokens, before any pixel exists. Nested detail (eyes on a face, a keyhole on a laptop screen) routinely trips the overlap warning — that's expected noise for intentional nesting, not a sign something's wrong; it's there to catch two *unrelated* shapes stacked by mistake.
- **Tier 1 (cheap).** `--crop` renders just the content's bounding box instead of the full canvas, for a cheap visual check while iterating.
- **Tier 2 (occasional).** A full-resolution render, for a final look.

```
sketchling render scene.ts --out preview.png            # full render, settled end state
sketchling render scene.ts --out preview.png --at 0.6    # a specific point in the timeline
sketchling render scene.ts --crop --out thumb.png        # cropped to content
sketchling render scene.ts --video out.mp4 --fps 24      # the whole timeline, as an MP4
sketchling render scene.ts --serve                       # open it live in a real browser
```

`--video` runs about a second longer than the scene's own timeline — it holds on the settled end frame instead of cutting on the exact last drawn frame.

## How it works

A scene graph (`Scene` → `Stroke`/`Blob`/`Group`, styled and timed) is built by running your `scene.ts` in Node — the core library has no DOM dependency, so this is cheap and lets the Tier 0 linter run before any rendering happens. The serialized scene is then handed to a headless Chromium page, where [rough.js](https://roughjs.com) draws it as SVG and [GSAP](https://gsap.com) drives the timeline.

`drawOn` does **not** dash-reveal rough.js's own output path — rough.js authors its `d` as several short overlapping passes for sketchy texture, not one sequential sweep, so a direct dash-reveal doesn't trace in visual order (a rectangle can render fully closed a fifth of the way through its draw). Instead, each shape is revealed through an SVG mask built from the *clean* geometric path: a stroked copy of it drives the dash-reveal (the pen trace), and for closed shapes a clipped zigzag scribble dash-reveals the interior row by row once the trace is mostly through (like a hand coloring it in, not a flat block fading in) — together they reveal the real rendered artwork, hachure fills included, in the order a hand would actually draw it. A small dot rides the trace's leading edge as the pen tip. The pace itself uses GSAP's `RoughEase` rather than linear or classically-eased timing, so the draw hesitates and quickens unevenly instead of moving at a constant or smoothly-accelerating rate — both of which read as mechanical.

**Line boil.** A hand never traces the exact same wobble twice — a line that stops moving the instant it lands reads as dead, no matter how well it got there. Every stroke is actually rendered two or three times, each with a different rough.js seed, stacked in the same spot; visibility cycles between them a few times a second for as long as the shape is on screen, drawn or not. It's a small, continuous re-jitter — never a jump — running for the life of the scene, including during the end-of-video hold.

**Pacing.** One pen draws at a time: examples schedule each shape's `drawOn` window after the previous one finishes, with a short gap standing in for a pen lift, rather than starting several shapes at once. A scene *can* run shapes concurrently (nothing enforces single-pen scheduling), but two things drawing themselves simultaneously reads as two hands, not one — schedule sequentially, with gaps, unless you deliberately want that effect.

## Status and roadmap

Early and opinionated by design: v1 targets one aesthetic (flat, hand-drawn line illustration, the Notion/Anthropic register) rather than being a general illustration engine. The bet is that a small, well-designed vocabulary in one register beats a sprawling API that does everything adequately. Broader styles come once this one is genuinely good.

If you're using [Claude Code](https://claude.com/claude-code) inside this repo, `.claude/skills/sketchling/` is available and teaches the vocabulary directly — no README round-trip needed.

Not yet built: more shape helpers (`sketch.arrow()`, `sketch.speechBubble()`, etc.) as thin geometric compositions of the existing primitives, not a curated asset library — that's a deliberate non-goal, see "Why" above; shape-to-shape morphing (GSAP's MorphSVGPlugin is already an installed dependency, unused so far).

## Contributing

Issues and PRs welcome. If you build a scene that stress-tests the vocabulary in a new direction — a style `drawOn` doesn't handle well, a composition the Tier 0 linter gets wrong — that's exactly the kind of thing worth opening an issue for, ideally with the scene file attached.

## License

MIT — see [LICENSE](LICENSE).
