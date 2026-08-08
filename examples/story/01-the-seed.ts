import { sketch } from "../../src/index.js";
import { palette, GROUND_Y, SPRITE_STAND_X, drawPip, groundBand } from "./_shared.js";

// PIP AND THE SAPLING — part 1: "The Seed"
// A bare autumn tree has dropped everything it had. Pip finds one small thing under it
// that the tree doesn't need anymore, and picks it up. Establishes the character, the
// palette, and the one prop (the seed) the rest of the story is built around.
const scene = sketch.scene({ width: 480, height: 420, background: palette.skyDawn, seed: "pip-01-the-seed" });

const ground = sketch.loop(groundBand(480, 420), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.15,
  energy: "calm",
  smooth: false,
  fill: { color: palette.grass, style: "solid" },
});
scene.add(ground).drawOn({ at: 0.0, duration: 0.9 });

const trunk = sketch.loop(
  [
    [372, GROUND_Y],
    [388, 210],
    [400, 210],
    [412, GROUND_Y],
  ],
  { color: palette.ink, weight: "bold", looseness: 0.2, energy: "calm", smooth: false, fill: { color: palette.bark, style: "solid" } }
);
scene.add(trunk).drawOn({ at: 1.0, duration: 0.6 });

const branch1 = sketch.stroke(
  [[394, 214], [365, 175], [345, 150]],
  { color: palette.ink, weight: "confident", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(branch1).drawOn({ at: 1.7, duration: 0.25 });

const branch2 = sketch.stroke(
  [[398, 212], [400, 165], [392, 128]],
  { color: palette.ink, weight: "confident", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(branch2).drawOn({ at: 2.0, duration: 0.25 });

const branch3 = sketch.stroke(
  [[402, 214], [432, 178], [452, 155]],
  { color: palette.ink, weight: "confident", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(branch3).drawOn({ at: 2.3, duration: 0.25 });

const fallenLeaf1 = sketch.blob(345, GROUND_Y - 6, 11, { color: palette.ink, weight: "light", looseness: 0.4, fill: { color: "#c1452f", style: "solid" } }, 8);
scene.add(fallenLeaf1).drawOn({ at: 2.65, duration: 0.2 });

const fallenLeaf2 = sketch.blob(430, GROUND_Y - 5, 10, { color: palette.ink, weight: "light", looseness: 0.4, fill: { color: "#c98a2f", style: "solid" } }, 8);
scene.add(fallenLeaf2).drawOn({ at: 2.9, duration: 0.2 });

const pip = drawPip(scene, SPRITE_STAND_X, GROUND_Y - 40, 3.15, "happy");

// The seed: small, easy to miss, sitting in the grass between Pip and the tree.
const seed = sketch.blob(250, GROUND_Y - 8, 10, { color: palette.ink, weight: "light", looseness: 0.25, energy: "calm", fill: { color: palette.earthDark, style: "solid" } }, 9);
scene.add(seed).drawOn({ at: pip.endAt + 0.1, duration: 0.2 });

// Pip reaches down for it, then lifts it up to eye level to look it over.
pip.rightArm
  .rotateTo(25, { at: pip.endAt + 0.45, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-60, { at: pip.endAt + 0.85, duration: 0.5, ease: "sine.out" })
  .rotateTo(-45, { at: pip.endAt + 1.75, duration: 0.4, ease: "sine.inOut" });

// NOTE: empirically .moveTo() behaves like .moveBy() in this build (moves relative to the
// node's current position, not to an absolute canvas point, despite how the README reads) —
// so every "move to a specific spot" animation in this story is written as moveBy(delta).
seed
  .moveBy(168 - 250, 212 - (GROUND_Y - 8), { at: pip.endAt + 0.85, duration: 0.5, ease: "sine.out" })
  .rotateTo(18, { at: pip.endAt + 1.45, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-16, { at: pip.endAt + 1.8, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(0, { at: pip.endAt + 2.15, duration: 0.3, ease: "sine.inOut" });

// A small delighted bounce while Pip studies the seed.
pip.group
  .moveBy(0, -7, { at: pip.endAt + 1.45, duration: 0.3, ease: "sine.out" })
  .moveBy(0, 7, { at: pip.endAt + 1.8, duration: 0.3, ease: "sine.in" });

export default scene;
