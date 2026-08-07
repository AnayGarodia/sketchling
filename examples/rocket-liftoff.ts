import { sketch } from "../src/index.js";

// The drawing keeps going after it's drawn: once the rocket is fully sketched, the whole
// group launches off the top of the canvas while the exhaust it leaves behind fades out —
// tests moveBy on a Group (which carries all its already-drawn children with it).
const scene = sketch.scene({ width: 360, height: 460, background: "#e8eef4", seed: "rocket-liftoff" });

const ink = "#1c1a17";
const hull = "#e0e4e8";
const accent = "#c1452f";
const flame = "#e2913a";

const rocket = sketch.group();
scene.add(rocket);

const body = sketch.loop(
  [
    [180, 70],
    [215, 150],
    [215, 290],
    [145, 290],
    [145, 150],
  ],
  { color: ink, weight: "bold", looseness: 0.2, energy: "calm", smooth: true, fill: { color: hull, style: "solid" } }
);
rocket.add(body).drawOn({ at: 0, duration: 1.4 });

const finLeft = sketch.loop(
  [
    [145, 260],
    [100, 320],
    [145, 300],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "quick", fill: { color: accent, style: "solid" } }
);
rocket.add(finLeft).drawOn({ at: 1.7, duration: 0.5 });

const finRight = sketch.loop(
  [
    [215, 260],
    [260, 320],
    [215, 300],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "quick", fill: { color: accent, style: "solid" } }
);
rocket.add(finRight).drawOn({ at: 2.4, duration: 0.5 });

const window_ = sketch.blob(180, 180, 22, { color: ink, weight: "confident", looseness: 0.18, energy: "calm", fill: { color: "#7fa7c9", style: "cross-hatch", density: 0.6 } }, 14);
rocket.add(window_).drawOn({ at: 3.15, duration: 0.6 });

const exhaust1 = sketch.stroke(
  [
    [165, 300],
    [155, 325],
    [168, 345],
  ],
  { color: flame, weight: "confident", looseness: 0.4, energy: "frantic", smooth: true }
);
scene.add(exhaust1).drawOn({ at: 4.0, duration: 0.4 });

const exhaust2 = sketch.stroke(
  [
    [180, 300],
    [180, 330],
    [180, 355],
  ],
  { color: flame, weight: "bold", looseness: 0.35, energy: "frantic", smooth: true }
);
scene.add(exhaust2).drawOn({ at: 4.45, duration: 0.4 });

const exhaust3 = sketch.stroke(
  [
    [195, 300],
    [205, 325],
    [193, 345],
  ],
  { color: flame, weight: "confident", looseness: 0.4, energy: "frantic", smooth: true }
);
scene.add(exhaust3).drawOn({ at: 4.9, duration: 0.4 });

// Liftoff: accelerating off the top of the frame, like a real launch rather than a UI slide.
rocket.moveBy(0, -420, { at: 5.7, duration: 1.3, ease: "power2.in" });

// The exhaust stays behind and dissipates instead of being dragged along with the rocket.
exhaust1.fadeTo(0, { at: 5.7, duration: 1.0, ease: "sine.in" });
exhaust2.fadeTo(0, { at: 5.85, duration: 1.0, ease: "sine.in" });
exhaust3.fadeTo(0, { at: 5.7, duration: 1.0, ease: "sine.in" });

export default scene;
