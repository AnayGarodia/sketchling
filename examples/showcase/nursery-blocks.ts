import { sketch } from "../../src/index.js";

const W = 960;
const H = 540;
const INK = "#2d3445";
const CREAM = "#f7e4bf";
const SKY = "#8fcddd";
const SUN = "#ffd36a";
const TEAL = "#4ca6a8";
const TEAL_DARK = "#28787d";
const CORAL = "#e36f59";
const BLUE = "#5b82c4";
const WOOD = ["#d39a55", "#c98243", "#e2b56b", "#b96f39", "#efc77d", "#ca8749", "#dda55b"];

const scene = sketch.scene({
  width: W,
  height: H,
  background: CREAM,
  seed: "nursery-blocks-toon3d",
  look: "toon3d",
});
scene.duration(66);

type Mesh = ReturnType<typeof sketch.box3d>;

function style(color: string) {
  return { color: INK, fill: { color, style: "solid" as const } };
}

function addMesh(node: Mesh, name: string, x: number, y: number, revealAt = 0.2): Mesh {
  node.named(name).lintIgnore("overlap").initial({ x, y, opacity: 0 });
  scene.add(node);
  node.fadeTo(1, { at: revealAt, duration: 0.55, ease: "power2.out" });
  return node;
}

function box(name: string, x: number, y: number, w: number, h: number, d: number, color: string, revealAt = 0.2): Mesh {
  return addMesh(sketch.box3d(w, h, d, style(color)), name, x, y, revealAt);
}

function orb(name: string, x: number, y: number, radius: number, color: string, revealAt = 0.2): Mesh {
  return addMesh(sketch.icosahedron3d(radius, style(color)), name, x, y, revealAt);
}

function colorBoxFaces(node: Mesh, base: string, light: string, shade: string): void {
  node.faces[0].color = light;
  node.faces[1].color = base;
  node.faces[2].color = shade;
  node.faces[3].color = base;
  node.faces[4].color = light;
  node.faces[5].color = shade;
}

const windowPane = box("window-pane", 135, 118, 190, 142, 12, SKY, 0.15);
colorBoxFaces(windowPane, SKY, "#b8e4e8", "#73b7ca");
box("window-frame-top", 135, 43, 218, 18, 25, "#fff5d8", 0.25);
box("window-frame-bottom", 135, 193, 218, 18, 25, "#fff5d8", 0.3);
box("window-frame-left", 30, 118, 18, 168, 25, "#fff5d8", 0.35);
box("window-frame-right", 240, 118, 18, 168, 25, "#fff5d8", 0.4);
box("window-frame-cross-v", 135, 118, 14, 142, 28, "#fff5d8", 0.45);
box("window-frame-cross-h", 135, 118, 190, 14, 28, "#fff5d8", 0.5);
const sunCube = box("window-sun", 91, 82, 38, 38, 18, SUN, 0.6);
sunCube.spin3d(0, 0, 45, { at: 0, duration: 0 });
sunCube.spin3d(0, 360, 405, { at: 2.5, duration: 40, ease: "none" });

for (let i = 0; i < 6; i++) {
  const baseboard = box(`baseboard-${i}`, 80 + i * 160, 489, 158, 18, 24, i % 2 === 0 ? "#e8bd83" : "#efca94", 0.25 + i * 0.07);
  colorBoxFaces(baseboard, "#e8bd83", "#f8d9a8", "#cf9d65");
}

const sunPatchA = box("sun-patch-a", 355, 474, 170, 10, 68, "#f8d37a", 0.7);
sunPatchA.rotateTo(-8, { at: 0, duration: 0 });
const sunPatchB = box("sun-patch-b", 515, 474, 110, 10, 68, "#f5c95f", 0.8);
sunPatchB.rotateTo(-8, { at: 0, duration: 0 });

