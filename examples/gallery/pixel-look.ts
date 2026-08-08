import { sketch } from "../../src/index.js";

// Gallery: texture: "pixel" — every captured frame downsampled and nearest-neighbor
// upscaled back to size (a raster post-process in the CLI, not a DOM/SVG change) for a
// blocky, low-res game-art cadence, layered over look: "flat"'s crisp geometry. A simple
// platformer-style scene (ground, a block, a collectible, a sun) reads clearly at pixel
// scale without needing fine detail to show off.
const scene = sketch.scene({ width: 400, height: 280, background: "#6f9bd1", seed: "pixel-look", look: "flat", texture: "pixel" });

const ink = "#181511";

const sun = sketch.blob(320, 60, 26, { color: ink, weight: "bold", fill: { color: "#f2b53c", style: "solid" } }, 10);
scene.add(sun).drawOn({ at: 0, duration: 0.5 });

const ground = sketch.loop(
  [
    [-10, 220],
    [410, 220],
    [410, 290],
    [-10, 290],
  ],
  { color: ink, weight: "bold", smooth: false, fill: { color: "#5fa552", style: "solid" } }
);
scene.add(ground).drawOn({ at: 0.5, duration: 0.5 });

const block = sketch.loop(
  [
    [80, 150],
    [140, 150],
    [140, 220],
    [80, 220],
  ],
  { color: ink, weight: "bold", smooth: false, fill: { color: "#c1543c", style: "solid" } }
);
scene.add(block).drawOn({ at: 1.1, duration: 0.4 });

const coin = sketch.blob(110, 110, 14, { color: "#8a6a1a", weight: "confident", fill: { color: "#f2d43c", style: "solid" } }, 8);
scene.add(coin).drawOn({ at: 1.6, duration: 0.3 });
// A small idle bob, so the "pixel" look's blocky look reads on continuous motion too, not
// just a static tableau.
coin.moveBy(0, -14, { at: 2.0, duration: 0.5, ease: "sine.inOut" });
coin.moveBy(0, 14, { at: 2.5, duration: 0.5, ease: "sine.inOut" });
coin.moveBy(0, -14, { at: 3.0, duration: 0.5, ease: "sine.inOut" });
coin.moveBy(0, 14, { at: 3.5, duration: 0.5, ease: "sine.inOut" });

export default scene;
