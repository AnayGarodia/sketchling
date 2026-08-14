import { sketch } from "../../src/index.js";
import { LOOP_START, appearIn, blink, drawIn, pulseSquash, swayRotate } from "../lib.js";

// A round owl perched on a branch at dusk, breathing, blinking twice and tilting its head.

// texture: "grain" over the ink look — dusk is the one lighting condition where a clean
// gradient reads as digital, and the grain puts a bit of dusty air back into the sky.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#232f52" },
      { offset: 0.55, color: "#4e4a6e" },
      { offset: 1, color: "#9c6a58" },
    ],
  },
  seed: "owl-branch",
  look: "ink",
  texture: "grain",
});

const INK = "#231a14";
const FEATHER = "#8d6141";
const CREAM = "#efd7ac";
const AMBER = "#f0b73f";
const BARK = "#4a3323";

// --- Moon and stars first: the whole owl is read as a silhouette against them, so they have
// to exist before there is anything to silhouette.
const moon = sketch.ellipse(378, 112, 40, 40, {
  color: "#e9dcae",
  weight: "light",
  looseness: 0,
  fill: { color: "#f2e6bd", style: "solid" },
}, 28);
scene.add(moon).drawOn({ at: 0, duration: 0.7 });

const stars = ([[92, 96], [148, 62], [286, 78], [64, 178], [430, 210]] as [number, number][]).map(
  ([x, y]) => sketch.ellipse(x, y, 5, 5, { color: "#f4ecd0", weight: "light", looseness: 0, fill: { color: "#f8f2dc", style: "solid" } }, 10)
);
stars.forEach((s) => scene.add(s));
appearIn(stars, { from: 0.2, to: 1.0, each: 0.4 });

