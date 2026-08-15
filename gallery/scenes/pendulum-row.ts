import { sketch } from "../../src/index.js";
import { LOOP_LEN, LOOP_START, appearIn, drawIn, swayRotate } from "../lib.js";
import type { SketchNode } from "../../src/index.js";

// Five bobs hung in a row off one beam, swinging a quarter-cycle apart so the row reads as a wave.

// look: "ink" — a row of five identical things is exactly where a drawn line earns its keep: the
// slight difference between one string and the next is what stops this reading as a printed
// diagram. The palette is the loud part instead: cream on hot sienna, one dark, one brass.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#c2502f" },
      { offset: 1, color: "#7a2716" },
    ],
  },
  seed: "pendulum-row",
  look: "ink",
});

const DARK = "#2a1410";
const CREAM = "#f2e2c4";
const BRASS = "#e8a33d";
const FLOOR = "#631d12";

const RAIL_Y = 104; // underside of the beam: every string starts here and every pivot sits here
const LENGTH = 210; // string length, so bob centres rest at y = 314
const BOB_R = 28;
const ANCHORS = [64, 152, 240, 328, 416]; // pitch 88, against 56px bobs — see SWING for why that fits

function block(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

// --- The frame the row hangs from. Two posts and a beam, drawn first and heavy: five hanging
// things need something visibly strong to hang off, or they read as floating.
const posts = [40, 424].map((x) =>
  sketch.loop(block(x, 40, x + 16, RAIL_Y), {
    color: DARK,
    weight: "confident",
    looseness: 0.12,
    smooth: false,
    fill: { color: DARK, style: "solid" },
  })
);
posts.forEach((p) => scene.add(p).lintIgnore("overlap"));

const beam = sketch.loop(block(40, 74, 440, RAIL_Y), {
  color: DARK,
  weight: "bold",
  looseness: 0.12,
  smooth: false,
  fill: { color: DARK, style: "solid" },
});
scene.add(beam).lintIgnore("overlap");
drawIn([beam, ...posts], { from: 0, to: 0.85, each: 0.4 });

// A brass line along the underside of the beam — the one warm accent up top, and it keeps the
// beam from reading as a hole punched in the background.
scene.add(
  sketch.stroke([[44, RAIL_Y + 4], [436, RAIL_Y + 4]], { color: BRASS, weight: "confident", looseness: 0.15 })
).drawOn({ at: 0.75, duration: 0.5 });

// --- Floor band plus one static mark per bob. The marks don't track the swing (24px of travel
// would barely show it) — they are there to plant the row vertically, since without them the
// whole lower third of the frame was empty sienna.
scene.add(
  sketch.loop(block(0, 430, 480, 480), { color: "#00000000", weight: "light", looseness: 0, smooth: false, fill: { color: FLOOR, style: "solid" } })
).drawOn({ at: 0.4, duration: 0.6 });

// Bars rather than ellipses: an ink-rendered 60x18 ellipse comes out as a hairy little cloud,
// where a flat bar reads as a mark on the floor at any size.
const shadows = ANCHORS.map((x) =>
  sketch.loop(block(x - 32, 441, x + 32, 452), {
    color: "#00000000",
    weight: "light",
    looseness: 0,
    energy: "calm",
    smooth: false,
    fill: { color: "#43100a", style: "solid" },
  }).lintIgnore("overlap")
);
shadows.forEach((s) => scene.add(s));
appearIn(shadows, { from: 1.0, to: 1.5, each: 0.4 });

// A dashed rest line through the bobs' own resting centres, drawn before them so they occlude it.
// It is the diagram note the whole scene is built on: five weights, one baseline, and the swing
// measured against it — and it gives the empty middle of the frame something to be.
const dashes = Array.from({ length: 14 }, (_, i) =>
  sketch.stroke([[24 + i * 31, RAIL_Y + LENGTH], [42 + i * 31, RAIL_Y + LENGTH]], {
    color: "#e79b74",
    weight: "confident",
    looseness: 0.1,
    energy: "calm",
  })
);
dashes.forEach((d) => scene.add(d));
appearIn(dashes, { from: 0.9, to: 1.35, each: 0.3 });

// --- One pendulum per anchor: string plus bob in a single group, pivoted at the anchor. This is
// the scene where the pivot is the whole illusion — left to its own default, a bob rotates about
// the middle of the group's own bounding box (and, on this renderer, about the SVG origin), which
// swings the bob and drags the string's top end off the beam with it.
const strings: SketchNode[] = [];
const bobs: SketchNode[] = [];
const pendulums = ANCHORS.map((ax) => {
  const string = sketch.stroke([[ax, RAIL_Y], [ax, RAIL_Y + LENGTH - BOB_R + 4]], {
    color: DARK,
    weight: "confident",
    looseness: 0.08,
    energy: "calm",
  });
  // energy: "calm" and almost no looseness on a 56px disc: ink's default jitter on something this
  // small stops reading as a drawn line and starts reading as a hairy edge.
  const bob = sketch.ellipse(ax, RAIL_Y + LENGTH, BOB_R, BOB_R, {
    color: DARK,
    weight: "bold",
    looseness: 0.05,
    energy: "calm",
    fill: { color: CREAM, style: "solid" },
  }, 24);
  // One flat cream, no inner disc: a brass centre was the first pass and five of them read as a
  // row of fried eggs — at this size a concentric second colour is a bullseye, not a weight.
  strings.push(string);
  bobs.push(bob);
  const whole = sketch.group([string, bob]);
  scene.add(whole);
  whole.pivotAt(ax, RAIL_Y);
  return whole;
});

// Strings and bobs draw left to right, one hand working down the row.
drawIn(strings.flatMap((s, i) => [s, bobs[i]]), { from: 1.1, to: 2.8 });

// --- The wave. Same amplitude and same two cycles for all five; what makes it travel is that
// each is a quarter-cycle further along than the one to its left. Five bobs at quarter-cycle
// steps is exactly one wavelength across the row, so the two ends are back in phase — and phase
// zero is precisely what lib's swayRotate already does (its half-cycle sine.inOut IS a cosine
// between the extremes), so those two use the helper directly. That is also what gives this loop
// a cyclic helper spanning the whole window rather than only hand-authored keyframes.
//
// Two adjacent bobs are a quarter-cycle apart, so the worst case is sqrt(2) * SWING between them:
// 6.5 degrees over a 210px string is 34px of relative travel against an 88px pitch and 56px bobs,
// which leaves them just clear at the crossing. Any wider and the row reads as a collision.
const SWING = 6.5;
const CYCLES = 2;
const QUARTER = LOOP_LEN / (CYCLES * 4);

/** A phase-shifted sway, keyframed at the quarter-cycle points where the motion is at an extreme
 * or at its fastest. The eases matter: extreme-to-middle accelerates ("sine.in"), middle-to-
 * extreme decelerates ("sine.out"), which together trace the same cosine swayRotate does. Phase
 * comes in whole quarters so every keyframe lands on one of those points — a fractional phase
 * would need a partial first segment, and a partial segment eased as a whole one visibly hitches
 * at the seam. Values come from a 4-entry table, not from cos(), so the last keyframe is the
 * identical float the resting rotation is set to and the seam is exact. */
function waveSway(node: SketchNode, deg: number, cycles: number, phaseQuarters: number): void {
  const table = [-deg, 0, deg, 0];
  const at = (q: number) => table[((q % 4) + 4) % 4];
  node.initial({ rotation: at(phaseQuarters) });
  for (let s = 0; s < cycles * 4; s++) {
    const q = phaseQuarters + s;
    node.rotateTo(at(q + 1), {
      at: LOOP_START + s * QUARTER,
      duration: QUARTER,
      ease: q % 2 === 0 ? "sine.in" : "sine.out",
    });
  }
}

pendulums.forEach((whole, i) => {
  if (i % 4 === 0) swayRotate(whole, SWING, CYCLES); // the two ends: phase 0, a full wavelength apart
  else waveSway(whole, SWING, CYCLES, i);
});

export default scene;
