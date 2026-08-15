import { sketch } from "../../src/index.js";
import { beats, drawIn, spin } from "../lib.js";

// One big vermilion shape cycling circle to square to triangle and back, orbited by miniatures of all three.

// look: "ink" — the morph is the whole scene, and ink's sketchiness is what keeps a geometric
// exercise looking hand-made rather than like a CAD tween. morphTo turns line boil off on the
// shape it drives (a re-jitter mid-morph would snap the outline back), so the big form is the
// one still thing in an otherwise breathing frame — the track and the miniatures carry the boil.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#1b4436" },
      { offset: 1, color: "#0b2019" },
    ],
    type: "radial",
  },
  seed: "shape-morph",
  look: "ink",
});

const CX = 240;
const CY = 240;
const INK = "#120c06";
const VERMILION = "#e2582b";
const CREAM = "#f3e6c4";
const AMBER = "#f2c14e";

// --- The three forms, all resampled to exactly N points. morphTo interpolates point-for-point,
// so the circle can only become a square if the square carries the SAME count; a 4-point square
// against a 120-point circle leaves the plugin to invent the correspondence. 120 is the count
// because it divides by 8, 4 AND 3 — the square needs half-edges and full edges, the triangle
// needs thirds, and every one of those has to come out a whole number of samples.
const N = 120;

/** Walks a closed outline, emitting `counts[e]` evenly spaced points along edge `e`. Splitting
 * per edge rather than by one global arc-length step is what keeps the corners ON sample points:
 * a single equal-spacing walk of the whole perimeter lands its samples wherever they fall and
 * chamfers every corner by up to half a step. */
