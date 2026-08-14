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

function groundLoop() {
  return sketch.loop(ground, { color: ink, weight: "bold", looseness: 0.15, smooth: false, fill: { color: soil, style: "solid" } });
}

// Scene one: a seed goes in.
const planting = sketch.scene({ width: 520, height: 400, background: "#e7ddc8", seed: "film-seed" });
planting.add(groundLoop()).drawOn({ at: 0, duration: 0.7 });

const seed = sketch.blob(260, 300, 12, { color: ink, weight: "light", looseness: 0.2, fill: { color: "#6b4a2d", style: "solid" } }, 10);
planting.add(seed).drawOn({ at: 0.4, duration: 0.3 });
seed.moveTo(260, 336, { at: 1, duration: 0.5, ease: "power2.in" });

// Scene two: it comes up. Built exactly like a standalone scene — a film only sequences.
const sprouting = sketch.scene({ width: 520, height: 400, background: "#c9e9f6", seed: "film-sprout" });
sprouting.add(groundLoop()).drawOn({ at: 0, duration: 0.7 });

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
