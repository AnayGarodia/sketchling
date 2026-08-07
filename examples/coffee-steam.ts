import { sketch } from "../src/index.js";

// More post-draw life: once drawn, the steam wisps drift upward and pulse in and out of
// opacity instead of sitting static — a small detail, but the difference between a drawing
// and a scene.
const scene = sketch.scene({ width: 360, height: 360, background: "#f5efe3", seed: "coffee-steam" });

const ink = "#241f18";
const cream = "#f7f0e2";
const coffee = "#4a2f1e";
const steamColor = "#8a8478";

const mugBody = sketch.loop(
  [
    [120, 180],
    [240, 180],
    [230, 280],
    [130, 280],
  ],
  { color: ink, weight: "bold", looseness: 0.22, energy: "calm", smooth: false, fill: { color: cream, style: "solid" } }
);
scene.add(mugBody).drawOn({ at: 0, duration: 1.3 });

const handle = sketch.stroke(
  [
    [240, 200],
    [270, 205],
    [275, 230],
    [270, 255],
    [240, 260],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
);
scene.add(handle).drawOn({ at: 1.55, duration: 0.6 });

const coffeeSurface = sketch.loop(
  [
    [134, 184],
    [226, 184],
    [222, 196],
    [138, 196],
  ],
  { color: ink, weight: "confident", looseness: 0.2, energy: "calm", smooth: false, fill: { color: coffee, style: "solid" } }
);
scene.add(coffeeSurface).drawOn({ at: 2.4, duration: 0.5 });

const steam1 = sketch.stroke(
  [
    [160, 175],
    [150, 140],
    [165, 110],
    [155, 80],
  ],
  { color: steamColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(steam1).drawOn({ at: 3.2, duration: 0.8 });
steam1
  .moveBy(-5, -18, { at: 4.0, duration: 1.8, ease: "sine.inOut" })
  .fadeTo(0.15, { at: 4.0, duration: 0.9, ease: "sine.inOut" })
  .fadeTo(0.55, { at: 4.9, duration: 0.9, ease: "sine.inOut" })
  .fadeTo(0, { at: 5.8, duration: 0.8, ease: "sine.in" });

const steam2 = sketch.stroke(
  [
    [195, 175],
    [205, 140],
    [190, 110],
    [200, 80],
  ],
  { color: steamColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(steam2).drawOn({ at: 3.75, duration: 0.8 });
steam2
  .moveBy(5, -18, { at: 4.55, duration: 1.8, ease: "sine.inOut" })
  .fadeTo(0.15, { at: 4.55, duration: 0.9, ease: "sine.inOut" })
  .fadeTo(0.55, { at: 5.45, duration: 0.9, ease: "sine.inOut" })
  .fadeTo(0, { at: 6.35, duration: 0.8, ease: "sine.in" });

export default scene;
