import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, pulseSquash, swayMove } from "../lib.js";

// A tall glass of something fizzy on a table, bubbles climbing two columns to the surface.

// Deliberately the brightest, coolest scene in the gallery: turquoise, cyan and white on a pale
// aqua wall, with one hot coral straw as the only warm note. Nothing here is beige — a fizzy
// drink is lit THROUGH, and a muted palette would drain the one quality it has.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#e4fafb" },
      { offset: 1, color: "#8ed3e4" },
    ],
  },
  seed: "bubble-column",
  look: "ink",
});

const GLASS_LINE = "#2a6b7c";
const SURFACE_Y = 172;

// --- The table, then the shadow, then the glass: the shadow has to be laid down before the
// object that casts it, or it draws over the base and the glass looks like it is sunk into the
// wood. Its top edge is where the glass stands, so it doubles as the horizon here.
const table = sketch.loop(
  [[0, 404], [480, 404], [480, 480], [0, 480]],
  {
    color: "#1f5f74",
    weight: "confident",
    looseness: 0.1,
    smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#4a9db5" }, { offset: 1, color: "#2c7590" }] }, style: "solid" },
  }
);
scene.add(table).drawOn({ at: 0, duration: 0.7 });

const shadow = sketch.ellipse(244, 410, 84, 13, { color: "#1f5f7400", weight: "light", looseness: 0.2, fill: { color: "#1c5a6e55", style: "solid" } }, 22);
scene.add(shadow).lintIgnore("overlap").drawOn({ at: 0.65, duration: 0.35 });

// --- The glass itself: a tapered tumbler, sides straight (smooth: false) because a hand-curved
// wall reads as a vase. The fill is barely-there so the wall behind shows through above the
// drink — that translucency is most of what says "glass" rather than "cup".
const glass = sketch.loop(
  [[172, 124], [308, 124], [292, 404], [188, 404]],
  { color: GLASS_LINE, weight: "confident", looseness: 0.08, smooth: false, fill: { color: "#eafcff55", style: "solid" } }
);
scene.add(glass).lintIgnore("overlap").drawOn({ at: 0.9, duration: 0.9 });

// --- The drink. Its top edge sags in the middle rather than ruling straight across: that sag
// is the near half of the surface seen from slightly above, and without it the liquid reads as
// a flat block of colour poured in behind glass.
//
// smooth: false, and not by preference — a spline through this outline overshoots at the two
// top corners where the sag meets the vertical wall, and the first pass grew a pair of pale
// horns above the waterline that looked like a cat hiding in the drink.
const liquid = sketch.loop(
  [
    [179, SURFACE_Y], [210, SURFACE_Y + 8], [240, SURFACE_Y + 10], [270, SURFACE_Y + 8], [301, SURFACE_Y],
    [291, 398], [189, 398],
  ],
  {
    color: "#12798f",
    weight: "confident",
    looseness: 0.1,
    smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#74f0e2" }, { offset: 1, color: "#0fa2c4" }] }, style: "solid" },
  }
);
scene.add(liquid).lintIgnore("overlap").drawOn({ at: 1.7, duration: 0.6 });

// --- Bubbles. White with a dark teal rim, and none under 9px across: the first pass gave them
// a pale cyan rim and a translucent fill, and at 60% opacity mid-rise they vanished into the
// drink entirely. A bubble is read by its rim, so the rim has to be the darkest line in the
// liquid, not the softest.
//
// ellipse(), not blob(): a bubble is surface tension made visible, i.e. the roundest thing in
// any picture it appears in. blob()'s wobble floor at this radius turned each one into a scrap
// of white popcorn — right size, right contrast, wrong object entirely. And they are all a
// couple of pixels bigger than they need to be, with a confident rim rather than a light one:
// the ink look's line boil re-jitters every path a few times a second, and on a 9px circle that
// jitter is most of the radius, which put the popcorn back even after the geometry was round.
function bubble(x: number, y: number, r: number) {
  const b = sketch.ellipse(x, y, r, r, {
    color: "#0d6d81",
    weight: "confident",
    looseness: 0,
    fill: { color: "#f4ffff", style: "solid" },
  }, 16);
  scene.add(b).lintIgnore("overlap");
  return b;
}

// Bubbles clinging to the inside of the glass — static, drawn on in the reveal and never faded.
// These carry the whole "fizzy" read on their own: every rising bubble is transparent at both
// ends of its beat, so a glass whose entire fizz is in flight is an empty glass for a third of
// the loop (and completely empty on the loop's first frame). A real drink has half its bubbles
// stuck to the wall anyway.
const cling = ([
  [194, 248, 11],
  [206, 206, 10],
  [198, 318, 12],
  [286, 336, 12],
  [278, 370, 10],
  [234, 352, 10],
] as [number, number, number][]).map(([x, y, r]) => bubble(x, y, r));
drawIn(cling, { from: 2.0, to: 2.5, each: 0.16 });

