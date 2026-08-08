import { sketch } from "../../src/index.js";

// Gallery: the "watercolor" look — flat's crisp geometry plus a whole-frame SVG filter
// (turbulence displacement + blur) that bleeds every edge, like wet pigment. A blooming
// flower is a good subject for it: several solid-fill petals with real open interior area
// and a lot of outer edge, so the bleed has something to show off (pure line art wouldn't).
const scene = sketch.scene({
  width: 360,
  height: 420,
  background: "#e9eff0",
  seed: "watercolor-look-flower",
  look: "watercolor",
});

const ink = "#3a3226";
const petalColor = "#e08fa0";
const centerColor = "#f2b705";
const leafColor = "#4c7a4a";

const baseX = 180;
const baseY = 400;
const flowerCenterX = 180;
const flowerCenterY = 240;

const flower = sketch.group();
scene.add(flower);

// Stem: a single curved stroke from the ground up to the flower's center.
const stem = sketch.stroke(
  [
    [baseX, baseY],
    [173, 350],
    [187, 300],
    [flowerCenterX, flowerCenterY + 2],
  ],
  { color: ink, weight: "confident", looseness: 0.2, energy: "calm", smooth: true }
);
flower.add(stem).drawOn({ at: 0.0, duration: 0.85 });

// Leaf: a filled loop branching off the stem partway up.
const leaf = sketch.loop(
  [
    [178, 340],
    [130, 325],
    [110, 345],
    [150, 360],
  ],
  { color: ink, weight: "confident", looseness: 0.22, energy: "calm", smooth: true, fill: { color: leafColor, style: "solid" } }
);
flower.add(leaf).drawOn({ at: 0.9, duration: 0.4 });

// Six petals as filled loops, each a simple wedge pointing outward from the flower's center —
// enough open interior fill for the watercolor bleed to read clearly on both the outline and
// the fill boundary.
function petal(cx: number, cy: number, angleDeg: number, len: number, width: number): [number, number][] {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const px = -dy;
  const py = dx;
  const base: [number, number] = [cx + dx * 10, cy + dy * 10];
  const tip: [number, number] = [cx + dx * (10 + len), cy + dy * (10 + len)];
  const midX = cx + dx * (10 + len * 0.55);
  const midY = cy + dy * (10 + len * 0.55);
  const left: [number, number] = [midX + px * width, midY + py * width];
  const right: [number, number] = [midX - px * width, midY - py * width];
  return [base, left, tip, right];
}

const petalAngles = [-90, -30, 30, 90, 150, 210];
let petalStart = 1.4;
for (const angle of petalAngles) {
  const pts = petal(flowerCenterX, flowerCenterY, angle, 55, 20);
  const p = sketch.loop(pts, {
    color: ink,
    weight: "confident",
    looseness: 0.22,
    energy: "calm",
    smooth: true,
    fill: { color: petalColor, style: "solid" },
  });
  flower.add(p).drawOn({ at: petalStart, duration: 0.35 });
  petalStart += 0.5;
}

// Flower center, drawn last, on top of the petal bases.
const center = sketch.blob(
  flowerCenterX,
  flowerCenterY,
  22,
  { color: ink, weight: "confident", looseness: 0.2, energy: "calm", fill: { color: centerColor, style: "solid" } },
  12
);
flower.add(center).drawOn({ at: petalStart + 0.1, duration: 0.3 });

// Once fully bloomed, the whole flower keeps going: a gentle sway, pivoted at the ground.
const settledAt = petalStart + 0.5;
flower.pivotAt(baseX, baseY);
flower
  .rotateTo(4, { at: settledAt, duration: 1.0, ease: "sine.inOut" })
  .rotateTo(-4, { at: settledAt + 1.0, duration: 1.0, ease: "sine.inOut" })
  .rotateTo(0, { at: settledAt + 2.0, duration: 0.8, ease: "sine.inOut" });

export default scene;
