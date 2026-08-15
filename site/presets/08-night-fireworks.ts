// Fireworks — seeded particles
import { sketch } from "sketchling";

const scene = sketch.scene({ width: 480, height: 340, background: "#151b2b", seed: "night-fireworks" });

const moon = sketch.ellipse(400, 70, 30, 30, { color: "#f7efd0", weight: "light", fill: { color: "#f2e6bd", style: "solid" } });
scene.add(moon).drawOn({ at: 0, duration: 0.6 });

const skyline = sketch.stroke(
  [
    [20, 300],
    [110, 292],
    [160, 268],
    [220, 296],
    [300, 274],
    [370, 298],
    [460, 288],
  ],
  { color: "#2f3a52", weight: "bold", looseness: 0.25, energy: "calm", smooth: false }
);
scene.add(skyline).drawOn({ at: 0.5, duration: 0.9 });

// Nothing here is simulated: every particle's spawn time, angle, speed and size is drawn
// once from the scene's seed, so its position at any t is a closed-form ballistic formula
// and scrubbing anywhere lands exactly where playback would.
const bursts: Array<{ x: number; y: number; color: string; at: number; count: number }> = [
  { x: 150, y: 130, color: "#f2c94c", at: 0.9, count: 44 },
  { x: 300, y: 100, color: "#6fc8e0", at: 1.6, count: 34 },
  { x: 220, y: 170, color: "#e88ab0", at: 2.3, count: 28 },
];

for (const b of bursts) {
  const burst = sketch.particles(
    b.x,
    b.y,
    { color: b.color },
    {
      count: b.count,
      angle: -90,
      spread: 360,
      speedMin: 70,
      speedMax: 200,
      gravity: 190,
      lifetime: 1.5,
      at: b.at,
      sizeMin: 3,
      sizeMax: 6,
      // Each spark is drawn as a short line along its own velocity, re-aimed as gravity
      // bends the arc — a round dot travelling fast still reads as a dot, not as motion.
      shape: "streak",
    }
  );
  scene.add(burst);
}

export default scene;
