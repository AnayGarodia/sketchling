import { sketch } from "../../src/index.js";
import { appearIn, drawIn, fallLoop, swayRotate } from "../lib.js";

// A vermilion crab on wet sand, claws snapping alternately and eye stalks swivelling as it shuffles.

// look: "flat" — a crab is a graphic animal, all hard plates and symmetry, and the crisp
// ligne-claire register suits it far better than a woolly ink line. Every blob and loop in here
// is looseness: 0 for the same reason: a shell should not look hand-wobbled.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#8fa8a3" },
      { offset: 0.35, color: "#bda884" },
      { offset: 1, color: "#dcc79e" },
    ],
  },
  seed: "crab-sidestep",
  look: "flat",
});

const INK = "#3a2118";
const SHELL = "#e0563a";
const CLAW = "#ee7048";
const SAND_LINE = "#b39f77";

// --- The receding waterline across the top, then the sand's own ripples: the crab is on WET
// sand, and the only way to say that is to put the water in frame.
const water = sketch.loop(
  [[0, 0], [480, 0], [480, 72], [400, 84], [320, 68], [240, 82], [160, 66], [80, 78], [0, 64]],
  { color: "#7d9a97", weight: "confident", looseness: 0, fill: { color: "#b7cec9", style: "solid" } }
);
scene.add(water).drawOn({ at: 0, duration: 0.8 });
const foam = sketch.stroke([[0, 76], [96, 92], [204, 78], [308, 92], [412, 80], [480, 90]], {
  color: "#f2f8f6", weight: "bold", looseness: 0,
});
scene.add(foam).lintIgnore("overlap").drawOn({ at: 0.5, duration: 0.5 });

const ripples = [
  sketch.stroke([[24, 148], [140, 138], [260, 150], [380, 140], [458, 150]], { color: SAND_LINE, weight: "light", looseness: 0 }),
  sketch.stroke([[16, 200], [120, 212], [252, 200], [368, 212], [464, 202]], { color: SAND_LINE, weight: "light", looseness: 0 }),
  sketch.stroke([[30, 414], [150, 402], [280, 416], [400, 404], [462, 414]], { color: SAND_LINE, weight: "light", looseness: 0 }),
  sketch.stroke([[20, 456], [148, 466], [286, 452], [412, 464], [468, 454]], { color: SAND_LINE, weight: "light", looseness: 0 }),
];
ripples.forEach((r) => scene.add(r));
appearIn(ripples, { from: 0.4, to: 1.1, each: 0.35 });

// --- Pebbles and a scallop shell, both static. They exist to give the crab a scale reference —
// on featureless sand nothing tells you whether it is two inches across or two feet.
const pebbles = [
  sketch.blob(96, 424, 20, { color: "#6f7c82", weight: "confident", looseness: 0, fill: { color: sketch.shade("#97a4aa", { from: "top", amount: 0.3 }), style: "solid" } }, 10),
  sketch.blob(140, 442, 14, { color: "#6f7c82", weight: "confident", looseness: 0, fill: { color: sketch.shade("#8b979d", { from: "top", amount: 0.3 }), style: "solid" } }, 9),
  sketch.blob(430, 434, 17, { color: "#6f7c82", weight: "confident", looseness: 0, fill: { color: sketch.shade("#9daaaf", { from: "top", amount: 0.3 }), style: "solid" } }, 10),
];
pebbles.forEach((p) => scene.add(p));

const shell = sketch.loop(
  [[336, 428], [344, 398], [372, 382], [400, 396], [408, 426], [372, 436]],
  { color: "#b8846c", weight: "confident", looseness: 0, fill: { color: sketch.shade("#f2ddc2", { from: "top", amount: 0.24 }), style: "solid" } }
);
scene.add(shell).lintIgnore("overlap");
const ribs = ([-16, 0, 16] as number[]).map((dx) =>
  sketch.stroke([[372 + dx * 1.5, 428], [372 + dx, 388]], { color: "#cf9d84", weight: "light", looseness: 0 }).lintIgnore("overlap")
);
ribs.forEach((r) => scene.add(r));
drawIn([...pebbles, shell], { from: 0.9, to: 1.6, each: 0.3 });
appearIn(ribs, { from: 1.5, to: 1.7, each: 0.2 });

// --- The crab. All of it in one group, legs included: at three degrees the shuffle should move
// the legs too, which is what makes a rock in place read as a sidestep rather than a wobble.
const crab = sketch.group();

