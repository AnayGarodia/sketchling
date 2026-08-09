import type { SketchNode } from "./node.js";
import type { Limb } from "./limb.js";

export interface WalkLeg {
  limb: Limb;
  // This leg's hip/shoulder x, in the same local coordinate frame as the limb's own
  // rootX — the "0" reference a plant offset is measured from.
  hipX: number;
}

export interface WalkArm {
  // Any node with its own .rotateTo — a Limb, or a plain Stroke/Group swung as a rigid
  // piece. The CALLER is responsible for .pivotAt()'ing it at the shoulder before passing
  // it in (gait.ts doesn't know the arm's own local geometry) — an un-pivoted arm rotates
  // around its own bbox center instead of the joint, the exact bug quiet-crossing.ts's
  // walker hit before it was fixed (see AGENTS.md's Secondary motion / pivot notes).
  node: SketchNode;
  // Degrees of swing off rest pose, each direction. Default 16 — a real but not
  // exaggerated counter-swing; push higher for a brisker gait, lower for a subtle one.
  swingAngle?: number;
}

export interface WalkOptions {
  // The node that actually travels forward each step — usually the character's whole
  // group. Driven with moveBy (relative), never moveTo, so it composes with wherever the
  // character already is (see SKILL.md's moveTo/moveAlong bbox-center gotcha).
  body: SketchNode;
  // Exactly two legs, alternating lead/trail each step (legs[0] leads on even steps).
  legs: [WalkLeg, WalkLeg];
  steps: number;
  stepLength: number; // world-space forward distance per step
  groundY: number; // local y of the ground plane, in the legs' own coordinate frame
  stepDuration?: number;
  liftHeight?: number;
  bodyBob?: number;
  at?: number;
  // Optional contralateral arm counter-swing — arms[0] pairs with legs[0] as the SAME side
  // (right arm/right leg), and swings OPPOSITE that leg's own phase, the way a real gait's
  // arms and legs cross-pattern (right leg forward <-> left arm forward). Every hand-built
  // walk cycle in this repo either skipped arm motion entirely or fused the arm into a
  // static silhouette after a separately-rotated arm detached mid-swing — this generates
  // the same phase-locked swing gait.ts already proves safe for legs, so a rigged character
  // gets working arm motion for free instead of needing its own hand-tuned rotateTo calls
  // (or giving up on arm motion) every time.
  arms?: [WalkArm, WalkArm];
}

export interface WalkResult {
  endAt: number;
}

/**
 * A procedural bipedal walk cycle over the IK limb primitive: any two-legged rig gets a
 * gait from step count and stride length, not a hand-tuned rotateTo per pose (hopper.ts's
 * ~40 lines of per-step rotateTo calls is exactly what this replaces).
 *
 * The classic failure mode for a foot planted on the ground while the body's own origin
 * translates above it is slide — the foot visibly skates because "planted" was only true
 * at keyframes, not every sampled instant in between. This avoids it by construction
 * rather than by tuning: the trailing leg's ikTo for each half-step gets the *exact same*
 * {at, duration, ease} as the body's own moveBy for that half-step, with the negated
 * delta. Since both tweens evaluate the identical ease function at the identical elapsed
 * fraction at every instant, their instantaneous contributions cancel exactly, at every
 * frame — not just at the phase's start/end keyframes. Verify with a dense frame sweep,
 * checking a planted foot's local target x is unchanged across every frame it's grounded,
 * not just a spot-check at the phase boundaries.
 *
 * Give each leg's len1+len2 real headroom over the hip-to-ground distance (groundY -
 * hipY) — a chain at or near full extension gets its IK target silently clamped onto its
 * reachable radius the moment a stride's lateral offset pushes it out of reach, which
 * distorts the effective foot position and breaks the cancellation math (confirmed via a
 * dense-frame check: a chain with zero slack showed ~20px of drift on a "planted" foot
 * despite the authored targets being exactly symmetric). A stiff, fully-extended-looking
 * leg is also just a less natural gait — some bend at rest is correct either way.
 */
