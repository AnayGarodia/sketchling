import { sketch } from "../../src/index.js";
import { drawIn, spin, swayRotate } from "../lib.js";

// A turntable from almost straight above: platter, record with a label, and a tonearm on it.

// look: "clay" — the ~10fps stop-motion hold is exactly what a turning platter wants. A record
// spinning at 30fps is a smooth grey disc; held at 10fps you can read every position of the
// label going round, which is the whole appeal of the object.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: "#7d8f92",
  seed: "record-player",
  look: "clay",
});

const INK = "#221c16";
const WOOD = "#6b4a33";
const VINYL = "#1c1a19";
const LABEL = "#d9873a";
const CHROME = "#cfcabf";

const CX = 196;
const CY = 244;

// --- Plinth. smooth:false everywhere: this is a machined wooden box and a spline through its
// corners rounds it into a tray. The 22px front face is the only perspective in the frame —
// enough to read as an object sitting on a surface rather than a floor plan of one.
const face = sketch.loop(
  [
    [54, 392],
    [426, 392],
    [434, 416],
    [62, 416],
  ],
  { color: INK, weight: "bold", looseness: 0.1, fill: { color: "#4a3324", style: "solid" }, smooth: false }
);
scene.add(face);

const top = sketch.loop(
  [
    [54, 96],
    [426, 96],
    [426, 392],
    [54, 392],
  ],
  { color: INK, weight: "bold", looseness: 0.1, fill: { color: sketch.shade(WOOD, { from: "top", amount: 0.28 }), style: "solid" }, smooth: false }
);
scene.add(top).lintIgnore("overlap");

// The felt-covered platter, a hair wider than the record so a rim of it shows all the way
// round — that ring is what stops the record reading as a hole cut in the wood.
const platter = sketch.ellipse(CX, CY, 122, 122, {
  color: INK,
  weight: "confident",
  looseness: 0.05,
  fill: { color: "#57565a", style: "solid" },
}, 40);
scene.add(platter).lintIgnore("overlap");

// --- The record, and everything printed on it, in ONE group: the grooves and the label have to
// turn with the disc, and a group's bbox centre is what `spin` rotates about. Every child here
// is concentric on (CX, CY), so that centre is the spindle by construction rather than by luck.
const record = sketch.group();

const disc = sketch.ellipse(CX, CY, 112, 112, {
  color: "#0d0c0b",
  weight: "confident",
  looseness: 0.04,
  fill: { color: VINYL, style: "solid" },
}, 40);
record.add(disc).lintIgnore("overlap");

const grooves = [104, 90, 74, 60].map((r) =>
  sketch.ellipse(CX, CY, r, r, { color: "#4e4844", weight: "light", looseness: 0.04 }, 40).lintIgnore("overlap")
);
grooves.forEach((g) => record.add(g));

const label = sketch.ellipse(CX, CY, 42, 42, {
  color: "#7a4718",
  weight: "confident",
  looseness: 0.05,
  fill: { color: LABEL, style: "solid" },
}, 32);
record.add(label).lintIgnore("overlap");

// The stamped speed. Two things force this to be big: the alphabet is a set of single open
// splines, so below about 40px a digit collapses into a squiggle — and, more importantly, the
// record needs ONE asymmetric mark on it or the whole spin is invisible on a disc of
// concentric circles.
const stamp = sketch.text("45", CX - 22, CY - 23, { color: "#4a2708", weight: "bold", looseness: 0.1 }, { size: 40 });
record.add(stamp);

const spindle = sketch.ellipse(CX, CY, 8, 8, { color: INK, weight: "confident", looseness: 0.05, fill: { color: "#8d8880", style: "solid" } }, 14);
record.add(spindle).lintIgnore("overlap");

scene.add(record);

