import { sketch } from "../../src/index.js";

// Showcase: a short clean-line (ligne-claire-register) adventure beat — a character walks
// up to a rocket on the pad, ignition, liftoff, camera following it up through a tall
// world. Same recipe as examples/gallery/ligne-claire-look.ts (look: "flat" + weight:
// "bold" + fill.style: "solid" + looseness: 0 on every blob) proven out at story scale
// instead of a single static tableau — original character/rocket design, not a
// reproduction of any specific existing work, in the spirit of the clean-line style itself.

const WORLD_HEIGHT = 1400;
const scene = sketch.scene({
  width: 640,
  height: WORLD_HEIGHT,
  viewport: { width: 640, height: 420 },
  background: { stops: [{ offset: 0, color: "#4f8fc9" }, { offset: 1, color: "#a8d4e8" }], direction: "vertical" },
  seed: "rocket-launch-clean-line",
  look: "flat",
});

const INK = "#111111";
const GROUND_Y = WORLD_HEIGHT - 40;
const ROCKET_X = 340;

const ground = sketch.loop(
  [
    [-10, GROUND_Y],
    [650, GROUND_Y],
    [650, WORLD_HEIGHT + 20],
    [-10, WORLD_HEIGHT + 20],
  ],
  { color: INK, weight: "bold", fill: { color: "#d9c48a", style: "solid" }, smooth: false }
);
scene.add(ground).appear({ at: 0, duration: 0.3 });

// A generic banded rocket on a launch pad — not a reproduction of any specific existing
// design, just the same silhouette language (tapered body, fins, a window, flat bands of
// color) the clean-line style itself is built from.
const rocket = sketch.group();
scene.add(rocket);
const nose = sketch.loop(
  [[ROCKET_X - 30, GROUND_Y - 140], [ROCKET_X, GROUND_Y - 220], [ROCKET_X + 30, GROUND_Y - 140]],
  { color: INK, weight: "bold", fill: { color: "#e8482c", style: "solid" }, smooth: false }
);
rocket.add(nose);
const bandWhite = sketch.loop(
  [[ROCKET_X - 30, GROUND_Y - 140], [ROCKET_X + 30, GROUND_Y - 140], [ROCKET_X + 34, GROUND_Y - 60], [ROCKET_X - 34, GROUND_Y - 60]],
  { color: INK, weight: "bold", fill: { color: "#f4efe0", style: "solid" }, smooth: false }
);
rocket.add(bandWhite);
const bandRed = sketch.loop(
  [[ROCKET_X - 34, GROUND_Y - 60], [ROCKET_X + 34, GROUND_Y - 60], [ROCKET_X + 38, GROUND_Y], [ROCKET_X - 38, GROUND_Y]],
  { color: INK, weight: "bold", fill: { color: "#e8482c", style: "solid" }, smooth: false }
);
rocket.add(bandRed);
const finL = sketch.loop(
  [[ROCKET_X - 34, GROUND_Y - 60], [ROCKET_X - 70, GROUND_Y], [ROCKET_X - 34, GROUND_Y - 10]],
  { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false }
);
rocket.add(finL);
const finR = sketch.loop(
  [[ROCKET_X + 34, GROUND_Y - 60], [ROCKET_X + 70, GROUND_Y], [ROCKET_X + 34, GROUND_Y - 10]],
  { color: INK, weight: "bold", fill: { color: "#f2c94c", style: "solid" }, smooth: false }
);
rocket.add(finR);
const window1 = sketch.blob(ROCKET_X, GROUND_Y - 110, 16, { color: INK, weight: "bold", looseness: 0, fill: { color: "#5ec9e8", style: "solid" } }, 16);
rocket.add(window1);
rocket.appear({ at: 0, duration: 0.4 });

// A small clean-line figure, walking in from the left to admire the rocket before it goes.
const walker = sketch.group();
scene.add(walker);
const head = sketch.blob(0, 0, 22, { color: INK, weight: "bold", looseness: 0, fill: { color: "#f2d6b8", style: "solid" } }, 16);
walker.add(head);
const tuft = sketch.stroke([[-10, -18], [-16, -34]], { color: INK, weight: "bold" });
walker.add(tuft);
const torso = sketch.loop([[-16, 18], [16, 18], [22, 74], [-22, 74]], { color: INK, weight: "bold", fill: { color: "#3f9b7a", style: "solid" }, smooth: false });
walker.add(torso);
walker.initial({ x: 60, y: GROUND_Y - 74 });
walker.appear({ at: 0.2, duration: 0.3 });
walker.moveBy(150, 0, { at: 0.5, duration: 1.3, ease: "sine.inOut" });
// A small "looking up" beat once the walker arrives, pivoted at the neck rather than the
// torso's own center.
walker.pivotAt(210, GROUND_Y - 56);
walker.rotateTo(-8, { at: 2.0, duration: 0.4, ease: "sine.out" });

// Ignition: a burst of exhaust at the rocket's base, spread across the liftoff window so it
// reads as a billowing cloud left behind on the pad rather than one instant puff.
scene.add(
  sketch.particles(
    ROCKET_X,
    GROUND_Y - 5,
    { color: "#f2c94c" },
    { count: 50, angle: 100, spread: 130, speedMin: 40, speedMax: 140, gravity: 60, lifetime: 1.6, duration: 0.6, at: 2.5, sizeMin: 3, sizeMax: 7 }
  )
);
scene.add(
  sketch.particles(
    ROCKET_X,
    GROUND_Y - 5,
    { color: "#e8482c" },
    { count: 30, angle: 100, spread: 100, speedMin: 20, speedMax: 90, gravity: 40, lifetime: 1.4, duration: 0.5, at: 2.6, sizeMin: 4, sizeMax: 8 }
  )
);

// Liftoff — the camera follows the rocket up through the tall world, past the top of the
// walker's own frame, ending high enough that the rocket reads as a small shape against sky.
const LIFT_AT = 2.6;
const LIFT_DURATION = 3.0;
rocket.moveBy(0, -(WORLD_HEIGHT - 500), { at: LIFT_AT, duration: LIFT_DURATION, ease: "power2.in" });

const cam = scene.camera();
cam.panTo(320, GROUND_Y - 110, { at: 0, duration: 0 });
cam.follow(rocket, { at: LIFT_AT, duration: LIFT_DURATION + 0.8 });

export default scene;
