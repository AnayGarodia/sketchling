import { sketch } from "../src/index.js";

// A tiny hand-drawn map — tests sketch.arrow() pointing between two landmarks and
// sketch.speechBubble() as a caption anchored to one of them.
const scene = sketch.scene({ width: 480, height: 360, background: "#f3efe1", seed: "map-directions" });

const ink = "#231f19";
const water = "#7fb2c9";

const lake = sketch.blob(120, 240, 55, { color: ink, weight: "confident", looseness: 0.3, fill: { color: water, style: "hachure", density: 0.5 } }, 12);
scene.add(lake).drawOn({ at: 0, duration: 0.8 });

const house = sketch.loop(
  [
    [340, 200],
    [400, 200],
    [400, 250],
    [340, 250],
  ],
  { color: ink, weight: "bold", smooth: false, fill: { color: "#e0b675", style: "solid" } }
);
scene.add(house).drawOn({ at: 0.95, duration: 0.5 });

const roof = sketch.loop(
  [
    [330, 200],
    [370, 168],
    [410, 200],
  ],
  { color: ink, weight: "bold", smooth: false, fill: { color: "#b5553f", style: "solid" } }
);
scene.add(roof).drawOn({ at: 1.5, duration: 0.35 });

const path = sketch.arrow([165, 235], [335, 220], { color: ink, weight: "confident", looseness: 0.3 }, { headSize: 18 });
scene.add(path);
path.children.forEach((c, i) => c.drawOn({ at: 2.0 + i * 0.15, duration: 0.35 }));

const caption = sketch.speechBubble(230, 60, 150, 70, { color: ink, weight: "confident", fill: { color: "#fbf8f1", style: "solid" } }, { tailAt: "bottom-center", tailSize: 22 });
scene.add(caption).drawOn({ at: 2.8, duration: 0.6 });

const label = sketch.text("this way", 250, 78, { color: ink, weight: "confident" }, { size: 26 });
scene.add(label);
label.stagger(0.04, { at: 3.5, duration: 0.25 });

export default scene;
