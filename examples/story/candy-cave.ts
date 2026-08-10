import { sketch } from "../../src/index.js";

// An 8-bit adventurer explores a candy-colored cave and finds a glowing treasure chest.
// look: "flat" (crisp geometry pixelates cleanly) + texture: "pixel" (the CLI's raster
// post-process — 8px cells, applied per captured frame; scene-only, --video/--out, not
// --serve, so this is authored as ONE sketch.scene(), not a Film of cuts).
//
// The pixel grid is 8 output pixels per cell (src/cli.ts PIXEL_CELL), so every detail is
// sized to survive area-averaged downsampling: the hero is ~17 cells tall, his eye is a
// full cell, lines are numeric-weight bold enough not to dither away.

const WORLD_W = 1920;
// The world is 80px taller than the viewport: camera.follow centers on the hero's bbox
// center (y ≈ 249, below the vertical middle), so the world needs vertical headroom for
// that framing to stay inside its own bounds instead of showing bare background.
const H = 500;
const VIEW_W = 640;
const VIEW_H = 420;
const GROUND_Y = 340;

const scene = sketch.scene({
  width: WORLD_W,
  height: H,
  viewport: { width: VIEW_W, height: VIEW_H },
  background: {
    stops: [
      { offset: 0, color: "#2b1544" },
      { offset: 0.45, color: "#55246e" },
      { offset: 0.8, color: "#8c3b85" },
      { offset: 1, color: "#c05b96" },
    ],
    direction: "vertical",
  },
  seed: "candy-cave",
  look: "flat",
  texture: "pixel",
});

const OUTLINE = "#241031";

// ---------------------------------------------------------------------------
// The cave itself — floor and ceiling bands span the whole world (padded past
// every edge: camera.follow centers on the character's bbox, ~62px below the
// world's own vertical center, so the frame shows y ≈ [62, 482] — bands
// overdraw so no bare background gradient ever peeks through).
// ---------------------------------------------------------------------------

const floor = sketch.loop(
  [[-20, GROUND_Y], [WORLD_W + 20, GROUND_Y], [WORLD_W + 20, H + 20], [-20, H + 20]],
  {
    color: "#5e2350",
    weight: 4,
    smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#f28ac2" }, { offset: 1, color: "#a34a84" }], direction: "vertical" },
      style: "solid",
    },
  }
);
scene.add(floor.named("cave-floor")).drawOn({ at: 0, duration: 1.2 });

const ceiling = sketch.loop(
  [[-20, -20], [WORLD_W + 20, -20], [WORLD_W + 20, 66], [-20, 66]],
  { color: "#1c0b2e", weight: 4, smooth: false, fill: { color: "#331447", style: "solid" } }
);
scene.add(ceiling.named("cave-ceiling")).appear({ at: 0, duration: 0.3 });

// Candy stalactites — sugar icicles in alternating candy colors, hanging off the
// ceiling band across the whole world.
const ICICLE_COLORS = ["#8fe6c8", "#ff9fce", "#7fd9ef", "#ffd45e"];
const icicles = sketch.group();
scene.add(icicles);
const ICICLE_XS = [140, 300, 460, 640, 810, 1010, 1170, 1370, 1540, 1780];
ICICLE_XS.forEach((x, i) => {
  const len = 44 + ((i * 37) % 40);
  const w = 16 + ((i * 13) % 8);
  icicles.add(
    sketch.loop(
      [[x - w / 2, 60], [x + w / 2, 60], [x, 60 + len]],
      { color: OUTLINE, weight: 3, smooth: false, fill: { color: ICICLE_COLORS[i % 4], style: "solid" } }
    )
  );
});
icicles.stagger(0.1, { at: 0.5, duration: 0.3 });

