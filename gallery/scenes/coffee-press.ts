import { sketch } from "../../src/index.js";
import { beats, drawIn, driftOnce, pulseScale } from "../lib.js";

// A french press and a filled mug on a wooden counter, both still steaming.

// The background darkens toward the top on purpose: the whole upper third of this frame is
// where the steam lives, and pale wisps on a pale wall are invisible.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#c4a578" },
      { offset: 0.6, color: "#dcc39a" },
      { offset: 1, color: "#e7d2ab" },
    ],
  },
  seed: "coffee-press",
  look: "ink",
});

const INK = "#33241a";
const WOOD = "#a06e42";
const COFFEE = "#472a1a";
const STEEL = "#c0b2a0";
const GLAZE = "#d2764f";
const STEAM = "#fdf5e6";

const COUNTER_Y = 394;

// --- Counter first, full width, so both vessels stand on something rather than hovering in a
// tan void. Shaded from the top so the front face falls away from the light.
const counter = sketch.loop(
  [
    [0, COUNTER_Y],
    [480, COUNTER_Y],
    [480, 480],
    [0, 480],
  ],
  {
    color: "#5c3d24",
    weight: "bold",
    looseness: 0.12,
    fill: { color: sketch.shade(WOOD, { from: "top", amount: 0.34 }), style: "solid" },
    smooth: false,
  }
);
scene.add(counter).drawOn({ at: 0, duration: 0.9 });

// --- The press. Every part is smooth:false: a carafe is a machined cylinder, and a spline
// through four corners rounds it into a jar.
const glass = sketch.loop(
  [
    [138, 198],
    [230, 198],
    [230, 372],
    [138, 372],
  ],
  { color: INK, weight: "bold", looseness: 0.1, fill: { color: "#f3e7cf", style: "solid" }, smooth: false }
);
scene.add(glass);

// Brew fills the bottom two thirds — the level is what says "already made", and it is the
// darkest mass in the frame, which is what anchors the composition on the left.
const brew = sketch.loop(
  [
    [144, 242],
    [224, 242],
    [224, 368],
    [144, 368],
  ],
  {
    color: "#2c170c",
    weight: "confident",
    looseness: 0.12,
    fill: { color: sketch.shade(COFFEE, { from: "top", amount: 0.32 }), style: "solid" },
    smooth: false,
  }
);
scene.add(brew).lintIgnore("overlap");

// The plunger screen, resting on the brew line. One rule, because that is all a screen is
// from the side, and a drawn mesh at this size would be grit.
const screen = sketch.stroke([[144, 238], [224, 238]], { color: STEEL, weight: "bold", looseness: 0.14 });
scene.add(screen).lintIgnore("overlap");

const collar = sketch.loop(
  [
    [128, 182],
    [240, 182],
    [240, 202],
    [128, 202],
  ],
  { color: INK, weight: "bold", looseness: 0.1, fill: { color: STEEL, style: "solid" }, smooth: false }
);
scene.add(collar).lintIgnore("overlap");

const base = sketch.loop(
  [
    [130, 368],
    [238, 368],
    [238, 398],
    [130, 398],
  ],
  { color: INK, weight: "bold", looseness: 0.1, fill: { color: STEEL, style: "solid" }, smooth: false }
);
scene.add(base).lintIgnore("overlap");

// The rod is a shade darker than the rest of the steel: at STEEL it vanished against the
// collar and left the knob reading as a dark oval floating in the wall.
const rod = sketch.stroke([[184, 142], [184, 188]], { color: "#7b6c5a", weight: "bold", looseness: 0.1 });
scene.add(rod).lintIgnore("overlap");

// Dark knob against the pale wall: the one small high-contrast note up top, which is why it
// gets to be the thing that moves in place.
const knob = sketch.ellipse(184, 136, 21, 13, {
  color: INK,
  weight: "bold",
  looseness: 0.12,
  fill: { color: "#6b4326", style: "solid" },
}, 18);
scene.add(knob);

// A C-handle off the right side. Smooth here, unlike the body — a bent steel loop really is a
// curve, and it keeps the press from reading as a plain rectangle.
const handle = sketch.stroke(
  [
    [230, 234],
    [274, 248],
    [276, 304],
    [232, 320],
  ],
  { color: "#6b4326", weight: "bold", looseness: 0.14 }
);
scene.add(handle);

