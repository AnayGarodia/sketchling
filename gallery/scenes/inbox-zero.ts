import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, pulseSquash } from "../lib.js";

// A wire in-tray catching three falling envelopes while a fourth lifts away and vanishes.

// look: "flat" — envelopes and a wire basket are all straight edges and repeated verticals,
// which is exactly what a crisp ligne-claire register draws well and what pen-scratch ink
// turns into fuzz. Every shape is looseness: 0 for the same reason.
const scene = sketch.scene({ width: 480, height: 480, background: "#f2ebda", seed: "inbox-zero", look: "flat" });

const INK = "#2a251c";
const STEEL = "#4d6a86";
const WIRE = "#7f9cb6";
const CREAM = "#f8efdb";
const CORAL = "#cf6a4a";

const MOUTH_Y = 332; // front edge of the tray's opening — where an envelope stops falling
const FLOOR_Y = 390;

// --- The tray, built back-to-front so it reads as an open box rather than a flat badge:
// mouth first (a darker trapezoid, the hole), then the paper already filed in it, then the
// front wall over the bottom of that paper, then the wires. Anything drawn in the other order
// loses the depth entirely — the first pass had the sheets sitting *on* the front wall.
const tray = sketch.group();

const mouth = sketch.loop(
  [[136, 298], [344, 298], [372, MOUTH_Y], [108, MOUTH_Y]],
  { color: INK, weight: "confident", looseness: 0, smooth: false, fill: { color: "#dbcfb3", style: "solid" } }
);
tray.add(mouth);

// Three sheets already filed, each stepped up and right of the one behind it and tilted only
// 3-4px off level — enough to read as handled paper, not enough to look like tilted banners,
// which is exactly what two thinner sheets at a 6px tilt gave on the first pass.
const sheets = [
  sketch.loop([[152, 280], [300, 277], [302, 320], [154, 323]], { color: "#b8a98c", weight: "light", looseness: 0, smooth: false, fill: { color: "#efe4cc", style: "solid" } }),
  sketch.loop([[168, 270], [318, 273], [316, 318], [170, 315]], { color: "#b8a98c", weight: "light", looseness: 0, smooth: false, fill: { color: CREAM, style: "solid" } }),
  sketch.loop([[186, 266], [330, 270], [328, 314], [188, 310]], { color: "#b8a98c", weight: "light", looseness: 0, smooth: false, fill: { color: "#f4ebd6", style: "solid" } }),
];
sheets.forEach((s) => tray.add(s.lintIgnore("overlap")));

const front = sketch.loop(
  [[108, MOUTH_Y], [372, MOUTH_Y], [362, FLOOR_Y], [118, FLOOR_Y]],
  { color: INK, weight: "bold", looseness: 0, smooth: false, fill: { color: STEEL, style: "solid" } }
);
tray.add(front.lintIgnore("overlap"));

// The wires: eight verticals crossed by two rails. This is the whole reason the box reads as a
// *wire* in-tray and not a shoebox, so they get their own lighter blue rather than the outline
// ink — and it took two rails, not one, before the front read as mesh instead of a panelled bench.
const wires = [
  sketch.stroke([[112, 346], [368, 346]], { color: WIRE, weight: "confident", looseness: 0 }),
  sketch.stroke([[115, 368], [365, 368]], { color: WIRE, weight: "confident", looseness: 0 }),
];
for (let i = 0; i < 8; i++) {
  const x = 140 + i * 30;
  wires.push(sketch.stroke([[x, MOUTH_Y + 2], [x - 1, FLOOR_Y - 2]], { color: WIRE, weight: "light", looseness: 0 }));
}
wires.forEach((w) => tray.add(w.lintIgnore("overlap")));

// Two stubby feet, so the tray sits on the paper instead of hovering over it.
const feet = [
  sketch.stroke([[132, FLOOR_Y], [128, 402]], { color: INK, weight: "bold", looseness: 0 }),
  sketch.stroke([[348, FLOOR_Y], [352, 402]], { color: INK, weight: "bold", looseness: 0 }),
];
feet.forEach((f) => tray.add(f.lintIgnore("overlap")));

