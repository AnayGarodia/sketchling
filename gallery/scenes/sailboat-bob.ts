import { sketch } from "../../src/index.js";
import { drawIn, swayMove, swayRotate } from "../lib.js";

// A small sailboat rocking on an open sea under a low horizon, two gulls beating overhead.

// look: "flat" — a bright day at sea is all silhouette: a triangular sail against sky, a hull
// against water. Ink's jitter and boil would fray exactly the straight edges that read as
// canvas under tension, so every shape here is looseness: 0 and the sails are smooth: false.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#2b73b0" },
      { offset: 0.42, color: "#79b6d8" },
      { offset: 0.63, color: "#e4ecd8" },
    ],
  },
  seed: "sailboat-bob",
  look: "flat",
});

const HORIZON = 306;
const SEA_LINE = "#215f78";

// --- The sea, as one shape with a vertical gradient: the water has to get darker toward the
// viewer or the horizon reads as a wall rather than a distance. Its top edge IS the horizon,
// so it goes in before anything that sits on it.
const sea = sketch.loop(
  [[0, HORIZON], [480, HORIZON], [480, 480], [0, 480]],
  {
    color: SEA_LINE,
    weight: "confident",
    looseness: 0,
    smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#4a9cb0" }, { offset: 1, color: "#175a75" }] }, style: "solid" },
  }
);
scene.add(sea).drawOn({ at: 0, duration: 0.9 });

// A headland far off to the left — the only thing that gives the sea a scale, and the
// counterweight to the sun up on the right. Kept dark and flat: at this distance it is a
// silhouette, and any interior detail on it would read as a smudge at thumbnail size.
const headland = sketch.loop(
  [[0, HORIZON + 2], [26, 290], [58, 283], [102, 293], [138, HORIZON + 2]],
  { color: "#123a48", weight: "confident", looseness: 0, fill: { color: "#2a5c68", style: "solid" } }
);
scene.add(headland).lintIgnore("overlap").drawOn({ at: 0.7, duration: 0.5 });

// The sun, high and pale rather than white-hot — it lights the scene, it isn't the subject.
const sun = sketch.ellipse(378, 98, 42, 42, {
  color: "#e6c569",
  weight: "light",
  looseness: 0,
  fill: { color: "#f8e7a6", style: "solid" },
}, 26);
scene.add(sun).drawOn({ at: 1.0, duration: 0.4 });

// --- Wave lines: short pale dashes, none of them near the hull, each on its own rhythm. Two
// waves sliding the same distance at the same rate read as one printed backdrop being dragged
// sideways, which is the exact failure a moving sea has to avoid.
const waves: [[number, number][], number, number][] = [
  [[[36, 338], [76, 331], [116, 338]], 13, 1],
  [[[352, 330], [394, 324], [434, 331]], -11, 2],
  [[[58, 392], [120, 383], [180, 392]], 17, 2],
  [[[298, 404], [362, 395], [424, 404]], -15, 1],
  [[[146, 446], [228, 435], [312, 446]], 21, 1],
];
const waveNodes = waves.map(([pts]) =>
  sketch.stroke(pts, { color: "#8fcbd8", weight: 4, looseness: 0 })
);
waveNodes.forEach((w) => scene.add(w));
drawIn(waveNodes, { from: 1.15, to: 1.95 });
waveNodes.forEach((w, i) => swayMove(w, waves[i][1], 0, waves[i][2]));

// --- The boat: one group, so the hull and both sails rock as one object. Everything is
// authored where it sits and the group is never moved into place — a boat assembled at the
// origin and then translated is a boat whose pivot has to be worked out twice.
const boat = sketch.group();
const hull = sketch.loop(
  [[186, 312], [314, 312], [298, 342], [206, 342]],
  {
    color: "#4e1f16",
    weight: "confident",
    looseness: 0,
    smooth: false,
    fill: { color: sketch.shade("#b8452f", { from: "top", amount: 0.32 }), style: "solid" },
  }
);
boat.add(hull);
// The gunwale: one line just inside the top edge, which is all it takes for the hull to read as
// an open boat instead of a solid red wedge.
boat.add(sketch.stroke([[192, 319], [308, 319]], { color: "#6d3022", weight: 3, looseness: 0 }).lintIgnore("overlap"));
boat.add(sketch.stroke([[248, 312], [248, 168]], { color: "#4a3524", weight: 5, looseness: 0 }));

