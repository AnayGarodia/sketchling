import { sketch } from "../../src/index.js";

type Pt = [number, number];

// Showcase: a campfire as an actual LIGHT SOURCE, not just a bright shape in the frame.
// Same restrained silhouette register as quiet-crossing.ts / quiet-ride.ts (look: "ink" +
// texture: "grain", small no-face figures at naturalistic proportions, patient timing, most
// of the frame given to empty sky) — but where those two take one ambient dusk gradient and
// apply it to every shape uniformly, everything warm here radiates from one point at
// (FIRE_X, FIRE_BASE_Y) and everything away from it stays cool and dark:
//
//   - the sky carries NO warmth at all, only cool night stops, so the fire is the single
//     source of every warm pixel in the frame;
//   - the ground's firelight pool is four concentric alpha-stepped ellipses, because an SVG
//     linearGradient can't do radial falloff — a vertical gradient would light the pool's far
//     edge as brightly as its middle, which is exactly what a point source doesn't do;
//   - each seated figure's fill is a HORIZONTAL gradient whose warm stop sits on whichever
//     side the fire is actually on (dark→warm for the storyteller on the fire's left,
//     warm→dark for the listeners on its right), plus a thin warm rim stroke along the
//     fire-facing contour of the head and knee — rim light, the cue that makes a silhouette
//     read as backlit rather than just black;
//   - the figure sitting BEHIND the fire gets no gradient and no rim at all, just flat
//     near-black: it's between the light and nothing, fully backlit from the camera's side,
//     so any warm edge on it would be a lie;
//   - the ring stones are lit on TOP (the flames sit above the log bed), and every ground
//     shadow stretches directly away from the fire, not straight down.
//
// The story beat is one readable gesture, not a journey: the teller's arm comes up, the
// circle leans in, the arm comes down. One separately animated limb in the whole scene.
//
// docs/showcase-campfire-story.png is rendered with `--at 5.6` rather than at the settled end
// state most of the gallery stills use, and for a structural reason rather than taste: an
// emitter reserves timeline duration through its own last particle's (spawnTime + lifetime),
// so tl.duration() is always at least a full lifetime past the final spark's death. A scene
// whose whole point is sparks in flight therefore CANNOT have any alive in its own end frame —
// no emission window can outrun the duration it reserves. The mid-gesture frame is the honest
// thumbnail; the mp4 still runs the full timeline as usual.

const W = 640;
const H = 420;
const HORIZON_Y = 330;
const FIRE_X = 300;
const FIRE_BASE_Y = 358;
const FLAME_BASE_Y = 352;
const TOTAL = 13.4;

// Deterministic hash instead of Math.random — every render has the same star field and the
// same flame flicker, the way every other seeded thing in this library does.
function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 3.7) * 43758.5453;
  return x - Math.floor(x);
}

// blob() keeps a ~15% wobble floor even at looseness 0 (see nightfall-hill.ts's own note), so
// anything that has to read as a clean disc/ellipse at size — the glow pools, the ember bed,
// the heads, the ring stones — is a hand-plotted trig ellipse through loop() instead.
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n = 28): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

// An open arc, for a rim-light stroke hugging one side of a head.
function arcPoints(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 9): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

const scene = sketch.scene({
  width: W,
  height: H,
  // Deliberately no warm stop anywhere in the sky: the dusk afterglow quiet-crossing.ts
  // leans on would compete with the fire for "where is the light coming from."
  //
  // Not as dark as a night sky "should" be, and on purpose. texture: "grain" blends a
  // noise-driven black layer over the frame in `overlay` mode, which for source values near
  // zero collapses them onto a handful of output levels — the first pass authored this sky at
  // #05070f..#1b1f2c and the render came back visibly banded, sampling at only 0/13/22/28/34
  // per channel across the whole sky. Keeping the darkest stop around luminance 30 instead of
  // 8 restores a smooth gradient under the same filter, and costs nothing legibility-wise:
  // the fire is still by far the brightest thing in frame, and near-black figures read BETTER
  // against a sky with some value in it than against one already at zero.
  background: {
    stops: [
      { offset: 0, color: "#131b30" },
      { offset: 0.3, color: "#18213a" },
      { offset: 0.58, color: "#202a48" },
      { offset: 0.76, color: "#2a3253" },
      { offset: 1, color: "#211d26" },
    ],
    direction: "vertical",
  },
  seed: "campfire-story",
  look: "ink",
  texture: "grain",
});

