import { sketch } from "../../src/index.js";
import { appearIn, drawIn, lapAlong, pulseScale, ringPath, ripple, swayRotate } from "../lib.js";

// Two koi circling a round pond seen from above, lily pads breathing on the surface.

const scene = sketch.scene({
  width: 480,
  height: 480,
  background: "#e7dcc4",
  seed: "koi-pond",
  texture: "watercolor",
});

const INK = "#22333a";
const PAD = "#4e7d4a";

// --- The water. One blob, filled with a radial gradient so the middle reads as deep and the
// rim as shallow — a flat teal disc reads as a coin, not a pond.
const pond = sketch.blob(240, 246, 172, {
  color: INK,
  weight: "bold",
  looseness: 0.3,
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#4b8b8c" },
        { offset: 0.7, color: "#2f6a72" },
        { offset: 1, color: "#245259" },
      ],
      type: "radial",
    },
    style: "solid",
  },
}, 16);
scene.add(pond).drawOn({ at: 0, duration: 1.1 });

// A second, inset outline: the wet stone lip of the pond, one line inside the other.
const lip = sketch.blob(240, 246, 156, { color: "#3c6f74", weight: "light", looseness: 0.35 }, 14);
scene.add(lip).lintIgnore("overlap").drawOn({ at: 0.5, duration: 0.9 });

// --- Lily pads: a disc with a wedge cut out of it, the classic notch. smooth:false on the
// notch corners only — a Catmull-Rom through them would round the cut back into the pad.
function pad(cx: number, cy: number, r: number, notchDeg: number): [number, number][] {
  const pts: [number, number][] = [];
  const gap = 32;
  for (let i = 0; i <= 20; i++) {
    const a = ((notchDeg + gap / 2 + (i / 20) * (360 - gap)) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  pts.push([cx, cy]);
  return pts;
}

const pads = [
  { at: [148, 174] as [number, number], r: 34, notch: 200 },
  { at: [330, 214] as [number, number], r: 27, notch: 20 },
  { at: [212, 348] as [number, number], r: 30, notch: 300 },
];
const padNodes = pads.map(({ at: [x, y], r, notch }) =>
  sketch.loop(pad(x, y, r, notch), {
    color: "#2c4b31",
    weight: "confident",
    looseness: 0.22,
    fill: { color: sketch.shade(PAD, { from: "top", amount: 0.3 }), style: "solid" },
  }).lintIgnore("overlap")
);
padNodes.forEach((p) => scene.add(p));
drawIn(padNodes, { from: 1.2, to: 2.2, each: 0.5 });

// A single blossom on the biggest pad — five petals, the one warm note in the whole frame.
const petals = Array.from({ length: 5 }, (_, i) => {
  const a = ((i / 5) * 360 - 90) * (Math.PI / 180);
  const px = 148 + Math.cos(a) * 13;
  const py = 168 + Math.sin(a) * 13;
  return sketch.blob(px, py, 10, {
    color: "#c46a76",
    weight: "light",
    looseness: 0.25,
    fill: { color: "#f2c3c6", style: "solid" },
  }, 9).lintIgnore("overlap");
});
const blossom = sketch.group(petals);
scene.add(blossom);
appearIn(petals, { from: 2.2, to: 2.6, each: 0.4 });
pulseScale(blossom, 1.07, 2);

// --- The koi. Authored nose-right at the top of their own ring, which is where `ringPath`
// starts and where its tangent is exactly horizontal — so `rotate: true` picks the fish up
// facing the way it's already drawn instead of snapping it 90 degrees on frame one.
function koi(cx: number, cy: number, len: number, body: string, spotColor: string) {
  const h = len * 0.34;
  const group = sketch.group();
  group.add(
    sketch.loop(
      [
        [cx - len * 0.5, cy],
        [cx - len * 0.2, cy - h * 0.75],
        [cx + len * 0.2, cy - h * 0.6],
        [cx + len * 0.5, cy],
        [cx + len * 0.2, cy + h * 0.6],
        [cx - len * 0.2, cy + h * 0.75],
      ],
      { color: "#7a3a2e", weight: "confident", looseness: 0.18, fill: { color: body, style: "solid" } }
    )
  );
  // Tail: two thin fins off the back, drawn as one open V so it flutters as a silhouette.
  group.add(
    sketch.loop(
      [
        [cx - len * 0.44, cy],
        [cx - len * 0.78, cy - h * 0.7],
        [cx - len * 0.66, cy],
        [cx - len * 0.78, cy + h * 0.7],
      ],
      { color: "#7a3a2e", weight: "light", looseness: 0.3, fill: { color: body, style: "solid" } }
    ).lintIgnore("overlap")
  );
  for (const [sx, sy, sr] of [
    [cx - len * 0.02, cy - h * 0.22, len * 0.13],
    [cx + len * 0.26, cy + h * 0.1, len * 0.09],
  ] as [number, number, number][]) {
    group.add(sketch.blob(sx, sy, sr, { color: spotColor, weight: "light", looseness: 0.3, fill: { color: spotColor, style: "solid" } }, 8).lintIgnore("overlap"));
  }
  return group;
}

// The big fish takes the outer ring once; the small one takes a tighter inner ring twice, so
// it reads as the quicker of the two without either finishing mid-circuit at the seam.
const outer = ringPath(240, 250, 104, 82);
const inner = ringPath(248, 262, 52, 44);

const bigKoi = koi(240, 250 - 82, 54, "#e07a3c", "#f6ead2");
scene.add(bigKoi);
appearIn(bigKoi.children, { from: 2.3, to: 2.7, each: 0.4 });
lapAlong(bigKoi, outer, 1, { turn: 360 });

const smallKoi = koi(248, 262 - 44, 38, "#f6ead2", "#d9603c");
scene.add(smallKoi);
appearIn(smallKoi.children, { from: 2.5, to: 2.8, each: 0.4 });
lapAlong(smallKoi, inner, 2, { turn: 360 });

// --- Surface ripples: two rings that swell and vanish out of phase with each other, each
// restarting small while it's fully transparent (see lib.ts's ripple()).
const r1 = sketch.ellipse(316, 306, 26, 20, { color: "#c9e5e2", weight: "light", looseness: 0.4 });
scene.add(r1).lintIgnore("overlap");
ripple(r1, 1.9, 2, 0.5);

const r2 = sketch.ellipse(160, 288, 18, 14, { color: "#d6ece8", weight: "light", looseness: 0.4 });
scene.add(r2).lintIgnore("overlap");
ripple(r2, 2.2, 3, 0.4);

// --- Three reeds leaning over the near edge, the only thing in frame that isn't in the
// water. They sway on their own slower rhythm, pivoted at the waterline.
const reeds: [number, number, number, number][] = [
  [92, 402, -34, 3.5],
  [110, 414, -18, 2.5],
  [404, 392, 26, -3],
];
reeds.forEach(([bx, by, tipDx, deg], i) => {
  const reed = sketch.stroke(
    [
      [bx, by],
      [bx + tipDx * 0.4, by - 58],
      [bx + tipDx, by - 104],
    ],
    { color: "#4a6b3c", weight: "confident", looseness: 0.2, energy: "calm" }
  );
  scene.add(reed).drawOn({ at: 2.0 + i * 0.22, duration: 0.5 });
  reed.pivotAt(bx, by);
  swayRotate(reed, deg, 2);
});

export default scene;
