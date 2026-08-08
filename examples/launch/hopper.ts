import { sketch } from "../../src/index.js";

// "Hopper" — an original rubber-hose-era character: floppy ears (not round mouse ears —
// a deliberately different silhouette), egg body, noodle limbs, white-glove hands (a
// genre convention shared across 1930s toon characters, not any one studio's IP). A
// performance piece proving squashTo/moveAlong-free-choreography/camera/parallax work
// together for real character acting, not just a shape sliding along a path.

const BODY = "#e0632b";
const BODY_FILL = { color: "#e8794a", style: "solid" as const };
const INK = "#2b2118";
const WHITE = "#f7f3ea";

function buildCharacter() {
  const g = sketch.group([]);

  const body = sketch.loop(
    [
      [150, 275], [178, 285], [195, 320], [190, 355], [170, 385],
      [150, 392], [130, 385], [110, 355], [105, 320], [122, 285],
    ],
    { color: BODY, weight: "confident", fill: BODY_FILL }
  );

  const earL = sketch.group([
    sketch.loop([[122, 282], [95, 230], [82, 185], [95, 165], [118, 205], [138, 265]], {
      color: BODY, weight: "confident", fill: BODY_FILL,
    }),
  ]);
  earL.pivotAt(122, 282);
  const earR = sketch.group([
    sketch.loop([[178, 282], [205, 230], [218, 185], [205, 165], [182, 205], [162, 265]], {
      color: BODY, weight: "confident", fill: BODY_FILL,
    }),
  ]);
  earR.pivotAt(178, 282);

  const eyeL = sketch.blob(128, 305, 16, { color: INK, weight: "light", fill: { color: WHITE, style: "solid" } }, 10);
  const eyeR = sketch.blob(172, 305, 16, { color: INK, weight: "light", fill: { color: WHITE, style: "solid" } }, 10);
  const pupilL = sketch.blob(131, 308, 6, { color: INK, fill: { color: INK, style: "solid" } }, 8);
  const pupilR = sketch.blob(169, 308, 6, { color: INK, fill: { color: INK, style: "solid" } }, 8);
  pupilL.pivotAt(131, 308);
  pupilR.pivotAt(169, 308);

  const nose = sketch.blob(150, 328, 5, { color: INK, fill: { color: INK, style: "solid" } }, 8);
  const mouth = sketch.stroke([[136, 342], [150, 350], [164, 342]], { color: INK, weight: "light" });

  const armL = sketch.group([
    sketch.stroke([[108, 330], [95, 365], [93, 395]], { color: BODY, weight: "bold" }),
    sketch.blob(90, 400, 14, { color: INK, weight: "light", fill: { color: WHITE, style: "solid" } }, 8),
  ]);
  armL.pivotAt(108, 330);
  const armR = sketch.group([
    sketch.stroke([[192, 330], [205, 365], [207, 395]], { color: BODY, weight: "bold" }),
    sketch.blob(210, 400, 14, { color: INK, weight: "light", fill: { color: WHITE, style: "solid" } }, 8),
  ]);
  armR.pivotAt(192, 330);

  const legL = sketch.group([
    sketch.stroke([[132, 385], [126, 410], [124, 428]], { color: BODY, weight: "bold" }),
    sketch.blob(122, 434, 17, { color: INK, fill: { color: INK, style: "solid" } }, 8),
  ]);
  legL.pivotAt(132, 385);
  const legR = sketch.group([
    sketch.stroke([[168, 385], [174, 410], [176, 428]], { color: BODY, weight: "bold" }),
    sketch.blob(178, 434, 17, { color: INK, fill: { color: INK, style: "solid" } }, 8),
  ]);
  legR.pivotAt(168, 385);

  g.add(body);
  g.add(earL); g.add(earR);
  g.add(eyeL); g.add(eyeR); g.add(pupilL); g.add(pupilR);
  g.add(nose); g.add(mouth);
  g.add(armL); g.add(armR);
  g.add(legL); g.add(legR);

  // Feet-bottom ~451, bbox-center ~(150,308) — squash/rotate pivot from the ground, not
  // the character's own geometric middle, so landing compresses toward the feet instead
  // of toward empty space at chest height.
  g.pivotAt(150, 446);

  return { group: g, earL, earR, pupilL, pupilR, armL, armR, legL, legR, body, eyeL, eyeR, nose, mouth };
}

