import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, pulseScale, swayRotate } from "../lib.js";

// A blossom branch across the top of the frame against a pale moon, petals coming loose and falling.

// look: "ink" with texture: "watercolor" — the obvious register for the subject, and picked for a
// concrete reason rather than the association: five overlapping petal blobs per cluster leave hard
// seams where their outlines cross, and watercolor's bleed melts those seams into one flower.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#cfdae8" },
      { offset: 0.48, color: "#e6dfe6" },
      { offset: 1, color: "#f6ebdf" },
    ],
  },
  seed: "cherry-blossom",
  texture: "watercolor",
});

const BARK = "#4a3128";
const PETAL = "#f7cedb";
const PETAL_LINE = "#c9798f";

// --- The moon, first and furthest back. It is here to hold the bottom half of the frame: a branch
// across the top of an empty sky is a composition with nothing under it, and the pale disc gives
// the falling petals something to fall ACROSS.
scene.add(
  sketch.ellipse(310, 296, 94, 94, {
    color: "#efe4d4",
    weight: "light",
    looseness: 0.25,
    fill: { color: "#fbf4e6", style: "solid" },
  }, 34)
).drawOn({ at: 0, duration: 0.9 });

// --- The bough as a tapering ribbon rather than a stroke: a cherry branch is a heavy, woody thing
// and a line of even width reads as wire. Offsetting the spine in y (not x) is what makes a
// horizontal limb taper along its length.
function bough(spine: [number, number][], w0: number, w1: number) {
  const half = (i: number) => (w0 + ((w1 - w0) * i) / (spine.length - 1)) / 2;
  const under = spine.map(([x, y], i) => [x, y + half(i)] as [number, number]);
  const over = spine.map(([x, y], i) => [x, y - half(i)] as [number, number]).reverse();
  return sketch.loop([...under, ...over], {
    color: "#33221b",
    weight: "confident",
    looseness: 0.22,
    fill: { color: sketch.shade("#5d3d2d", { from: "top", amount: 0.32 }), style: "solid" },
  });
}

// Everything woody and everything flowering goes in ONE group, so the whole branch nods as a
// single limb. A bough that nods while its own blossoms hold still reads as two drawings.
const branch = sketch.group();
const ANCHOR: [number, number] = [8, 76];

branch.add(bough([[8, 76], [98, 104], [188, 120], [280, 142], [374, 154], [474, 180]], 26, 7));

// Side branches: strokes are right for these — they're thin enough that a ribbon's two edges would
// collapse into one another anyway.
const twigs: [number, number][][] = [
  [[98, 104], [116, 76], [138, 52], [162, 40]],
  [[280, 142], [296, 176], [300, 214], [296, 244]],
  [[374, 154], [392, 128], [406, 106]],
  [[188, 120], [206, 100], [222, 92]],
];
twigs.forEach((pts) =>
  branch.add(sketch.stroke(pts, { color: BARK, weight: "confident", looseness: 0.24, energy: "calm" }).lintIgnore("overlap"))
);

// --- A cluster: five petals round a centre, the arrangement the eye actually checks for. The
// centre disc goes on last so the petals read as sitting behind it.
function cluster(cx: number, cy: number, r: number) {
  const g = sketch.group();
  for (let i = 0; i < 5; i++) {
    const a = ((i / 5) * 360 - 90) * (Math.PI / 180);
    g.add(
      sketch.blob(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, r, {
        color: PETAL_LINE,
        weight: "light",
        looseness: 0.26,
        fill: { color: sketch.shade(PETAL, { from: "top", amount: 0.22 }), style: "solid" },
      }, 9).lintIgnore("overlap")
    );
  }
  g.add(
    sketch.ellipse(cx, cy, r * 0.38, r * 0.38, {
      color: "#b9722f",
      weight: "light",
      looseness: 0.2,
      fill: { color: "#f5c66a", style: "solid" },
    }, 12).lintIgnore("overlap")
  );
  return g;
}

const clusters = ([
  [58, 88, 13],
  [164, 38, 12],
  [226, 90, 11],
  [296, 248, 13],
  [408, 102, 12],
  [452, 188, 11],
] as [number, number, number][]).map(([cx, cy, r]) => {
  const c = cluster(cx, cy, r);
  branch.add(c);
  return c;
});