// --- Tonearm, as its own group so it can nudge about the pivot without dragging the post with
// it. Built pointing down-left from the post at the back right, the way a real arm tracks in.
const arm = sketch.group();
arm.add(
  sketch.loop(
    [
      [376, 153],
      [276, 303],
      [268, 297],
      [368, 147],
    ],
    { color: INK, weight: "confident", looseness: 0.08, fill: { color: CHROME, style: "solid" }, smooth: false }
  )
);
// Headshell at the business end. Deliberately chunky — at 120px wide a stylus assembly drawn
// to scale is one dark pixel, and this is the thing that says "playing" rather than "parked".
arm.add(
  sketch.loop(
    [
      [262, 288],
      [288, 296],
      [281, 314],
      [256, 305],
    ],
    { color: "#100d0a", weight: "confident", looseness: 0.1, fill: { color: "#3b332b", style: "solid" }, smooth: false }
  ).lintIgnore("overlap")
);
// Counterweight, out behind the pivot: the visual reason the arm balances at all.
arm.add(
  sketch.loop(
    [
      [376, 148],
      [398, 115],
      [391, 110],
      [369, 143],
    ],
    { color: INK, weight: "confident", looseness: 0.08, fill: { color: CHROME, style: "solid" }, smooth: false }
  ).lintIgnore("overlap")
);
arm.add(
  sketch.ellipse(398, 114, 15, 15, { color: INK, weight: "confident", looseness: 0.06, fill: { color: "#8d8880", style: "solid" } }, 18).lintIgnore("overlap")
);
scene.add(arm);

// The post stays behind and stays still — it is the thing the arm turns on.
const post = sketch.ellipse(372, 150, 18, 18, { color: INK, weight: "bold", looseness: 0.06, fill: { color: "#6f6a62", style: "solid" } }, 20);
scene.add(post).lintIgnore("overlap");

// --- Two control knobs and a switch, bottom right, to fill the wood the platter doesn't reach.
const knobs = ([
  [378, 296, 20],
  [378, 348, 20],
] as [number, number, number][]).map(([x, y, r]) =>
  sketch.ellipse(x, y, r, r, { color: INK, weight: "confident", looseness: 0.06, fill: { color: "#a89b86", style: "solid" } }, 20).lintIgnore("overlap")
);
knobs.forEach((k) => scene.add(k));

const knobMarks = ([
  [378, 296],
  [378, 348],
] as [number, number][]).map(([x, y]) =>
  sketch.stroke([[x, y], [x + 13, y - 9]], { color: INK, weight: "confident", looseness: 0.1 }).lintIgnore("overlap")
);
knobMarks.forEach((m) => scene.add(m));

const switchPlate = sketch.loop(
  [
    [84, 360],
    [136, 360],
    [136, 378],
    [84, 378],
  ],
  { color: INK, weight: "confident", looseness: 0.08, fill: { color: "#a89b86", style: "solid" }, smooth: false }
);
scene.add(switchPlate).lintIgnore("overlap");

drawIn(
  [face, top, platter, disc, ...grooves, label, spindle, ...arm.children, post, ...knobs, ...knobMarks, switchPlate],
  { from: 0, to: 2.9 }
);
// The lettering is a Group, so it gets a stagger rather than a drawOn — drawOn on a plain group
// has no single path to trace and validate flags it as a no-op.
stamp.stagger(0.07, { at: 2.5, duration: 0.3 });

// --- The loop. Two full turns, which at this window length works out around 36rpm — near
// enough to a 33 that the pace reads right — and a whole number of them is what makes the
// finishing angle render identically to the starting one.
//
// pivotAt names the spindle outright rather than trusting the group's rendered bbox centre. The
// authored bbox already IS centred on (CX, CY) — every child is concentric — but the nested
// lettering group inside this one was enough to put the browser-side "50% 50%" origin somewhere
// else, and the record slid a third of the way up the frame as it turned.
record.pivotAt(CX, CY);
spin(record, 2);

// The arm nudging a degree and a half about its post — a real arm is never quite still on a
// warped record, and pivoting at the post rather than the arm's own middle is what keeps the
// headshell tracking an arc instead of sliding sideways.
arm.pivotAt(372, 150);
swayRotate(arm, 1.5, 1);

export default scene;
