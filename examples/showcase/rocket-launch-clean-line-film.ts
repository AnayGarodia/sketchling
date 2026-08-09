import { sketch } from "../../src/index.js";

// Showcase: the full clean-line (ligne-claire-register) short — four scenes cut together
// with sketch.film(), not a single beat. Same recipe throughout (look: "flat" + weight:
// "bold" + fill.style: "solid" + looseness: 0) proven at story scale: a walker spots a
// distant rocket from a quay at dusk, arrives at the pad and looks it over, watches it
// ignite and climb, then the film settles on the walker small against a big sky as the
// rocket recedes into a dot. Original character/rocket/setting designs throughout — no
// reproduction of any specific existing work, just the same visual grammar the style is
// built from. A short piano-and-pad motif plays across all four scenes, on the same
// scene-global `at` timeline every visual animation already uses (see sketch.sound()).

const INK = "#111111";

function walkerGroup() {
  const w = sketch.group();
  const head = sketch.blob(0, 0, 22, { color: INK, weight: "bold", looseness: 0, fill: { color: "#f2d6b8", style: "solid" } }, 16);
  w.add(head);
  const tuft = sketch.stroke([[-10, -18], [-16, -34]], { color: INK, weight: "bold" });
  w.add(tuft);
  const torso = sketch.loop([[-16, 18], [16, 18], [22, 74], [-22, 74]], { color: INK, weight: "bold", fill: { color: "#3f9b7a", style: "solid" }, smooth: false });
  w.add(torso);
  return w;
}

// --- Scene 1: The Quay — dusk, a distant silhouette on the horizon. ---------------------
const scene1 = sketch.scene({
  width: 640,
  height: 420,
  background: { stops: [{ offset: 0, color: "#e8935c" }, { offset: 0.55, color: "#d9788f" }, { offset: 1, color: "#5a6f9c" }], direction: "vertical" },
  seed: "quay-dusk",
  look: "flat",
});

const sea = sketch.loop([[-10, 300], [650, 300], [650, 440], [-10, 440]], { color: INK, weight: "bold", fill: { color: "#3c5c86", style: "solid" }, smooth: false });
scene1.add(sea).appear({ at: 0, duration: 0.3 });
const quay = sketch.loop([[-10, 330], [280, 330], [280, 440], [-10, 440]], { color: INK, weight: "bold", fill: { color: "#7a6a52", style: "solid" }, smooth: false });
scene1.add(quay).appear({ at: 0, duration: 0.3 });

// A small silhouette on the horizon — the rocket, barely readable, seeding what scene 2
// reveals up close.
const distantRocket = sketch.loop(
  [[430, 250], [438, 210], [446, 250], [448, 300], [428, 300]],
  { color: INK, weight: "light", fill: { color: INK, style: "solid" }, smooth: false }
);
scene1.add(distantRocket).appear({ at: 1.2, duration: 0.4 });

const walker1 = walkerGroup();
scene1.add(walker1);
walker1.initial({ x: 40, y: 330 });
walker1.appear({ at: 0, duration: 0.3 });
walker1.moveBy(140, 0, { at: 0.3, duration: 1.6, ease: "sine.inOut" });
// Stops, turns to look toward the horizon once the rocket silhouette is visible.
walker1.pivotAt(180, 348);
walker1.rotateTo(-6, { at: 1.9, duration: 0.5, ease: "sine.out" });

// A soft wistful pad chord, dusk settling — mirrors the harbor's own quiet.
scene1.add(sketch.sound("D3", { at: 0, duration: 3.2, instrument: "pad", velocity: 0.4 }));
scene1.add(sketch.sound("A3", { at: 0.2, duration: 3.0, instrument: "pad", velocity: 0.3 }));
// Two curious rising notes as the walker spots the rocket.
scene1.add(sketch.sound("E4", { at: 1.9, duration: 0.5, instrument: "piano", velocity: 0.6 }));
scene1.add(sketch.sound("A4", { at: 2.3, duration: 0.7, instrument: "piano", velocity: 0.6 }));

// --- Scene 2: The Launch Pad — close on the rocket, walker looking it over. -------------
const scene2 = sketch.scene({ width: 640, height: 420, background: "#a8d4e8", seed: "launch-pad", look: "flat" });

