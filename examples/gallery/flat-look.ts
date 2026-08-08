import { sketch } from "../../src/index.js";

// Gallery demo for the "flat" look: crisp, jitter-free, solid-fill rendering.
// A simple two-shape composition — a square and a circle — draw on, then the
// square rotates + scales while the circle pulses, so the flat look's clean
// edges and solid fills are clearly visible both settled and mid-motion.
const scene = sketch.scene({ width: 420, height: 380, background: "#f4ede0", seed: "flat-look", look: "flat" });

const ink = "#1c1a17";
const coral = "#e0533d";
const teal = "#2f6f6a";

const square = sketch.loop(
  [
    [90, 130],
    [210, 130],
    [210, 250],
    [90, 250],
  ],
  { color: ink, weight: "bold", looseness: 0.15, energy: "calm", smooth: false, fill: { color: coral, style: "solid" } }
);
scene.add(square).drawOn({ at: 0.0, duration: 0.8 });

const circle = sketch.blob(310, 190, 55, { color: ink, weight: "bold", looseness: 0.1, energy: "calm", fill: { color: teal, style: "solid" } }, 24);
scene.add(circle).drawOn({ at: 1.0, duration: 0.6 });

square.pivotAt(150, 190);
square
  .rotateTo(45, { at: 1.9, duration: 0.6, ease: "sine.inOut" })
  .scaleTo(1.3, { at: 1.9, duration: 0.6, ease: "sine.inOut" });

circle
  .scaleTo(0.7, { at: 2.7, duration: 0.35, ease: "sine.inOut" })
  .scaleTo(1.15, { at: 3.05, duration: 0.35, ease: "sine.inOut" })
  .scaleTo(1.0, { at: 3.4, duration: 0.3, ease: "sine.inOut" });

export default scene;
