// Shared palette + character-building helpers reused across every scene in "Pip and the
// Sapling", so the little sprite (and the world's key coordinates/colors) stay visually
// identical from scene 1 to scene 6. Not a scene itself — no default export — the numbered
// scene files import from it, the same way a real project factors out shared constants.
import { sketch } from "../src/index.js";

export const palette = {
  ink: "#2b2115",
  skin: "#e79a52",
  cheek: "#e2724a",
  earth: "#8a5a34",
  earthDark: "#5f3b20",
  sprout: "#5c9457",
  leaf: "#4c7a4f",
  blossom: "#f0a9c4",
  bark: "#6b4a2d",
  skyDusk: "#e7ab6e",
  skyNight: "#2c3a5e",
  skyDawn: "#f2d4a3",
  skyDay: "#bfe0ef",
  skyStorm: "#69707c",
  cloud: "#9098a1",
  cloudDark: "#5f6670",
  rain: "#a9bccd",
  sun: "#f0c25f",
  star: "#f7e6a8",
  bird: "#c1452f",
  birdWing: "#8f2f1e",
  grass: "#b7b384",
  grassStorm: "#7e8266",
};

// World anchors every scene shares, so the mound/sapling/tree land in the same spot on
// the same 480x420 canvas across the whole story.
export const GROUND_Y = 336;
export const PLANT_X = 268;
export const SPRITE_STAND_X = 168;

export type Pt = [number, number];

/** Pip's body — a single round blob, not built from separate head+torso, so it reads as
 * one small creature rather than a person. Returns the node unattached; caller adds it to
 * the scene and calls drawOn with whatever timing that scene needs. */
export function pipBody(cx: number, cy: number) {
  return sketch.blob(
    cx,
    cy,
    44,
    { color: palette.ink, weight: "confident", looseness: 0.24, energy: "calm", fill: { color: palette.skin, style: "solid" } },
    12
  );
}

export function pipEyes(cx: number, cy: number) {
  const left = sketch.blob(cx - 14, cy - 12, 9, { color: palette.ink, weight: "light", fill: { color: palette.ink, style: "solid" } }, 8);
  const right = sketch.blob(cx + 14, cy - 12, 9, { color: palette.ink, weight: "light", fill: { color: palette.ink, style: "solid" } }, 8);
  return { left, right };
}

export function pipSmile(cx: number, cy: number, curve: "happy" | "flat" | "worried" = "happy") {
  const mid = curve === "happy" ? cy + 12 : curve === "worried" ? cy + 2 : cy + 6;
  return sketch.stroke(
    [
      [cx - 11, cy + 4],
      [cx, mid],
      [cx + 11, cy + 4],
    ],
    { color: palette.ink, weight: "light", looseness: 0.2, energy: "calm", smooth: true }
  );
}

/** Pivoted at the shoulder (its own first point) so a wave/reach swings from the shoulder,
 * not the arm's own midpoint — same pattern as waving-character.ts's rightArm. */
export function pipLeftArm(cx: number, cy: number) {
  return sketch
    .stroke(
      [
        [cx - 36, cy + 4],
        [cx - 56, cy + 16],
        [cx - 62, cy + 36],
      ],
      { color: palette.ink, weight: "confident", looseness: 0.28, energy: "calm", smooth: true }
    )
    .pivotAt(cx - 36, cy + 4);
}

export function pipRightArm(cx: number, cy: number) {
  return sketch
    .stroke(
      [
        [cx + 36, cy + 4],
        [cx + 56, cy + 16],
        [cx + 62, cy + 36],
      ],
      { color: palette.ink, weight: "confident", looseness: 0.28, energy: "calm", smooth: true }
    )
    .pivotAt(cx + 36, cy + 4);
}

/** A little dirt mound Pip's seed/sapling lives in, same footprint in every scene. */
export function moundPoints(cx: number): Pt[] {
  return [
    [cx - 46, GROUND_Y],
    [cx - 20, GROUND_Y - 16],
    [cx + 20, GROUND_Y - 16],
    [cx + 46, GROUND_Y],
  ];
}

export function groundLine(width: number): Pt[] {
  return [
    [0, GROUND_Y],
    [width, GROUND_Y],
  ];
}

/** Draws Pip — body, arms, eyes, smile, in that order — starting at `startAt` on the
 * given scene's timeline, single-pen (each part waits for the last to finish). Returns
 * the group (so a whole-character moveTo/moveBy/rotateTo can be chained after) plus each
 * individual part (so an arm can still wave or an expression can still change on its own)
 * and `endAt`, the timeline position right after Pip finishes being drawn. Used identically
 * in every scene so Pip is built the same way — and therefore looks like the same
 * character — every time. */
export function drawPip(
  scene: ReturnType<typeof sketch.scene>,
  cx: number,
  cy: number,
  startAt: number = 0,
  expression: "happy" | "worried" | "flat" = "happy"
) {
  const group = sketch.group();
  scene.add(group);
  let t = startAt;

  const body = pipBody(cx, cy);
  group.add(body).drawOn({ at: t, duration: 0.75 });
  t += 0.9;

  const leftArm = pipLeftArm(cx, cy);
  group.add(leftArm).drawOn({ at: t, duration: 0.28 });
  t += 0.36;

  const rightArm = pipRightArm(cx, cy);
  group.add(rightArm).drawOn({ at: t, duration: 0.28 });
  t += 0.36;

  const { left: leftEye, right: rightEye } = pipEyes(cx, cy);
  group.add(leftEye).drawOn({ at: t, duration: 0.14 });
  t += 0.18;
  group.add(rightEye).drawOn({ at: t, duration: 0.14 });
  t += 0.22;

  const smile = pipSmile(cx, cy, expression);
  group.add(smile).drawOn({ at: t, duration: 0.3 });
  t += 0.34;

  return { group, body, leftArm, rightArm, leftEye, rightEye, smile, endAt: t };
}

/** The full ground band, same footprint (GROUND_Y down to the canvas floor) in every
 * scene — filled as a closed loop rather than just a horizon stroke, so the world reads
 * as solid ground rather than a line floating over background color. Fill color is
 * supplied by the caller's style object (usually palette.grass or palette.grassStorm). */
export function groundBand(width: number, height: number): Pt[] {
  return [
    [0, GROUND_Y],
    [width, GROUND_Y],
    [width, height],
    [0, height],
  ];
}