// Sugar sprinkles scattered on the floor.
const SPRINKLE_COLORS = ["#fff3fa", "#ffd45e", "#7fd9ef", "#8fe6c8", "#ff9fce"];
const sprinkles = sketch.group();
scene.add(sprinkles);
[210, 450, 620, 790, 1040, 1210, 1420, 1620, 1830].forEach((x, i) => {
  const y = 356 + ((i * 11) % 22);
  sprinkles.add(
    sketch.loop(
      [[x, y], [x + 12, y - 3], [x + 14, y + 4], [x + 2, y + 7]],
      { color: SPRINKLE_COLORS[i % 5], weight: 2, smooth: false, fill: { color: SPRINKLE_COLORS[i % 5], style: "solid" } }
    )
  );
});
sprinkles.stagger(0.05, { at: 1.4, duration: 0.2, effect: "appear" });

// The tunnel mouth the adventurer came in through — a dark arch at the far left.
const entrance = sketch.loop(
  [[170, GROUND_Y], [176, 250], [206, 206], [250, 192], [292, 210], [316, 258], [320, GROUND_Y]],
  { color: "#160825", weight: 4, fill: { color: "#1d0c30", style: "solid" } }
);
scene.add(entrance.named("tunnel-mouth")).drawOn({ at: 1.0, duration: 1.0 });

// Title card, hand-lettered, framed by the camera's opening position.
const title = sketch.text("the candy cave", 120, 150, { color: "#ffe9f5", weight: 4 }, { size: 46 });
scene.add(title.named("title"));
title.stagger(0.05, { at: 2.0, duration: 0.4 });
title.fadeTo(0, { at: 7.2, duration: 0.8 });

// Ambient candy drips from two stalactites along the path.
scene.add(
  sketch.particles(640, 118, { color: "#ff9fce" }, {
    count: 12, angle: 90, spread: 4, speedMin: 10, speedMax: 30,
    gravity: 320, lifetime: 0.85, duration: 14, at: 9, sizeMin: 3, sizeMax: 4.5,
  })
);
scene.add(
  sketch.particles(1370, 122, { color: "#7fd9ef" }, {
    count: 12, angle: 90, spread: 4, speedMin: 10, speedMax: 30,
    gravity: 320, lifetime: 0.85, duration: 14, at: 26, sizeMin: 3, sizeMax: 4.5,
  })
);

// ---------------------------------------------------------------------------
// Candy formations along the route.
// ---------------------------------------------------------------------------

// Two gumdrops (stop 1).
const gumdrop1 = sketch.blob(692, 310, 34, { color: OUTLINE, weight: 4, looseness: 0, fill: { color: "#ff6f91", style: "solid" } }, 12);
const gumdrop2 = sketch.blob(756, 320, 25, { color: OUTLINE, weight: 4, looseness: 0, fill: { color: "#7de8a0", style: "solid" } }, 12);
// Squash pivots at ground contact — a jiggle should compress INTO the floor, and (found on
// a rendered mid-squash frame) an un-pivoted squashTo on these scaled around the SVG origin
// instead of the blob's own center, teleporting the gumdrop mid-jiggle.
gumdrop1.pivotAt(692, 344);
gumdrop2.pivotAt(756, 345);
scene.add(gumdrop1.named("gumdrop-pink")).drawOn({ at: 11.0, duration: 0.6 });
scene.add(gumdrop2.named("gumdrop-green")).drawOn({ at: 11.6, duration: 0.5 });

// A giant lollipop (stop 2).
const lolliStick = sketch.stroke([[950, GROUND_Y], [950, 250]], { color: "#f5eee6", weight: 8 });
const lolliDisc = sketch.ellipse(950, 208, 42, 42, { color: OUTLINE, weight: 4, fill: { color: "#ff5c8a", style: "solid" } });
const lolliSwirl = sketch.ellipse(950, 208, 22, 22, { color: "#ffe9f5", weight: 4, fill: { color: "#ffb3cb", style: "solid" } });
const lollipop = sketch.group([lolliStick, lolliDisc, lolliSwirl]);
lollipop.pivotAt(950, GROUND_Y);
scene.add(lollipop.named("lollipop"));
lolliStick.drawOn({ at: 18.6, duration: 0.4 });
lolliDisc.drawOn({ at: 19.0, duration: 0.5 });
lolliSwirl.drawOn({ at: 19.5, duration: 0.4 });

