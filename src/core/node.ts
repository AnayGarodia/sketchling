import type { AnimOp, NodeStyle, Point, TimingOpts, Transform } from "./types.js";
import { hashSeed } from "./geometry.js";

let autoId = 0;

export abstract class SketchNode {
  readonly id: string;
  abstract readonly type: "stroke" | "blob" | "group";
  style: NodeStyle;
  transform: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  animations: AnimOp[] = [];
  seed: number;

  constructor(style: NodeStyle = {}, id?: string) {
    this.id = id ?? `n${autoId++}`;
    this.style = style;
    this.seed = hashSeed(this.id);
  }

  /** Sets the starting state before any animation runs (e.g. opacity: 0, scale: 0.8). */
  initial(t: Partial<Transform>): this {
    Object.assign(this.transform, t);
    return this;
  }

  withSeed(seed: number): this {
    this.seed = seed;
    return this;
  }

  /** Anchors rotateTo/scaleTo at an absolute canvas point instead of the shape's own
   * center — e.g. a raised arm should swing from the shoulder, not its own midpoint. */
  pivotAt(x: number, y: number): this {
    this.transform.pivot = [x, y] as Point;
    return this;
  }

  /** Progressive stroke reveal — the line draws itself, like a hand sketching it. */
  drawOn(opts: TimingOpts = {}): this {
    this.animations.push({ kind: "drawOn", ...opts });
    return this;
  }

  appear(opts: TimingOpts = {}): this {
    this.animations.push({ kind: "appear", ...opts });
    return this;
  }

  moveTo(x: number, y: number, opts: TimingOpts = {}): this {
    this.animations.push({ kind: "moveTo", x, y, ...opts });
    return this;
  }

  moveBy(dx: number, dy: number, opts: TimingOpts = {}): this {
    this.animations.push({ kind: "moveBy", dx, dy, ...opts });
    return this;
  }

  scaleTo(scale: number, opts: TimingOpts = {}): this {
    this.animations.push({ kind: "scaleTo", scale, ...opts });
    return this;
  }

  rotateTo(degrees: number, opts: TimingOpts = {}): this {
    this.animations.push({ kind: "rotateTo", degrees, ...opts });
    return this;
  }

  fadeTo(opacity: number, opts: TimingOpts = {}): this {
    this.animations.push({ kind: "fadeTo", opacity, ...opts });
    return this;
  }

  /** Morphs the drawn shape's outline (and fill, if it has one) into a new set of points,
   * after it's already been drawn — a stroke/loop/blob becoming a different shape rather
   * than a fresh one appearing. Only meaningful on stroke/loop/blob nodes (not Group);
   * disables line-boil on this node, since re-jittering between un-morphed variants would
   * make it visibly snap back mid-animation. */
  morphTo(points: Point[], opts: TimingOpts = {}): this {
    this.animations.push({ kind: "morphTo", points, ...opts });
    return this;
  }
}
