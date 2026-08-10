import type { Anchor, AuthorAnimOp, AuthorTimingOpts, NodeStyle, Point, TimeRef, Transform } from "./types.js";
import { hashSeed, DEFAULT_OP_DURATION, polylineLengthDrawDuration } from "./geometry.js";

let autoId = 0;

export abstract class SketchNode {
  readonly id: string;
  // No separate "blob" member: a Blob subclasses Stroke with its outline points baked at
  // construction, so it serializes (and renders) as a plain closed stroke.
  abstract readonly type: "stroke" | "group" | "mesh3d" | "limb" | "connector" | "particles" | "sound";
  style: NodeStyle;
  transform: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  animations: AuthorAnimOp[] = [];
  seed: number;
  /** A stable, author-chosen handle for diagnostics and agent tooling. */
  label?: string;
  lintSuppress?: string[];

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

  /** Names this node for machine-readable diagnostics. Names need only be unique within a
   * scene; unlike auto-generated ids, they are intended to survive source edits. */
  named(label: string): this {
    if (!label.trim()) throw new Error("Node names must not be empty.");
    this.label = label;
    return this;
  }

  /** Silences a specific structural lint check on this node — e.g. an intentionally
   * heavy overlap (layered mechanical rings, a detail meant to sit flush against its
   * container) that isn't the "eye in a head" containment shape lint already recognizes
   * as normal. Check names: "overlap". Stacks across calls; each call adds, none remove. */
  lintIgnore(...checks: string[]): this {
    this.lintSuppress = [...(this.lintSuppress ?? []), ...checks];
    return this;
  }

  /** Anchors rotateTo/scaleTo at an absolute canvas point instead of the shape's own
   * center — e.g. a raised arm should swing from the shoulder, not its own midpoint. */
  pivotAt(x: number, y: number): this {
    this.transform.pivot = [x, y] as Point;
    return this;
  }

  /** The end time (seconds) of the most recently added animation — `at + duration`, using
   * the same default duration every op kind actually renders with when none is given
   * explicitly. Lets a chain build off its own last step (`node.moveTo(...); node.rotateTo(
   * ..., { at: node.endAt, duration: ... })`) instead of hand-summing durations, the single
   * biggest source of the "wall of manually computed literals" every independent stress
   * test of this library hit at real scene length. Throws if the last op's own `at` is
   * still an unresolved label reference (a string) — labels only resolve to numbers at
   * Scene.serialize() time, after every node has finished authoring, so there's nothing
   * concrete to add a duration to yet; use an explicit numeric `at` for a chain you're
   * building off of, and save labels for referencing a point across different nodes/ops. */
  get endAt(): number {
    const last = this.animations[this.animations.length - 1];
    if (!last) return 0;
    if (typeof last.at === "string") {
      throw new Error(
        `.endAt was read after an animation whose "at" is still the label reference "${last.at}" ` +
          `— labels resolve to numbers at render time, not while a scene is being built. Use a ` +
          `plain numeric "at" for the step you're chaining off of.`
      );
    }
    const at = last.at ?? 0;
    if ("duration" in last && last.duration != null) return at + last.duration;
    if (last.kind === "drawOn") {
      const self = this as unknown as { points?: Point[]; closed?: boolean };
      if (self.points) return at + polylineLengthDrawDuration(self.points, !!self.closed);
    }
    return at + (DEFAULT_OP_DURATION[last.kind] ?? 0.6);
  }

