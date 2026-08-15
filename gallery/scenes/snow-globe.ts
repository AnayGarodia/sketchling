import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, pulseFade, swayRotate } from "../lib.js";

// A snow globe on a wooden base: a fir tree and a cabin under glass, with snow still coming down.

// look: "clay" — its ~10fps hold is exactly the cadence a snow globe wants. Real stop-motion
// snow is shot frame by frame, and quantized time makes the flakes step down through the glass
// the way a puppet-film snowfall does instead of gliding continuously.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#392f43" },
      { offset: 0.62, color: "#59464b" },
      { offset: 1, color: "#7b6157" },
    ],
  },
  seed: "snow-globe",
  look: "clay",
});

const SNOW = "#f2fafc";
const DOME_X = 240;
const DOME_Y = 244;
const DOME_R = 128;
const BASE_TOP = 356;

// Half the dome's width at a given height. Every prop inside is authored against this rather
// than against the canvas: the circle narrows fast near the base, and a snowdrift laid out on
// canvas coordinates alone pokes straight through the glass down there.
const inset = (y: number, k = 4) => Math.sqrt(Math.max(0, DOME_R * DOME_R - (y - DOME_Y) ** 2)) - k;

// --- A shelf, one band, so the globe is an object in a room rather than a diagram of a globe.
scene.add(
  sketch.loop([[0, 436], [480, 436], [480, 480], [0, 480]], {
    color: "#3f3239",
    weight: "confident",
    fill: { color: sketch.shade("#6b5049", { from: "top", amount: 0.3 }), style: "solid" },
    smooth: false,
  })
).drawOn({ at: 0, duration: 0.6 });

scene.add(
  sketch.ellipse(240, 436, 112, 11, { color: "#00000000", weight: "light", fill: { color: "#453640", style: "solid" } })
).lintIgnore("overlap").drawOn({ at: 0.4, duration: 0.4 });

// --- The water inside, as one cool disc behind everything else. A faint wash over the FRONT of
// the props alone wasn't enough: the interior kept reading as the same warm room as the wall
// behind it, and the whole illusion of a sealed globe depends on the inside being its own
// colder place. Radial, so the glass is brightest through the middle and darkens toward the rim.
scene.add(
  sketch.ellipse(DOME_X, DOME_Y, DOME_R, DOME_R, {
    color: "#00000000",
    weight: "light",
    fill: {
      color: { stops: [{ offset: 0, color: "#6d8b9e" }, { offset: 1, color: "#3d5462" }], type: "radial" },
      style: "solid",
    },
  }, 40)
).lintIgnore("overlap").drawOn({ at: 0.6, duration: 0.7 });

// --- Everything inside the glass is painted first, so the glass wash later reads as a layer the
// whole scene is seen THROUGH. Settled snow first: an undulating surface whose ends land on the
// dome's own circle, dropping below the base line where its closing edge can't be seen.
const mound = sketch.loop(
  [
    [DOME_X - inset(344), 344],
    [200, 326],
    [240, 332],
    [286, 322],
    [DOME_X + inset(344), 344],
    [DOME_X + inset(356), 358],
    [DOME_X - inset(356), 358],
  ],
  { color: "#bfd6e1", weight: "confident", fill: { color: sketch.shade(SNOW, { from: "top", amount: 0.24 }), style: "solid" } }
);
scene.add(mound).drawOn({ at: 0.8, duration: 0.7 });

// --- The fir: three stacked wedges, widest at the bottom, on a stub of trunk. Grouped, because
// a tree bends from the ground as one thing, not a tier at a time.
const tree = sketch.group();
const TREE_X = 198;
const TREE_FOOT = 344;
tree.add(
  sketch.loop([[TREE_X - 7, TREE_FOOT], [TREE_X + 7, TREE_FOOT], [TREE_X + 5, 316], [TREE_X - 5, 316]], {
    color: "#3c2a1c",
    weight: "confident",
    fill: { color: "#6b4a2c", style: "solid" },
    smooth: false,
  })
);
([
  [328, 37, 40],
  [300, 30, 34],
  [272, 22, 28],
] as [number, number, number][]).forEach(([baseY, halfW, h]) => {
  tree.add(
    sketch.loop([[TREE_X - halfW, baseY], [TREE_X + halfW, baseY], [TREE_X, baseY - h]], {
      color: "#1f4636",
      weight: "confident",
      fill: { color: sketch.shade("#2f6047", { from: "left", amount: 0.32 }), style: "solid" },
      smooth: false,
    }).lintIgnore("overlap")
  );
});
scene.add(tree);
drawIn(tree.children, { from: 0.9, to: 1.8, each: 0.4 });

// --- The cabin: one wall box, one roof wedge, one lit window — the single warm colour under all
// that cold glass, and the thing that makes the globe read as a scene rather than a decoration.
// smooth: false throughout; a building is the one thing in frame with actual corners.
const cabin = sketch.group();
cabin.add(
  sketch.loop([[256, 338], [302, 338], [302, 306], [256, 306]], {
    color: "#4a2620",
    weight: "confident",
    fill: { color: sketch.shade("#a8543c", { from: "top", amount: 0.28 }), style: "solid" },
    smooth: false,
  })
);
cabin.add(
  sketch.loop([[248, 308], [279, 284], [310, 308]], {
    color: "#8fb3c2",
    weight: "confident",
    fill: { color: "#e9f4f8", style: "solid" },
    smooth: false,
  }).lintIgnore("overlap")
);
cabin.add(
  sketch.loop([[270, 330], [288, 330], [288, 314], [270, 314]], {
    color: "#8a5a22",
    weight: "light",
    fill: { color: "#f4c464", style: "solid" },
    smooth: false,
  }).lintIgnore("overlap")
);
scene.add(cabin);
drawIn(cabin.children, { from: 1.4, to: 2.1, each: 0.4 });

