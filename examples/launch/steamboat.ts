import { sketch } from "../../src/index.js";

// A character built from the 1928 "Steamboat Willie" design specifically — round ears,
// pie eyes, thin rubber-hose limbs, monochrome — which entered the US public domain on
// Jan 1, 2024 (95 years after publication). Deliberately excludes anything added later:
// no white gloves (1929), no red shorts/color design (later still). A dance number, since
// that's the character's own signature beat in the original short.

// Fill and outline are DISTINCT colors — a fill equal to its own outline erases rough.js's
// entire sketchy line (the whole point of this renderer) since the ink is invisible against
// itself. Found by comparing a render against the original short: the outline was there in
// the code but not visible in the pixels.
const INK = "#141210";
const FILL = "#332c24";
const FILL_LIGHT = "#4d4136";
const CREAM = "#f3ead9";

function buildCharacter() {
  const g = sketch.group([]);

  const head = sketch.blob(280, 230, 62, { color: INK, weight: "confident", fill: { color: FILL, style: "solid" } }, 14);
  const earL = sketch.blob(225, 165, 34, { color: INK, weight: "confident", fill: { color: FILL, style: "solid" } }, 12);
  const earR = sketch.blob(335, 165, 34, { color: INK, weight: "confident", fill: { color: FILL, style: "solid" } }, 12);
  // A lighter crescent suggesting a light source from the upper-left — cheap volume without
  // any new engine work, just a second blob layered on top.
  const headHighlight = sketch.blob(258, 198, 30, { color: FILL_LIGHT, weight: "light", looseness: 0.4, fill: { color: FILL_LIGHT, style: "solid" } }, 10);

  const eyeL = sketch.blob(258, 225, 14, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 9);
  const eyeR = sketch.blob(302, 225, 14, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 9);
  const pupilL = sketch.blob(262, 227, 5, { color: INK, fill: { color: INK, style: "solid" } }, 8);
  const pupilR = sketch.blob(306, 227, 5, { color: INK, fill: { color: INK, style: "solid" } }, 8);
  eyeL.pivotAt(258, 225);
  eyeR.pivotAt(302, 225);

  const nose = sketch.blob(280, 248, 9, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 8);
  const mouth = sketch.stroke([[264, 257], [280, 265], [296, 257]], { color: CREAM, weight: "light" });

  const body = sketch.loop(
    [[280, 272], [305, 280], [315, 310], [305, 340], [280, 350], [255, 340], [245, 310], [255, 280]],
    { color: INK, weight: "confident", fill: { color: FILL, style: "solid" } }
  );
  const bodyHighlight = sketch.blob(263, 305, 15, { color: FILL_LIGHT, weight: "light", looseness: 0.4, fill: { color: FILL_LIGHT, style: "solid" } }, 9);

  const armL = sketch.group([
    sketch.stroke([[250, 288], [230, 312], [220, 330]], { color: INK, weight: "bold" }),
    sketch.blob(217, 335, 10, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  armL.pivotAt(250, 288);
  const armR = sketch.group([
    sketch.stroke([[310, 288], [330, 312], [340, 330]], { color: INK, weight: "bold" }),
    sketch.blob(343, 335, 10, { color: INK, weight: "light", fill: { color: CREAM, style: "solid" } }, 8),
  ]);
  armR.pivotAt(310, 288);

  const legL = sketch.group([
    sketch.stroke([[265, 345], [258, 368], [255, 387]], { color: INK, weight: "bold" }),
    sketch.blob(253, 392, 11, { color: INK, weight: "light", fill: { color: FILL, style: "solid" } }, 8),
  ]);
  legL.pivotAt(265, 345);
  const legR = sketch.group([
    sketch.stroke([[295, 345], [302, 368], [305, 387]], { color: INK, weight: "bold" }),
    sketch.blob(307, 392, 11, { color: INK, weight: "light", fill: { color: FILL, style: "solid" } }, 8),
  ]);
  legR.pivotAt(295, 345);

  // Ground contact shadow — a flattened, low-opacity blob under the feet. Without it the
  // character reads as pasted onto the background rather than standing on it.
  const shadow = sketch.blob(280, 402, 50, { color: "transparent", weight: "light", fill: { color: "#00000022", style: "solid" } }, 10);
  shadow.initial({ scale: 1 });

  g.add(shadow);
  g.add(earL); g.add(earR);
  g.add(head); g.add(headHighlight);
  g.add(eyeL); g.add(eyeR); g.add(pupilL); g.add(pupilR);
  g.add(nose); g.add(mouth);
  g.add(body); g.add(bodyHighlight);
  g.add(armL); g.add(armR);
  g.add(legL); g.add(legR);

  g.pivotAt(280, 395);

  return { group: g, earL, earR, eyeL, eyeR, pupilL, pupilR, armL, armR, legL, legR, head, body, nose, mouth, shadow };
}

// A single static stage — no camera, no world bigger than the frame. This piece is one
// performer in one spot, not a journey; skipping the camera entirely also skips the whole
// class of follow/staging bugs a moving camera brings in.
const scene = sketch.scene({
  width: 560,
  height: 520,
  background: { stops: [
    { offset: 0, color: "#efe4cc" },
    { offset: 1, color: "#e5d6b0" },
  ], direction: "vertical" },
  seed: "steamboat",
});

const floor = sketch.stroke([[40, 399], [280, 396], [520, 400]], { color: "#c9b686", weight: "light" });
scene.add(floor).drawOn({ at: 0, duration: 0.8 });

const star = buildCharacter();
scene.add(star.group);

// --- Entrance ---
const ENTRANCE_LEAVES: Array<[any, number]> = [
  [star.earL, 0.0], [star.earR, 0.06],
  [star.head, 0.25],
  [star.eyeL, 0.55], [star.eyeR, 0.58], [star.pupilL, 0.72], [star.pupilR, 0.74],
  [star.nose, 0.8], [star.mouth, 0.85],
  [star.body, 0.95],
  [star.armL.children[0], 1.15], [star.armL.children[1], 1.3],
  [star.armR.children[0], 1.2], [star.armR.children[1], 1.35],
  [star.legL.children[0], 1.4], [star.legL.children[1], 1.5],
  [star.legR.children[0], 1.42], [star.legR.children[1], 1.52],
];
for (const [node, at] of ENTRANCE_LEAVES) node.drawOn({ at, duration: 0.35 });

// --- Idle settle ---
star.group.squashTo(1.06, 0.93, { at: 1.75, duration: 0.2, ease: "power2.out" });
star.group.squashTo(1, 1, { at: 1.95, duration: 0.28, ease: "back.out(2)" });

// --- Ready anticipation ---
star.group.squashTo(1.1, 0.88, { at: 2.25, duration: 0.25, ease: "power2.out" });
star.armL.rotateTo(-15, { at: 2.25, duration: 0.25, ease: "power2.out" });
star.armR.rotateTo(15, { at: 2.25, duration: 0.25, ease: "power2.out" });

// --- The jig: alternating weight shift + kick + arm swing on a steady beat, building
// intensity across three phases (settle in, full swing, big finish) so the rhythm reads
// as a real dance, not a mechanical left-right loop. ---
const JIG_START = 2.55;
type Phase = { beats: number; beatDur: number; kick: number; armSwing: number; lean: number; squash: number };
const PHASES: Phase[] = [
  { beats: 4, beatDur: 0.42, kick: 22, armSwing: 30, lean: 10, squash: 0.06 },
  { beats: 8, beatDur: 0.38, kick: 34, armSwing: 48, lean: 16, squash: 0.1 },
  { beats: 6, beatDur: 0.32, kick: 44, armSwing: 62, lean: 20, squash: 0.14 },
];

let t = JIG_START;
let beatIndex = 0;
for (const phase of PHASES) {
  for (let i = 0; i < phase.beats; i++) {
    const kickLeft = beatIndex % 2 === 0;
    const lead = kickLeft ? star.legL : star.legR;
    const plant = kickLeft ? star.legR : star.legL;
    const armLead = kickLeft ? star.armR : star.armL;
    const armTrail = kickLeft ? star.armL : star.armR;
    const dur = phase.beatDur;
    const half = dur / 2;

    lead.rotateTo(kickLeft ? -phase.kick : phase.kick, { at: t, duration: half, ease: "power1.out" });
    lead.rotateTo(0, { at: t + half, duration: half, ease: "power2.out" });
    plant.rotateTo(0, { at: t, duration: dur, ease: "sine.inOut" });

    armLead.rotateTo(kickLeft ? -phase.armSwing : phase.armSwing, { at: t, duration: half, ease: "power1.out" });
    armLead.rotateTo(kickLeft ? -phase.armSwing * 0.4 : phase.armSwing * 0.4, {
      at: t + half, duration: half, ease: "sine.inOut",
    });
    armTrail.rotateTo(kickLeft ? phase.armSwing * 0.5 : -phase.armSwing * 0.5, { at: t, duration: dur, ease: "sine.inOut" });

    star.group.rotateTo(kickLeft ? -phase.lean : phase.lean, { at: t, duration: half, ease: "power1.out" });
    star.group.moveBy(kickLeft ? -6 : 6, 0, { at: t, duration: half, ease: "power1.out" });
    star.group.moveBy(kickLeft ? 6 : -6, 0, { at: t + half, duration: half, ease: "power1.in" });

    star.earL.rotateTo(kickLeft ? -10 : 6, { at: t, duration: half, ease: "power1.out" });
    star.earR.rotateTo(kickLeft ? -6 : 10, { at: t, duration: half, ease: "power1.out" });

    // Downbeat squash — the landing accent that actually sells rhythm.
    star.group.squashTo(1 + phase.squash, 1 - phase.squash, { at: t + half, duration: dur * 0.22, ease: "power1.out" });
    star.group.squashTo(1, 1, { at: t + half + dur * 0.22, duration: dur * 0.3, ease: "sine.out" });

    t += dur;
    beatIndex++;
  }
}
const JIG_END = t;

// A blink partway through, for charm — free with squashTo on the eyes themselves.
star.eyeL.squashTo(1, 0.15, { at: JIG_START + 1.4, duration: 0.06, ease: "power1.in" });
star.eyeR.squashTo(1, 0.15, { at: JIG_START + 1.4, duration: 0.06, ease: "power1.in" });
star.eyeL.squashTo(1, 1, { at: JIG_START + 1.46, duration: 0.1, ease: "power1.out" });
star.eyeR.squashTo(1, 1, { at: JIG_START + 1.46, duration: 0.1, ease: "power1.out" });

// Reset limbs before the flourish.
star.legL.rotateTo(0, { at: JIG_END, duration: 0.1 });
star.legR.rotateTo(0, { at: JIG_END, duration: 0.1 });
star.armL.rotateTo(0, { at: JIG_END, duration: 0.1 });
star.armR.rotateTo(0, { at: JIG_END, duration: 0.1 });
star.group.rotateTo(0, { at: JIG_END, duration: 0.1 });

// --- Flourish finish: both arms up, a bright squash-bounce, and a little bow. ---
const FLOURISH_AT = JIG_END + 0.1;
star.armL.rotateTo(-150, { at: FLOURISH_AT, duration: 0.3, ease: "back.out(2)" });
star.armR.rotateTo(150, { at: FLOURISH_AT, duration: 0.3, ease: "back.out(2)" });
star.group.squashTo(0.85, 1.22, { at: FLOURISH_AT, duration: 0.16, ease: "power2.out" });
star.group.moveBy(0, -18, { at: FLOURISH_AT, duration: 0.2, ease: "power2.out" });
star.group.moveBy(0, 18, { at: FLOURISH_AT + 0.2, duration: 0.2, ease: "power2.in" });
star.group.squashTo(1.15, 0.86, { at: FLOURISH_AT + 0.36, duration: 0.09, ease: "power1.out" });
star.group.squashTo(1, 1, { at: FLOURISH_AT + 0.45, duration: 0.25, ease: "back.out(2.5)" });

const BOW_AT = FLOURISH_AT + 0.85;
star.armL.rotateTo(-20, { at: BOW_AT, duration: 0.3, ease: "sine.inOut" });
star.armR.rotateTo(20, { at: BOW_AT, duration: 0.3, ease: "sine.inOut" });
star.group.rotateTo(10, { at: BOW_AT, duration: 0.3, ease: "sine.inOut" });
star.group.squashTo(1.08, 0.9, { at: BOW_AT, duration: 0.3, ease: "sine.inOut" });
star.group.rotateTo(0, { at: BOW_AT + 0.35, duration: 0.35, ease: "back.out(2)" });
star.group.squashTo(1, 1, { at: BOW_AT + 0.35, duration: 0.35, ease: "back.out(2)" });
star.armL.rotateTo(0, { at: BOW_AT + 0.35, duration: 0.35, ease: "back.out(2)" });
star.armR.rotateTo(0, { at: BOW_AT + 0.35, duration: 0.35, ease: "back.out(2)" });

export default scene;
