import { Stroke } from "./stroke.js";
import { Blob } from "./blob.js";
import { Group } from "./group.js";
import { Scene, type SceneOptions } from "./scene.js";
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
};
