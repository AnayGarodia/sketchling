// Flat look — crisp edges, gradients
import { sketch } from "sketchling";

// `look` picks the register: "flat" is jitter-free ligne-claire geometry, "ink" (the
// default) is hand-wobbled, "clay" holds every pose on a stop-motion cadence.
const scene = sketch.scene({ width: 460, height: 380, background: "#f4ede0", seed: "flat-shapes", look: "flat" });

const ink = "#1c1a17";

const square = sketch.loop(
  [
    [90, 130],
    [210, 130],
    [210, 250],
    [90, 250],
  ],
  { color: ink, weight: "bold", looseness: 0, energy: "calm", smooth: false, fill: { color: "#e0533d", style: "solid" } }
);
scene.add(square).drawOn({ at: 0, duration: 0.8 });

// sketch.ellipse() is a true wobble-free disc, and sketch.shade() derives a lit-to-shadow
// gradient from one base color — a real per-shape SVG gradient, not a flat fill.
const disc = sketch.ellipse(330, 190, 58, 58, {
  color: ink,
  weight: "bold",
  fill: { color: sketch.shade("#2f6f6a", { from: "top", amount: 0.45 }), style: "solid" },
});
scene.add(disc).drawOn({ at: 1, duration: 0.6 });

// pivotAt anchors rotation and scale at an absolute canvas point.
square.pivotAt(150, 190);
disc.pivotAt(330, 190);
square
  .rotateTo(45, { at: 1.9, duration: 0.6, ease: "sine.inOut" })
  .scaleTo(1.25, { at: 1.9, duration: 0.6, ease: "sine.inOut" });

disc
  .squashTo(1.2, 0.8, { at: 2.7, duration: 0.35, ease: "sine.inOut" })
  .squashTo(0.9, 1.1, { at: 3.05, duration: 0.35, ease: "sine.inOut" })
  .squashTo(1, 1, { at: 3.4, duration: 0.3, ease: "sine.inOut" });

export default scene;
