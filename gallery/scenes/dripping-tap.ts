import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, pulseScale, ripple, swayMove } from "../lib.js";

// A brass tap over a porcelain basin, dripping — three drops a cycle, each answered by a ripple.

// A tiled bathroom wall, cool grey-green, so the one warm thing in frame is the brass. The
// background is the wall rather than a flat tint: a vertical falloff is what puts the basin in
// a room instead of on a swatch, for one gradient instead of a stack of band rectangles.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#cfdad9" },
      { offset: 1, color: "#a6b8ba" },
    ],
  },
  seed: "dripping-tap",
  look: "ink",
});

const BRASS = "#c08a2e";
const NOZZLE_X = 234;
const NOZZLE_Y = 228;
const WATER_Y = 322;

// --- Tile grout, first and faintest. Five lines, not a full grid: enough to say "tiled wall"
// at thumbnail size, few enough that they never compete with the tap for attention.
const grout = [
  ...[120, 214].map((y) => sketch.stroke([[16, y], [464, y]], { color: "#b7c8c8", weight: "light", looseness: 0.12 })),
  ...[92, 240, 388].map((x) => sketch.stroke([[x, 34], [x, 286]], { color: "#b7c8c8", weight: "light", looseness: 0.12 })),
];
grout.forEach((g) => scene.add(g));
appearIn(grout, { from: 0, to: 0.5, each: 0.3 });

// --- The pedestal, before the bowl that sits on it, so the bowl's own outline closes over the
// column's top edge instead of a stray horizontal line crossing the sink.
const pedestal = sketch.loop(
  [[208, 414], [272, 414], [288, 476], [192, 476]],
  { color: "#7d9092", weight: "confident", looseness: 0.12, smooth: false, fill: { color: sketch.shade("#dbe5e7", { from: "left", amount: 0.3 }), style: "solid" } }
);
scene.add(pedestal).drawOn({ at: 0.3, duration: 0.6 });

// The bowl: one big silhouette, wide rim narrowing to a rounded base. Shaded from the top so
// the near wall of the basin falls into shadow — a flat porcelain fill reads as a paper cutout.
const bowl = sketch.loop(
  [
    [96, 304], [168, 290], [240, 286], [312, 290], [384, 304],
    [366, 382], [300, 420], [240, 428], [180, 420], [114, 382],
  ],
  { color: "#5c7376", weight: "bold", looseness: 0.16, fill: { color: sketch.shade("#e6eef0", { from: "top", amount: 0.32 }), style: "solid" } }
);
scene.add(bowl).lintIgnore("overlap").drawOn({ at: 0.6, duration: 1.0 });

// Standing water, as a true ellipse rather than a blob: a basin's waterline is the one edge in
// this scene that should read as machined, and blob()'s wobble floor never quite reaches zero.
const water = sketch.ellipse(240, WATER_Y, 104, 27, {
  color: "#2f6068",
  weight: "confident",
  looseness: 0,
  fill: {
    color: { stops: [{ offset: 0, color: "#5fa3ad" }, { offset: 1, color: "#2d6570" }], type: "radial" },
    style: "solid",
  },
}, 26);
scene.add(water).lintIgnore("overlap").drawOn({ at: 1.5, duration: 0.5 });

// --- The tap. Both the run along the wall and the gooseneck are ONE tube: a centre path
// offset to both sides and closed, which is the only way a bent pipe keeps a constant width
// AND a darker outline. A thick stroke would give the width but no edge, and a hand-authored
// outline round a curve is where the pixels go to die.
function tube(path: [number, number][], half: number): [number, number][] {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  path.forEach((p, i) => {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / len) * half;
    const ny = ((b[0] - a[0]) / len) * half;
    left.push([p[0] + nx, p[1] + ny]);
    right.push([p[0] - nx, p[1] - ny]);
  });
  return [...left, ...right.reverse()];
}

const brassStyle = {
  color: "#6b4a12",
  weight: "confident" as const,
  looseness: 0.12,
  fill: { color: sketch.shade(BRASS, { from: "top", amount: 0.38 }), style: "solid" as const },
};

// The flange bolted to the wall — a pipe that just stops at the frame edge reads as unfinished.
const flange = sketch.loop(
  [[80, 128], [104, 128], [104, 176], [80, 176]],
  { ...brassStyle, smooth: false }
);
scene.add(flange).drawOn({ at: 1.85, duration: 0.25 });

const spout = sketch.loop(
  tube([[86, 152], [152, 149], [196, 154], [220, 168], [233, 192], [NOZZLE_X, NOZZLE_Y]], 13),
  brassStyle
);
scene.add(spout).lintIgnore("overlap").drawOn({ at: 1.95, duration: 0.6 });

// A valve on top of the run, with an oval knob: the silhouette that says "tap" rather than
// "pipe". Two shapes, both brass, so it stays one object at a glance.
const stem = sketch.loop(tube([[160, 150], [160, 122]], 7), brassStyle);
scene.add(stem).lintIgnore("overlap").drawOn({ at: 2.2, duration: 0.18 });
const knob = sketch.ellipse(160, 116, 26, 10, { ...brassStyle, weight: "bold" }, 18);
scene.add(knob).lintIgnore("overlap").drawOn({ at: 2.3, duration: 0.22 });

