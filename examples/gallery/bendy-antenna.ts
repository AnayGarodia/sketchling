import { sketch } from "../../src/index.js";

// Gallery demo for sketch.connector(): the flexible-connector capability springTo() alone
// can't provide. springTo moves ONE node's own position (a bead, a bobble) but never draws
// anything that visually attaches it to a fixed base — a connector is a stroke that rebuilds
// itself every seek from a fixed anchor to that node's live position, bowed into a gentle
// curve, so the pair together reads as an actual bendy antenna instead of a floating bead.

const scene = sketch.scene({ width: 420, height: 320, background: "#eee3c8", seed: "bendy-antenna" });

const ground = sketch.stroke(
  [
    [20, 260],
    [400, 260],
  ],
  { color: "#5a4a35", weight: "bold" }
);
scene.add(ground);
ground.drawOn({ at: 0, duration: 0.5 });

const body = sketch.blob(120, 190, 34, { color: "#2a2a2a", fill: { color: "#c97a3f", style: "solid" } }, 12);
scene.add(body);
body.drawOn({ at: 0.2, duration: 0.6 });

const tip = sketch.blob(128, 108, 10, { color: "#2a2a2a", fill: { color: "#e8c34a", style: "solid" } }, 10);
scene.add(tip);
tip.drawOn({ at: 0.8, duration: 0.3 });
// tip springs off body's own live position — the accessory half of the pair.
tip.springTo(body, { offset: [8, -82], stiffness: 90, damping: 7, at: 1.7 });

// antenna redraws every seek from a fixed point on body's head to tip's live position —
// the attaching half. Built AFTER tip in scene order, but that's not what makes it track
// tip correctly after body moves — it's driven by tip's own live resolved position, read
// fresh every frame, the same way camera.follow reads any node's position.
const antenna = sketch.connector([120, 156], tip, { color: "#2a2a2a", weight: "bold" });
scene.add(antenna);

let t = 1.7;
for (let i = 0; i < 3; i++) {
  body.moveBy(0, -70, { at: t, duration: 0.35, ease: "power2.out" });
  body.moveBy(0, 70, { at: t + 0.35, duration: 0.35, ease: "power2.in" });
  t += 0.8;
}

export default scene;
