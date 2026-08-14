import { sketch } from "../../src/index.js";
import { pulseSquash, swayRotate } from "../lib.js";

// A potted fern breathing in low light, its newest frond still wound into a tight crozier.

// Dark ground on purpose: the whole subject is bright new growth, and fresh green only reads
// as *fresh* against something that isn't. A cream backdrop would flatten the fronds into it.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: "#1d2b25",
  seed: "fern-unfurl",
  look: "ink",
});

const INK = "#101d17";
const LEAF = "#87c268";
const STALK = "#4c7a4a";
const NEW = "#c3d97e";
const CLAY = "#c4703f";

type P = [number, number];

// --- The pot goes down first, because every frond above it has to look like it grew OUT of
// something rather than being pasted over it.
const pot = sketch.loop(
  [
    [174, 380],
    [306, 380],
    [290, 452],
    [190, 452],
  ],
  {
    color: INK,
    weight: "bold",
    looseness: 0.16,
    smooth: false,
    fill: { color: sketch.shade(CLAY, { from: "top", amount: 0.34 }), style: "solid" },
  }
);
scene.add(pot).drawOn({ at: 0, duration: 0.85 });

// A separate rim band rather than one silhouette: the shadow line under a thrown lip is what
// makes a trapezoid read as a pot at thumbnail size.
const rim = sketch.loop(
  [
    [160, 358],
    [320, 358],
    [316, 384],
    [164, 384],
  ],
  { color: INK, weight: "bold", looseness: 0.14, smooth: false, fill: { color: "#a4512a", style: "solid" } }
);
scene.add(rim).lintIgnore("overlap").drawOn({ at: 0.6, duration: 0.5 });

// Soil mounded just over the rim, so the stalks vanish into it instead of stopping dead on a
// straight line.
const soil = sketch.loop(
  [
    [176, 362],
    [240, 342],
    [304, 362],
    [300, 372],
    [180, 372],
  ],
  { color: "#241a13", weight: "light", looseness: 0.3, fill: { color: "#37281d", style: "solid" } }
);
scene.add(soil).lintIgnore("overlap").drawOn({ at: 0.9, duration: 0.4 });

// --- A frond is one arched stalk with a pair of leaflets at every step along it. Sampling a
// quadratic curve and reading its own tangent at each step (rather than hand-placing two dozen
// leaves) is what keeps every pair sitting square on the stalk as it bends — the arch plus
// the repeat IS the read of a fern, and hand-placed leaves lose it on the first curve.
function arch(base: P, tip: P, bow: P, steps: number): P[] {
  const cx = (base[0] + tip[0]) / 2 + bow[0];
  const cy = (base[1] + tip[1]) / 2 + bow[1];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [
      u * u * base[0] + 2 * u * t * cx + t * t * tip[0],
      u * u * base[1] + 2 * u * t * cy + t * t * tip[1],
    ] as P;
  });
}

// One leaflet as a four-point lens — base, two shoulders, tip — left smooth so the spline
// rounds it into a leaf instead of a paper dart.
function leaflet(x: number, y: number, ang: number, len: number, wid: number): P[] {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  return [
    [x, y],
    [x + dx * len * 0.55 - dy * wid, y + dy * len * 0.55 + dx * wid],
    [x + dx * len, y + dy * len],
    [x + dx * len * 0.55 + dy * wid, y + dy * len * 0.55 - dx * wid],
  ];
}

