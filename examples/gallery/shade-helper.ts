import { sketch } from "../../src/index.js";

// Gallery demo for sketch.shade(): a real light-direction gradient derived from ONE base
// color instead of hand-picking 2-3 hex stops per shape — every gradient-shaded example so
// far (gradient-shading.ts, nightfall-hill.ts, quiet-crossing.ts, quiet-ride.ts) authored
// its own lighter/darker stops by eye. Three fruits on a table, all lit `from: "top"` — the
// point isn't any one shape's shading, it's that every shape lit from the same direction
// shares the same light logic for free, instead of needing its own hand-tuned stops that
// happen to agree with its neighbors.

const scene = sketch.scene({
  width: 480,
  height: 320,
  background: sketch.shade("#cfc9ba", { from: "top", amount: 0.5 }),
  seed: "shade-helper",
  look: "flat",
});

const INK = "#241d12";

const table = sketch.loop(
  [[0, 320], [0, 235], [480, 235], [480, 320]],
  { color: INK, weight: "confident", looseness: 0.1, fill: { color: sketch.shade("#8a6a44", { from: "top", amount: 0.3 }), style: "solid" } }
);
scene.add(table).appear({ at: 0, duration: 0.4 });

function fruit(cx: number, cy: number, r: number, base: string, vertices: number) {
  return sketch.blob(
    cx,
    cy,
    r,
    { color: INK, weight: "confident", looseness: 0.15, fill: { color: sketch.shade(base, { from: "top", amount: 0.4 }), style: "solid" } },
    vertices
  );
}

scene.add(fruit(150, 190, 52, "#b23a2e", 14)).appear({ at: 0.3, duration: 0.4 }); // apple
scene.add(fruit(260, 205, 44, "#d9a531", 16)).appear({ at: 0.5, duration: 0.4 }); // lemon
scene.add(fruit(350, 185, 56, "#6a8f3f", 14)).appear({ at: 0.7, duration: 0.4 }); // pear-green

// A stem on the apple, drawn last so it sits on top — small detail, not the point of the demo.
scene.add(
  sketch.stroke([[150, 140], [156, 122]], { color: INK, weight: "confident", looseness: 0.2 })
).drawOn({ at: 1.0, duration: 0.2 });

export default scene;