export function walk(opts: WalkOptions): WalkResult {
  const {
    body,
    legs,
    steps,
    stepLength,
    groundY,
    stepDuration = 0.5,
    liftHeight = 30,
    bodyBob = 7,
    at = 0,
    arms,
  } = opts;
  const half = stepDuration / 2;
  const upEase = "sine.out";
  const downEase = "sine.in";

  // Known clean starting state regardless of how the caller set up each limb's own rest
  // pose — both feet directly under their hip, on the ground. Scheduled strictly before
  // `at`, not at the same instant: two tweens starting at the exact same timeline position
  // on the same target object is a GSAP overwrite conflict (confirmed via a dense-frame
  // check that showed a "planted" foot drifting ~20px despite the cancellation math being
  // exact — the reset tween was silently clobbering step 0's phase-A tween's start value).
  // Known clean starting state regardless of how the caller set up each limb's own rest
  // pose — both feet directly under their hip, on the ground. Scheduled strictly before
  // `at`, not at the same instant: two tweens starting at the exact same timeline position
  // on the same target object is a GSAP overwrite conflict.
  const resetAt = Math.max(0, at - 0.01);
  for (const leg of legs) {
    leg.limb.ikTo(leg.hipX, groundY, { at: resetAt, duration: 0.001 });
  }
  if (arms) {
    for (const arm of arms) arm.node.rotateTo(0, { at: resetAt, duration: 0.001 });
  }

  // Local-space plant offset from each leg's own hipX (0 = directly under the hip).
  const localX: [number, number] = [0, 0];

  for (let i = 0; i < steps; i++) {
    const t0 = at + i * stepDuration;
    const tMid = t0 + half;
    const leadIdx = i % 2 === 0 ? 0 : 1;
    const trailIdx = leadIdx === 0 ? 1 : 0;
    const lead = legs[leadIdx];
    const trail = legs[trailIdx];

    // Body advances in two half-step arcs (lift then settle) — same shape as the existing
    // hand-authored walk cycles' bob.
    body.moveBy(stepLength / 2, -bodyBob, { at: t0, duration: half, ease: upEase });
    body.moveBy(stepLength / 2, bodyBob, { at: tMid, duration: half, ease: downEase });

    // Trailing leg: countershifts by the exact negation of the body's own moveBy, with
    // identical timing — see the function doc for why this is provably zero-slide, not
    // just visually close.
    trail.limb.ikTo(trail.hipX + localX[trailIdx] - stepLength / 2, groundY + bodyBob, {
      at: t0,
      duration: half,
      ease: upEase,
    });
    trail.limb.ikTo(trail.hipX + localX[trailIdx] - stepLength, groundY, {
      at: tMid,
      duration: half,
      ease: downEase,
    });
    localX[trailIdx] -= stepLength;

    // Leading leg: swings up and forward from wherever it was left (its own last
    // countershifted trail position) to touch down directly under the hip — which is,
    // by construction, where the hip itself will be at the moment of touchdown.
    lead.limb.ikTo(lead.hipX + localX[leadIdx] / 2, groundY - liftHeight, {
      at: t0,
      duration: half,
      ease: upEase,
    });
    lead.limb.ikTo(lead.hipX, groundY, { at: tMid, duration: half, ease: downEase });
    localX[leadIdx] = 0;

    // Arms counter-swing same-side-opposite-phase to the legs: the arm paired with the
    // LEADING leg swings backward while that leg swings forward (a real gait's cross
    // pattern — right leg forward, left arm forward, right arm back). One tween across the
    // full step (not two half-step arcs like the legs) is enough — an arm has no plant/lift
    // constraint to satisfy, just a smooth swing through the step's whole duration.
    if (arms) {
      const leadArm = arms[leadIdx];
      const trailArm = arms[trailIdx];
      const leadSwing = leadArm.swingAngle ?? 16;
      const trailSwing = trailArm.swingAngle ?? 16;
      leadArm.node.rotateTo(-leadSwing, { at: t0, duration: stepDuration, ease: "sine.inOut" });
      trailArm.node.rotateTo(trailSwing, { at: t0, duration: stepDuration, ease: "sine.inOut" });
    }
  }

  return { endAt: at + steps * stepDuration };
}
