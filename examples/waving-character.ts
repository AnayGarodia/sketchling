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
scene.add(body).drawOn({ at: 0, duration: 1.5 });

const head = sketch.blob(180, 190, 55, { color: ink, weight: "bold", looseness: 0.28, energy: "calm", fill: { color: skin, style: "solid" } }, 14);
scene.add(head).drawOn({ at: 1.8, duration: 1.3 });

const leftArm = sketch.stroke(
  [
    [128, 275],
    [90, 310],
    [78, 355],
  ],
  { color: ink, weight: "confident", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(leftArm).drawOn({ at: 3.4, duration: 0.7 });

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
scene.add(rightArm).drawOn({ at: 4.35, duration: 0.8 });
rightArm
  .rotateTo(14, { at: 5.35, duration: 0.32, ease: "sine.inOut" })
  .rotateTo(-10, { at: 5.67, duration: 0.32, ease: "sine.inOut" })
  .rotateTo(14, { at: 5.99, duration: 0.32, ease: "sine.inOut" })
  .rotateTo(0, { at: 6.31, duration: 0.3, ease: "sine.inOut" });

const leftEye = sketch.blob(160, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(leftEye).drawOn({ at: 6.9, duration: 0.3 });

const rightEye = sketch.blob(200, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(rightEye).drawOn({ at: 7.35, duration: 0.3 });

const smile = sketch.stroke(
  [
    [158, 205],
    [180, 216],
    [202, 204],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
);
scene.add(smile).drawOn({ at: 7.8, duration: 0.6 });

export default scene;
