import assert from "node:assert/strict";
import test from "node:test";
import { solveTwoBoneIK } from "../dist/core/ik.js";

const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

test("a reachable target is hit exactly, with both segment lengths preserved", () => {
  const { jointX, jointY, endX, endY } = solveTwoBoneIK(0, 0, 30, 40, 40, 40, 1);
  assert.ok(Math.abs(endX - 30) < 1e-9 && Math.abs(endY - 40) < 1e-9, "end effector must land on target");
  assert.ok(Math.abs(dist(0, 0, jointX, jointY) - 40) < 1e-9, "root->joint must stay len1");
  assert.ok(Math.abs(dist(jointX, jointY, endX, endY) - 40) < 1e-9, "joint->end must stay len2");
});

test("a target beyond reach clamps onto the fully-extended chain instead of NaN", () => {
  const { jointX, jointY, endX, endY } = solveTwoBoneIK(0, 0, 500, 0, 40, 40, 1);
  for (const v of [jointX, jointY, endX, endY]) assert.ok(Number.isFinite(v));
  // Clamped to just inside len1+len2 along the root->target direction.
  assert.ok(Math.abs(endX - (80 - 1e-3)) < 1e-6);
  assert.ok(Math.abs(endY) < 1e-6);
  assert.ok(Math.abs(dist(0, 0, jointX, jointY) - 40) < 1e-6);
  assert.ok(Math.abs(dist(jointX, jointY, endX, endY) - 40) < 1e-6);
});

test("a target inside the chain's minimum reach clamps onto the fold limit", () => {
  const { jointX, jointY, endX, endY } = solveTwoBoneIK(0, 0, 1, 0, 60, 20, 1);
  for (const v of [jointX, jointY, endX, endY]) assert.ok(Number.isFinite(v));
  assert.ok(Math.abs(dist(0, 0, endX, endY) - (40 + 1e-3)) < 1e-6, "end clamps to |len1-len2|");
  assert.ok(Math.abs(dist(0, 0, jointX, jointY) - 60) < 1e-6);
  assert.ok(Math.abs(dist(jointX, jointY, endX, endY) - 20) < 1e-6);
});

test("a target exactly on the root resolves without NaN", () => {
  const { jointX, jointY, endX, endY } = solveTwoBoneIK(10, 10, 10, 10, 30, 30, 1);
  for (const v of [jointX, jointY, endX, endY]) assert.ok(Number.isFinite(v));
});

test("bend picks which side of the root->target line the joint falls on", () => {
  // Target straight down: the two solutions mirror across the vertical line x=0.
  const left = solveTwoBoneIK(0, 0, 0, 60, 40, 40, 1);
  const right = solveTwoBoneIK(0, 0, 0, 60, 40, 40, -1);
  assert.ok(left.jointX * right.jointX < 0, "opposite bends must put the joint on opposite sides");
  assert.ok(Math.abs(left.jointX + right.jointX) < 1e-9, "the two solutions must mirror exactly");
  assert.ok(Math.abs(left.jointY - right.jointY) < 1e-9);
});
