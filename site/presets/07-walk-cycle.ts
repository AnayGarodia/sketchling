// Walk cycle — a rigged character
import { sketch } from "sketchling";

const scene = sketch.scene({ width: 520, height: 320, background: "#eee3c8", seed: "walk-cycle" });

const ink = "#241f18";
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
scene.add(ground).drawOn({ at: 0, duration: 1 });

const body = sketch.blob(100, 150, 45, { color: ink, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: "#4f7f6b", style: "solid" } }, 12);
const head = sketch.blob(100, 95, 28, { color: ink, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: "#e8b978", style: "solid" } }, 12);

// quickRig derives hip placement and leg lengths from the body's own bounding box, so the
// legs reach the ground without hand-picked constants.
const rig = sketch.quickRig(body, {
  groundY: GROUND_Y,
  stepLength: 42,
  legStyle: { color: ink, weight: "confident", looseness: 0.25, energy: "calm" },
  capRadius: 9,
});

const character = sketch.group([rig.legL, rig.legR, body, head]);
scene.add(character);

rig.legL.appear({ at: 0.2, duration: 0.3 });
rig.legR.appear({ at: 0.35, duration: 0.3 });
body.drawOn({ at: 0.7, duration: 0.9 });
head.drawOn({ at: 1.7, duration: 0.6 });

// sketch.walk() drives the whole gait: the body travels, the legs solve by IK, and the
// planted foot stays planted rather than skating along the ground.
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