const scene = sketch.scene({
  width: 1450,
  height: 480,
  viewport: { width: 680, height: 420 },
  background: { stops: [
    { offset: 0, color: "#2b2d5e" },
    { offset: 0.55, color: "#e08a5b" },
    { offset: 1, color: "#f7d9a0" },
  ], direction: "vertical" },
  seed: "hopper",
});

// Far layer: rolling hills, drift slowly as the camera tracks the walk.
const far = scene.layer(0.35);
const hillStyle = { color: "#5a6f6a", weight: "light" as const, fill: { color: "#6b8079", style: "solid" as const } };
far.add(sketch.blob(180, 430, 150, hillStyle, 12)).drawOn({ at: 0, duration: 1.0 });
far.add(sketch.blob(650, 440, 190, hillStyle, 14)).drawOn({ at: 0.1, duration: 1.1 });
far.add(sketch.blob(1150, 425, 165, hillStyle, 12)).drawOn({ at: 0.2, duration: 1.0 });

// Ground: default depth-1 plane, same as the character.
const ground = sketch.loop(
  [[-50, 448], [1500, 448], [1500, 530], [-50, 530]],
  { color: "#4a6b34", weight: "light", smooth: false, fill: { color: "#5a7d3a", style: "solid" } }
);
scene.add(ground).appear({ at: 0, duration: 0.01 });
const groundLine = sketch.stroke([[-50, 448], [400, 446], [900, 449], [1500, 447]], { color: "#3d5a2b", weight: "light" });
scene.add(groundLine).drawOn({ at: 0, duration: 1.2 });

const hopper = buildCharacter();
scene.add(hopper.group);

// --- Entrance: parts arrive in a curated order, not a flat stagger (limbs are nested
// in their own pivot groups, and .drawOn() on a Group is a no-op — each leaf gets its
// own call). ---
const ENTRANCE_LEAVES: Array<[any, number]> = [
  [hopper.body, 0.0],
  [hopper.earL.children[0], 0.25], [hopper.earR.children[0], 0.32],
  [hopper.eyeL, 0.55], [hopper.eyeR, 0.6], [hopper.pupilL, 0.75], [hopper.pupilR, 0.78],
  [hopper.nose, 0.85], [hopper.mouth, 0.9],
  [hopper.armL.children[0], 1.0], [hopper.armL.children[1], 1.2],
  [hopper.armR.children[0], 1.05], [hopper.armR.children[1], 1.25],
  [hopper.legL.children[0], 1.35], [hopper.legL.children[1], 1.5],
  [hopper.legR.children[0], 1.4], [hopper.legR.children[1], 1.55],
];
for (const [node, at] of ENTRANCE_LEAVES) node.drawOn({ at, duration: 0.4 });

// --- Idle perk: a small settle-bounce once fully drawn. ---
hopper.group.squashTo(1.06, 0.93, { at: 1.85, duration: 0.22, ease: "power2.out" });
hopper.group.squashTo(1, 1, { at: 2.07, duration: 0.3, ease: "back.out(2)" });
hopper.earL.rotateTo(-8, { at: 1.85, duration: 0.4, ease: "power2.out" });
hopper.earR.rotateTo(8, { at: 1.85, duration: 0.4, ease: "power2.out" });
hopper.earL.rotateTo(0, { at: 2.25, duration: 0.35, ease: "back.out(2)" });
hopper.earR.rotateTo(0, { at: 2.25, duration: 0.35, ease: "back.out(2)" });

