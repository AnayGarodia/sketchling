import { sketch } from "../../src/index.js";

// Gallery demo for the motivating case behind splitting look/texture into two axes: an
// old-book/engraving register needs ink's own sketchy jitter AND hachure/cross-hatch
// shading (the actual engraving technique) AND a fine aged-paper grain — a combination
// look: "grain" alone couldn't produce back when texture was still coupled to forcing flat,
// crisp geometry. `look: "ink"` (default, so left unset) + `fill.style: "hachure"`/
// `"cross-hatch"` + `texture: "grain"` together, all three doing real work at once.

const scene = sketch.scene({
  width: 500,
  height: 360,
  background: "#e8dfc8",
  seed: "old-book-look",
  texture: "grain",
});

const INK = "#2a2318";

const trunk = sketch.loop(
  [
    [240, 360],
    [260, 360],
    [255, 220],
    [245, 220],
  ],
  { color: INK, weight: "confident", looseness: 0.15, fill: { color: INK, style: "cross-hatch", density: 0.5, angle: 60 }, smooth: false }
);
scene.add(trunk).drawOn({ at: 0, duration: 0.6 });

const canopy = sketch.blob(
  250,
  160,
  90,
  { color: INK, weight: "confident", looseness: 0.2, fill: { color: INK, style: "hachure", density: 0.35, angle: -30 } },
  14
);
scene.add(canopy).drawOn({ at: 0.6, duration: 0.9 });

const ground = sketch.stroke([[0, 300], [500, 300]], { color: INK, weight: "light", looseness: 0.15 });
scene.add(ground).drawOn({ at: 0, duration: 0.5 });

// A small hachure-shaded figure, walking in from the left under the tree.
const walker = sketch.group();
scene.add(walker);
const figBody = sketch.loop(
  [[-10, 80], [10, 0], [30, 80]],
  { color: INK, weight: "confident", looseness: 0.1, fill: { color: INK, style: "hachure", density: 0.3, angle: 75 }, smooth: false }
);
walker.add(figBody);
const figHead = sketch.blob(10, -20, 16, { color: INK, weight: "confident", looseness: 0.1, fill: { color: INK, style: "hachure", density: 0.25, angle: 45 } }, 12);
walker.add(figHead);
walker.initial({ x: 60, y: 220 });
walker.appear({ at: 1.6, duration: 0.3 });
walker.moveBy(140, 0, { at: 1.9, duration: 2.2, ease: "sine.inOut" });

export default scene;
