import { sketch } from "../../src/index.js";

// Gallery demo for the "grain" look: the same crisp "flat" geometry, with a different
// whole-frame SVG filter than watercolor's — fine aged-paper/film-grain texture instead of
// wet-media bleed. Shown on a gradient-shaded landform rather than a small geometric shape
// (the other *-look.ts files' convention) because that's genuinely where this look does its
// work: a smooth vector gradient reads as flat illustration, and grain is what breaks that
// smoothness into something that reads as aged and atmospheric. The two looks compose —
// this is the exact scene from gradient-shading.ts, only the `look` value differs.

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
  seed: "grain-look",
  look: "grain",
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