// The risers: all authored at the bottom of the glass where a real drink nucleates them, all on
// top of each other there on purpose, and told apart in flight by size, beat and a few pixels of
// sideways drift. Two columns plus one loner, because bubbles come up from fixed points on the
// glass rather than from everywhere at once.
//
// The rise distance is derived, not eyeballed: driftOnce is fully transparent by 80% of its
// travel, so a bubble told to move exactly to the surface would vanish a third of the way up
// the glass. Overshooting by 1/0.8 puts opacity 0 and the waterline at the same instant, which
// is what reads as popping at the top instead of giving up halfway.
//
// That derivation only holds under a LINEAR ease, which is why these rise at constant speed:
// with sine.out the bubbles had covered 96% of the distance by the time they were 80% through
// their beat, and the overshoot carried them clean out of the drink and up past the rim.
const rise = (y0: number) => 1.25 * (SURFACE_Y + 8 - y0);
const fizz = beats(5);
([
  [214, 382, 16, 0, 5],
  [210, 376, 12, 2, -4],
  [222, 386, 13, 4, 7],
  [266, 384, 15, 1, -6],
  [261, 376, 12, 3, 5],
  [240, 388, 12, 2, 8],
  [275, 382, 12, 0, -5],
  [264, 390, 13, 4, -7],
] as [number, number, number, number, number][]).forEach(([x, y, r, beat, dx]) => {
  driftOnce(bubble(x, y, r), dx, rise(y), fizz[beat]);
});

// --- The surface, as one ellipse laid over the liquid's own sagging edge, squashing vertically
// four times across the loop. Vertical only: a surface that also breathed sideways would pull
// away from the glass wall, and the wobble has to stay pinned to the inside of the tumbler.
const surface = sketch.ellipse(240, SURFACE_Y + 4, 61, 11, {
  color: "#0f7f96",
  weight: "confident",
  looseness: 0.12,
  fill: { color: "#a9f4f0", style: "solid" },
}, 22);
scene.add(surface).lintIgnore("overlap").drawOn({ at: 2.3, duration: 0.3 });
// Pivoted at its own centre first. Without it the squash grows from a bbox origin that isn't
// the ellipse's middle, and the surface slides down into the drink a little further on every
// wobble instead of breathing in place — the same trap a ripple ring falls into.
surface.pivotAt(240, SURFACE_Y + 4);
pulseSquash(surface, 1, 1.3, 4);

// Two flecks of light on the surface, drifting on their own slower rhythm so the top of the
// drink is never a still disc between bubbles.
const flecks = [
  sketch.stroke([[208, 181], [232, 178]], { color: "#ffffffcc", weight: 3, looseness: 0.25 }),
  sketch.stroke([[252, 185], [272, 182]], { color: "#ffffff99", weight: 3, looseness: 0.25 }),
];
flecks.forEach((f) => scene.add(f).lintIgnore("overlap"));
drawIn(flecks, { from: 2.35, to: 2.6 });
swayMove(flecks[0], 5, 0, 2);
swayMove(flecks[1], -4, 0, 1);

// --- The straw: one hard-edged parallelogram, the only warm colour in the frame, and the only
// diagonal in a composition otherwise made entirely of verticals and ellipses.
const straw = sketch.loop(
  [[250, 392], [262, 392], [336, 92], [324, 90]],
  { color: "#8d2c3e", weight: "confident", looseness: 0.1, smooth: false, fill: { color: sketch.shade("#f2657f", { from: "left", amount: 0.3 }), style: "solid" } }
);
scene.add(straw).lintIgnore("overlap").drawOn({ at: 2.5, duration: 0.35 });

// --- Rim and base last, drawn over everything else: they are the two ellipses that turn a
// tapered outline into a cylinder, and any liquid or straw edge crossing them would break the
// read. Unfilled, so the wall behind still shows through the empty top of the glass.
const rim = sketch.ellipse(240, 124, 68, 13, { color: GLASS_LINE, weight: "bold", looseness: 0.08 }, 24);
scene.add(rim).lintIgnore("overlap").drawOn({ at: 2.6, duration: 0.28 });
const base = sketch.ellipse(240, 402, 52, 9, { color: GLASS_LINE, weight: "confident", looseness: 0.08 }, 20);
scene.add(base).lintIgnore("overlap").drawOn({ at: 2.72, duration: 0.2 });

// One long highlight down the left wall — the cheapest possible cue that the glass is round.
const gleam = sketch.stroke([[195, 186], [191, 256], [195, 326]], { color: "#ffffff77", weight: 4, looseness: 0.1 });
scene.add(gleam).lintIgnore("overlap").drawOn({ at: 2.7, duration: 0.25 });

export default scene;
