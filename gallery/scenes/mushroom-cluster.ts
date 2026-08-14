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
  [78, 352, 44, 196, 3],
  [108, 348, 130, 184, -2.5],
  [412, 356, 446, 206, -3],
  [432, 360, 398, 222, 2.5],
] as [number, number, number, number, number][]).forEach(([bx, by, tx, ty, deg], i) => {
  const blade = sketch.stroke(
    [
      [bx, by],
      [bx + (tx - bx) * 0.3, by - (by - ty) * 0.55],
      [tx, ty],
    ],
    { color: "#4e6438", weight: "confident", looseness: 0.24, energy: "calm" }
  );
  scene.add(blade).drawOn({ at: 0.15 + i * 0.14, duration: 0.4 });
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
appearIn(mossMounds, { from: 1.5, to: 1.9, each: 0.35 });

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

  for (let i = 0; i < spots; i++) {
    const t = (i + 1) / (spots + 1);
    const sx = cx + (t - 0.5) * rx * 1.3;
    const sy = capY - ry * (0.62 - Math.abs(t - 0.5) * 0.8);
    g.add(
      sketch.blob(sx, sy, 9, { color: "#e6d3ab", weight: "light", looseness: 0.3, fill: { color: FLESH, style: "solid" } }, 9)
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
  g.stagger(0.09, { at: 1.85 + i * 0.26, duration: 0.34 });
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

// --- The event of the loop: spores letting go and rising. Negative dy, one per beat so the
// drift is a continuous trickle rather than five motes moving in formation, and each restarts
// at its cap while it is fully transparent (see driftOnce in lib.ts).
const sporeBeats = beats(5);
([
  [136, 232, 7, -150, 26],
  [176, 228, 6, -132, -22],
  [244, 288, 6, -118, 20],
  [320, 320, 7, -134, -18],
  [392, 346, 5, -108, 24],
  [278, 300, 6, -124, 30],
] as [number, number, number, number, number][]).forEach(([x, y, r, dy, dx], i) => {
  const spore = sketch.ellipse(x, y, r, r, {
    color: "#6d5f45",
    weight: "light",
    looseness: 0.2,
    fill: { color: "#f6efdb", style: "solid" },
  });
  scene.add(spore).lintIgnore("overlap");
  driftOnce(spore, dx, dy, sporeBeats[i % 5], { ease: "sine.out", peak: 0.85 });
});

export default scene;