// A striped candy pole (passed through, no stop).
const pole = sketch.loop(
  [[1090, GROUND_Y], [1122, GROUND_Y], [1122, 180], [1090, 180]],
  { color: OUTLINE, weight: 4, smooth: false, fill: { color: "#f5eee6", style: "solid" } }
);
scene.add(pole.named("candy-pole")).drawOn({ at: 24.0, duration: 0.7 });
const poleStripes = sketch.group();
scene.add(poleStripes);
for (let i = 0; i < 4; i++) {
  const y = 208 + i * 36;
  poleStripes.add(
    sketch.loop(
      [[1090, y + 14], [1122, y], [1122, y + 16], [1090, y + 30]],
      { color: "#d94f4f", weight: 2, smooth: false, fill: { color: "#d94f4f", style: "solid" } }
    )
  );
}
poleStripes.stagger(0.1, { at: 24.7, duration: 0.25, effect: "appear" });

// Rock-candy crystals (stop 3) with a soft glow behind them.
const crystalGlow = sketch.ellipse(1285, 285, 115, 85, {
  color: "#7fe3f000",
  fill: { color: { stops: [{ offset: 0, color: "#aef2ff" }, { offset: 1, color: "#aef2ff00" }], type: "radial" }, style: "solid" },
});
scene.add(crystalGlow.named("crystal-glow"));
crystalGlow.initial({ opacity: 0 });
const crystalStyle = (fill: string) => ({ color: OUTLINE, weight: 4, smooth: false as const, fill: { color: fill, style: "solid" as const } });
const crystal1 = sketch.loop([[1222, GROUND_Y], [1258, GROUND_Y], [1250, 278], [1234, 270]], crystalStyle("#7fe3f0"));
const crystal2 = sketch.loop([[1264, GROUND_Y], [1308, GROUND_Y], [1298, 246], [1278, 238]], crystalStyle("#c17ff0"));
const crystal3 = sketch.loop([[1314, GROUND_Y], [1348, GROUND_Y], [1342, 288], [1324, 282]], crystalStyle("#8fe6c8"));
scene.add(crystal1.named("crystal-cyan")).drawOn({ at: 27.2, duration: 0.5 });
scene.add(crystal2.named("crystal-violet")).drawOn({ at: 27.7, duration: 0.5 });
scene.add(crystal3.named("crystal-mint")).drawOn({ at: 28.2, duration: 0.5 });
// The crystals pulse while the adventurer admires them.
crystalGlow.fadeTo(0.8, { at: 30.2, duration: 0.9 });
crystalGlow.fadeTo(0.3, { at: 31.3, duration: 0.9 });
crystalGlow.fadeTo(0.8, { at: 32.4, duration: 0.9 });
crystalGlow.fadeTo(0.35, { at: 33.5, duration: 1.0 });

// ---------------------------------------------------------------------------
// The treasure chest, waiting in the dark right end of the cave.
// ---------------------------------------------------------------------------

const CHEST_X = 1700;

const chestGlow = sketch.ellipse(CHEST_X, 298, 150, 112, {
  color: "#ffdf7a00",
  fill: { color: { stops: [{ offset: 0, color: "#ffe08a" }, { offset: 1, color: "#ffe08a00" }], type: "radial" }, style: "solid" },
});
scene.add(chestGlow.named("chest-glow"));
chestGlow.initial({ opacity: 0 });

const beam = sketch.loop(
  [[CHEST_X - 34, 292], [CHEST_X + 34, 292], [CHEST_X + 14, 110], [CHEST_X - 14, 110]],
  {
    color: "#ffdf7a00",
    smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#ffe08a00" }, { offset: 1, color: "#ffe9a0" }], direction: "vertical" }, style: "solid" },
  }
);
scene.add(beam.named("light-beam"));
beam.initial({ opacity: 0 });