// --- The mug: same brew, smaller, and a warmer glaze so the two vessels don't read as one
// grey set. Tapered, which is what tells a mug from a tin can at thumbnail size.
const mug = sketch.loop(
  [
    [292, 300],
    [378, 300],
    [370, 398],
    [302, 398],
  ],
  {
    color: "#7a3520",
    weight: "bold",
    looseness: 0.12,
    fill: { color: sketch.shade(GLAZE, { from: "top", amount: 0.3 }), style: "solid" },
    smooth: false,
  }
);
scene.add(mug);

// The rim is its own ellipse sitting proud of the body's flat top edge — we are a little
// above the mug, so the far lip curves up. Skipping it left the coffee reading as a dark
// blob balanced on a block.
const rim = sketch.ellipse(335, 300, 44, 13, {
  color: "#7a3520",
  weight: "bold",
  looseness: 0.06,
  fill: { color: "#f0b183", style: "solid" },
}, 24);
scene.add(rim).lintIgnore("overlap");

// Same colour for stroke and fill: a second dark outline this close to the rim's own outline
// read as one fuzzy band rather than coffee sitting inside a glazed lip.
const surface = sketch.ellipse(335, 301, 31, 7, {
  color: "#3d2415",
  weight: "light",
  looseness: 0.06,
  fill: { color: "#3d2415", style: "solid" },
}, 24);
scene.add(surface).lintIgnore("overlap");

const mugHandle = sketch.stroke(
  [
    [378, 318],
    [406, 330],
    [404, 358],
    [376, 368],
  ],
  { color: "#7a3520", weight: "bold", looseness: 0.14 }
);
scene.add(mugHandle);

// One pale stripe down the glass, the cheapest possible specular highlight.
const gleam = sketch.stroke([[154, 216], [154, 348]], { color: "#fbf3e3", weight: "confident", looseness: 0.16 });
scene.add(gleam).lintIgnore("overlap");

// Three spilled beans, to give the empty left of the counter line something to do.
const beans = ([
  [66, 384, 14],
  [96, 390, 12],
  [116, 381, 11],
] as [number, number, number][]).map(([x, y, r]) =>
  sketch.ellipse(x, y, r, r * 0.62, { color: "#3b2416", weight: "confident", looseness: 0.18, fill: { color: "#5c3a22", style: "solid" } }, 14)
);
beans.forEach((b) => scene.add(b).lintIgnore("overlap"));

drawIn([glass, brew, screen, collar, base, rod, knob, handle, mug, rim, surface, mugHandle, gleam, ...beans], {
  from: 0.6,
  to: 2.9,
});

// --- The loop. Steam is the event: six wisps, two per third of the window (one off the
// press, one off the mug), so something is always rising without all six moving in lockstep.
// dy is negative because driftOnce takes a screen delta and heat goes up.
function wisp(x: number, y: number) {
  return sketch.stroke(
    [
      [x, y],
      [x - 8, y - 18],
      [x + 7, y - 38],
      [x - 3, y - 54],
    ],
    { color: STEAM, weight: "confident", looseness: 0.3, energy: "calm" }
  );
}

const rise = beats(3);
// x, y, which third of the loop it rises on, sideways wander, how far it climbs. The press
// wisps climb less far than the mug's: they start higher up the frame already, and at a full
// 66px they cleared the knob entirely and read as unrelated marks in the wall.
const wisps: [number, number, number, number, number][] = [
  [138, 178, 0, -9, -44],
  [332, 288, 0, 7, -66],
  [226, 180, 1, 8, -44],
  [306, 292, 1, -8, -66],
  [154, 172, 2, 6, -44],
  [358, 294, 2, 9, -66],
];
for (const [x, y, b, dx, dy] of wisps) {
  const w = wisp(x, y);
  scene.add(w).lintIgnore("overlap");
  // No drawOn: driftOnce owns this node's opacity for the whole timeline, so a reveal
  // scheduled during the intro would only ever be drawn at opacity 0.
  driftOnce(w, dx, dy, rise[b], { ease: "sine.out", peak: 0.85 });
}

// The knob breathing — 4%, about a pixel. Not steam, not a gesture: just the one continuous
// tween that keeps the clip alive from the window's first frame to its last.
pulseScale(knob, 1.04, 2);

export default scene;
