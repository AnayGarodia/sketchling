import { sketch } from "../../src/index.js";

// Gallery demo for texture: "grain": a whole-frame SVG filter, independent of `look` (see
// types.ts's SceneTexture doc comment) — fine aged-paper/film-grain texture instead of
// watercolor's wet-media bleed. Layered over look: "flat" here, on a gradient-shaded
// landform rather than a small geometric shape (the other *-look.ts files' convention),
// because that's genuinely where this texture does its work: a smooth vector gradient reads
// as flat illustration, and grain is what breaks that smoothness into something that reads
// as aged and atmospheric. This is the exact scene from gradient-shading.ts, only `texture`
// added. Grain pairs just as well with "ink"'s own jitter and hachure fills — the two axes
// are fully independent — for an old-book/engraving register instead of this atmospheric
// one; that's a different scene, not shown here.

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
  look: "flat",
  texture: "grain",
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
