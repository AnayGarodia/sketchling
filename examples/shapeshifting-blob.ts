import { sketch } from "../src/index.js";

// A single shape changing what it is, not a new shape appearing — tests .morphTo(), which
// morphs the drawn outline (and fill) into a new set of points after drawOn finishes.
const scene = sketch.scene({ width: 400, height: 360, background: "#eef2ea", seed: "shapeshifting-blob" });

const ink = "#232019";
const teal = "#3f7d76";

const blob = sketch.loop(
  [
    [200, 120],
    [250, 150],
    [255, 210],
    [200, 240],
    [145, 210],
    [150, 150],
  ],
  { color: ink, weight: "bold", looseness: 0.25, energy: "calm", smooth: true, fill: { color: teal, style: "solid" } }
);
scene.add(blob).drawOn({ at: 0, duration: 0.9 });

// A six-sided blob settles, then reshapes twice — a squat wide form, then a tall narrow
// one — each morph starting once the last one (plus a short hold) has finished.
blob.morphTo(
  [
    [130, 170],
    [200, 130],
    [270, 170],
    [270, 220],
    [200, 250],
    [130, 220],
  ],
  { at: 1.4, duration: 1.1, ease: "power2.inOut" }
);
blob.morphTo(
  [
    [200, 90],
    [225, 140],
    [220, 230],
    [200, 270],
    [180, 230],
    [175, 140],
  ],
  { at: 3.0, duration: 1.1, ease: "power2.inOut" }
);

export default scene;