// A towel on a rail, purely as counterweight: the tap loads the whole left half of the frame
// and the eye notices that imbalance long before the linter does. A bar of soap on the rim was
// the first attempt and it read as a plaster floating in the water — there is no flat left on a
// basin rim wide enough to sit an object on convincingly at this scale.
//
// A rail rather than a hook: the towel folded over it hides the middle and leaves both ends
// sticking out, which is the read the eye already knows. A hook was hidden behind the cloth
// almost entirely and left a dark blip that looked like a mistake.
const rail = sketch.stroke([[386, 196], [462, 194]], { color: "#6b4a12", weight: "bold", looseness: 0.12 });
scene.add(rail).drawOn({ at: 2.35, duration: 0.2 });
const towel = sketch.loop(
  [[404, 200], [446, 198], [448, 290], [438, 300], [424, 292], [410, 300], [402, 290]],
  { color: "#7d4234", weight: "confident", looseness: 0.16, fill: { color: sketch.shade("#c9765d", { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(towel).lintIgnore("overlap").drawOn({ at: 2.45, duration: 0.35 });
scene.add(sketch.stroke([[426, 200], [428, 274]], { color: "#a55b48", weight: "light", looseness: 0.2 }).lintIgnore("overlap"))
  .drawOn({ at: 2.62, duration: 0.16 });

// --- Two glints on the water, offset from each other, drifting sideways at different rates so
// the surface is never quite still even between drops.
const glints = [
  sketch.stroke([[178, 314], [214, 310], [244, 313]], { color: "#c9eef2aa", weight: 3, looseness: 0.3 }),
  sketch.stroke([[262, 332], [296, 329]], { color: "#c9eef288", weight: 3, looseness: 0.3 }),
];
glints.forEach((g) => scene.add(g).lintIgnore("overlap"));
drawIn(glints, { from: 2.5, to: 2.8, each: 0.2 });
swayMove(glints[0], 6, 0, 2);
swayMove(glints[1], -5, 0, 1);

// --- A teardrop outline, not a small blob: at 7px across, blob()'s own jitter would eat the
// shape, and a drop is read entirely by its silhouette.
function drop(x: number, y: number, w: number, h: number) {
  return sketch.loop(
    [
      [x, y - h],
      [x + w, y - h * 0.1],
      [x + w * 0.7, y + h * 0.6],
      [x, y + h * 0.85],
      [x - w * 0.7, y + h * 0.6],
      [x - w, y - h * 0.1],
    ],
    { color: "#48808c", weight: "light", looseness: 0.14, fill: { color: "#dcf1f5", style: "solid" } }
  );
}

// The bead still hanging on the nozzle, pivoted at the lip so it swells DOWNWARD out of the
// tap instead of growing in both directions. It is at its fattest mid-beat and at its thinnest
// exactly when the next drop lets go, which is the pinch-off a real tap does.
const bead = drop(NOZZLE_X, NOZZLE_Y + 8, 8, 11);
scene.add(bead).lintIgnore("overlap").drawOn({ at: 2.68, duration: 0.2 });
bead.pivotAt(NOZZLE_X, NOZZLE_Y);
pulseScale(bead, 1.3, 3);

// --- Three drops, one per beat, each falling the whole beat from the lip to the waterline.
// driftOnce fades a drop out over the last quarter of its travel, so it vanishes exactly as it
// arrives — and the ripple below opens a fifth of a second later, which is what reads as one
// becoming the other. The third drop's answer is the FIRST ripple of the next cycle: the
// cause/effect chain runs straight through the seam rather than stopping at it.
const fall = WATER_Y - NOZZLE_Y - 10;
([
  [7, 11],
  [6, 9],
  [8, 12],
] as [number, number][]).forEach(([w, h], i) => {
  const d = drop(NOZZLE_X, NOZZLE_Y + 10, w, h);
  scene.add(d).lintIgnore("overlap");
  driftOnce(d, i === 1 ? -2 : 1, fall, beats(3)[i], { ease: "power1.in" });
});

// Two concentric rings where the drops land, the outer one flatter and fainter. Both are wide
// and shallow rather than round: they have to lie IN the water's own perspective, not on top
// of it as a circle would.
//
// Both are pivoted at their own centre before rippling. Without it, `scaleTo` grows the ring
// about a bbox origin that is NOT the ellipse's centre, and a ring meant to open around the
// impact point instead swims off across the basin as it expands — measured, not guessed.
const rings: [number, number, number, number, string][] = [
  [15, 5, 2.4, 0.65, "#dcf4f7"],
  [31, 10, 2.3, 0.3, "#cbe9ee"],
];
rings.forEach(([rx, ry, to, peak, color]) => {
  // looseness: 0 and a flat 2px weight. A loose ring is fine at authored size, but scaling one
  // up magnifies its wobble along with everything else, and the first pass read as a scribble
  // of foam rather than a ring opening on the water.
  const ring = sketch.ellipse(NOZZLE_X, WATER_Y + 2, rx, ry, { color, weight: 2, looseness: 0 }, 22);
  scene.add(ring).lintIgnore("overlap");
  ring.pivotAt(NOZZLE_X, WATER_Y + 2);
  ripple(ring, to, 3, peak);
});

export default scene;
