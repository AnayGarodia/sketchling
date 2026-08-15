import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, swayMove } from "../lib.js";

// Cumulus clouds drifting across a clear sky over a low green horizon, a pair of gulls under the big one.

// look: "flat" — a bright midday sky wants crisp ligne-claire edges, not pen scratch: a
// cumulus reads as volume against blue, and ink's jitter/boil would fray the silhouettes
// that volume depends on. Every blob/ellipse here is looseness: 0 for the same reason.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#4f8fc4" },
      { offset: 0.6, color: "#8fc0dd" },
      { offset: 1, color: "#d3e6ec" },
    ],
  },
  seed: "cloud-parade",
  look: "flat",
});

const CLOUD_LINE = "#7d9fbc";

// --- Land first, and deliberately as a thin strip: the subject is the sky, so the ground gets
// just enough width to sit the clouds ON something and stop them floating in a void.
// The far swell goes in BEFORE the field so the field's own body hides where it closes — a
// closed loop draws its return edge, and a stray horizontal line across a hill's foot reads as
// a mistake rather than as land.
const swell = sketch.loop(
  [[64, 400], [150, 362], [250, 354], [348, 370], [442, 400], [442, 432], [64, 432]],
  { color: "#6c8046", weight: "light", looseness: 0, fill: { color: "#a7bd70", style: "solid" } }
);
scene.add(swell).drawOn({ at: 0.5, duration: 0.7 });

const field = sketch.loop(
  [[0, 394], [130, 391], [250, 396], [370, 390], [480, 393], [480, 480], [0, 480]],
  {
    color: "#5c6f3a",
    weight: "confident",
    looseness: 0,
    fill: { color: sketch.shade("#93ad5e", { from: "top", amount: 0.3 }), style: "solid" },
    smooth: false,
  }
);
scene.add(field).lintIgnore("overlap").drawOn({ at: 0, duration: 0.8 });

// Two hedgerow trees for scale — the clouds only read as huge if something down there is small.
const trees = [
  sketch.blob(128, 384, 20, { color: "#3f5730", weight: "confident", looseness: 0, fill: { color: "#4e6b39", style: "solid" } }, 11),
  sketch.blob(342, 388, 15, { color: "#3f5730", weight: "confident", looseness: 0, fill: { color: "#54723d", style: "solid" } }, 11),
];
trees.forEach((t) => scene.add(t).lintIgnore("overlap"));
drawIn(trees, { from: 1.1, to: 1.6, each: 0.3 });

// --- A cumulus is round bumps on a flat base. Hand-picking crest-and-valley points gives
// cusps — a spline through them reads as a mountain range, not vapour — so the top is the
// upper hull of four overlapping circles instead: every point on the outline is genuinely on
// some circle's arc, which is what makes the scallops read as round.
function cumulus(cx: number, cy: number, w: number, h: number): [number, number][] {
  const bumps: [number, number, number][] = [
    [cx - w * 0.30, cy - h * 0.16, w * 0.21],
    [cx - w * 0.04, cy - h * 0.30, w * 0.27],
    [cx + w * 0.22, cy - h * 0.20, w * 0.22],
    [cx + w * 0.38, cy - h * 0.04, w * 0.14],
  ];
  const top: [number, number][] = [];
  for (const [bx, by, r] of bumps) {
    for (let deg = 176; deg >= 4; deg -= 16) {
      const a = (deg * Math.PI) / 180;
      const p: [number, number] = [bx + Math.cos(a) * r, by - Math.sin(a) * r];
      if (p[1] > cy - 1) continue; // never dip below the cloud's own base line
      const buried = bumps.some(([ox, oy, or]) => (ox !== bx || oy !== by) && Math.hypot(p[0] - ox, p[1] - oy) < or - 0.5);
      if (!buried) top.push(p);
    }
  }
  top.sort((p, q) => p[0] - q[0]);
  // Then back along the base, right to left, sagging a couple of pixels in the middle — a real
  // cumulus base is flat but not ruled.
  return [...top, [cx + w * 0.5, cy], [cx + w * 0.16, cy + 3], [cx - w * 0.2, cy + 3], [cx - w * 0.5, cy]];
}

