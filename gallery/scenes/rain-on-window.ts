import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, pulseFade, rng } from "../lib.js";

// Rain sliding down a window pane at night, seen from inside, one lit window left on out there.

// The background is the ROOM, not the sky — a warm dark wall. The night outside is its own
// gradient-filled shape sitting inside the window opening. Authored the other way round (sky
// as the scene background) the first pass had the ridgelines floating past the frame with
// nothing to occlude them, and the window read as a picture of a window rather than one you
// are standing at.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#2b2119" },
      { offset: 1, color: "#3a2c21" },
    ],
  },
  seed: "rain-window",
  texture: "grain",
});

const FRAME = "#1d1610";
const L = 92;
const RIGHT = 386;
const TOP = 108;
const BOTTOM = 348;
const rand = rng(0x51a3);

// --- Outside, painted first: the night, then two ridgelines in it. smooth:false throughout —
// a Catmull-Rom through ridge points bulges the curve past the points themselves, which here
// means past the window opening it has to stay inside of.
const sky = sketch.loop(
  [[L, TOP], [RIGHT, TOP], [RIGHT, BOTTOM], [L, BOTTOM]],
  {
    color: "#00000000",
    weight: "light",
    looseness: 0,
    smooth: false,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#141d30" },
          { offset: 0.6, color: "#24344a" },
          { offset: 1, color: "#3d5163" },
        ],
      },
      style: "solid",
    },
  }
);
scene.add(sky).drawOn({ at: 0, duration: 0.8 });

const ridgeFar = sketch.loop(
  [[L, 268], [150, 236], [212, 256], [268, 228], [330, 252], [RIGHT, 240], [RIGHT, BOTTOM], [L, BOTTOM]],
  { color: "#243755", weight: "light", looseness: 0.2, smooth: false, fill: { color: "#2b3f5c", style: "solid" } }
);
scene.add(ridgeFar).lintIgnore("overlap").drawOn({ at: 0.5, duration: 0.7 });

const ridgeNear = sketch.loop(
  [[L, 306], [168, 284], [246, 302], [318, 280], [RIGHT, 298], [RIGHT, BOTTOM], [L, BOTTOM]],
  { color: "#0f1622", weight: "light", looseness: 0.2, smooth: false, fill: { color: "#141d2b", style: "solid" } }
);
scene.add(ridgeNear).lintIgnore("overlap").drawOn({ at: 0.9, duration: 0.7 });

// One farmhouse still lit across the valley: a dark gable with two small warm windows in it.
// The lights flicker on different rhythms, which is what stops them reading as painted dots —
// and the gable behind them is what stops them reading as sticky notes, which is exactly what
// two bare yellow rectangles on a dark ridge looked like on the first pass.
const gable = sketch.loop(
  [[282, 292], [282, 274], [298, 264], [314, 274], [314, 292]],
  { color: "#0b1017", weight: "light", looseness: 0.14, smooth: false, fill: { color: "#111823", style: "solid" } }
);
scene.add(gable).lintIgnore("overlap").drawOn({ at: 1.15, duration: 0.3 });

([
  [287, 279, 3, 0.95],
  [301, 281, 2, 0.72],
] as [number, number, number, number][]).forEach(([x, y, n, peak], i) => {
  const w = sketch.loop(
    [[x, y], [x + 8, y], [x + 8, y + 8], [x, y + 8]],
    { color: "#f4c976", weight: "light", looseness: 0.12, smooth: false, fill: { color: "#f9dc98", style: "solid" } }
  );
  scene.add(w).lintIgnore("overlap").drawOn({ at: 1.4 + i * 0.12, duration: 0.15 });
  pulseFade(w, peak, peak - 0.35, n);
});

// --- The glass itself: one cold wash over the whole opening, so everything behind it reads as
// seen THROUGH something rather than just being far away.
const glass = sketch.loop(
  [[L, TOP], [RIGHT, TOP], [RIGHT, BOTTOM], [L, BOTTOM]],
  { color: "#00000000", weight: "light", looseness: 0, smooth: false, fill: { color: "#9dc3cd1c", style: "solid" } }
);
scene.add(glass).lintIgnore("overlap").drawOn({ at: 1.5, duration: 0.5 });

// --- Frame, mullions and sill, drawn over the glass so the wood reads as nearest.
const frame = sketch.loop(
  [[L, TOP], [RIGHT, TOP], [RIGHT, BOTTOM], [L, BOTTOM]],
  { color: FRAME, weight: 9, looseness: 0.1, smooth: false }
);
scene.add(frame).lintIgnore("overlap").drawOn({ at: 0.1, duration: 1.2 });