/** Mirrors a point list about the frame's own centre line, so the right half of a symmetrical
 * animal is authored once. */
const mirror = (pts: [number, number][], flip: boolean): [number, number][] =>
  flip ? pts.map(([x, y]) => [480 - x, y] as [number, number]) : pts;

// Legs first, so the carapace closes over the hips. Three per side, each a two-segment kink —
// a straight line reads as a stick, a single bend reads as a joint.
const legs: ReturnType<typeof sketch.stroke>[] = [];
for (const flip of [false, true]) {
  for (const [hx, hy, kx, ky, tx, ty] of [
    [186, 292, 148, 314, 122, 342],
    [188, 312, 152, 340, 132, 368],
    [196, 328, 168, 358, 154, 386],
  ] as [number, number, number, number, number, number][]) {
    legs.push(
      // A numeric weight rather than "bold": at "bold" six legs read as pencil scratches beside
      // a shell this heavy, and the silhouette lost its spider-ness.
      sketch.stroke(mirror([[hx, hy], [kx, ky], [tx, ty]], flip), {
        color: INK, weight: 6, looseness: 0, smooth: false,
      }).lintIgnore("overlap")
    );
  }
}
legs.forEach((l) => crab.add(l));

// Carapace: wide, flat and slightly heart-shaped, the one silhouette that has to survive at
// thumbnail size.
const carapace = sketch.loop(
  [[164, 300], [176, 268], [210, 250], [240, 246], [270, 250], [304, 268], [316, 300], [300, 332], [240, 346], [180, 332]],
  { color: INK, weight: "bold", looseness: 0, fill: { color: sketch.shade(SHELL, { from: "top", amount: 0.32 }), style: "solid" } }
);
crab.add(carapace.lintIgnore("overlap"));

// Shell markings and a pair of mandibles — four small shapes that turn a red oval into a face.
const marks = [
  sketch.blob(208, 288, 12, { color: "#b03a24", weight: "light", looseness: 0, fill: { color: "#c8452c", style: "solid" } }, 9),
  sketch.blob(272, 288, 12, { color: "#b03a24", weight: "light", looseness: 0, fill: { color: "#c8452c", style: "solid" } }, 9),
  sketch.stroke([[224, 326], [232, 338]], { color: "#8f3020", weight: "confident", looseness: 0 }),
  sketch.stroke([[256, 326], [248, 338]], { color: "#8f3020", weight: "confident", looseness: 0 }),
];
marks.forEach((m) => crab.add(m.lintIgnore("overlap")));

// --- Claws. Each is four shapes: an arm bar, a fixed blade, a movable blade, and the palm
// painted LAST over both blade roots — that is what hides the hinge, so the movable blade can
// swing without a gap opening where it joins.
const blades: ReturnType<typeof sketch.loop>[] = [];
const hinges: [number, number][] = [];
for (const flip of [false, true]) {
  const arm = sketch.loop(mirror([[176, 292], [196, 272], [160, 234], [140, 250]], flip), {
    color: INK, weight: "bold", looseness: 0, fill: { color: sketch.shade("#c9482e", { from: "top", amount: 0.26 }), style: "solid" },
  });
  // Both jaws are 34px-wide wedges whose base edge is PERPENDICULAR to their own axis. A first
  // pass just picked four plausible-looking corners: the bases came out nearly parallel to the
  // axis, the wedges were 10px across on screen, and the pincer read as two antennae poking out
  // of a mitten. A claw is mostly jaw.
  const fixed = sketch.loop(mirror([[142, 192], [128, 224], [71, 188], [75, 177]], flip), {
    color: INK, weight: "confident", looseness: 0, fill: { color: sketch.shade(CLAW, { from: "top", amount: 0.26 }), style: "solid" }, smooth: false,
  });
  const blade = sketch.loop(mirror([[150, 198], [124, 216], [94, 151], [104, 145]], flip), {
    color: INK, weight: "confident", looseness: 0, fill: { color: sketch.shade(CLAW, { from: "top", amount: 0.26 }), style: "solid" }, smooth: false,
  });
  const palm = sketch.loop(mirror([[158, 248], [168, 220], [152, 194], [124, 192], [108, 218], [120, 248]], flip), {
    color: INK, weight: "bold", looseness: 0, fill: { color: sketch.shade(CLAW, { from: "top", amount: 0.3 }), style: "solid" },
  });
  [arm, fixed, blade, palm].forEach((n) => crab.add(n.lintIgnore("overlap")));
  blades.push(blade);
  hinges.push(mirror([[139, 210]], flip)[0]);
}

