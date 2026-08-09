import { sketch } from "../../src/index.js";

// A second pass at the Columbia piece (see roaree.ts) — same story beat (an original lion
// cub roams campus toward Low Library, hops the steps, ends in a proud roar), rebuilt with
// everything learned building examples/showcase/nightfall-hill.ts: gradient fills for real
// light direction instead of flat color everywhere, a denser layered campus (autumn trees,
// hazier distant buildings, falling leaves), a crisp trig-circle dome instead of blob()'s
// lumpy-at-scale wobble, and a four-voice sound bed under the walk/hop/roar. roaree.ts
// itself is left untouched — this is a new file, not a rewrite of the shipped one.

const BLUE = "#5b8fc4";
const LION = "#e8a94a";
const LION_FILL = { color: { stops: [{ offset: 0, color: "#f5c878" }, { offset: 1, color: "#dd9a3e" }], direction: "vertical" as const }, style: "solid" as const };
const INK = "#2b2118";
const CREAM = "#faf6ea";
const STONE = "#e9e4d6";
const STONE_LINE = "#b8ae95";

// blob()'s ~15% wobble floor (present even at looseness: 0) is fine at fur/mane scale but
// turns a large disc into a lumpy blob (found building nightfall-hill.ts's moon) — a true
// trig circle instead, for the dome.
function circlePoints(cx: number, cy: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function buildCub() {
  const g = sketch.group([]);

  const maneStyle = { color: "#d99530", weight: "confident" as const, fill: { color: "#e2a343", style: "solid" as const } };
  // Radii bumped ~25% past roaree.ts's own (24-26) — at look: "ink" the gaps between
  // adjacent mane blobs were invisible under rough.js's overlapping hand-drawn strokes,
  // but look: "flat"'s crisp precise edges (needed here for gradient fills) exposed them
  // as real holes once the roar pose's ear/arm rotation moved out of the way (found by
  // comparing this scene's roar frame against roaree.ts's own at the same beat).
  const mane = sketch.group([
    sketch.blob(150, 245, 32, maneStyle, 9),
    sketch.blob(190, 235, 30, maneStyle, 9),
    sketch.blob(215, 260, 30, maneStyle, 9),
    sketch.blob(210, 295, 30, maneStyle, 9),
    sketch.blob(180, 315, 30, maneStyle, 9),
    sketch.blob(145, 315, 30, maneStyle, 9),
    sketch.blob(118, 295, 30, maneStyle, 9),
    sketch.blob(112, 260, 30, maneStyle, 9),
  ]);

  const head = sketch.blob(163, 278, 46, { color: LION, weight: "confident", fill: LION_FILL }, 12);
  const earL = sketch.blob(130, 240, 16, { color: LION, weight: "confident", fill: LION_FILL }, 9);
  const earR = sketch.blob(196, 240, 16, { color: LION, weight: "confident", fill: LION_FILL }, 9);
  earL.pivotAt(130, 240);
  earR.pivotAt(196, 240);

  const muzzle = sketch.blob(163, 292, 22, { color: LION, weight: "light", looseness: 0, fill: { color: CREAM, style: "solid" } }, 14);
  const eyeL = sketch.blob(146, 268, 8, { color: INK, looseness: 0, fill: { color: INK, style: "solid" } }, 10);
  const eyeR = sketch.blob(180, 268, 8, { color: INK, looseness: 0, fill: { color: INK, style: "solid" } }, 10);
  const nose = sketch.blob(163, 282, 6, { color: INK, looseness: 0, fill: { color: INK, style: "solid" } }, 8);
  const mouth = sketch.stroke([[150, 296], [163, 302], [176, 296]], { color: INK, weight: "light" });

  const body = sketch.loop(
    [[163, 320], [188, 328], [198, 355], [190, 380], [163, 388], [136, 380], [128, 355], [138, 328]],
    { color: LION, weight: "confident", fill: LION_FILL }
  );

  const armL = sketch.group([
    sketch.stroke([[142, 335], [128, 358], [122, 378]], { color: LION, weight: "bold" }),
    sketch.blob(119, 383, 11, { color: LION, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  armL.pivotAt(142, 335);
  const armR = sketch.group([
    sketch.stroke([[184, 335], [198, 358], [204, 378]], { color: LION, weight: "bold" }),
    sketch.blob(207, 383, 11, { color: LION, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  armR.pivotAt(184, 335);

  const legL = sketch.group([
    sketch.stroke([[150, 383], [145, 405], [143, 420]], { color: LION, weight: "bold" }),
    sketch.blob(141, 425, 12, { color: LION, weight: "light", fill: LION_FILL }, 8),
  ]);
  legL.pivotAt(150, 383);
  const legR = sketch.group([
    sketch.stroke([[176, 383], [181, 405], [183, 420]], { color: LION, weight: "bold" }),
    sketch.blob(185, 425, 12, { color: LION, weight: "light", fill: LION_FILL }, 8),
  ]);
  legR.pivotAt(176, 383);

  const tail = sketch.group([
    sketch.stroke([[190, 375], [215, 380], [230, 360], [225, 340]], { color: LION, weight: "bold" }),
    sketch.blob(224, 336, 10, maneStyle, 8),
  ]);
  tail.pivotAt(190, 375);

  g.add(tail);
  g.add(mane);
  g.add(head);
  g.add(earL); g.add(earR);
  g.add(muzzle);
  g.add(eyeL); g.add(eyeR); g.add(nose); g.add(mouth);
  g.add(body);
  g.add(armL); g.add(armR);
  g.add(legL); g.add(legR);

  g.pivotAt(163, 434);

  return { group: g, mane, head, earL, earR, eyeL, eyeR, muzzle, nose, mouth, body, armL, armR, legL, legR, tail };
}

function buildLibrary(cx: number, groundY: number, scale = 1) {
  const g = sketch.group([]);
  const s = (v: number) => v * scale;
  const stoneGrad = (top: string, bottom: string) => ({ color: { stops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], direction: "vertical" as const }, style: "solid" as const });

  const stepW = [420, 340, 260].map(s);
  const stepH = s(22);
  for (let i = 0; i < 3; i++) {
    const w = stepW[i];
    const y0 = groundY - i * stepH;
    g.add(
      sketch.loop(
        [[cx - w / 2, y0], [cx + w / 2, y0], [cx + w / 2, y0 - stepH], [cx - w / 2, y0 - stepH]],
        { color: STONE_LINE, weight: "light", smooth: false, fill: stoneGrad("#f2ecd8", "#d3c9a8") }
      )
    );
  }
  const podiumTop = groundY - 3 * stepH;

  const colCount = 6;
  const colSpan = s(230);
  const colH = s(145);
  const colHalfW = s(8);
  const capHalfW = s(12);
  const capH = s(10);
  for (let i = 0; i < colCount; i++) {
    const x = cx - colSpan / 2 + (colSpan / (colCount - 1)) * i;
    g.add(
      sketch.loop(
        [[x - colHalfW, podiumTop], [x + colHalfW, podiumTop], [x + colHalfW, podiumTop - colH], [x - colHalfW, podiumTop - colH]],
        { color: "#cfc7ae", weight: "light", smooth: false, fill: stoneGrad("#fbf7ea", "#e6dcbe") }
      )
    );
    g.add(
      sketch.loop(
        [
          [x - capHalfW, podiumTop - colH], [x + capHalfW, podiumTop - colH],
          [x + capHalfW, podiumTop - colH - capH], [x - capHalfW, podiumTop - colH - capH],
        ],
        { color: "#cfc7ae", weight: "light", smooth: false, fill: { color: "#f2eddd", style: "solid" } }
      )
    );
  }

  // Dome: a true circle (see circlePoints above), not blob() — at this scale (~80px
  // radius) blob's wobble floor read as a lumpy sphere rather than a smooth dome.
  const pedimentTop = podiumTop - colH - capH;
  const pedimentApex = pedimentTop - s(55);
  const domeR = s(58);
  const domeY = pedimentApex - domeR + s(28);
  const lanternHalfW = s(10);
  const lanternH = s(18);
  g.add(
    sketch.loop(circlePoints(cx, domeY, domeR, 40), {
      color: "#8fb2d0",
      weight: "light",
      smooth: true,
      looseness: 0,
      fill: stoneGrad("#e2eef8", "#96b9d8"),
    })
  );
  g.add(
    sketch.loop(
      [
        [cx - lanternHalfW, domeY - domeR - s(2)], [cx + lanternHalfW, domeY - domeR - s(2)],
        [cx + lanternHalfW, domeY - domeR - s(2) - lanternH], [cx - lanternHalfW, domeY - domeR - s(2) - lanternH],
      ],
      { color: "#a9c3dc", weight: "light", smooth: false, fill: { color: "#c3d9ea", style: "solid" } }
    )
  );

  g.add(
    sketch.loop(
      [[cx - colSpan / 2 - s(20), pedimentTop], [cx + colSpan / 2 + s(20), pedimentTop], [cx, pedimentApex]],
      { color: "#cfc7ae", weight: "light", smooth: false, fill: stoneGrad("#f2ecd4", "#ddd2a8") }
    )
  );

  return { group: g, podiumTop, stepH, topStepHalfW: stepW[2] / 2 };
}

// An original autumn campus tree — round canopy in one of three fall colors, gradient-
// shaded (lit from above, same volumetric-shading trick as nightfall-hill.ts's landforms),
// trunk a simple dark stroke. Not any real tree species, just campus-tree silhouette
// language (round canopy, visible trunk) in the season's own palette.
const CANOPY_PALETTES: [string, string][] = [
  ["#e8a23c", "#b5601f"],
  ["#d9502e", "#8f2f18"],
  ["#e0b830", "#a67818"],
];
function buildTree(x: number, groundY: number, scale: number, paletteIndex: number) {
  const [top, bottom] = CANOPY_PALETTES[paletteIndex % CANOPY_PALETTES.length];
  const g = sketch.group([]);
  const trunkH = 70 * scale;
  g.add(sketch.stroke([[x, groundY], [x - 3 * scale, groundY - trunkH]], { color: "#4a3420", weight: "bold" }));
  const canopyY = groundY - trunkH - 6 * scale;
  g.add(
    sketch.blob(x - 2 * scale, canopyY, 44 * scale, {
      color: "#5c3016",
      weight: "light",
      fill: { color: { stops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], direction: "vertical" }, style: "solid" },
    }, 14)
  );
  return g;
}

const WORLD_W = 2300;
const WORLD_H = 620;
const scene = sketch.scene({
  width: WORLD_W,
  height: WORLD_H,
  viewport: { width: 680, height: 420 },
  background: {
    stops: [
      { offset: 0, color: "#8fb8dc" },
      { offset: 0.55, color: "#c9dfee" },
      { offset: 0.85, color: "#f2e2b8" },
      { offset: 1, color: "#f7ecc8" },
    ],
    direction: "vertical",
  },
  seed: "roaree-v2",
  look: "flat",
});

// Depth 0.3: distant campus skyline, hazy and cool — atmospheric perspective via gradient
// (lighter/cooler = further, same cue nightfall-hill.ts's ridgelines use).
const far = scene.layer(0.3);
const skylineGrad = { color: { stops: [{ offset: 0, color: "#c3d9ec" }, { offset: 1, color: "#a3c2de" }], direction: "vertical" as const }, style: "solid" as const };
far.add(sketch.loop([[250, 450], [330, 450], [330, 300], [250, 300]], { color: "#9fc0dd", weight: "light", smooth: false, fill: skylineGrad })).appear({ at: 0, duration: 0.01 });
far.add(sketch.loop([[900, 460], [990, 460], [990, 280], [900, 280]], { color: "#9fc0dd", weight: "light", smooth: false, fill: skylineGrad })).appear({ at: 0, duration: 0.01 });
far.add(sketch.loop([[1500, 455], [1600, 455], [1600, 310], [1500, 310]], { color: "#9fc0dd", weight: "light", smooth: false, fill: skylineGrad })).appear({ at: 0, duration: 0.01 });
// A soft row of distant fall trees along the skyline, small and hazy.
for (const tx of [80, 420, 620, 1120, 1350, 1850, 2050]) {
  far.add(buildTree(tx, 470, 0.55, tx % 3));
}

// Ground plaza — gradient-shaded (warmer/lighter near the library, deeper in the near
// foreground) instead of one flat stone color.
const GROUND_Y = 476;
const ground = sketch.loop(
  [[-100, GROUND_Y], [WORLD_W + 100, GROUND_Y], [WORLD_W + 100, WORLD_H + 100], [-100, WORLD_H + 100]],
  { color: STONE_LINE, weight: "light", smooth: false, fill: { color: { stops: [{ offset: 0, color: "#ede4c6" }, { offset: 1, color: "#c2b284" }], direction: "vertical" }, style: "solid" } }
);
scene.add(ground).appear({ at: 0, duration: 0.01 });
const groundLine = sketch.stroke([[-100, GROUND_Y], [600, GROUND_Y - 3], [1300, GROUND_Y + 2], [WORLD_W + 100, GROUND_Y]], {
  color: "#b0a688", weight: "light",
});
scene.add(groundLine).drawOn({ at: 0, duration: 1.4 });

// Campus trees along the walk — depth 1 (same plane as the cub and library, so nothing
// drifts relative to what the cub is actually walking past).
for (const [tx, sc, pi] of [[60, 1.0, 0], [560, 0.85, 1], [980, 1.05, 2], [1340, 0.9, 0], [2120, 1.0, 1]] as [number, number, number][]) {
  scene.add(buildTree(tx, GROUND_Y, sc, pi)).appear({ at: 0, duration: 0.01 });
}

const lampStyle = { color: "#4a5a4a", weight: "light" as const };
for (const lx of [420, 760, 1120, 1480]) {
  const lamp = sketch.group([
    sketch.stroke([[lx, GROUND_Y], [lx, GROUND_Y - 90]], lampStyle),
    sketch.blob(lx, GROUND_Y - 96, 9, { ...lampStyle, fill: { color: "#f4e6a8", style: "solid" } }, 8),
  ]);
  scene.add(lamp).drawOn({ at: 0.1, duration: 0.6 });
}

const LIB_CX = 1700;
const LIB_SCALE = 1.4;
const library = buildLibrary(LIB_CX, GROUND_Y, LIB_SCALE);
scene.add(library.group);
library.group.appear({ at: 0.2, duration: 0.9 });

const title = sketch.text("columbia", 60, 60, { color: BLUE, weight: "bold", energy: "calm" }, { size: 66 });
scene.add(title).stagger(0.05, { at: 0.1, duration: 0.35 });

const cub = buildCub();
scene.add(cub.group);
// moveTo lands the node's bbox CENTER at (x, y), not its feet — the cub's bbox spans
// roughly y 203 (mane top) to 437 (foot bottom), so a target of y: 300 (inherited from
// roaree.ts) leaves the feet floating ~59px above GROUND_Y (476), visible once the ground
// itself is opaque instead of a thin line (a real bug in roaree.ts too, just less obvious
// there — confirmed by rendering it at the same walk timestamp). y: 359 puts the feet on
// the ground instead.
cub.group.moveTo(150, 359, { at: 0, duration: 0.001 });

// --- Entrance ---
const ENTRANCE_LEAVES: Array<[any, number]> = [
  [cub.tail.children[0], 1.5], [cub.tail.children[1], 1.65],
  [cub.mane.children[0], 1.7], [cub.mane.children[1], 1.75], [cub.mane.children[2], 1.8],
  [cub.mane.children[3], 1.85], [cub.mane.children[4], 1.9], [cub.mane.children[5], 1.95],
  [cub.mane.children[6], 2.0], [cub.mane.children[7], 2.05],
  [cub.head, 2.2],
  [cub.earL, 2.4], [cub.earR, 2.45],
  [cub.muzzle, 2.6],
  [cub.eyeL, 2.75], [cub.eyeR, 2.78], [cub.nose, 2.85], [cub.mouth, 2.9],
  [cub.body, 3.0],
  [cub.armL.children[0], 3.2], [cub.armL.children[1], 3.35],
  [cub.armR.children[0], 3.25], [cub.armR.children[1], 3.4],
  [cub.legL.children[0], 3.45], [cub.legL.children[1], 3.55],
  [cub.legR.children[0], 3.47], [cub.legR.children[1], 3.57],
];
for (const [node, at] of ENTRANCE_LEAVES) node.drawOn({ at, duration: 0.3 });

cub.group.squashTo(1.06, 0.93, { at: 3.75, duration: 0.2, ease: "power2.out" });
cub.group.squashTo(1, 1, { at: 3.95, duration: 0.28, ease: "back.out(2)" });

for (let i = 0; i < 4; i++) {
  const t0 = 4.1 + i * 0.5;
  cub.tail.rotateTo(14, { at: t0, duration: 0.25, ease: "sine.inOut" });
  cub.tail.rotateTo(-10, { at: t0 + 0.25, duration: 0.25, ease: "sine.inOut" });
}

// --- Walk across the plaza toward the library ---
const WALK_START = 4.3;
const STEP_DUR = 0.46;
const STEP_DX = 95;
const STEPS = 14;

for (let i = 0; i < STEPS; i++) {
  const t0 = WALK_START + i * STEP_DUR;
  const tMid = t0 + STEP_DUR / 2;
  const leadIsLeft = i % 2 === 0;
  const lead = leadIsLeft ? cub.legL : cub.legR;
  const trail = leadIsLeft ? cub.legR : cub.legL;
  const armLead = leadIsLeft ? cub.armR : cub.armL;
  const armTrail = leadIsLeft ? cub.armL : cub.armR;

  cub.group.moveBy(STEP_DX / 2, -6, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  cub.group.moveBy(STEP_DX / 2, 6, { at: tMid, duration: STEP_DUR / 2, ease: "sine.in" });

  lead.rotateTo(26, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  lead.rotateTo(-18, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });
  trail.rotateTo(-18, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  trail.rotateTo(26, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });

  armLead.rotateTo(-20, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  armLead.rotateTo(16, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });
  armTrail.rotateTo(16, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  armTrail.rotateTo(-20, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });

  cub.tail.rotateTo(leadIsLeft ? -14 : 14, { at: t0, duration: STEP_DUR, ease: "sine.inOut" });
}
const WALK_END = WALK_START + STEPS * STEP_DUR;

cub.legL.rotateTo(0, { at: WALK_END, duration: 0.15 });
cub.legR.rotateTo(0, { at: WALK_END, duration: 0.15 });
cub.armL.rotateTo(0, { at: WALK_END, duration: 0.15 });
cub.armR.rotateTo(0, { at: WALK_END, duration: 0.15 });
cub.tail.rotateTo(0, { at: WALK_END, duration: 0.2 });
cub.group.squashTo(1.08, 0.92, { at: WALK_END, duration: 0.14, ease: "power2.out" });
cub.group.squashTo(1, 1, { at: WALK_END + 0.14, duration: 0.2, ease: "back.out(2)" });

// --- Hop up the three steps, one small squash-hop per step ---
const HOP_DUR = 0.34;
let hopAt = WALK_END + 0.3;
for (let i = 0; i < 3; i++) {
  cub.group.squashTo(1.1, 0.86, { at: hopAt, duration: 0.1, ease: "power2.out" });
  cub.group.moveBy(50, -34, { at: hopAt + 0.1, duration: HOP_DUR - 0.1, ease: "power2.out" });
  cub.group.squashTo(0.92, 1.1, { at: hopAt + 0.1, duration: 0.12, ease: "power1.out" });
  cub.legL.rotateTo(20, { at: hopAt + 0.1, duration: HOP_DUR - 0.1, ease: "sine.inOut" });
  cub.legR.rotateTo(-20, { at: hopAt + 0.1, duration: HOP_DUR - 0.1, ease: "sine.inOut" });
  const landAt = hopAt + HOP_DUR;
  cub.group.squashTo(1.14, 0.82, { at: landAt, duration: 0.08, ease: "power1.out" });
  cub.group.squashTo(1, 1, { at: landAt + 0.08, duration: 0.18, ease: "back.out(2)" });
  cub.legL.rotateTo(0, { at: landAt, duration: 0.16 });
  cub.legR.rotateTo(0, { at: landAt, duration: 0.16 });
  hopAt = landAt + 0.2;
}
const ATOP_AT = hopAt;

cub.group.rotateTo(0, { at: ATOP_AT, duration: 0.01 });

// --- Proud roar pose ---
const ROAR_AT = ATOP_AT + 0.35;
cub.armL.rotateTo(-70, { at: ROAR_AT, duration: 0.28, ease: "back.out(2)" });
cub.armR.rotateTo(70, { at: ROAR_AT, duration: 0.28, ease: "back.out(2)" });
cub.mouth.morphTo([[148, 292], [163, 310], [178, 292], [163, 300]], { at: ROAR_AT, duration: 0.22, ease: "power2.out" });
cub.group.squashTo(1.14, 0.9, { at: ROAR_AT, duration: 0.22, ease: "power2.out" });
cub.group.moveBy(0, -10, { at: ROAR_AT, duration: 0.22, ease: "power2.out" });
cub.earL.rotateTo(-12, { at: ROAR_AT, duration: 0.22, ease: "power2.out" });
cub.earR.rotateTo(12, { at: ROAR_AT, duration: 0.22, ease: "power2.out" });
for (let i = 0; i < 8; i++) {
  cub.mane.children[i].scaleTo(1.15, { at: ROAR_AT, duration: 0.2, ease: "power2.out" });
}

const HOLD_AT = ROAR_AT + 0.5;
cub.group.squashTo(1.06, 0.96, { at: HOLD_AT, duration: 0.4, ease: "sine.inOut" });
cub.group.squashTo(1.1, 0.92, { at: HOLD_AT + 0.4, duration: 0.4, ease: "sine.inOut" });
cub.tail.rotateTo(16, { at: HOLD_AT, duration: 0.4, ease: "sine.inOut" });
cub.tail.rotateTo(-12, { at: HOLD_AT + 0.4, duration: 0.4, ease: "sine.inOut" });

// --- Falling leaves: a handful of slow emitters near the campus trees, spread across the
// entrance and walk (not the whole video — a particle's spawn window plus its own lifetime
// must stay well inside the choreography's own ~14.3s, or it silently pads the render past
// the roar with nothing happening; a first pass at duration: HOLD_AT + 1 did exactly that,
// adding 4 dead seconds). Closed-form ballistic drift, not a simulation.
for (const [lx, ly] of [[80, 380], [620, 370], [1120, 375], [1850, 385], [980, 360]] as [number, number][]) {
  scene.add(
    sketch.particles(lx, ly, { color: "#d9822f" }, { count: 10, angle: 90, spread: 60, speedMin: 6, speedMax: 18, gravity: 14, lifetime: 3, duration: 5, at: 0.3, sizeMin: 3, sizeMax: 6 })
  );
}

// --- Sound: brush footsteps through the walk, a rising piano phrase into the hop, and a
// triumphant strings-plus-piano chord under the roar. ------------------------------------
scene.add(sketch.sound("F3", { at: 0, duration: WALK_START, instrument: "pad", velocity: 0.22 }));
for (let i = 0; i < STEPS; i += 2) {
  scene.add(sketch.sound(null, { at: WALK_START + i * STEP_DUR, duration: 0.1, instrument: "brush", velocity: 0.3 }));
}
const hopMelody: [string, number][] = [["C4", 0], ["E4", 0.34], ["G4", 0.68]];
for (const [pitch, off] of hopMelody) {
  scene.add(sketch.sound(pitch, { at: WALK_END + 0.3 + off, duration: 0.3, instrument: "piano", velocity: 0.7 }));
}
scene.add(sketch.sound(null, { at: ROAR_AT, duration: 0.15, instrument: "thud", velocity: 0.9 }));
scene.add(sketch.sound("C4", { at: ROAR_AT, duration: 1.6, instrument: "strings", velocity: 0.6 }));
scene.add(sketch.sound("E4", { at: ROAR_AT, duration: 1.6, instrument: "strings", velocity: 0.5 }));
scene.add(sketch.sound("G4", { at: ROAR_AT + 0.05, duration: 1.6, instrument: "strings", velocity: 0.55 }));
scene.add(sketch.sound("C5", { at: ROAR_AT + 0.1, duration: 1.5, instrument: "piano", velocity: 0.6 }));

// --- Camera: follow the walk and the hop, then a settled push-in for the roar. ---
const cam = scene.camera();
cam.panTo(250, 240, { at: 0, duration: 0 });
cam.follow(cub.group, { at: WALK_START, duration: (ATOP_AT - WALK_START) + 3, ease: "none" });
cam.panTo(LIB_CX - 60, 230, { at: ATOP_AT, duration: 0.4, ease: "sine.inOut" });
cam.zoomTo(0.92, { at: ROAR_AT, duration: 0.5, ease: "sine.inOut" });

export default scene;