const mullions = [
  sketch.stroke([[239, TOP], [239, BOTTOM]], { color: FRAME, weight: 7, looseness: 0.1 }),
  sketch.stroke([[L, 228], [RIGHT, 228]], { color: FRAME, weight: 7, looseness: 0.1 }),
];
mullions.forEach((m) => scene.add(m));
drawIn(mullions, { from: 1.35, to: 1.95, each: 0.45 });

const sill = sketch.loop(
  [[70, BOTTOM], [408, BOTTOM], [404, 376], [74, 376]],
  { color: "#140f0a", weight: "bold", looseness: 0.12, smooth: false, fill: { color: sketch.shade("#6d4a2e", { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(sill).drawOn({ at: 1.9, duration: 0.6 });

// A mug left on the sill, still warm — the one warm object on this side of the glass, and the
// reason the scene reads as somebody's evening rather than a study of a window.
const mug = sketch.loop(
  [[286, 300], [332, 300], [326, 348], [292, 348]],
  { color: "#2c1c16", weight: "confident", looseness: 0.14, smooth: false, fill: { color: sketch.shade("#c2624c", { from: "left", amount: 0.28 }), style: "solid" } }
);
scene.add(mug).lintIgnore("overlap").drawOn({ at: 2.25, duration: 0.4 });
const handle = sketch.stroke([[332, 310], [352, 320], [330, 334]], { color: "#2c1c16", weight: "confident", looseness: 0.18 });
scene.add(handle).lintIgnore("overlap").drawOn({ at: 2.5, duration: 0.25 });
// Steam: two short wisps rising off it on opposite beats, so there's always one in the air.
const steamBeats = beats(2);
[
  [302, 292, -8],
  [316, 288, 7],
].forEach(([x, y, dx], i) => {
  const wisp = sketch.stroke(
    [[x, y], [x + dx, y - 12], [x, y - 24], [x + dx * 0.6, y - 34]],
    { color: "#e7d9c4", weight: "light", looseness: 0.35, energy: "calm" }
  );
  scene.add(wisp).lintIgnore("overlap");
  driftOnce(wisp, dx * 0.5, -26, steamBeats[i], { peak: 0.5, ease: "sine.out" });
});

// --- The drops. A teardrop outline rather than a small blob: below ~9px a blob's own jitter
// overwhelms it (see sketch.blob's note), and these want to be small AND clean.
function drop(x: number, y: number, w: number, h: number) {
  return sketch.loop(
    [
      [x, y - h],
      [x + w, y - h * 0.15],
      [x + w * 0.75, y + h * 0.6],
      [x, y + h * 0.8],
      [x - w * 0.75, y + h * 0.6],
      [x - w, y - h * 0.15],
    ],
    { color: "#d8ecf2", weight: "light", looseness: 0.18, fill: { color: "#eef7fa", style: "solid" } }
  );
}

// Seven drops, spread across five beats so the rain is a continuous trickle rather than a few
// drops moving in lockstep. Each slides about a pane's height and resets while transparent.
const fiveBeats = beats(5);
([
  [140, 130, 5, 10],
  [196, 124, 4, 8],
  [286, 132, 6, 11],
  [344, 126, 4, 8],
  [168, 250, 5, 10],
  [356, 246, 5, 10],
  [258, 138, 4, 8],
] as [number, number, number, number][]).forEach(([x, y, w, h], i) => {
  const d = drop(x, y, w, h);
  scene.add(d).lintIgnore("overlap");
  // A slight rightward wander as it slides — a drop on real glass never runs straight down.
  driftOnce(d, 3 + rand() * 6, 82 + rand() * 24, fiveBeats[i % 5], { ease: "sine.in", peak: 0.95 });
});

// Two long streaks the earlier drops have already run down — static, so the pane still reads as
// wet in the moment between drops. (An earlier pass used round condensation beads for this and
// they read as grey lint stuck to the glass; a streak reads as water because of its shape, not
// its colour.)
const streaks = [
  sketch.stroke([[152, 130], [157, 176], [153, 214]], { color: "#cfe6ee55", weight: 3, looseness: 0.25 }),
  sketch.stroke([[322, 240], [327, 292], [323, 340]], { color: "#cfe6ee44", weight: 3, looseness: 0.25 }),
];
streaks.forEach((s) => scene.add(s).lintIgnore("overlap"));
drawIn(streaks, { from: 2.55, to: 2.9, each: 0.3 });

export default scene;
