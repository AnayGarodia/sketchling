import { sketch } from "../../src/index.js";
import { palette, GROUND_Y, PLANT_X, drawPip, groundBand } from "./_shared.js";

// PIP AND THE SAPLING — part 5: "Blooming"
// Time has passed since the storm — the same plant, grown all the way into a small tree
// with a full canopy and its first blossoms. The payoff scene: the biggest single-scene
// growth moment (a scale pulse on the whole tree) plus Pip's biggest reaction yet.
const scene = sketch.scene({ width: 480, height: 420, background: palette.skyDay, seed: "pip-05-blooming" });

const ground = sketch.loop(groundBand(480, 420), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.15,
  energy: "calm",
  smooth: false,
  fill: { color: palette.grass, style: "solid" },
});
scene.add(ground).drawOn({ at: 0.0, duration: 0.9 });

const sun = sketch.blob(400, 55, 26, { color: palette.ink, weight: "confident", looseness: 0.2, energy: "calm", fill: { color: palette.sun, style: "solid" } }, 12);
scene.add(sun).drawOn({ at: 1.0, duration: 0.45 });

// The tree, all as one group so the growth pulse and the after-pulse sway move trunk,
// canopy, and blossoms together, pivoted at the trunk's base rather than its own center.
const tree = sketch.group();
scene.add(tree);
tree.pivotAt(PLANT_X, GROUND_Y);

const trunk = sketch.loop(
  [
    [PLANT_X - 10, GROUND_Y],
    [PLANT_X - 6, GROUND_Y - 96],
    [PLANT_X + 6, GROUND_Y - 96],
    [PLANT_X + 10, GROUND_Y],
  ],
  { color: palette.ink, weight: "bold", looseness: 0.2, energy: "calm", smooth: false, fill: { color: palette.bark, style: "solid" } }
);
tree.add(trunk).drawOn({ at: 1.55, duration: 0.6 });

const canopyMain = sketch.blob(PLANT_X, GROUND_Y - 158, 58, { color: palette.ink, weight: "bold", looseness: 0.24, energy: "calm", fill: { color: palette.leaf, style: "hachure", density: 0.5, angle: 50 } }, 14);
tree.add(canopyMain).drawOn({ at: 2.25, duration: 0.65 });

const canopyLeft = sketch.blob(PLANT_X - 44, GROUND_Y - 130, 38, { color: palette.ink, weight: "confident", looseness: 0.26, energy: "calm", fill: { color: palette.sprout, style: "solid" } }, 12);
tree.add(canopyLeft).drawOn({ at: 3.0, duration: 0.5 });

const canopyRight = sketch.blob(PLANT_X + 46, GROUND_Y - 128, 40, { color: palette.ink, weight: "confident", looseness: 0.26, energy: "calm", fill: { color: palette.leaf, style: "hachure", density: 0.5, angle: 105 } }, 12);
tree.add(canopyRight).drawOn({ at: 3.6, duration: 0.5 });

const blossomSpots: Array<[number, number]> = [
  [PLANT_X - 30, GROUND_Y - 165],
  [PLANT_X + 8, GROUND_Y - 190],
  [PLANT_X + 40, GROUND_Y - 150],
  [PLANT_X - 55, GROUND_Y - 120],
  [PLANT_X + 60, GROUND_Y - 110],
];
let blossomStart = 4.2;
for (const [bx, by] of blossomSpots) {
  const blossom = sketch.blob(bx, by, 10, { color: palette.ink, weight: "light", looseness: 0.3, energy: "calm", fill: { color: palette.blossom, style: "solid" } }, 8);
  tree.add(blossom).drawOn({ at: blossomStart, duration: 0.16 });
  blossomStart += 0.2;
}

const pip = drawPip(scene, 175, GROUND_Y - 40, blossomStart + 0.15, "happy");

// The tree visibly grows a little more, right in front of you.
tree
  .scaleTo(1.12, { at: pip.endAt + 0.3, duration: 0.6, ease: "sine.out" })
  .scaleTo(1.0, { at: pip.endAt + 0.95, duration: 0.5, ease: "sine.inOut" });

// It keeps breathing gently in the breeze after that, for the rest of the scene.
tree
  .rotateTo(3, { at: pip.endAt + 1.6, duration: 1.1, ease: "sine.inOut" })
  .rotateTo(-2, { at: pip.endAt + 2.7, duration: 1.1, ease: "sine.inOut" })
  .rotateTo(2, { at: pip.endAt + 3.8, duration: 0.9, ease: "sine.inOut" });

// Pip's biggest reaction in the whole story: arms up, three quick happy hops.
pip.leftArm.rotateTo(135, { at: pip.endAt + 0.3, duration: 0.35, ease: "sine.out" }).rotateTo(115, { at: pip.endAt + 1.6, duration: 0.6 });
pip.rightArm.rotateTo(-135, { at: pip.endAt + 0.3, duration: 0.35, ease: "sine.out" }).rotateTo(-115, { at: pip.endAt + 1.6, duration: 0.6 });
pip.group
  .moveBy(0, -16, { at: pip.endAt + 0.3, duration: 0.2, ease: "sine.out" })
  .moveBy(0, 16, { at: pip.endAt + 0.5, duration: 0.2, ease: "sine.in" })
  .moveBy(0, -16, { at: pip.endAt + 0.75, duration: 0.2, ease: "sine.out" })
  .moveBy(0, 16, { at: pip.endAt + 0.95, duration: 0.2, ease: "sine.in" })
  .moveBy(0, -12, { at: pip.endAt + 1.2, duration: 0.18, ease: "sine.out" })
  .moveBy(0, 12, { at: pip.endAt + 1.38, duration: 0.18, ease: "sine.in" });

export default scene;
