import { sketch } from "../../src/index.js";
import { drawIn, pulseFade, pulseScale, spin } from "../lib.js";

// A cloud breathing over a turning sync glyph, with a document below it flickering as data moves.

// look: "ink" with a grain wash — the one scene here that is about something soft and remote, so
// a pen-and-paper register with tooth in it suits better than the crisp flat line the router and
// the chart wanted. Warm paper under a cold cloud, with one warm accent on the glyph.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: "#ece3d2",
  seed: "cloud-sync",
  look: "ink",
  texture: "grain",
});

const INK = "#24313f";
const SKY = "#a9c6de";
const ORANGE = "#d4783a";
const PAPER = "#f8f1e1";

const CX = 240;
const GY = 274; // centre of the sync glyph — also its rotation pivot
const R = 58;

// --- The cloud: one closed outline with four lobes over a flat base. Authored as a single loop
// rather than a pile of overlapping blobs, which is what a cloud in this vocabulary usually
// becomes — and which cannot breathe as one shape without the lobes sliding through each other.
const cloud = sketch.loop(
  [
    [118, 190], [104, 168], [110, 142], [132, 128],
    [138, 104], [162, 88], [190, 88],
    [206, 68], [242, 60], [274, 74], [286, 98],
    [312, 92], [340, 104], [350, 130],
    [362, 154], [352, 180], [330, 192],
    [280, 196], [210, 196], [160, 194],
  ],
  { color: INK, weight: "bold", looseness: 0.14, fill: { color: sketch.shade(SKY, { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(cloud).drawOn({ at: 0, duration: 1.3 });

// --- The sync glyph: two arcs of the same circle, 140 degrees each, with a 40-degree gap either
// side, each ending in a two-stroke head that carries on round the turn. Both are generated from
// one loop body offset by 180 degrees, so the pair is exactly point-symmetric about (CX, GY) —
// build them by eye and the group turns with a wobble, because its centre isn't where you think.
const glyph = sketch.group();
const arrowParts: ReturnType<typeof sketch.stroke>[] = [];
for (const base of [0, 180]) {
  const pts = Array.from({ length: 13 }, (_, i) => {
    const a = ((200 + (i / 12) * 140 + base) * Math.PI) / 180;
    return [CX + R * Math.cos(a), GY + R * Math.sin(a)] as [number, number];
  });
  arrowParts.push(sketch.stroke(pts, { color: ORANGE, weight: 9, looseness: 0.16 }));

  // The head sits a little past the arc's own end, along the tangent, so the shaft runs into it
  // instead of stopping short of it — a gap there reads as two unrelated marks.
  const aEnd = ((340 + base) * Math.PI) / 180;
  const tan = Math.atan2(Math.cos(aEnd), -Math.sin(aEnd));
  const tipX = CX + R * Math.cos(aEnd) + Math.cos(tan) * 9;
  const tipY = GY + R * Math.sin(aEnd) + Math.sin(tan) * 9;
  for (const s of [1, -1]) {
    const ang = tan + (s * 148 * Math.PI) / 180;
    arrowParts.push(
      sketch.stroke([[tipX, tipY], [tipX + Math.cos(ang) * 21, tipY + Math.sin(ang) * 21]], {
        color: ORANGE,
        weight: 8,
        looseness: 0.16,
      }).lintIgnore("overlap")
    );
  }
}
arrowParts.forEach((p) => glyph.add(p));
scene.add(glyph);
// Drawn as one sweep per arrow: the shaft, then its own head landing on the end of it.
glyph.stagger(0.16, { at: 1.4, duration: 0.4 });

// --- The document, small and square-cornered under the glyph: the local thing being synced. The
// folded corner is what makes a plain rectangle read as a page.
const doc = sketch.loop(
  [[200, 356], [262, 356], [282, 376], [282, 448], [200, 448]],
  { color: INK, weight: "confident", looseness: 0.12, smooth: false, fill: { color: PAPER, style: "solid" } }
);
scene.add(doc);
const fold = sketch.stroke([[262, 356], [262, 376], [282, 376]], { color: INK, weight: "light", looseness: 0.12, smooth: false });
scene.add(fold).lintIgnore("overlap");

// Four ruled lines of uneven length, each flickering on its own count. Same count on all four and
// the page reads as one lamp switching on and off; four different ones read as rows of data
// arriving independently, which is the whole point of the scene.
const rows: [number, number, number][] = [
  [392, 58, 4],
  [406, 46, 6],
  [420, 62, 3],
  [434, 38, 5],
];
const rowNodes = rows.map(([y, w]) =>
  sketch.stroke([[214, y], [214 + w, y]], { color: "#5f7382", weight: "confident", looseness: 0.2 }).lintIgnore("overlap")
);
rowNodes.forEach((r) => scene.add(r));

drawIn([doc, fold, ...rowNodes], { from: 2.05, to: 2.85, each: 0.22 });

// --- The loop. The glyph turns exactly once: 360 degrees renders identically to 0, so the seam is
// exact, and one slow turn reads as "keeping in step" where three would read as "panicking".
// Pinned at the glyph's own centre — the default origin is measured off the rendered SVG bbox,
// which for a group of drawn-on children includes a pen-tip element parked at the local origin,
// and un-pinned the whole glyph swung out of frame instead of rotating.
glyph.pivotAt(CX, GY);
spin(glyph, 1);

// The cloud breathing twice, pivoted on its own flat base so it swells upward like something
// holding air rather than growing in every direction at once.
cloud.pivotAt(CX, 194);
pulseScale(cloud, 1.035, 2);

rows.forEach(([, , n], i) => pulseFade(rowNodes[i], 0.3, 1, n));

export default scene;
