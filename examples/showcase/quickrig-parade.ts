import { sketch } from "../../src/index.js";

// Showcase: sketch.quickRig + sketch.walk + a following camera + footfall dust, in one
// longer scene. The dust emitters are placed at coordinates computed directly from
// gait.ts's own footfall math (see below) rather than read live off any node — connector
// and springTo can't track a node whose motion comes only from an animated ancestor group
// (the walking character group, here), so this sidesteps that limitation the same way
// critter-hop.ts does, by precomputing instead of tracking.
//
// Footfall math, read off gait.ts: each step's LEADING leg is the one that lifts and lands
// (the trailing leg stays planted the whole step, sliding backward in local space to cancel
// the body's own forward motion — see gait.ts's own doc comment on why that's zero-slide).
// The leading leg for step i (0-indexed) touches down at world x = hipX_lead + (i+1) *
// stepLength, at time WALK_START + (i+1) * stepDuration, on groundY — because the character
// group's own y offset has returned to its baseline by the end of each step (bodyBob's up
// and down moveBy cancel exactly), and its x offset by then is the full (i+1) * stepLength.

const WORLD_WIDTH = 1400;
const scene = sketch.scene({
  width: WORLD_WIDTH,
  height: 320,
  viewport: { width: 640, height: 320 },
  background: "#eee3c8",
  seed: "quickrig-parade",
});

const INK = "#241f18";
const GROUND_Y = 265;

const ground = sketch.stroke(
  [
    [20, 266],
    [400, 264],
    [800, 267],
    [1200, 265],
    [1380, 266],
  ],
  { color: "#8a7a55", weight: "light", looseness: 0.2, energy: "calm" }
);
scene.add(ground).drawOn({ at: 0, duration: 1.2 });

const body = sketch.blob(
  100,
  150,
  45,
  { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: "#4f7f6b", style: "solid" } },
  12
);
const head = sketch.blob(
  100,
  95,
  28,
  { color: INK, weight: "confident", looseness: 0.28, energy: "calm", fill: { color: "#e8b978", style: "solid" } },
  12
);

const STEP_LENGTH = 42;
const STEP_DURATION = 0.5;
const WALK_START = 2.5;
const STEPS = 14;

const rig = sketch.quickRig(body, {
  groundY: GROUND_Y,
  stepLength: STEP_LENGTH,
  legStyle: { color: INK, weight: "confident", looseness: 0.25, energy: "calm" },
  capRadius: 9,
});

const character = sketch.group([rig.legL, rig.legR, body, head]);
scene.add(character);

rig.legL.appear({ at: 0.2, duration: 0.3 });
rig.legR.appear({ at: 0.35, duration: 0.3 });
body.drawOn({ at: 0.7, duration: 0.9 });
head.drawOn({ at: 1.7, duration: 0.6 });

sketch.walk({
  body: character,
  legs: [
    { limb: rig.legL, hipX: rig.hipLX },
    { limb: rig.legR, hipX: rig.hipRX },
  ],
  steps: STEPS,
  stepLength: STEP_LENGTH,
  groundY: GROUND_Y,
  stepDuration: STEP_DURATION,
  liftHeight: 22,
  bodyBob: 6,
  at: WALK_START,
});

// A small dust puff under each footfall — precomputed, not live-tracked (see file doc).
for (let i = 0; i < STEPS; i++) {
  const leadHipX = i % 2 === 0 ? rig.hipLX : rig.hipRX;
  const landX = leadHipX + (i + 1) * STEP_LENGTH;
  const landAt = WALK_START + (i + 1) * STEP_DURATION;
  const puff = sketch.particles(
    landX,
    GROUND_Y - 3,
    { color: "#c9b98a" },
    {
      count: 7,
      angle: -90,
      spread: 130,
      speedMin: 20,
      speedMax: 50,
      gravity: 240,
      lifetime: 0.4,
      sizeMin: 1.5,
      sizeMax: 3,
      at: landAt,
    }
  );
  scene.add(puff);
}

// The camera follows the character group's own live position — this works because the
// tracked node IS the animated node itself (walk's own moveBy target), not something
// nested inside it; camera.follow reads exactly the same "local offset" space springTo
// and connector do, but here that's precisely what's needed.
//
// .follow only holds the tracked framing for its own [at, at+duration] window — past
// that, the camera falls back to the last real panTo/zoomTo tween's own value (here,
// the initial panTo), not a freeze-frame of wherever following left off (see AGENTS.md's
// Camera section). The last footfall's dust puff outlives the walk itself by its own
// 0.4s lifetime, so the window is padded past the walk's own end to cover that settle
// tail too — otherwise the render's default "settled end state" (the timeline's true
// end, past the last dust particle) would show a jarring snap back to the start framing.
const cam = scene.camera();
cam.panTo(320, 160, { at: 0, duration: 0 });
cam.follow(character, { at: WALK_START, duration: STEPS * STEP_DURATION + 1.0 });

export default scene;
