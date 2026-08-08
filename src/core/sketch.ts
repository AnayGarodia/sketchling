import { Stroke } from "./stroke.js";
import { Blob } from "./blob.js";
import { Group } from "./group.js";
import { Scene, type SceneOptions } from "./scene.js";
import { Film, type FilmOptions } from "./film.js";
import { buildText } from "./font.js";
import { buildArrow, buildSpeechBubble, type ArrowOptions, type SpeechBubbleOptions } from "./shapes.js";
import { Mesh3D, box3d, icosahedron3d } from "./mesh3d.js";
import type { NodeStyle, Point, Point3 } from "./types.js";

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
  group(children: import("./node.js").SketchNode[] = [], style: NodeStyle = {}): Group {
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
};