// --- The branch. Drawn as a filled tapering limb rather than a stroke so the owl has real
// wood to grip instead of a wire.
const branch = sketch.loop(
  [
    [22, 372],
    [150, 380],
    [300, 374],
    [458, 358],
    [458, 380],
    [300, 396],
    [150, 402],
    [22, 392],
  ],
  { color: BARK, weight: "bold", looseness: 0.24, fill: { color: sketch.shade("#6b4a30", { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(branch).drawOn({ at: 0.4, duration: 0.9 });

const twig = sketch.stroke([[366, 372], [376, 356], [382, 340]], { color: BARK, weight: "confident", looseness: 0.22 });
scene.add(twig).drawOn({ at: 1.1, duration: 0.3 });

// --- Body group: everything that should swell when the owl breathes. The head is NOT in here
// — a breath that lifted the head as well would read as the whole bird inflating.
const torso = sketch.group();
const body = sketch.blob(240, 300, 80, {
  color: INK,
  weight: "bold",
  looseness: 0.18,
  fill: { color: sketch.shade(FEATHER, { from: "top", amount: 0.32 }), style: "solid" },
}, 14);
torso.add(body);

// Pale front, then three chevrons down it — an owl's markings are the only thing that keeps a
// big brown oval from reading as a potato.
const front = sketch.blob(240, 316, 50, {
  color: "#b98a5e",
  weight: "light",
  looseness: 0.2,
  fill: { color: CREAM, style: "solid" },
}, 12);
torso.add(front.lintIgnore("overlap"));
for (const y of [292, 318, 344]) {
  torso.add(
    sketch.stroke([[216, y], [240, y + 9], [264, y]], { color: "#a06f45", weight: "confident", looseness: 0.25 }).lintIgnore("overlap")
  );
}

// Wings, one per side, tucked down along the flanks.
const wings = [
  sketch.loop([[178, 262], [156, 306], [172, 356], [200, 340], [198, 280]], {
    color: INK, weight: "confident", looseness: 0.22, fill: { color: "#6f4a30", style: "solid" },
  }),
  sketch.loop([[302, 262], [324, 306], [308, 356], [280, 340], [282, 280]], {
    color: INK, weight: "confident", looseness: 0.22, fill: { color: "#6f4a30", style: "solid" },
  }),
];
wings.forEach((w) => torso.add(w.lintIgnore("overlap")));
scene.add(torso);
drawIn([body, front, ...torso.children.slice(2)], { from: 1.0, to: 2.0 });

// --- Head, painted after the body and dropped well into it, so the silhouette closes over the
// shoulders instead of leaving a gap where a neck would be.
const headGroup = sketch.group();
const head = sketch.blob(240, 220, 58, {
  color: INK,
  weight: "bold",
  looseness: 0.16,
  fill: { color: sketch.shade(FEATHER, { from: "top", amount: 0.26 }), style: "solid" },
}, 14);
headGroup.add(head.lintIgnore("overlap"));

// Ear tufts: sharp corners, so smooth:false — a spline through three points would round them
// into rabbit ears.
const tufts = [
  sketch.loop([[192, 182], [180, 138], [222, 170]], { color: INK, weight: "confident", looseness: 0.2, fill: { color: "#6f4a30", style: "solid" }, smooth: false }),
  sketch.loop([[288, 182], [300, 138], [258, 170]], { color: INK, weight: "confident", looseness: 0.2, fill: { color: "#6f4a30", style: "solid" }, smooth: false }),
];
tufts.forEach((t) => headGroup.add(t.lintIgnore("overlap")));

// --- Eyes. Their own group, because the blink squashes just these and nothing else. Sized so
// the pair nearly meets in the middle: an owl's eyes are enormous relative to its skull, and
// under-sizing them is what makes a round bird read as a pigeon.
const eyes = sketch.group();
for (const ex of [211, 269]) {
  eyes.add(sketch.ellipse(ex, 218, 26, 26, { color: "#5c3a22", weight: "confident", looseness: 0, fill: { color: AMBER, style: "solid" } }, 22).lintIgnore("overlap"));
  eyes.add(sketch.ellipse(ex, 220, 12, 13, { color: INK, weight: "light", looseness: 0, fill: { color: "#1a120c", style: "solid" } }, 18).lintIgnore("overlap"));
  eyes.add(sketch.ellipse(ex - 5, 213, 4, 4, { color: "#ffffff", weight: "light", looseness: 0, fill: { color: "#ffffff", style: "solid" } }, 10).lintIgnore("overlap"));
}
headGroup.add(eyes);

// Beak: a downward wedge between the eyes.
const beak = sketch.loop([[230, 236], [250, 236], [240, 264]], {
  color: "#7a4a1c", weight: "confident", looseness: 0.14, fill: { color: "#e29a3a", style: "solid" }, smooth: false,
});
headGroup.add(beak.lintIgnore("overlap"));

scene.add(headGroup);
head.drawOn({ at: 1.95, duration: 0.45 });
drawIn(tufts, { from: 2.2, to: 2.45, each: 0.22 });
appearIn(eyes.children, { from: 2.4, to: 2.7, each: 0.25 });
beak.drawOn({ at: 2.7, duration: 0.2 });

// --- Feet gripping the bark, painted last of the bird so the toes read as in front of it.
const feet = [
  sketch.stroke([[214, 356], [208, 382], [196, 388]], { color: "#c9963f", weight: "bold", looseness: 0.2, smooth: false }),
  sketch.stroke([[214, 356], [216, 384], [230, 388]], { color: "#c9963f", weight: "bold", looseness: 0.2, smooth: false }),
  sketch.stroke([[266, 356], [264, 384], [250, 388]], { color: "#c9963f", weight: "bold", looseness: 0.2, smooth: false }),
  sketch.stroke([[266, 356], [272, 382], [284, 388]], { color: "#c9963f", weight: "bold", looseness: 0.2, smooth: false }),
];
feet.forEach((f) => scene.add(f).lintIgnore("overlap"));
drawIn(feet, { from: 2.4, to: 2.85, each: 0.2 });

// --- The breath. Pivoted at the toes, so the owl presses down into the branch as it swells
// rather than levitating off it; 3.5% is as far as this can go before it reads as a bellows.
torso.pivotAt(240, 386);
pulseSquash(torso, 1.014, 1.035, 2);

// --- The head tilt: two degrees, pivoted at the neck rather than the head's own middle, which
// is the difference between a bird looking around and a balloon rolling.
headGroup.pivotAt(240, 276);
swayRotate(headGroup, 2.5, 2);

// Two blinks, deliberately unevenly spaced across the window — a metronome blink reads as a
// machine. Both are inside the loop and return to (1, 1), so neither touches the seam.
blink(eyes, LOOP_START + 0.75);
blink(eyes, LOOP_START + 2.15);

// --- One leaf on the twig, fluttering on its own faster rhythm. Pivoted at the stem, so it
// hangs and shakes instead of spinning about its own centre.
const leaf = sketch.loop(
  [[382, 340], [392, 316], [410, 302], [404, 326], [392, 338]],
  { color: "#4f6b38", weight: "confident", looseness: 0.24, fill: { color: "#7d9a4c", style: "solid" } }
);
scene.add(leaf).drawOn({ at: 1.4, duration: 0.35 });
leaf.pivotAt(382, 340);
swayRotate(leaf, 11, 3);

export default scene;
