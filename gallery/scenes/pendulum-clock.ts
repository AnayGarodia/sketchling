import { sketch } from "../../src/index.js";
import { appearIn, beats, drawIn, swayRotate } from "../lib.js";

// A walnut wall clock with its pendulum swinging behind glass and a second hand stepping round.

const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#9aab9f" },
      { offset: 1, color: "#7c8e84" },
    ],
  },
  seed: "pendulum-clock",
  look: "ink",
  texture: "grain",
});

const INK = "#241a12";
const WALNUT = "#6b4325";
const DARK_WOOD = "#503220";
const FACE = "#f4ead2";
const BRASS = "#c9922f";

const FX = 240; // face centre — every hand and tick is measured from here
const FY = 156;
const PIVOT_Y = 278; // where the pendulum rod is hung, just inside the top of the trunk

// --- One flat shadow, the whole case silhouette offset down-right by 12px and drawn first, so
// only a band of it survives along two edges. A clock is the one object that has to read as
// hanging ON a wall rather than floating in front of one, and that band does all of it.
const castShadow = sketch.loop(
  [
    [130, 56],
    [374, 56],
    [374, 284],
    [324, 284],
    [324, 436],
    [340, 436],
    [340, 464],
    [164, 464],
    [164, 436],
    [180, 436],
    [180, 284],
    [130, 284],
  ],
  { color: "#00000000", looseness: 0.1, fill: { color: "#00000030", style: "solid" }, smooth: false }
);
scene.add(castShadow).lintIgnore("overlap").drawOn({ at: 0, duration: 0.6 });

// --- Case. smooth:false on every panel: this is a joiner's box, and a Catmull-Rom through the
// corners turns the crown and the trunk into soft pillows.
const pediment = sketch.loop(
  [
    [110, 44],
    [370, 44],
    [350, 18],
    [130, 18],
  ],
  { color: INK, weight: "bold", looseness: 0.12, fill: { color: DARK_WOOD, style: "solid" }, smooth: false }
);
scene.add(pediment);

const head = sketch.loop(
  [
    [118, 44],
    [362, 44],
    [362, 272],
    [118, 272],
  ],
  { color: INK, weight: "bold", looseness: 0.12, fill: { color: sketch.shade(WALNUT, { from: "top", amount: 0.3 }), style: "solid" }, smooth: false }
);
scene.add(head).lintIgnore("overlap");

const trunk = sketch.loop(
  [
    [168, 272],
    [312, 272],
    [308, 424],
    [172, 424],
  ],
  { color: INK, weight: "bold", looseness: 0.12, fill: { color: sketch.shade(WALNUT, { from: "top", amount: 0.24 }), style: "solid" }, smooth: false }
);
scene.add(trunk).lintIgnore("overlap");

// The glazed panel: a dark void is what makes the brass rod inside read as being behind glass
// rather than nailed to the front of the case.
const panel = sketch.loop(
  [
    [184, 286],
    [296, 286],
    [293, 408],
    [187, 408],
  ],
  { color: "#1b120c", weight: "confident", looseness: 0.12, fill: { color: "#2e2018", style: "solid" }, smooth: false }
);
scene.add(panel).lintIgnore("overlap");

const base = sketch.loop(
  [
    [152, 424],
    [328, 424],
    [328, 452],
    [152, 452],
  ],
  { color: INK, weight: "bold", looseness: 0.12, fill: { color: DARK_WOOD, style: "solid" }, smooth: false }
);
scene.add(base).lintIgnore("overlap");

// --- Dial. ellipse() rather than blob() for both rings: a hand-wobbled bezel reads as a
// pressed tin lid, and the one thing a clock face has to be is round.
const bezel = sketch.ellipse(FX, FY, 100, 100, { color: INK, weight: "bold", looseness: 0.08, fill: { color: BRASS, style: "solid" } }, 36);
scene.add(bezel).lintIgnore("overlap");

const face = sketch.ellipse(FX, FY, 92, 92, { color: INK, weight: "confident", looseness: 0.08, fill: { color: FACE, style: "solid" } }, 36);
scene.add(face).lintIgnore("overlap");

// Twelve ticks, the four cardinals twice as long — that asymmetry is what reads as a dial at
// thumbnail size, where twelve identical dashes read as a gear.
const ticks = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const cardinal = i % 3 === 0;
  const r0 = cardinal ? 68 : 76;
  return sketch.stroke(
    [
      [FX + Math.cos(a) * r0, FY + Math.sin(a) * r0],
      [FX + Math.cos(a) * 84, FY + Math.sin(a) * 84],
    ],
    { color: INK, weight: cardinal ? "bold" : "confident", looseness: 0.1 }
  ).lintIgnore("overlap");
});
ticks.forEach((t) => scene.add(t));

// --- Two hands, authored already pointing where they should point. swayRotate and the stepping
// loop below both write `rotation`, and swayRotate sets its own initial({rotation}) — so an
// authored angle is the only place a starting position can live without being clobbered.
const minute = sketch.loop(
  [
    [248, 167.5],
    [241.1, 147.9],
    [194.1, 90.5],
    [232.1, 154.3],
  ],
  { color: INK, weight: "bold", looseness: 0.08, fill: { color: "#2f2116", style: "solid" }, smooth: false }
);
scene.add(minute).lintIgnore("overlap");

const second = sketch.stroke([[222.7, 146], [314.5, 199]], { color: "#a83a2a", weight: "confident", looseness: 0.06 });
scene.add(second).lintIgnore("overlap");

const cap = sketch.ellipse(FX, FY, 10, 10, { color: INK, weight: "confident", looseness: 0.08, fill: { color: BRASS, style: "solid" } }, 14);
scene.add(cap).lintIgnore("overlap");

// --- Pendulum: rod and bob in one group so they swing as one piece of brass.
const rod = sketch.stroke([[FX, PIVOT_Y], [FX, 352]], { color: BRASS, weight: "bold", looseness: 0.08 });
const bob = sketch.ellipse(FX, 376, 26, 26, { color: "#8a5f18", weight: "bold", looseness: 0.08, fill: { color: sketch.shade(BRASS, { from: "top", amount: 0.32 }), style: "solid" } }, 24);
const pendulum = sketch.group([rod, bob]);
scene.add(pendulum);

drawIn([pediment, head, trunk, panel, base, bezel, face, minute, second, cap, rod, bob], { from: 0, to: 2.6 });
appearIn(ticks, { from: 2.0, to: 2.7, each: 0.3 });

// --- The loop. The pendulum is the event: four complete swings across the window, pivoted at
// the top of the rod rather than the group's own middle, which is the difference between a
// pendulum and a brass dumbbell see-sawing in mid-air. Four is even, so the rod is on the same
// side of vertical at the seam as it was on the first frame.
pendulum.pivotAt(FX, PIVOT_Y);
swayRotate(pendulum, 7, 4);

// The second hand steps rather than sweeps: ten discrete kicks of 36 degrees, each with a fast
// overshoot ease so it lands like an escapement releasing. Relative rotateBy, so the ten sum to
// exactly 360 and the last one renders identically to the starting angle.
second.pivotAt(FX, FY);
for (const { at } of beats(10)) {
  second.rotateBy(36, { at, duration: 0.09, ease: "power3.out" });
}

// The minute hand barely moves, which is the honest amount for 3.3 seconds — under a degree of
// creep, one slow breath, back where it started.
minute.pivotAt(FX, FY);
swayRotate(minute, 0.7, 1);

export default scene;