// --- Sky: a sparse star field, dimmer toward the horizon (atmosphere), a handful of them
// slowly breathing. Restrained count — the emptiness above the fire is the point. ---------
// A star is the one thing in this scene SMALLER than ink's own jitter: roughOptionsFor maps
// looseness/energy to absolute rough.js roughness+bowing, and at the defaults (roughness
// 1.26, bowing 1.1, a 3px "confident" stroke) a 2px dot renders as a ~12px torn-paper
// scribble — the first pass looked like confetti over the sky, not stars. looseness 0 +
// energy "calm" + a 1px stroke keeps it a dot, and a plotted trig circle sidesteps blob()'s
// own 15%-of-radius wobble floor on top of that.
const STAR_TINTS = ["#dbe1f0", "#aeb8d2", "#e8dcc4"];
const STAR_COUNT = 42;
for (let i = 0; i < STAR_COUNT; i++) {
  // Golden-ratio x against a stratified, jittered y — two independent rnd() draws per star
  // clumped visibly (a diagonal run of four in the first pass reads as an artifact, not a
  // constellation), and an even spread is what actually looks like sky.
  const sx = 10 + (((i * 0.6180339887) % 1) * (W - 20));
  const sy = 14 + ((i + 0.3 + 0.6 * rnd(i * 5 + 2)) / STAR_COUNT) * 244;
  const r = 1 + rnd(i * 3 + 3) * 0.9;
  // Fades with height: near the horizon haze eats them, overhead they're at full strength.
  const brightness = 0.24 + 0.5 * (1 - sy / 262);
  const star = sketch.loop(ellipsePoints(sx, sy, r, r, 10), {
    color: STAR_TINTS[i % 3],
    weight: 0.9,
    looseness: 0,
    energy: "calm",
    smooth: true,
    fill: { color: STAR_TINTS[i % 3], style: "solid" },
  });
  scene.add(star).initial({ opacity: 0 });
  star.fadeTo(brightness, { at: 0.05 + i * 0.012, duration: 1.1, ease: "sine.out" });
  if (i % 7 === 3) {
    star.fadeTo(brightness * 0.35, { at: 2.4 + i * 0.11, duration: 1.9, ease: "sine.inOut" });
    star.fadeTo(brightness, { at: 4.3 + i * 0.11, duration: 2.2, ease: "sine.inOut" });
  }
}

// --- Distance: two cool ridge silhouettes above the horizon line. Cool and hazy is the
// whole job here — the fire's light has no reach this far back, so nothing out here is warm.
scene.add(
  sketch.loop(
    [
      [-24, 322], [60, 300], [150, 313], [250, 296], [350, 309],
      [450, 292], [550, 307], [664, 299], [664, 340], [-24, 340],
    ],
    {
      color: "#1a2138",
      weight: "light",
      looseness: 0.1,
      smooth: true,
      fill: { color: { stops: [{ offset: 0, color: "#232b45" }, { offset: 1, color: "#1a2138" }], direction: "vertical" }, style: "solid" },
    }
  )
).appear({ at: 0, duration: 0.8 });

// Bare distant trees on the far ridge — strokes only, no filled canopy (same reason
// quiet-crossing.ts's tree is bare: a blob canopy at this size reads as a cartoon lollipop).
for (const [tx, ty, th] of [[96, 305, 40], [158, 312, 32], [548, 306, 36]] as [number, number, number][]) {
  const t = sketch.group();
  scene.add(t);
  t.add(sketch.stroke([[tx, ty], [tx + 1, ty - th]], { color: "#20293c", weight: "light", looseness: 0.2 }));
  t.add(sketch.stroke([[tx + 1, ty - th * 0.6], [tx - 9, ty - th * 0.95]], { color: "#20293c", weight: "light", looseness: 0.25 }));
  t.add(sketch.stroke([[tx + 1, ty - th * 0.7], [tx + 10, ty - th * 1.05]], { color: "#20293c", weight: "light", looseness: 0.25 }));
  t.appear({ at: 0.2, duration: 0.7 });
}

scene.add(
  sketch.loop(
    [[-24, 331], [120, 319], [300, 327], [480, 317], [664, 325], [664, 342], [-24, 342]],
    { color: "#151b2c", weight: "light", looseness: 0.08, smooth: true, fill: { color: "#161d2e", style: "solid" } }
  )
).appear({ at: 0.1, duration: 0.8 });

