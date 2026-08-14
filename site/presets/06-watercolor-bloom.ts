// Watercolor — a texture over flat
import { sketch } from "sketchling";

// `look` and `texture` are independent axes: crisp flat shapes here, with a turbulence +
// blur filter bleeding every edge like wet pigment.
const scene = sketch.scene({
  width: 380,
  height: 420,
  background: "#e9eff0",
  seed: "watercolor-bloom",
  look: "flat",
  texture: "watercolor",
});

const ink = "#3a3226";
const centerX = 190;
const centerY = 230;

const flower = sketch.group();
scene.add(flower);

const stem = sketch.stroke(
  [
    [190, 400],
    [180, 350],
    [196, 300],
    [centerX, centerY + 10],
  ],
  { color: ink, weight: "confident", looseness: 0, energy: "calm", smooth: true }
);
flower.add(stem).drawOn({ at: 0, duration: 0.85 });

const leaf = sketch.loop(
  [
    [186, 340],
    [136, 322],
    [116, 344],
    [158, 358],
  ],
  { color: ink, weight: "confident", looseness: 0, energy: "calm", smooth: true, fill: { color: "#4c7a4a", style: "solid" } }
);
flower.add(leaf).drawOn({ at: 0.9, duration: 0.4 });

// Six petals around the center, each drawn a beat after the last.
let t = 1.4;
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI * 2) / 6;
  const px = centerX + Math.cos(angle) * 52;
  const py = centerY + Math.sin(angle) * 52;
  const petal = sketch.ellipse(px, py, 34, 24, { color: ink, weight: "confident", fill: { color: "#e08fa0", style: "solid" } });
  // duration: 0 snaps instead of tweening — here to point each petal's long axis outward
  // from the flower's center before it is ever drawn.
  petal.pivotAt(px, py).rotateTo((angle * 180) / Math.PI, { at: 0, duration: 0 });
  flower.add(petal).drawOn({ at: t, duration: 0.35 });
  t += 0.45;
}

const eye = sketch.ellipse(centerX, centerY, 24, 24, {
  color: ink,
  weight: "confident",
  fill: { color: "#f2b705", style: "solid" },
});
flower.add(eye).drawOn({ at: t + 0.1, duration: 0.3 });
eye.lintIgnore("overlap");

// Once bloomed, the whole group sways from the base of the stem.
flower.pivotAt(190, 400);
flower
  .rotateTo(4, { at: t + 0.5, duration: 1, ease: "sine.inOut" })
  .rotateTo(-4, { at: t + 1.5, duration: 1, ease: "sine.inOut" })
  .rotateTo(0, { at: t + 2.5, duration: 0.8, ease: "sine.inOut" });

export default scene;