box("shelf-top", 832, 131, 170, 18, 45, "#c58a58", 0.7);
box("shelf-mid", 832, 214, 170, 18, 45, "#c58a58", 0.75);
box("shelf-left", 760, 174, 18, 98, 45, "#b9794d", 0.8);
box("shelf-right", 904, 174, 18, 98, 45, "#b9794d", 0.85);
const shelfToyA = box("shelf-toy-a", 795, 184, 40, 40, 38, CORAL, 1.0);
shelfToyA.spin3d(0, 25, -8, { at: 0, duration: 0 });
const shelfToyB = orb("shelf-toy-b", 850, 181, 23, SUN, 1.05);
shelfToyB.spin3d(0, 720, 0, { at: 4, duration: 60, ease: "none" });
const shelfToyC = box("shelf-toy-c", 889, 184, 32, 42, 34, BLUE, 1.1);
shelfToyC.spin3d(12, -18, 5, { at: 0, duration: 0 });

const toyChest = box("toy-chest", 846, 421, 174, 94, 82, "#d8884d", 0.8);
colorBoxFaces(toyChest, "#d8884d", "#eca563", "#ae623b");
const toyChestRim = box("toy-chest-rim", 846, 369, 188, 20, 90, "#efb36c", 0.9);
toyChestRim.spin3d(-7, 0, 0, { at: 0, duration: 0 });

const head = box("robot-head", 285, 240, 108, 78, 72, TEAL, 1.2);
colorBoxFaces(head, TEAL, "#74c4c1", TEAL_DARK);
const earL = box("robot-ear-left", 221, 241, 22, 42, 48, CORAL, 1.35);
const earR = box("robot-ear-right", 349, 241, 22, 42, 48, CORAL, 1.4);
const eyeL = box("robot-eye-left", 266, 232, 18, 15, 82, SUN, 1.7);
const eyeR = box("robot-eye-right", 304, 232, 18, 15, 82, SUN, 1.75);
box("robot-mouth-left", 270, 263, 13, 7, 82, "#ecf3dd", 1.85);
box("robot-mouth-mid", 285, 265, 13, 7, 82, "#ecf3dd", 1.9);
box("robot-mouth-right", 300, 263, 13, 7, 82, "#ecf3dd", 1.95);
const neck = box("robot-neck", 285, 294, 28, 28, 44, "#d7b36e", 1.3);
const body = box("robot-body", 285, 355, 128, 104, 68, TEAL_DARK, 1.05);
colorBoxFaces(body, TEAL_DARK, TEAL, "#18565d");
const chest = box("robot-chest", 285, 352, 78, 58, 78, "#dce9d5", 1.55);
const chestLightA = box("robot-chest-light-a", 267, 343, 12, 12, 86, CORAL, 2.0);
const chestLightB = box("robot-chest-light-b", 285, 343, 12, 12, 86, SUN, 2.05);
const chestLightC = box("robot-chest-light-c", 303, 343, 12, 12, 86, BLUE, 2.1);
const chestSlot = box("robot-chest-slot", 285, 367, 47, 8, 86, INK, 2.15);
const shoulderL = orb("robot-shoulder-left", 216, 334, 18, CORAL, 1.45);
const shoulderR = orb("robot-shoulder-right", 354, 334, 18, CORAL, 1.5);
const armL = box("robot-arm-left", 181, 338, 72, 21, 28, "#6bbabd", 1.55);
const armR = box("robot-arm-right", 390, 338, 72, 21, 28, "#6bbabd", 1.6);
const handL = orb("robot-hand-left", 143, 338, 16, CORAL, 1.7);
const handR = orb("robot-hand-right", 428, 338, 16, CORAL, 1.75);
const hipL = orb("robot-hip-left", 257, 410, 15, "#d7b36e", 1.7);
const hipR = orb("robot-hip-right", 313, 410, 15, "#d7b36e", 1.75);
const legL = box("robot-leg-left", 257, 437, 28, 57, 38, "#4e8d98", 1.8);
const legR = box("robot-leg-right", 313, 437, 28, 57, 38, "#4e8d98", 1.85);
const footL = box("robot-foot-left", 249, 472, 58, 24, 62, CORAL, 1.95);
const footR = box("robot-foot-right", 321, 472, 58, 24, 62, CORAL, 2.0);
const antenna = box("robot-antenna", 285, 181, 10, 44, 12, "#d7b36e", 1.4);
const antennaBall = orb("robot-antenna-ball", 285, 153, 15, CORAL, 1.5);

