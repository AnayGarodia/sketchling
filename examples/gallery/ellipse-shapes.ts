import { sketch } from "../../src/index.js";

// Gallery demo for sketch.ellipse(): a true, wobble-free disc, for the cases blob()'s own
// ~15%-of-radius wobble floor (present even at looseness: 0) reads as visibly lumpy — a sun,
// a gear hub, a clean round eye. A gear (ellipse hub + ellipse teeth stamped around it) next
// to a sun (one radial-gradient ellipse for the glow, another for the disc) against a soft
// blob cloud — the blob reads organic on purpose, the gear and sun read precise on purpose,
// in the same frame, under the same "ink" sketchiness.

const scene = sketch.scene({ width: 480, height: 300, background: "#dce8f0", seed: "ellipse-shapes" });

const INK = "#20242c";

// A cloud: blob() is the right call here, its wobble is the point.
scene.add(
  sketch.blob(90, 70, 40, { color: INK, weight: "light", looseness: 0.35, fill: { color: "#f4f7fa", style: "solid" } }, 12)
).appear({ at: 0, duration: 0.5 });

// The sun: ellipse() for the disc, one radial-gradient ellipse for the glow — a blob here
// would read as a wobbly potato, not a light source, and before radial fills existed this
// glow was several flat ellipses stacked at decreasing alpha instead of one real falloff.
scene.add(
  sketch.ellipse(380, 70, 62, 62, {
    color: "none",
    fill: { color: { stops: [{ offset: 0, color: "#fff3c4" }, { offset: 0.55, color: "#ffe9a8" }, { offset: 1, color: "#ffe9a800" }], type: "radial" }, style: "solid" },
  })
);
scene.add(sketch.ellipse(380, 70, 26, 26, { color: INK, weight: "confident", fill: { color: "#ffc94a", style: "solid" } })).appear({
  at: 0.2,
  duration: 0.4,
});

// A gear: an ellipse hub, six ellipse teeth stamped around it at even angles — every one
// needs to actually be round for the mechanism to read as machined, not hand-molded.
const gear = sketch.group();
scene.add(gear);
const gearCx = 220,
  gearCy = 190,
  hubR = 22,
  toothR = 10,
  toothOrbit = 32;
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  gear.add(
    sketch.ellipse(gearCx + Math.cos(a) * toothOrbit, gearCy + Math.sin(a) * toothOrbit, toothR, toothR, {
      color: INK,
      weight: "confident",
      fill: { color: "#8a94a6", style: "solid" },
    })
  );
}
gear.add(sketch.ellipse(gearCx, gearCy, hubR, hubR, { color: INK, weight: "confident", fill: { color: "#5c6577", style: "solid" } }));
gear.initial({ opacity: 0 });
gear.fadeTo(1, { at: 0.6, duration: 0.5 });
gear.pivotAt(gearCx, gearCy);
gear.rotateBy(360, { at: 1.2, duration: 4, ease: "none" });

export default scene;
