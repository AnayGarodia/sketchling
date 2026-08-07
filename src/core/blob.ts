import { Stroke } from "./stroke.js";
import type { NodeStyle } from "./types.js";
import { blobPoints } from "./geometry.js";

/**
 * A closed, organic shape — deliberately not a perfect circle. `looseness`
 * (inherited via style) perturbs the outline itself, on top of whatever
 * render-time sketchiness the renderer adds, so the same blob never comes
 * out geometrically identical to a compass-drawn circle.
 */
export class Blob extends Stroke {
  constructor(cx: number, cy: number, radius: number, style: NodeStyle = {}, vertices = 10) {
    const looseness = style.looseness ?? 0.3;
    const seed = Math.floor(Math.random() * 1e9); // temp; overwritten below once id exists
    const points = blobPoints(cx, cy, radius, looseness, seed, vertices);
    super(points, style, true);
    // regenerate with the node's real (id-derived) seed for determinism
    this.points = blobPoints(cx, cy, radius, looseness, this.seed, vertices);
  }
}
