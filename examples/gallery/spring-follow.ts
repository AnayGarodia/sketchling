import { sketch } from "../../src/index.js";

// Gallery: secondary motion via .springTo — a floppy bobble on a spring-mounted stalk
// trails a bouncing body with damped lag and overshoot, instead of moving in lockstep.
// A bouncing driver (rather than one single move) shows the spring answering a *repeated*
// perturbation, not just settling once after a single step.
const scene = sketch.scene({ width: 420, height: 320, background: "#eee3c8", seed: "spring-follow" });

const ink = "#241f18";

const ground = sketch.stroke(
  [
    [20, 260],
    [400, 260],
  ],
  { color: "#8a7a55", weight: "light", looseness: 0.2, energy: "calm" }
);
scene.add(ground).drawOn({ at: 0, duration: 0.5 });

const body = sketch.blob(120, 190, 34, { color: ink, weight: "bold", fill: { color: "#4f7f6b", style: "solid" } }, 12);
scene.add(body).drawOn({ at: 0.5, duration: 0.6 });

// A trailing bead near the body — no rigid connection drawn between them (a stroke linking
// the two would need to redraw every frame to stay attached to a moving spring tip, a
// separate "flexible limb" problem this primitive doesn't solve on its own; see AGENTS.md).
// The lag and overshoot alone are what read as secondary motion here.
const bead = sketch.blob(128, 108, 14, { color: ink, weight: "confident", fill: { color: "#e0a63c", style: "solid" } }, 10);
scene.add(bead).drawOn({ at: 1.1, duration: 0.3 });
// Offset matches the bead's own drawn position relative to the body's center, so it sits
// still (matching its own pose) until the body actually starts bouncing — an underdamped
// spring (low damping relative to stiffness) so the overshoot reads clearly bounce to
// bounce, not just settle-once.
bead.springTo(body, { offset: [8, -82], stiffness: 90, damping: 7, at: 1.7 });

// Three bounces in place: up-and-down via squashTo/moveBy would work too, but a simple
// moveBy pair per bounce keeps the body's own path easy to read against the bobble's lag.
let t = 1.7;
for (let i = 0; i < 3; i++) {
  body.moveBy(0, -70, { at: t, duration: 0.35, ease: "power2.out" });
  body.moveBy(0, 70, { at: t + 0.35, duration: 0.35, ease: "power2.in" });
  t += 0.8;
}

export default scene;
