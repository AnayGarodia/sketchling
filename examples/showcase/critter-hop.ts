import { sketch } from "../../src/index.js";

// Showcase: springTo + connector + particles composed into one scene, not one capability
// in isolation. The critter's own body is the spring driver, hopped directly with its own
// moveBy calls — deliberately NOT nested inside a sketch.walk-driven group, since springTo
// and connector only ever read a node's own local offset, not an ancestor group's (see
// connector.ts's doc comment). Dust puffs on landing are placed at coordinates computed
// directly from the same hop deltas driving the body, not read live off any node — the
// same "pure function of t, precomputed once" property that makes particles safe to seek
// anywhere, used here to sidestep the tracking limitation entirely rather than fight it.

const scene = sketch.scene({ width: 560, height: 320, background: "#eee3c8", seed: "critter-hop" });

const INK = "#241f18";
const GROUND_Y = 265;

const ground = sketch.stroke(
  [
    [20, 266],
    [540, 266],
  ],
  { color: "#8a7a55", weight: "light", looseness: 0.2, energy: "calm" }
);
scene.add(ground).drawOn({ at: 0, duration: 0.6 });

const BODY_X0 = 80;
const BODY_Y0 = 205;
const body = sketch.blob(
  BODY_X0,
  BODY_Y0,
  32,
  { color: INK, weight: "confident", looseness: 0.3, energy: "quick", fill: { color: "#c97a3f", style: "solid" } },
  11
);
scene.add(body);
body.drawOn({ at: 0.2, duration: 0.5 });

const tip = sketch.blob(BODY_X0 + 6, BODY_Y0 - 78, 9, { color: INK, fill: { color: "#e8c34a", style: "solid" } }, 10);
scene.add(tip);
tip.drawOn({ at: 0.7, duration: 0.25 });
// tip springs off body's own live position — the accessory half.
tip.springTo(body, { offset: [6, -78], stiffness: 140, damping: 9, at: 1.0 });

// antenna redraws every seek from a fixed point on the body's head to tip's live position —
// the attaching half. Tracks tip exactly since tip's motion is a genuine own-tween spring,
// not motion inherited from an ancestor group.
const antenna = sketch.connector([BODY_X0, BODY_Y0 - 30], tip, { color: INK, weight: "bold" });
scene.add(antenna);

// Four hops, each an up-arc then a down-arc, shifting right each time. Dust puffs on
// landing use cumX/landAt — the exact numbers the hop's own moveBy calls are built from —
// rather than trying to read the body's live position back out.
const HOP_DX = 110;
const HOP_UP_DUR = 0.35;
const HOP_DOWN_DUR = 0.3;
let t = 1.0;
let cumX = BODY_X0;
for (let i = 0; i < 4; i++) {
  body.moveBy(HOP_DX / 2, -85, { at: t, duration: HOP_UP_DUR, ease: "power2.out" });
  body.moveBy(HOP_DX / 2, 85, { at: t + HOP_UP_DUR, duration: HOP_DOWN_DUR, ease: "power2.in" });
  cumX += HOP_DX;
  const landAt = t + HOP_UP_DUR + HOP_DOWN_DUR;

  const dust = sketch.particles(
    cumX,
    GROUND_Y - 4,
    { color: "#c9b98a" },
    {
      count: 10,
      angle: -90,
      spread: 150,
      speedMin: 30,
      speedMax: 75,
      gravity: 260,
      lifetime: 0.5,
      sizeMin: 2,
      sizeMax: 4,
      at: landAt,
    }
  );
  scene.add(dust);

  t += HOP_UP_DUR + HOP_DOWN_DUR + 0.15;
}

export default scene;
