import { sketch } from "../src/index.js";

// A wooden signpost in a small patch of grass, with a hand-lettered "hello!"
// painted on the sign. Tests sketch.text() as an integrated label rather than
// a word floating alone, plus a staggered letter-by-letter reveal.

const scene = sketch.scene({
  width: 480,
  height: 420,
  background: "#e8f0e3",
  seed: "signpost-hello",
});

const ink = "#2b2620";
const wood = "#a67c52";
const grass = "#6b9b6e";
const signFill = "#f7f3e9";

const ground = sketch.stroke(
  [
    [40, 370],
    [140, 360],
    [240, 365],
    [340, 360],
    [440, 370],
  ],
  { color: grass, weight: "confident", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(ground).drawOn({ at: 0, duration: 0.6 });

const post = sketch.stroke(
  [
    [240, 330],
    [240, 100],
  ],
  { color: wood, weight: "bold", looseness: 0.22, energy: "calm", smooth: true }
);
scene.add(post).drawOn({ at: 0.75, duration: 0.55 });

const board = sketch.loop(
  [
    [110, 95],
    [370, 95],
    [370, 210],
    [110, 210],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.18,
    energy: "calm",
    smooth: false,
    fill: { color: signFill, style: "solid" },
  }
);
scene.add(board).drawOn({ at: 1.45, duration: 0.9 });

const label = sketch.text(
  "hello!",
  124,
  105,
  { color: ink, weight: "confident", looseness: 0.12, energy: "calm" },
  { size: 90 }
);
scene.add(label);
label.stagger(0.09, { at: 2.45, duration: 0.55, ease: "power1.out" });

const nail1 = sketch.blob(130, 150, 4, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(nail1).drawOn({ at: 3.2, duration: 0.18 });

const nail2 = sketch.blob(350, 150, 4, { color: ink, weight: "confident", fill: { color: ink, style: "solid" } }, 8);
scene.add(nail2).drawOn({ at: 3.4, duration: 0.18 });

export default scene;
