import { sketch } from "../src/index.js";
import { palette, GROUND_Y, PLANT_X, drawPip, groundBand } from "./_shared.js";

// PIP AND THE SAPLING — part 4: "The Storm"
// The obstacle. The sapling has grown taller and fuller since part 3 — and now a storm
// rolls in and threatens to break it. Pip rushes over and shields it until the wind eases
// and the sapling springs back upright, bent but not broken. This is the scene the whole
// story pivots on, so it gets the most motion and the most render checks.
const scene = sketch.scene({ width: 480, height: 420, background: palette.skyStorm, seed: "pip-04-the-storm" });

const ground = sketch.loop(groundBand(480, 420), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.15,
  energy: "calm",
  smooth: false,
  fill: { color: palette.grassStorm, style: "solid" },
});
scene.add(ground).drawOn({ at: 0.0, duration: 0.9 });

const cloud1a = sketch.blob(110, 72, 38, { color: palette.ink, weight: "light", looseness: 0.3, fill: { color: palette.cloudDark, style: "solid" } }, 10);
scene.add(cloud1a).drawOn({ at: 1.0, duration: 0.4 });
const cloud1b = sketch.blob(155, 58, 28, { color: palette.ink, weight: "light", looseness: 0.3, fill: { color: palette.cloud, style: "solid" } }, 10);
scene.add(cloud1b).drawOn({ at: 1.4, duration: 0.35 });

const cloud2a = sketch.blob(345, 55, 34, { color: palette.ink, weight: "light", looseness: 0.3, fill: { color: palette.cloudDark, style: "solid" } }, 10);
scene.add(cloud2a).drawOn({ at: 1.8, duration: 0.4 });
const cloud2b = sketch.blob(310, 68, 24, { color: palette.ink, weight: "light", looseness: 0.3, fill: { color: palette.cloud, style: "solid" } }, 10);
scene.add(cloud2b).drawOn({ at: 2.2, duration: 0.35 });

// The clouds keep drifting the whole time they're on screen, storm or not.
cloud1a.moveBy(18, 6, { at: 2.6, duration: 3.5, ease: "sine.inOut" });
cloud1b.moveBy(14, 4, { at: 2.6, duration: 3.5, ease: "sine.inOut" });
cloud2a.moveBy(-16, 5, { at: 2.6, duration: 3.5, ease: "sine.inOut" });
cloud2b.moveBy(-12, 3, { at: 2.6, duration: 3.5, ease: "sine.inOut" });

// The sapling — taller now, three leaves instead of two, picking up right where part 3's
// growth pulse left off.
const sapling = sketch.group();
scene.add(sapling);
sapling.pivotAt(PLANT_X, GROUND_Y - 4);

const stem = sketch.stroke(
  [
    [PLANT_X, GROUND_Y - 4],
    [PLANT_X - 3, GROUND_Y - 40],
    [PLANT_X + 2, GROUND_Y - 80],
    [PLANT_X - 1, GROUND_Y - 110],
  ],
  { color: palette.ink, weight: "confident", looseness: 0.2, energy: "calm", smooth: true }
);
sapling.add(stem).drawOn({ at: 2.4, duration: 0.6 });

const leafLeft = sketch.loop(
  [
    [PLANT_X - 2, GROUND_Y - 62],
    [PLANT_X - 34, GROUND_Y - 72],
    [PLANT_X - 8, GROUND_Y - 86],
  ],
  { color: palette.ink, weight: "confident", looseness: 0.28, energy: "quick", smooth: true, fill: { color: palette.sprout, style: "solid" } }
);
sapling.add(leafLeft).drawOn({ at: 3.05, duration: 0.35 });

const leafRight = sketch.loop(
  [
    [PLANT_X + 3, GROUND_Y - 76],
    [PLANT_X + 36, GROUND_Y - 84],
    [PLANT_X + 10, GROUND_Y - 98],
  ],
  { color: palette.ink, weight: "confident", looseness: 0.28, energy: "quick", smooth: true, fill: { color: palette.leaf, style: "solid" } }
);
sapling.add(leafRight).drawOn({ at: 3.45, duration: 0.35 });

const leafTop = sketch.loop(
  [
    [PLANT_X, GROUND_Y - 100],
    [PLANT_X - 18, GROUND_Y - 116],
    [PLANT_X + 4, GROUND_Y - 132],
  ],
  { color: palette.ink, weight: "confident", looseness: 0.28, energy: "quick", smooth: true, fill: { color: palette.sprout, style: "solid" } }
);
sapling.add(leafTop).drawOn({ at: 3.85, duration: 0.35 });

const pip = drawPip(scene, 130, GROUND_Y - 40, 4.3, "worried");

