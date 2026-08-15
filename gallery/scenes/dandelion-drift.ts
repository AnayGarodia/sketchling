import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, swayRotate } from "../lib.js";

// A dandelion clock at dusk, swaying while five seeds lift off it into the upper right.

// Dusk, warming toward the horizon: the seeds are pale fluff, and pale fluff only glows if the
// thing behind it is dark. On a cream ground this whole scene would be invisible.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#20334e" },
      { offset: 0.6, color: "#41506b" },
      { offset: 1, color: "#a3786a" },
    ],
  },
  seed: "dandelion-drift",
  look: "ink",
});

const STEM = "#6f8a5c";
const LEAF = "#3d5a34";
const FLUFF = "#e9e5d4";
const DARK = "#1c2530";

type P = [number, number];

const BASE: P = [236, 404];
const HEAD: P = [200, 168];
// The clock is the subject, so it gets to be big: at 44px radius it survived a full-size render
// and vanished in a twelve-up grid.
const R = 58;

// --- Ground: one dark silhouette across the bottom. Everything below the horizon is one value,
// so the only things the eye has to read are the stem and the seeds.
scene.add(
  sketch.loop(
    [
      [0, 408],
      [110, 398],
      [236, 404],
      [352, 396],
      [480, 404],
      [480, 480],
      [0, 480],
    ],
    { color: "#141c26", weight: "confident", looseness: 0.28, fill: { color: sketch.shade(DARK, { from: "top", amount: 0.28 }), style: "solid" } }
  )
).drawOn({ at: 0, duration: 0.8 });

// A few blades either side, dark against the warm horizon band — they set the scale of the
// dandelion, which otherwise could be any size at all.
const blades = ([
  [92, 404, 62, 344],
  [126, 400, 146, 350],
  [332, 400, 356, 342],
  [372, 402, 350, 356],
  [404, 404, 428, 358],
] as [number, number, number, number][]).map(([bx, by, tx, ty]) =>
  sketch.stroke([[bx, by], [bx + (tx - bx) * 0.35, (by + ty) / 2], [tx, ty]], {
    color: "#2e4038",
    weight: "confident",
    looseness: 0.3,
  })
);
blades.forEach((b) => scene.add(b));
appearIn(blades, { from: 0.6, to: 1.1, each: 0.3 });

// --- Dandelion leaves: the deep-toothed rosette the plant is actually named for. smooth:false,
// because the whole point of these is the sharp teeth — a spline rounds them into tongues.
function toothedLeaf(bx: number, by: number, tx: number, ty: number, w: number): P[] {
  const len = Math.hypot(tx - bx, ty - by);
  const ux = (tx - bx) / len;
  const uy = (ty - by) / len;
  const steps = 7;
  const pts: P[] = [[bx, by]];
  for (let s = 1; s <= steps; s++) {
    const t = s / (steps + 1);
    const o = w * (s % 2 === 1 ? 1 : 0.45);
    pts.push([bx + ux * len * t - uy * o, by + uy * len * t + ux * o]);
  }
  pts.push([tx, ty]);
  for (let s = steps; s >= 1; s--) {
    const t = s / (steps + 1);
    const o = w * (s % 2 === 1 ? 1 : 0.45);
    pts.push([bx + ux * len * t + uy * o, by + uy * len * t - ux * o]);
  }
  return pts;
}

const leaves = ([
  [232, 398, 142, 372, 14, 3],
  [240, 400, 326, 384, 12, -2.5],
  [236, 404, 288, 420, 10, 2],
] as [number, number, number, number, number, number][]).map(([bx, by, tx, ty, w, deg]) => {
  const l = sketch.loop(toothedLeaf(bx, by, tx, ty, w), {
    color: "#33502c",
    weight: "confident",
    looseness: 0.2,
    smooth: false,
    fill: { color: sketch.shade(LEAF, { from: "top", amount: 0.34 }), style: "solid" },
  });
  scene.add(l).lintIgnore("overlap");
  l.pivotAt(bx, by);
  swayRotate(l, deg, 2);
  return l;
});
drawIn(leaves, { from: 1.0, to: 1.6, each: 0.35 });

// --- The plant proper: stem, calyx, and the seedhead, all in one group pivoted at the ground so
// the whole thing bends from the root. The head is a nested group inside it, so it can lag a
// beat behind the stem instead of being welded rigidly to the top of it.
const stem = sketch.stroke(
  [
    [BASE[0], BASE[1]],
    [228, 342],
    [214, 274],
    [201, 228],
  ],
  { color: STEM, weight: "bold", looseness: 0.18, energy: "calm" }
);
// The calyx hangs BELOW the head's lower rim on purpose — tucked inside it, the stem appears to
// stop in mid-fluff and the head reads as balanced on a stick rather than held by one.
const calyx = sketch.loop(
  [
    [194, 238],
    [208, 238],
    [204, 214],
    [198, 214],
  ],
  { color: "#5d7a4c", weight: "confident", looseness: 0.2, fill: { color: STEM, style: "solid" } }
);

