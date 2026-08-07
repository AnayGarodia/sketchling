import type { Point } from "./types.js";

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

export function bboxOverlapRatio(a: BBox, b: BBox): number {
  const ix = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const iy = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  const interArea = ix * iy;
  if (interArea === 0) return 0;
  const areaA = (a.maxX - a.minX) * (a.maxY - a.minY);
  const areaB = (b.maxX - b.minX) * (b.maxY - b.minY);
  return interArea / Math.min(areaA, areaB);
}
