import { sketch } from "../../src/index.js";

// A simple round body/head blob character strides left to right on two 2-bone IK legs
// (sketch.limb + sketch.walk). The scene's whole job is proving the procedural gait looks
// physically correct — feet plant without sliding, body bobs naturally — not being an
// elaborate illustration, so geometry stays deliberately plain. Default "ink" look.
const scene = sketch.scene({ width: 520, height: 320, background: "#eee3c8", seed: "walk-cycle" });

const INK = "#241f18";
const BODY_FILL = "#4f7f6b";
const HEAD_FILL = "#e8b978";

// Ground line the character walks along.
const ground = sketch.stroke(
  [
    [20, 266],
    [180, 264],
    [340, 267],
    [500, 265],
  ],
  { color: "#8a7a55", weight: "light", looseness: 0.2, energy: "calm" }
);
scene.add(ground).drawOn({ at: 0, duration: 1.0 });

// --- Character rig ---
// Hips (leg roots) sit at the round body's own bottom edge; groundY matches the ground
// line above. len1+len2 = 110 against a 70px hip-to-ground drop and a 42px stride: the
// worst-case reach is a trailing foot at full stepLength off to the side while still down
// at groundY, sqrt(42^2 + 70^2) ≈ 82px — about 25% short of full extension (110px), so the
// IK target never gets silently clamped mid-stride (see AGENTS.md's IK/walk headroom note).
const HIP_Y = 195;
const GROUND_Y = 265;
const HIP_L_X = 85;
const HIP_R_X = 115;
const LEN1 = 55;
const LEN2 = 55;

const body = sketch.blob(
  100,
  150,
  45,
  { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: BODY_FILL, style: "solid" } },
  12
);

const head = sketch.blob(
  100,
  95,
  28,
  { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: HEAD_FILL, style: "solid" } },
  12
);

const legStyle = { color: INK, weight: "confident" as const, looseness: 0.25, energy: "calm" as const };
const legL = sketch.limb(HIP_L_X, HIP_Y, LEN1, LEN2, legStyle, { bend: 1, capRadius: 9 });
const legR = sketch.limb(HIP_R_X, HIP_Y, LEN1, LEN2, legStyle, { bend: -1, capRadius: 9 });
// Rest pose matches the walk's own starting stance (both feet under their hip, on the
// ground) so there's no visible pop between the entrance below and the walk's own reset.
legL.restAt(HIP_L_X, GROUND_Y);
legR.restAt(HIP_R_X, GROUND_Y);

// Legs first (they sit behind the body), then body, then head on top.
const character = sketch.group([legL, legR, body, head]);
scene.add(character);

// --- Entrance ---
legL.appear({ at: 0.2, duration: 0.3 });
legR.appear({ at: 0.35, duration: 0.3 });
body.drawOn({ at: 0.7, duration: 0.9 });
head.drawOn({ at: 1.7, duration: 0.6 });

// --- Walk: 7 steps left to right across the ground line. ---
const WALK_START = 2.5;
sketch.walk({
  body: character,
  legs: [
    { limb: legL, hipX: HIP_L_X },
    { limb: legR, hipX: HIP_R_X },
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