const chestBase = sketch.loop(
  [[CHEST_X - 40, 296], [CHEST_X + 40, 296], [CHEST_X + 36, GROUND_Y], [CHEST_X - 36, GROUND_Y]],
  { color: "#2e1808", weight: 4, smooth: false, fill: { color: "#8a5a2d", style: "solid" } }
);
const chestBand = sketch.stroke([[CHEST_X, 298], [CHEST_X, GROUND_Y - 2]], { color: "#ffd45e", weight: 5 });
const coinPile = sketch.loop(
  [[CHEST_X - 32, 296], [CHEST_X - 18, 285], [CHEST_X, 281], [CHEST_X + 20, 286], [CHEST_X + 32, 296]],
  { color: "#8a6a1a", weight: 3, fill: { color: "#ffd94f", style: "solid" } }
);
coinPile.initial({ opacity: 0 });
const chestLid = sketch.loop(
  [[CHEST_X - 42, 296], [CHEST_X - 38, 268], [CHEST_X, 258], [CHEST_X + 38, 268], [CHEST_X + 42, 296]],
  { color: "#2e1808", weight: 4, fill: { color: "#a86b36", style: "solid" } }
);
chestLid.pivotAt(CHEST_X + 40, 296);
const glint = sketch.stroke([[CHEST_X - 38, 295], [CHEST_X + 38, 295]], { color: "#ffe9a0", weight: 4 });
glint.initial({ opacity: 0 });

const chest = sketch.group([chestBase, chestBand, coinPile, chestLid, glint]);
scene.add(chest.named("treasure-chest"));
chestBase.drawOn({ at: 3.0, duration: 0.6 });
chestBand.drawOn({ at: 3.6, duration: 0.3 });
chestLid.drawOn({ at: 3.9, duration: 0.6 });

// ---------------------------------------------------------------------------
// The adventurer — a blocky 8-bit hero: square head, tunic, helmet, backpack,
// IK legs from quickRig, rigid counter-swinging arms.
// ---------------------------------------------------------------------------

const CX = 340; // authored start center
const SKIN = "#f2c98a";
const TUNIC = "#3fae6e";
const HELMET = "#e0524f";

const torso = sketch.loop(
  [[CX - 24, 262], [CX + 24, 262], [CX + 26, 306], [CX - 26, 306]],
  { color: OUTLINE, weight: 4, smooth: false, fill: { color: TUNIC, style: "solid" } }
);
const belt = sketch.stroke([[CX - 25, 292], [CX + 25, 292]], { color: OUTLINE, weight: 4 });
const backpack = sketch.loop(
  [[CX - 34, 264], [CX - 22, 262], [CX - 20, 292], [CX - 34, 294]],
  { color: OUTLINE, weight: 3, smooth: false, fill: { color: "#a86b3c", style: "solid" } }
);
const head = sketch.loop(
  [[CX - 20, 218], [CX + 20, 218], [CX + 20, 252], [CX - 20, 252]],
  { color: OUTLINE, weight: 4, smooth: false, fill: { color: SKIN, style: "solid" } }
);
const helmet = sketch.loop(
  [[CX - 24, 206], [CX + 24, 206], [CX + 24, 224], [CX - 24, 224]],
  { color: OUTLINE, weight: 4, smooth: false, fill: { color: HELMET, style: "solid" } }
);
const plume = sketch.loop(
  [[CX - 6, 194], [CX + 8, 192], [CX + 10, 206], [CX - 8, 208]],
  { color: OUTLINE, weight: 3, smooth: false, fill: { color: "#ffd45e", style: "solid" } }
);
const eye = sketch.loop(
  [[CX + 8, 228], [CX + 15, 228], [CX + 15, 238], [CX + 8, 238]],
  { color: OUTLINE, weight: 2, smooth: false, fill: { color: OUTLINE, style: "solid" } }
);
const headG = sketch.group([head, helmet, plume, eye]);
headG.pivotAt(CX, 252);

const STEP_LENGTH = 36;
const rig = sketch.quickRig(torso, {
  groundY: GROUND_Y,
  stepLength: STEP_LENGTH,
  legStyle: { color: OUTLINE, weight: 5 },
  capRadius: 8,
});

