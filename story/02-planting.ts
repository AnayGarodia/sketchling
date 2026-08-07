import { sketch } from "../src/index.js";
import { palette, GROUND_Y, PLANT_X, drawPip, groundBand, moundPoints } from "./_shared.js";

// PIP AND THE SAPLING — part 2: "Planting"
// Pip carries the seed to open ground, digs, plants it, and covers it back up. A quiet,
// deliberate scene on purpose — the middle beat of "want" before anything goes wrong.
const scene = sketch.scene({ width: 480, height: 420, background: palette.skyDay, seed: "pip-02-planting" });

const ground = sketch.loop(groundBand(480, 420), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.15,
  energy: "calm",
  smooth: false,
  fill: { color: palette.grass, style: "solid" },
});
scene.add(ground).drawOn({ at: 0.0, duration: 0.9 });

const sun = sketch.blob(90, 70, 26, { color: palette.ink, weight: "confident", looseness: 0.2, energy: "calm", fill: { color: palette.sun, style: "solid" } }, 12);
scene.add(sun).drawOn({ at: 1.0, duration: 0.5 });

const ray1 = sketch.stroke([[87, 30], [93, 14]], { color: palette.ink, weight: "light", looseness: 0.3, smooth: false });
scene.add(ray1).drawOn({ at: 1.6, duration: 0.12 });
const ray2 = sketch.stroke([[126, 52], [140, 40]], { color: palette.ink, weight: "light", looseness: 0.3, smooth: false });
scene.add(ray2).drawOn({ at: 1.78, duration: 0.12 });
const ray3 = sketch.stroke([[126, 90], [140, 100]], { color: palette.ink, weight: "light", looseness: 0.3, smooth: false });
scene.add(ray3).drawOn({ at: 1.96, duration: 0.12 });

// A small dug pit, open earth, waiting.
const hole = sketch.loop(
  [
    [248, GROUND_Y],
    [PLANT_X, GROUND_Y - 10],
    [288, GROUND_Y],
    [PLANT_X, GROUND_Y + 6],
  ],
  { color: palette.ink, weight: "light", looseness: 0.3, energy: "calm", smooth: false, fill: { color: palette.earthDark, style: "solid" } }
);
scene.add(hole).drawOn({ at: 2.3, duration: 0.3 });

const pip = drawPip(scene, 195, GROUND_Y - 40, 2.75, "happy");

// The seed, already carried in from scene 1, resting near Pip's open hand.
const seed = sketch.blob(255, GROUND_Y - 14, 10, { color: palette.ink, weight: "light", looseness: 0.25, energy: "calm", fill: { color: palette.earthDark, style: "solid" } }, 9);
scene.add(seed).drawOn({ at: pip.endAt + 0.1, duration: 0.2 });

// Reach down, drop the seed into the hole.
pip.rightArm.rotateTo(24, { at: pip.endAt + 0.4, duration: 0.3, ease: "sine.inOut" });
seed
  .moveBy(PLANT_X - 255, GROUND_Y - (GROUND_Y - 14), { at: pip.endAt + 0.4, duration: 0.3, ease: "sine.out" })
  .moveBy(0, 6, { at: pip.endAt + 0.75, duration: 0.15, ease: "sine.in" });

// Cover it back up — the mound paints over the hole and the seed, drawn last so it sits
// on top of both (the "hand coloring it in" fill reveal doubles as the covering motion).
const mound = sketch.loop(moundPoints(PLANT_X), {
  color: palette.ink,
  weight: "confident",
  looseness: 0.2,
  energy: "calm",
  smooth: false,
  fill: { color: palette.earth, style: "solid" },
});
scene.add(mound).drawOn({ at: pip.endAt + 1.0, duration: 0.55 });

// Pat it down, twice.
pip.rightArm
  .rotateTo(-5, { at: pip.endAt + 1.7, duration: 0.22, ease: "sine.inOut" })
  .rotateTo(22, { at: pip.endAt + 1.95, duration: 0.22, ease: "sine.inOut" })
  .rotateTo(-5, { at: pip.endAt + 2.2, duration: 0.22, ease: "sine.inOut" })
  .rotateTo(0, { at: pip.endAt + 2.45, duration: 0.25, ease: "sine.inOut" });

// Sit back and take it in.
pip.group
  .rotateTo(-5, { at: pip.endAt + 2.8, duration: 0.4, ease: "sine.inOut" })
  .rotateTo(0, { at: pip.endAt + 3.3, duration: 0.4, ease: "sine.inOut" });

export default scene;
