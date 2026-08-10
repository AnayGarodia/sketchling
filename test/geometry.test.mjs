import assert from "node:assert/strict";
import test from "node:test";
import {
  seededRandom,
  hashSeed,
  blobPoints,
  pathFromPoints,
  bboxOfPoints,
  unionBBox,
  bboxOverlapRatio,
} from "../dist/core/geometry.js";

test("seededRandom is deterministic and stays in [0, 1)", () => {
  const a = seededRandom(42);
  const b = seededRandom(42);
  const other = seededRandom(43);
  const seqA = Array.from({ length: 50 }, () => a());
  const seqB = Array.from({ length: 50 }, () => b());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, Array.from({ length: 50 }, () => other()));
  for (const v of seqA) assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
});

test("hashSeed is stable across calls and distinguishes strings", () => {
  assert.equal(hashSeed("my-scene"), hashSeed("my-scene"));
  assert.notEqual(hashSeed("my-scene"), hashSeed("my-scene2"));
  assert.ok(hashSeed("anything") >= 0, "seeds must be non-negative (used as PRNG state)");
});

test("blobPoints is deterministic per seed and stays near the requested radius", () => {
  const pts = blobPoints(100, 100, 40, 0.3, 7, 10);
  assert.equal(pts.length, 10);
  assert.deepEqual(pts, blobPoints(100, 100, 40, 0.3, 7, 10));
  assert.notDeepEqual(pts, blobPoints(100, 100, 40, 0.3, 8, 10));
  for (const [x, y] of pts) {
    const r = Math.hypot(x - 100, y - 100);
    // wobble at looseness 0.3 is ±0.5 * (0.15 + 0.3*0.45) of the radius — well within ±40%
    assert.ok(r > 40 * 0.6 && r < 40 * 1.4, `point radius ${r} strayed too far from 40`);
  }
});

test("pathFromPoints produces a spline by default and straight segments when smooth=false", () => {
  const points = [
    [0, 0],
    [10, 0],
    [10, 10],
  ];
  const smooth = pathFromPoints(points, false);
  const sharp = pathFromPoints(points, false, false);
  assert.ok(smooth.startsWith("M 0 0"));
  assert.ok(smooth.includes("C "), "smooth path should use cubic beziers");
  assert.ok(sharp.includes("L 10 0"), "sharp path should use line segments");
  assert.ok(!sharp.includes("C "));
  assert.ok(pathFromPoints(points, true).endsWith("Z"), "closed path must end with Z");
  assert.ok(pathFromPoints(points, true, false).endsWith("Z"));
});

test("pathFromPoints tolerates degenerate inputs instead of crashing", () => {
  assert.equal(pathFromPoints([], false), "M 0 0");
  assert.equal(pathFromPoints([[5, 6]], false), "M 5 6");
});

test("bboxOfPoints and unionBBox compute extents", () => {
  const box = bboxOfPoints([
    [10, 20],
    [-5, 8],
    [3, 40],
  ]);
  assert.deepEqual(box, { minX: -5, minY: 8, maxX: 10, maxY: 40 });
  const union = unionBBox([box, { minX: 0, minY: 0, maxX: 50, maxY: 10 }]);
  assert.deepEqual(union, { minX: -5, minY: 0, maxX: 50, maxY: 40 });
});

test("bboxOverlapRatio: disjoint is 0, containment is 1 relative to the smaller box", () => {
  const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  const b = { minX: 20, minY: 20, maxX: 30, maxY: 30 };
  const inner = { minX: 2, minY: 2, maxX: 6, maxY: 6 };
  const half = { minX: 5, minY: 0, maxX: 15, maxY: 10 };
  assert.equal(bboxOverlapRatio(a, b), 0);
  assert.equal(bboxOverlapRatio(a, inner), 1);
  assert.equal(bboxOverlapRatio(a, half), 0.5);
});
