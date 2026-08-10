import { sketch } from "../../src/index.js";

// Gallery demo for sketch.ellipse(): a true, wobble-free disc, for the cases blob()'s own
// ~15%-of-radius wobble floor (present even at looseness: 0) reads as visibly lumpy — a sun,
// a gear hub, a clean round eye. A gear (ellipse hub + ellipse teeth stamped around it) next
// to a sun (concentric ellipses for the glow, one for the disc) against a soft blob cloud —
// the blob reads organic on purpose, the gear and sun read precise on purpose, in the same
// frame, under the same "ink" sketchiness.

const scene = sketch.scene({ width: 480, height: 300, background: "#dce8f0", seed: "ellipse-shapes" });

const INK = "#20242c";

// A cloud: blob() is the right call here, its wobble is the point.
scene.add(
  sketch.blob(90, 70, 40, { color: INK, weight: "light", looseness: 0.35, fill: { color: "#f4f7fa", style: "solid" } }, 12)
).appear({ at: 0, duration: 0.5 });

// The sun: ellipse() for the disc and every glow ring — a blob here would read as a wobbly
// potato, not a light source.
const sunGlow = sketch.group();
scene.add(sunGlow);
for (let i = 3; i >= 1; i--) {
  // Similarly-sized concentric rings, deliberately overlapping — the size-ratio heuristic
  // that tells "eye in a head" containment apart from a real collision doesn't apply here,
  // so this is exactly the case .lintIgnore("overlap") exists for.
  sunGlow.add(
    sketch
      .ellipse(380, 70, 26 + i * 12, 26 + i * 12, { color: "none", fill: { color: "#ffe9a8", style: "solid" }, opacity: 0.35 })
      .lintIgnore("overlap")
  );
}
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
