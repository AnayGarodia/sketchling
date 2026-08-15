import { sketch } from "../../src/index.js";
import { appearIn, drawIn, lapAlong, ringPath, swayMove } from "../lib.js";

// A folded paper plane flying two laps of a dashed circuit over a big cropped sun and low hills.

// look: "flat" — a paper plane is nothing but folds, and a fold is a straight line meeting
// another straight line at a hard angle. Every piece of it is smooth: false for the same reason;
// a Catmull-Rom through a wing's three points turns the whole plane into a leaf.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#2a6fae" },
      { offset: 1, color: "#8fc9de" },
    ],
  },
  seed: "paper-plane-loop",
  look: "flat",
});

const NAVY = "#16334f";
const PAPER = "#f8f1de";
const SHADE = "#d6c8a8"; // the underside of the fold — one flat step darker than the paper
const SUN = "#f7d967";

// --- The circuit. A closed ellipse, sitting slightly left of and below centre so the sun has the
// top-right corner to itself. It starts at the TOP, where the tangent is exactly horizontal, so a
// plane authored nose-right needs no starting rotation at all.
const CX = 228;
const CY = 262;
const PATH = ringPath(CX, CY, 146, 122, { steps: 24 });
const START = PATH[0];

// --- Sun, deliberately cropped by the corner rather than floating whole in the sky: a disc that
// runs off the frame reads as scale, where the same disc entirely in frame reads as a coin.
const sun = sketch.ellipse(438, 54, 88, 88, {
  color: "#e8bf3f",
  weight: "bold",
  looseness: 0,
  fill: { color: SUN, style: "solid" },
}, 40);
scene.add(sun).lintIgnore("overlap").drawOn({ at: 0, duration: 1.0 });

// --- Hills. Two flat bands, the nearer one darker, cut off by the bottom of the frame. They give
// the plane something to be above; without them the circuit floats in an empty blue square.
const farHill = sketch.loop(
  [[-20, 480], [-20, 418], [96, 386], [232, 412], [340, 380], [500, 410], [500, 480]],
  { color: "#1d4a6b", weight: "confident", looseness: 0, fill: { color: "#28618a", style: "solid" } }
);
scene.add(farHill).lintIgnore("overlap").drawOn({ at: 0.4, duration: 0.9 });

const nearHill = sketch.loop(
  [[-20, 480], [-20, 452], [120, 424], [286, 450], [420, 424], [500, 444], [500, 480]],
  { color: NAVY, weight: "bold", looseness: 0, fill: { color: "#1b3f5e", style: "solid" } }
);
scene.add(nearHill).lintIgnore("overlap").drawOn({ at: 0.9, duration: 0.9 });

// --- Two clouds, each one closed loop with a bumpy top and a flat base — smooth: true here, the
// one place in the scene that wants a curve.
function cloudPoints(cx: number, cy: number, w: number, h: number): [number, number][] {
  return [
    [cx - w, cy],
    [cx - w * 0.82, cy - h * 0.55],
    [cx - w * 0.34, cy - h * 0.95],
    [cx + w * 0.08, cy - h * 0.68],
    [cx + w * 0.54, cy - h * 0.98],
    [cx + w * 0.88, cy - h * 0.42],
    [cx + w, cy],
  ];
}
const clouds = ([
  [92, 122, 66, 42],
  [330, 94, 54, 34], // drifting across the sun, which is what gives the sky a front and a back
] as [number, number, number, number][]).map(([cx, cy, w, h]) =>
  sketch.loop(cloudPoints(cx, cy, w, h), {
    color: "#bcdcec",
    weight: "confident",
    looseness: 0,
    fill: { color: "#dcf0f8", style: "solid" },
  })
);
clouds.forEach((c) => scene.add(c).lintIgnore("overlap"));
drawIn(clouds, { from: 1.5, to: 2.1, each: 0.4 });
// A slow lateral drift, one pass per loop. Position only, so it can't fight the plane's own path.
clouds.forEach((c, i) => swayMove(c, i === 0 ? 12 : -10, 0, 1));

// --- The dashed trail: the circuit itself, drawn as short arcs so the plane reads as leaving a
// track rather than orbiting an invisible rail. Authored on the same ellipse the plane flies.
const DASHES = 20;
const trail = Array.from({ length: DASHES }, (_, i) => {
  const a0 = (i / DASHES) * Math.PI * 2 - Math.PI / 2;
  const a1 = a0 + (Math.PI * 2 / DASHES) * 0.52; // just over half of each slot, so the gaps read
  const arc: [number, number][] = [0, 0.5, 1].map((t) => {
    const a = a0 + (a1 - a0) * t;
    return [CX + Math.cos(a) * 146, CY + Math.sin(a) * 122] as [number, number];
  });
  return sketch.stroke(arc, { color: "#f6efd8", weight: "bold", looseness: 0 }).lintIgnore("overlap");
});
trail.forEach((d) => scene.add(d));
appearIn(trail, { from: 1.3, to: 2.35, each: 0.3 });

// --- The plane: two folded triangles sharing a nose and a spine, authored nose-right at the
// path's own first point. The lower wing is the darker paper, which is the entire reason a flat
// two-tone plane reads as folded rather than as an arrowhead.
const [PX, PY] = START;
// Sized generously on purpose: the first pass authored a 66px plane and at thumbnail scale it
// read as a speck of grit on the trail rather than as the subject of the picture.
const nose: [number, number] = [PX + 52, PY - 2];
const spine: [number, number] = [PX - 20, PY + 4];
const upper = sketch.loop([nose, [PX - 48, PY - 28], spine], {
  color: NAVY,
  weight: "bold",
  looseness: 0,
  smooth: false,
  fill: { color: PAPER, style: "solid" },
});
const lower = sketch.loop([nose, spine, [PX - 42, PY + 30]], {
  color: NAVY,
  weight: "confident",
  looseness: 0,
  smooth: false,
  fill: { color: SHADE, style: "solid" },
});
const plane = sketch.group([upper, lower]);
scene.add(plane);
drawIn([upper, lower], { from: 2.3, to: 2.85, each: 0.3 });

// The turn is authored as its own linear rotation (see lapAlong's doc comment: autoRotate reads a
// one-sided tangent at a closed path's seam and flips ~22 degrees there). It still needs a pivot
// at the plane's own middle — an unpivoted rotation on this renderer turns about the SVG origin,
// which throws the plane clean out of frame within a few frames of the loop starting.
plane.pivotAt(PX, PY);
lapAlong(plane, PATH, 2, { turn: 360 });

export default scene;
