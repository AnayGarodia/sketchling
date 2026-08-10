import { sketch } from "../../src/index.js";

// Gallery/showcase demo for RESTRAINT as a technique — the deliberate opposite of
// nightfall-hill.ts's density. One small silhouette figure, a huge muted sky, a bare
// tree, almost nothing else. No cartoon eyes, no bright fills, no squash-stretch —
// weight and mood carried by negative space, a slow gait, and a desaturated dusk
// gradient applied to EVERY shape in the frame (sky, water, embankment, tree), not just
// the figure. Proves the "storybook / animated-short" register is reachable with
// existing primitives — the earlier showcase pieces read as bright mascot cartoons
// because of the authoring choices (saturated palette, big cartoon eyes, dense parallax),
// not because the engine can't do this.

const W = 640;
const H = 400;
const GROUND_Y = 300;

function circlePoints(cx: number, cy: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

const scene = sketch.scene({
  width: W,
  height: H,
  background: {
    stops: [
      { offset: 0, color: "#525f77" },
      { offset: 0.45, color: "#9a8f8c" },
      { offset: 0.78, color: "#d7a97a" },
      { offset: 1, color: "#eecd9c" },
    ],
    direction: "vertical",
  },
  seed: "quiet-crossing",
  look: "ink",
  texture: "grain",
});

// Water below the embankment — a flat muted band, a shade darker/cooler than the sky
// it half-reflects. No wave detail: a suggestion, not a rendering.
scene.add(
  sketch.loop(
    [
      [0, GROUND_Y + 34],
      [W, GROUND_Y + 34],
      [W, H],
      [0, H],
    ],
    {
      color: "#00000000",
      weight: "light",
      fill: {
        color: { stops: [{ offset: 0, color: "#8b8378" }, { offset: 1, color: "#5c5850" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 0, duration: 0.01 });

// The embankment / raised path — the one recurring F&D-style compositional device: a
// long horizontal band the figure walks along, sky above, water below.
scene.add(
  sketch.loop(
    [
      [0, GROUND_Y],
      [W, GROUND_Y],
      [W, GROUND_Y + 34],
      [0, GROUND_Y + 34],
    ],
    {
      color: "#3a3226",
      weight: "confident",
      looseness: 0.1,
      fill: {
        color: { stops: [{ offset: 0, color: "#877b5c" }, { offset: 1, color: "#4a4636" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).drawOn({ at: 0, duration: 1.2 });

// A single bare tree — trunk + a handful of branch strokes, no filled canopy. Avoids
// blob()'s wobble-at-scale floor entirely (see nightfall-hill.ts / roaree-v2.ts gotcha)
// and reads as a wistful autumn/winter silhouette rather than a cartoon canopy.
const SIL = "#100d09";
const TREE_X = 470;
const tree = sketch.group();
scene.add(tree);
tree.add(
  sketch.loop(
    [
      [TREE_X - 5, GROUND_Y],
      [TREE_X + 5, GROUND_Y],
      [TREE_X + 3, GROUND_Y - 95],
      [TREE_X - 3, GROUND_Y - 95],
    ],
    { color: SIL, weight: "confident", looseness: 0.15, fill: { color: SIL, style: "solid" }, smooth: false }
  )
);
const branches: [number, number][][] = [
  [[TREE_X, GROUND_Y - 95], [TREE_X - 34, GROUND_Y - 128], [TREE_X - 52, GROUND_Y - 118]],
  [[TREE_X, GROUND_Y - 95], [TREE_X - 34, GROUND_Y - 128], [TREE_X - 46, GROUND_Y - 148]],
  [[TREE_X, GROUND_Y - 95], [TREE_X + 30, GROUND_Y - 122], [TREE_X + 50, GROUND_Y - 108]],
  [[TREE_X, GROUND_Y - 95], [TREE_X + 22, GROUND_Y - 130], [TREE_X + 18, GROUND_Y - 156]],
  [[TREE_X, GROUND_Y - 95], [TREE_X + 4, GROUND_Y - 135], [TREE_X - 10, GROUND_Y - 158]],
];
for (const b of branches) {
  tree.add(sketch.stroke(b, { color: SIL, weight: "confident", looseness: 0.2, smooth: true }));
}
tree.drawOn({ at: 0.4, duration: 1.4 });

// A thin sparse reed cluster at the water's edge — the only "detail" allowed near the
// ground, deliberately understated. Alternating lean instead of Math.random(): the same
// render has to reproduce byte-identically every run, like every other scene here (this
// was the one example in the repo still rolling real randomness per build).
for (const [i, rx] of [40, 55, 68, 585, 600].entries()) {
  scene.add(
    sketch.stroke(
      [[rx, GROUND_Y + 30], [rx + (i % 2 === 0 ? 4 : -4), GROUND_Y - 8]],
      { color: "#241f16", weight: "light", looseness: 0.25 }
    )
  ).drawOn({ at: 0.2, duration: 0.6 });
}

// The figure — a solid silhouette loop, no face, no big eyes, naturalistic proportions,
// small in frame. Two-part body (torso + simple bent legs) is enough to read as a
// walking person from this distance; anything more detailed would fight the silhouette.
function buildWalker(): { group: ReturnType<typeof sketch.group>; legL: any; legR: any } {
  const g = sketch.group();
  scene.add(g);
  // Tapered coat/cloak torso (narrow shoulders, wide hem) instead of a boxy rectangle —
  // reads as a figure in clothing, not a blob. Shoulders at y:-62, head bottom at y:-64
  // (radius 9 from a y:-73 center) leaves a real neck gap instead of head and torso fusing
  // into one lump. The arm is folded INTO this single outline (the small bump on the right
  // side, elbow bent, hand tucked near the hem) rather than a separate rotated shape — a
  // loop that only overlaps the torso by proximity visibly detaches the instant it rotates
  // even a little, since the pivot sits right at the torso's own edge, not inside it. One
  // continuous silhouette can't ever show a seam because there isn't one to begin with; a
  // motionless arm reads fine at this scale and this gait's speed anyway.
  g.add(
    sketch.loop(
      [
        [-7, -62], [7, -62], [12, -55], [17, -40], [13, -26], [16, -8],
        [-16, -8], [-12, -55],
      ],
      { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true }
    )
  );
  g.add(sketch.blob(0, -73, 9, { color: SIL, weight: "confident", looseness: 0.08, fill: { color: SIL, style: "solid" } }, 12));
  // Legs hang from the coat hem (y:-8), each a simple tapered wedge offset from center for
  // stride width — NOT sharing one crossing point, which is what made the old two-loop legs
  // splay into an X. Each is pivoted at its own hip point (its local top-center), so
  // rotateTo swings it from the hip like a real leg instead of spinning around the whole
  // leg's own bounding-box center (the root cause of the "horrible" splayed look).
  const legL = sketch.loop(
    [[2, -8], [-6, -8], [-9, 44], [0, 44]],
    { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true }
  );
  legL.pivotAt(-2, -8);
  const legR = sketch.loop(
    [[-2, -8], [6, -8], [9, 44], [0, 44]],
    { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true }
  );
  legR.pivotAt(2, -8);
  g.add(legL);
  g.add(legR);
  return { group: g, legL, legR };
}

const walker = buildWalker();
walker.group.initial({ x: 120, y: GROUND_Y - 4 });

const WALK_START = 1.6;
const STEP_DUR = 1.1;
const STEPS = 7;
// Short enough that the walker's path stops clear of the tree canopy (branches reach to
// TREE_X - 52 = 418) instead of passing directly under/through it — an earlier version
// walked the figure's head straight into the branches mid-frame, reading as antlers.
const STEP_DX = 35;
const WALK_END = WALK_START + STEPS * STEP_DUR;

walker.group.appear({ at: WALK_START - 0.4, duration: 0.4 });

// A slow, weighted gait: long steps, sine easing, a faint vertical bob — patient timing
// instead of a bouncy cartoon walk cycle. No squashTo anywhere in this scene.
for (let i = 0; i < STEPS; i++) {
  const at = WALK_START + i * STEP_DUR;
  walker.group.moveBy(STEP_DX, 0, { at, duration: STEP_DUR, ease: "sine.inOut" });
  walker.group.moveBy(0, -3, { at, duration: STEP_DUR / 2, ease: "sine.out" });
  walker.group.moveBy(0, 3, { at: at + STEP_DUR / 2, duration: STEP_DUR / 2, ease: "sine.in" });
  walker.legL.rotateTo(i % 2 === 0 ? 24 : -24, { at, duration: STEP_DUR, ease: "sine.inOut" });
  walker.legR.rotateTo(i % 2 === 0 ? -24 : 24, { at, duration: STEP_DUR, ease: "sine.inOut" });
}

// Long stillness before and after — patience is part of the register. The camera pan
// below runs through WALK_END + 2.5, which reserves that as the scene's overall length.

// A near-imperceptible drift, not a push-in — the frame barely breathes. panTo takes an
// ABSOLUTE scene-space point to center on (not a delta) — the default center for a 640x400
// canvas is (320, 200), so a barely-perceptible drift targets a point just off that.
scene.camera().panTo(326, 198, { at: 0, duration: WALK_END + 2.5, ease: "sine.inOut" });

// Sparse waltz: a slow 3/4 piano figure, one held cello-register pad note underneath.
// No percussion, no melody doubling — restraint in the score matches restraint on screen.
scene.add(sketch.sound("D2", { at: 0, duration: WALK_END + 2.5, instrument: "pad", velocity: 0.18 }));
const waltz: [string, number][] = [
  ["A3", 0], ["E4", 0.9], ["C4", 1.5],
  ["G3", 3.3], ["D4", 4.2], ["B3", 4.8],
  ["F3", 6.6], ["C4", 7.5], ["A3", 8.1],
];
for (const [pitch, offset] of waltz) {
  scene.add(sketch.sound(pitch, { at: WALK_START + offset, duration: 1.0, instrument: "piano", velocity: 0.32 }));
}
scene.add(sketch.sound("E3", { at: WALK_END, duration: 2.2, instrument: "strings", velocity: 0.22 }));

export default scene;
