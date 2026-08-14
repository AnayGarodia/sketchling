import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, pulseSquash, swayRotate } from "../lib.js";

// A ginger cat asleep on a cushion, breathing, with its tail flicking and three z's rising.

const scene = sketch.scene({ width: 480, height: 480, background: "#f1e9d9", seed: "cat-nap" });

const INK = "#2b2118";
const FUR = "#d98a4e";
const CREAM = "#f6e3c8";

// --- Cushion first, so the cat is painted onto it rather than floating over it.
const cushion = sketch.loop(
  [
    [96, 388],
    [190, 364],
    [300, 362],
    [392, 386],
    [382, 424],
    [268, 438],
    [150, 434],
    [92, 414],
  ],
  {
    color: "#8a6472",
    weight: "confident",
    looseness: 0.22,
    // Sparse hachure, not cross-hatch: at this size a crossed fill turned the cushion into
    // the busiest thing in the frame, competing with the cat sleeping on it.
    fill: { color: "#c99aa4", style: "hachure", density: 0.3, angle: 24 },
  }
);
scene.add(cushion).drawOn({ at: 0, duration: 0.9 });

// --- The torso is its own group so it can breathe without the head bobbing with it: a real
// cat's ribcage rises while its tucked head stays put on its paws.
const torso = sketch.group();
const body = sketch.loop(
  [
    [138, 322],
    [166, 262],
    [244, 240],
    [332, 254],
    [364, 306],
    [340, 366],
    [240, 384],
    [158, 366],
  ],
  {
    color: INK,
    weight: "bold",
    looseness: 0.2,
    fill: { color: sketch.shade(FUR, { from: "top", amount: 0.3 }), style: "solid" },
  }
);
torso.add(body);
// Three tabby stripes across the back, following its curve.
for (const [x, y] of [[228, 250], [268, 248], [308, 256]] as [number, number][]) {
  torso.add(
    sketch.stroke([[x, y], [x + 6, y + 26], [x, y + 48]], {
      color: "#a75f2c",
      weight: "confident",
      looseness: 0.3,
    }).lintIgnore("overlap")
  );
}
scene.add(torso);
drawIn([body, ...torso.children.slice(1)], { from: 0.9, to: 2.1 });

// --- Head, tucked low against the front paws. Sits at the body's left end with a good bite of
// overlap so there's no seam where the neck would be.
const head = sketch.blob(152, 288, 50, {
  color: INK,
  weight: "bold",
  looseness: 0.16,
  fill: { color: sketch.shade(FUR, { from: "top", amount: 0.26 }), style: "solid" },
}, 14);
scene.add(head).lintIgnore("overlap").drawOn({ at: 2.0, duration: 0.45 });

const ears = [
  sketch.loop([[116, 262], [122, 220], [154, 250]], { color: INK, weight: "confident", looseness: 0.2, fill: { color: "#b4703a", style: "solid" }, smooth: false }),
  sketch.loop([[162, 246], [186, 214], [196, 254]], { color: INK, weight: "confident", looseness: 0.2, fill: { color: "#b4703a", style: "solid" }, smooth: false }),
];
ears.forEach((e) => scene.add(e).lintIgnore("overlap"));
drawIn(ears, { from: 2.15, to: 2.45, each: 0.28 });

// Muzzle low on the head, then the closed eyes above it and the nose on its top edge. The
// whole "asleep" read is two short down-curved arcs, so they get confident weight rather than
// a hairline — and they have to sit clear of the muzzle, which the first pass didn't: an eye
// arc landing on the cream patch merged with the nose into one unreadable smudge.
const muzzle = sketch.blob(140, 312, 18, { color: "#bd7331", weight: "light", looseness: 0.18, fill: { color: CREAM, style: "solid" } }, 11);
scene.add(muzzle).lintIgnore("overlap").drawOn({ at: 2.4, duration: 0.3 });

const face = [
  sketch.stroke([[118, 280], [130, 288], [142, 280]], { color: INK, weight: "confident", looseness: 0.14 }),
  sketch.stroke([[160, 276], [172, 284], [184, 276]], { color: INK, weight: "confident", looseness: 0.14 }),
  sketch.loop([[133, 298], [147, 298], [140, 306]], { color: "#7d3a2c", weight: "confident", looseness: 0.1, fill: { color: "#9c4b3a", style: "solid" }, smooth: false }),
];
face.forEach((f) => scene.add(f).lintIgnore("overlap"));
drawIn(face, { from: 2.5, to: 2.8, each: 0.22 });

// Whiskers: three, deliberately uneven, fanning off the muzzle's edges.
const whiskers = [
  sketch.stroke([[124, 312], [86, 304]], { color: "#5b463a", weight: "light", looseness: 0.3 }),
  sketch.stroke([[124, 318], [90, 326]], { color: "#5b463a", weight: "light", looseness: 0.3 }),
  sketch.stroke([[158, 314], [192, 308]], { color: "#5b463a", weight: "light", looseness: 0.3 }),
];
whiskers.forEach((w) => scene.add(w).drawOn({ at: 2.62, duration: 0.3 }));

// Front paws, tucked under the chin. Painted last of the cat so they read as nearest.
const paws = [
  sketch.blob(178, 356, 22, { color: "#a8642f", weight: "light", looseness: 0.18, fill: { color: CREAM, style: "solid" } }, 11),
  sketch.blob(224, 366, 20, { color: "#a8642f", weight: "light", looseness: 0.18, fill: { color: CREAM, style: "solid" } }, 11),
];
paws.forEach((p) => scene.add(p).lintIgnore("overlap"));
drawIn(paws, { from: 2.5, to: 2.85, each: 0.3 });

// --- The tail, wrapped around the front and flicking. Pivoted where it leaves the body, so
// it swings from the base like a real tail rather than rotating about its own middle.
const tail = sketch.stroke(
  [
    [330, 352],
    [390, 358],
    [418, 324],
    [404, 278],
  ],
  { color: "#b06f33", weight: 8, looseness: 0.2, energy: "calm" }
);
scene.add(tail).lintIgnore("overlap").drawOn({ at: 2.2, duration: 0.6 });
tail.pivotAt(330, 352);
swayRotate(tail, 7, 2);

// --- Breathing: the ribcage swells about 3% vertically, pivoted at the cushion line so the
// cat presses into the cushion instead of levitating off it.
torso.pivotAt(250, 384);
pulseSquash(torso, 1.012, 1.035, 2);

// --- Three z's drifting up off the head, one per third of the loop, each bigger than the last.
const zBeats = beats(3);
[
  [206, 226, 18],
  [232, 196, 24],
  [264, 160, 30],
].forEach(([x, y, size], i) => {
  const z = sketch.text("z", x, y, { color: "#6d5a4a", weight: "confident", looseness: 0.3 }, { size });
  scene.add(z);
  // No drawOn: driftOnce owns this group's opacity for the whole timeline, so a reveal
  // scheduled during the intro would only ever be drawn at opacity 0.
  driftOnce(z, 10, -30, zBeats[i], { peak: 0.9, ease: "sine.out" });
});

export default scene;