const GROUND_Y2 = 380;
const ROCKET_X2 = 340;
const ground2 = sketch.loop([[-10, GROUND_Y2], [650, GROUND_Y2], [650, 440], [-10, 440]], { color: INK, weight: "bold", fill: { color: "#d9c48a", style: "solid" }, smooth: false });
scene2.add(ground2).appear({ at: 0, duration: 0.3 });

const rocket2 = sketch.group();
scene2.add(rocket2);
const nose2 = sketch.loop([[ROCKET_X2 - 30, GROUND_Y2 - 140], [ROCKET_X2, GROUND_Y2 - 220], [ROCKET_X2 + 30, GROUND_Y2 - 140]], { color: INK, weight: "bold", fill: { color: "#e8482c", style: "solid" }, smooth: false });
rocket2.add(nose2);
const bandWhite2 = sketch.loop([[ROCKET_X2 - 30, GROUND_Y2 - 140], [ROCKET_X2 + 30, GROUND_Y2 - 140], [ROCKET_X2 + 34, GROUND_Y2 - 60], [ROCKET_X2 - 34, GROUND_Y2 - 60]], { color: INK, weight: "bold", fill: { color: "#f4efe0", style: "solid" }, smooth: false });
rocket2.add(bandWhite2);
const bandRed2 = sketch.loop([[ROCKET_X2 - 34, GROUND_Y2 - 60], [ROCKET_X2 + 34, GROUND_Y2 - 60], [ROCKET_X2 + 38, GROUND_Y2], [ROCKET_X2 - 38, GROUND_Y2]], { color: INK, weight: "bold", fill: { color: "#e8482c", style: "solid" }, smooth: false });
rocket2.add(bandRed2);
const finL2 = sketch.loop([[ROCKET_X2 - 34, GROUND_Y2 - 60], [ROCKET_X2 - 70, GROUND_Y2], [ROCKET_X2 - 34, GROUND_Y2 - 10]], { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false });
rocket2.add(finL2);
const finR2 = sketch.loop([[ROCKET_X2 + 34, GROUND_Y2 - 60], [ROCKET_X2 + 70, GROUND_Y2], [ROCKET_X2 + 34, GROUND_Y2 - 10]], { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false });
rocket2.add(finR2);
const window2 = sketch.blob(ROCKET_X2, GROUND_Y2 - 110, 16, { color: INK, weight: "bold", looseness: 0, fill: { color: "#5ec9e8", style: "solid" } }, 16);
rocket2.add(window2);
rocket2.appear({ at: 0, duration: 0.3 });

// A gantry ladder beside the rocket — a small bit of scene furniture that reads as "launch
// pad" beyond the rocket alone, built from the same stroke/loop primitives as everything
// else, no new capability.
const ladder = sketch.group();
scene2.add(ladder);
const ladderRailL = sketch.stroke([[ROCKET_X2 + 70, GROUND_Y2], [ROCKET_X2 + 78, GROUND_Y2 - 150]], { color: INK, weight: "confident" });
ladder.add(ladderRailL);
const ladderRailR = sketch.stroke([[ROCKET_X2 + 92, GROUND_Y2], [ROCKET_X2 + 100, GROUND_Y2 - 150]], { color: INK, weight: "confident" });
ladder.add(ladderRailR);
for (let i = 0; i < 6; i++) {
  const t = i / 5;
  const y = GROUND_Y2 - t * 150;
  const xL = ROCKET_X2 + 70 + t * 8;
  const xR = ROCKET_X2 + 92 + t * 8;
  ladder.add(sketch.stroke([[xL, y], [xR, y]], { color: INK, weight: "light" }));
}
ladder.appear({ at: 0.2, duration: 0.3 });

const walker2 = walkerGroup();
scene2.add(walker2);
walker2.initial({ x: 150, y: GROUND_Y2 - 74 });
walker2.appear({ at: 0, duration: 0.3 });
walker2.moveBy(60, 0, { at: 0.4, duration: 0.9, ease: "sine.inOut" });
walker2.pivotAt(210, GROUND_Y2 - 56);
walker2.rotateTo(-10, { at: 1.4, duration: 0.4, ease: "sine.out" });
walker2.rotateTo(6, { at: 2.3, duration: 0.5, ease: "sine.inOut" });
walker2.rotateTo(-4, { at: 2.9, duration: 0.5, ease: "sine.inOut" });

