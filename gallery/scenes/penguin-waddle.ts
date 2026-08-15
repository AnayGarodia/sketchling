import { sketch } from "../../src/index.js";
import { appearIn, blink, drawIn, fallLoop, swayRotate } from "../lib.js";

// A round penguin front-on on the ice, waddling in place while two snowflakes drift past behind it.

// look: "clay" — its ~10fps stop-motion hold is exactly the cadence a waddle wants. Rocking
// side to side on a smooth 30fps curve reads as a metronome; the same rock quantized to a
// puppet's frame rate reads as an animal shifting its weight.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#8fb9d6" },
      { offset: 0.55, color: "#c3dced" },
      { offset: 1, color: "#e6f1f7" },
    ],
  },
  seed: "penguin-waddle",
  look: "clay",
});

const INK = "#1d2a38";
const COAT = "#31455c";
const SNOW = "#f2f8fb";
const BILL = "#ef9f3a";

// --- Two distant bergs, painted first and low-contrast: they set the horizon so the ice reads
// as a plain rather than a white rectangle, and nothing more.
const bergs = [
  sketch.loop([[24, 380], [96, 300], [140, 336], [186, 382]], { color: "#9dbdd2", weight: "confident", looseness: 0.2, fill: { color: "#c4dbe9", style: "solid" }, smooth: false }),
  sketch.loop([[318, 382], [376, 318], [412, 348], [456, 380]], { color: "#9dbdd2", weight: "confident", looseness: 0.2, fill: { color: "#cee2ee", style: "solid" }, smooth: false }),
];
bergs.forEach((b) => scene.add(b));
drawIn(bergs, { from: 0, to: 0.8, each: 0.5 });

// --- The ice sheet, plus two hairline cracks so the floor has a surface instead of being a
// value block.
const ice = sketch.loop(
  [[0, 396], [128, 386], [268, 392], [480, 382], [480, 480], [0, 480]],
  { color: "#8fb2c8", weight: "bold", looseness: 0.16, fill: { color: sketch.shade("#dcecf4", { from: "top", amount: 0.22 }), style: "solid" } }
);
scene.add(ice).drawOn({ at: 0.6, duration: 0.8 });

const cracks = [
  sketch.stroke([[44, 434], [128, 442], [196, 430]], { color: "#a8c6d8", weight: "light", looseness: 0.3 }),
  sketch.stroke([[300, 452], [376, 444], [452, 456]], { color: "#a8c6d8", weight: "light", looseness: 0.3 }),
];
cracks.forEach((c) => scene.add(c).lintIgnore("overlap"));
appearIn(cracks, { from: 1.2, to: 1.5, each: 0.3 });

