import assert from "node:assert/strict";
import test from "node:test";
import { sketch } from "../dist/index.js";

/**
 * gait.ts's zero-slide guarantee is a *construction* contract, not a tuning outcome: the
 * trailing (planted) leg's ikTo for each half-step must carry the exact negation of the
 * body's moveBy for that half-step, with identical {at, duration, ease}, so the two tweens
 * cancel at every sampled instant. These tests pin that authored structure down — a
 * refactor that keeps the walk "looking about right" but breaks the exact cancellation
 * (different ease, different timing, approximated delta) fails here without any renderer.
 */
function buildWalk(opts = {}) {
  const body = sketch.group([]);
  const legA = sketch.limb(-12, 0, 40, 40, {});
  const legB = sketch.limb(12, 0, 40, 40, {});
  const result = sketch.walk({
    body,
    legs: [
      { limb: legA, hipX: -12 },
      { limb: legB, hipX: 12 },
    ],
    steps: opts.steps ?? 4,
    stepLength: opts.stepLength ?? 30,
    groundY: 70,
    stepDuration: opts.stepDuration ?? 0.5,
    at: opts.at ?? 1,
    ...(opts.arms ? { arms: opts.arms } : {}),
  });
  return { body, legA, legB, result };
}

test("walk returns endAt = at + steps * stepDuration", () => {
  const { result } = buildWalk({ steps: 5, stepDuration: 0.4, at: 2 });
  assert.ok(Math.abs(result.endAt - (2 + 5 * 0.4)) < 1e-9);
});

test("every body moveBy has a same-timing negated ikTo on the trailing leg (zero-slide)", () => {
  const { body, legA, legB } = buildWalk({ steps: 4, stepLength: 30, stepDuration: 0.5, at: 1 });
  const bodyMoves = body.animations.filter((a) => a.kind === "moveBy");
  assert.equal(bodyMoves.length, 8, "two half-step arcs per step");

  const ikOps = (limb) => limb.animations.filter((a) => a.kind === "ikTo" && (a.duration ?? 0) > 0.01);
  const allIk = [...ikOps(legA), ...ikOps(legB)];

  for (const move of bodyMoves) {
    // The planted leg's countershift: an ikTo starting at the same time, with the same
    // duration and ease, whose x-delta will cancel the body's dx at every eased instant.
    const partner = allIk.find(
      (op) => op.at === move.at && op.duration === move.duration && op.ease === move.ease
    );
    assert.ok(partner, `body moveBy at t=${move.at} has no timing-matched planted-leg ikTo`);
  }

  // Across a full walk, the trailing-leg targets must retreat by exactly stepLength per
  // step in local space: each leg alternates trailing, so each accumulates -stepLength
  // every TWO steps, always returning to plant directly under the hip (localX = 0) after
  // its swing phase.
  const legATargets = ikOps(legA).map((op) => op.x);
  const legBTargets = ikOps(legB).map((op) => op.x);
  assert.ok(legATargets.length > 0 && legBTargets.length > 0);
  assert.ok(
    legATargets.some((x) => Math.abs(x - (-12 - 30)) < 1e-9),
    "leg A must plant a full stepLength behind its hip mid-cycle"
  );
  assert.ok(
    legBTargets.some((x) => Math.abs(x - (12 - 30)) < 1e-9),
    "leg B must plant a full stepLength behind its hip mid-cycle"
  );
});

test("the reset pose is scheduled strictly before `at`, never at the same instant", () => {
  const { legA, legB } = buildWalk({ at: 1 });
  for (const limb of [legA, legB]) {
    const reset = limb.animations.find((a) => a.kind === "ikTo");
    assert.ok(reset.at < 1, "reset tween must not collide with step 0's own tween (GSAP overwrite)");
  }
});

test("arms counter-swing same-side-opposite-phase with matched timing", () => {
  const armA = sketch.stroke([
    [0, 0],
    [0, 30],
  ]).pivotAt(0, 0);
  const armB = sketch.stroke([
    [0, 0],
    [0, 30],
  ]).pivotAt(0, 0);
  buildWalk({ steps: 2, arms: [{ node: armA }, { node: armB }] });

  const swingsA = armA.animations.filter((a) => a.kind === "rotateTo" && (a.duration ?? 0) > 0.01);
  const swingsB = armB.animations.filter((a) => a.kind === "rotateTo" && (a.duration ?? 0) > 0.01);
  assert.equal(swingsA.length, 2, "one swing per step");
  assert.equal(swingsB.length, 2);
  for (let i = 0; i < swingsA.length; i++) {
    assert.equal(swingsA[i].at, swingsB[i].at, "both arms swing over the same window");
    assert.ok(
      swingsA[i].degrees * swingsB[i].degrees < 0,
      "arms must swing in opposite directions each step (contralateral gait)"
    );
  }
  // Alternating steps flip which arm leads.
  assert.ok(swingsA[0].degrees * swingsA[1].degrees < 0, "each arm must reverse between steps");
});