// A short rising phrase as the walker takes in the full height of the rocket.
scene2.add(sketch.sound("C4", { at: 0.6, duration: 0.4, instrument: "piano", velocity: 0.7 }));
scene2.add(sketch.sound("F4", { at: 1.0, duration: 0.4, instrument: "piano", velocity: 0.7 }));
scene2.add(sketch.sound("A4", { at: 1.4, duration: 0.6, instrument: "piano", velocity: 0.8 }));
scene2.add(sketch.sound("F3", { at: 0.6, duration: 3.0, instrument: "pad", velocity: 0.35 }));

// --- Scene 3: Ignition — camera follows the rocket up through a tall world. -------------
const WORLD_HEIGHT3 = 1400;
const scene3 = sketch.scene({
  width: 640,
  height: WORLD_HEIGHT3,
  viewport: { width: 640, height: 420 },
  background: { stops: [{ offset: 0, color: "#4f8fc9" }, { offset: 1, color: "#a8d4e8" }], direction: "vertical" },
  seed: "ignition",
  look: "flat",
});

const GROUND_Y3 = WORLD_HEIGHT3 - 40;
const ROCKET_X3 = 340;

const ground3 = sketch.loop([[-10, GROUND_Y3], [650, GROUND_Y3], [650, WORLD_HEIGHT3 + 20], [-10, WORLD_HEIGHT3 + 20]], { color: INK, weight: "bold", fill: { color: "#d9c48a", style: "solid" }, smooth: false });
scene3.add(ground3).appear({ at: 0, duration: 0.3 });

const rocket3 = sketch.group();
scene3.add(rocket3);
const nose3 = sketch.loop([[ROCKET_X3 - 30, GROUND_Y3 - 140], [ROCKET_X3, GROUND_Y3 - 220], [ROCKET_X3 + 30, GROUND_Y3 - 140]], { color: INK, weight: "bold", fill: { color: "#e8482c", style: "solid" }, smooth: false });
rocket3.add(nose3);
const bandWhite3 = sketch.loop([[ROCKET_X3 - 30, GROUND_Y3 - 140], [ROCKET_X3 + 30, GROUND_Y3 - 140], [ROCKET_X3 + 34, GROUND_Y3 - 60], [ROCKET_X3 - 34, GROUND_Y3 - 60]], { color: INK, weight: "bold", fill: { color: "#f4efe0", style: "solid" }, smooth: false });
rocket3.add(bandWhite3);
const bandRed3 = sketch.loop([[ROCKET_X3 - 34, GROUND_Y3 - 60], [ROCKET_X3 + 34, GROUND_Y3 - 60], [ROCKET_X3 + 38, GROUND_Y3], [ROCKET_X3 - 38, GROUND_Y3]], { color: INK, weight: "bold", fill: { color: "#e8482c", style: "solid" }, smooth: false });
rocket3.add(bandRed3);
const finL3 = sketch.loop([[ROCKET_X3 - 34, GROUND_Y3 - 60], [ROCKET_X3 - 70, GROUND_Y3], [ROCKET_X3 - 34, GROUND_Y3 - 10]], { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false });
rocket3.add(finL3);
const finR3 = sketch.loop([[ROCKET_X3 + 34, GROUND_Y3 - 60], [ROCKET_X3 + 70, GROUND_Y3], [ROCKET_X3 + 34, GROUND_Y3 - 10]], { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false });
rocket3.add(finR3);
const window3 = sketch.blob(ROCKET_X3, GROUND_Y3 - 110, 16, { color: INK, weight: "bold", looseness: 0, fill: { color: "#5ec9e8", style: "solid" } }, 16);
rocket3.add(window3);
rocket3.appear({ at: 0, duration: 0.2 });

const walker3 = walkerGroup();
scene3.add(walker3);
walker3.initial({ x: 210, y: GROUND_Y3 - 74 });
walker3.appear({ at: 0, duration: 0.2 });
walker3.pivotAt(210, GROUND_Y3 - 56);
// Braces, stepping back a touch as the engines catch.
walker3.moveBy(-30, 0, { at: 0.6, duration: 0.5, ease: "sine.out" });
walker3.rotateTo(-14, { at: 0.6, duration: 0.5, ease: "sine.out" });