// --- Look around: a curious beat before setting off, builds character. ---
hopper.group.rotateTo(-4, { at: 2.45, duration: 0.4, ease: "sine.inOut" });
hopper.group.rotateTo(5, { at: 2.85, duration: 0.55, ease: "sine.inOut" });
hopper.group.rotateTo(0, { at: 3.4, duration: 0.3, ease: "sine.inOut" });

// --- Walk cycle: 8 steps, purely relative moveBy (no bbox-center math needed — see
// SKILL.md's moveTo/moveAlong gotcha; relative motion sidesteps it entirely). Legs
// alternate, arms swing opposite (contrapposto), body bobs, ears trail. ---
const WALK_START = 3.6;
const STEP_DUR = 0.5;
const STEP_DX = 100;
const STEPS = 8;

for (let i = 0; i < STEPS; i++) {
  const t0 = WALK_START + i * STEP_DUR;
  const tMid = t0 + STEP_DUR / 2;
  const leadIsLeft = i % 2 === 0;
  const lead = leadIsLeft ? hopper.legL : hopper.legR;
  const trail = leadIsLeft ? hopper.legR : hopper.legL;
  const armLead = leadIsLeft ? hopper.armR : hopper.armL;
  const armTrail = leadIsLeft ? hopper.armL : hopper.armR;

  hopper.group.moveBy(STEP_DX / 2, -7, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  hopper.group.moveBy(STEP_DX / 2, 7, { at: tMid, duration: STEP_DUR / 2, ease: "sine.in" });

  lead.rotateTo(24, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  lead.rotateTo(-16, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });
  trail.rotateTo(-16, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  trail.rotateTo(24, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });

  armLead.rotateTo(-18, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  armLead.rotateTo(14, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });
  armTrail.rotateTo(14, { at: t0, duration: STEP_DUR / 2, ease: "sine.out" });
  armTrail.rotateTo(-18, { at: tMid, duration: STEP_DUR / 2, ease: "sine.inOut" });

  const earSwayDelay = 0.06;
  hopper.earL.rotateTo(leadIsLeft ? -10 : 10, { at: t0 + earSwayDelay, duration: STEP_DUR / 2, ease: "sine.out" });
  hopper.earR.rotateTo(leadIsLeft ? 10 : -10, { at: t0 + earSwayDelay, duration: STEP_DUR / 2, ease: "sine.out" });
}
const WALK_END = WALK_START + STEPS * STEP_DUR;

// Reset limbs to neutral and settle after the last step.
hopper.legL.rotateTo(0, { at: WALK_END, duration: 0.2, ease: "power2.out" });
hopper.legR.rotateTo(0, { at: WALK_END, duration: 0.2, ease: "power2.out" });
hopper.armL.rotateTo(0, { at: WALK_END, duration: 0.2, ease: "power2.out" });
hopper.armR.rotateTo(0, { at: WALK_END, duration: 0.2, ease: "power2.out" });
hopper.earL.rotateTo(0, { at: WALK_END, duration: 0.25, ease: "power2.out" });
hopper.earR.rotateTo(0, { at: WALK_END, duration: 0.25, ease: "power2.out" });
hopper.group.squashTo(1.08, 0.92, { at: WALK_END, duration: 0.15, ease: "power2.out" });
hopper.group.squashTo(1, 1, { at: WALK_END + 0.15, duration: 0.2, ease: "back.out(2)" });

// --- Anticipation crouch, jump, land, reaction take. ---
const CROUCH_AT = WALK_END + 0.45;
hopper.group.squashTo(1.22, 0.78, { at: CROUCH_AT, duration: 0.32, ease: "power2.out" });
hopper.armL.rotateTo(-28, { at: CROUCH_AT, duration: 0.32, ease: "power2.out" });
hopper.armR.rotateTo(28, { at: CROUCH_AT, duration: 0.32, ease: "power2.out" });
hopper.earL.rotateTo(-14, { at: CROUCH_AT, duration: 0.32, ease: "power2.out" });
hopper.earR.rotateTo(14, { at: CROUCH_AT, duration: 0.32, ease: "power2.out" });

const LAUNCH_AT = CROUCH_AT + 0.32;
const JUMP_H = 95;
// Stretch is deliberately modest, not the classic extreme cartoon stretch: the character's
// pivot sits near its feet (so landing squash reads as grounded, not floating-centered),
// which means scaleY pushes the *top* far more than the bottom — verified via a render at
// the jump's apex that cropped the ears clean out of frame at a stronger stretch + tighter
// zoom. Keep stretch and zoom-in both moderate so the tallest silhouette (mid-launch) still
// fits the follow camera's fixed vertical margin.
hopper.group.squashTo(0.9, 1.15, { at: LAUNCH_AT, duration: 0.16, ease: "power1.out" });
hopper.group.moveBy(0, -JUMP_H, { at: LAUNCH_AT, duration: 0.34, ease: "power2.out" });
hopper.armL.rotateTo(-45, { at: LAUNCH_AT, duration: 0.3, ease: "power2.out" });
hopper.armR.rotateTo(45, { at: LAUNCH_AT, duration: 0.3, ease: "power2.out" });
hopper.legL.rotateTo(-30, { at: LAUNCH_AT, duration: 0.3, ease: "power2.out" });
hopper.legR.rotateTo(30, { at: LAUNCH_AT, duration: 0.3, ease: "power2.out" });

const APEX_AT = LAUNCH_AT + 0.34;
hopper.group.squashTo(0.96, 1.06, { at: APEX_AT, duration: 0.14, ease: "sine.inOut" });
hopper.group.rotateTo(-6, { at: APEX_AT, duration: 0.28, ease: "sine.inOut" });
hopper.earL.rotateTo(-6, { at: APEX_AT, duration: 0.28, ease: "sine.inOut" });
hopper.earR.rotateTo(6, { at: APEX_AT, duration: 0.28, ease: "sine.inOut" });

const FALL_AT = APEX_AT + 0.28;
hopper.group.moveBy(0, JUMP_H, { at: FALL_AT, duration: 0.3, ease: "power2.in" });
hopper.group.squashTo(0.92, 1.11, { at: FALL_AT, duration: 0.3, ease: "power2.in" });
hopper.group.rotateTo(0, { at: FALL_AT, duration: 0.3, ease: "sine.inOut" });

const LAND_AT = FALL_AT + 0.3;
hopper.group.squashTo(1.32, 0.62, { at: LAND_AT, duration: 0.1, ease: "power1.out" });
hopper.legL.rotateTo(0, { at: LAND_AT, duration: 0.14, ease: "power2.out" });
hopper.legR.rotateTo(0, { at: LAND_AT, duration: 0.14, ease: "power2.out" });

// Impact dust — three quick dashes at the landing spot, absolute world coords (the
// character has walked 800px by now; these mark wherever it actually lands, not x=150).
const landX = 150 + STEPS * STEP_DX;
const dust = sketch.group([
  sketch.stroke([[landX - 45, 452], [landX - 65, 440]], { color: "#e8d9b0", weight: "light" }),
  sketch.stroke([[landX, 456], [landX, 438]], { color: "#e8d9b0", weight: "light" }),
  sketch.stroke([[landX + 45, 452], [landX + 65, 440]], { color: "#e8d9b0", weight: "light" }),
]);
scene.add(dust);
dust.appear({ at: LAND_AT, duration: 0.03 });
dust.fadeTo(0, { at: LAND_AT + 0.05, duration: 0.22, ease: "power1.in" });

const SETTLE_AT = LAND_AT + 0.1;
hopper.group.squashTo(1, 1, { at: SETTLE_AT, duration: 0.3, ease: "back.out(3)" });

// Reaction take: eyes widen, ears snap, a surprised wobble.
const TAKE_AT = SETTLE_AT + 0.3;
hopper.pupilL.scaleTo(1.5, { at: TAKE_AT, duration: 0.1, ease: "power2.out" });
hopper.pupilR.scaleTo(1.5, { at: TAKE_AT, duration: 0.1, ease: "power2.out" });
hopper.earL.rotateTo(-18, { at: TAKE_AT, duration: 0.12, ease: "power2.out" });
hopper.earR.rotateTo(18, { at: TAKE_AT, duration: 0.12, ease: "power2.out" });
hopper.group.rotateTo(5, { at: TAKE_AT, duration: 0.1, ease: "power2.out" });
hopper.group.rotateTo(-4, { at: TAKE_AT + 0.1, duration: 0.1, ease: "sine.inOut" });
hopper.group.rotateTo(0, { at: TAKE_AT + 0.2, duration: 0.15, ease: "sine.inOut" });
hopper.pupilL.scaleTo(1, { at: TAKE_AT + 0.25, duration: 0.2, ease: "power2.out" });
hopper.pupilR.scaleTo(1, { at: TAKE_AT + 0.25, duration: 0.2, ease: "power2.out" });
hopper.earL.rotateTo(0, { at: TAKE_AT + 0.25, duration: 0.25, ease: "back.out(2)" });
hopper.earR.rotateTo(0, { at: TAKE_AT + 0.25, duration: 0.25, ease: "back.out(2)" });

// Finale: a wave and a couple of happy in-place hops.
const WAVE_AT = TAKE_AT + 0.55;
for (let i = 0; i < 3; i++) {
  hopper.armR.rotateTo(-55, { at: WAVE_AT + i * 0.22, duration: 0.11, ease: "sine.inOut" });
  hopper.armR.rotateTo(-25, { at: WAVE_AT + i * 0.22 + 0.11, duration: 0.11, ease: "sine.inOut" });
}
hopper.armR.rotateTo(0, { at: WAVE_AT + 0.66, duration: 0.2, ease: "power2.out" });

const HOP_AT = WAVE_AT + 0.85;
for (let i = 0; i < 2; i++) {
  const t0 = HOP_AT + i * 0.35;
  hopper.group.squashTo(0.94, 1.08, { at: t0, duration: 0.12, ease: "power2.out" });
  hopper.group.moveBy(0, -22, { at: t0, duration: 0.16, ease: "power2.out" });
  hopper.group.moveBy(0, 22, { at: t0 + 0.16, duration: 0.16, ease: "power2.in" });
  hopper.group.squashTo(1.08, 0.92, { at: t0 + 0.28, duration: 0.08, ease: "power1.out" });
  hopper.group.squashTo(1, 1, { at: t0 + 0.36, duration: 0.15, ease: "back.out(2)" });
}

// --- Camera. follow tracks the walk (horizontal progress plus a small bob is fine to
// track live). The jump is different: a camera that follows a jump's vertical motion 1:1
// cancels it out — the character stays centered in frame and never visibly leaves the
// ground, which was confirmed by watching the actual rendered video, not just isolated
// stills (an --at check mid-jump still looked fine in isolation; only the dense frame
// sweep showed the character barely moving against its own background across the whole
// arc). Real 2D staging holds the camera still for a jump and lets the character rise
// into and back out of frame. So: follow ends at the crouch, a locked panTo takes over
// for the whole leap (zoom held at 1 — the jump's full vertical arc, ears to feet, doesn't
// fit a tighter frame), and the push-in for the reaction take happens only once the
// character's back on the ground and the camera has nothing left to chase.
const cam = scene.camera();
cam.panTo(340, 300, { at: 0, duration: 0 });
cam.follow(hopper.group, { at: WALK_START, duration: CROUCH_AT - WALK_START, ease: "none" });
cam.panTo(landX, 255, { at: CROUCH_AT, duration: 0.25, ease: "sine.out" });
cam.zoomTo(1.15, { at: TAKE_AT, duration: 0.3, ease: "sine.inOut" });
cam.zoomTo(1.05, { at: WAVE_AT, duration: 0.6, ease: "sine.inOut" });

export default scene;
