import { Stroke } from "./stroke.js";
import { Blob } from "./blob.js";
import { Group } from "./group.js";
import { Scene, type SceneOptions } from "./scene.js";
import { Film, type FilmOptions } from "./film.js";
import { buildText } from "./font.js";
import { buildArrow, buildSpeechBubble, type ArrowOptions, type SpeechBubbleOptions } from "./shapes.js";
import { Mesh3D, box3d, icosahedron3d } from "./mesh3d.js";
import { Limb, limb, type LimbOpts } from "./limb.js";
import { walk, type WalkOptions, type WalkResult } from "./gait.js";
import { Connector } from "./connector.js";
import { Particles, type ParticleOpts } from "./particles.js";
import { quickRig, type QuickRig, type QuickRigOpts } from "./quickrig.js";
import { Sound, type SoundOpts } from "./sound.js";
import { shade, type ShadeOptions } from "./color.js";
import type { SketchNode } from "./node.js";
import type { NodeStyle, Point, Point3 } from "./types.js";
import type { SceneBackground } from "./types.js";

export const sketch = {
  scene(opts: SceneOptions = {}): Scene {
    return new Scene(opts);
  },
  stroke(points: Point[], style: NodeStyle = {}): Stroke {
    return new Stroke(points, style, false);
  },
  loop(points: Point[], style: NodeStyle = {}): Stroke {
    return new Stroke(points, style, true);
  },
  blob(cx: number, cy: number, radius: number, style: NodeStyle = {}, vertices = 10): Blob {
    return new Blob(cx, cy, radius, style, vertices);
  },
  group(children: SketchNode[] = [], style: NodeStyle = {}): Group {
    return new Group(children, style);
  },
  film(opts: FilmOptions = {}): Film {
    return new Film(opts);
  },
  /** Hand-drawn lettering — lowercase a-z, digits, and basic punctuation, no case
   * distinction (uppercase reuses the lowercase glyph). Returns a Group of per-letter
   * strokes; animate it with `.stagger()` for a letter-by-letter reveal. `size` is an
   * approximate letter height in pixels (default 48), not a raw scale multiplier. */
  text(str: string, x: number, y: number, style: NodeStyle = {}, opts: { size?: number } = {}): Group {
    return buildText(str, x, y, style, opts.size);
  },
  /** A shaft plus a two-stroke head, angled to point from `from` toward `to` — a thin
   * composition of stroke(), the same construction as hand-plotting one, parameterized. */
  arrow(from: Point, to: Point, style: NodeStyle = {}, opts: ArrowOptions = {}): Group {
    return buildArrow(from, to, style, opts);
  },
  /** A rounded rectangle with a triangular tail — one closed stroke, draws and fills as a
   * single shape. `tailAt` picks which corner-ish position the tail points from. */
  speechBubble(x: number, y: number, width: number, height: number, style: NodeStyle = {}, opts: SpeechBubbleOptions = {}): Stroke {
    return buildSpeechBubble(x, y, width, height, style, opts);
  },
  /** A rotating box, sketched as six flat-shaded rough.js faces reprojected every frame —
   * a genuine 3D solid, not a flat rectangle with a drop shadow. Centered on its own
   * origin; place it with moveTo/moveBy, spin it with .spin3d(rx, ry, rz, opts). */
  box3d(w: number, h: number, d: number, style: NodeStyle = {}): Mesh3D {
    return box3d(w, h, d, style);
  },
  /** A 20-face rotating solid — the roundest shape available from flat faces, for wherever
   * a spinning "orb" reads better than a boxy one. Same placement/spin API as box3d. */
  icosahedron3d(radius: number, style: NodeStyle = {}): Mesh3D {
    return icosahedron3d(radius, style);
  },
  /** A fully custom 3D solid — local-space vertices plus faces wound counter-clockwise (as
   * seen from outside the solid, matching box3d/icosahedron3d's own winding) for correct
   * flat-shading and painter's-algorithm depth sorting. */
  mesh3d(vertices: Point3[], faces: { indices: number[]; color?: string }[], style: NodeStyle = {}): Mesh3D {
    return new Mesh3D(vertices, faces, style);
  },
  /** A 2-bone IK limb (leg or arm): two segments whose joint angle is solved every frame
   * from a target position, instead of a hand-authored rotateTo per segment. Rest pose
   * hangs straight down from (rootX, rootY) — override with .restAt(), animate the target
   * with .ikTo(x, y, opts). Chain moveTo/moveBy/rotateTo on the limb itself like any node
   * to place/orient the whole chain; ikTo only moves the end effector within it. */
  limb(rootX: number, rootY: number, len1: number, len2: number, style: NodeStyle = {}, opts: LimbOpts = {}): Limb {
    return limb(rootX, rootY, len1, len2, style, opts);
  },
  /** A procedural bipedal walk cycle: given a body node and two IK legs, generates a full
   * gait (foot planting, lift-and-swing, body bob) from step count and stride length —
   * no hand-tuned rotateTo per pose. The planted leg is provably zero-slide (see gait.ts)
   * rather than tuned to look close. Returns { endAt } so callers can chain what follows
   * the walk without hand-computing the total duration themselves. */
  walk(opts: WalkOptions): WalkResult {
    return walk(opts);
  },
  /** A stroke that rebuilds itself every seek to run from a fixed `anchor` to `target`'s own
   * live position, bowed into a gentle curve — pair it with a `springTo`'d node to get an
   * actual bendy ear/antenna/tail, since `springTo` alone moves a node's position but can't
   * visually attach it to anything. No `drawOn` (there's no stable path length to reveal
   * against geometry that changes every frame) and no line-boil (it already fully rebuilds
   * each seek); `fadeTo`/`moveTo`/etc. on its own transform still work normally. */
  connector(anchor: Point, target: SketchNode, style: NodeStyle = {}): Connector {
    return new Connector(anchor, target, style);
  },
  /** A particle emitter: `count` small dots launched from (x, y) within a cone, each under
   * constant gravity — sparks, dust, confetti, snow, a firework burst. Every particle's
   * spawn time/angle/speed/size is drawn once from a seeded PRNG, so its position at any t
   * is a closed-form ballistic formula, not a simulation — seeking anywhere is exact with
   * no precomputed table needed. */
  particles(x: number, y: number, style: NodeStyle = {}, opts: ParticleOpts = {}): Particles {
    return new Particles(x, y, style, opts);
  },
  /** Auto-derives a headroom-safe two-legged rig (two sketch.limb legs) from a drawn body's
   * own bounding box, instead of hand-placing hip coordinates and leg lengths — see
   * quickrig.ts for the worst-case-reach math this automates. Proportion-based (center,
   * width, bottom edge of `body`'s bbox), not a real skeleton extracted from an arbitrary
   * silhouette — good for a round or roughly-humanoid body, not a substitute for hand-placed
   * joints on an unusual shape. */
  quickRig(body: Stroke | Group, opts: QuickRigOpts): QuickRig {
    return quickRig(body, opts);
  },
  /** One scheduled note or hit — sketchling's only audio primitive, on the same scene-
   * global `at` timeline every animation already uses. `pitch` is scientific pitch notation
   * ("C4"), a raw MIDI number, or `null` for an unpitched percussive hit. `instrument`
   * names a voice the renderer knows ("piano", "strings", "pad", "pluck", "thud", "brush",
   * ...); melodic instruments are sample-based where a real sample set is available,
   * percussive/effect voices are always synthesized. No chord/melody/mood helper on top —
   * a chord is several sketch.sound() calls at the same `at`; composing them is the
   * caller's job, the same "primitives, not a curated library" boundary the visual side
   * draws around shape helpers. */
  sound(pitch: string | number | null, opts: SoundOpts = {}): Sound {
    return new Sound(pitch, opts);
  },
  /** Derives a real light-direction gradient from one base color instead of hand-picking
   * 2-3 hex stops per shape — a highlight → base → shadow spread, `from` picking which edge
   * the light comes from ("top" default), `amount` (0-1, default 0.35) picking how strong
   * the falloff is. Returns the same `{stops, direction}` shape `fill.color`/
   * `scene.background` already accept, so `fill: { color: sketch.shade("#8a7460"), style:
   * "solid" }` is a drop-in replacement for a flat color anywhere a gradient is valid (see
   * NodeStyle.fill's own doc comment on the solid-fillStyle requirement). The shadow side is
   * nudged slightly cool/blue-violet and the lit side slightly warm, not a plain lighter/
   * darker lerp — the same "cooler further back, warmer where lit" instinct every hand-
   * authored gradient in the showcase gallery already uses, made automatic. */
  shade(base: string, opts: ShadeOptions = {}): SceneBackground {
    return shade(base, opts);
  },
};