const ARM_STYLE = { color: OUTLINE, weight: 5 };
const armL = sketch.limb(CX - 14, 268, 17, 16, ARM_STYLE, { bend: 1, capRadius: 6 });
const armR = sketch.limb(CX + 14, 268, 17, 16, ARM_STYLE, { bend: -1, capRadius: 6 });
armL.restAt(CX - 18, 296);
armR.restAt(CX + 18, 296);
armL.pivotAt(CX - 14, 268);
armR.pivotAt(CX + 14, 268);

const hero = sketch.group([rig.legL, rig.legR, backpack, torso, belt, armL, armR, headG]);
// Squash/stretch from the feet, not the bbox center — jumps compress into the ground.
// (Also dodges the same origin bug the gumdrops hit; the pivot is in the hero's own local
// space, so it travels with him through every walk leg.)
hero.pivotAt(CX, GROUND_Y);
scene.add(hero.named("adventurer"));

rig.legL.appear({ at: 5.5, duration: 0.25 });
rig.legR.appear({ at: 5.7, duration: 0.25 });
armL.appear({ at: 5.9, duration: 0.25 });
armR.appear({ at: 6.1, duration: 0.25 });
backpack.drawOn({ at: 6.3, duration: 0.4 });
torso.drawOn({ at: 6.6, duration: 0.6 });
belt.drawOn({ at: 7.2, duration: 0.2 });
head.drawOn({ at: 7.4, duration: 0.5 });
helmet.drawOn({ at: 7.9, duration: 0.35 });
plume.drawOn({ at: 8.25, duration: 0.25 });
eye.appear({ at: 8.5, duration: 0.15 });

// ---------------------------------------------------------------------------
// The journey — four walk legs with a beat at each candy formation.
// ---------------------------------------------------------------------------

const walkLegs = { legs: [{ limb: rig.legL, hipX: rig.hipLX }, { limb: rig.legR, hipX: rig.hipRX }] as [
  { limb: typeof rig.legL; hipX: number },
  { limb: typeof rig.legR; hipX: number }
] };
const walkArms = { arms: [{ node: armL, swingAngle: 18 }, { node: armR, swingAngle: 18 }] as [
  { node: typeof armL; swingAngle: number },
  { node: typeof armR; swingAngle: number }
] };

// Leg 1: into the cave proper — 8 steps, +288px (340 -> 628), t 9.0-13.4.
sketch.walk({ body: hero, ...walkLegs, ...walkArms, steps: 8, stepLength: STEP_LENGTH, groundY: GROUND_Y, stepDuration: 0.55, liftHeight: 16, bodyBob: 5, at: 9.0 });

// Beat 1 (13.8-16.4): the gumdrops jiggle hello; the hero gives a little hop back.
gumdrop1.squashTo(1.15, 0.85, { at: 13.8, duration: 0.16, ease: "power2.out" });
gumdrop1.squashTo(1, 1, { at: 13.96, duration: 0.5, ease: "back.out(3)" });
gumdrop2.squashTo(1.2, 0.8, { at: 14.4, duration: 0.16, ease: "power2.out" });
gumdrop2.squashTo(1, 1, { at: 14.56, duration: 0.5, ease: "back.out(3)" });
hero.squashTo(1.1, 0.9, { at: 15.2, duration: 0.14, ease: "power2.out" });
hero.squashTo(1, 1, { at: 15.34, duration: 0.12 });
hero.moveBy(0, -20, { at: 15.34, duration: 0.26, ease: "power2.out" });
hero.moveBy(0, 20, { at: 15.6, duration: 0.24, ease: "power2.in" });
hero.squashTo(1.12, 0.88, { at: 15.84, duration: 0.1, ease: "power2.out" });
hero.squashTo(1, 1, { at: 15.94, duration: 0.35, ease: "back.out(2.5)" });

// Leg 2: on to the lollipop — 7 steps, +252px (628 -> 880), t 17.0-20.85.
sketch.walk({ body: hero, ...walkLegs, ...walkArms, steps: 7, stepLength: STEP_LENGTH, groundY: GROUND_Y, stepDuration: 0.55, liftHeight: 16, bodyBob: 5, at: 17.0 });

