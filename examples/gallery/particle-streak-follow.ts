import { sketch } from "../../src/index.js";

// Gallery demo for particles' two new options: shape: "streak" and moveTo. Before these
// existed, rain was dozens of hand-authored individual stroke tweens (a round dot moving
// fast still reads as a dot, not motion — every one of this library's own rain scenes hit
// this), and dust trailing a moving source meant duplicating that source's own motion tween
// a second time on the particles node, or faking it with several stationary emitters placed
// along the route.

const scene = sketch.scene({ width: 480, height: 280, background: "#1b2436", seed: "particle-streak-follow" });

// Rain: streak shape, oriented along each drop's own instantaneous velocity.
scene.add(
  sketch.particles(240, -10, { color: "#8fa3c4" }, {
    count: 50,
    angle: 88,
    spread: 6,
    speedMin: 260,
    speedMax: 340,
    gravity: 40,
    lifetime: 1.1,
    duration: 3,
    sizeMin: 5,
    sizeMax: 9,
    shape: "streak",
    fade: false,
  })
);

// A boat, drawn simply, sailing left to right.
const boat = sketch.loop([[-22, 0], [22, 0], [14, 12], [-14, 12]], { color: "#0d0f16", weight: "confident", fill: { color: "#3a4256", style: "solid" } });
scene.add(boat).moveTo(60, 220, { at: 0, duration: 0 });
boat.moveTo(420, 220, { at: 0.3, duration: 3.4, ease: "sine.inOut" });

// Wake dust trailing the boat: moveTo mirrors the boat's own motion so the emitter tracks
// it, but each particle resolves its OWN spawn point at ITS OWN spawn time — the trail
// spreads out behind the boat's path, it doesn't rigidly clump at the boat's current spot.
scene.add(
  sketch.particles(60, 226, { color: "#c7d2e0" }, {
    count: 70,
    angle: 180,
    spread: 40,
    speedMin: 8,
    speedMax: 26,
    gravity: 0,
    lifetime: 1.4,
    duration: 3.4,
    sizeMin: 2,
    sizeMax: 4,
    at: 0.3,
    moveTo: { x: 420, y: 226, duration: 3.4, ease: "sine.inOut" },
  })
);

export default scene;
