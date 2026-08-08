import type { CameraOp, TimingOpts } from "./types.js";
import type { SketchNode } from "./node.js";

/**
 * A scene's viewport, moved independently of anything drawn in it — panning/zooming
 * across a world larger than the canvas, or tracking a moving node, instead of every
 * shot being a fixed diorama cut away from at a Film boundary. Queued the same way a
 * node's own animations are (push an op with an absolute `at`), read by the renderer
 * against the same seek-driven timeline.
 */
export class Camera {
  ops: CameraOp[] = [];

  /** Pans so that scene-space point (x, y) becomes the viewport's center. */
  panTo(x: number, y: number, opts: TimingOpts = {}): this {
    this.ops.push({ kind: "panTo", x, y, ...opts });
    return this;
  }

  /** Zooms the viewport by `scale` (1 = authored size, >1 = closer in) around whatever
   * point is currently centered. */
  zoomTo(scale: number, opts: TimingOpts = {}): this {
    this.ops.push({ kind: "zoomTo", scale, ...opts });
    return this;
  }

  /** Keeps the viewport centered on `node` for the duration, tracking its live position
   * (including whatever moveTo/moveBy/moveAlong it's mid-tween through) rather than
   * panning to one fixed point and holding. */
  follow(node: SketchNode, opts: TimingOpts = {}): this {
    this.ops.push({ kind: "follow", nodeId: node.id, ...opts });
    return this;
  }
}
