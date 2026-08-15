import { sketch } from "../../src/index.js";
import { LOOP_LEN, beats, pulseScale } from "../lib.js";

// A 6x6 grid of blocks on hot ochre, with a swell travelling diagonally across it like a wave through a net.

// look: "flat" — a lattice of 36 squares is the one subject with nowhere to hide a wobble: any
// jitter at all and the columns stop lining up, which is the whole read. smooth: false on every
// cell for the same reason (a square through a Catmull-Rom comes out a lozenge).
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#eeb02c" },
      { offset: 1, color: "#c07c17" },
    ],
  },
  seed: "breathing-grid",
  look: "flat",
});

// Four colours on one hot ground, banded by (i + j) in threes — so the palette itself lays
// down fat diagonal stripes running the same way the wave travels, cool corner to warm one. A
// single colour for all 36 cells reads as graph paper, and cycling three colours per diagonal
// (the first pass) reads as a checkerboard: the bands have to be wider than the wave is fast.
const BAND = ["#16304f", "#0f5f58", "#b83f22", "#f2dcae"];
const EDGE = "#2a1c0d";

const N = 6;
const PITCH = 62;
const HALF = 22; // 44px cells with 18px of ground between them — the gaps are what the wave closes
const ORIGIN = 240 - ((N - 1) * PITCH) / 2; // 85, so the whole lattice is centred in frame

function square(cx: number, cy: number, h: number): [number, number][] {
  return [
    [cx - h, cy - h],
    [cx + h, cy - h],
    [cx + h, cy + h],
    [cx - h, cy + h],
  ];
}

// Cells are built in diagonal order (by i + j) rather than row-major, so ONE `stagger` on the
// group draws them on as a diagonal sweep — the reveal rehearses the motion the loop then
// repeats, and 36 hand-written drawOn calls would say nothing extra.
const cells: { node: ReturnType<typeof sketch.loop>; diag: number }[] = [];
for (let d = 0; d <= (N - 1) * 2; d++) {
  for (let i = 0; i < N; i++) {
    const j = d - i;
    if (j < 0 || j >= N) continue;
    const cx = ORIGIN + i * PITCH;
    const cy = ORIGIN + j * PITCH;
    const node = sketch.loop(square(cx, cy, HALF), {
      color: EDGE,
      weight: "confident",
      looseness: 0,
      smooth: false,
      fill: { color: BAND[Math.min(BAND.length - 1, Math.floor(d / 3))], style: "solid" },
    });
    // Every cell swells about its own middle. The pivot is not optional: a scale with no
    // explicit pivot resolves its origin to the SVG's own (0, 0), which slides each cell down
    // the diagonal away from its slot instead of growing it in place.
    node.pivotAt(cx, cy);
    cells.push({ node, diag: d });
  }
}

const grid = sketch.group(cells.map((c) => c.node));
scene.add(grid);
grid.stagger(0.055, { at: 0.2, duration: 0.34, effect: "drawOn" });

// --- The wave. Every cell gets the SAME beats and the same swell; what differs is where
// inside its beat the swell happens, offset by the cell's own diagonal. That offset is the
// whole trick — every helper in lib.ts starts its first beat at LOOP_START, so a grid built
// out of plain pulseScale calls throbs in unison no matter what amplitudes it is given. Taking
// the beat from `beats()` and hand-placing the pair inside it (the same move `driftOnce` makes)
// buys the phase back, and each pair still ends on scale 1 — the resting value — so the seam
// closes on its own.
const WAVES = 2; // two unhurried passes rather than three hurried ones — see SPREAD below
const SWELL = 1.4; // at the crest a cell is 61.6px against a 62px pitch: the gaps close, then reopen
const PULSE = 0.4; // how long one cell's own swell-and-return takes
// The crest is only as narrow as PULSE is short relative to SPREAD: at three waves per loop
// there was so little spread left inside a beat that eight of the eleven diagonals were up at
// once, which is the whole-grid throb this scene is supposed to avoid. Two waves buy 1.19s of
// spread against a 0.4s pulse — a crest about four diagonals wide, which reads as travelling.
const SPREAD = LOOP_LEN / WAVES - PULSE - 0.06;
const maxDiag = (N - 1) * 2;
for (const { at } of beats(WAVES)) {
  for (const { node, diag } of cells) {
    const off = (diag / maxDiag) * SPREAD;
    node.scaleTo(SWELL, { at: at + off, duration: PULSE / 2, ease: "sine.inOut" });
    node.scaleTo(1, { at: at + off + PULSE / 2, duration: PULSE / 2, ease: "sine.inOut" });
  }
}

// One slow breath of the whole lattice underneath the wave, on the group rather than the cells
// — a second scaleTo on a cell would be two tweens fighting over the same axis, but the parent's
// own scale composes with its children's instead. It also gives the loop a cyclic op that spans
// the entire window, which the per-cell pulses (each parked inside its own beat) don't.
grid.pivotAt(240, 240);
pulseScale(grid, 1.05, 1);

export default scene;
