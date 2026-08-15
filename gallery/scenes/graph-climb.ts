import { sketch } from "../../src/index.js";
import { LOOP_LEN, LOOP_START, drawIn, pulseFade, pulseSquash } from "../lib.js";

// A dashboard card whose bars breathe while a highlight dot runs up the plotted line and back.

// look: "flat" — a card is a rectangle full of rectangles, and the whole point of a chart is that
// the eye trusts the geometry. A lilac ground with one coral accent keeps it from being the
// third beige-and-teal scene in the gallery.
const scene = sketch.scene({ width: 480, height: 480, background: "#ece7f1", seed: "graph-climb", look: "flat" });

const INK = "#2c2436";
const CARD = "#fbf6ec";
const GRID = "#ddd5e7";
const BAR = "#8f80b8";
const BAR_INK = "#5b4d84";
const CORAL = "#e0644f";

const BASE_Y = 352; // baseline the bars stand on and the axis is ruled along
const AXIS_X = 96;

// --- Card: a drop shadow offset behind a cream panel. Two flat rectangles do all the work of
// lifting the chart off the page; anything softer (a blurred edge, a gradient) stops reading as
// paper cut and laid down.
const shadow = sketch.loop(
  [[66, 104], [434, 104], [434, 412], [66, 412]],
  { color: "#00000000", weight: "light", looseness: 0, smooth: false, fill: { color: "#dbd2e6", style: "solid" } }
);
scene.add(shadow);
const card = sketch.loop(
  [[56, 92], [424, 92], [424, 400], [56, 400]],
  { color: INK, weight: "bold", looseness: 0, smooth: false, fill: { color: CARD, style: "solid" } }
);
scene.add(card).lintIgnore("overlap");

// Heading and legend as weighted rules rather than lettering: at card scale a real title is
// unreadable mush, and what says "this is a report" to the eye is the RHYTHM of a heavy rule, a
// lighter one under it, and a legend swatch beside them. The swatch started out at the right
// margin, where it crowded the value callout into a corner of small competing marks.
const heading = sketch.stroke([[84, 122], [196, 122]], { color: "#4a3f5e", weight: 9, looseness: 0 });
const subhead = sketch.stroke([[84, 138], [152, 138]], { color: "#9d94b5", weight: 4, looseness: 0 });
const swatch = sketch.loop(
  [[214, 116], [228, 116], [228, 130], [214, 130]],
  { color: BAR_INK, weight: "light", looseness: 0, smooth: false, fill: { color: CORAL, style: "solid" } }
);
const swatchRule = sketch.stroke([[236, 124], [276, 124]], { color: "#9d94b5", weight: 4, looseness: 0 });
[heading, subhead, swatch, swatchRule].forEach((n) => scene.add(n).lintIgnore("overlap"));

// --- Grid, then bars, then the axes over the top of both, so the two rules that define the
// chart's corner are never interrupted by something plotted inside it.
const grid = [300, 252, 204].map((y) =>
  sketch.stroke([[AXIS_X, y], [396, y]], { color: GRID, weight: "confident", looseness: 0 }).lintIgnore("overlap")
);
grid.forEach((g) => scene.add(g));

// Five plotted values, dipping once on the way up — a monotonic climb reads as a fake chart.
const pts: [number, number][] = [
  [134, 316],
  [196, 286],
  [258, 298],
  [320, 232],
  [382, 176],
];

// Bars under the line, each breathing on its own beat count. Same-count bars breathe in lockstep
// and the whole card looks like it is inflating; 4/3/2/3/4 keeps them wandering past each other,
// and every one of them spans the full loop window on its own.
const BAR_BEATS = [4, 3, 2, 3, 4];
pts.forEach(([x, y], i) => {
  const bar = sketch.loop(
    [[x - 15, y], [x + 15, y], [x + 15, BASE_Y], [x - 15, BASE_Y]],
    { color: BAR_INK, weight: "confident", looseness: 0, smooth: false, fill: { color: BAR, style: "solid" } }
  );
  scene.add(bar).lintIgnore("overlap");
  bar.drawOn({ at: 1.35 + i * 0.16, duration: 0.3 });
  // Pivoted on the baseline: a bar grows out of the axis, it does not swell about its own middle
  // and sink through the floor.
  bar.pivotAt(x, BASE_Y);
  pulseSquash(bar, 1, 1.035, BAR_BEATS[i]);
});

const axes = [
  sketch.stroke([[AXIS_X, 150], [AXIS_X, BASE_Y]], { color: "#6d6288", weight: "bold", looseness: 0 }),
  sketch.stroke([[AXIS_X, BASE_Y], [396, BASE_Y]], { color: "#6d6288", weight: "bold", looseness: 0 }),
];
axes.forEach((a) => scene.add(a).lintIgnore("overlap"));

// --- The line itself, and a marker on every value. smooth: false on purpose: a spline through
// these five points bulges above the last one, which on a chart reads as data that isn't there.
const line = sketch.stroke(pts, { color: CORAL, weight: 7, looseness: 0, smooth: false });
scene.add(line).lintIgnore("overlap");
const markers = pts.map(([x, y]) =>
  sketch.ellipse(x, y, 5, 5, { color: "#b44a36", weight: "light", looseness: 0, fill: { color: CORAL, style: "solid" } }, 14).lintIgnore("overlap")
);
markers.forEach((m) => scene.add(m));

// The top value, called out. One short number is exactly what this alphabet can letter cleanly,
// and it gives the underline something to be the underline OF.
const value = sketch.text("42", 342, 128, { color: INK, weight: "confident", looseness: 0 }, { size: 26 });
scene.add(value);
const rule = sketch.stroke([[340, 160], [378, 160]], { color: CORAL, weight: 5, looseness: 0 });
scene.add(rule).lintIgnore("overlap");

drawIn([shadow, card, heading, subhead, swatch, swatchRule, ...grid, ...axes, line, ...markers, rule], {
  from: 0,
  to: 2.7,
  each: 0.34,
});
value.stagger(0.06, { at: 2.4, duration: 0.3 });

// --- The loop. The dot runs the line to the last value and back down again in one window, which
// is the only shape of travel that can close: it ends on the point it started from, so the seam
// is the same pixel. (A one-way sweep would need a teleport home.)
const dot = sketch.ellipse(pts[0][0], pts[0][1], 9, 9, { color: CORAL, weight: "bold", looseness: 0, fill: { color: "#fffaf0", style: "solid" } }, 18);
scene.add(dot).lintIgnore("overlap");
dot.drawOn({ at: 2.75, duration: 0.2 });
// moveAlong lands a node's own bbox centre on each path point, so it carries an offset from the
// authored position for as long as the tween is live. `lapAlong` cancels that with a
// zero-duration pass at t=0 — which is wrong here: a zero-duration tween sits at progress 1, and
// on an OPEN path that is the far END, so the dot spent the whole reveal parked on the top value
// and the seam missed by the length of the chart. The honest fix for an open path is to author
// the node exactly on its first point, which makes the offset zero to begin with.
const climb: [number, number][] = pts;
const descend: [number, number][] = [...pts].reverse();
dot.moveAlong(climb, { at: LOOP_START, duration: LOOP_LEN / 2, ease: "sine.inOut" });
dot.moveAlong(descend, { at: LOOP_START + LOOP_LEN / 2, duration: LOOP_LEN / 2, ease: "sine.inOut" });

// The callout's underline flashing three times, the small nervous tick that makes the card read
// as live rather than printed.
pulseFade(rule, 0.35, 1, 3);

export default scene;
