// Potted plant — a drawOn sequence
import { sketch } from "sketchling";

const scene = sketch.scene({ width: 420, height: 420, background: "#f0ead8", seed: "potted-plant" });

const ink = "#211d17";
const terracotta = "#c1673f";
const leafGreen = "#4c7a4f";

// Sequential drawOn windows read as a single hand working down the page: pot, rim, stem,
// then the leaves. `at` is an absolute second on the scene's shared timeline.
const pot = sketch.loop(
  [
    [140, 300],
    [280, 300],
    [260, 380],
    [160, 380],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.2,
    energy: "quick",
    smooth: false,
    fill: { color: terracotta, style: "hachure", density: 0.55, angle: 35 },
  }
);
scene.add(pot).drawOn({ at: 0, duration: 0.87 });

const rim = sketch.loop(
  [
    [132, 285],
    [288, 285],
    [280, 302],
    [140, 302],
  ],
  {
    color: ink,
    weight: "confident",
    looseness: 0.18,
    energy: "quick",
    smooth: false,
    fill: { color: terracotta, style: "cross-hatch", density: 0.7, angle: 20 },
  }
);
scene.add(rim).drawOn({ at: 1.05, duration: 0.43 });

const stem = sketch.stroke(
  [
    [205, 285],
    [200, 220],
    [208, 165],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
);
scene.add(stem).drawOn({ at: 1.67, duration: 0.5 });

const leafLeft = sketch.loop(
  [
    [205, 210],
    [150, 195],
    [130, 155],
    [165, 140],
    [205, 175],
  ],
  { color: ink, weight: "confident", looseness: 0.35, energy: "quick", fill: { color: leafGreen, style: "hachure", density: 0.6, angle: 60 } }
);
scene.add(leafLeft).drawOn({ at: 2.36, duration: 0.56 });

const leafRight = sketch.loop(
  [
    [205, 195],
    [255, 175],
    [280, 135],
    [245, 120],
    [200, 165],
  ],
  { color: ink, weight: "confident", looseness: 0.35, energy: "quick", fill: { color: leafGreen, style: "hachure", density: 0.6, angle: 120 } }
);
scene.add(leafRight).drawOn({ at: 3.07, duration: 0.56 });

const leafTop = sketch.loop(
  [
    [206, 170],
    [190, 110],
    [215, 85],
    [232, 120],
    [212, 160],
  ],
  { color: ink, weight: "confident", looseness: 0.3, energy: "calm", fill: { color: leafGreen, style: "solid" } }
);
scene.add(leafTop).drawOn({ at: 3.78, duration: 0.5 });

export default scene;