armL.rotateTo(4, { at: 0, duration: 0 });
armR.rotateTo(-4, { at: 0, duration: 0 });
antennaBall.spin3d(0, 0, 0, { at: 0, duration: 0 });
antennaBall.spin3d(720, 1080, 360, { at: 2.4, duration: 41, ease: "none" });

for (const light of [chestLightA, chestLightB, chestLightC]) {
  light.scaleTo(0.15, { at: 2.45, duration: 0 });
  light.scaleTo(1, { at: 2.65, duration: 0.35, ease: "back.out(3)" });
}
eyeL.squashTo(1.25, 0.08, { at: 3.2, duration: 0.12, ease: "power2.in" });
eyeR.squashTo(1.25, 0.08, { at: 3.2, duration: 0.12, ease: "power2.in" });
eyeL.squashTo(1, 1, { at: 3.32, duration: 0.2, ease: "back.out(3)" });
eyeR.squashTo(1, 1, { at: 3.32, duration: 0.2, ease: "back.out(3)" });
chestSlot.squashTo(0.1, 1, { at: 3.5, duration: 0 });
chestSlot.squashTo(1, 1, { at: 3.7, duration: 0.45, ease: "back.out(2.5)" });
head.moveBy(0, -7, { at: 4.1, duration: 0.22, ease: "power2.out" });
head.moveBy(0, 7, { at: 4.32, duration: 0.3, ease: "bounce.out" });
earL.moveBy(0, -7, { at: 4.1, duration: 0.22, ease: "power2.out" });
earL.moveBy(0, 7, { at: 4.32, duration: 0.3, ease: "bounce.out" });
earR.moveBy(0, -7, { at: 4.1, duration: 0.22, ease: "power2.out" });
earR.moveBy(0, 7, { at: 4.32, duration: 0.3, ease: "bounce.out" });

const blockStarts = [
  [434, 455],
  [485, 452],
  [535, 456],
  [449, 411],
  [501, 407],
  [550, 414],
  [480, 365],
] as const;
const towerX = [690, 686, 694, 684, 697, 680, 702];
const towerY = [448, 404, 360, 316, 272, 228, 184];
const blockWidths = [94, 82, 88, 76, 84, 72, 68];
const blocks = blockStarts.map(([x, y], i) => {
  const node = box(`tower-block-${i + 1}`, x, y, blockWidths[i], 42, 62, WOOD[i], 1.2 + i * 0.1);
  colorBoxFaces(node, WOOD[i], i % 2 === 0 ? "#f1cb82" : "#e5ae68", i % 2 === 0 ? "#a96336" : "#ad6535");
  node.spin3d(0, 0, i % 2 === 0 ? -5 : 6, { at: 0, duration: 0 });
  return node;
});

function aimArm(
  arm: Mesh,
  hand: Mesh,
  shoulderX: number,
  shoulderY: number,
  targetX: number,
  targetY: number,
  at: number,
  duration: number,
): void {
  const dx = targetX - shoulderX;
  const dy = targetY - shoulderY;
  const length = Math.hypot(dx, dy);
  arm.moveTo(shoulderX + dx / 2, shoulderY + dy / 2, { at, duration, ease: "sine.inOut" });
  arm.rotateTo((Math.atan2(dy, dx) * 180) / Math.PI, { at, duration, ease: "sine.inOut" });
  arm.squashTo(length / 72, 0.9, { at, duration, ease: "sine.inOut" });
  hand.moveTo(targetX, targetY, { at, duration, ease: "sine.inOut" });
}

function restRightArm(at: number, duration: number): void {
  aimArm(armR, handR, 354, 334, 428, 338, at, duration);
}