function cloud(cx: number, cy: number, w: number, h: number, top: string, line: string) {
  return sketch.loop(cumulus(cx, cy, w, h), {
    color: line,
    weight: "confident",
    looseness: 0,
    fill: { color: sketch.shade(top, { from: "top", amount: 0.24 }), style: "solid" },
  });
}

// A pale sun tucked in at the left, mostly as a warm counterweight to all that blue — clouds
// lit from above only make sense if the light is coming from somewhere in frame.
const sun = sketch.ellipse(74, 92, 36, 36, {
  color: "#e8d489",
  weight: "light",
  looseness: 0,
  fill: { color: "#f6e6a4", style: "solid" },
}, 24);
scene.add(sun).lintIgnore("overlap").drawOn({ at: 0.9, duration: 0.5 });

// --- Two resident clouds, drawn on in the reveal and never faded: a sky where EVERY cloud is
// mid-crossing has nothing in it on the loop's first frame (driftOnce rests at opacity 0), so
// these two hold the composition while the passers below carry the drift.
const bigCloud = cloud(198, 178, 214, 92, "#ffffff", CLOUD_LINE);
scene.add(bigCloud).lintIgnore("overlap").drawOn({ at: 1.5, duration: 0.9 });

const highCloud = cloud(360, 106, 138, 56, "#f7fbfd", "#8aabc5");
scene.add(highCloud).drawOn({ at: 2.2, duration: 0.6 });

// They wander instead of holding still — a horizontal-only sway, slow and only a dozen pixels,
// so the sky is never actually static even between passers. Different rates, since two clouds
// moving in lockstep read as one printed backdrop sliding.
swayMove(bigCloud, 13, 0, 1);
swayMove(highCloud, -9, 0, 2);

// --- The gulls: two gliding silhouettes under the big cloud, the smallest marks in the frame
// and the only ones that aren't sky, land or vapour. ONE five-point stroke per bird read as a
// squiggle at this size — every attempt landed somewhere between a cup and an "m" — so each
// wing is its own arc swept up and out from the shoulder, which is the mark the eye already
// knows as "bird" from a distance.
function gullWings(x: number, y: number, s: number) {
  const ink = { color: "#2b3742", weight: "bold" as const, looseness: 0 };
  return [
    sketch.stroke([[x, y], [x - s * 0.42, y - s * 0.44], [x - s, y - s * 0.46]], ink),
    sketch.stroke([[x, y], [x + s * 0.42, y - s * 0.44], [x + s, y - s * 0.46]], ink),
  ];
}
const gulls = sketch.group([...gullWings(198, 226, 23), ...gullWings(254, 248, 15)]);
scene.add(gulls);
gulls.stagger(0.12, { at: 2.5, duration: 0.3 });
swayMove(gulls, 7, -6, 2);

// --- The passers, in the lower half of the sky. Authored at the left edge and drifting most of
// the frame's width: driftOnce fades in over the first 15% of the travel and out over its last
// quarter, which lands both fades near an edge, so a cloud enters and leaves the frame instead
// of materialising in open sky.
//
// The big one takes the whole window at one slow crossing; the small one takes only the back
// half, faster, which is what "lower down, so nearer" looks like. Staggering them this way also
// means the lower lane is occupied for nearly the whole loop with only two clouds in it.
const passers: [number, number, number, number, number, { at: number; dur: number }][] = [
  [80, 304, 136, 56, 318, beats(1)[0]],
  [64, 338, 100, 42, 282, beats(2)[1]],
];
passers.forEach(([cx, cy, w, h, dx, beat]) => {
  const passer = cloud(cx, cy, w, h, "#fbfdfe", "#96b5c9");
  scene.add(passer).lintIgnore("overlap");
  driftOnce(passer, dx, 0, beat, { ease: "sine.inOut", peak: 0.95 });
});

export default scene;
