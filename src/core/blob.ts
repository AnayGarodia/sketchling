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
    // The node's id-derived seed doesn't exist until super() has run, so the outline is
    // generated right after instead of being passed in — keeps the only source of blob
    // randomness the deterministic per-node seed, with no throwaway Math.random() pass.
    super([], style, true);
    this.points = blobPoints(cx, cy, radius, style.looseness ?? 0.3, this.seed, vertices);
  }
}