for (let i = 0; i < blocks.length; i++) {
  const start = 8 + i * 5;
  const [pickX, pickY] = blockStarts[i];
  const carryY = towerY[i] - 64;
  const block = blocks[i];

  aimArm(armR, handR, 354, 334, pickX - 8, pickY - 8, start, 0.8);
  block.moveTo(558, carryY, { at: start + 0.85, duration: 1.15, ease: "power2.out" });
  block.spin3d(160 + i * 85, 120 + i * 70, i % 2 === 0 ? 28 : -24, { at: start + 0.85, duration: 2.25, ease: "sine.inOut" });
  aimArm(armR, handR, 354, 334, 520, carryY, start + 0.85, 1.15);
  block.moveTo(towerX[i], towerY[i], { at: start + 2, duration: 1.1, ease: "power2.inOut" });
  aimArm(armR, handR, 354, 334, towerX[i] - 45, towerY[i], start + 2, 1.1);
  block.spin3d(0, i % 2 === 0 ? 8 : -9, 0, { at: start + 3.1, duration: 0.25, ease: "power2.out" });
  block.squashTo(1.1, 0.82, { at: start + 3.1, duration: 0.12, ease: "power1.out" });
  block.squashTo(1, 1, { at: start + 3.22, duration: 0.28, ease: "back.out(3)" });
  restRightArm(start + 3.55, 1.0);

  eyeL.moveTo(271, 232, { at: start, duration: 0.3, ease: "power2.out" });
  eyeR.moveTo(309, 232, { at: start, duration: 0.3, ease: "power2.out" });
  eyeL.moveTo(266, 232, { at: start + 3.7, duration: 0.4, ease: "sine.inOut" });
  eyeR.moveTo(304, 232, { at: start + 3.7, duration: 0.4, ease: "sine.inOut" });

  for (let j = 0; j <= i; j++) {
    const wobble = 0.8 + j * 0.35;
    blocks[j].rotateTo(i % 2 === 0 ? -wobble : wobble, { at: start + 3.52, duration: 0.28, ease: "sine.inOut" });
    blocks[j].rotateTo(0, { at: start + 3.8, duration: 0.36, ease: "elastic.out(1, 0.45)" });
  }
}

for (let i = 0; i < blocks.length; i++) {
  const delay = i * 0.025;
  const amp = 1.7 + i * 0.9;
  blocks[i].rotateTo(-amp, { at: 43.2 + delay, duration: 0.8, ease: "sine.inOut" });
  blocks[i].rotateTo(amp * 1.25, { at: 44 + delay, duration: 0.8, ease: "sine.inOut" });
  blocks[i].rotateTo(-amp * 1.7, { at: 44.8 + delay, duration: 0.8, ease: "sine.inOut" });
  blocks[i].rotateTo(amp * 2.2, { at: 45.6 + delay, duration: 0.8, ease: "sine.inOut" });
  blocks[i].rotateTo(-amp * 2.8, { at: 46.4 + delay, duration: 0.8, ease: "sine.inOut" });
  blocks[i].rotateTo(amp * 3.5, { at: 47.2 + delay, duration: 0.8, ease: "sine.inOut" });
  blocks[i].rotateTo(-amp * 4.1, { at: 48 + delay, duration: 0.8, ease: "power2.in" });
}

eyeL.squashTo(1.35, 1.55, { at: 44.5, duration: 0.3, ease: "back.out(3)" });
eyeR.squashTo(1.35, 1.55, { at: 44.5, duration: 0.3, ease: "back.out(3)" });
aimArm(armR, handR, 354, 334, 623, 285, 45.8, 0.9);
aimArm(armR, handR, 354, 334, 635, 251, 46.7, 0.65);
aimArm(armL, handL, 216, 334, 252, 258, 48.15, 0.6);
aimArm(armR, handR, 354, 334, 318, 258, 48.15, 0.6);

const hatBlock = blocks[6];
hatBlock.moveTo(285, 180, { at: 49, duration: 1.55, ease: "power2.in" });
hatBlock.spin3d(540, 360, 180, { at: 49, duration: 1.55, ease: "sine.inOut" });
hatBlock.squashTo(1.15, 0.78, { at: 50.55, duration: 0.12, ease: "power1.out" });
hatBlock.squashTo(1, 1, { at: 50.67, duration: 0.32, ease: "back.out(3)" });
antenna.squashTo(1, 0.14, { at: 49.55, duration: 0.28, ease: "power2.in" });
antennaBall.moveTo(285, 201, { at: 49.55, duration: 0.28, ease: "power2.in" });

