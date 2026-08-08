import { sketch } from "../../src/index.js";

// Gallery demo for sketch.particles(): a firework-style burst, deliberately NOT a
// simulation — every particle's spawn time, launch angle, speed, and size are drawn once
// from a seeded PRNG at build time, so each particle's position at any t is a closed-form
// ballistic formula. Seeking anywhere is exact with no precomputed lookup table, unlike
// springTo (whose damped motion genuinely depends on its own history).

const scene = sketch.scene({ width: 400, height: 300, background: "#151b2b", seed: "particle-burst" });

const burst = sketch.particles(
  200,
  220,
  { color: "#f2c94c" },
  {
    count: 40,
    angle: -90,
    spread: 100,
    speedMin: 80,
    speedMax: 220,
    gravity: 260,
    lifetime: 1.4,
    at: 0.3,
    sizeMin: 2,
    sizeMax: 5,
  }
);
scene.add(burst);

// A second, cooler-colored burst a beat later, from a different point — two emitters
// coexisting in one scene, each with its own independent seeded params.
const burst2 = sketch.particles(
  260,
  240,
  { color: "#6fc8e0" },
  {
    count: 28,
    angle: -100,
    spread: 80,
    speedMin: 60,
    speedMax: 160,
    gravity: 220,
    lifetime: 1.2,
    at: 0.9,
    sizeMin: 2,
    sizeMax: 4,
  }
);
scene.add(burst2);

export default scene;