// --- The bud: one flower still shut, on the twig that hangs down over the moon where there's room
// for the eye to notice it. Its own little group so it can breathe without the cluster beside it
// swelling too.
const bud = sketch.group();
const BUD_BASE: [number, number] = [300, 212];
bud.add(
  sketch.loop(
    [[300, 186], [310, 198], [308, 210], [300, 216], [292, 210], [290, 198]],
    {
      color: PETAL_LINE,
      weight: "confident",
      looseness: 0.24,
      fill: { color: sketch.shade("#f2b9ca", { from: "top", amount: 0.26 }), style: "solid" },
    }
  )
);
bud.add(
  sketch.stroke([[292, 212], [286, 222]], { color: "#6d7d46", weight: "light", looseness: 0.3 }).lintIgnore("overlap")
);
bud.add(
  sketch.stroke([[308, 212], [314, 222]], { color: "#6d7d46", weight: "light", looseness: 0.3 }).lintIgnore("overlap")
);
branch.add(bud);

scene.add(branch);

// --- Reveal: the bough traces itself on first, then the twigs grow off it, then the flowers land
// as one short shower. Thirty-odd petal blobs drawn one at a time would use the whole reveal on
// blossom and none of it on the branch that has to carry them.
branch.children[0].drawOn({ at: 0.4, duration: 1.2 });
drawIn(branch.children.slice(1, 5), { from: 1.3, to: 2.1, each: 0.35 });
appearIn(clusters.map((c) => c.children).flat(), { from: 1.8, to: 2.6, each: 0.45 });
bud.stagger(0.1, { at: 2.5, duration: 0.3 });

// --- The loop.
// The branch nods from where it leaves the frame, which is the only place a limb this long could
// pivot. Barely over a degree: at 460px of reach even that swings the far clusters a good ten
// pixels, and anything more reads as a branch being shaken rather than one in a breeze.
branch.pivotAt(...ANCHOR);
swayRotate(branch, 1.2, 2);

// The bud opening and easing shut again — the one thing in frame that changes size, and the reason
// to look at the lower half at all. Pivoted at its own base so it swells up off the twig.
bud.pivotAt(...BUD_BASE);
pulseScale(bud, 1.16, 2);

// --- The petals coming loose. Each is a single blob on its own beat, and the beats are spread over
// three different divisions of the loop rather than one: on a single division every petal fades out
// in the same instant, and the fall stops dead three times a cycle.
const b3 = beats(3);
const b4 = beats(4);
const b5 = beats(5);
([
  [126, 116, 12, -34, 236, b3[0]],
  [232, 118, 11, 28, 214, b4[1]],
  [404, 134, 12, -30, 252, b5[1]],
  [66, 116, 11, 22, 268, b4[2]],
  [300, 268, 11, 34, 172, b3[1]],
  [452, 210, 11, -26, 224, b5[3]],
  [176, 66, 10, 30, 288, b3[2]],
  [356, 176, 11, -22, 240, b4[3]],
  [92, 132, 11, 26, 252, b5[0]],
  [268, 132, 10, -30, 226, b4[0]],
  [430, 158, 11, 22, 236, b3[1]],
  [150, 96, 11, -24, 274, b5[2]],
] as [number, number, number, number, number, { at: number; dur: number }][]).forEach(([x, y, s, dx, dy, beat]) => {
  // A loose blob read as a bubble at this size — the notched, pointed outline is what makes a
  // single detached petal read as a petal rather than as a stray dot of pink.
  const petal = sketch.loop(
    [
      [x, y - s],
      [x + s * 0.92, y - s * 0.28],
      [x + s * 0.58, y + s * 0.82],
      [x, y + s * 0.5],
      [x - s * 0.58, y + s * 0.82],
      [x - s * 0.92, y - s * 0.28],
    ],
    {
      color: PETAL_LINE,
      weight: "light",
      looseness: 0.28,
      fill: { color: sketch.shade(PETAL, { from: "top", amount: 0.22 }), style: "solid" },
    }
  );
  scene.add(petal).lintIgnore("overlap");
  // sine.inOut on the drift, not a linear fall: a petal's weight is nothing next to the air, so it
  // slows and gathers rather than dropping at a constant rate.
  driftOnce(petal, dx, dy, beat, { ease: "sine.inOut", peak: 0.95 });
});

export default scene;
