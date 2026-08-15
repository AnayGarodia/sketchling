import { sketch } from "../../src/index.js";
import { swayRotate } from "../lib.js";

// A lemon branch hanging in from the top left, nodding under three fruit while its leaves flutter.

// texture: "watercolor" on a pale eucalyptus ground — the wash is what makes citrus rind read as
// rind, and a cool grey-green backdrop is what makes the yellow sing instead of sitting flat.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#e5eeea" },
      { offset: 1, color: "#c2d5d0" },
    ],
  },
  seed: "lemon-branch",
  look: "ink",
  texture: "watercolor",
});

const BARK = "#7a5a3c";
const BARK_INK = "#463321";
const LEAF = "#4a7a4e";
const LEAF_INK = "#2a4930";
const RIND = "#f2c341";
const RIND_INK = "#a9741c";

type P = [number, number];

// Where the branch leaves the frame. Everything hangs off this point and the whole assembly
// pivots about it, so it is worth naming rather than repeating.
const ROOT: P = [4, 18];

// --- The branch and its twigs. One long line from the corner plus three side twigs, each
// ending where a fruit or a leaf cluster will hang, so nothing later has to float.
const branch = sketch.stroke(
  [ROOT, [70, 62], [140, 110], [206, 168], [258, 238], [292, 320]],
  { color: BARK, weight: "bold", looseness: 0.22, energy: "calm" }
);
// A second, heavier pass over the first third only. A bough is thick where it leaves the tree and
// thin at the tip, and a stroke has one weight for its whole length — two overlaid strokes are
// the cheapest taper there is, and the join is invisible under a shared colour.
const shoulder = sketch.stroke([ROOT, [70, 62], [140, 110]], {
  color: BARK,
  weight: 9,
  looseness: 0.2,
  energy: "calm",
}).lintIgnore("overlap");
const twigs = [
  sketch.stroke([[140, 110], [188, 100], [230, 112]], { color: BARK, weight: "confident", looseness: 0.24 }),
  sketch.stroke([[206, 168], [248, 180], [284, 172]], { color: BARK, weight: "confident", looseness: 0.24 }),
  sketch.stroke([[258, 238], [302, 254], [338, 246]], { color: BARK, weight: "confident", looseness: 0.24 }),
  sketch.stroke([[292, 320], [330, 340], [366, 334]], { color: BARK, weight: "confident", looseness: 0.24 }),
];

// --- Leaves. A four-point lens with its own midrib: the rib is what stops a filled oval from
// reading as a pea pod, and it costs one stroke.
function leafBlade(x: number, y: number, deg: number, len: number, wid: number): P[] {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  return [
    [x, y],
    [x + dx * len * 0.45 - dy * wid, y + dy * len * 0.45 + dx * wid],
    [x + dx * len, y + dy * len],
    [x + dx * len * 0.45 + dy * wid, y + dy * len * 0.45 - dx * wid],
  ];
}

const leafSpecs: [number, number, number, number, number, number, number][] = [
  // x, y, angle, length, half-width, flutter degrees, beats
  [68, 60, 214, 52, 13, 5, 2],
  [106, 86, 44, 46, 12, -6, 3],
  [120, 98, 108, 48, 12, 4, 3],
  [168, 124, 300, 54, 14, 4.5, 2],
  [190, 100, 274, 44, 11, -5, 3],
  // Hangs down-LEFT, not down-right: at 26 degrees this leaf tucked in behind the first lemon and
  // all that was left of it was a green sliver. It also gives the empty left of the frame something.
  [214, 174, 118, 52, 13, 6, 2],
  [264, 244, 320, 46, 12, -4.5, 3],
  [312, 258, 34, 52, 13, 5.5, 2],
  [352, 336, 300, 48, 12, -5, 2],
];

const leaves = leafSpecs.map(([x, y, deg, len, wid, flutter, n]) => {
  const blade = sketch.loop(leafBlade(x, y, deg, len, wid), {
    color: LEAF_INK,
    weight: "confident",
    looseness: 0.2,
    fill: { color: sketch.shade(LEAF, { from: "top", amount: 0.34 }), style: "solid" },
  }).lintIgnore("overlap");
  const a = (deg * Math.PI) / 180;
  const rib = sketch.stroke(
    [
      [x + Math.cos(a) * 6, y + Math.sin(a) * 6],
      [x + Math.cos(a) * (len - 5), y + Math.sin(a) * (len - 5)],
    ],
    { color: "#376038", weight: "light", looseness: 0.3 }
  ).lintIgnore("overlap");
  const g = sketch.group([blade, rib]);
  // Every leaf turns about the point where it joins the wood, and no two share a rate — leaves
  // fluttering in lockstep read as one cut-out sheet of foliage rocking.
  g.pivotAt(x, y);
  swayRotate(g, flutter, n);
  return { g, blade, rib };
});

