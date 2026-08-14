// Film — two scenes, one crossfade
import { sketch } from "sketchling";

const ink = "#2b2115";
const soil = "#8a5a34";
const leafGreen = "#5c9457";

const ground: [number, number][] = [
  [80, 330],
  [440, 330],
  [440, 400],
  [80, 400],
];

// sketch.shade() turns one base colour into a lit-to-shadow gradient, so the soil has a
// surface instead of reading as a flat brown block.
function groundLoop() {
  return sketch.loop(ground, {
    color: ink,
    weight: "confident",
    looseness: 0.18,
    smooth: false,
    fill: { color: sketch.shade(soil, { from: "top", amount: 0.3 }), style: "solid" },
  });
}

function mound() {
  return sketch.stroke(
    [
      [206, 332],
      [260, 316],
      [314, 332],
    ],
    { color: "#6b4a2d", weight: "confident", looseness: 0.25, smooth: true }
  );
}

// Scene one: a seed goes in.
const planting = sketch.scene({ width: 520, height: 400, background: "#e7ddc8", seed: "film-seed" });
planting.add(groundLoop()).drawOn({ at: 0, duration: 0.7 });
planting.add(mound()).drawOn({ at: 0.8, duration: 0.4 });

const seed = sketch.blob(260, 290, 12, { color: ink, weight: "light", looseness: 0.2, fill: { color: "#6b4a2d", style: "solid" } }, 10);
planting.add(seed).drawOn({ at: 0.5, duration: 0.3 });
seed.moveTo(260, 330, { at: 1.3, duration: 0.5, ease: "power2.in" });

// Scene two: it comes up. Built exactly like a standalone scene — a film only sequences.
const sprouting = sketch.scene({ width: 520, height: 400, background: "#c9e9f6", seed: "film-sprout" });
sprouting.add(groundLoop()).drawOn({ at: 0, duration: 0.7 });
sprouting.add(mound()).drawOn({ at: 0.6, duration: 0.4 });

// A few tufts either side, so the sprout has company rather than standing in bare soil.
[[120, 336], [170, 340], [360, 338], [410, 334]].forEach(([x, y], i) => {
  const tuft = sketch.stroke(
    [
      [x - 10, y],
      [x - 3, y - 20],
      [x + 4, y - 4],
      [x + 11, y - 24],
    ],
    { color: "#5c8a4f", weight: "light", looseness: 0.3, smooth: true }
  );
  sprouting.add(tuft).drawOn({ at: 2.6 + i * 0.2, duration: 0.3 });
});

const sun = sketch.ellipse(430, 80, 38, 38, { color: "#d4a017", weight: "light", fill: { color: "#f0c25f", style: "solid" } });
sprouting.add(sun).drawOn({ at: 0.5, duration: 0.5 });

const stem = sketch.stroke(
  [
    [260, 336],
    [258, 280],
    [264, 220],
  ],
  { color: leafGreen, weight: "confident", looseness: 0.2, smooth: true }
);
sprouting.add(stem).drawOn({ at: 1, duration: 0.7 });

for (const dir of [-1, 1]) {
  const leaf = sketch.loop(
    [
      [261, 272],
      [261 + 62 * dir, 246],
      [261 + 58 * dir, 210],
      [261, 240],
    ],
    { color: leafGreen, weight: "confident", looseness: 0.25, smooth: true, fill: { color: leafGreen, style: "solid" } }
  );
  sprouting.add(leaf).drawOn({ at: dir === -1 ? 1.8 : 2.3, duration: 0.45 });
}

const film = sketch.film({ width: 520, height: 400, background: "#141414" });
film.addScene(planting, { transition: "cut", hold: 0.5 });
film.addScene(sprouting, { transition: "fade", transitionDuration: 0.6, hold: 0.6 });

export default film;