function edgeWalk(verts: [number, number][], counts: number[]): [number, number][] {
  const pts: [number, number][] = [];
  counts.forEach((count, e) => {
    const [x0, y0] = verts[e];
    const [x1, y1] = verts[(e + 1) % verts.length];
    for (let k = 0; k < count; k++) {
      const t = k / count;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  });
  return pts;
}

// The circle starts at the top and runs clockwise; so do the other two. That alignment is free
// correspondence — the circle's point at 30 degrees IS the triangle's right-hand vertex — and
// without it the shape visibly wrings itself out like a cloth mid-morph.
const R = 118;
const CIRCLE = Array.from({ length: N }, (_, k) => {
  const a = (-90 + (k / N) * 360) * (Math.PI / 180);
  return [CX + Math.cos(a) * R, CY + Math.sin(a) * R] as [number, number];
});

// Square, entered at the top edge's midpoint so its own point 0 sits where the circle's does.
const H = 100;
const SQUARE = edgeWalk(
  [
    [CX, CY - H],
    [CX + H, CY - H],
    [CX + H, CY + H],
    [CX - H, CY + H],
    [CX - H, CY - H],
  ],
  [N / 8, N / 4, N / 4, N / 4, N / 8]
);

// Equilateral, circumradius 150 rather than the circle's 118: an inscribed triangle carries
// barely half a circle's area and reads as the form deflating rather than changing.
const TR = 150;
const TRIANGLE = edgeWalk(
  ([-90, 30, 150] as number[]).map((deg) => {
    const a = deg * (Math.PI / 180);
    return [CX + Math.cos(a) * TR, CY + Math.sin(a) * TR] as [number, number];
  }),
  [N / 3, N / 3, N / 3]
);

// --- The orbit track, drawn first so the miniatures have something to be riding on.
scene.add(
  sketch.ellipse(CX, CY, 186, 186, { color: "#3f7a5f", weight: "light", looseness: 0.2 }, 40)
).lintIgnore("overlap").drawOn({ at: 0, duration: 1.0 });

// --- The subject, built as two morphing shapes rather than one outlined shape. A stroked
// outline was the first attempt and it fell apart mid-morph: rough.js draws an outline as two
// jittered passes, MorphSVG interpolates each of them independently of the fill, and 40% of the
// way from a circle to a square that resolves into black dashes floating inside the form. A
// slightly larger dark shape morphing behind an identical vermilion one gives the same read —
// a bold dark edge around a flat colour — out of fills alone, which morph cleanly.
// smooth: false on both: a square pushed through a Catmull-Rom is a lozenge, and the corners
// arriving crisply is the entire payoff of the morph.
const EDGE_K = 1.05;
function edged(pts: [number, number][]): [number, number][] {
  return pts.map(([x, y]) => [CX + (x - CX) * EDGE_K, CY + (y - CY) * EDGE_K] as [number, number]);
}
const shellStyle = {
  color: "#00000000",
  weight: "light" as const,
  looseness: 0,
  energy: "calm" as const,
  smooth: false,
  fill: { color: INK, style: "solid" as const },
};
// The reveal is a ghost outline that draws itself and hands over, because drawOn CANNOT be used
// on a shape that later morphs: its reveal is a mask built from the shape's own clean path, and
// that mask stays on the node forever. A square morphing inside a circle-shaped mask has its
// corners sliced off along an arc 125px from centre — which is exactly what the first pass
// rendered, and it looked like a morph fidelity problem rather than a clipping one.
const ghost = sketch.loop(edged(CIRCLE), {
  color: INK,
  weight: "bold",
  looseness: 0,
  energy: "calm",
  smooth: false,
});
scene.add(ghost).lintIgnore("overlap").drawOn({ at: 0.5, duration: 1.5 });
ghost.fadeTo(0, { at: 2.4, duration: 0.35 });

const shell = sketch.loop(edged(CIRCLE), shellStyle);
scene.add(shell).lintIgnore("overlap").appear({ at: 2.15, duration: 0.5 });

const form = sketch.loop(CIRCLE, {
  color: "#00000000",
  weight: "light",
  looseness: 0,
  energy: "calm",
  smooth: false,
  fill: { color: VERMILION, style: "solid" },
});
scene.add(form).lintIgnore("overlap").appear({ at: 2.3, duration: 0.5 });

// --- Three miniatures of the three forms the big shape becomes, riding the track. They say
// what the loop is about before it has happened, and they only ever do the simple thing.
const minis = sketch.group();
const MINI: [number, number, string][] = [
  [-90, 0, CREAM], // circle
  [30, 1, AMBER], // square
  [150, 2, CREAM], // triangle
];
MINI.forEach(([deg, kind, color]) => {
  const a = deg * (Math.PI / 180);
  const mx = CX + Math.cos(a) * 186;
  const my = CY + Math.sin(a) * 186;
  const style = { color: INK, weight: "confident" as const, looseness: 0.15, smooth: kind === 0, fill: { color, style: "solid" as const } };
  if (kind === 0) minis.add(sketch.ellipse(mx, my, 21, 21, style, 18));
  else if (kind === 1) minis.add(sketch.loop(edgeWalk([[mx - 18, my - 18], [mx + 18, my - 18], [mx + 18, my + 18], [mx - 18, my + 18]], [1, 1, 1, 1]), style));
  else minis.add(sketch.loop([[mx, my - 22], [mx + 19, my + 12], [mx - 19, my + 12]], style));
});
scene.add(minis);
drawIn(minis.children, { from: 2.1, to: 2.75, each: 0.3 });
// One lap per loop, and the pivot is the track's own centre — a rotation with no explicit pivot
// resolves its origin to the SVG's (0, 0) and swings the miniatures out of frame entirely.
minis.pivotAt(CX, CY);
spin(minis, 1);

// --- The cycle. One beat per form, each morph taking most of its beat and holding the arrived
// shape for the rest, so all three forms actually register instead of the outline never sitting
// still. The last morph MUST target CIRCLE, the authored point list: the loop's first frame is
// the state before any op has run, so anything else leaves a hard cut at the seam.
// Shell and form take the identical schedule, so the dark edge never lags behind the colour.
const [b1, b2, b3] = beats(3);
([
  [b1.at, SQUARE],
  [b2.at, TRIANGLE],
  [b3.at, CIRCLE],
] as [number, [number, number][]][]).forEach(([at, target]) => {
  shell.morphTo(edged(target), { at, duration: 0.8, ease: "power2.inOut" });
  form.morphTo(target, { at, duration: 0.8, ease: "power2.inOut" });
});

export default scene;
