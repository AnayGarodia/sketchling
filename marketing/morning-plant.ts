import { sketch, type NodeStyle, type Point, type Weight } from "sketchling";

const scene = sketch.scene({
  width: 640, height: 400, seed: "morning-plant",
  look: "ink", texture: "grain",
  background: { stops: [{ offset: 0, color: "#bcd3de" },
    { offset: 0.5, color: "#ecdfc2" }, { offset: 1, color: "#f3d5a4" }] },
});

// one pen for every hand-drawn edge, and one line per shape it draws
const ink = (fill: string, weight: Weight = "bold", smooth = false): NodeStyle =>
  ({ color: "#3b3024", weight, looseness: 0.3, smooth,
    fill: { color: sketch.shade(fill), style: "solid" } });
const draw = (pts: Point[], style: NodeStyle, at: number, duration: number) =>
  scene.add(sketch.loop(pts, style)).drawOn({ at, duration });
const line = (pts: Point[], color: string, weight: Weight, at: number, duration: number) =>
  scene.add(sketch.stroke(pts, { color, weight, looseness: 0.3 })).drawOn({ at, duration });

// the sun, climbing behind the sill for the whole scene
scene.add(sketch.ellipse(470, 188, 176, 176, {
  color: "#00000000",
  fill: { style: "solid", color: { type: "radial", stops: [
    { offset: 0, color: "#fffdf4" }, { offset: 0.13, color: "#fff5d4" },
    { offset: 0.2, color: "#ffe4a6" }, { offset: 1, color: "#ffcf7c00" }] } },
}))
  .initial({ opacity: 0 })
  .fadeTo(1, { at: 3, duration: 4.2, ease: "sine.inOut" })
  .moveBy(0, -80, { at: 3, duration: 9, ease: "sine.out" });

// hills far off through the window — no ink outline, so distance reads as distance
draw([[0, 302], [88, 286], [198, 297], [318, 279], [432, 293], [560, 283], [640, 292],
  [640, 332], [0, 332]], { ...ink("#b3c4bc", "light", true), color: "#a3b6ae" }, 0.4, 1.6);

// the sill and its grain
draw([[0, 328], [640, 321], [640, 400], [0, 400]], ink("#b98b5c", "confident"), 1.6, 1.2);
line([[36, 352], [286, 348], [604, 354]], "#a3794c", "light", 2.6, 0.7);
line([[22, 376], [300, 380], [618, 373]], "#a3794c", "light", 2.9, 0.7);

// the pot, its rim, the stem — in the order a hand would draw them
draw([[176, 236], [293, 236], [276, 328], [193, 328]], ink("#c1673f", 4), 3.3, 1.3);
draw([[167, 216], [302, 216], [294, 237], [175, 237]],
  ink("#cf7a4c", "confident"), 4.6, 0.8);
line([[234, 222], [228, 178], [242, 138]], "#4f6b39", "confident", 5.5, 0.9);

// three leaves, drawn asleep and drooping, then stretching toward the light
const leaves: Point[][] = [
  [[236, 162], [173, 138], [146, 96], [194, 92], [233, 133]],
  [[240, 150], [299, 116], [329, 70], [281, 64], [243, 114]],
  [[237, 136], [216, 84], [238, 46], [261, 82], [251, 132]],
];
leaves.forEach((pts, i) => {
  const leaf = sketch.loop(pts, ink("#6e8c52", 2, true));
  const vein = sketch.stroke([pts[0], pts[2]], { color: "#42582f", weight: 1 });
  for (const part of [leaf, vein]) {
    scene.add(part).lintIgnore("overlap").pivotAt(236, 158)
      .initial({ rotation: i === 1 ? 15 : -13 })
      .drawOn({ at: 6.3 + i * 0.9, duration: 1 })
      .rotateTo(0, { at: 9.3 + i * 0.5, duration: 2.2, ease: "sine.inOut" });
  }
});

// two shafts of light, falling across the sill
const beam: NodeStyle = {
  color: "#00000000", smooth: false,
  fill: { style: "solid", color: { stops: [
    { offset: 0, color: "#fff4d24a" }, { offset: 1, color: "#fff4d200" }] } },
};
const beams: Point[][] = [
  [[433, 105], [483, 124], [190, 350], [126, 322]],
  [[508, 134], [553, 161], [302, 360], [244, 330]],
];
beams.forEach((pts, i) =>
  scene.add(sketch.loop(pts, beam)).lintIgnore("overlap")
    .appear({ at: 6.2 + i * 0.9, duration: 1.8 }));

// one leaf that gave up earlier, lying on the sill
draw([[436, 356], [472, 346], [504, 353], [466, 364]], ink("#6e8c52", 2, true), 11.4, 0.7);

export default scene;
