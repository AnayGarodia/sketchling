import { sketch } from "../../src/index.js";

// Showcase: the densest single composition in the repo, built to test how far sketchling's
// existing primitives go when actually pushed — gradient fills on every landform (real
// atmospheric perspective: hazier/cooler the further back), a 5-plane depth parallax rig
// (scene.layer), a fully rigged original character (ears, arms, legs, face — not a pawn),
// a firefly particle field, wind-driven grass via connector+springTo, a slow camera push
// across a world four times the viewport's width, and a four-voice sound bed. No curated
// assets anywhere — every shape is a loop/blob/stroke authored directly, same primitives
// as the rest of the gallery, just at much higher density and with real light/color
// direction behind every choice instead of one flat fill per shape.

const WORLD_W = 2200;
const WORLD_H = 540;
const VIEW_W = 960;
const VIEW_H = 540;
const HORIZON_Y = 340;
const GROUND_Y = 540;

const scene = sketch.scene({
  width: WORLD_W,
  height: WORLD_H,
  viewport: { width: VIEW_W, height: VIEW_H },
  background: {
    stops: [
      { offset: 0, color: "#141733" },
      { offset: 0.45, color: "#3a3660" },
      { offset: 0.72, color: "#8a5f6b" },
      { offset: 1, color: "#d98a52" },
    ],
    direction: "vertical",
  },
  seed: "nightfall-hill",
  look: "flat",
});

// Deterministic golden-angle scatter, no Math.random — same pattern reproduces every
// render, unlike a live RNG that would make each build's star field different.
function scatter(n: number, seedX: number, w: number, h: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 137.508 + seedX) % 360;
    const r = Math.sqrt((i + 1) / n);
    pts.push([(r * Math.cos((a * Math.PI) / 180) * 0.5 + 0.5) * w, (r * Math.sin((a * Math.PI) / 180) * 0.5 + 0.5) * h]);
  }
  return pts;
}

