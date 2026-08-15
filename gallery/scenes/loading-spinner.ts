import { sketch } from "../../src/index.js";
import { beats, spin } from "../lib.js";

// A hand-drawn indeterminate spinner turning over the word "loading", with three dots pulsing along.

// The one dark scene in this batch, and it earns it: a spinner is a lit thing on a dim screen,
// and on warm paper the amber ramp that carries the whole rotation would have nothing to glow
// against. look: "ink" keeps the pen-drawn edge that stops it reading as a rendered UI asset.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#252e3a" },
      { offset: 1, color: "#161c25" },
    ],
  },
  seed: "loading-spinner",
  look: "ink",
});

const CX = 240;
const CY = 196;
const INNER = 62;
const OUTER = 116;
const CREAM = "#ece1cb";

// Amber at eleven strengths, head to tail. Authored as alpha suffixes on one accent rather than
// eleven hand-picked colours, so the ramp is actually monotonic — eyeballed hex steps weren't.
const AMBER = "#f0a24a";
const RIM = "#8a5722";
const RAMP = ["ff", "f2", "dd", "c6", "ae", "96", "7e", "68", "52", "3e", "2c"];

// --- The spinner: eleven of twelve spoke slots filled, so the ring is broken rather than
// closed — that gap plus the alpha ramp is what says "indeterminate, still going" instead of
// "progress bar bent into a circle". A faint track ring rides just outside the tips, which is
// what keeps eleven separate wedges reading as one wheel.
const spinner = sketch.group();
const track = sketch.ellipse(CX, CY, 121, 121, { color: "#3b4859", weight: "light" }, 40);
spinner.add(track);

const spokes = RAMP.map((a, i) => {
  const ang = -Math.PI / 2 + (i / 12) * Math.PI * 2;
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  // Perpendicular, for the two half-widths: narrow at the hub, chunky at the rim, so each spoke
  // reads as a segment of a thick broken ring. Tapered the other way round (fat at the hub) the
  // whole thing rendered as a sunburst — handsome, but not a spinner.
  const px = -uy;
  const py = ux;
  const wi = 4;
  const wo = 8.5;
  return sketch.loop(
    [
      [CX + ux * INNER + px * wi, CY + uy * INNER + py * wi],
      [CX + ux * OUTER + px * wo, CY + uy * OUTER + py * wo],
      [CX + ux * OUTER - px * wo, CY + uy * OUTER - py * wo],
      [CX + ux * INNER - px * wi, CY + uy * INNER - py * wi],
    ],
    { color: RIM + a, weight: "confident", looseness: 0.12, smooth: false, fill: { color: AMBER + a, style: "solid" } }
  ).lintIgnore("overlap");
});
spokes.forEach((s) => spinner.add(s));

scene.add(spinner);
// One sweep round the ring rather than twelve separate beats — a spinner is one object, and the
// sweep itself already reads as the direction it is about to turn in. The track is the group's
// first child, so it draws first and the spokes land onto it.
spinner.stagger(0.12, { at: 0.5, duration: 0.55 });

// --- The wait motif: one lowercase word, hand-lettered, and the three dots under it. The word
// is what makes an abstract turning ring legible as a UI state instead of a decorative wheel.
const label = sketch.text("loading", 189, 326, { color: CREAM, weight: "confident", looseness: 0.2 }, { size: 30 });
scene.add(label);
// The tittle on the "i" is one plotted point by design, which is exactly the shape the
// degenerate-area check exists to catch everywhere else.
label.children.forEach((c) => c.lintIgnore("degenerate"));
label.stagger(0.05, { at: 1.9, duration: 0.5 });

// --- The loop. Two whole turns across the window: 720 degrees renders identically to 0, so the
// seam is exact, and two turns read as "working steadily" where one reads as "nearly stopped".
// The hub is pinned with pivotAt even though it IS the group's own centre: the default origin is
// measured off the rendered SVG bbox, and a group of drawn-on children carries one pen-tip
// element per child parked at the local origin, which drags that measured centre far enough
// off-hub that the whole ring orbits out of frame instead of turning. Rendered and checked.
spinner.pivotAt(CX, CY);
spin(spinner, 2);

// The dots take one beat each from beats(3), which is the trick that turns three identical
// pulses into a travelling one — same helper, different beat, no phase arithmetic. They rest at
// three-quarter strength rather than invisible: a `pulseFade` on all three would pulse them in
// lockstep, and a `driftOnce` each would blank two of the three at any given moment. Any dimmer
// than this and cream on a navy ground reads as three specks of grey lint.
beats(3).forEach(({ at, dur }, i) => {
  const dot = sketch.ellipse(196 + i * 44, 404, 13, 13, { color: "#d6c194", weight: "light", fill: { color: CREAM, style: "solid" } }, 18);
  scene.add(dot);
  // Same pivot reason as the ring above — an unpinned scaleTo on a drawn-on node swells it away
  // from its own centre, which threw the first dot clean off the bottom of the canvas.
  dot.pivotAt(196 + i * 44, 404);
  dot.initial({ opacity: 0.72 });
  dot.drawOn({ at: 2.4 + i * 0.14, duration: 0.2 });
  // Scale and opacity are different property buckets, so these two compose instead of fighting;
  // both land back on the resting value well before the next dot's beat opens.
  dot.scaleTo(1.42, { at, duration: dur * 0.22, ease: "sine.out" });
  dot.scaleTo(1, { at: at + dur * 0.22, duration: dur * 0.3, ease: "sine.in" });
  dot.fadeTo(1, { at, duration: dur * 0.22, ease: "sine.out" });
  dot.fadeTo(0.72, { at: at + dur * 0.22, duration: dur * 0.3, ease: "sine.in" });
});

export default scene;