// --- The ground plane. Cool where it meets the horizon (unlit distance), warmer and darker
// underfoot — the actual firelight on it is the pool below, not this base tone. -----------
scene.add(
  sketch.loop(
    [[-24, HORIZON_Y], [664, HORIZON_Y], [664, H + 24], [-24, H + 24]],
    {
      color: "#191c26",
      weight: "light",
      looseness: 0.05,
      smooth: false,
      fill: {
        color: {
          stops: [
            { offset: 0, color: "#242a38" },
            { offset: 0.3, color: "#2b2118" },
            { offset: 0.7, color: "#1f1710" },
            { offset: 1, color: "#17110c" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    }
  )
  // appear, not drawOn: a mask sweeping across a shape this large reads as a dark stripe
  // crossing the frame rather than as a pen drawing a line. drawOn is kept for the small
  // shapes below (logs, ring stones, flames) where the trace actually reads as a trace.
).appear({ at: 0.15, duration: 1.0 });

// --- The firelight pool on the ground: four concentric alpha-stepped ellipses, brightest
// at the fire and falling off outward. A single linearGradient can't fall off radially from
// a point (it would light the pool's outer left/right edges as brightly as its middle, at
// the same y), and stacked low-alpha solids under texture: "grain" blend into a soft falloff.
const glowRings: ReturnType<typeof sketch.loop>[] = [];
for (const [rx, ry, dy, col] of [
  [232, 42, 10, "#94481a14"],
  [176, 33, 8, "#a8501c22"],
  [116, 24, 5, "#c464243c"],
  [64, 14, 3, "#e2853a50"],
] as [number, number, number, string][]) {
  const ring = sketch.loop(ellipsePoints(FIRE_X, FIRE_BASE_Y + dy, rx, ry, 34), {
    color: "#00000000",
    weight: "light",
    looseness: 0.12,
    smooth: true,
    fill: { color: col, style: "solid" },
  });
  scene.add(ring).initial({ opacity: 0 });
  glowRings.push(ring);
}

// Airglow immediately around the flames — the light doesn't stop at the ground, the hot air
// over a fire carries it too. Kept small and tight to the flame on purpose: against a sky
// this dark, ANY ellipse wide enough to read as atmosphere also shows its own hard elliptical
// edge, and the first two passes both put a visible pale dome behind the fire that read as a
// hill rather than as light in the air. Small enough to hide inside the flame's own falloff
// is the only version that works.
for (const [cy, rx, ry, col] of [
  [FLAME_BASE_Y - 22, 30, 24, "#c1651f14"],
  [FLAME_BASE_Y - 14, 20, 15, "#d47a2a1c"],
] as [number, number, number, string][]) {
  const halo = sketch.loop(ellipsePoints(FIRE_X, cy, rx, ry, 30), {
    color: "#00000000",
    weight: "light",
    looseness: 0.18,
    smooth: true,
    fill: { color: col, style: "solid" },
  });
  scene.add(halo).initial({ opacity: 0 });
  glowRings.push(halo);
}
for (let i = 0; i < glowRings.length; i++) {
  glowRings[i].fadeTo(1, { at: 0.9 + i * 0.12, duration: 1.2, ease: "sine.out" });
}

// --- Figures ------------------------------------------------------------------------------
// One builder, four placements. Local space: (0, 0) is the seat/ground contact under the
// hips, authored facing right and mirrored through `facing` — so the group's own
// initial({x, y}) lands the seat exactly on the ground, and pivotAt(0, 0) leans the whole
// body over that contact point instead of swinging it around its chest.
const SHADE_NEAR = "#0c0a08";
const SHADE_CORE = "#120c06";
const BACKLIT = "#08070c";
const RIM = "#d5883fb0";

type Lit = "left" | "right" | "none";

// The warm stop is deliberately squeezed into the last ~26% of the shape's width. A wider
// ramp (the first pass ran warm from 0.55) floods the whole knee mass with mid-brown, and a
// seated figure's drawn-up knees stop reading as legs and start reading as a drum or basket
// held in the lap — light wrapping too far around a form reads as a different object, not a
// brighter one. Everything but the fire-facing sliver stays near-black.
function bodyFill(lit: Lit, warm: string) {
  if (lit === "none") return { color: BACKLIT, style: "solid" as const };
  const stops =
    lit === "right"
      ? [{ offset: 0, color: SHADE_NEAR }, { offset: 0.74, color: SHADE_CORE }, { offset: 1, color: warm }]
      : [{ offset: 0, color: warm }, { offset: 0.26, color: SHADE_CORE }, { offset: 1, color: SHADE_NEAR }];
  return { color: { stops, direction: "horizontal" as const }, style: "solid" as const };
}

// Two seated silhouettes: knees drawn up and hugged, or cross-legged and flatter. Enough
// variety that four figures around one fire don't read as four copies, without any of them
// needing a face to tell them apart. Both keep the torso taller than the leg mass is wide —
// the proportion that makes a compact shape read as a person sitting rather than a boulder.
// The knee is a PEAK with a diagonal shin running down off it, not a plateau with a vertical
// front. The earlier version's flat-topped, straight-fronted leg mass read as a drum or a
// bag sitting in the lap however dark it was shaded — the giveaway was silhouette, not value.
const OUTLINE_HUG: Pt[] = [
  [-16, 0], [-22, -14], [-24, -32], [-18, -46],
  [-7, -44], [-3, -31], [5, -36], [13, -32],
  [16, -19], [19, -5], [13, 1], [2, -2], [-8, -2],
];
const OUTLINE_CROSS: Pt[] = [
  [-15, 0], [-20, -17], [-21, -35], [-15, -47],
  [-5, -45], [-2, -29], [7, -23], [15, -14],
  [19, -4], [11, 2], [-2, 2],
];

interface FigureSpec {
  x: number;
  seatY: number;
  s: number;
  facing: 1 | -1;
  lit: Lit;
  variant: "hug" | "cross";
  warm: string;
}

function buildFigure(spec: FigureSpec) {
  const { s, facing, lit, warm } = spec;
  const g = sketch.group();
  scene.add(g);
  const P = (p: Pt): Pt => [p[0] * s * facing, p[1] * s];

  const outline = (spec.variant === "hug" ? OUTLINE_HUG : OUTLINE_CROSS).map(P);
  g.add(
    sketch.loop(outline, {
      color: lit === "none" ? BACKLIT : SHADE_NEAR,
      weight: "confident",
      looseness: 0.1,
      smooth: true,
      fill: bodyFill(lit, warm),
    })
  );

  // Head as a trig ellipse (slightly taller than wide), with a real neck gap under it —
  // shoulders top out at -45/-46, the head's underside sits at -48, so head and torso read
  // as two forms instead of fusing into one lump (quiet-crossing.ts's own fix).
  const hx = (spec.variant === "hug" ? -12 : -10) * s * facing;
  const hy = -57 * s;
  const hrx = 8.2 * s;
  const hry = 9 * s;
  g.add(
    sketch.loop(ellipsePoints(hx, hy, hrx, hry, 18), {
      color: lit === "none" ? BACKLIT : SHADE_NEAR,
      weight: "confident",
      looseness: 0.09,
      smooth: true,
      fill: bodyFill(lit, warm),
    })
  );

  // Rim light: a thin warm arc down the fire-facing side of the head, plus a short warm
  // edge along the fire-facing knee. Omitted entirely for the backlit figure behind the
  // fire — it has no fire-facing side the camera can see.
  if (lit !== "none") {
    const a0 = lit === "right" ? -74 : 254;
    const a1 = lit === "right" ? 46 : 134;
    g.add(sketch.stroke(arcPoints(hx, hy, hrx * 1.04, hry * 1.04, a0, a1, 9), { color: RIM, weight: "light", looseness: 0.1 }));
    // Only the knee's top ridge, not its whole front contour — a rim tracing the full edge
    // outlines the shape instead of catching one facet of it, which is what made the leg mass
    // look like a separate object with a handle in the first pass.
    const knee: Pt[] = spec.variant === "hug" ? [[5, -36], [13, -32]] : [[7, -23], [15, -14]];
    g.add(sketch.stroke(knee.map(P), { color: RIM, weight: "light", looseness: 0.12 }));
  }

  return g;
}

// A ground shadow per figure, cast directly AWAY from the fire (not straight down) and
// stretched along that direction — kept outside the figure's own group so a lean doesn't
// rotate the shadow with the body.
function castShadow(x: number, y: number, s: number, awayFromFire: number) {
  return scene.add(
    sketch.loop(ellipsePoints(x + awayFromFire * 15 * s, y + 3 * s, 33 * s, 6.5 * s, 22), {
      color: "#00000000",
      weight: "light",
      looseness: 0.2,
      smooth: true,
      fill: { color: "#0806055c", style: "solid" },
    })
  ).initial({ opacity: 0 });
}

const SPECS: (FigureSpec & { lean: number })[] = [
  // The teller, on the fire's left: lit on its right side, leaning into the fire (+, clockwise).
  { x: 198, seatY: 372, s: 1.06, facing: 1, lit: "right", variant: "hug", warm: "#2c1408", lean: 3.2 },
  // Two listeners on the fire's right: lit on their left, leaning left (-, anticlockwise).
  { x: 402, seatY: 374, s: 1.02, facing: -1, lit: "left", variant: "cross", warm: "#2a1206", lean: -4.2 },
  // Furthest from the fire, so a dimmer warm stop and a smaller scale — falloff, by hand.
  { x: 468, seatY: 358, s: 0.84, facing: -1, lit: "left", variant: "hug", warm: "#1d0e04", lean: -3.4 },
  // Behind the fire: fully backlit, flat near-black, no rim, partly occluded by the flames
  // (added to the scene before them).
  { x: 320, seatY: 344, s: 0.78, facing: -1, lit: "none", variant: "cross", warm: "#000000", lean: -2.6 },
];

const figures: { group: ReturnType<typeof sketch.group>; spec: FigureSpec & { lean: number } }[] = [];
for (let i = 0; i < SPECS.length; i++) {
  const spec = SPECS[i];
  const at = 1.5 + i * 0.28;
  // The backlit figure casts no visible shadow toward the camera — its shadow falls straight
  // away from us, behind it, where there's nothing to catch it.
  if (spec.lit !== "none") {
    castShadow(spec.x, spec.seatY, spec.s, spec.x < FIRE_X ? -1 : 1).fadeTo(1, { at, duration: 0.8, ease: "sine.out" });
  }
  const g = buildFigure(spec);
  // initial({x, y}) lands local (0, 0) — authored as the seat/ground contact, not the bbox
  // centre — on (x, seatY), so nobody floats above or sinks into the ground.
  g.initial({ x: spec.x, y: spec.seatY, opacity: 0 });
  g.pivotAt(0, 0);
  g.fadeTo(1, { at, duration: 0.7, ease: "sine.out" });
  figures.push({ group: g, spec });
}

const teller = figures[0];

// The teller's arm — the ONE separately animated limb in the scene, pivoted at a shoulder
// point that sits well INSIDE the torso outline (at that height the back edge is ~-24 and the
// chest front ~-3, so a pivot at -13 is ~10px clear of both), not on it: a pivot at the
// silhouette's edge visibly tears the limb off the body the moment it turns (quiet-crossing.ts
// hit exactly that and fused its arm into the outline instead — this one genuinely has to
// move, so it keeps the pivot deep and a root wide enough to stay buried in the torso mass
// through the full swing). Authored in the figure's own local space, same as the pivot: a
// child node's own translate is 0, and the renderer subtracts a node's translate from its
// pivot, so both live in the pre-group-translate space the points were written in.
// Flat near-black, and deliberately NO rim stroke on it: the rim on every other form marks
// the surface facing the fire, and once this arm is up, its outer surface faces the sky. A
// warm edge along it would keep pointing at a light source that isn't there — a raised limb
// against a dark sky already reads as a silhouette without help.
const AS = SPECS[0].s;
const armWedge: Pt[] = [
  [-18, -40], [-12, -37], [-2, -26], [9, -15],
  [5, -11], [-4, -21], [-17, -34],
];
const tellerArm = sketch.group();
teller.group.add(tellerArm);
tellerArm.add(
  sketch.loop(armWedge.map((p) => [p[0] * AS, p[1] * AS] as Pt), {
    color: "#100c08",
    weight: "confident",
    looseness: 0.1,
    smooth: true,
    fill: { color: "#100c08", style: "solid" },
  })
);
tellerArm.pivotAt(-13 * AS, -36 * AS);

// --- The fire ----------------------------------------------------------------------------
// Log bed first: two crossed logs, dark on their undersides with a lit top edge, because the
// flames are above them. Then an ember bed, then three nested flame layers.
const LOG_DARK = "#231a12";
scene.add(
  sketch.loop([[270, 364], [322, 349], [329, 355], [277, 370]], {
    color: "#170f0a", weight: "confident", looseness: 0.12, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#6b3a18" }, { offset: 0.45, color: LOG_DARK }, { offset: 1, color: "#100b08" }], direction: "vertical" }, style: "solid" },
  })
).drawOn({ at: 0.5, duration: 0.5 });
scene.add(
  sketch.loop([[281, 349], [333, 364], [327, 370], [275, 355]], {
    color: "#170f0a", weight: "confident", looseness: 0.12, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#5d3214" }, { offset: 0.45, color: LOG_DARK }, { offset: 1, color: "#100b08" }], direction: "vertical" }, style: "solid" },
  })
).drawOn({ at: 0.75, duration: 0.5 });

const emberBed = sketch.loop(ellipsePoints(FIRE_X, FIRE_BASE_Y - 1, 23, 7, 20), {
  color: "#00000000", weight: "light", looseness: 0.2, smooth: true,
  fill: { color: "#d9601ecc", style: "solid" },
});
scene.add(emberBed).initial({ opacity: 0 });
emberBed.fadeTo(1, { at: 0.9, duration: 0.9, ease: "sine.out" });
const emberCore = sketch.loop(ellipsePoints(FIRE_X, FIRE_BASE_Y - 2, 12, 4, 16), {
  color: "#00000000", weight: "light", looseness: 0.2, smooth: true,
  fill: { color: "#f6b45ddd", style: "solid" },
});
scene.add(emberCore).initial({ opacity: 0 });
emberCore.fadeTo(1, { at: 1.0, duration: 0.8, ease: "sine.out" });

// A flame as a leaning teardrop: wide at the log bed, tapering to an off-centre tip.
function flamePoints(cx: number, by: number, w: number, h: number, lean: number): Pt[] {
  return [
    [cx - w / 2, by],
    [cx - w * 0.44, by - h * 0.34],
    [cx - w * 0.16 + lean * 0.4, by - h * 0.62],
    [cx + lean, by - h],
    [cx + w * 0.2 + lean * 0.5, by - h * 0.58],
    [cx + w * 0.46, by - h * 0.3],
    [cx + w / 2, by],
  ];
}

// Outer flame is the deepest orange (cooler, more radiative loss at the edges), the core is
// nearly white — the same "brightest at the source" logic the ground pool follows.
const flameLayers: { node: ReturnType<typeof sketch.loop>; phase: number; amp: number }[] = [];
// Each layer is decisively smaller than the one behind it, and the pale core is kept tiny.
// The first pass gave the core nearly half the outer flame's height with matching flicker
// amplitude, and the inner layers kept punching out through the outer silhouette mid-squash —
// the whole fire read as a pale cone of cloth with orange trim rather than a flame.
const FLAME_SPECS: [number, number, number, string, string, number][] = [
  [35, 52, -3, "#8d2c0b", "#c8531a", 0.0],
  [20, 31, 2, "#cf6019", "#e78b2f", 0.19],
  [9, 15, -1, "#f6c477", "#fbdda3", 0.11],
];
for (let i = 0; i < FLAME_SPECS.length; i++) {
  const [w, h, lean, top, bottom, phase] = FLAME_SPECS[i];
  const f = sketch.loop(flamePoints(FIRE_X, FLAME_BASE_Y, w, h, lean), {
    color: "#00000000",
    weight: "light",
    looseness: 0.16,
    energy: "quick",
    smooth: true,
    fill: { color: { stops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], direction: "vertical" }, style: "solid" },
  });
  scene.add(f);
  f.pivotAt(FIRE_X, FLAME_BASE_Y);
  f.drawOn({ at: 0.95 + i * 0.13, duration: 0.4 });
  flameLayers.push({ node: f, phase, amp: 0.9 - i * 0.28 });
}

// Flicker: every layer squashes from its own base (pivotAt above) and sways a few degrees on
// its own phase, so the three don't move as one rigid shape. Deterministic from rnd(), so
// the flicker is identical every render like everything else here.
const FIRE_LIT = 1.3;
for (let li = 0; li < flameLayers.length; li++) {
  const { node, phase, amp } = flameLayers[li];
  let k = 0;
  for (let t = FIRE_LIT + phase; t < TOTAL; t += 0.4, k++) {
    const a = rnd(k + li * 71);
    const b = rnd(k + li * 71 + 33);
    const c = rnd(k + li * 71 + 66);
    node.squashTo(1 + (a - 0.5) * 0.12 * amp, 1 + (b - 0.5) * 0.22 * amp, { at: t, duration: 0.4, ease: "sine.inOut" });
    node.rotateTo((c - 0.5) * 5 * amp, { at: t, duration: 0.4, ease: "sine.inOut" });
  }
}
// The whole pool of light breathes with the flames rather than sitting at a constant level —
// the cue that ties the ground/air glow to the fire instead of looking like a painted patch.
for (let gi = 0; gi < glowRings.length; gi++) {
  let k = 0;
  for (let t = FIRE_LIT + 0.9 + gi * 0.07; t < TOTAL; t += 0.8, k++) {
    glowRings[gi].fadeTo(0.74 + rnd(k + gi * 17) * 0.26, { at: t, duration: 0.8, ease: "sine.inOut" });
  }
}

// Ring stones around the fire, lit on top (the flames are above them) and dark underneath.
for (const [sx, sy, rx, ry] of [
  [248, 362, 13, 8], [274, 374, 11, 7], [326, 375, 12, 7], [352, 365, 11, 7], [338, 347, 9, 5.5],
] as [number, number, number, number][]) {
  scene.add(
    sketch.loop(ellipsePoints(sx, sy, rx, ry, 16), {
      color: "#0b0806",
      weight: "light",
      looseness: 0.1,
      smooth: true,
      fill: { color: { stops: [{ offset: 0, color: "#55311a" }, { offset: 0.6, color: "#231710" }, { offset: 1, color: "#0e0a07" }], direction: "vertical" }, style: "solid" },
    })
  ).drawOn({ at: 0.35, duration: 0.4 });
}

// --- Sparks: warm dots rising against the cool sky, with NEGATIVE gravity so they
// accelerate upward the way hot air actually carries them, rather than arcing back down.
// buildParticles draws each one as an rc.circle() through the emitter's own style, so a spark
// needs the same jitter discipline the stars do — at the style defaults a 4px spark comes out
// as a ~12px scrap of torn paper drifting over the fire.
function sparkStyle(color: string) {
  return { color, weight: 1, looseness: 0, energy: "calm" as const, fill: { color, style: "solid" as const } };
}
scene.add(
  sketch.particles(FIRE_X, FLAME_BASE_Y - 22, sparkStyle("#f2b25c"), {
    count: 48, angle: -90, spread: 46, speedMin: 22, speedMax: 66,
    gravity: -14, lifetime: 2.6, duration: 9.4, at: 1.4, sizeMin: 1.1, sizeMax: 2.2,
  })
);
// A second, slower, redder emitter on a wider cone — embers that drift rather than shoot.
scene.add(
  sketch.particles(FIRE_X, FLAME_BASE_Y - 8, sparkStyle("#dd7a35"), {
    count: 20, angle: -90, spread: 96, speedMin: 8, speedMax: 26,
    gravity: -6, lifetime: 3.2, duration: 8.6, at: 1.6, sizeMin: 1, sizeMax: 1.9,
  })
);

// --- The beat -----------------------------------------------------------------------------
const RAISE = 3.5;
const LOWER = 7.2;

// Settling in first: the teller tips toward the fire, then rocks back a touch as the arm
// comes up — the weight shift that makes a raised arm read as a gesture and not a pose.
teller.group.rotateTo(SPECS[0].lean, { at: 2.5, duration: 1.0, ease: "sine.inOut" });
teller.group.rotateTo(-1.8, { at: RAISE, duration: 0.9, ease: "sine.out" });
// -88 rather than the -104 the first pass used: at the steeper angle the hand ended up level
// with, and only a few px clear of, the head, and the two round masses merged into one
// mitten-shaped lump in silhouette. Swung out toward the fire instead of straight up, the arm
// keeps clear air between hand and head, which is what makes it read as an arm at all.
tellerArm.rotateTo(-88, { at: RAISE, duration: 0.9, ease: "sine.out" });
// Held, with two small live sways — not frozen at the top.
tellerArm.rotateTo(-80, { at: 4.7, duration: 0.75, ease: "sine.inOut" });
tellerArm.rotateTo(-92, { at: 5.6, duration: 0.85, ease: "sine.inOut" });
tellerArm.rotateTo(-84, { at: 6.5, duration: 0.7, ease: "sine.inOut" });
// Down, settling a hair past rest before coming back — weight, without a squash-stretch snap.
tellerArm.rotateTo(5, { at: LOWER, duration: 1.15, ease: "sine.inOut" });
tellerArm.rotateTo(0, { at: LOWER + 1.15, duration: 0.5, ease: "sine.out" });
teller.group.rotateTo(SPECS[0].lean * 0.6, { at: LOWER, duration: 1.3, ease: "sine.inOut" });

// The circle leans in behind the gesture, staggered so it reads as three people reacting
// rather than one rig, then eases most of the way back once the arm comes down.
for (let i = 1; i < figures.length; i++) {
  const { group, spec } = figures[i];
  group.rotateTo(spec.lean, { at: 3.9 + i * 0.42, duration: 1.35, ease: "sine.inOut" });
  group.rotateTo(spec.lean * 0.3, { at: 8.7 + i * 0.4, duration: 1.6, ease: "sine.inOut" });
}

// A log settles mid-story and the fire throws a handful of sparks — punctuation, and the
// reason the ember bed and glow jump on the same frame.
const SETTLE = 8.5;
scene.add(
  sketch.particles(FIRE_X - 6, FLAME_BASE_Y - 12, sparkStyle("#f8c877"), {
    count: 22, angle: -90, spread: 52, speedMin: 55, speedMax: 132,
    gravity: -16, lifetime: 2.4, duration: 0.5, at: SETTLE, sizeMin: 1.1, sizeMax: 2.3,
  })
);
emberCore.fadeTo(1, { at: SETTLE, duration: 0.12, ease: "power2.out" });
emberCore.fadeTo(0.82, { at: SETTLE + 0.5, duration: 1.4, ease: "sine.inOut" });

// --- Foreground: a few dark twigs at the very bottom edge, unlit (the fire's light doesn't
// reach past the ring). Sparse on purpose — the frame is mostly sky and dark ground.
for (const [gx, gh, tilt] of [[88, 26, 5], [116, 20, -4], [556, 23, 6], [578, 16, -3]] as [number, number, number][]) {
  scene.add(
    sketch.stroke([[gx, H + 2], [gx + tilt, H - gh]], { color: "#0a0807", weight: "light", looseness: 0.25 })
  ).appear({ at: 0.4, duration: 0.5 });
}

// --- A barely-perceptible frame drift, same device (and same absolute-point caution) as
// quiet-crossing.ts: panTo takes an ABSOLUTE scene-space point to centre on, so a ~4px
// breath targets just off this canvas's real centre (320, 210), not (4, -2).
scene.camera().panTo(324, 207, { at: 0, duration: TOTAL, ease: "sine.inOut" });

// --- Sound: a low night bed, irregular fire crackle (unpitched brush hits, never on a
// grid — a fire has no tempo), a sparse piano line under the story, one thud as the log
// settles. Same three-voice restraint as quiet-crossing.ts's score.
scene.add(sketch.sound("D2", { at: 0, duration: TOTAL - 0.2, instrument: "pad", velocity: 0.15 }));
scene.add(sketch.sound("A2", { at: 0.6, duration: TOTAL - 1.0, instrument: "pad", velocity: 0.1 }));

for (let i = 0; i < 24; i++) {
  const t = 1.5 + i * 0.5 + rnd(i + 7) * 0.34;
  if (t > TOTAL - 0.4) break;
  scene.add(
    sketch.sound(null, {
      at: t,
      duration: 0.08 + rnd(i + 11) * 0.07,
      instrument: "brush",
      velocity: 0.05 + rnd(i + 13) * 0.08,
    })
  );
}

const motif: [string, number][] = [
  ["A3", 2.5], ["C4", RAISE], ["E4", 4.7], ["D4", 5.9], ["A3", 7.0], ["G3", LOWER + 0.9],
];
for (const [pitch, at] of motif) {
  scene.add(sketch.sound(pitch, { at, duration: 1.1, instrument: "piano", velocity: 0.28, pan: -0.22 }));
}
scene.add(sketch.sound("E3", { at: RAISE, duration: 3.0, instrument: "strings", velocity: 0.17 }));
scene.add(sketch.sound(null, { at: SETTLE, duration: 0.16, instrument: "thud", velocity: 0.3 }));
scene.add(sketch.sound("A3", { at: SETTLE + 0.2, duration: 2.6, instrument: "strings", velocity: 0.15 }));

export default scene;