const fallTargets = [
  [654, 454],
  [606, 440],
  [720, 447],
  [777, 428],
  [845, 447],
  [892, 420],
] as const;
for (let i = 5; i >= 0; i--) {
  const fallAt = 49.35 + (5 - i) * 0.34;
  const duration = 1.05 + (5 - i) * 0.08;
  blocks[i].moveTo(fallTargets[i][0], fallTargets[i][1], { at: fallAt, duration, ease: "power2.in" });
  blocks[i].spin3d(360 + i * 110, 540 + i * 80, i % 2 === 0 ? 300 : -320, { at: fallAt, duration, ease: "sine.inOut" });
  blocks[i].squashTo(1.16, 0.76, { at: fallAt + duration, duration: 0.12, ease: "power1.out" });
  blocks[i].squashTo(1, 1, { at: fallAt + duration + 0.12, duration: 0.32, ease: "back.out(3)" });
}

body.squashTo(1.08, 0.92, { at: 50.1, duration: 0.18, ease: "power2.out" });
body.squashTo(1, 1, { at: 50.28, duration: 0.35, ease: "back.out(2.5)" });
head.squashTo(1.05, 0.9, { at: 50.1, duration: 0.18, ease: "power2.out" });
head.squashTo(1, 1, { at: 50.28, duration: 0.35, ease: "back.out(2.5)" });

aimArm(armL, handL, 216, 334, 148, 351, 55.1, 0.8);
restRightArm(55.1, 0.8);
eyeL.squashTo(1.3, 0.08, { at: 56.2, duration: 0.13, ease: "power2.in" });
eyeR.squashTo(1.3, 0.08, { at: 56.2, duration: 0.13, ease: "power2.in" });
eyeL.squashTo(1, 1, { at: 56.33, duration: 0.23, ease: "back.out(3)" });
eyeR.squashTo(1, 1, { at: 56.33, duration: 0.23, ease: "back.out(3)" });
eyeL.moveTo(266, 226, { at: 57.1, duration: 0.45, ease: "sine.inOut" });
eyeR.moveTo(304, 226, { at: 57.1, duration: 0.45, ease: "sine.inOut" });

antenna.squashTo(1, 1, { at: 59, duration: 0.25, ease: "back.out(4)" });
antennaBall.moveTo(285, 153, { at: 59, duration: 0.25, ease: "back.out(4)" });
hatBlock.moveTo(330, 112, { at: 59, duration: 0.3, ease: "power2.out" });
hatBlock.moveTo(430, 452, { at: 59.3, duration: 1.55, ease: "power2.in" });
hatBlock.spin3d(900, 720, 540, { at: 59, duration: 1.85, ease: "none" });
hatBlock.squashTo(1.18, 0.74, { at: 60.85, duration: 0.12, ease: "power1.out" });
hatBlock.squashTo(1, 1, { at: 60.97, duration: 0.35, ease: "back.out(3)" });

eyeL.moveTo(266, 232, { at: 60.6, duration: 0.35, ease: "sine.inOut" });
eyeR.moveTo(304, 232, { at: 60.6, duration: 0.35, ease: "sine.inOut" });
aimArm(armL, handL, 216, 334, 154, 286, 61.7, 0.7);
aimArm(armR, handR, 354, 334, 416, 286, 61.7, 0.7);
body.squashTo(1.04, 0.96, { at: 63.4, duration: 0.18, ease: "power2.out" });
body.squashTo(1, 1, { at: 63.58, duration: 0.35, ease: "back.out(2.5)" });
aimArm(armL, handL, 216, 334, 143, 338, 63.2, 0.9);
restRightArm(63.2, 0.9);
eyeL.squashTo(1.2, 0.08, { at: 64.7, duration: 0.12, ease: "power2.in" });
eyeR.squashTo(1.2, 0.08, { at: 64.7, duration: 0.12, ease: "power2.in" });
eyeL.squashTo(1, 1, { at: 64.82, duration: 0.24, ease: "back.out(3)" });
eyeR.squashTo(1, 1, { at: 64.82, duration: 0.24, ease: "back.out(3)" });

export default scene;
