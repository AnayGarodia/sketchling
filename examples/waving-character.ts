import { sketch } from "../src/index.js";

// An organic, blob-built character — tests blob generation, solid-fill closed shapes,
// and short open-stroke limbs/features layered on top of a bigger form.
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
scene.add(body).drawOn({ at: 0, duration: 0.65 });

const head = sketch.blob(180, 190, 55, { color: ink, weight: "bold", looseness: 0.28, energy: "calm", fill: { color: skin, style: "solid" } }, 14);
scene.add(head).drawOn({ at: 0.5, duration: 0.55 });

const leftArm = sketch.stroke(
  [
    [128, 275],
    [90, 310],
    [78, 355],
  ],
  { color: ink, weight: "confident", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(leftArm).drawOn({ at: 1.15, duration: 0.35 });

const rightArm = sketch.stroke(
  [
    [232, 275],
    [268, 245],
    [278, 200],
    [270, 165],
  ],
  { color: ink, weight: "confident", looseness: 0.3, energy: "quick", smooth: true }
);
scene.add(rightArm).drawOn({ at: 1.15, duration: 0.4 });

const leftEye = sketch.blob(160, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(leftEye).drawOn({ at: 1.6, duration: 0.15 });

const rightEye = sketch.blob(200, 180, 5, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(rightEye).drawOn({ at: 1.7, duration: 0.15 });

const smile = sketch.stroke(
  [
    [158, 205],
    [180, 216],
    [202, 204],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
);
scene.add(smile).drawOn({ at: 1.9, duration: 0.3 });

export default scene;
