# Finding: `rotateTo`/`scaleTo` without `pivotAt` pivots at the canvas origin

Status: **fixed** (see the Unreleased section of `CHANGELOG.md`). Found while building the
browser playground (`site/`), where it is the first thing a newcomer hits, and reported here
before being fixed — the reasoning below is kept because it is the useful part. The fix takes
the origin from the node's own authored geometry (`nodeBBox`), minus the node's translate, so
it lands in the same pre-translate space an explicit `pivotAt` already uses. Of the examples
that rotate or scale without a pivot, one changed: clay-look's bouncing ball now squashes in
place on the ground line.

## Symptom

A node that has never been given a pivot rotates and scales around the canvas's `(0, 0)`
corner rather than around itself. Small transforms therefore *drift* (a `scaleTo(1.05)`
nudges a shape a few px toward the corner, which reads as a wobble) and large ones *fling*
(a `rotateTo(60)` on a shape at `(400, 100)` sends it off-canvas entirely, so the shape
appears to vanish).

## Repro

`docs/notes` has no fixture for this; the shortest one is four nodes and one probe:

```ts
const scene = sketch.scene({ width: 600, height: 300, background: "#eeeae0", seed: "origin" });

const a = sketch.loop([[60, 120], [140, 120], [140, 180], [60, 180]], { color: "#111", smooth: false });
scene.add(a).appear({ at: 0, duration: 0.2 });
a.rotateTo(30, { at: 0.5, duration: 0.4 });        // swings out of frame to the left

const b = sketch.blob(250, 150, 40, { color: "#111" }, 12);
scene.add(b).drawOn({ at: 0, duration: 0.3 });
b.scaleTo(0.5, { at: 0.5, duration: 0.4 });        // ends up at (125, 75), not at (250, 150)

const d = sketch.loop([[500, 120], [560, 120], [560, 180], [500, 180]], { color: "#111", smooth: false });
d.pivotAt(530, 150);                                // control: correct, rotates in place
scene.add(d).appear({ at: 0, duration: 0.2 });
d.rotateTo(30, { at: 0.5, duration: 0.4 });
```

Rendered at `--at 1.0`, only the control is where it should be. Reading GSAP's own cached
transform state off each `<g>` (`g._gsap.xOrigin/yOrigin`) confirms it directly: every
un-pivoted node reports origin `0,0`; the pivoted one reports `530,150`. It reproduces for
`stroke`/`loop`/`blob`/`group`, with `appear` or `drawOn`, for `rotateTo`/`rotateBy`/
`scaleTo`/`squashTo` alike — i.e. it is not specific to any one op or node type.

## Root cause

`applyInitialTransform` (`src/render/renderer.ts`) runs at the *top* of `buildNode`, before
the node's artwork is appended and before `g` is attached to the document:

```ts
const g = document.createElementNS(SVG_NS, "g");
g.setAttribute("data-id", node.id);
applyInitialTransform(g, node);   // <- gsap.set(g, { ..., transformOrigin: "50% 50%" })
parent.appendChild(g);
```

`transformOrigin: "50% 50%"` on an SVG element is resolved by GSAP against `getBBox()`, and
an empty, detached `<g>` measures `0,0,0,0` — so GSAP caches `xOrigin/yOrigin = 0,0` on the
element and every later tween reuses that cache. The `t.pivot` branch is unaffected because
`svgOrigin` is an explicit coordinate pair that needs no measurement, which is why
`pivotAt` works and why the bug has stayed invisible: nearly everything in `examples/` that
rotates something visibly far from the origin already passes a pivot for other reasons.

## Candidate fixes

1. **Derive the origin instead of measuring it.** In the no-pivot branch, compute the node's
   own authored bbox centre (`nodeBBox` in `src/core/geometry.ts` already does this for the
   agent report) and emit it as `svgOrigin` minus the translate, exactly as the pivot branch
   does. Deterministic, needs no DOM measurement, and immune to a second wrinkle: `drawOn`
   appends a pen-tip `<circle>` to the same `<g>`, so a *measured* bbox centre would include
   the tip and not be the shape's centre either.
2. **Move the `transformOrigin` set** to after the artwork exists and `g` is attached. One
   line, but it reorders the initial `gsap.set` relative to animation construction in the
   most load-bearing file in the repo, for no gain over (1).

Either way `AGENTS.md` needs no change — it already documents the intended behaviour. Two
sentences in it are currently wrong in the other direction, though: the `sketch.walk` arms
note says an un-pivoted arm "rotates around its own bbox center" (it rotates around the
canvas corner), in AGENTS.md and in both `SKILL.md` copies.

## Blast radius, if fixed

~35 files under `examples/` call `rotateTo`/`rotateBy`/`scaleTo`/`squashTo` without a pivot
somewhere, including `examples/story/clay-baker.ts` (55 such calls), `nursery-blocks.ts`
(49), `harbor-explorer.ts` (30) and `jellyfish-drift.ts` (24). Those scenes were tuned by
eye against today's behaviour, so their renders will change — in most cases toward what the
scene's own comments say is intended (`jellyfish-drift.ts`'s "slow breathing pulse" would
pulse in place rather than drifting toward the top-left), but the committed stills, MP4s and
README GIFs would all be stale, and a few scenes may have accidentally come to depend on the
drift. Worth one pass of contact sheets over `examples/` before and after.

## Workaround until then

Pass `pivotAt(cx, cy)` at the shape's own centre whenever you rotate or scale it. All ten
playground presets in `site/presets/` do this, and it stays correct either way — once the
origin is fixed, an explicit centre pivot and the default agree.
