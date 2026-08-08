import { sketch } from "../../src/index.js";
import { palette, GROUND_Y, PLANT_X, drawPip, groundBand } from "./_shared.js";

// PIP AND THE SAPLING — part 6: "Home"
// The resolution. The same tree, fully grown, golden hour. Pip is already here, settled.
// A bird arrives and lands in the branches — a second small life the tree can now hold —
// and the story ends on a calm held frame instead of another big gesture.
const scene = sketch.scene({ width: 480, height: 420, background: palette.skyDusk, seed: "pip-06-home" });

const ground = sketch.loop(groundBand(480, 420), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.15,
  energy: "calm",
  smooth: false,
  fill: { color: palette.grass, style: "solid" },
});
scene.add(ground).drawOn({ at: 0.0, duration: 0.9 });

const sun = sketch.blob(430, 272, 36, { color: palette.ink, weight: "confident", looseness: 0.2, energy: "calm", fill: { color: palette.sun, style: "solid" } }, 12);
scene.add(sun).drawOn({ at: 1.0, duration: 0.5 });

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
tree.add(trunk).drawOn({ at: 1.6, duration: 0.6 });

const canopyMain = sketch.blob(PLANT_X, GROUND_Y - 158, 58, { color: palette.ink, weight: "bold", looseness: 0.24, energy: "calm", fill: { color: palette.leaf, style: "hachure", density: 0.5, angle: 50 } }, 14);
tree.add(canopyMain).drawOn({ at: 2.3, duration: 0.65 });

const canopyLeft = sketch.blob(PLANT_X - 44, GROUND_Y - 130, 38, { color: palette.ink, weight: "confident", looseness: 0.26, energy: "calm", fill: { color: palette.sprout, style: "solid" } }, 12);
tree.add(canopyLeft).drawOn({ at: 3.05, duration: 0.5 });

const canopyRight = sketch.blob(PLANT_X + 46, GROUND_Y - 128, 40, { color: palette.ink, weight: "confident", looseness: 0.26, energy: "calm", fill: { color: palette.leaf, style: "hachure", density: 0.5, angle: 105 } }, 12);
tree.add(canopyRight).drawOn({ at: 3.65, duration: 0.5 });

const blossomSpots: Array<[number, number]> = [
  [PLANT_X - 30, GROUND_Y - 165],
  [PLANT_X + 8, GROUND_Y - 190],
  [PLANT_X + 40, GROUND_Y - 150],
  [PLANT_X - 55, GROUND_Y - 120],
  [PLANT_X + 60, GROUND_Y - 110],
];
let blossomStart = 4.25;
for (const [bx, by] of blossomSpots) {
  const blossom = sketch.blob(bx, by, 10, { color: palette.ink, weight: "light", looseness: 0.3, energy: "calm", fill: { color: palette.blossom, style: "solid" } }, 8);
  tree.add(blossom).drawOn({ at: blossomStart, duration: 0.16 });
  blossomStart += 0.2;
}

// The tree breathes gently in the evening air for the whole rest of the scene.
tree
  .rotateTo(3, { at: blossomStart + 0.2, duration: 1.2, ease: "sine.inOut" })
  .rotateTo(-2, { at: blossomStart + 1.4, duration: 1.2, ease: "sine.inOut" })
  .rotateTo(2, { at: blossomStart + 2.6, duration: 1.1, ease: "sine.inOut" })
  .rotateTo(0, { at: blossomStart + 3.7, duration: 0.9, ease: "sine.inOut" });

const pip = drawPip(scene, 175, GROUND_Y - 40, blossomStart + 0.35, "happy");

// A small, relaxed idle sway — home, and in no hurry.
pip.rightArm
  .rotateTo(9, { at: pip.endAt + 0.2, duration: 1.3, ease: "sine.inOut" })
  .rotateTo(-4, { at: pip.endAt + 1.5, duration: 1.3, ease: "sine.inOut" })
  .rotateTo(0, { at: pip.endAt + 2.8, duration: 1.0, ease: "sine.inOut" });

// A bird arrives, swoops down in two legs, and lands in the branches.
const bird = sketch.group();
scene.add(bird);

const birdBody = sketch.blob(440, 50, 15, { color: palette.ink, weight: "confident", looseness: 0.25, energy: "calm", fill: { color: palette.bird, style: "solid" } }, 10);
bird.add(birdBody).drawOn({ at: pip.endAt + 0.3, duration: 0.25 });

const wing = sketch
  .loop([[440, 46], [453, 37], [447, 55]], { color: palette.ink, weight: "confident", looseness: 0.3, energy: "quick", smooth: true, fill: { color: palette.birdWing, style: "solid" } })
  .pivotAt(440, 46);
bird.add(wing).drawOn({ at: pip.endAt + 0.58, duration: 0.2 });

const beak = sketch.stroke([[429, 52], [419, 50]], { color: "#e8a23a", weight: "confident", looseness: 0.2, energy: "calm", smooth: false });
bird.add(beak).drawOn({ at: pip.endAt + 0.81, duration: 0.12 });

bird
  .moveBy(-72, 50, { at: pip.endAt + 1.05, duration: 0.5, ease: "sine.in" })
  .moveBy(-48, 75, { at: pip.endAt + 1.55, duration: 0.45, ease: "sine.out" })
  .moveBy(0, -6, { at: pip.endAt + 2.0, duration: 0.15, ease: "sine.out" })
  .moveBy(0, 6, { at: pip.endAt + 2.15, duration: 0.15, ease: "sine.in" });

// Settled in, it flutters its wings twice, then goes still except for line boil.
wing
  .rotateTo(-35, { at: pip.endAt + 2.35, duration: 0.15, ease: "sine.out" })
  .rotateTo(15, { at: pip.endAt + 2.5, duration: 0.15, ease: "sine.inOut" })
  .rotateTo(-25, { at: pip.endAt + 2.65, duration: 0.15, ease: "sine.inOut" })
  .rotateTo(0, { at: pip.endAt + 2.8, duration: 0.18, ease: "sine.inOut" })
  .rotateTo(-20, { at: pip.endAt + 3.2, duration: 0.14, ease: "sine.out" })
  .rotateTo(5, { at: pip.endAt + 3.34, duration: 0.14, ease: "sine.inOut" })
  .rotateTo(0, { at: pip.endAt + 3.48, duration: 0.16, ease: "sine.inOut" });

export default scene;
