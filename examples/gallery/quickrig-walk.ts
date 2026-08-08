import { sketch } from "../../src/index.js";

// Gallery demo for sketch.quickRig(): the same walking character as walk-cycle.ts, but its
// hip placement and leg lengths are DERIVED from body's own bounding box instead of hand-
// picked constants — quickRig automates exactly the worst-case-reach headroom math
// walk-cycle.ts's own comment documents doing by hand. Proportion-based, not a real
// skeleton pulled from an arbitrary silhouette (see quickrig.ts's own doc comment for that
// honest scope line) — good for a round or roughly-humanoid body, which this is.

const scene = sketch.scene({ width: 520, height: 320, background: "#eee3c8", seed: "quickrig-walk" });

const INK = "#241f18";
const GROUND_Y = 265;

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

const body = sketch.blob(
  100,
  150,
  45,
  { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: "#4f7f6b", style: "solid" } },
  12
);
const head = sketch.blob(
  100,
  95,
  28,
  { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: "#e8b978", style: "solid" } },
  12
);

// One call replaces walk-cycle.ts's five hand-picked constants (HIP_Y, GROUND_Y already
// known, HIP_L_X, HIP_R_X, LEN1, LEN2) and its manual worst-case-reach comment.
const rig = sketch.quickRig(body, {
  groundY: GROUND_Y,
  stepLength: 42,
  legStyle: { color: INK, weight: "confident", looseness: 0.25, energy: "calm" },
  capRadius: 9,
});

const character = sketch.group([rig.legL, rig.legR, body, head]);
scene.add(character);

rig.legL.appear({ at: 0.2, duration: 0.3 });
rig.legR.appear({ at: 0.35, duration: 0.3 });
body.drawOn({ at: 0.7, duration: 0.9 });
head.drawOn({ at: 1.7, duration: 0.6 });

sketch.walk({
  body: character,
  legs: [
    { limb: rig.legL, hipX: rig.hipLX },
    { limb: rig.legR, hipX: rig.hipRX },
  ],
  steps: 7,
  stepLength: 42,
  groundY: GROUND_Y,
  stepDuration: 0.5,
  liftHeight: 22,
  bodyBob: 6,
  at: 2.5,
});

export default scene;