// --- The lemons. An ovoid with both ends drawn out to a point, which is the whole difference
// between a lemon and an egg; the little nib on the far end does the rest.
function lemonBody(cx: number, cy: number, rx: number, ry: number, tiltDeg: number): P[] {
  const t = (tiltDeg * Math.PI) / 180;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  return Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const px = rx * Math.cos(a) * (1 + 0.08 * Math.abs(Math.cos(a)));
    const py = ry * Math.sin(a) * (1 - 0.26 * Math.cos(a) ** 4);
    return [cx + px * ct - py * st, cy + px * st + py * ct] as P;
  });
}

const lemonSpecs: [number, number, number, number, number, number, number][] = [
  // stalk from (sx, sy), fruit centre (cx, cy), radii, tilt
  [230, 112, 236, 160, 27, 22, 76],
  [284, 172, 292, 224, 31, 25, 84],
  [330, 340, 338, 388, 28, 23, 70],
];

const lemons = lemonSpecs.map(([sx, sy, cx, cy, rx, ry, tilt]) => {
  const stalk = sketch.stroke([[sx, sy], [(sx + cx) / 2, (sy + cy) / 2 - 4], [cx, cy - ry + 4]], {
    color: BARK_INK,
    weight: "confident",
    looseness: 0.26,
  }).lintIgnore("overlap");
  const body = sketch.loop(lemonBody(cx, cy, rx, ry, tilt), {
    color: RIND_INK,
    weight: "bold",
    looseness: 0.16,
    fill: { color: sketch.shade(RIND, { from: "top", amount: 0.34 }), style: "solid" },
  }).lintIgnore("overlap");
  const t = (tilt * Math.PI) / 180;
  const nib = sketch.loop(
    [
      [cx + Math.cos(t) * (rx - 2) - Math.sin(t) * 6, cy + Math.sin(t) * (rx - 2) + Math.cos(t) * 6],
      [cx + Math.cos(t) * (rx + 8), cy + Math.sin(t) * (rx + 8)],
      [cx + Math.cos(t) * (rx - 2) + Math.sin(t) * 6, cy + Math.sin(t) * (rx - 2) - Math.cos(t) * 6],
    ],
    { color: RIND_INK, weight: "confident", looseness: 0.2, fill: { color: "#e8b32e", style: "solid" } }
  ).lintIgnore("overlap");
  return { stalk, body, nib };
});

// --- One group for the whole branch, pivoted at the frame edge: a bough loaded with fruit bends
// from where it is joined to the tree, not around the middle of its own bounding box. 1.8 degrees
// is nothing at the shoulder and about nine pixels at the far lemon, which is what weight looks
// like — a bigger angle immediately reads as a windy day instead of a heavy branch.
const bough = sketch.group([
  shoulder,
  branch,
  ...twigs,
  ...leaves.map((l) => l.g),
  ...lemons.flatMap((l) => [l.stalk, l.body, l.nib]),
]);
scene.add(bough);
bough.pivotAt(ROOT[0], ROOT[1]);
swayRotate(bough, 1.8, 2);

// --- Reveal: wood, then foliage, then fruit — the order a hand would actually draw it in, and
// the order that keeps each thing landing on something already there. Everything is budgeted to
// finish before 3.0s, or the loop's first frame catches a half-drawn lemon.
shoulder.drawOn({ at: 0, duration: 0.5 });
branch.drawOn({ at: 0.15, duration: 0.95 });
twigs.forEach((t, i) => t.drawOn({ at: 0.9 + i * 0.16, duration: 0.32 }));

leaves.forEach(({ blade, rib }, i) => {
  blade.drawOn({ at: 1.35 + i * 0.14, duration: 0.28 });
  rib.drawOn({ at: 1.47 + i * 0.14, duration: 0.18 });
});

lemons.forEach(({ stalk, body, nib }, i) => {
  stalk.drawOn({ at: 2.0 + i * 0.2, duration: 0.16 });
  body.drawOn({ at: 2.14 + i * 0.2, duration: 0.36 });
  nib.drawOn({ at: 2.48 + i * 0.2, duration: 0.14 });
});

export default scene;
