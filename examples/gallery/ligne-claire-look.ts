import { sketch } from "../../src/index.js";

// Gallery demo proving a ligne-claire/clean-line-comic register (Tintin-style: uniform
// bold outlines, flat saturated color blocks, no shading, precise rather than organic
// shapes) needs NO new capability at all — just the right combination of existing knobs:
// look: "flat" (crisp, no jitter), weight: "bold" (a bold, consistent outline), fill.style:
// "solid" (flat color, no hachure/gradient), and looseness: 0 on any blob. That last one
// matters more than it looks: blob's outline is deliberately "not a perfect circle" by
// default (looseness ~0.3 perturbs the authored points themselves, not just render-time
// jitter — see blob.ts) — for a window or a round head to read as precise rather than
// hand-wobbled, looseness needs to be pushed all the way down explicitly.

const scene = sketch.scene({ width: 500, height: 360, background: "#a8d4e8", seed: "ligne-claire-look", look: "flat" });

const INK = "#111111";

const ground = sketch.loop(
  [[0, 300], [500, 300], [500, 360], [0, 360]],
  { color: INK, weight: "bold", fill: { color: "#d9c48a", style: "solid" }, smooth: false }
);
scene.add(ground).appear({ at: 0, duration: 0.3 });

const rocket = sketch.group();
scene.add(rocket);
const body = sketch.loop(
  [[220, 120], [260, 120], [280, 220], [260, 290], [220, 290], [200, 220]],
  { color: INK, weight: "bold", fill: { color: "#e8482c", style: "solid" }, smooth: false }
);
rocket.add(body);
const finL = sketch.loop([[200, 220], [170, 270], [200, 260]], { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false });
rocket.add(finL);
const finR = sketch.loop([[280, 220], [310, 270], [280, 260]], { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false });
rocket.add(finR);
const window1 = sketch.blob(240, 160, 18, { color: INK, weight: "bold", looseness: 0, fill: { color: "#5ec9e8", style: "solid" } }, 16);
rocket.add(window1);
rocket.appear({ at: 0.3, duration: 0.4 });
rocket
  .moveBy(0, -8, { at: 0.9, duration: 0.7, ease: "sine.inOut" })
  .moveBy(0, 8, { at: 1.6, duration: 0.7, ease: "sine.inOut" });

const walker = sketch.group();
scene.add(walker);
const head = sketch.blob(0, 0, 26, { color: INK, weight: "bold", looseness: 0, fill: { color: "#f2d6b8", style: "solid" } }, 16);
walker.add(head);
const hairTuft = sketch.stroke([[-12, -22], [-18, -40]], { color: INK, weight: "bold" });
walker.add(hairTuft);
const torso = sketch.loop([[-20, 22], [20, 22], [28, 90], [-28, 90]], { color: INK, weight: "bold", fill: { color: "#5ec9e8", style: "solid" }, smooth: false });
walker.add(torso);
walker.initial({ x: 100, y: 200 });
walker.appear({ at: 0, duration: 0.3 });
walker.moveBy(280, 0, { at: 1.5, duration: 1.8, ease: "sine.inOut" });

export default scene;
