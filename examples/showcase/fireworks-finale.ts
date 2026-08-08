import { sketch } from "../../src/index.js";

// Showcase for sketch.particles() on its own, no pairing needed: three solo bursts
// building up, then five at once for the finale. Every burst is an independent emitter
// with its own seeded PRNG (see particles.ts) — nothing here is a live simulation, so the
// five-at-once finale costs the renderer nothing extra to seek into versus any single frame
// of it in isolation, unlike a real particle system where more concurrent emitters means
// more physics state to step forward.

const scene = sketch.scene({ width: 640, height: 400, background: "#0c1220", seed: "fireworks-finale" });

const PALETTE = ["#f2c94c", "#eb5757", "#6fc8e0", "#9b6fe0", "#6fe0a0", "#f29e4c"];

function burst(x: number, y: number, color: string, at: number, count = 46): void {
  const p = sketch.particles(
    x,
    y,
    { color },
    {
      count,
      angle: -90,
      spread: 360,
      speedMin: 70,
      speedMax: 200,
      gravity: 140,
      lifetime: 1.3,
      at,
      sizeMin: 2,
      sizeMax: 4,
    }
  );
  scene.add(p);
}

// A faint scatter of far-off sparks, spread across a window rather than one instant, to
// give the opening a bit of ambient life before the named bursts start.
scene.add(
  sketch.particles(
    320,
    380,
    { color: "#f2f2f2" },
    { count: 18, angle: -90, spread: 40, speedMin: 40, speedMax: 90, gravity: 60, lifetime: 2.0, duration: 1.5, at: 0, sizeMin: 1, sizeMax: 2 }
  )
);

// Three solo bursts, building anticipation — later, bigger, brighter.
burst(180, 160, PALETTE[0], 0.4, 32);
burst(460, 130, PALETTE[1], 1.1, 40);
burst(320, 100, PALETTE[2], 1.9, 54);

// The finale: five at once, spread across the sky.
const FINALE_AT = 2.9;
const finaleSpots: [number, number][] = [
  [110, 150],
  [250, 90],
  [390, 110],
  [530, 150],
  [320, 190],
];
finaleSpots.forEach(([x, y], i) => burst(x, y, PALETTE[(i + 3) % PALETTE.length], FINALE_AT, 60));

export default scene;
