import { SketchNode } from "./node.js";
import type { NodeStyle, TimingOpts } from "./types.js";

export interface LimbOpts {
  // Which of the two valid knee/elbow solutions to use — 1 bends the joint to the left of
  // the root→target line, -1 to the right. Whichever reads correctly for the limb's own
  // orientation; check with a render, there's no universal "correct" side.
  bend?: 1 | -1;
  // Foot/hand cap blob radius at the end effector; 0 (default) draws just the two segments.
  capRadius?: number;
  capColor?: string; // defaults to style.fill?.color ?? style.color
}

/**
 * A 2-bone IK limb: two segments (len1 root→joint, len2 joint→end) whose joint angle is
 * solved every frame from a target position, instead of a hand-authored rotateTo per
 * segment. The target defaults to hanging straight down from the root (a natural rest
 * pose) — animate it with ikTo, or set a different rest pose with restAt before any
 * animation runs. Renders as two rough.js strokes plus an optional end cap, rebuilt every
 * tick the target is moving, the same "tween a plain state object, rebuild geometry in
 * onUpdate" pattern as Mesh3D's spin3d.
 */
export class Limb extends SketchNode {
  readonly type = "limb" as const;
  rootX: number;
  rootY: number;
  len1: number;
  len2: number;
  bend: 1 | -1;
  capRadius: number;
  capColor?: string;
  // Current IK target, in the limb's own local space — the same coordinate frame as
  // rootX/rootY (and every other point authored in this library).
  targetX: number;
  targetY: number;

  constructor(
    rootX: number,
    rootY: number,
    len1: number,
    len2: number,
    style: NodeStyle = {},
    opts: LimbOpts = {}
  ) {
    super(style);
    this.rootX = rootX;
    this.rootY = rootY;
    this.len1 = len1;
    this.len2 = len2;
    this.bend = opts.bend ?? 1;
    this.capRadius = opts.capRadius ?? 0;
    this.capColor = opts.capColor;
    this.targetX = rootX;
    this.targetY = rootY + len1 + len2;
  }

  /** Sets the limb's resting target (in effect before any ikTo runs) — the foot/hand
   * position at t=0. Chain off the constructor: sketch.limb(...).restAt(x, y). */
  restAt(x: number, y: number): this {
    this.targetX = x;
    this.targetY = y;
    return this;
  }

  /** Animates the end effector (foot/hand) to a new target in the limb's own local space.
   * Absolute-target like moveTo/rotateTo — chaining several composes the same way. The
   * joint angle is re-solved from the target every frame, not interpolated directly. */
  ikTo(x: number, y: number, opts: TimingOpts = {}): this {
    this.animations.push({ kind: "ikTo", x, y, ...opts });
    return this;
  }
}

export function limb(
  rootX: number,
  rootY: number,
  len1: number,
  len2: number,
  style: NodeStyle = {},
  opts: LimbOpts = {}
): Limb {
  return new Limb(rootX, rootY, len1, len2, style, opts);
}
