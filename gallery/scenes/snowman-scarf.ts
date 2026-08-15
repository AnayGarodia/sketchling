import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, swayRotate } from "../lib.js";

// A three-ball snowman in a red scarf, its loose end flapping while snow comes down past him.

// look: "clay" — a snowman IS three balls somebody packed by hand, which is the one subject where
// stop-motion's own material honesty is the right register rather than a stylistic choice. Its
// ~10fps hold also suits a scene whose fastest moving thing is a scarf in a light breeze.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#5b88b4" },
      { offset: 0.62, color: "#8fb5d2" },
      { offset: 1, color: "#c2d9e7" },
    ],
  },
  seed: "snowman-scarf",
  look: "clay",
});

// power4.inOut on both sways rather than the helpers' default sine: its flat tail dwells at the
// ends of the swing, which is what cloth actually does when a gust turns around, where sine
// carries the same speed through the extremes and reads like a metronome.
const EASE = "power4.inOut";
const SNOW = "#eef5fa";
const RIM = "#6c8aa6";
const COAL = "#23262e";
// Where the scarf leaves the neck. The flapping end pivots here, not at its own middle, which is
// the whole difference between cloth hanging off a snowman and a red stick spinning next to one.
const KNOT: [number, number] = [272, 238];

// --- Ground first: one bank with a shallow crown, shaded from the top so the flat in front of the
// snowman reads as lit and the dip behind him as shadow. A pure white ground under a blue sky has
// no form at all, and the snowman then has nothing to be lighter than.
const ground = sketch.loop(
  [[0, 412], [96, 398], [204, 392], [318, 397], [416, 406], [480, 400], [480, 480], [0, 480]],
  { color: "#8aa6bd", weight: "confident", fill: { color: sketch.shade("#e7f1f8", { from: "top", amount: 0.26 }), style: "solid" } }
);
scene.add(ground).drawOn({ at: 0, duration: 0.8 });

// Two conifers, well out at the edges: they set the scale (a snowman is person-sized, which only
// reads if something else in frame is tree-sized) and they are the only dark mass in the picture,
// so the white of the snow has something to be white against.
const trees = ([
  [58, 292, 1],
  [424, 316, 0.8],
] as [number, number, number][]).map(([x, top, k]) =>
  sketch.loop(
    [
      [x, top],
      [x + 30 * k, top + 62 * k], [x + 17 * k, top + 62 * k],
      [x + 42 * k, top + 108 * k], [x - 42 * k, top + 108 * k],
      [x - 17 * k, top + 62 * k], [x - 30 * k, top + 62 * k],
    ],
    { color: "#16332c", weight: "confident", smooth: false, fill: { color: sketch.shade("#2f5a4b", { from: "left", amount: 0.3 }), style: "solid" } }
  )
);
trees.forEach((t) => scene.add(t).lintIgnore("overlap"));
drawIn(trees, { from: 0.7, to: 1.25, each: 0.4 });

// --- The snowman, all of him in one group so the whole figure can rock as one piece.
//
// ellipse(), after three passes with blob(). blob() looked like the obvious choice for something
// packed by hand, but its wobble floor is about 15% of the radius and does not go away however far
// looseness is turned down — and the clay look draws a clean edge with no sketch jitter over the
// top to disguise it. So at 14 vertices the head came out a hexagonal lump of ice, and at 26 the
// base ball came out a loaf of bread (noise that fine gets averaged by the spline into flat runs).
// The hand-rolled feel comes instead from each ball being its own slightly-off circle — a little
// wider than tall, no two the same ratio — which is closer to what rolling snow actually does.
const man = sketch.group();
const balls = ([
  [240, 372, 78, 72, 30],
  [240, 268, 55, 52, 26],
  [238, 192, 41, 38, 24],
] as [number, number, number, number, number][]).map(([x, y, rx, ry, v]) =>
  sketch.ellipse(x, y, rx, ry, {
    color: RIM,
    weight: "bold",
    looseness: 0,
    fill: { color: sketch.shade(SNOW, { from: "top", amount: 0.3 }), style: "solid" },
  }, v).lintIgnore("overlap")
);
balls.forEach((b) => man.add(b));

// Twig arms: a main branch and one fork each, at different angles. Two identical arms read as a
// signpost, so the right one goes up and the left one hangs.
const twigs = [
  sketch.stroke([[192, 272], [148, 262], [112, 246]], { color: "#63432a", weight: 6 }),
  sketch.stroke([[148, 262], [136, 240]], { color: "#63432a", weight: 4 }),
  sketch.stroke([[290, 264], [340, 250], [374, 222]], { color: "#63432a", weight: 6 }),
  sketch.stroke([[340, 250], [352, 226]], { color: "#63432a", weight: 4 }),
];
twigs.forEach((t) => man.add(t.lintIgnore("overlap")));

// --- The scarf. The band round the neck dips in the middle because it is lying over a round
// shoulder, and it is the only saturated colour in the frame — everything else here is white,
// blue or brown, so the eye goes straight to it and then to whatever it does.
const band = sketch.loop(
  [[198, 226], [240, 236], [282, 222], [286, 244], [240, 256], [196, 246]],
  { color: "#6d1a18", weight: "confident", fill: { color: sketch.shade("#c8342f", { from: "top", amount: 0.32 }), style: "solid" } }
);
man.add(band.lintIgnore("overlap"));

