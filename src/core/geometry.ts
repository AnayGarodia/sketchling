import type { Anchor, Point, SerializedNode } from "./types.js";

/** Deterministic PRNG (mulberry32) so the same seed always draws the same "imperfections". */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Generates a loose, organic ring of points around a center — the "not a perfect
 * circle" primitive. `looseness` perturbs both radius and angle per point so the
 * outline reads as drawn, not measured.
 */
export function blobPoints(
  cx: number,
  cy: number,
  radius: number,
  looseness: number,
  seed: number,
  vertices = 10
): Point[] {
  const rand = seededRandom(seed);
  const pts: Point[] = [];
  const wobble = 0.15 + looseness * 0.45; // radius variance
  const angleJitter = looseness * 0.35; // angle variance, in radians
  for (let i = 0; i < vertices; i++) {
    const baseAngle = (i / vertices) * Math.PI * 2;
    const angle = baseAngle + (rand() - 0.5) * angleJitter;
    const r = radius * (1 + (rand() - 0.5) * wobble);
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return pts;
}

/**
 * A true, wobble-free ellipse (circle when rx === ry) — no seeded jitter, no radius
 * variance floor, unlike `blobPoints`. `Blob` is deliberately imperfect (see its own doc
 * comment); this is the opposite case, for when the point IS a clean disc — a sun, a head,
 * a gear hub, a glow ring, a star. Every one of the five independent films built for this
 * library's own feedback round hand-rolled this exact function under the name
 * `ellipsePoints` (see e.g. `examples/story/lantern-maker.ts`) because `blob()`'s ~15%
 * wobble floor never reaches zero even at `looseness: 0` — this promotes that copy-pasted
 * tribal knowledge into the library itself, so the next agent doesn't have to re-derive it.
 * `look: "ink"`'s own render-time sketchiness still applies on top, the same as any other
 * stroke — this only controls the authored geometry, not the hand-drawn line quality.
 */
export function ellipsePoints(cx: number, cy: number, rx: number, ry: number, vertices = 24): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * Math.PI * 2;
    pts.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return pts;
}

/** Straight-segment length through `points` — an estimate of drawOn's actual rendered
 * duration (see polylineLengthDrawDuration below), not the true arc length: the renderer
 * measures the real on-screen path (Catmull-Rom smoothed, by default) via the browser's own
 * getTotalLength(), which core can't reach without a DOM. Close enough for the estimate's
 * actual job — a reasonable `at` for whatever comes next — not a rendering guarantee. */
export function polylineLength(points: Point[], closed: boolean): number {
  if (points.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  if (closed) len += Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]);
  return len;
}

// Mirrors drawon.ts's own PEN_SPEED_PX_PER_S/MIN_DRAW_DURATION/MAX_DRAW_DURATION constants —
// duplicated rather than imported since render/ (browser-dependent) can't be imported from
// core/ (see this file's own module boundary rule), not because the values are allowed to
// drift. If drawon.ts's pacing ever changes, change this too.
export function polylineLengthDrawDuration(points: Point[], closed: boolean): number {
  const len = polylineLength(points, closed);
  return Math.min(2.2, Math.max(0.45, len / 300));
}

// Every AnimOp kind's actual `op.duration ?? N` fallback, exactly as renderer.ts (and
// limb.ts/mesh3d.ts for ikTo/spin3d) apply it — has to agree with what really gets built
// into a GSAP tween, not a separate guess, since both the tween-conflict linter and
// SketchNode.endAt below depend on it matching reality.
export const DEFAULT_OP_DURATION: Record<string, number> = {
  moveTo: 0.6,
  moveBy: 0.6,
  moveAlong: 1.2,
  rotateTo: 0.6,
  rotateBy: 0.6,
  scaleTo: 0.6,
  squashTo: 0.3,
  fadeTo: 0.6,
  appear: 0.6,
  morphTo: 0.8,
  ikTo: 0.5,
  spin3d: 1,
};

/** Catmull-Rom through `points` rendered as a cubic-bezier SVG path — smooth, not polygonal. */
export function smoothPathFromPoints(points: Point[], closed: boolean): string {
  if (points.length < 2) {
    const [x, y] = points[0] ?? [0, 0];
    return `M ${x} ${y}`;
  }
  const pts = closed ? [points[points.length - 1], ...points, points[0], points[1]] : points;
  const offset = closed ? 1 : 0;
  let d = `M ${points[0][0]} ${points[0][1]} `;
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i - 1 + offset] ?? pts[i + offset];
    const p1 = pts[i + offset];
    const p2 = pts[i + 1 + offset] ?? pts[i + offset];
    const p3 = pts[i + 2 + offset] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]} `;
  }
  if (closed) d += "Z";
  return d.trim();
}

/** Straight segments between `points` — for shapes with intentional sharp corners (boxes, wedges). */
export function sharpPathFromPoints(points: Point[], closed: boolean): string {
  if (points.length < 2) {
    const [x, y] = points[0] ?? [0, 0];
    return `M ${x} ${y}`;
  }
  let d = `M ${points[0][0]} ${points[0][1]} `;
  for (let i = 1; i < points.length; i++) {
    d += `L ${points[i][0]} ${points[i][1]} `;
  }
  if (closed) d += "Z";
  return d.trim();
}

/** `smooth` (default true) picks a spline-through-points path vs. straight-edged segments. */
export function pathFromPoints(points: Point[], closed: boolean, smooth = true): string {
  return smooth ? smoothPathFromPoints(points, closed) : sharpPathFromPoints(points, closed);
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** The point on `bbox` that moveTo/moveAlong's `anchor` option names — "center" (the
 * long-standing default) is the bbox's own center; the edge anchors are that edge's
 * midpoint, not a corner (a "bottom" anchor for a symmetrical character's feet wants the
 * horizontal center at the lowest y, not the bbox's bottom-left corner). */
export function anchorPoint(bbox: BBox, anchor: Anchor = "center"): Point {
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  switch (anchor) {
    case "top":
      return [cx, bbox.minY];
    case "bottom":
      return [cx, bbox.maxY];
    case "left":
      return [bbox.minX, cy];
    case "right":
      return [bbox.maxX, cy];
    default:
      return [cx, cy];
  }
}

export function bboxOfPoints(points: Point[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function unionBBox(boxes: BBox[]): BBox {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

/** A serialized node's own bounding box: its own points unioned with every child's,
 * recursively — the one "what space does this node occupy" computation, shared by
 * render/scene-query.ts's computeNodeBBox (moveTo/moveBy placement, camera framing) and
 * core/agent.ts's nodeBounds (the `inspect`/`validate` CLI's reported node bounds). Those
 * two used to hand-copy the identical recursion because core/ can't import from render/
 * (a one-way dependency) — this lives in core/ instead, so both sides call the same
 * implementation rather than risk silently drifting apart. */
export function nodeBBox(node: SerializedNode): BBox | undefined {
  const boxes: BBox[] = [];
  if (node.points?.length) boxes.push(bboxOfPoints(node.points));
  for (const child of node.children ?? []) {
    const childBox = nodeBBox(child);
    if (childBox) boxes.push(childBox);
  }
  return boxes.length ? unionBBox(boxes) : undefined;
}

export function bboxOverlapRatio(a: BBox, b: BBox): number {
  const ix = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const iy = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  const interArea = ix * iy;
  if (interArea === 0) return 0;
  const areaA = (a.maxX - a.minX) * (a.maxY - a.minY);
  const areaB = (b.maxX - b.minX) * (b.maxY - b.minY);
  return interArea / Math.min(areaA, areaB);
}