// Wind picks up: the sapling whips back and forth, harder each time.
sapling
  .rotateTo(-22, { at: pip.endAt + 0.2, duration: 0.3, ease: "power1.inOut" })
  .rotateTo(18, { at: pip.endAt + 0.5, duration: 0.3, ease: "power1.inOut" })
  .rotateTo(-32, { at: pip.endAt + 0.8, duration: 0.28, ease: "power1.inOut" })
  .rotateTo(26, { at: pip.endAt + 1.08, duration: 0.28, ease: "power1.inOut" })
  .rotateTo(-48, { at: pip.endAt + 1.36, duration: 0.3, ease: "power1.in" })
  .rotateTo(-42, { at: pip.endAt + 1.66, duration: 0.4, ease: "sine.inOut" });

// Rain — a gust of short wind-blown streaks, each falls a little and fades right after
// it draws, rather than sitting static.
const rainDrops: Array<[number, number, number]> = [
  [170, 90, 0.0],
  [210, 70, 0.08],
  [250, 100, 0.05],
  [290, 75, 0.14],
  [330, 95, 0.1],
  [190, 130, 0.2],
  [270, 135, 0.18],
];
for (const [rx, ry, delay] of rainDrops) {
  const t0 = pip.endAt + 0.3 + delay;
  const drop = sketch.stroke(
    [
      [rx, ry],
      [rx - 10, ry + 26],
    ],
    { color: palette.rain, weight: "light", looseness: 0.25, energy: "frantic", smooth: false }
  );
  scene.add(drop).drawOn({ at: t0, duration: 0.12 });
  drop
    .moveBy(-14, 34, { at: t0 + 0.12, duration: 0.35, ease: "sine.in" })
    .fadeTo(0, { at: t0 + 0.12, duration: 0.4, ease: "sine.in" });
}

// Pip rushes over — but stops short, leaving the sapling visible instead of standing on
// top of it — and reaches the right arm out to brace it, leaning in.
pip.group.moveBy(65, 0, { at: pip.endAt + 0.5, duration: 0.55, ease: "power1.out" });
pip.rightArm.rotateTo(-95, { at: pip.endAt + 1.0, duration: 0.35, ease: "sine.out" });
pip.leftArm.rotateTo(25, { at: pip.endAt + 1.0, duration: 0.35, ease: "sine.out" });
pip.group.rotateTo(9, { at: pip.endAt + 1.0, duration: 0.35, ease: "sine.out" });

// A second, lighter gust while Pip holds on.
const rainDrops2: Array<[number, number, number]> = [
  [200, 85, 0.0],
  [235, 100, 0.1],
  [305, 80, 0.06],
];
for (const [rx, ry, delay] of rainDrops2) {
  const t0 = pip.endAt + 1.9 + delay;
  const drop = sketch.stroke(
    [
      [rx, ry],
      [rx - 9, ry + 22],
    ],
    { color: palette.rain, weight: "light", looseness: 0.25, energy: "frantic", smooth: false }
  );
  scene.add(drop).drawOn({ at: t0, duration: 0.12 });
  drop
    .moveBy(-12, 30, { at: t0 + 0.12, duration: 0.32, ease: "sine.in" })
    .fadeTo(0, { at: t0 + 0.12, duration: 0.36, ease: "sine.in" });
}

// The storm passes. The sapling eases back upright — bent, but it held.
sapling
  .rotateTo(-18, { at: pip.endAt + 2.7, duration: 0.4, ease: "sine.inOut" })
  .rotateTo(7, { at: pip.endAt + 3.15, duration: 0.4, ease: "sine.inOut" })
  .rotateTo(-3, { at: pip.endAt + 3.6, duration: 0.35, ease: "sine.inOut" })
  .rotateTo(0, { at: pip.endAt + 4.0, duration: 0.35, ease: "sine.inOut" });

// Clouds break up and drift off.
cloud1a.moveBy(140, -30, { at: pip.endAt + 2.7, duration: 1.4, ease: "sine.in" }).fadeTo(0, { at: pip.endAt + 3.3, duration: 0.9 });
cloud1b.moveBy(150, -34, { at: pip.endAt + 2.7, duration: 1.4, ease: "sine.in" }).fadeTo(0, { at: pip.endAt + 3.3, duration: 0.9 });
cloud2a.moveBy(-150, -28, { at: pip.endAt + 2.7, duration: 1.4, ease: "sine.in" }).fadeTo(0, { at: pip.endAt + 3.3, duration: 0.9 });
cloud2b.moveBy(-140, -32, { at: pip.endAt + 2.7, duration: 1.4, ease: "sine.in" }).fadeTo(0, { at: pip.endAt + 3.3, duration: 0.9 });

// Pip relaxes, relieved — arms ease down, no longer braced.
pip.rightArm.rotateTo(-30, { at: pip.endAt + 3.6, duration: 0.4, ease: "sine.inOut" });
pip.leftArm.rotateTo(15, { at: pip.endAt + 3.6, duration: 0.4, ease: "sine.inOut" });
pip.group.rotateTo(0, { at: pip.endAt + 3.6, duration: 0.4, ease: "sine.inOut" });

export default scene;