// Contact shadow — without it a bird this round looks pasted on rather than standing.
const shade = sketch.ellipse(240, 406, 88, 13, { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#b9d4e3", style: "solid" } });
scene.add(shade).lintIgnore("overlap").drawOn({ at: 1.4, duration: 0.4 });

// --- Snowflakes, added BEFORE the penguin so they pass behind it, and placed off to either
// side so they are actually visible rather than hidden by the body all the way down. Three
// crossed strokes each: at clay's chunkiness a real six-armed flake would just be a smudge.
// `fallLoop` is also this scene's cyclic-helper-across-the-whole-window: it is the one thing
// here whose ops actually run to LOOP_END (see the rock's own comment for why nothing else can).
([[104, 118, 16, 1], [372, 96, -22, 2]] as [number, number, number, number][]).forEach(([sx, sy, dx, laps]) => {
  const flake = sketch.group();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    flake.add(
      sketch.stroke([[sx - Math.cos(a) * 15, sy - Math.sin(a) * 15], [sx + Math.cos(a) * 15, sy + Math.sin(a) * 15]], {
        color: "#fbfeff", weight: "bold", looseness: 0.2,
      }).lintIgnore("overlap")
    );
  }
  scene.add(flake);
  // No drawOn: fallLoop owns this group's opacity for the whole timeline, so a reveal would
  // only ever be drawn at opacity 0.
  fallLoop(flake, dx, 246, laps, { ease: "sine.in", peak: 0.9 });
});

// --- The bird. Everything above the ankles goes in ONE group, because the rock is a single
// weight shift of the whole body — a torso that rocked while the head stayed level would read
// as a bobblehead, not a waddle.
const penguin = sketch.group();

// Flippers go in FIRST so the body silhouette closes over their roots and they read as attached
// at the shoulder rather than stuck onto the outside of the coat. They have to swing well clear
// of the body's own widest point (half-width 66) or the counter-swing is invisible — a first
// pass tucked them tight against the flank and the whole gesture disappeared.
const flippers = ([[1, 200], [-1, 280]] as [number, number][]).map(([dir, ox]) =>
  sketch.loop(
    [
      [ox, 222],
      [ox - dir * 26, 252],
      [ox - dir * 50, 300],
      [ox - dir * 54, 332],
      [ox - dir * 34, 328],
      [ox - dir * 14, 286],
      [ox - dir * 2, 246],
    ],
    { color: INK, weight: "bold", looseness: 0.18, fill: { color: "#46607e", style: "solid" } }
  ).lintIgnore("overlap")
);
flippers.forEach((f) => penguin.add(f));

// Body: one continuous bowling-pin silhouette from crown to ankles. A penguin has no neck to
// draw, and giving it one is what turns a penguin into a duck.
const body = sketch.loop(
  [
    [240, 168],
    [272, 178],
    [292, 208],
    [302, 252],
    [306, 300],
    [300, 348],
    [282, 384],
    [250, 398],
    [230, 398],
    [198, 384],
    [180, 348],
    [174, 300],
    [178, 252],
    [188, 208],
    [208, 178],
  ],
  { color: INK, weight: "bold", looseness: 0.16, fill: { color: sketch.shade(COAT, { from: "top", amount: 0.3 }), style: "solid" } }
);
penguin.add(body.lintIgnore("overlap"));

// The white front, starting just under the bill: that boundary IS the head, which is why no
// separate head shape is needed at all.
const front = sketch.loop(
  [
    [240, 232],
    [274, 250],
    [288, 300],
    [282, 352],
    [256, 386],
    [224, 386],
    [198, 352],
    [192, 300],
    [206, 250],
  ],
  { color: "#c9d9e2", weight: "confident", looseness: 0.16, fill: { color: sketch.shade(SNOW, { from: "top", amount: 0.18 }), style: "solid" } }
);
penguin.add(front.lintIgnore("overlap"));

// --- Face. Eyes big and close-set, sized before anything else went on the head: get these
// wrong and no amount of beak fixes it.
const eyes = sketch.group();
for (const ex of [218, 262]) {
  eyes.add(sketch.ellipse(ex, 204, 14, 14, { color: INK, weight: "confident", looseness: 0, fill: { color: "#f6fbfd", style: "solid" } }, 18).lintIgnore("overlap"));
  eyes.add(sketch.ellipse(ex + (ex < 240 ? 2 : -2), 206, 7, 8, { color: "#131b24", weight: "light", looseness: 0, fill: { color: "#161f29", style: "solid" } }, 14).lintIgnore("overlap"));
  eyes.add(sketch.ellipse(ex + (ex < 240 ? -1 : -5), 199, 4, 4, { color: "#ffffff", weight: "light", looseness: 0, fill: { color: "#ffffff", style: "solid" } }, 10).lintIgnore("overlap"));
}
penguin.add(eyes);

// Bill: a downward wedge, smooth:false so the point stays a point.
const bill = sketch.loop([[223, 220], [257, 220], [240, 250]], {
  color: "#a8601a", weight: "confident", looseness: 0.14, fill: { color: BILL, style: "solid" }, smooth: false,
});
penguin.add(bill.lintIgnore("overlap"));

scene.add(penguin);
drawIn([body, front], { from: 1.5, to: 2.2, each: 0.45 });
drawIn(flippers, { from: 2.1, to: 2.45, each: 0.3 });
appearIn(eyes.children, { from: 2.4, to: 2.7, each: 0.22 });
bill.drawOn({ at: 2.7, duration: 0.2 });

// --- Feet stay OUT of the rocking group: they are what the bird is rocking on, so they hold
// still on the ice while everything above the ankle tips over them.
const feet = ([[1, 214], [-1, 266]] as [number, number][]).map(([dir, fx]) =>
  sketch.loop(
    [
      [fx, 386],
      [fx - dir * 26, 396],
      [fx - dir * 34, 408],
      [fx - dir * 16, 412],
      [fx + dir * 4, 408],
      [fx + dir * 12, 396],
    ],
    { color: "#a8601a", weight: "bold", looseness: 0.18, fill: { color: BILL, style: "solid" } }
  ).lintIgnore("overlap")
);
feet.forEach((f) => scene.add(f));
drawIn(feet, { from: 2.4, to: 2.8, each: 0.3 });

// --- The waddle: four weight shifts across the loop, pivoted between the feet so the bird tips
// over its own ankles. NO translation anywhere in this scene on purpose — a gait that actually
// travels can never come back to its own first frame.
penguin.pivotAt(240, 400);
swayRotate(penguin, 4.5, 4);

// The flippers counter-swing on the OPPOSITE phase (a negative amplitude flips the start pose),
// and wider than the body rocks, so the net motion still reads as a flipper swinging rather
// than one glued rigidly to a tipping torso.
flippers.forEach((f, i) => {
  f.pivotAt(i === 0 ? 200 : 280, 226);
  swayRotate(f, -11, 4);
});

// One blink, off the waddle's own rhythm so the two gestures don't land together. The pivot is
// not optional: with no pivot set, a group's squash resolves its origin from a bbox that isn't
// the one on screen and the lids slide off the crown instead of closing. Pinned to the eyeline,
// they shut in place.
eyes.pivotAt(240, 204);
blink(eyes, 4.35);

export default scene;