// Beat 2 (21.4-24.4): the lollipop sways on its stick; sugar sparks drift off the disc.
lollipop.rotateBy(6, { at: 21.4, duration: 0.7, ease: "sine.inOut" });
lollipop.rotateBy(-10, { at: 22.1, duration: 0.9, ease: "sine.inOut" });
lollipop.rotateBy(4, { at: 23.0, duration: 0.7, ease: "sine.inOut" });
scene.add(
  sketch.particles(950, 208, { color: "#ffb3cb" }, {
    count: 10, angle: -90, spread: 160, speedMin: 24, speedMax: 60,
    gravity: 60, lifetime: 1.1, at: 21.9, sizeMin: 2.5, sizeMax: 4,
  })
);

// Leg 3: past the candy pole toward the crystals — 8 steps, +288px (880 -> 1168), t 25.2-29.6.
sketch.walk({ body: hero, ...walkLegs, ...walkArms, steps: 8, stepLength: STEP_LENGTH, groundY: GROUND_Y, stepDuration: 0.55, liftHeight: 16, bodyBob: 5, at: 25.2 });

// Beat 3 (30.2-33.8): the crystals pulse (scheduled above with the crystals themselves);
// the hero tips his head up to look.
headG.rotateBy(9, { at: 30.6, duration: 0.5, ease: "sine.inOut" });
headG.rotateBy(-9, { at: 32.6, duration: 0.5, ease: "sine.inOut" });

// Leg 4: into the dark end of the cave — 8 steps, +288px (1168 -> 1456), t 34.4-38.8.
sketch.walk({ body: hero, ...walkLegs, ...walkArms, steps: 8, stepLength: STEP_LENGTH, groundY: GROUND_Y, stepDuration: 0.55, liftHeight: 16, bodyBob: 5, at: 34.4 });

// Something glints ahead (39.6): a gold seam on the chest catches light.
glint.fadeTo(1, { at: 39.6, duration: 0.5 });
glint.fadeTo(0.2, { at: 40.3, duration: 0.4 });
glint.fadeTo(1, { at: 40.8, duration: 0.4 });
chestGlow.fadeTo(0.25, { at: 39.6, duration: 1.4 });
headG.rotateBy(-6, { at: 40.2, duration: 0.4, ease: "sine.inOut" });
headG.rotateBy(6, { at: 41.2, duration: 0.4, ease: "sine.inOut" });

// The cautious approach — 4 slow, short steps, +120px (1456 -> 1576), t 42.0-45.0.
sketch.walk({ body: hero, ...walkLegs, ...walkArms, steps: 4, stepLength: 30, groundY: GROUND_Y, stepDuration: 0.75, liftHeight: 12, bodyBob: 4, at: 42.0 });

// ---------------------------------------------------------------------------
// Discovery (46.0): the lid swings open, gold light floods out.
// ---------------------------------------------------------------------------

scene.label("discover", 46.0);

// Positive rotation: with y-down screen coords and the hinge on the lid's RIGHT edge,
// +deg swings the lid's free (left) edge UP and over the hinge — -deg flops it down
// through the floor (verified the hard way on a rendered frame).
chestLid.rotateTo(75, { at: "discover", duration: 1.2, ease: "back.out(1.4)" });
coinPile.fadeTo(1, { at: "discover+0.2", duration: 0.6 });
chestGlow.fadeTo(0.95, { at: "discover", duration: 1.5 });
beam.fadeTo(0.55, { at: "discover+0.3", duration: 1.2 });

// A golden burst, then a long slow stream of rising sparkles.
scene.add(
  sketch.particles(CHEST_X, 288, { color: "#ffd94f" }, {
    count: 34, angle: -90, spread: 85, speedMin: 100, speedMax: 250,
    gravity: 240, lifetime: 1.5, at: 46.6, sizeMin: 2.5, sizeMax: 5,
  })
);
scene.add(
  sketch.particles(CHEST_X, 285, { color: "#fff3c0" }, {
    count: 30, angle: -90, spread: 40, speedMin: 18, speedMax: 55,
    gravity: -14, lifetime: 2.2, duration: 13, at: 46.8, sizeMin: 2, sizeMax: 3.5,
  })
);

