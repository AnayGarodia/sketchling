import { sketch } from "../../src/index.js";

// Gallery demo for natural secondary motion on a hand-held prop — the maintainer's own
// example of what "rigid" looks like: a fishing rod that snaps straight to each cast
// position and a lure that stops dead the instant it lands, instead of a rod tip that
// flexes and a line/lure that settles with real spring lag. Same springTo + sketch.connector
// pairing bendy-antenna.ts already proves out, applied to a held prop instead of a body
// accessory — plus a snap-and-settle GSAP ease ("back.out") on the cast motion itself,
// instead of the "sine.inOut" this whole gallery otherwise reaches for by default.

const scene = sketch.scene({ width: 520, height: 340, background: "#dce8ea", seed: "fishing-cast" });

const INK = "#241f18";
const WATER_Y = 260;

scene.add(
  sketch.loop([[0, WATER_Y], [520, WATER_Y], [520, 340], [0, 340]], {
    color: "#00000000",
    fill: { color: sketch.shade("#5f92a0", { from: "top", amount: 0.3 }), style: "solid" },
  })
).appear({ at: 0, duration: 0.01 });

scene.add(sketch.stroke([[0, WATER_Y], [520, WATER_Y]], { color: "#2f4a52", weight: "light" })).drawOn({ at: 0, duration: 0.4 });

// A simple standing angler on the bank — not the point of this demo, kept plain on purpose.
const ANCHOR_X = 110;
const ANCHOR_Y = 230;
const body = sketch.blob(ANCHOR_X, ANCHOR_Y - 20, 30, { color: INK, weight: "confident", fill: { color: sketch.shade("#5a6b57", { from: "top", amount: 0.3 }), style: "solid" } }, 12);
const head = sketch.blob(ANCHOR_X, ANCHOR_Y - 62, 16, { color: INK, weight: "confident", fill: { color: sketch.shade("#c99a6f", { from: "top", amount: 0.35 }), style: "solid" } }, 12);
scene.add(body).drawOn({ at: 0.2, duration: 0.5 });
scene.add(head).drawOn({ at: 0.6, duration: 0.3 });

// The rod: a single arm limb (root at the shoulder) holds it, but the ROD ITSELF is a
// separate node pivoted at the hand so it can be swung independently of the arm's own IK.
const HAND_X = ANCHOR_X + 18;
const HAND_Y = ANCHOR_Y - 30;
const arm = sketch.limb(ANCHOR_X + 6, ANCHOR_Y - 35, 26, 24, { color: INK, weight: "confident" }, { bend: 1, capRadius: 6 });
arm.restAt(HAND_X, HAND_Y);
scene.add(arm).appear({ at: 0.4, duration: 0.3 });

const ROD_LEN = 90;
const rod = sketch.stroke([[HAND_X, HAND_Y], [HAND_X + ROD_LEN, HAND_Y - 8]], { color: INK, weight: "bold", looseness: 0.1 });
rod.pivotAt(HAND_X, HAND_Y);
scene.add(rod).drawOn({ at: 0.7, duration: 0.3 });

// The rod TIP is its own node (invisible — a driver, not drawn) so a lure/line has a live
// point to spring off. It springs off the rod's own rotation via a plain moveTo matched to
// the rod's swing timing below (springTo needs a real moving driver NODE, not a rotation
// value — a zero-radius blob standing in for "wherever the rod tip currently points" is the
// established pattern, same role critter-hop.ts's dust-spawn points play, but live instead
// of precomputed since nothing here needs to be seek-exact to the pixel).
const tipDriver = sketch.blob(HAND_X + ROD_LEN, HAND_Y - 8, 1, { color: "#00000000" });
scene.add(tipDriver);

// The cast: rod swings BACK first (loading the cast), then WHIPS forward — "back.out" on
// the forward swing gives it a real snap-and-overshoot instead of decelerating smoothly
// into place, the single biggest difference between "an arm reached a target" and "an arm
// cast something."
const CAST_AT = 1.2;
rod.rotateTo(-25, { at: CAST_AT, duration: 0.4, ease: "sine.inOut" });
rod.rotateTo(35, { at: CAST_AT + 0.4, duration: 0.35, ease: "back.out(2.5)" });
arm.ikTo(HAND_X - 10, HAND_Y + 8, { at: CAST_AT, duration: 0.4, ease: "sine.inOut" });
arm.ikTo(HAND_X + 14, HAND_Y - 16, { at: CAST_AT + 0.4, duration: 0.35, ease: "back.out(2)" });
// tipDriver follows the rod's own end-point through the same swing, so the spring below has
// something real to chase rather than a static point.
tipDriver.moveTo(HAND_X + Math.cos((-25 * Math.PI) / 180) * ROD_LEN, HAND_Y - 8 + Math.sin((-25 * Math.PI) / 180) * ROD_LEN, { at: CAST_AT, duration: 0.4, ease: "sine.inOut" });
tipDriver.moveTo(HAND_X + Math.cos((35 * Math.PI) / 180) * ROD_LEN, HAND_Y - 8 + Math.sin((35 * Math.PI) / 180) * ROD_LEN, { at: CAST_AT + 0.4, duration: 0.35, ease: "back.out(2)" });

// The lure: springs toward a point far out over the water (past the rod tip, simulating
// the line paying out) rather than moving there on its own fixed tween — real damped
// overshoot/settle on landing instead of arriving and stopping dead.
const LURE_X = 430;
const LURE_Y = WATER_Y - 4;
const lure = sketch.blob(HAND_X + ROD_LEN, HAND_Y - 8, 6, { color: INK, weight: "light", fill: { color: "#3a3a3a", style: "solid" } }, 10);
scene.add(lure).appear({ at: CAST_AT + 0.55, duration: 0.15 });
lure.springTo(tipDriver, { offset: [LURE_X - (HAND_X + ROD_LEN), LURE_Y - (HAND_Y - 8)], stiffness: 55, damping: 6, at: CAST_AT + 0.75 });

// The fishing line: a connector from the rod's own FINAL tip position (a fixed point,
// same as bendy-antenna.ts's anchor — connector() takes a static anchor, not a moving one,
// so this deliberately doesn't try to track the tip mid-cast) to the lure's live position —
// bows naturally as the lure springs out ahead of it, instead of a straight rigid segment.
const FINAL_ANGLE = (35 * Math.PI) / 180;
const line = sketch.connector(
  [HAND_X + Math.cos(FINAL_ANGLE) * ROD_LEN, HAND_Y - 8 + Math.sin(FINAL_ANGLE) * ROD_LEN],
  lure,
  { color: "#3a3a3a", weight: "light" }
);
scene.add(line).appear({ at: CAST_AT + 0.55, duration: 0.15 });

export default scene;
