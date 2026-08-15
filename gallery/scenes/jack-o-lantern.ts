import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, pulseFade, pulseSquash } from "../lib.js";

// A carved pumpkin burning on a stone doorstep at night, with a bat crossing the moon.

// The most graphic scene in the gallery on purpose: three values and nothing between them —
// near-black night, one saturated orange mass, and the cut openings blazing. texture: "grain"
// over the ink look is what keeps a frame this dark from banding into flat digital black.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#080a12" },
      { offset: 1, color: "#1c1527" },
    ],
  },
  seed: "jack-o-lantern",
  look: "ink",
  texture: "grain",
});

const INK = "#100c14";
const CX = 238;
const CY = 332;

// --- The moon, first and farthest, and the only cool light in the frame — it is what makes the
// pumpkin's own light read as warm rather than just as yellow.
const moon = sketch.ellipse(378, 96, 33, 33, { color: "#c9c3a6", weight: "light", looseness: 0, fill: { color: "#dcd6bb", style: "solid" } }, 26);
scene.add(moon).drawOn({ at: 0.9, duration: 0.45 });

const stars = ([
  [104, 68], [162, 124], [300, 52], [430, 176], [76, 196],
] as [number, number][]).map(([x, y]) => sketch.ellipse(x, y, 3, 3, { color: "#e8e2c8", weight: "light", looseness: 0, fill: { color: "#f4efd8", style: "solid" } }, 10));
stars.forEach((s) => scene.add(s));
appearIn(stars, { from: 1.2, to: 1.6, each: 0.3 });

// --- The doorway this is a doorstep OF: just the jamb at the left edge, wide enough to read as
// architecture and narrow enough to leave the sky open. A full door behind the pumpkin was the
// obvious framing and it left nowhere for the moon or the bat to be.
const jamb = sketch.loop(
  [[0, 0], [58, 0], [58, 400], [0, 400]],
  { color: "#241d30", weight: "light", looseness: 0.1, smooth: false, fill: { color: "#171325", style: "solid" } }
);
scene.add(jamb).drawOn({ at: 0.4, duration: 0.6 });
scene.add(sketch.stroke([[58, 8], [58, 398]], { color: "#3b3350", weight: 3, looseness: 0.1 }).lintIgnore("overlap"))
  .drawOn({ at: 0.85, duration: 0.35 });

// --- The step, as two shapes rather than one: a lighter top face catching what light there is,
// and a darker riser under it. One quad for both would have to pick a single value, and then the
// pumpkin has no surface to sit on — it just floats against a grey slab.
const tread = sketch.loop(
  [[54, 392], [442, 392], [462, 414], [34, 414]],
  { color: INK, weight: "confident", looseness: 0.1, smooth: false, fill: { color: sketch.shade("#413e4d", { from: "top", amount: 0.3 }), style: "solid" } }
);
const riser = sketch.loop(
  [[34, 414], [462, 414], [458, 456], [38, 456]],
  { color: INK, weight: "confident", looseness: 0.1, smooth: false, fill: { color: "#22212b", style: "solid" } }
);
[tread, riser].forEach((s) => scene.add(s).lintIgnore("overlap"));
drawIn([tread, riser], { from: 0, to: 0.8, each: 0.5 });

// --- The halo: ONE ellipse with a radial gradient whose outer stop is fully transparent, sitting
// behind the pumpkin so only the leaked light shows. This is what a candle inside a hollow gourd
// actually does to the air around it, and it is one fill — not a stack of flat circles at
// decreasing alpha, which is how it looked before and read as concentric rings.
const halo = sketch.ellipse(CX, CY - 6, 208, 168, {
  color: "#00000000",
  weight: "light",
  looseness: 0,
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#ffb03a66" },
        { offset: 0.5, color: "#ff8a2033" },
        { offset: 1, color: "#ffb03a00" },
      ],
      type: "radial",
    },
    style: "solid",
  },
}, 26);
scene.add(halo).lintIgnore("overlap");
// pulseFade owns this node's opacity from LOOP_START on, so it cannot also be drawn on — but two
// fades scheduled entirely inside the reveal don't overlap that window, and they save the scene
// from opening on a warm blob glowing in the dark with no pumpkin around it yet.
halo.fadeTo(0, { at: 0, duration: 0 });
halo.fadeTo(0.5, { at: 1.9, duration: 0.6 });

// --- The pumpkin. An ellipse rather than a blob: the ink look's own sketchiness roughens the
// outline plenty, and blob()'s authored wobble on a shape this big reads as a dented bin bag
// instead of a taut gourd.
const body = sketch.ellipse(CX, CY, 96, 78, {
  color: INK,
  weight: "bold",
  looseness: 0,
  fill: { color: sketch.shade("#c85e1e", { from: "top", amount: 0.42 }), style: "solid" },
}, 30);
scene.add(body).lintIgnore("overlap").drawOn({ at: 1.5, duration: 0.75 });

// Ribs kept out at the flanks, clear of where the face goes: a rib crossing an eye turns both
// into mush, and the middle of the gourd has to stay empty for the carving to land on.
const ribs = ([
  [-68, -0.62],
  [68, 0.62],
  [-38, -0.34],
  [38, 0.34],
] as [number, number][]).map(([dx, bow]) =>
  sketch.stroke(
    [
      [CX + dx * 0.28, CY - 72],
      [CX + dx, CY - 26],
      [CX + dx * 1.06, CY + 18],
      [CX + dx * 0.66, CY + 62],
    ],
    { color: "#8a3a10", weight: bow > 0 ? "confident" : "confident", looseness: 0.16 }
  ).lintIgnore("overlap")
);
ribs.forEach((r) => scene.add(r));
drawIn(ribs, { from: 2.05, to: 2.5, each: 0.24 });