// Both sails are hard triangles — smooth: false. A spline through three points bows the leech
// outward and the sail immediately reads as a limp bag rather than canvas pulling.
// Both feet run down to the deck line rather than stopping short of it: a two-pixel gap
// between a sail and the boat it belongs to is the kind of thing that only shows up once the
// hull starts moving, and then it reads as the sails being pasted on.
const main = sketch.loop(
  [[254, 174], [254, 311], [316, 311]],
  { color: "#8b7a58", weight: "confident", looseness: 0, smooth: false, fill: { color: "#f8f1dd", style: "solid" } }
);
boat.add(main.lintIgnore("overlap"));
const jib = sketch.loop(
  [[242, 200], [242, 311], [194, 311]],
  { color: "#8b7a58", weight: "confident", looseness: 0, smooth: false, fill: { color: "#ebdfc0", style: "solid" } }
);
boat.add(jib.lintIgnore("overlap"));
scene.add(boat);
drawIn(boat.children, { from: 1.7, to: 2.55, each: 0.32 });

// The rock and the lift are two different properties on the same node, so they compose instead
// of fighting: three degrees of roll twice over the loop, and a six-pixel rise three times.
// Pivoted at the waterline, because a hull rolls about where it meets the sea, not about the
// middle of its own sails — pivoting at the group's own centre swings the keel like a pendulum.
boat.pivotAt(250, 338);
swayRotate(boat, 3.5, 2);
swayMove(boat, 0, 6, 3);

// --- Foam at the waterline, drawn AFTER the boat so it crosses in front of the hull. This is
// what sits the boat IN the water: without it the hull floats on top of a flat blue field, and
// it also hides the couple of pixels where the bobbing hull would otherwise show a seam.
const foam = sketch.stroke([[182, 341], [220, 336], [258, 342], [300, 336], [326, 342]], {
  color: "#d6eef2",
  weight: 5,
  looseness: 0,
});
scene.add(foam).lintIgnore("overlap").drawOn({ at: 2.6, duration: 0.3 });

// --- Gulls. Each is two strokes off one shoulder point, not a single squiggle: the wings have
// to be separate nodes to beat at all, and a "bird" at this size IS the two-arc mark.
//
// Each wing rises from the shoulder to a peak and then drops toward the tip, so the pair reads
// as a shallow M. Wings that only rise outward — the obvious way to author them — gave a
// rounded cup, and the first pass put two smiles in the sky. Mirrored phase comes from the sign
// of the sway: a positive turn lifts the left wing and drops the right, so the right wing gets
// the negation and both rise together.
function gull(x: number, y: number, s: number, flaps: number, at: number) {
  const ink = { color: "#22323f", weight: "bold" as const, looseness: 0 };
  const wings = [
    sketch.stroke([[x - s * 0.1, y], [x - s * 0.48, y - s * 0.4], [x - s, y - s * 0.17]], ink),
    sketch.stroke([[x + s * 0.1, y], [x + s * 0.48, y - s * 0.4], [x + s, y - s * 0.17]], ink),
  ];
  // A body between the shoulders, static while the wings work: without it the two arcs float
  // apart at the top of every beat and stop being one animal.
  const body = sketch.ellipse(x, y - s * 0.02, s * 0.22, s * 0.1, { ...ink, weight: "confident", fill: { color: "#22323f", style: "solid" } }, 12);
  scene.add(body).lintIgnore("overlap").drawOn({ at, duration: 0.16 });
  wings.forEach((w, i) => {
    scene.add(w).lintIgnore("overlap").drawOn({ at: at + 0.12 + i * 0.1, duration: 0.2 });
    w.pivotAt(x, y);
    swayRotate(w, i === 0 ? 15 : -15, flaps);
  });
}

// The near gull beats fast; the far one, smaller and higher, beats slower — a distant bird's
// wingbeat reads slower from here, and two birds flapping in lockstep read as one cardboard cutout.
gull(112, 152, 32, 10, 2.3);
gull(176, 104, 21, 6, 2.5);

export default scene;
