import { sketch } from "../../src/index.js";
import { appearIn, drawIn, lapAlong, pulseScale, ringPath, swayRotate } from "../lib.js";

// A tall two-armed cactus in a striped pot, one pink flower on its crown opening and closing.

// look: "flat" — a cactus is a few big clean silhouettes with hard edges, which is exactly what
// ligne-claire is for; ink's boil would make a plant that never moves look like it was shaking.
// Every blob below carries looseness: 0 for the same reason (a blob's wobble is authored into
// its points, not added at render time, so the look alone can't remove it).
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: "#e9a988",
  seed: "cactus-bloom",
  look: "flat",
});

const INK = "#2c4633";
const FLESH = "#6f9c6b";
const RIB = "#4d7a53";
const POT = "#2e6f78";
const CREAM = "#f4e6cf";
const PINK = "#e05a8a";

// --- Shelf line and a shadow pool under the pot, drawn first so the pot lands on top of them.
// Without these the pot hangs in flat colour; two shapes is the cheapest floor there is.
scene.add(
  sketch.stroke([[46, 452], [434, 452]], { color: "#c8815f", weight: "confident", looseness: 0 })
).drawOn({ at: 0, duration: 0.55 });
scene.add(
  sketch.ellipse(240, 455, 128, 13, { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#d68f6c", style: "solid" } })
).lintIgnore("overlap").drawOn({ at: 0.25, duration: 0.4 });

// --- Pot body next. A trapezoid with smooth:false, because a spline through four corners
// balloons the sides out and a barrel is not a plant pot.
const potBody = sketch.loop(
  [
    [178, 374],
    [302, 374],
    [288, 452],
    [192, 452],
  ],
  { color: "#1d4a52", weight: "bold", looseness: 0, smooth: false, fill: { color: POT, style: "solid" } }
);
scene.add(potBody).lintIgnore("overlap").drawOn({ at: 0.4, duration: 0.6 });

// Stripes cut to the pot's own taper rather than drawn as straight rectangles — a horizontal
// band that ignores the slope is the fastest way to make a pot look like a sticker.
const edgeL = (y: number) => 178 + (y - 374) * 0.175;
const edgeR = (y: number) => 302 - (y - 374) * 0.175;
function band(y0: number, y1: number) {
  return sketch.loop(
    [
      [edgeL(y0) + 2, y0],
      [edgeR(y0) - 2, y0],
      [edgeR(y1) - 2, y1],
      [edgeL(y1) + 2, y1],
    ],
    { color: "#1d4a52", weight: "light", looseness: 0, smooth: false, fill: { color: CREAM, style: "solid" } }
  ).lintIgnore("overlap");
}
const stripes = [band(388, 402), band(414, 428)];
stripes.forEach((s) => scene.add(s));
drawIn(stripes, { from: 0.75, to: 1.05, each: 0.28 });

// The rim, wider than the body — the lip is what says "pot" in one shape.
const rim = sketch.loop(
  [
    [168, 350],
    [312, 350],
    [308, 378],
    [172, 378],
  ],
  { color: "#1d4a52", weight: "bold", looseness: 0, smooth: false, fill: { color: "#3a8290", style: "solid" } }
);
scene.add(rim).lintIgnore("overlap").drawOn({ at: 1.0, duration: 0.45 });

// --- The trunk: one capsule, smooth, with a domed top. Its bottom edge runs down into the pot
// mouth, where the soil mound drawn last covers it.
const trunk = sketch.loop(
  [
    [209, 360],
    [208, 250],
    [212, 182],
    [223, 152],
    [240, 144],
    [257, 152],
    [268, 182],
    [272, 250],
    [271, 360],
  ],
  { color: INK, weight: "bold", looseness: 0, fill: { color: sketch.shade(FLESH, { from: "left", amount: 0.32 }), style: "solid" } }
);
scene.add(trunk).lintIgnore("overlap").drawOn({ at: 1.4, duration: 0.7 });

// --- The arms. Each is one closed outline that goes out along its underside, caps at the top,
// and comes back down its inner edge into the trunk — drawn as a single loop so `drawOn` traces
// the whole limb in one pass, and overlapping the trunk deeply so no seam shows at the joint.
//
// The armpit is the whole battle here. Carry the inner edge too far down and the slot of
// background between arm and trunk goes deeper than the arm is wide, and the limb stops reading
// as a saguaro arm and starts reading as a coat hook: it wants to be shallow.
const armL = sketch.loop(
  [
    [212, 286],
    [186, 284],
    [168, 270],
    [159, 244],
    [158, 172],
    [173, 158],
    [188, 172],
    [190, 214],
    [200, 228],
    [212, 234],
  ],
  { color: INK, weight: "bold", looseness: 0, fill: { color: sketch.shade(FLESH, { from: "left", amount: 0.3 }), style: "solid" } }
);
const armR = sketch.loop(
  [
    [268, 250],
    [294, 248],
    [312, 234],
    [321, 208],
    [322, 166],
    [307, 154],
    [292, 166],
    [291, 196],
    [281, 208],
    [268, 204],
  ],
  { color: INK, weight: "bold", looseness: 0, fill: { color: sketch.shade(FLESH, { from: "left", amount: 0.3 }), style: "solid" } }
);
[armL, armR].forEach((a) => scene.add(a).lintIgnore("overlap"));
drawIn([armL, armR], { from: 1.95, to: 2.45, each: 0.42 });

// Two and a half degrees each, from the shoulder, on different counts. The trunk deliberately
// does NOT move: swaying it too would drag the arm joints out from under the arms, and a cactus
// is the least flexible plant there is — the sway has to read as breath, not as wind.
armL.pivotAt(210, 262);
swayRotate(armL, 2.5, 2);
armR.pivotAt(270, 228);
swayRotate(armR, -2.2, 3);

// Ribs — two on the trunk, one down each arm. They follow the silhouette's own curve, which is
// what turns three flat green shapes into a ribbed succulent.
const ribs = [
  sketch.stroke([[224, 168], [221, 250], [222, 352]], { color: RIB, weight: "confident", looseness: 0 }),
  sketch.stroke([[256, 170], [259, 250], [258, 352]], { color: RIB, weight: "confident", looseness: 0 }),
  sketch.stroke([[173, 176], [173, 226], [188, 258]], { color: RIB, weight: "light", looseness: 0 }),
  sketch.stroke([[307, 172], [306, 204], [294, 234]], { color: RIB, weight: "light", looseness: 0 }),
];
ribs.forEach((r) => scene.add(r).lintIgnore("overlap"));
drawIn(ribs, { from: 2.2, to: 2.55, each: 0.22 });

// Spines in pairs off the silhouette edges, pointing up and out. Nine pixels each: short enough
// to read as prickle, long enough not to vanish into dirt at thumbnail size.
function spine(x: number, y: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return sketch.stroke([[x, y], [x + Math.cos(a) * 9, y + Math.sin(a) * 9]], {
    color: "#f6ecd8",
    weight: "confident",
    looseness: 0,
  }).lintIgnore("overlap");
}
const spines = [
  spine(209, 202, 200), spine(271, 202, -20),
  spine(208, 244, 200), spine(272, 292, -20),
  spine(209, 322, 200), spine(271, 332, -20),
  spine(157, 186, 200), spine(157, 222, 200),
  spine(323, 180, -20), spine(323, 212, -20),
];
spines.forEach((s) => scene.add(s));
appearIn(spines, { from: 2.35, to: 2.6, each: 0.2 });

// --- Soil, drawn AFTER the cactus so the mound sits in front of the trunk's cut-off bottom.
// Front-of-soil is also just true: you see the near face of the earth, not its section.
const soil = sketch.loop(
  [
    [180, 358],
    [210, 348],
    [240, 345],
    [276, 348],
    [300, 358],
    [298, 372],
    [182, 372],
  ],
  { color: "#2a1d16", weight: "confident", looseness: 0, fill: { color: "#43301f", style: "solid" } }
);
scene.add(soil).lintIgnore("overlap").drawOn({ at: 2.5, duration: 0.35 });

// --- The flower: six petals and a pale eye, on the crown. This is the event of the loop, so it
// gets the whole loop window as one slow open-and-close rather than a fast flutter.
const petals = Array.from({ length: 6 }, (_, i) => {
  const a = ((i / 6) * 360 - 90) * (Math.PI / 180);
  return sketch.blob(240 + Math.cos(a) * 17, 128 + Math.sin(a) * 15, 13, {
    color: "#a83566",
    weight: "confident",
    looseness: 0,
    fill: { color: PINK, style: "solid" },
  }, 10).lintIgnore("overlap");
});
const eye = sketch.ellipse(240, 128, 9, 9, {
  color: "#a83566",
  weight: "confident",
  looseness: 0,
  fill: { color: "#f8dc86", style: "solid" },
}, 14).lintIgnore("overlap");
const bloom = sketch.group([...petals, eye]);
scene.add(bloom);
// Seven children at 0.06s apart from 2.3s: the LAST petal has to be fully opaque by 3.0, or the
// loop's first frame catches the bloom half-faded and the seam misses by a whole flower.
bloom.stagger(0.06, { at: 2.3, duration: 0.25, effect: "appear" });
pulseScale(bloom, 1.16, 2);

// --- One bee, orbiting the crown twice. Whole laps only, or it would finish the loop on the
// far side of its own ring from where it started (see lapAlong).
const bee = sketch.group();
bee.add(sketch.ellipse(240, 130, 9, 7, { color: "#3a2a14", weight: "confident", looseness: 0, fill: { color: "#efb63f", style: "solid" } }, 12));
bee.add(sketch.stroke([[240, 124], [240, 136]], { color: "#3a2a14", weight: "confident", looseness: 0 }).lintIgnore("overlap"));
bee.add(sketch.ellipse(238, 122, 6, 4, { color: "#8a7a5a", weight: "light", looseness: 0, fill: { color: "#f6efdd", style: "solid" } }, 10).lintIgnore("overlap"));
scene.add(bee);
appearIn(bee.children, { from: 2.55, to: 2.7, each: 0.2 });
// A ring centred on the flower, not on the frame: an orbit drawn around empty sky reads as a
// stray fly, and the bee has to keep visibly belonging to the bloom it is circling.
lapAlong(bee, ringPath(240, 132, 94, 44), 2);

export default scene;