// --- The inner glow, over the flesh but under the openings: the flesh nearest the candle passes
// a little light, and this is the shape that flickers fastest. Five pulses against the halo's
// two, deliberately out of step — one rate reads as a dimmer being turned, two read as a flame.
const inner = sketch.ellipse(CX, CY + 10, 94, 64, {
  color: "#00000000",
  weight: "light",
  looseness: 0,
  fill: {
    color: { stops: [{ offset: 0, color: "#ffd76e99" }, { offset: 1, color: "#ff9c2000" }], type: "radial" },
    style: "solid",
  },
}, 24);
scene.add(inner).lintIgnore("overlap");
inner.fadeTo(0, { at: 0, duration: 0 });
inner.fadeTo(0.72, { at: 2.0, duration: 0.5 });

// --- The carving. Every opening is smooth: false and filled with the same radial gradient,
// brightest at its middle: that is one candle behind all of them, so they cannot each be a flat
// yellow patch. Triangles for the eyes and nose, and a mouth whose top edge is the teeth.
const cut = {
  color: "#ffe9a8",
  weight: "light" as const,
  looseness: 0.06,
  smooth: false,
  fill: {
    color: { stops: [{ offset: 0, color: "#fff6cf" }, { offset: 1, color: "#ffab27" }], type: "radial" as const },
    style: "solid" as const,
  },
};
const face = [
  sketch.loop([[192, 294], [226, 294], [209, 324]], cut),
  sketch.loop([[250, 294], [284, 294], [267, 324]], cut),
  sketch.loop([[227, 338], [249, 338], [238, 316]], cut),
  sketch.loop(
    [
      [186, 348], [199, 362], [212, 348], [225, 362], [238, 348], [251, 362], [264, 348], [277, 362], [290, 348],
      [280, 378], [238, 390], [196, 378],
    ],
    cut
  ),
];
face.forEach((f) => scene.add(f).lintIgnore("overlap"));
drawIn(face, { from: 2.45, to: 2.85, each: 0.2 });

// The candle itself, seen through the grin — near-white against the opening's warm yellow, and
// stretching taller and shorter five times a cycle, pivoted at its wick so it grows up out of
// the flame rather than about its own middle.
const flame = sketch.loop(
  [[234, 378], [238, 360], [243, 378], [239, 383]],
  { color: "#fff8dc", weight: "light", looseness: 0.2, fill: { color: "#fffbe8", style: "solid" } }
);
scene.add(flame).lintIgnore("overlap").drawOn({ at: 2.8, duration: 0.15 });
flame.pivotAt(238, 382);
pulseSquash(flame, 0.94, 1.3, 5);

// --- The stem, last of the pumpkin so it overlaps the top edge cleanly. Hard-edged and green —
// the one cool colour on the whole gourd, which is what stops it reading as part of the flesh.
const stem = sketch.loop(
  [[226, 262], [222, 238], [240, 228], [252, 240], [248, 262]],
  { color: "#1c2410", weight: "confident", looseness: 0.14, smooth: false, fill: { color: sketch.shade("#5d6b2c", { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(stem).lintIgnore("overlap").drawOn({ at: 2.6, duration: 0.3 });

// Two dry leaves on the tread, small and dark. They are the only thing in frame that says the
// season out loud, and they keep the step from being an empty grey shelf.
const leaves = [
  sketch.loop([[352, 396], [376, 390], [390, 400], [366, 406]], { color: "#2a1608", weight: "light", looseness: 0.2, fill: { color: "#7a3c14", style: "solid" } }),
  sketch.loop([[96, 400], [118, 394], [130, 404], [108, 410]], { color: "#2a1608", weight: "light", looseness: 0.2, fill: { color: "#6a3312", style: "solid" } }),
];
leaves.forEach((l) => scene.add(l).lintIgnore("overlap"));
appearIn(leaves, { from: 2.3, to: 2.6, each: 0.3 });

// --- The flicker. Both shapes swing between a resting opacity and a brighter one and come back,
// so the seam is exact; the rates are coprime-ish on purpose (2 against 5) so the two never peak
// together twice in the same cycle, which is the difference between a flame and a slow throb.
pulseFade(halo, 0.5, 0.92, 2);
pulseFade(inner, 0.72, 1, 5);

// --- The bat: one hard-edged silhouette crossing the sky left to right on the second beat of
// four. driftOnce fades it up over the first 15% of the travel and out over the last quarter, so
// it enters and leaves the frame instead of blinking on in clear sky.
//
// Its wings sweep UP to points well above the body and all the raggedness is on the trailing
// edge only. The first pass zigzagged both edges evenly and read as a party streamer — a bat is
// two big triangular sails with a small body slung under them, and the top edge has to stay
// clean for the sails to read as sails. Outlined a couple of shades lighter than its own fill,
// which is the only reason a near-black shape is visible against a near-black sky at all.
const bat = sketch.loop(
  [
    [92, 80], [116, 96], [130, 90], [136, 83], [142, 90], [150, 83], [156, 96], [188, 80],
    [178, 98], [162, 92], [152, 109], [140, 115], [128, 108], [118, 92], [102, 99],
  ],
  { color: "#544a72", weight: "confident", looseness: 0.12, smooth: false, fill: { color: "#2c2440", style: "solid" } }
);
scene.add(bat);
driftOnce(bat, 288, -14, beats(4)[1], { ease: "sine.inOut", peak: 1 });

export default scene;
