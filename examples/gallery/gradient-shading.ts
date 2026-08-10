import { sketch } from "../../src/index.js";

// Gallery demo for a gradient fill.color: the volumetric cue a flat fill has none of — a
// landform lit from above, falling into shadow at its base, instead of one uniform color.
// Same {stops, direction} shape scene.background already takes, but rendered as a real
// per-shape SVG gradient sized to that one shape's own bounding box. Two riders on the
// ridgeline are deliberately tiny — the landform, not the characters, carries the frame.

const scene = sketch.scene({
  width: 640,
  height: 400,
  background: {
    stops: [
      { offset: 0, color: "#8a7460" },
      { offset: 0.55, color: "#d6c8ac" },
      { offset: 1, color: "#f3ece0" },
    ],
    direction: "vertical",
  },
  seed: "gradient-shading",
  look: "flat",
});

const cliff = sketch.loop(
  [
    [-10, 400],
    [-10, 260],
    [120, 200],
    [260, 235],
    [420, 190],
    [520, 205],
    [660, 240],
    [660, 400],
  ],
  {
    color: "#0a0806",
    weight: "confident",
    smooth: true,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#8c7454" },
          { offset: 0.35, color: "#3c2e1e" },
          { offset: 1, color: "#080604" },
        ],
        direction: "vertical",
      },
      style: "solid",
    },
  }
);
scene.add(cliff).appear({ at: 0, duration: 0.4 });

// Nested detail this small routinely trips the lint overlap warning against the cliff
// beneath it — expected for intentional nesting (see AGENTS.md), not a problem to fix.
function rider(x: number, scale: number) {
  const g = sketch.group();
  scene.add(g);
  g.add(sketch.blob(x, 195, 6 * scale, { color: "#050403", fill: { color: "#050403", style: "solid" } }, 8));
  g.add(sketch.blob(x - 2, 189, 3 * scale, { color: "#050403", fill: { color: "#050403", style: "solid" } }, 8));
  return g;
}
rider(430, 1.0).appear({ at: 0.4, duration: 0.2 });
rider(445, 0.8).appear({ at: 0.4, duration: 0.2 });

export default scene;
