import { sketch } from "../../src/index.js";
import { beats, drawIn, driftOnce, pulseFade, pulseScale, pulseSquash, swayRotate } from "../lib.js";

// A single candle burning in a brass stick on a dark table, wax run down its side, sparks rising.

// A radial background instead of a vertical one: the subject is a point light source, so the
// frame itself should fall off from the middle outward. Everything here is a value problem —
// there are really only two colours in this scene, "lit" and "not", and the whole atmosphere
// lives in how fast one becomes the other.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#3d2717" },
      { offset: 0.5, color: "#1b110a" },
      { offset: 1, color: "#090605" },
    ],
    type: "radial",
  },
  seed: "candle-flame",
  look: "ink",
  texture: "grain",
});

const WAX_LINE = "#5a3a1c";
const BRASS_LINE = "#3a2410";
const BRASS = "#c4933f";

const FLAME_BASE = 206; // the wick — the flame both leans and swells from exactly here

// --- Table: dark, and lighter along its far edge where the candlelight actually reaches it.
const table = sketch.loop(
  [
    [0, 396],
    [480, 396],
    [480, 480],
    [0, 480],
  ],
  {
    color: "#100a06",
    weight: "bold",
    looseness: 0.14,
    fill: { color: { stops: [{ offset: 0, color: "#33220f" }, { offset: 1, color: "#120c08" }] }, style: "solid" },
    smooth: false,
  }
);
scene.add(table).drawOn({ at: 0, duration: 0.8 });

// --- The pool of light thrown onto the table, and the halo in the air behind the flame. Both are
// one radial gradient falling to a fully transparent stop; a stack of flat ellipses at
// decreasing alpha gives visible rings exactly where a candle needs none.
const pool = sketch.ellipse(240, 412, 176, 42, {
  color: "#00000000",
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#ff9a3a70" },
        { offset: 0.5, color: "#ff8c2030" },
        { offset: 1, color: "#ff8c2000" },
      ],
      type: "radial",
    },
    style: "solid",
  },
});
scene.add(pool).lintIgnore("overlap");

const glow = sketch.ellipse(240, 210, 122, 142, {
  color: "#00000000",
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#ffb04a5e" },
        { offset: 0.45, color: "#ff8c2028" },
        { offset: 1, color: "#ff8c2000" },
      ],
      type: "radial",
    },
    style: "solid",
  },
});
scene.add(glow).lintIgnore("overlap");

// --- Brass stick, bottom up: foot, stem, knop, cup. Four small pieces rather than one
// silhouette, because a candlestick is read entirely by the rhythm of its bulges.
const foot = sketch.ellipse(240, 418, 58, 15, {
  color: BRASS_LINE,
  weight: "bold",
  looseness: 0.1,
  fill: { color: sketch.shade(BRASS, { from: "top", amount: 0.34 }), style: "solid" },
}, 22);
scene.add(foot).lintIgnore("overlap");

const stem = sketch.loop(
  [
    [228, 366],
    [252, 366],
    [258, 412],
    [222, 412],
  ],
  { color: BRASS_LINE, weight: "bold", looseness: 0.1, fill: { color: sketch.shade(BRASS, { from: "top", amount: 0.3 }), style: "solid" }, smooth: false }
);
scene.add(stem).lintIgnore("overlap");

const knop = sketch.ellipse(240, 390, 22, 14, {
  color: BRASS_LINE,
  weight: "bold",
  looseness: 0.1,
  fill: { color: "#cf9c46", style: "solid" },
}, 20);
scene.add(knop).lintIgnore("overlap");

const cup = sketch.loop(
  [
    [216, 348],
    [264, 348],
    [258, 368],
    [222, 368],
  ],
  { color: BRASS_LINE, weight: "bold", looseness: 0.1, fill: { color: sketch.shade(BRASS, { from: "top", amount: 0.3 }), style: "solid" }, smooth: false }
);
scene.add(cup).lintIgnore("overlap");

const pan = sketch.ellipse(240, 348, 34, 9, {
  color: BRASS_LINE,
  weight: "confident",
  looseness: 0.08,
  fill: { color: "#d8a651", style: "solid" },
}, 20);
scene.add(pan).lintIgnore("overlap");

// --- The candle. smooth:false: a cast pillar has straight sides, and a spline through the four
// corners bows it into a sausage. Warm at the top where the flame reaches it, cooler at the foot.
const pillar = sketch.loop(
  [
    [214, 216],
    [266, 216],
    [268, 352],
    [212, 352],
  ],
  {
    color: WAX_LINE,
    weight: "bold",
    looseness: 0.1,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#ffe2a4" },
          { offset: 0.55, color: "#dcb877" },
          { offset: 1, color: "#8d6430" },
        ],
      },
      style: "solid",
    },
    smooth: false,
  }
);
scene.add(pillar).lintIgnore("overlap");

