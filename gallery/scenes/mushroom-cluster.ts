import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, pulseSquash, swayRotate } from "../lib.js";

// Four red-capped mushrooms of different heights on a mossy fallen log, letting spores go.

// texture: "grain" over a pale misty ground — the tooth it puts on the paper is what makes a
// damp forest floor read as damp rather than as clean vector shapes on cream.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#e2d9bf" },
      { offset: 0.6, color: "#cfc3a4" },
      { offset: 1, color: "#b6a988" },
    ],
  },
  seed: "mushroom-cluster",
  look: "ink",
  texture: "grain",
});

const INK = "#3a2a1e";
const CAP_INK = "#5c2a1d";
const CAP = "#b34a33";
const CAP_WARM = "#c9793a";
const FLESH = "#f2e6cb";
const MOSS = "#6f9e4e";
const BARK = "#7a5133";

type P = [number, number];

// --- Forest floor behind the log, so the log is lying ON something. Kept as one dark mass with
// no detail: every line spent down here competes with the mushrooms. Cool and grey rather than
// another brown — the first draft's warm earth welded itself to the log into one loaf shape.
const floorNode = sketch.loop(
  [
    [0, 414],
    [120, 402],
    [268, 408],
    [400, 398],
    [480, 408],
    [480, 480],
    [0, 480],
  ],
  { color: "#33372a", weight: "light", looseness: 0.3, fill: { color: sketch.shade("#474d38", { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(floorNode).drawOn({ at: 0, duration: 0.7 });

// --- Grass behind the log, drawn before it so the blades come up out from behind the wood.
// They are here for the upper half of the frame: without them the composition is one heavy
// band at the bottom and 150px of nothing above it.
([
  [58, 350, 24, 198, 3],
  [84, 352, 104, 184, -2.5],
  [106, 350, 72, 230, 2],
  [402, 356, 442, 200, -3],
  [426, 358, 396, 214, 2.5],
  [446, 362, 468, 238, -2],
] as [number, number, number, number, number][]).forEach(([bx, by, tx, ty, deg], i) => {
  const blade = sketch.stroke(
    [
      [bx, by],
      [bx + (tx - bx) * 0.3, by - (by - ty) * 0.55],
      [tx, ty],
    ],
    { color: "#46603a", weight: "bold", looseness: 0.24, energy: "calm" }
  );
  // Blades crossing each other IS the clump — the overlap warning here is the effect, not a bug.
  scene.add(blade).lintIgnore("overlap").drawOn({ at: 0.15 + i * 0.1, duration: 0.35 });
  blade.pivotAt(bx, by);
  swayRotate(blade, deg, i % 2 === 0 ? 2 : 3);
});

// --- The log. One long slab across the lower third: a horizontal mass is what gives four
// vertical mushrooms something to be vertical against.
const log = sketch.loop(
  [
    [58, 356],
    [150, 346],
    [250, 344],
    [344, 350],
    [424, 360],
    [424, 400],
    [344, 410],
    [250, 412],
    [150, 408],
    [58, 396],
  ],
  { color: INK, weight: "bold", looseness: 0.2, fill: { color: sketch.shade(BARK, { from: "top", amount: 0.36 }), style: "solid" } }
);
scene.add(log).drawOn({ at: 0.4, duration: 0.9 });

// The sawn end, facing us — the one piece of information that says "log" instead of "brown
// bar". Two rings inside it, no more; growth rings at this scale turn into a smudge.
const endFace = sketch.ellipse(58, 376, 15, 22, {
  color: INK,
  weight: "confident",
  looseness: 0.24,
  fill: { color: "#c39a63", style: "solid" },
});
scene.add(endFace).lintIgnore("overlap").drawOn({ at: 1.15, duration: 0.35 });
scene.add(
  sketch.ellipse(58, 376, 8, 12, { color: "#8a6438", weight: "light", looseness: 0.3 })
).lintIgnore("overlap").drawOn({ at: 1.35, duration: 0.2 });

// Two bark lines along the length, following the log's own sag.
const barkLines = [
  sketch.stroke([[80, 386], [190, 394], [300, 396], [406, 388]], { color: "#4e3320", weight: "light", looseness: 0.35 }),
  sketch.stroke([[96, 368], [200, 362], [310, 364], [400, 372]], { color: "#4e3320", weight: "light", looseness: 0.35 }),
];
barkLines.forEach((b) => scene.add(b).lintIgnore("overlap"));
drawIn(barkLines, { from: 1.3, to: 1.7, each: 0.3 });

// --- Moss along the top of the log: overlapping mounds rather than one outline, because moss
// is a texture of many small humps and a single blob of green reads as spilled paint.
const mossMounds = ([
  [94, 348, 20],
  [130, 342, 16],
  [212, 340, 19],
  [248, 345, 14],
  [350, 348, 18],
  [388, 356, 13],
] as [number, number, number][]).map(([x, y, r]) =>
  sketch.blob(x, y, r, {
    color: "#3d5c2d",
    weight: "light",
    looseness: 0.42,
    fill: { color: sketch.shade(MOSS, { from: "top", amount: 0.3 }), style: "solid" },
  }, 11).lintIgnore("overlap")
);
mossMounds.forEach((m) => scene.add(m));
appearIn(mossMounds, { from: 1.25, to: 1.65, each: 0.35 });

// --- A mushroom is four shapes: a dark underside, a stem, the cap over both, and spots. The
// underside goes down FIRST and slightly low, so the cap covering its top half leaves exactly
// the dark crescent of gills that tells you you're looking up under a cap.
function mushroom(cx: number, capY: number, rx: number, ry: number, baseY: number, capColor: string, spots: number) {
  const g = sketch.group();
  g.add(
    sketch.ellipse(cx, capY + ry * 0.16, rx * 0.8, ry * 0.3, {
      color: INK,
      weight: "light",
      looseness: 0.25,
      fill: { color: "#95513a", style: "solid" },
    }).lintIgnore("overlap")
  );

  const w = Math.max(9, rx * 0.32);
  g.add(
    sketch.loop(
      [
        [cx - w, capY + ry * 0.1],
        [cx - w * 1.45, (capY + baseY) / 2],
        [cx - w * 1.6, baseY],
        [cx + w * 1.6, baseY],
        [cx + w * 1.45, (capY + baseY) / 2],
        [cx + w, capY + ry * 0.1],
      ],
      { color: INK, weight: "confident", looseness: 0.18, fill: { color: sketch.shade(FLESH, { from: "left", amount: 0.3 }), style: "solid" } }
    ).lintIgnore("overlap")
  );

  // Dome: half an ellipse swept left-over-the-top-to-right, closed with a slightly convex
  // skirt so the cap has a lip instead of a ruler-straight bottom edge.
  const dome: P[] = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI + (i / 12) * Math.PI;
    return [cx + rx * Math.cos(a), capY + ry * Math.sin(a)] as P;
  });
  dome.push([cx + rx * 0.55, capY + ry * 0.2], [cx, capY + ry * 0.28], [cx - rx * 0.55, capY + ry * 0.2]);
  const cap = sketch.loop(dome, {
    // A dark-red outline, not the scene ink: at bold weight a near-black edge on a red dome
    // reads as burnt crust rather than as the rolled rim of a cap.
    color: CAP_INK,
    weight: "confident",
    looseness: 0.16,
    fill: { color: sketch.shade(capColor, { from: "top", amount: 0.38 }), style: "solid" },
  });
  g.add(cap.lintIgnore("overlap"));

  // Spots spread most of the dome's width and drop with it toward the rim, so they sit ON a
  // curved surface — bunched in the middle they read as one white smear instead.
  for (let i = 0; i < spots; i++) {
    const t = (i + 1) / (spots + 1);
    const sx = cx + (t - 0.5) * rx * 1.55;
    const sy = capY - ry * (0.58 - Math.abs(t - 0.5) * 1.1);
    g.add(
      sketch.blob(sx, sy, 9, { color: "#dcc79c", weight: "light", looseness: 0.3, fill: { color: FLESH, style: "solid" } }, 9)
        .lintIgnore("overlap")
    );
  }
  return { g, cap, capBottom: capY + ry * 0.2 };
}

// Four heights, ordered tall-short-mid-tiny across the log rather than as a staircase: a
// stepped row reads as a chart, an uneven family reads as a cluster that grew there.
const shrooms: { cx: number; capY: number; rx: number; ry: number; base: number; color: string; spots: number; sway: number; n: number }[] = [
  { cx: 148, capY: 204, rx: 58, ry: 44, base: 362, color: CAP, spots: 3, sway: 1.8, n: 2 },
  { cx: 240, capY: 262, rx: 42, ry: 32, base: 356, color: CAP_WARM, spots: 2, sway: -2.2, n: 3 },
  { cx: 316, capY: 292, rx: 49, ry: 36, base: 362, color: CAP, spots: 2, sway: 2.4, n: 2 },
  { cx: 390, capY: 324, rx: 28, ry: 21, base: 366, color: CAP_WARM, spots: 0, sway: -3, n: 3 },
];

const capNodes: { node: ReturnType<typeof mushroom>["cap"]; x: number; y: number }[] = [];
shrooms.forEach(({ cx, capY, rx, ry, base, color, spots, sway, n }, i) => {
  const { g, cap, capBottom } = mushroom(cx, capY, rx, ry, base, color, spots);
  scene.add(g);
  // Budget the stagger so the LAST child of the LAST mushroom still finishes before the loop
  // opens: a `stagger` whose tail crosses LOOP_START leaves a half-drawn cap on the loop's
  // first frame with the moss behind it showing through, and the seam misses by that much.
  g.stagger(0.08, { at: 1.7 + i * 0.24, duration: 0.3 });
  // Pivoted where the stem meets the log: a mushroom leans from the wood it is rooted in, and
  // rotating about its own bbox centre would slide the stem off the log.
  g.pivotAt(cx, base);
  swayRotate(g, sway, n);
  capNodes.push({ node: cap, x: cx, y: capBottom });
});

// --- Caps breathing: a wide-and-flat/narrow-and-tall pulse anchored at the cap's own lower
// rim, so the dome swells over a stem that stays put. Different rates per cap, since four caps
// breathing in lockstep reads as one object with four heads.
capNodes.forEach(({ node, x, y }, i) => {
  node.pivotAt(x, y);
  pulseSquash(node, 1.02 + i * 0.006, 0.982, i % 2 === 0 ? 2 : 3);
});

// --- The event of the loop: spores letting go and rising. Negative dy, and each mote flies
// back to its cap during the tail of its own beat while it is fully transparent (driftOnce).
//
// Split across a 3-beat and a 4-beat rhythm rather than all onto one: driftOnce only shows a
// node for the first ~60% of its beat, so eight motes on four beats left a third of the loop
// with an empty sky. Two rhythms overlap into a continuous trickle, and being out of phase is
// what makes it read as spores rather than as a row of bubbles on a conveyor.
const fast = beats(4);
const slow = beats(3);
([
  [130, 240, 8, -152, 26],
  [168, 234, 7, -138, -20],
  [190, 226, 6, -126, 22],
  [232, 292, 7, -122, -18],
  [256, 286, 6, -134, 24],
  [300, 322, 7, -128, -22],
  [330, 318, 6, -116, 20],
  [392, 348, 6, -108, 26],
] as [number, number, number, number, number][]).forEach(([x, y, r, dy, dx], i) => {
  // A pale rim, not the scene ink: a dark ring around a 7px disc reads as a soap bubble.
  const spore = sketch.ellipse(x, y, r, r, {
    color: "#a89877",
    weight: "light",
    looseness: 0.2,
    fill: { color: "#f8f2e0", style: "solid" },
  });
  scene.add(spore).lintIgnore("overlap");
  const beat = i % 2 === 0 ? fast[(i / 2) % 4] : slow[((i - 1) / 2) % 3];
  driftOnce(spore, dx, dy, beat, { ease: "sine.out", peak: 0.9 });
});

export default scene;
