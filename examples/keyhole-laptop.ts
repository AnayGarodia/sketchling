import { sketch } from "../src/index.js";

const scene = sketch.scene({ width: 480, height: 420, background: "#7096c6", seed: "keyhole-laptop" });

const ink = "#15130f";
const paper = "#f7f3e9";

const lid = sketch.loop(
  [
    [70, 55],
    [330, 55],
    [330, 245],
    [70, 245],
  ],
  { color: ink, weight: "bold", looseness: 0.22, energy: "quick", smooth: false }
);
scene.add(lid).drawOn({ at: 0, duration: 0.55 });

const screen = sketch.loop(
  [
    [98, 82],
    [302, 82],
    [302, 218],
    [98, 218],
  ],
  {
    color: ink,
    weight: "confident",
    looseness: 0.16,
    energy: "calm",
    smooth: false,
    fill: { color: paper, style: "solid" },
  }
);
scene.add(screen).drawOn({ at: 0.35, duration: 0.5 });

const keyholeHead = sketch.blob(
  200,
  128,
  22,
  { color: ink, weight: "confident", looseness: 0.16, energy: "calm", fill: { color: ink, style: "solid" } },
  16
);
scene.add(keyholeHead).drawOn({ at: 0.95, duration: 0.3 });

const keyholeBody = sketch.loop(
  [
    [190, 132],
    [210, 132],
    [220, 190],
    [180, 190],
  ],
  {
    color: ink,
    weight: "confident",
    looseness: 0.3,
    energy: "quick",
    smooth: false,
    fill: { color: ink, style: "solid" },
  }
);
scene.add(keyholeBody).drawOn({ at: 1.05, duration: 0.25 });

const base = sketch.loop(
  [
    [55, 245],
    [345, 245],
    [315, 278],
    [85, 278],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.25,
    energy: "quick",
    smooth: false,
    fill: { color: paper, style: "solid" },
  }
);
scene.add(base).drawOn({ at: 0.65, duration: 0.45 });

export default scene;