  /** Progressive stroke reveal — the line draws itself, like a hand sketching it. Only
   * meaningful on a stroke/loop/blob; on a Group (or any other composite node) there's no
   * single path to reveal, so it has no effect — validate/lint flags this. For a composite,
   * use the Group's own `.stagger({ effect: "drawOn" })` to draw each child in sequence. */
  drawOn(opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "drawOn", ...opts });
    return this;
  }

  appear(opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "appear", ...opts });
    return this;
  }

  /** Moves this node so that `anchor` (default `"center"`, the bbox center — unchanged
   * from before this option existed) lands on absolute canvas point (x, y). `"top"` /
   * `"bottom"` / `"left"` / `"right"` target that edge's own midpoint instead — `anchor:
   * "bottom"` for a vertically lopsided character (tall body, small feet) places its feet
   * at (x, y) directly, instead of requiring `y + (bboxCenterY - feetY)` worked out by
   * hand first. */
  moveTo(x: number, y: number, opts: AuthorTimingOpts & { anchor?: Anchor } = {}): this {
    this.animations.push({ kind: "moveTo", x, y, ...opts });
    return this;
  }

  moveBy(dx: number, dy: number, opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "moveBy", dx, dy, ...opts });
    return this;
  }

  scaleTo(scale: number, opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "scaleTo", scale, ...opts });
    return this;
  }

  rotateTo(degrees: number, opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "rotateTo", degrees, ...opts });
    return this;
  }

  /** Rotates relative to whatever rotation this node is actually at when the tween starts
   * playing — including mid-tween through an earlier rotateTo/rotateBy — instead of an
   * absolute target you'd otherwise have to compute by hand (a repeated wind-up gesture,
   * a crank turned by the same amount each time regardless of where the last turn left
   * it). `sketch.walk`'s own gait and camera.follow both already resolve live the same
   * way; this gives that same relative composition to a plain rotateBy call. */
  rotateBy(degrees: number, opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "rotateBy", degrees, ...opts });
    return this;
  }

  fadeTo(opacity: number, opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "fadeTo", opacity, ...opts });
    return this;
  }

  /** Moves along a curved path through `points` instead of the straight line a chain of
   * moveBy calls would draw — one tween, not several stitched-together linear segments.
   * `rotate: true` orients the node to face the direction of travel (a bird banking into
   * a turn), off by default (most shapes should stay upright while they travel). `anchor`
   * (default `"center"`) is the same bbox-point option `moveTo` takes — `"bottom"` walks a
   * lopsided character's feet along `points`, not its bbox center. */
  moveAlong(points: Point[], opts: AuthorTimingOpts & { rotate?: boolean; anchor?: Anchor } = {}): this {
    const { rotate, ...timing } = opts;
    this.animations.push({ kind: "moveAlong", points, rotate, ...timing });
    return this;
  }

  /** Non-uniform scale — squash-and-stretch, the basic cartoon weight/impact cue (a body
   * flattens wide on landing, stretches tall mid-jump). Independent scaleX/scaleY, unlike
   * the uniform scaleTo(). */
  squashTo(scaleX: number, scaleY: number, opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "squashTo", scaleX, scaleY, ...opts });
    return this;
  }

  /** Morphs the drawn shape's outline (and fill, if it has one) into a new set of points,
   * after it's already been drawn — a stroke/loop/blob becoming a different shape rather
   * than a fresh one appearing. Only meaningful on stroke/loop/blob nodes (not Group);
   * disables line-boil on this node, since re-jittering between un-morphed variants would
   * make it visibly snap back mid-animation. */
  morphTo(points: Point[], opts: AuthorTimingOpts = {}): this {
    this.animations.push({ kind: "morphTo", points, ...opts });
    return this;
  }

  /** Secondary motion: this node chases `driver`'s live position (plus a fixed offset)
   * with damped-spring lag and overshoot instead of a hand-authored delay — a floppy ear,
   * a trailing bead, anything that should react to what another node does rather than run
   * its own fixed-duration tween. `stiffness` higher = snappier/less lag; `damping` higher
   * = less overshoot (near `2*sqrt(stiffness)` is critically damped — no overshoot at all).
   * Runs from `at` (default 0) through the rest of the timeline. Only one springTo is
   * meaningful per node — it drives the same transform moveTo/moveBy would. */
  springTo(driver: SketchNode, opts: SpringOpts = {}): this {
    this.animations.push({
      kind: "springTo",
      driverId: driver.id,
      offsetX: opts.offset?.[0] ?? 0,
      offsetY: opts.offset?.[1] ?? 0,
      stiffness: opts.stiffness ?? 120,
      damping: opts.damping ?? 12,
      at: opts.at ?? 0,
    });
    return this;
  }
}

export interface SpringOpts {
  offset?: Point;
  stiffness?: number;
  damping?: number;
  at?: TimeRef;
}