// blob()'s wobble has a 15% floor even at looseness: 0 (see geometry.ts's blobPoints —
// deliberate, a "perfect" blob still reads as hand-drawn) — fine at a window's scale, but
// at a 56-95px moon it reads as a lumpy cloud, not a disc. A true trig circle instead.
function circlePoints(cx: number, cy: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// --- Depth 0.12: the sky's own contents — moon, halo, stars. Barely moves with the pan,
// reads as effectively infinite distance. ---------------------------------------------
const farSky = scene.layer(0.12);

for (const [sx, sy] of scatter(46, 11, WORLD_W, 230)) {
  const r = 1.4 + ((sx * 7) % 5) / 5;
  const star = sketch.blob(sx, sy, r, { color: "#f6ecd6", fill: { color: "#f6ecd6", style: "solid" } }, 6);
  farSky.add(star).appear({ at: 0, duration: 0.1 });
}

// The moon gets its own, slightly nearer depth (0.35, not the stars' 0.12) specifically so
// the camera's pan across the walk actually reveals it — at 0.12 it barely responds to any
// realistic pan distance and stayed off-frame the whole shot in an earlier pass. Positioned
// so it's just out of view at the start and settles centered for the closing push-in.
const moonSky = scene.layer(0.35);
const MOON_X = 1264;
const moonHalo = sketch.loop(circlePoints(MOON_X, 95, 95, 48), {
  color: "transparent",
  weight: "light",
  smooth: true,
  looseness: 0,
  fill: { color: "#f4d9a850", style: "solid" },
});
moonSky.add(moonHalo).appear({ at: 0, duration: 0.1 });

const moon = sketch.loop(circlePoints(MOON_X, 95, 56, 48), {
  color: "#e8c98a",
  weight: "light",
  smooth: true,
  looseness: 0,
  fill: {
    color: { stops: [{ offset: 0, color: "#fbf3e2" }, { offset: 1, color: "#e6bd82" }], direction: "vertical" },
    style: "solid",
  },
});
moonSky.add(moon).appear({ at: 0, duration: 0.15 });

// --- Depth 0.3: the farthest mountain ridge — hazy, desaturated, cool. -----------------
const farRidge = scene.layer(0.3);
const ridgeFar = sketch.loop(
  [
    [-40, HORIZON_Y + 10], [140, 210], [360, 260], [560, 195], [820, 245],
    [1080, 200], [1340, 250], [1600, 210], [1860, 255], [2100, 220],
    [2240, 240], [2240, HORIZON_Y + 40], [-40, HORIZON_Y + 40],
  ],
  {
    color: "#4c4670",
    weight: "light",
    smooth: true,
    looseness: 0.1,
    fill: { color: { stops: [{ offset: 0, color: "#6a628f" }, { offset: 1, color: "#453f68" }], direction: "vertical" }, style: "solid" },
  }
);
farRidge.add(ridgeFar).appear({ at: 0, duration: 0.2 });

// --- Depth 0.5: mid hill with a few distant lit windows suggesting sleeping dwellings —
// abstract enough to read as "a light in the dark", not any specific building. ----------
const midHill = scene.layer(0.5);
const hillMid = sketch.loop(
  [
    [-40, HORIZON_Y + 60], [300, HORIZON_Y - 10], [620, HORIZON_Y + 30], [980, HORIZON_Y - 25],
    [1360, HORIZON_Y + 20], [1700, HORIZON_Y - 15], [2000, HORIZON_Y + 35], [2240, HORIZON_Y + 10],
    [2240, HORIZON_Y + 90], [-40, HORIZON_Y + 90],
  ],
  {
    color: "#39304f",
    weight: "light",
    smooth: true,
    looseness: 0.1,
    fill: { color: { stops: [{ offset: 0, color: "#4c4166" }, { offset: 1, color: "#241f37" }], direction: "vertical" }, style: "solid" },
  }
);
midHill.add(hillMid).appear({ at: 0, duration: 0.2 });

function distantLight(x: number, y: number) {
  const hut = sketch.loop([[x - 14, y], [x + 14, y], [x + 10, y - 20], [x - 10, y - 20]], {
    color: "#241f37",
    weight: "light",
    fill: { color: "#241f37", style: "solid" },
  });
  midHill.add(hut).appear({ at: 0, duration: 0.15 });
  const glow = sketch.blob(x, y - 10, 4, { color: "#f2c46b", fill: { color: "#f2c46b", style: "solid" } }, 8);
  midHill.add(glow).appear({ at: 0, duration: 0.15 });
}
distantLight(260, HORIZON_Y + 10);
distantLight(940, HORIZON_Y - 5);
distantLight(1580, HORIZON_Y + 5);
distantLight(2020, HORIZON_Y + 15);

// --- Depth 0.78: a background hill silhouette behind the character — NOT the walking
// surface itself (that's the depth-1.0 groundNear plane below). A parallax layer drifts
// relative to the camera at its own rate, so anything the character's feet must stay
// glued to through a long pan has to share the character's own depth (1.0), not this
// one — putting the literal ground here would slide out from under the walk cycle over
// a 2000px pan. Warmer/darker green, catching a rim of the horizon's amber glow. --------
const nearHill = scene.layer(0.78);
const hillNear = sketch.loop(
  [
    [-60, HORIZON_Y + 40], [400, HORIZON_Y + 5], [900, HORIZON_Y + 55], [1400, HORIZON_Y + 15],
    [1900, HORIZON_Y + 60], [2260, HORIZON_Y + 30], [2260, GROUND_Y + 40], [-60, GROUND_Y + 40],
  ],
  {
    color: "#182a1e",
    weight: "confident",
    smooth: true,
    looseness: 0.08,
    fill: { color: { stops: [{ offset: 0, color: "#3d5c3f" }, { offset: 0.15, color: "#25402a" }, { offset: 1, color: "#131f17" }], direction: "vertical" }, style: "solid" },
  }
);
nearHill.add(hillNear).appear({ at: 0, duration: 0.25 });

function bush(x: number, y: number, s: number) {
  const b = sketch.blob(x, y, 22 * s, { color: "#152219", weight: "light", fill: { color: { stops: [{ offset: 0, color: "#2e4a30" }, { offset: 1, color: "#152219" }], direction: "vertical" }, style: "solid" } }, 12);
  nearHill.add(b).appear({ at: 0, duration: 0.2 });
}
bush(120, HORIZON_Y + 60, 1.1);
bush(560, HORIZON_Y + 45, 0.8);
bush(1180, HORIZON_Y + 80, 1.3);
bush(1720, HORIZON_Y + 50, 0.9);
bush(2080, HORIZON_Y + 65, 1.0);

// --- Depth 1.0 (default plane): the actual walking surface — a gentle, wide undulation
// the character's feet stay locked to for the whole pan, since it shares the character's
// own depth exactly. Sits in front of the depth-0.78 hill behind it. -------------------
const WALK_Y = 415;
const groundNear = sketch.loop(
  [
    [-60, WALK_Y - 15], [500, WALK_Y + 10], [1100, WALK_Y - 20], [1700, WALK_Y + 15],
    [2260, WALK_Y - 5], [2260, GROUND_Y + 60], [-60, GROUND_Y + 60],
  ],
  {
    color: "#0e1a12",
    weight: "confident",
    smooth: true,
    looseness: 0.06,
    fill: { color: { stops: [{ offset: 0, color: "#4a6b46" }, { offset: 0.2, color: "#233b26" }, { offset: 1, color: "#0a130c" }], direction: "vertical" }, style: "solid" },
  }
);
scene.add(groundNear).appear({ at: 0, duration: 0.3 });

function groundY(x: number): number {
  // Matches groundNear's own control points closely enough for foot placement — not
  // exact bezier math, just enough to keep the character visually planted as it walks.
  const pts: [number, number][] = [[-60, WALK_Y - 15], [500, WALK_Y + 10], [1100, WALK_Y - 20], [1700, WALK_Y + 15], [2260, WALK_Y - 5]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return WALK_Y;
}

// --- The character: an original nocturnal wanderer — round body, two long drooping ears,
// stubby arms and legs, a real face. Built the same way examples/launch/hopper.ts builds
// its rig (individual pivoted limb groups at absolute coordinates, no group-level
// translate baked into the same node a pivotAt targets — the exact combination that
// needed this session's pivotAt/translate fix to work safely at all). --------------------
const FUR = "#c98a52";
const FUR_FILL = { color: { stops: [{ offset: 0, color: "#e0a468" }, { offset: 1, color: "#a86a3a" }], direction: "vertical" as const }, style: "solid" as const };
const INK = "#2a1c12";
const CREAM = "#f6ead2";

function buildWanderer(cx: number, cy: number) {
  const g = sketch.group([]);

  const earL = sketch.group([
    sketch.loop([[cx - 18, cy - 55], [cx - 34, cy - 110], [cx - 22, cy - 130], [cx - 6, cy - 90], [cx - 8, cy - 52]], { color: FUR, weight: "confident", fill: FUR_FILL }),
  ]);
  earL.pivotAt(cx - 18, cy - 55);
  const earR = sketch.group([
    sketch.loop([[cx + 18, cy - 55], [cx + 34, cy - 110], [cx + 22, cy - 130], [cx + 6, cy - 90], [cx + 8, cy - 52]], { color: FUR, weight: "confident", fill: FUR_FILL }),
  ]);
  earR.pivotAt(cx + 18, cy - 55);

  const body = sketch.loop(
    [
      [cx, cy - 60], [cx + 26, cy - 50], [cx + 34, cy - 15], [cx + 28, cy + 20],
      [cx, cy + 32], [cx - 28, cy + 20], [cx - 34, cy - 15], [cx - 26, cy - 50],
    ],
    { color: FUR, weight: "confident", fill: FUR_FILL }
  );

  const belly = sketch.blob(cx, cy - 8, 20, { color: "transparent", weight: "light", looseness: 0, fill: { color: CREAM, style: "solid" } }, 14);

  const eyeL = sketch.blob(cx - 13, cy - 40, 9, { color: INK, weight: "light", looseness: 0, fill: { color: CREAM, style: "solid" } }, 12);
  const eyeR = sketch.blob(cx + 13, cy - 40, 9, { color: INK, weight: "light", looseness: 0, fill: { color: CREAM, style: "solid" } }, 12);
  const pupilL = sketch.blob(cx - 12, cy - 39, 4, { color: INK, looseness: 0, fill: { color: INK, style: "solid" } }, 8);
  const pupilR = sketch.blob(cx + 14, cy - 39, 4, { color: INK, looseness: 0, fill: { color: INK, style: "solid" } }, 8);
  pupilL.pivotAt(cx - 12, cy - 39);
  pupilR.pivotAt(cx + 14, cy - 39);
  const nose = sketch.blob(cx, cy - 26, 4, { color: INK, looseness: 0, fill: { color: INK, style: "solid" } }, 8);
  const mouth = sketch.stroke([[cx - 7, cy - 18], [cx, cy - 13], [cx + 7, cy - 18]], { color: INK, weight: "light" });

  const armL = sketch.group([
    sketch.stroke([[cx - 30, cy - 5], [cx - 42, cy + 15], [cx - 40, cy + 34]], { color: FUR, weight: "bold" }),
    sketch.blob(cx - 40, cy + 38, 9, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  armL.pivotAt(cx - 30, cy - 5);
  const armR = sketch.group([
    sketch.stroke([[cx + 30, cy - 5], [cx + 42, cy + 15], [cx + 40, cy + 34]], { color: FUR, weight: "bold" }),
    sketch.blob(cx + 40, cy + 38, 9, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  armR.pivotAt(cx + 30, cy - 5);

  const legL = sketch.group([
    sketch.stroke([[cx - 15, cy + 28], [cx - 18, cy + 55], [cx - 17, cy + 74]], { color: FUR, weight: "bold" }),
    sketch.blob(cx - 17, cy + 79, 11, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  legL.pivotAt(cx - 15, cy + 28);
  const legR = sketch.group([
    sketch.stroke([[cx + 15, cy + 28], [cx + 18, cy + 55], [cx + 17, cy + 74]], { color: FUR, weight: "bold" }),
    sketch.blob(cx + 17, cy + 79, 11, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  legR.pivotAt(cx + 15, cy + 28);

  g.add(legL); g.add(legR);
  g.add(body); g.add(belly);
  g.add(armL); g.add(armR);
  g.add(earL); g.add(earR);
  g.add(eyeL); g.add(eyeR); g.add(pupilL); g.add(pupilR); g.add(nose); g.add(mouth);

  // Pivot from the feet, not the geometric middle — a bob or lean should rock the body
  // over planted feet, not swing around empty space at chest height.
  g.pivotAt(cx, cy + 79);

  return { group: g, earL, earR, armL, armR, legL, legR, eyeL, eyeR, pupilL, pupilR };
}

const START_X = 160;
const wanderer = buildWanderer(START_X, groundY(START_X));
scene.add(wanderer.group).appear({ at: 0, duration: 0.3 });

// --- Walk cycle: same hand-authored alternating-step pattern as examples/launch/hopper.ts
// (moveBy drives the group's own translate for footfall bob, legs/arms/ears counter-swing
// via their own pivoted rotateTo) — not sketch.walk's gait solver, since this rig's legs
// are simple strokes rather than IK limbs. ----------------------------------------------
const WALK_START = 0.5;
const STEP_DUR = 0.55;
const STEP_DX = 75;
const STEPS = 18;

for (let i = 0; i < STEPS; i++) {
  const t0 = WALK_START + i * STEP_DUR;
  const tMid = t0 + STEP_DUR / 2;
  const leadIsLeft = i % 2 === 0;
  const lead = leadIsLeft ? wanderer.legL : wanderer.legR;
  const trail = leadIsLeft ? wanderer.legR : wanderer.legL;
  const armLead = leadIsLeft ? wanderer.armR : wanderer.armL;
  const armTrail = leadIsLeft ? wanderer.armL : wanderer.armR;

  wanderer.group.moveBy(STEP_DX / 2, -6, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  wanderer.group.moveBy(STEP_DX / 2, 6, { at: tMid, duration: STEP_DUR / 2, ease: "sine.in" });

  lead.rotateTo(22, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  lead.rotateTo(-14, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });
  trail.rotateTo(-14, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  trail.rotateTo(22, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });

  armLead.rotateTo(-16, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  armLead.rotateTo(12, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });
  armTrail.rotateTo(12, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  armTrail.rotateTo(-16, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });

  wanderer.earL.rotateTo(leadIsLeft ? -9 : 9, { at: t0 + 0.08, duration: STEP_DUR / 2, ease: "sine.out" });
  wanderer.earR.rotateTo(leadIsLeft ? 9 : -9, { at: t0 + 0.08, duration: STEP_DUR / 2, ease: "sine.out" });
}
const WALK_END = WALK_START + STEPS * STEP_DUR;
// Settle back to neutral.
wanderer.legL.rotateTo(0, { at: WALK_END, duration: 0.3, ease: "sine.out" });
wanderer.legR.rotateTo(0, { at: WALK_END, duration: 0.3, ease: "sine.out" });
wanderer.armL.rotateTo(0, { at: WALK_END, duration: 0.3, ease: "sine.out" });
wanderer.armR.rotateTo(0, { at: WALK_END, duration: 0.3, ease: "sine.out" });
wanderer.earL.rotateTo(0, { at: WALK_END, duration: 0.4, ease: "sine.out" });
wanderer.earR.rotateTo(0, { at: WALK_END, duration: 0.4, ease: "sine.out" });
// A last look up toward the moon once it stops.
wanderer.group.rotateTo(-6, { at: WALK_END + 0.3, duration: 0.6, ease: "sine.out" });

// --- Fireflies: several long-duration low-gravity emitters spaced along the walk path —
// each is a closed-form ballistic burst (see sketch.particles's own doc comment), not a
// simulation, so the field holds up under an arbitrary seek the same as everything else.
const fireflyXs = [40, 380, 700, 1020, 1340, 1600, 1850];
for (const fx of fireflyXs) {
  scene.add(
    sketch.particles(
      fx,
      groundY(Math.min(fx, 2200)) - 40,
      { color: "#e8d97a" },
      { count: 7, angle: -90, spread: 340, speedMin: 4, speedMax: 16, gravity: -3, lifetime: 4.5, duration: 8, at: 0.3, sizeMin: 2, sizeMax: 4 }
    )
  );
}

// --- Depth 1.35: foreground grass, popping forward of the character as the camera pans
// past it. Each blade bends toward a shared springTo'd wind driver — a real spring-lag
// demo (see AGENTS.md's Secondary motion section) that's safe from the group-translate
// gotcha pivotAt's fix addressed, since neither the driver nor the blades ever move via
// their own moveBy/initial — only the camera's layer-level pan moves them. -------------
// windDriver/tipDriver below are parked off-canvas on purpose — invisible (transparent
// fill+stroke, radius 1) springTo anchors, never meant to be seen. Tier 0 flags them
// "renders fully off-canvas" (error level); expected noise for a driver node, not a bug.
const foreground = scene.layer(1.35);
const windDriver = sketch.blob(-200, -200, 1, { color: "transparent", fill: { color: "transparent", style: "solid" } }, 4);
foreground.add(windDriver);
windDriver.moveBy(18, 0, { at: 0, duration: 2.2, ease: "sine.inOut" });
windDriver.moveBy(-18, 0, { at: 2.2, duration: 2.4, ease: "sine.inOut" });
windDriver.moveBy(18, 0, { at: 4.6, duration: 2.3, ease: "sine.inOut" });
windDriver.moveBy(-18, 0, { at: 6.9, duration: 2.4, ease: "sine.inOut" });
windDriver.moveBy(18, 0, { at: 9.3, duration: 2.2, ease: "sine.inOut" });

function grassCluster(gx: number, gy: number) {
  for (let b = 0; b < 4; b++) {
    const bx = gx + b * 14 - 21;
    const tipDriver = sketch.blob(bx, gy - 46, 1, { color: "transparent", fill: { color: "transparent", style: "solid" } }, 4);
    foreground.add(tipDriver);
    tipDriver.springTo(windDriver, { offset: [bx + 200, gy - 46 + 200], stiffness: 70, damping: 6 });
    const blade = sketch.connector([bx, gy], tipDriver, { color: "#0a140b", weight: "confident" });
    foreground.add(blade);
  }
}
grassCluster(120, GROUND_Y + 30);
grassCluster(520, GROUND_Y + 25);
grassCluster(980, GROUND_Y + 35);
grassCluster(1420, GROUND_Y + 20);
grassCluster(1880, GROUND_Y + 30);

// --- Camera: an establishing hold, then a slow follow as the wanderer crosses the hill,
// with a gentle push-in once it stops to look up at the moon. --------------------------
const cam = scene.camera();
cam.panTo(START_X + 40, WALK_Y - 60, { at: 0, duration: 0 });
// follow only holds its tracked framing for its own [at, at+duration] window — past the
// end it snaps back to whatever pan was active before it started (see AGENTS.md's Camera
// section, a gotcha this exact scene tripped on the first pass: the zoomTo below runs
// until WALK_END + 1.7, so the follow window has to reach at least that far past
// WALK_END, not just cover the walk itself, or the character vanishes from frame right
// as the closing push-in lands).
cam.follow(wanderer.group, { at: WALK_START, duration: WALK_END - WALK_START + 3 });
cam.zoomTo(1.18, { at: WALK_END + 0.3, duration: 1.4, ease: "sine.inOut" });

// --- Sound: a night-time pad bed under a slow wistful piano line, soft footstep plucks in
// rhythm with the walk, and a strings swell under the closing look-up. ------------------
scene.add(sketch.sound("D3", { at: 0, duration: WALK_END + 2, instrument: "pad", velocity: 0.3 }));
scene.add(sketch.sound("A3", { at: 0.2, duration: WALK_END + 1.6, instrument: "pad", velocity: 0.22 }));

const melody: [string, number][] = [
  ["A3", 1.0], ["C4", 2.1], ["E4", 3.2], ["D4", 4.3],
  ["A3", 5.6], ["C4", 6.7], ["G4", 7.8], ["E4", 8.9],
];
for (const [pitch, at] of melody) {
  scene.add(sketch.sound(pitch, { at, duration: 0.9, instrument: "piano", velocity: 0.55 }));
}

for (let i = 0; i < STEPS; i += 2) {
  scene.add(sketch.sound(null, { at: WALK_START + i * STEP_DUR, duration: 0.1, instrument: "brush", velocity: 0.35 }));
}

scene.add(sketch.sound("F3", { at: WALK_END, duration: 2.4, instrument: "strings", velocity: 0.45 }));
scene.add(sketch.sound("C4", { at: WALK_END, duration: 2.4, instrument: "strings", velocity: 0.3 }));
scene.add(sketch.sound("A4", { at: WALK_END + 0.6, duration: 1.8, instrument: "strings", velocity: 0.4 }));

export default scene;