// Two drifts banked against the trunk and the cabin's corner. They also do the quiet job of
// covering the joins, where a straight-edged wall meets a curved snow surface and would
// otherwise leave a sliver of dark background showing under one corner.
const drifts = [
  sketch.blob(202, 342, 14, { color: "#c6dbe4", weight: "light", fill: { color: SNOW, style: "solid" } }, 10),
  sketch.blob(292, 340, 13, { color: "#c6dbe4", weight: "light", fill: { color: SNOW, style: "solid" } }, 10),
];
drifts.forEach((d) => scene.add(d).lintIgnore("overlap"));
drawIn(drifts, { from: 2.05, to: 2.4, each: 0.3 });

// --- The glass. One faint wash across the whole interior plus a rim line: without the wash the
// props read as standing in front of the base rather than sealed inside anything.
scene.add(
  sketch.ellipse(DOME_X, DOME_Y, DOME_R, DOME_R, {
    color: "#b9dae8",
    weight: "bold",
    fill: { color: "#e2f2fa38", style: "solid" },
  }, 40)
).lintIgnore("overlap").drawOn({ at: 2.1, duration: 0.8 });

// --- The wooden base, drawn last so it closes over the dome's bottom edge and the glass reads as
// seated in it. A collar over a wider plinth, both narrowing downward like a turned foot.
const base = sketch.loop(
  [[168, BASE_TOP], [312, BASE_TOP], [330, 410], [150, 410]],
  {
    color: "#3a2312",
    weight: "bold",
    fill: { color: sketch.shade("#7a4a26", { from: "top", amount: 0.34 }), style: "solid" },
    smooth: false,
  }
);
scene.add(base).lintIgnore("overlap").drawOn({ at: 1.2, duration: 0.7 });

const plinth = sketch.loop(
  [[142, 410], [338, 410], [344, 436], [136, 436]],
  {
    color: "#3a2312",
    weight: "bold",
    fill: { color: sketch.shade("#8f5a2e", { from: "top", amount: 0.3 }), style: "solid" },
    smooth: false,
  }
);
scene.add(plinth).lintIgnore("overlap").drawOn({ at: 1.9, duration: 0.5 });

// --- The loop.
// The tree nods, pivoted where its trunk meets the snow. Three degrees: a globe just set down
// settles, it doesn't wave.
tree.pivotAt(TREE_X, TREE_FOOT);
// One slow nod per cycle rather than two, for a second reason on top of the read: "clay" holds
// each seek to a ~10fps step, so the frame the loop closes on can land one hold short of the
// window's end. The slower the swing's approach to its resting angle, the smaller whatever that
// last hold leaves undone — at two nods a cycle the seam measured 55dB, at one it is exact.
swayRotate(tree, 3, 1);

// The highlight: reflected light on the upper left of the glass, brightening and dimming across
// the whole window. pulseFade rests at the dim end, which is also where it lands at the seam, so
// nothing has to be undone by hand.
// A long streak and a short one below it, both hugging the rim: one lonely arc read as a
// scratch on the glass, two parallel ones read as a reflection, which is the whole point.
function glassStreak(fromDeg: number, toDeg: number, r: number) {
  return sketch.stroke(
    Array.from({ length: 8 }, (_, i) => {
      const a = ((fromDeg + (i / 7) * (toDeg - fromDeg)) * Math.PI) / 180;
      return [DOME_X + Math.cos(a) * r, DOME_Y + Math.sin(a) * r] as [number, number];
    }),
    { color: "#ffffff", weight: "bold" }
  );
}
[
  glassStreak(210, 250, DOME_R - 13),
  glassStreak(216, 234, DOME_R - 30),
].forEach((streak, i) => {
  scene.add(streak).lintIgnore("overlap");
  pulseFade(streak, i === 0 ? 0.72 : 0.5, 1, 1);
});

// Flakes. driftOnce only holds a node visible for the middle two thirds of its beat, so putting
// every flake on the same division of the loop empties the glass completely three times a cycle
// — measured, not guessed: two of the first frames I checked had no snow in them at all. Mixing
// three divisions (thirds, quarters, fifths) staggers those gaps against each other, and the fall
// never stops. Every start and end point stays well inside inset(), so no flake crosses the glass.
const b3 = beats(3);
const b4 = beats(4);
const b5 = beats(5);
([
  [206, 190, 9, 7, 112, b3[0]],
  [270, 170, 8, -9, 130, b5[1]],
  [174, 212, 8, 8, 100, b4[1]],
  [304, 222, 9, -7, 88, b3[1]],
  [240, 158, 8, 10, 142, b5[2]],
  [222, 232, 8, -6, 80, b4[2]],
  [288, 262, 8, 7, 58, b3[2]],
  [196, 174, 8, 9, 124, b4[3]],
  [262, 208, 8, -8, 96, b5[4]],
  [186, 246, 8, 6, 74, b5[0]],
  [314, 186, 8, -6, 112, b4[0]],
  [250, 236, 8, 8, 84, b3[0]],
  [172, 186, 8, 7, 118, b5[3]],
  [292, 176, 8, -9, 126, b4[2]],
  [230, 196, 8, -7, 108, b3[1]],
] as [number, number, number, number, number, { at: number; dur: number }][]).forEach(([x, y, r, dx, dy, beat]) => {
  const flake = sketch.blob(x, y, r, { color: "#cfe4ee", weight: "light", fill: { color: "#ffffff", style: "solid" } }, 9);
  scene.add(flake).lintIgnore("overlap");
  driftOnce(flake, dx, dy, beat, { ease: "sine.in", peak: 0.95 });
});

export default scene;
