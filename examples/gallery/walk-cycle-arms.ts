import { sketch } from "../../src/index.js";

// walk-cycle.ts's exact character and gait, plus sketch.walk()'s new `arms` option — a
// real contralateral counter-swing (right leg forward, left arm forward) instead of the
// arms doing nothing while the legs walk. Every hand-built walk cycle before this either
// left arms static or hit a detachment bug animating them separately (see
// quiet-crossing.ts's own history) — this is the same phase-locked-swing approach gait.ts
// already proves safe for legs, applied to arms too.

const scene = sketch.scene({ width: 520, height: 320, background: "#eee3c8", seed: "walk-cycle-arms" });

const INK = "#241f18";
const BODY_FILL = "#4f7f6b";
const HEAD_FILL = "#e8b978";

const ground = sketch.stroke(
  [[20, 266], [180, 264], [340, 267], [500, 265]],
  { color: "#8a7a55", weight: "light", looseness: 0.2, energy: "calm" }
);
scene.add(ground).drawOn({ at: 0, duration: 1.0 });

const HIP_Y = 195;
const GROUND_Y = 265;
const HIP_L_X = 85;
const HIP_R_X = 115;
const LEN1 = 55;
const LEN2 = 55;
const SHOULDER_Y = 160;
const SHOULDER_L_X = 68;
const SHOULDER_R_X = 132;
const ARM_LEN1 = 30;
const ARM_LEN2 = 28;

const body = sketch.blob(100, 150, 45, { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: BODY_FILL, style: "solid" } }, 12);
const head = sketch.blob(100, 95, 28, { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: HEAD_FILL, style: "solid" } }, 12);

const legStyle = { color: INK, weight: "confident" as const, looseness: 0.25, energy: "calm" as const };
const legL = sketch.limb(HIP_L_X, HIP_Y, LEN1, LEN2, legStyle, { bend: 1, capRadius: 9 });
const legR = sketch.limb(HIP_R_X, HIP_Y, LEN1, LEN2, legStyle, { bend: -1, capRadius: 9 });
legL.restAt(HIP_L_X, GROUND_Y);
legR.restAt(HIP_R_X, GROUND_Y);

// Arms: same 2-bone limb primitive as the legs, but swung RIGIDLY from the shoulder via
// rotateTo (walk()'s arm counter-swing) rather than IK-targeted — a slight elbow bend set
// once via restAt, then the whole chain pivots as one piece. pivotAt is REQUIRED here (see
// WalkArm's own doc comment) — an un-pivoted limb rotates around its own bbox center, not
// the shoulder, and visibly detaches from the body the instant it swings.
const armStyle = { color: INK, weight: "confident" as const, looseness: 0.22, energy: "calm" as const };
const armL = sketch.limb(SHOULDER_L_X, SHOULDER_Y, ARM_LEN1, ARM_LEN2, armStyle, { bend: 1, capRadius: 7 });
const armR = sketch.limb(SHOULDER_R_X, SHOULDER_Y, ARM_LEN1, ARM_LEN2, armStyle, { bend: -1, capRadius: 7 });
armL.restAt(SHOULDER_L_X - 4, SHOULDER_Y + 48);
armR.restAt(SHOULDER_R_X + 4, SHOULDER_Y + 48);
armL.pivotAt(SHOULDER_L_X, SHOULDER_Y);
armR.pivotAt(SHOULDER_R_X, SHOULDER_Y);

// Legs and body first, then arms drawn ON TOP (they need to actually be visible against
// the body, not tucked entirely behind it), head last.
const character = sketch.group([legL, legR, body, armL, armR, head]);
scene.add(character);

legL.appear({ at: 0.2, duration: 0.3 });
legR.appear({ at: 0.35, duration: 0.3 });
armL.appear({ at: 0.2, duration: 0.3 });
armR.appear({ at: 0.35, duration: 0.3 });
body.drawOn({ at: 0.7, duration: 0.9 });
head.drawOn({ at: 1.7, duration: 0.6 });

const WALK_START = 2.5;
sketch.walk({
  body: character,
  legs: [
    { limb: legL, hipX: HIP_L_X },
    { limb: legR, hipX: HIP_R_X },
  ],
  arms: [
    { node: armL, swingAngle: 20 },
    { node: armR, swingAngle: 20 },
  ],
  steps: 7,
  stepLength: 42,
  groundY: GROUND_Y,
  stepDuration: 0.5,
  liftHeight: 22,
  bodyBob: 6,
  at: WALK_START,
});

export default scene;