scene3.add(sketch.particles(ROCKET_X3, GROUND_Y3 - 5, { color: "#f2c94c" }, { count: 50, angle: 100, spread: 130, speedMin: 40, speedMax: 140, gravity: 60, lifetime: 1.6, duration: 0.6, at: 0.9, sizeMin: 3, sizeMax: 7 }));
scene3.add(sketch.particles(ROCKET_X3, GROUND_Y3 - 5, { color: "#e8482c" }, { count: 30, angle: 100, spread: 100, speedMin: 20, speedMax: 90, gravity: 40, lifetime: 1.4, duration: 0.5, at: 1.0, sizeMin: 4, sizeMax: 8 }));

const LIFT_AT3 = 1.0;
const LIFT_DURATION3 = 2.8;
rocket3.moveBy(0, -(WORLD_HEIGHT3 - 500), { at: LIFT_AT3, duration: LIFT_DURATION3, ease: "power2.in" });

const cam3 = scene3.camera();
cam3.panTo(320, GROUND_Y3 - 110, { at: 0, duration: 0 });
cam3.follow(rocket3, { at: LIFT_AT3, duration: LIFT_DURATION3 + 0.6 });

// A thud on ignition, then strings carry the climb — the emotional high point of the piece.
scene3.add(sketch.sound(null, { at: 0.9, duration: 0.2, instrument: "thud", velocity: 1 }));
scene3.add(sketch.sound("C3", { at: 1.0, duration: 3.2, instrument: "strings", velocity: 0.6 }));
scene3.add(sketch.sound("G3", { at: 1.0, duration: 3.2, instrument: "strings", velocity: 0.4 }));
scene3.add(sketch.sound("E4", { at: 2.2, duration: 1.6, instrument: "strings", velocity: 0.5 }));

// --- Scene 4: Into the Blue — the walker small against a big sky, the rocket a dot. -----
const scene4 = sketch.scene({ width: 640, height: 420, background: { stops: [{ offset: 0, color: "#2f5c8f" }, { offset: 1, color: "#bfe0ef" }], direction: "vertical" }, seed: "into-the-blue", look: "flat" });

const ground4 = sketch.loop([[-10, 390], [650, 390], [650, 440], [-10, 440]], { color: INK, weight: "bold", fill: { color: "#d9c48a", style: "solid" }, smooth: false });
scene4.add(ground4).appear({ at: 0, duration: 0.3 });

// The rocket now just a small mark high in a very big sky — the scale-contrast beat the
// piece has been building toward.
const farRocket = sketch.loop([[318, 60], [322, 44], [326, 60], [327, 78], [317, 78]], { color: INK, weight: "light", fill: { color: INK, style: "solid" }, smooth: false });
scene4.add(farRocket).appear({ at: 0, duration: 0.3 });
farRocket.moveBy(6, -20, { at: 0.3, duration: 3.5, ease: "sine.in" });

const walker4 = walkerGroup();
scene4.add(walker4);
walker4.initial({ x: 320, y: 316 });
walker4.appear({ at: 0, duration: 0.3 });
walker4.pivotAt(320, 372);
walker4.rotateTo(-18, { at: 0.3, duration: 0.5, ease: "sine.out" });
// A small wave.
walker4.rotateTo(-12, { at: 2.0, duration: 0.4, ease: "sine.inOut" });
walker4.rotateTo(-18, { at: 2.6, duration: 0.4, ease: "sine.inOut" });

// The opening pad returns, and the melody resolves on the note it started from.
scene4.add(sketch.sound("D3", { at: 0, duration: 3.6, instrument: "pad", velocity: 0.35 }));
scene4.add(sketch.sound("A3", { at: 0.2, duration: 3.2, instrument: "pad", velocity: 0.25 }));
scene4.add(sketch.sound("D4", { at: 2.6, duration: 1.0, instrument: "piano", velocity: 0.5 }));

// --- Cut together --------------------------------------------------------------------
const film = sketch.film({ width: 640, height: 420, background: "#000000" });
film
  .addScene(scene1, { hold: 0.4 })
  .addScene(scene2, { transition: "fade", transitionDuration: 0.6, hold: 0.3 })
  .addScene(scene3, { transition: "fade", transitionDuration: 0.6, hold: 0.5 })
  .addScene(scene4, { transition: "fade", transitionDuration: 0.8, hold: 0.6 });

export default film;
