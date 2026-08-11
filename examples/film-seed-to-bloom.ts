import { sketch } from "../src/index.js";

// Three small scenes (a seed planted, a first sprout, a full bloom under a sun) cut
// together with sketch.film() — a minimal end-to-end demo of the cut/hold/fade transition
// vocabulary itself, one cut and one crossfade, rather than a narrative piece in its own
// right. See examples/story/ for full multi-scene films built the same way at real scale.

const ink = "#2b2115";
const soil = "#8a5a34";
const soilDark = "#6b4a2d";
const leaf = "#4c7a4f";
const leafFill = "#5c9457";
const petalPink = "#e79cc2";
const sunFill = "#f0c25f";
const sunInk = "#d4a017";

const groundPoints = [
  [120, 380],
  [520, 380],
  [520, 460],
  [120, 460],
] as [number, number][];

const moundPoints = [
  [240, 380],
  [320, 358],
  [400, 380],
] as [number, number][];

const scene1 = sketch.scene({ width: 640, height: 480, background: "#e7ddc8", seed: "film-seed" });

const ground1 = sketch.loop(groundPoints, {
  color: ink,
  weight: "bold",
  looseness: 0.15,
  smooth: false,
  fill: { color: soil, style: "solid" },
});
scene1.add(ground1).drawOn({ at: 0, duration: 0.75 });

const mound1 = sketch.loop(moundPoints, {
  color: ink,
  weight: "confident",
  looseness: 0.18,
  smooth: false,
  fill: { color: soil, style: "hachure", density: 0.5 },
});
scene1.add(mound1).drawOn({ at: 0.95, duration: 0.45 });

const seed1 = sketch.blob(320, 362, 11, {
  color: ink,
  weight: "light",
  looseness: 0.2,
  fill: { color: soilDark, style: "solid" },
}, 10);
scene1.add(seed1).drawOn({ at: 1.55, duration: 0.3 });

const scene2 = sketch.scene({ width: 640, height: 480, background: "#c9e9f6", seed: "film-sprout" });

const ground2 = sketch.loop(groundPoints, {
  color: ink,
  weight: "bold",
  looseness: 0.15,
  smooth: false,
  fill: { color: soil, style: "solid" },
});
scene2.add(ground2).drawOn({ at: 0, duration: 0.75 });

const mound2 = sketch.loop(moundPoints, {
  color: ink,
  weight: "confident",
  looseness: 0.18,
  smooth: false,
  fill: { color: soil, style: "hachure", density: 0.5 },
});
scene2.add(mound2).drawOn({ at: 0.95, duration: 0.45 });

const sun2 = sketch.blob(520, 90, 42, {
  color: sunInk,
  weight: "light",
  looseness: 0.15,
  fill: { color: sunFill, style: "solid" },
}, 14);
scene2.add(sun2).drawOn({ at: 0.6, duration: 0.7 });

const ray2a = sketch.stroke([[460, 90], [430, 90]], { color: sunInk, weight: "light", looseness: 0.2 });
scene2.add(ray2a).drawOn({ at: 1.35, duration: 0.25 });

const ray2b = sketch.stroke([[540, 90], [570, 90]], { color: sunInk, weight: "light", looseness: 0.2 });
scene2.add(ray2b).drawOn({ at: 1.65, duration: 0.25 });

const ray2c = sketch.stroke([[520, 150], [520, 180]], { color: sunInk, weight: "light", looseness: 0.2 });
scene2.add(ray2c).drawOn({ at: 1.95, duration: 0.25 });

const stem2 = sketch.stroke([[320, 360], [320, 310], [320, 250]], {
  color: leaf,
  weight: "confident",
  looseness: 0.2,
  smooth: true,
});
scene2.add(stem2).drawOn({ at: 1.6, duration: 0.7 });

const leafLeft2 = sketch.loop(
  [
    [320, 310],
    [250, 280],
    [250, 240],
    [320, 270],
  ],
  { color: leaf, weight: "confident", looseness: 0.25, smooth: true, fill: { color: leafFill, style: "solid" } }
);
scene2.add(leafLeft2).drawOn({ at: 2.4, duration: 0.45 });

const leafRight2 = sketch.loop(
  [
    [320, 290],
    [390, 260],
    [390, 220],
    [320, 250],
  ],
  { color: leaf, weight: "confident", looseness: 0.25, smooth: true, fill: { color: leafFill, style: "solid" } }
);
scene2.add(leafRight2).drawOn({ at: 2.95, duration: 0.45 });

const scene3 = sketch.scene({ width: 640, height: 480, background: "#f2d4a3", seed: "film-bloom" });

const ground3 = sketch.loop(groundPoints, {
  color: ink,
  weight: "bold",
  looseness: 0.15,
  smooth: false,
  fill: { color: soil, style: "solid" },
});
scene3.add(ground3).drawOn({ at: 0, duration: 0.75 });

const stem3 = sketch.stroke([[320, 360], [320, 300], [320, 220]], {
  color: leaf,
  weight: "confident",
  looseness: 0.2,
  smooth: true,
});
scene3.add(stem3).drawOn({ at: 0.9, duration: 0.7 });

const leaf3 = sketch.loop(
  [
    [320, 300],
    [250, 270],
    [250, 230],
    [320, 260],
  ],
  { color: leaf, weight: "confident", looseness: 0.25, smooth: true, fill: { color: leafFill, style: "solid" } }
);
scene3.add(leaf3).drawOn({ at: 1.75, duration: 0.45 });

const center3 = sketch.blob(320, 210, 22, {
  color: ink,
  weight: "confident",
  looseness: 0.15,
  fill: { color: sunFill, style: "solid" },
}, 14);
scene3.add(center3).drawOn({ at: 2.35, duration: 0.45 });

const petals = sketch.group();
scene3.add(petals);
for (let i = 0; i < 8; i++) {
  const angle = (i * Math.PI * 2) / 8;
  const cx = 320 + Math.cos(angle) * 48;
  const cy = 210 + Math.sin(angle) * 48;
  const p = sketch.blob(cx, cy, 20, {
    color: ink,
    weight: "confident",
    looseness: 0.2,
    fill: { color: petalPink, style: "solid" },
  }, 10);
  petals.add(p);
}
petals.stagger(0.12, { at: 2.9, duration: 0.35 });

const film = sketch.film({ width: 640, height: 480, background: "#1a1a1a" });
film.addScene(scene1, { transition: "cut", hold: 0.5 });
film.addScene(scene2, { transition: "cut", hold: 0.5 });
film.addScene(scene3, { transition: "fade", transitionDuration: 0.6, hold: 0.5 });

export default film;
