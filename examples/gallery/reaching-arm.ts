import { sketch } from "../../src/index.js";

// A simple blob body/head character with one 2-bone IK arm (sketch.limb) that reaches
// out to three different targets in sequence — up, to the side, then down — each held
// briefly. Tests that .ikTo's elbow solve reads correctly as a bending joint independent
// of sketch.walk (no legs, no gait here, just the arm itself).
const scene = sketch.scene({ width: 440, height: 460, background: "#eef1e6", seed: "reaching-arm" });

const ink = "#2b2620";
const shirt = "#5a7d6c";
const skin = "#e8b978";

const body = sketch.blob(
  200,
  300,
  80,
  { color: ink, weight: "bold", looseness: 0.25, energy: "calm", fill: { color: shirt, style: "solid" } },
  12
);
scene.add(body).drawOn({ at: 0.0, duration: 0.95 });

const head = sketch.blob(
  200,
  190,
  55,
  { color: ink, weight: "bold", looseness: 0.25, energy: "calm", fill: { color: skin, style: "solid" } },
  14
);
scene.add(head).drawOn({ at: 1.1, duration: 0.8 });

const leftEye = sketch.blob(182, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(leftEye).drawOn({ at: 2.05, duration: 0.19 });

const rightEye = sketch.blob(218, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(rightEye).drawOn({ at: 2.3, duration: 0.19 });

const smile = sketch.stroke(
  [
    [182, 207],
    [200, 216],
    [218, 205],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
);
scene.add(smile).drawOn({ at: 2.6, duration: 0.35 });

// One 2-bone IK arm off the right shoulder. len1 + len2 = 170 gives generous headroom
// (~29%) over every reach target's distance from the root (all four poses sit on a
// R=120 arc), so nothing clamps at full extension. The four poses (rest, up, side, down)
// are spaced no more than 100 degrees apart around the root — keeping the straight-line
// ikTo path between consecutive targets from ever swinging back close to the root itself,
// which would otherwise read as the arm collapsing/folding instead of reaching. restAt
// sets a natural hanging pose in effect before drawOn runs, so the arm reveals already at
// rest instead of snapping into place afterward.
const rightArm = sketch
  .limb(
    270,
    265,
    90,
    80,
    { color: ink, weight: "confident", looseness: 0.3, energy: "calm" },
    { bend: 1, capRadius: 14, capColor: skin }
  )
  .restAt(361.9, 342.2);
scene.add(rightArm).drawOn({ at: 3.1, duration: 0.6 });

// Reach up, hold, reach to the side, hold, reach down, hold — each ikTo re-solves the
// elbow from the new target every frame rather than interpolating the segments directly.
rightArm
  .ikTo(320.7, 156.2, { at: 4.0, duration: 0.6, ease: "sine.inOut" }) // reaching up
  .ikTo(389.5, 254.5, { at: 5.2, duration: 0.6, ease: "sine.inOut" }) // reaching to the side
  .ikTo(320.7, 373.8, { at: 6.4, duration: 0.6, ease: "sine.inOut" }); // reaching down

export default scene;
