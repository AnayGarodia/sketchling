import { sketch } from "../src/index.js";

// A pure open-stroke scene — no closed shapes, no fills. Tests the pen-trace-only
// path (drawOn with no interior flood) against loose, non-geometric linework.
const scene = sketch.scene({ width: 480, height: 300, background: "#fbf8f1", seed: "doodle-flourish" });

const ink = "#2a251d";
const accent = "#c14c4c";

const underline = sketch.stroke(
  [
    [60, 90],
    [150, 78],
    [250, 100],
    [340, 76],
    [420, 92],
  ],
  { color: ink, weight: "bold", looseness: 0.35, energy: "quick", smooth: true }
);
scene.add(underline).drawOn({ at: 0, duration: 1.0 });

const spiral = sketch.stroke(
  [
    [200, 200],
    [220, 185],
    [235, 205],
    [215, 225],
    [190, 210],
    [188, 180],
    [215, 160],
    [248, 172],
    [258, 205],
  ],
  { color: accent, weight: "confident", looseness: 0.3, energy: "quick", smooth: true }
);
scene.add(spiral).drawOn({ at: 1.3, duration: 1.1 });

const arrow = sketch.stroke(
  [
    [300, 230],
    [380, 210],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "quick", smooth: false }
);
scene.add(arrow).drawOn({ at: 2.7, duration: 0.5 });

const arrowHeadTop = sketch.stroke(
  [
    [362, 198],
    [380, 210],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "quick", smooth: false }
);
scene.add(arrowHeadTop).drawOn({ at: 3.35, duration: 0.25 });

const arrowHeadBottom = sketch.stroke(
  [
    [365, 220],
    [380, 210],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "quick", smooth: false }
);
scene.add(arrowHeadBottom).drawOn({ at: 3.7, duration: 0.25 });

const squiggle = sketch.stroke(
  [
    [70, 240],
    [95, 225],
    [120, 245],
    [145, 225],
    [170, 245],
    [195, 225],
  ],
  { color: accent, weight: "light", looseness: 0.4, energy: "frantic", smooth: true }
);
scene.add(squiggle).drawOn({ at: 4.25, duration: 1.0 });

export default scene;
