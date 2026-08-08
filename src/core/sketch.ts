import { Stroke } from "./stroke.js";
import { Blob } from "./blob.js";
import { Group } from "./group.js";
import { Scene, type SceneOptions } from "./scene.js";
import { Film, type FilmOptions } from "./film.js";
import { buildText } from "./font.js";
import type { NodeStyle, Point } from "./types.js";

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
};
