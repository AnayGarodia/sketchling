import { sketch } from "../../src/index.js";
import { blink, drawIn, pulseFade, ripple } from "../lib.js";

// A router broadcasting three signal arcs up to a phone that ticks back in acknowledgement.

// look: "flat" — a router is a box with two sticks on it and the arcs are pure geometry, so the
// register that wants clean edges wins over pen scratch. Everything is looseness: 0 to match.
const scene = sketch.scene({ width: 480, height: 480, background: "#e7f0ee", seed: "wifi-pulse", look: "flat" });

const INK = "#1b2a2e";
const SLATE = "#3f5b67";
const TEAL = "#2f9d8e";
const AMBER = "#f2b134";

// Every arc is struck from the top face of the router, so that one point is named once and used
// as both the arc centre and the scale pivot. Getting those two out of sync is what makes a
// "signal" read as three unrelated smiles inflating on their own.
const OX = 240;
const OY = 372;

// --- The router. Body first, then the antennas over it, so the sticks read as mounted on the
// back edge rather than balanced on the lid. They are deliberately stubby: drawn full-length
// they poked straight through the innermost arc and the whole bottom of the frame became a
// tangle of teal and black at thumbnail size.
const shadow = sketch.ellipse(240, 428, 92, 8, { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#cdd9d6", style: "solid" } });
scene.add(shadow).lintIgnore("overlap");

const body = sketch.loop(
  [[172, OY], [308, OY], [302, 424], [178, 424]],
  { color: INK, weight: "bold", looseness: 0, smooth: false, fill: { color: sketch.shade(SLATE, { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(body);

const antennas = [
  sketch.stroke([[198, OY + 4], [174, 338]], { color: INK, weight: 7, looseness: 0 }),
  sketch.stroke([[282, OY + 4], [306, 338]], { color: INK, weight: 7, looseness: 0 }),
];
antennas.forEach((a) => scene.add(a).lintIgnore("overlap"));
const tips = [
  sketch.ellipse(174, 334, 6, 6, { color: INK, weight: "light", looseness: 0, fill: { color: SLATE, style: "solid" } }, 12),
  sketch.ellipse(306, 334, 6, 6, { color: INK, weight: "light", looseness: 0, fill: { color: SLATE, style: "solid" } }, 12),
];
tips.forEach((t) => scene.add(t).lintIgnore("overlap"));

// Three status lamps along the front. Two are just painted on; the third is the one that
// actually works, and it gets the fastest rhythm in the frame.
const lampsOff = [
  sketch.ellipse(214, 404, 6, 6, { color: INK, weight: "light", looseness: 0, fill: { color: "#7fa79c", style: "solid" } }, 12),
  sketch.ellipse(240, 404, 6, 6, { color: INK, weight: "light", looseness: 0, fill: { color: "#7fa79c", style: "solid" } }, 12),
];
lampsOff.forEach((l) => scene.add(l).lintIgnore("overlap"));
const lampLive = sketch.ellipse(266, 404, 6, 6, { color: "#8a6011", weight: "light", looseness: 0, fill: { color: AMBER, style: "solid" } }, 12);
scene.add(lampLive).lintIgnore("overlap");

// --- The arcs, added to the scene BEFORE the phone: the outer one swells far enough to reach the
// handset, and passing behind it reads as the signal arriving. Drawn over the top it read as a
// line ruled across a screen.
function arc(r: number, color: string, weight: number) {
  const pts = Array.from({ length: 11 }, (_, i) => {
    const a = ((-158 + (i / 10) * 136) * Math.PI) / 180;
    return [OX + Math.cos(a) * r, OY + Math.sin(a) * r] as [number, number];
  });
  return sketch.stroke(pts, { color, weight, looseness: 0 });
}

// --- The loop. Different beat counts rather than one shared count with hand-offset phases: the
// arcs then drift in and out of step, which reads as a signal being pushed out over and over
// rather than three rings on one metronome. The outer arc's single slow swell is also the helper
// that spans the entire loop window, so the exported clip never freezes.
([
  [100, "#2f9d8e", 9, 4, 1.4],
  [138, "#37a899", 7, 2, 1.3],
  [176, "#45b3a3", 6, 1, 1.26],
] as [number, number, number, number, number][]).forEach(([r, color, weight, n, to]) => {
  const a = arc(r, color, weight);
  // No drawOn: `ripple` owns this node's opacity from t=0, so a reveal would only ever be traced
  // at opacity 0. Concentric by construction, hence the silenced overlap check. Pivoted at the
  // router — a scale about an arc's own bbox centre puffs it up in place instead of pushing it
  // outward, which is the difference between a signal and a bouncing eyebrow.
  scene.add(a).lintIgnore("overlap");
  a.pivotAt(OX, OY);
  ripple(a, to, n, 0.95);
});

// --- The phone at the top of frame: the thing being reached. Deliberately small — it is the
// receiver, not the subject, and the arcs need the middle of the canvas to themselves.
const phone = sketch.loop(
  [[208, 72], [272, 72], [272, 162], [208, 162]],
  { color: INK, weight: "bold", looseness: 0, smooth: false, fill: { color: "#2f4650", style: "solid" } }
);
scene.add(phone);
const screen = sketch.loop(
  [[216, 82], [264, 82], [264, 144], [216, 144]],
  { color: "#16242a", weight: "light", looseness: 0, smooth: false, fill: { color: "#cfe6df", style: "solid" } }
).lintIgnore("overlap");
// A tick, not a mini wifi glyph: at 48px across, three tiny nested arcs collapse into a smudge,
// where two straight strokes still read as "yes, got it" at thumbnail size.
const tick = sketch.stroke([[226, 114], [236, 126], [256, 96]], { color: TEAL, weight: 6, looseness: 0, smooth: false }).lintIgnore("overlap");
// Screen and tick blink as one node. Blinking the panel alone left the tick hanging in mid-air
// over the phone's body at the bottom of the squash, which reads as a bug, not a display.
const display = sketch.group([screen, tick]);
scene.add(display);
const homeBar = sketch.stroke([[226, 152], [254, 152]], { color: "#7f9aa4", weight: "confident", looseness: 0 });
scene.add(homeBar).lintIgnore("overlap");

drawIn([body, ...antennas, ...tips, ...lampsOff, lampLive, phone, screen, tick, homeBar, shadow], { from: 0.15, to: 2.8 });

// The live lamp, blinking on its own faster count than any of the arcs.
pulseFade(lampLive, 0.4, 1, 6);

// The phone acknowledging: the tick brightens as each wave arrives, and the screen itself blinks
// twice — a fast squash, pivoted at the screen's own middle so it collapses like a display
// cutting out rather than sliding up the phone's body.
pulseFade(tick, 0.3, 1, 3);
display.pivotAt(240, 113);
blink(display, 3.55, 0.16);
blink(display, 4.75, 0.16);

export default scene;