// A soft glow under the spokes: the fluff of a real clock is a mass, not 30 separate hairs. It
// has to be a RADIAL gradient fading to a transparent stop, though — a flat low-alpha fill has
// a hard rim, and a hard rim behind a starburst reads as a coin someone drew a sun on.
const halo = sketch.ellipse(HEAD[0], HEAD[1], R + 8, R + 6, {
  color: "#00000000",
  weight: "light",
  looseness: 0,
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#f2eedd4d" },
        { offset: 0.62, color: "#f2eedd33" },
        { offset: 1, color: "#f2eedd00" },
      ],
      type: "radial",
    },
    style: "solid",
  },
}).lintIgnore("overlap");

// Spokes radiating from the receptacle, with a wedge left bare on the upper right — the side the
// seeds are leaving from. A completely full head and seeds in the air is a contradiction.
// Every other spoke gets a two-hair fork at its tip: the density belongs at the RIM, which is
// where a real pappus opens out, and bare radii alone read as a compass rose.
const spokes: ReturnType<typeof sketch.stroke>[] = [];
for (let i = 0; i < 34; i++) {
  const deg = (i / 34) * 360;
  if (deg > 288 && deg < 344) continue;
  const a = (deg * Math.PI) / 180;
  const len = R * (0.82 + ((i * 5) % 7) * 0.026);
  const tip: P = [HEAD[0] + Math.cos(a) * len, HEAD[1] + Math.sin(a) * len];
  spokes.push(
    sketch.stroke([[HEAD[0] + Math.cos(a) * 9, HEAD[1] + Math.sin(a) * 9], tip], {
      color: FLUFF,
      weight: "light",
      looseness: 0.22,
    }).lintIgnore("overlap")
  );
  if (i % 2 === 0) {
    for (const off of [-0.42, 0.42]) {
      spokes.push(
        sketch.stroke([tip, [tip[0] + Math.cos(a + off) * 7, tip[1] + Math.sin(a + off) * 7]], {
          color: FLUFF,
          weight: "light",
          looseness: 0.3,
        }).lintIgnore("overlap")
      );
    }
  }
}
const receptacle = sketch.blob(HEAD[0], HEAD[1], 11, {
  color: "#4e6340",
  weight: "confident",
  looseness: 0.3,
  fill: { color: "#8aa06a", style: "solid" },
}, 9).lintIgnore("overlap");

const head = sketch.group([halo, ...spokes, receptacle]);
const plant = sketch.group([stem, calyx, head]);
scene.add(plant);
stem.drawOn({ at: 1.5, duration: 0.55 });
calyx.drawOn({ at: 2.0, duration: 0.2 });
halo.appear({ at: 2.0, duration: 0.3 });
appearIn(spokes, { from: 2.1, to: 2.55, each: 0.28 });
receptacle.drawOn({ at: 2.6, duration: 0.22 });

// The stem bends from the ground; the head lags behind it on a slower count and a smaller angle,
// pivoted where the stem actually holds it. Two rotations on two different nodes, so they
// compose into one soft whip instead of fighting over one property.
plant.pivotAt(BASE[0], BASE[1]);
swayRotate(plant, 3.2, 2);
head.pivotAt(201, 228);
swayRotate(head, -2, 3);

// --- The event of the loop: seeds letting go. Each is a dot, a short stalk, and a crown of six
// hairs — the parachute is the read, and a bare dot would be a crumb.
function seed(x: number, y: number) {
  const g = sketch.group();
  g.add(sketch.ellipse(x, y + 15, 4, 6, { color: "#c9bd9a", weight: "light", looseness: 0.2, fill: { color: "#e2d7b6", style: "solid" } }, 10));
  g.add(sketch.stroke([[x, y + 11], [x, y]], { color: "#d8d2bd", weight: "light", looseness: 0.2 }).lintIgnore("overlap"));
  for (let i = 0; i < 6; i++) {
    const a = (-160 + i * 24) * (Math.PI / 180);
    g.add(
      sketch.stroke([[x, y], [x + Math.cos(a) * 13, y + Math.sin(a) * 13]], {
        color: FLUFF,
        weight: "light",
        looseness: 0.25,
      }).lintIgnore("overlap")
    );
  }
  return g;
}

// Staggered across two different beat counts rather than five equal ones. Five beats meant a
// 0.66s beat, and a seed crossing 150px in half a second darts like a wasp — a seed has to waft.
// The 1.1s and 1.65s beats give two travel speeds, which also reads as two distances away.
const slow = beats(2);
const mid = beats(3);
// The two seeds sharing t=3.0 need genuinely different lanes, not just different speeds: on a
// first pass both climbed at roughly the same angle and met in the top right corner as one clump.
// The odd-indexed ones now fly flat and far, the even ones steep and short.
([
  [246, 120, 104, -96],
  [282, 152, 176, -44],
  [256, 100, 130, -70],
  [268, 138, 150, -96],
  [240, 108, 118, -58],
] as [number, number, number, number][]).forEach(([x, y, dx, dy], i) => {
  const s = seed(x, y);
  scene.add(s);
  const beat = i % 2 === 0 ? mid[i / 2] : slow[(i - 1) / 2];
  driftOnce(s, dx, dy, beat, { ease: "sine.out", peak: 0.95 });
});

export default scene;
