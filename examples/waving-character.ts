import { sketch } from "../src/index.js";

// An organic, blob-built character — tests blob generation, solid-fill closed shapes,
// short open-stroke limbs/features layered on top of a bigger form, and a pivoted
// rotation (the raised arm actually waves once it's drawn, instead of sitting still).
const scene = sketch.scene({ width: 360, height: 420, background: "#e7ddc8", seed: "waving-character" });

const ink = "#241f18";
const skin = "#e8b978";
const shirt = "#3f6b7a";

const body = sketch.loop(
  [
    [130, 260],
    [230, 260],
    [245, 340],
    [235, 390],
    [125, 390],
    [115, 340],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.25,
    energy: "calm",
    fill: { color: shirt, style: "solid" },
  }
);
scene.add(body).drawOn({ at: 0.0, duration: 0.93 });

const head = sketch.blob(180, 190, 55, { color: ink, weight: "bold", looseness: 0.28, energy: "calm", fill: { color: skin, style: "solid" } }, 14);
scene.add(head).drawOn({ at: 1.12, duration: 0.81 });

const leftArm = sketch.stroke(
  [
    [128, 275],
    [90, 310],
    [78, 355],
  ],
  { color: ink, weight: "confident", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(leftArm).drawOn({ at: 2.11, duration: 0.43 });

// Pivoted at its own first point (the shoulder) rather than its own bbox center, so the
// post-draw wave below swings from the shoulder instead of spinning around the arm's midpoint.
const rightArm = sketch
  .stroke(
    [
      [232, 275],
      [268, 245],
      [278, 200],
      [270, 165],
    ],
    { color: ink, weight: "confident", looseness: 0.3, energy: "quick", smooth: true }
  )
  .pivotAt(232, 275);
scene.add(rightArm).drawOn({ at: 2.7, duration: 0.5 });
rightArm
  .rotateTo(14, { at: 3.32, duration: 0.2, ease: "sine.inOut" })
  .rotateTo(-10, { at: 3.52, duration: 0.2, ease: "sine.inOut" })
  .rotateTo(14, { at: 3.71, duration: 0.2, ease: "sine.inOut" })
  .rotateTo(0, { at: 3.91, duration: 0.19, ease: "sine.inOut" });

const leftEye = sketch.blob(160, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(leftEye).drawOn({ at: 4.28, duration: 0.19 });

const rightEye = sketch.blob(200, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(rightEye).drawOn({ at: 4.56, duration: 0.19 });

const smile = sketch.stroke(
  [
    [158, 205],
    [180, 216],
    [202, 204],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
);
scene.add(smile).drawOn({ at: 4.84, duration: 0.37 });

export default scene;
