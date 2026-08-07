import { sketch } from "../src/index.js";
import { palette, GROUND_Y, PLANT_X, drawPip, groundBand, moundPoints } from "./_shared.js";

// PIP AND THE SAPLING — part 3: "First Sprout"
// Same spot, later. The mound is still there — and now something is coming up out of it.
// The whole scene is built to answer one question the audience is already asking after
// part 2: did it work?
const scene = sketch.scene({ width: 480, height: 420, background: palette.skyDay, seed: "pip-03-first-sprout" });

const ground = sketch.loop(groundBand(480, 420), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.15,
  energy: "calm",
  smooth: false,
  fill: { color: palette.grass, style: "solid" },
});
scene.add(ground).drawOn({ at: 0.0, duration: 0.9 });

const sun = sketch.blob(400, 60, 24, { color: palette.ink, weight: "confident", looseness: 0.2, energy: "calm", fill: { color: palette.sun, style: "solid" } }, 12);
scene.add(sun).drawOn({ at: 1.0, duration: 0.45 });

const mound = sketch.loop(moundPoints(PLANT_X), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.2,
  energy: "calm",
  smooth: false,
  fill: { color: palette.earth, style: "solid" },
});
scene.add(mound).drawOn({ at: 1.55, duration: 0.55 });

// Pip is already here, sitting close, waiting — a beat of stillness before the reveal.
const pip = drawPip(scene, 195, GROUND_Y - 40, 2.25, "flat");

// The sprout: a stem group so it can be scaled/swayed as one unit, pivoted at its own
// base in the mound so growth and sway happen from the ground up, not from its middle.
const sprout = sketch.group();
scene.add(sprout);
sprout.pivotAt(PLANT_X, GROUND_Y - 18);

const stem = sketch.stroke(
  [
    [PLANT_X, GROUND_Y - 18],
    [PLANT_X - 2, GROUND_Y - 44],
    [PLANT_X + 2, GROUND_Y - 66],
  ],
  { color: palette.ink, weight: "confident", looseness: 0.22, energy: "calm", smooth: true }
);
sprout.add(stem).drawOn({ at: pip.endAt + 0.3, duration: 0.5 });

const leafLeft = sketch.loop(
  [
    [PLANT_X + 1, GROUND_Y - 60],
    [PLANT_X - 22, GROUND_Y - 68],
    [PLANT_X - 4, GROUND_Y - 78],
  ],
  { color: palette.ink, weight: "confident", looseness: 0.3, energy: "quick", smooth: true, fill: { color: palette.sprout, style: "solid" } }
);
sprout.add(leafLeft).drawOn({ at: pip.endAt + 0.9, duration: 0.35 });

const leafRight = sketch.loop(
  [
    [PLANT_X + 3, GROUND_Y - 60],
    [PLANT_X + 26, GROUND_Y - 66],
    [PLANT_X + 9, GROUND_Y - 78],
  ],
  { color: palette.ink, weight: "confident", looseness: 0.3, energy: "quick", smooth: true, fill: { color: palette.leaf, style: "solid" } }
);
sprout.add(leafRight).drawOn({ at: pip.endAt + 1.35, duration: 0.35 });

// It grows a little right in front of you — a quick, visible pulse, not just a static reveal.
sprout
  .scaleTo(1.18, { at: pip.endAt + 1.85, duration: 0.5, ease: "sine.out" })
  .scaleTo(1.0, { at: pip.endAt + 2.4, duration: 0.4, ease: "sine.inOut" });

// A gentle, continuing sway so the sprout doesn't go still once it's grown.
sprout
  .rotateTo(6, { at: pip.endAt + 2.9, duration: 0.9, ease: "sine.inOut" })
  .rotateTo(-5, { at: pip.endAt + 3.8, duration: 0.9, ease: "sine.inOut" })
  .rotateTo(3, { at: pip.endAt + 4.7, duration: 0.7, ease: "sine.inOut" });

// Pip's reaction: both arms up, a delighted little jump. Arms hang down-and-out by
// default, so "raised overhead" is a large swing around the shoulder (~130deg), not a
// small tweak — confirmed empirically, the small angles used for waves/reaches elsewhere
// don't get an arm past horizontal.
pip.leftArm.rotateTo(135, { at: pip.endAt + 1.85, duration: 0.4, ease: "sine.out" }).rotateTo(120, { at: pip.endAt + 2.35, duration: 0.4 });
pip.rightArm.rotateTo(-135, { at: pip.endAt + 1.85, duration: 0.4, ease: "sine.out" }).rotateTo(-120, { at: pip.endAt + 2.35, duration: 0.4 });
pip.group
  .moveBy(0, -14, { at: pip.endAt + 1.85, duration: 0.22, ease: "sine.out" })
  .moveBy(0, 14, { at: pip.endAt + 2.07, duration: 0.22, ease: "sine.in" })
  .moveBy(0, -10, { at: pip.endAt + 2.35, duration: 0.2, ease: "sine.out" })
  .moveBy(0, 10, { at: pip.endAt + 2.55, duration: 0.2, ease: "sine.in" });

export default scene;