// The melted top, as an ellipse standing proud of the pillar's flat edge — we are slightly above
// the candle, so the far lip of the wax pool curves up.
const melt = sketch.ellipse(240, 216, 27, 9, {
  color: WAX_LINE,
  weight: "confident",
  looseness: 0.08,
  fill: { color: "#fdeec6", style: "solid" },
}, 22);
scene.add(melt).lintIgnore("overlap");

// Two drips, deliberately different lengths — a symmetrical pair of runs reads as decoration
// rather than as wax that got away. They run down the FACE of the pillar and barely clear its
// edge: hung off the sides as lobes instead, which is where this started, they read as the two
// handles of a small vase, not as wax.
const drips = [
  sketch.loop(
    [
      [219, 218],
      [213, 238],
      [210, 266],
      [212, 294],
      [218, 306],
      [224, 288],
      [226, 256],
      [225, 228],
    ],
    { color: "#8a6030", weight: "confident", looseness: 0.14, fill: { color: "#fbeac0", style: "solid" } }
  ),
  sketch.loop(
    [
      [259, 220],
      [253, 236],
      [251, 256],
      [256, 272],
      [261, 254],
      [263, 232],
    ],
    { color: "#8a6030", weight: "confident", looseness: 0.14, fill: { color: "#f6dfae", style: "solid" } }
  ),
];
drips.forEach((d) => scene.add(d).lintIgnore("overlap"));

const wick = sketch.stroke([[240, 214], [239, 200]], { color: "#2b1b0e", weight: "bold", looseness: 0.14 });
scene.add(wick).lintIgnore("overlap");

// --- The flame: a teardrop with a radial gradient, white-hot in the middle and falling to a
// deep orange at the edge, plus one smaller near-white core inside it. Both live in a group so
// the sway and the flicker move them as one body of gas.
const outer = sketch.loop(
  [
    [240, 138],
    [251, 164],
    [254, 184],
    [246, 204],
    [234, 204],
    [226, 184],
    [229, 164],
  ],
  {
    color: "#ff9a3a",
    weight: "light",
    looseness: 0.12,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#fff8d8" },
          { offset: 0.45, color: "#ffc247" },
          { offset: 1, color: "#e2571a" },
        ],
        type: "radial",
      },
      style: "solid",
    },
  }
);
const core = sketch.loop(
  [
    [240, 160],
    [246, 178],
    [242, 196],
    [236, 196],
    [233, 178],
    [238, 168],
  ],
  { color: "#fff9e4", weight: "light", looseness: 0.1, fill: { color: "#fffbee", style: "solid" } }
);
const flame = sketch.group([outer, core.lintIgnore("overlap")]);
scene.add(flame);

// drawOn everywhere, never appear: drawOn is a mask wipe and leaves opacity alone, so the reveal
// can't fight the pulseFade that owns the glow and the pool across the loop window.
drawIn([pool, glow, foot, stem, knop, cup, pan, pillar, melt, ...drips, wick, outer, core], {
  from: 0.5,
  to: 2.7,
});

// --- The loop. The flame is the event, and it does two separate things at once: it leans, four
// times across the window, and it swells on its own faster count of five. Rotation and scale are
// different properties, so the two compose instead of fighting — and pivoting both at the wick
// is what makes the flame lean and grow out of the candle rather than about its own waistline.
flame.pivotAt(240, FLAME_BASE);
swayRotate(flame, 4, 4);
pulseSquash(flame, 1.05, 1.11, 5);

// The glow breathes on a third count again, so it is never quite in step with the flame it comes
// from — a light that pulses in perfect lockstep with its own source reads as a single flashing
// object rather than as heat filling a room.
pulseScale(glow, 1.07, 3);
pulseFade(glow, 0.95, 0.74, 3);
pulseFade(pool, 0.92, 0.76, 3);

// --- Two sparks off the tip, one per half of the window, so one is always on its way up. dy is
// negative because driftOnce takes a screen delta and embers go up.
const spark = (x: number, y: number) =>
  sketch.loop(
    [
      [x, y - 7],
      [x + 4, y],
      [x + 2, y + 6],
      [x - 2, y + 6],
      [x - 4, y],
    ],
    { color: "#ffb347", weight: "light", looseness: 0.2, fill: { color: "#ffd98a", style: "solid" } }
  );

const half = beats(2);
([
  [231, 130, -11, 0],
  [250, 124, 9, 1],
] as [number, number, number, number][]).forEach(([x, y, dx, b]) => {
  const s = spark(x, y);
  scene.add(s).lintIgnore("overlap");
  // No drawOn: driftOnce owns this node's opacity for the whole timeline.
  driftOnce(s, dx, -92, half[b], { ease: "sine.out", peak: 0.9 });
});

export default scene;