// Contact shadow outside the group — it belongs to the paper, not to the tray, so it must not
// flex when the tray does.
scene.add(
  sketch.ellipse(240, 404, 132, 9, { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#ded3ba", style: "solid" } })
).lintIgnore("overlap").drawOn({ at: 0, duration: 0.4 });

scene.add(tray);
drawIn([mouth, ...sheets, front, ...wires, ...feet], { from: 0.25, to: 2.85, each: 0.3 });

// --- One envelope, drawn where it should appear. Body plus a V flap in the accent colour:
// at thumbnail size the flap IS the envelope, a bare rectangle is a card.
function envelope(cx: number, cy: number) {
  const g = sketch.group();
  const hw = 43;
  const hh = 28;
  g.add(
    sketch.loop(
      [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]],
      { color: INK, weight: "confident", looseness: 0, smooth: false, fill: { color: CREAM, style: "solid" } }
    ).lintIgnore("overlap")
  );
  g.add(
    sketch.stroke([[cx - hw, cy - hh], [cx, cy + 8], [cx + hw, cy - hh]], { color: CORAL, weight: "bold", looseness: 0, smooth: false }).lintIgnore("overlap")
  );
  g.add(
    sketch.stroke([[cx - hw, cy + hh], [cx - 9, cy], [cx + hw, cy + hh]], { color: "#c9bda2", weight: "light", looseness: 0, smooth: false }).lintIgnore("overlap")
  );
  return g;
}

// --- The loop. Three envelopes drop in on the three beats, each authored at the TOP of its own
// fall (driftOnce moves a node from where it sits, so its authored position is the start) and
// each fading out just as it clears the rim, which is what sells "went in" rather than "landed
// on top of". No drawOn on any of them: driftOnce owns their opacity for the whole timeline.
const fall = beats(3);
([
  [158, 104, 12, 190, fall[0].at, 1.15],
  // The middle one drops a quarter-beat early on purpose. Three landings exactly a beat apart
  // read as a metronome; slightly uneven reads as post arriving. Each fall also runs a little
  // longer than its own beat so two are usually in the air at once.
  [244, 84, -4, 208, fall[1].at - 0.25, 1.15],
  // The last one gets the shorter window: its beat is the one that has to end at LOOP_END.
  [330, 108, -22, 186, fall[2].at + 0.05, 1.05],
] as [number, number, number, number, number, number][]).forEach(([cx, cy, dx, dy, at, dur]) => {
  const env = envelope(cx, cy);
  scene.add(env);
  driftOnce(env, dx, dy, { at, dur }, { ease: "sine.in", peak: 1 });
});

// The one going the other way — filed, done, leaving. It lifts on its own late, slow beat: on
// the first pass it shared a beat with an arrival and the two read as a matched pair hanging in
// mid-air rather than as traffic in both directions. Tilted, too, so its silhouette alone says
// it isn't one of the ones coming down.
const sent = envelope(296, 290);
scene.add(sent);
// Pinned to its own centre before the tilt: the default rotation origin is measured off the
// rendered SVG bbox, which for a drawn-on node includes a pen-tip element parked at the local
// origin — un-pinned, a 12-degree tilt slid the envelope 80px up the frame.
sent.pivotAt(296, 290);
sent.initial({ rotation: -12 });
driftOnce(sent, 34, -172, { at: 3.95, dur: 1.5 }, { ease: "sine.out", peak: 0.92 });

// --- The tray flexing: a 1.5% squash on the same three beats the envelopes arrive on, pivoted
// at the floor line so the basket compresses onto the paper instead of shrinking in place.
// Also the one cyclic helper spanning the entire loop window, so the exported clip never
// freezes between drops.
tray.pivotAt(240, FLOOR_Y);
pulseSquash(tray, 1.015, 0.972, 3);

export default scene;