// The hero's reaction: a startled squash-and-jump, an exclamation bubble.
hero.squashTo(1.18, 0.82, { at: 48.0, duration: 0.16, ease: "power2.out" });
hero.squashTo(0.86, 1.16, { at: 48.16, duration: 0.2, ease: "power2.out" });
hero.moveBy(0, -36, { at: 48.16, duration: 0.32, ease: "power2.out" });
hero.moveBy(0, 36, { at: 48.5, duration: 0.3, ease: "power2.in" });
hero.squashTo(1.22, 0.78, { at: 48.8, duration: 0.12, ease: "power2.out" });
hero.squashTo(1, 1, { at: 48.95, duration: 0.4, ease: "back.out(2.5)" });

const bubble = sketch.speechBubble(1490, 126, 52, 50, { color: "#ffe9f5", weight: 4, fill: { color: "#3a1a55", style: "solid" } }, { tailAt: "bottom-right" });
// Hand-plotted "!" — the font's own "!" ends in a single-point dot stroke, which the
// degenerate-shape lint (rightly) flags; a drawn bar + square dot survives the pixel
// grid better anyway.
const bangBar = sketch.stroke([[1516, 134], [1516, 154]], { color: "#ffd94f", weight: 6 });
const bangDot = sketch.loop(
  [[1512, 160], [1520, 160], [1520, 168], [1512, 168]],
  { color: "#ffd94f", weight: 2, smooth: false, fill: { color: "#ffd94f", style: "solid" } }
);
const exclaim = sketch.group([bubble, bangBar, bangDot]);
scene.add(exclaim.named("exclamation"));
exclaim.initial({ opacity: 0 });
exclaim.fadeTo(1, { at: 48.3, duration: 0.25 });
exclaim.fadeTo(0, { at: 50.8, duration: 0.5 });

// A second, softer coin sputter, and two happy bounces.
scene.add(
  sketch.particles(CHEST_X, 288, { color: "#ffd94f" }, {
    count: 16, angle: -90, spread: 70, speedMin: 70, speedMax: 160,
    gravity: 240, lifetime: 1.3, at: 50.4, sizeMin: 2.5, sizeMax: 4.5,
  })
);
hero.moveBy(0, -16, { at: 51.6, duration: 0.22, ease: "power2.out" });
hero.moveBy(0, 16, { at: 51.82, duration: 0.2, ease: "power2.in" });
hero.moveBy(0, -16, { at: 52.3, duration: 0.22, ease: "power2.out" });
hero.moveBy(0, 16, { at: 52.52, duration: 0.2, ease: "power2.in" });

// The glow settles into a slow breathing pulse under the closing card.
chestGlow.fadeTo(0.7, { at: 49.5, duration: 1.4 });
chestGlow.fadeTo(0.95, { at: 51.0, duration: 1.4 });
chestGlow.fadeTo(0.75, { at: 52.5, duration: 1.6 });
chestGlow.fadeTo(0.95, { at: 54.2, duration: 1.8 });

// Closing card.
const closing = sketch.text("treasure!", 1434, 150, { color: "#ffd94f", weight: 4 }, { size: 58 });
scene.add(closing.named("closing"));
closing.stagger(0.07, { at: 53.4, duration: 0.4 });

// ---------------------------------------------------------------------------
// Camera — opens on the hero, follows him the whole journey, then hands off to
// a fixed discovery framing (hero + chest) with a slow zoom-in.
// ---------------------------------------------------------------------------

const heroBox = hero.bbox();
const cam = scene.camera();
cam.panTo((heroBox.minX + heroBox.maxX) / 2, (heroBox.minY + heroBox.maxY) / 2, { at: 0, duration: 0 });
cam.follow(hero, { at: 9.0, duration: 36 });
// Any later pan/zoom SUPERSEDES the follow (it doesn't run alongside it), so the discovery
// framing is an explicit final composition: a deliberate small pan to center hero + chest
// together, with the zoom riding the same window. panTo x stays ≤1590 so the viewport's
// right edge never crosses the world's own edge even at zoom 1 mid-tween.
cam.panTo(1590, 250, { at: 46.0, duration: 1.6 });
cam.zoomTo(1.12, { at: 46.0, duration: 1.8 });