function frond(base: P, tip: P, bow: P, pairs: number, leafLen: number) {
  // The last leaflet sits on the tip sample itself — leave even one bare sample past it and the
  // stalk reads as an antenna poking out of the plant.
  const spine = arch(base, tip, bow, pairs);
  const g = sketch.group();
  g.add(sketch.stroke(spine, { color: STALK, weight: "bold", looseness: 0.18, energy: "calm" }));
  for (let i = 1; i <= pairs; i++) {
    const [px, py] = spine[i];
    const [ax, ay] = spine[i - 1];
    const [bx, by] = spine[Math.min(i + 1, pairs)];
    const dir = Math.atan2(by - ay, bx - ax);
    // Leaflets rake forward (65 degrees off the stalk, not 90) and taper toward the tip —
    // dead-perpendicular equal-length leaves read as a fishbone diagram, not a plant.
    const len = leafLen * (1 - 0.5 * (i / (pairs + 1)));
    for (const side of [-1, 1]) {
      g.add(
        sketch.loop(leaflet(px, py, dir + side * 1.12, len, len * 0.27), {
          color: STALK,
          weight: "light",
          looseness: 0.22,
          fill: { color: sketch.shade(LEAF, { from: "top", amount: 0.32 }), style: "solid" },
        }).lintIgnore("overlap")
      );
    }
  }
  return g;
}

// Four grown fronds fanned so no two tips land at the same height — a symmetrical fan reads
// as a decal. `sway` is signed: the negative ones rest on the opposite side of their own
// swing, which is what keeps the plant from breathing as one rigid block.
const fronds: { base: P; tip: P; bow: P; pairs: number; leaf: number; sway: number; n: number }[] = [
  { base: [226, 362], tip: [104, 178], bow: [-42, -26], pairs: 11, leaf: 31, sway: 3, n: 2 },
  { base: [240, 358], tip: [250, 106], bow: [30, -8], pairs: 12, leaf: 28, sway: 2, n: 3 },
  { base: [256, 362], tip: [380, 198], bow: [46, -22], pairs: 11, leaf: 30, sway: -3.4, n: 2 },
  { base: [234, 360], tip: [136, 288], bow: [-16, -50], pairs: 8, leaf: 25, sway: -2.4, n: 3 },
];

fronds.forEach(({ base, tip, bow, pairs, leaf, sway, n }, i) => {
  const g = frond(base, tip, bow, pairs, leaf);
  scene.add(g);
  // One sweep per frond, not one beat per leaflet: a frond is a single gesture of the pen,
  // and 15 separate draw beats would eat the whole reveal budget on one plant.
  g.stagger(0.028, { at: 0.95 + i * 0.32, duration: 0.42 });
  g.pivotAt(base[0], base[1]);
  swayRotate(g, sway, n);
  // A slow lengthwise breath on top of the sway, pivoted at the same base — different axes
  // from the rotation, so the two compose instead of fighting.
  pulseSquash(g, 1, 1.022 + i * 0.004, 2);
});

// --- The crozier: the event of the frame. Stem and coil are two nodes so the coil can nod on
// its own beat against the stem's, the way a fiddlehead bobs on a stalk too thin to hold it.
const CURL: P = [304, 246];
const stem = sketch.stroke(
  [
    [248, 356],
    [262, 316],
    [288, 282],
    [302, 268],
  ],
  { color: STALK, weight: "bold", looseness: 0.2, energy: "calm" }
);

// 1.6 turns of an inward spiral, radius 30 down to 6. Increasing angle winds clockwise on a
// y-down canvas, so it curls in over its own stem rather than away from it.
const coilPts: P[] = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  const a = (100 + t * 576) * (Math.PI / 180);
  const r = 30 - t * 24;
  return [CURL[0] + r * Math.cos(a), CURL[1] + r * Math.sin(a)] as P;
});
const coil = sketch.stroke(coilPts, { color: NEW, weight: "bold", looseness: 0.16, energy: "calm" });

const crozier = sketch.group([stem, coil]);
scene.add(crozier);
stem.drawOn({ at: 2.3, duration: 0.28 });
coil.drawOn({ at: 2.52, duration: 0.44 });

crozier.pivotAt(248, 356);
swayRotate(crozier, 2.6, 3);
coil.pivotAt(302, 268);
swayRotate(coil, -5.5, 2);

export default scene;