// The loose end, plus its fringe, as their own group: the fringe has to swing WITH the cloth, and
// three separate strokes each given their own copy of the same sway would drift out of step with
// the strip they hang off.
const strip = sketch.loop(
  [[262, 232], [286, 236], [306, 292], [300, 326], [282, 322], [278, 290], [258, 248]],
  { color: "#6d1a18", weight: "confident", fill: { color: sketch.shade("#bd2f2a", { from: "left", amount: 0.3 }), style: "solid" } }
);
const fringe = ([
  [284, 324, 280, 342],
  [292, 325, 292, 344],
  [299, 324, 304, 341],
] as [number, number, number, number][]).map(([x1, y1, x2, y2]) =>
  sketch.stroke([[x1, y1], [x2, y2]], { color: "#a02722", weight: 4 }).lintIgnore("overlap")
);
const tail = sketch.group([strip.lintIgnore("overlap"), ...fringe]);
man.add(tail);

// --- Face and buttons: coal, so near-black, and big enough not to read as dirt on the snow. The
// nose is the only hard-edged shape on the whole figure (smooth: false) — a carrot is a cone, and
// a spline through three points rounds it straight back into another lump of coal.
const eyes = ([[224, 182], [256, 180]] as [number, number][]).map(([x, y]) =>
  sketch.ellipse(x, y, 6, 6, { color: COAL, weight: "light", fill: { color: COAL, style: "solid" } }, 12).lintIgnore("overlap")
);
const nose = sketch.loop(
  [[236, 190], [274, 199], [236, 207]],
  { color: "#8a3d0c", weight: "confident", smooth: false, fill: { color: sketch.shade("#e2751f", { from: "top", amount: 0.3 }), style: "solid" } }
);
const smile = ([[218, 204], [228, 212], [242, 214], [254, 209]] as [number, number][]).map(([x, y]) =>
  sketch.ellipse(x, y, 4.5, 4.5, { color: COAL, weight: "light", fill: { color: COAL, style: "solid" } }, 10).lintIgnore("overlap")
);
const buttons = ([[240, 272], [239, 298]] as [number, number][]).map(([x, y]) =>
  sketch.ellipse(x, y, 7, 7, { color: COAL, weight: "light", fill: { color: "#2b2f38", style: "solid" } }, 12).lintIgnore("overlap")
);
[...eyes, nose, ...smile, ...buttons].forEach((n) => man.add(n));

scene.add(man);

// Reveal in the order somebody actually builds one: bottom ball, middle, head, arms, scarf, face.
drawIn(balls, { from: 1.2, to: 2.15, each: 0.45 });
drawIn(twigs, { from: 2.1, to: 2.45, each: 0.2 });
band.drawOn({ at: 2.4, duration: 0.22 });
tail.stagger(0.06, { at: 2.55, duration: 0.2 });
appearIn([...eyes, nose, ...smile, ...buttons], { from: 2.5, to: 2.8, each: 0.2 });

// --- The two motions. The scarf end is the event: nine degrees, twice, swinging from the knot.
// The figure himself rocks barely more than a degree about the point where he meets the snow —
// any more and 300px of stacked snowball reads as wobbling on a spring instead of settling.
tail.pivotAt(KNOT[0], KNOT[1]);
swayRotate(tail, 9, 2, EASE);
man.pivotAt(240, 440);
swayRotate(man, 1.2, 2, EASE);

// --- A drift banked against his base, drawn AFTER him so it laps over the bottom of the ball and
// he reads as standing IN the snow rather than balanced on top of it. It is not part of his group:
// the snow does not rock when he does.
// Wide enough to run out to where the ground's own crown is, and rimmed with a light line rather
// than a confident one: banked tightly round his base with a strong outline it read as a puddle
// he was standing in.
const drift = sketch.loop(
  [[104, 436], [178, 412], [292, 410], [368, 432], [376, 462], [98, 462]],
  { color: "#a8c0d4", weight: "light", fill: { color: sketch.shade("#f4f9fc", { from: "top", amount: 0.2 }), style: "solid" } }
);
scene.add(drift).lintIgnore("overlap").drawOn({ at: 2.6, duration: 0.3 });

// --- Snow. Eight flakes on five staggered beats, all authored in the sky to the sides of him:
// a white flake crossing a white snowball is invisible, so none of them are given a path over his
// body. driftOnce fades each one out over the last quarter of its fall, which is what lets a
// one-way drop restart from the top without ever being seen to jump back.
//
// Fourteen of them, and on TWO different beat grids on purpose. A flake is only airborne for four
// fifths of its own beat, so a single grid leaves the whole sky empty for a fifth of every beat —
// at 3.6s, nine tenths of the way through the first of five, there was not one flake in frame.
// beats(3) and beats(5) share only the loop's start and end, so their gaps never line up and
// something is always falling. It buys the depth cue for free too: the three-beat flakes are
// smaller and cover less ground per beat, which is what "further away" looks like.
const grids = [beats(3), beats(5)];
([
  [96, 72, 8, 1, 0, 22],
  [148, 128, 6, 0, 2, -16],
  [332, 88, 7, 1, 1, 18],
  [396, 150, 8, 1, 3, -20],
  [64, 210, 6, 0, 1, 15],
  [428, 246, 7, 1, 2, -14],
  [180, 52, 7, 1, 3, 24],
  [300, 168, 6, 0, 0, -18],
  [122, 176, 7, 1, 1, 19],
  [366, 60, 6, 0, 2, -22],
  [246, 74, 7, 1, 4, 16],
  [46, 116, 6, 0, 0, 20],
  [452, 96, 7, 1, 0, -17],
  [206, 122, 6, 0, 1, -15],
] as [number, number, number, number, number, number][]).forEach(([x, y, r, grid, beat, dx]) => {
  const flake = sketch.ellipse(x, y, r, r, { color: "#dcebf6", weight: "light", fill: { color: "#ffffff", style: "solid" } }, 12);
  scene.add(flake).lintIgnore("overlap");
  driftOnce(flake, dx, grid === 1 ? 152 : 112, grids[grid][beat], { ease: "sine.in", peak: 0.95 });
});

export default scene;