// ---------------------------------------------------------------------------
// Sound — a chiptune-flavored score on plucks, with a pad drone under it.
// ---------------------------------------------------------------------------

scene.add(sketch.sound("A2", { at: 0, duration: 58, instrument: "pad", velocity: 0.1 }));
// Opening motif.
scene.add(sketch.sound("C5", { at: 2.0, duration: 0.3, instrument: "pluck", velocity: 0.5 }));
scene.add(sketch.sound("E5", { at: 2.25, duration: 0.3, instrument: "pluck", velocity: 0.5 }));
scene.add(sketch.sound("G5", { at: 2.5, duration: 0.4, instrument: "pluck", velocity: 0.5 }));
// Gumdrop boings and the startled hop.
scene.add(sketch.sound("D4", { at: 13.8, duration: 0.3, instrument: "pluck", velocity: 0.45 }));
scene.add(sketch.sound("F4", { at: 14.4, duration: 0.3, instrument: "pluck", velocity: 0.45 }));
scene.add(sketch.sound("A4", { at: 15.34, duration: 0.35, instrument: "pluck", velocity: 0.5 }));
// Lollipop sway.
scene.add(sketch.sound("E5", { at: 21.5, duration: 0.4, instrument: "pluck", velocity: 0.4 }));
scene.add(sketch.sound("G5", { at: 22.3, duration: 0.4, instrument: "pluck", velocity: 0.4 }));
// Crystal chimes.
scene.add(sketch.sound("B5", { at: 30.4, duration: 0.6, instrument: "piano", velocity: 0.35 }));
scene.add(sketch.sound("D6", { at: 31.4, duration: 0.6, instrument: "piano", velocity: 0.3 }));
scene.add(sketch.sound("B5", { at: 32.6, duration: 0.7, instrument: "piano", velocity: 0.3 }));
// Cautious footsteps in the dark.
for (const t of [42.75, 43.5, 44.25, 45.0]) {
  scene.add(sketch.sound(null, { at: t, duration: 0.2, instrument: "thud", velocity: 0.35 }));
}
// Discovery arpeggio + swell.
scene.add(sketch.sound("C5", { at: 46.0, duration: 0.3, instrument: "pluck", velocity: 0.6 }));
scene.add(sketch.sound("E5", { at: 46.15, duration: 0.3, instrument: "pluck", velocity: 0.6 }));
scene.add(sketch.sound("G5", { at: 46.3, duration: 0.3, instrument: "pluck", velocity: 0.6 }));
scene.add(sketch.sound("C6", { at: 46.45, duration: 0.35, instrument: "pluck", velocity: 0.6 }));
scene.add(sketch.sound("E6", { at: 46.6, duration: 0.4, instrument: "pluck", velocity: 0.55 }));
scene.add(sketch.sound("C4", { at: 46.2, duration: 3.0, instrument: "strings", velocity: 0.25 }));
scene.add(sketch.sound("G4", { at: 46.2, duration: 3.0, instrument: "strings", velocity: 0.2 }));
// The "!"
scene.add(sketch.sound("B5", { at: 48.35, duration: 0.25, instrument: "pluck", velocity: 0.55 }));
// Coin sputter.
scene.add(sketch.sound("E6", { at: 50.5, duration: 0.2, instrument: "pluck", velocity: 0.4 }));
scene.add(sketch.sound("G6", { at: 50.7, duration: 0.2, instrument: "pluck", velocity: 0.4 }));
// Final chord.
scene.add(sketch.sound("C4", { at: 56.0, duration: 3.0, instrument: "piano", velocity: 0.4 }));
scene.add(sketch.sound("E4", { at: 56.0, duration: 3.0, instrument: "piano", velocity: 0.35 }));
scene.add(sketch.sound("G4", { at: 56.0, duration: 3.0, instrument: "piano", velocity: 0.35 }));
scene.add(sketch.sound("C5", { at: 56.2, duration: 3.0, instrument: "piano", velocity: 0.3 }));

scene.duration(62);

export default scene;