// --- Eye stalks. Stalk, ball and pupil in one group each, so a swivel carries the eye with the
// stalk instead of leaving the eyeball hanging in the air above it.
const stalks = ([false, true] as boolean[]).map((flip) => {
  const g = sketch.group();
  g.add(sketch.stroke(mirror([[224, 258], [220, 236], [218, 218]], flip), { color: INK, weight: "bold", looseness: 0 }).lintIgnore("overlap"));
  g.add(sketch.ellipse(mirror([[218, 208]], flip)[0][0], 208, 14, 14, { color: INK, weight: "bold", looseness: 0, fill: { color: "#f8f4e8", style: "solid" } }, 18).lintIgnore("overlap"));
  g.add(sketch.ellipse(mirror([[218, 208]], flip)[0][0], 209, 7, 8, { color: "#1a1008", weight: "light", looseness: 0, fill: { color: "#1d1309", style: "solid" } }, 14).lintIgnore("overlap"));
  g.add(sketch.ellipse(mirror([[214, 202]], flip)[0][0], 202, 4, 4, { color: "#ffffff", weight: "light", looseness: 0, fill: { color: "#ffffff", style: "solid" } }, 10).lintIgnore("overlap"));
  crab.add(g);
  return g;
});

scene.add(crab);

// --- Reveal: legs, shell, then claws, then the eyes last. A face landing last is what makes the
// drawing look like it wakes up rather than being assembled.
drawIn(legs, { from: 1.3, to: 2.0, each: 0.16 });
carapace.drawOn({ at: 1.95, duration: 0.5 });
appearIn(marks, { from: 2.3, to: 2.45, each: 0.18 });
drawIn(crab.children.slice(legs.length + 1 + marks.length, legs.length + 1 + marks.length + 8), { from: 2.25, to: 2.75, each: 0.2 });
// A stagger's LAST child starts at `at + step * (n - 1)` and then runs for its own `duration` —
// easy to schedule so the tail of the reveal spills past LOOP_START, which leaves the loop's
// first frame with a half-faded eye and its last frame with a whole one. That is exactly what
// check-loop.sh caught here. Everything lands by 2.9.
stalks.forEach((g, i) => g.stagger(0.06, { at: 2.35 + i * 0.1, duration: 0.26, effect: "appear" }));

// --- The snap: four openings per claw across the window, pivoted at the hinge buried inside the
// palm. This is the event of the loop, so it is the widest and fastest gesture in the frame.
//
// Both claws take the SAME +17, which is what makes them alternate. Rotation is applied in
// screen space but the right claw's geometry is mirrored, so one rotation value closes the left
// jaw and opens the right one. Handing the right claw a negated amplitude — the obvious way to
// get an opposite phase — instead put them in lockstep, both snapping shut together.
blades.forEach((b, i) => {
  b.pivotAt(hinges[i][0], hinges[i][1]);
  swayRotate(b, 17, 4);
});

// The stalks swivel on their own slower count of three, pivoted where each one leaves the shell.
// Opposite amplitudes here — by the mirroring above, that makes them splay apart and come back
// together, which reads unmistakably as "eye stalks" rather than as more of the body's own rock.
stalks.forEach((g, i) => {
  g.pivotAt(mirror([[224, 258]], i === 1)[0][0], 258);
  swayRotate(g, i === 0 ? 11 : -11, 3);
});

// The shuffle: three degrees, pivoted at the sand between the back legs, so the crab tips over
// its own feet and ends exactly where it began — a crab that actually travelled sideways could
// never come back to its own first frame.
crab.pivotAt(240, 350);
swayRotate(crab, 3, 2);

// --- One bubble working its way up out of the wet sand, on its own rhythm. Added after the crab
// but placed clear of it, so it reads against bare sand rather than against a red shell.
const bubble = sketch.blob(104, 398, 11, {
  color: "#8fb4b8", weight: "light", looseness: 0, fill: { color: "#dcf0f2", style: "solid" },
}, 10);
scene.add(bubble).lintIgnore("overlap");
// No drawOn: fallLoop owns this node's opacity for the whole timeline, so a reveal scheduled
// during the intro would only ever be drawn at opacity 0.
fallLoop(bubble, 7, -122, 2, { ease: "sine.out", peak: 0.9 });

export default scene;
