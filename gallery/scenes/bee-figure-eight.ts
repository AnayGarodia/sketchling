import { sketch } from "../../src/index.js";
import { appearIn, drawIn, lapAlong, pulseSquash, swayRotate } from "../lib.js";

// A fat bumblebee flying a figure-eight over three nodding meadow flowers, wings a pale blur.

const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#bcdce8" },
      { offset: 0.6, color: "#e4ecd6" },
      { offset: 1, color: "#efe0b4" },
    ],
  },
  seed: "bee-figure-eight",
  look: "ink",
});

const INK = "#2a2119";
const BEE_YELLOW = "#f2c23a";
const STEM = "#5c8a3c";

// --- Meadow floor, so the flowers are rooted in something and the bee has a ground plane to
// hover above. One band, no horizon detail: everything above it belongs to the bee.
const ground = sketch.loop(
  [[0, 428], [130, 418], [286, 424], [480, 412], [480, 480], [0, 480]],
  { color: "#4a6b32", weight: "bold", looseness: 0.2, fill: { color: sketch.shade("#7aa04a", { from: "top", amount: 0.32 }), style: "solid" } }
);
scene.add(ground).drawOn({ at: 0, duration: 0.8 });

const grass = ([[44, 424], [78, 422], [176, 420], [212, 422], [316, 420], [346, 421], [432, 414]] as [number, number][]).map(
  ([gx, gy]) => sketch.stroke([[gx, gy], [gx + 5, gy - 20], [gx - 3, gy - 36]], { color: "#456630", weight: "confident", looseness: 0.3 })
);
grass.forEach((g) => scene.add(g).lintIgnore("overlap"));
appearIn(grass, { from: 0.5, to: 1.2, each: 0.3 });

// --- Three flowers. Each is stem + bloom in ONE group, pivoted where the stem leaves the
// ground, so it nods from its root the way a real stalk does instead of swinging around the
// middle of its own bounding box.
const flowers: [number, number, number, string, string, number][] = [
  [112, 430, 330, "#e06a86", "#f6c0cd", 3.2],
  [246, 424, 300, "#c98ad4", "#eccdf2", 2.4],
  [374, 418, 344, "#ef8f3c", "#f8cf94", 3.6],
];
flowers.forEach(([bx, by, topY, petalColor, petalLight, deg], i) => {
  const whole = sketch.group();
  const stem = sketch.stroke([[bx, by], [bx + (i === 1 ? 10 : -8), (by + topY) / 2], [bx, topY + 16]], {
    color: STEM, weight: "bold", looseness: 0.22,
  });
  whole.add(stem);
  // Two leaves per stem — a bare line plus a bloom reads as a lollipop, not a plant.
  whole.add(
    sketch.loop([[bx, by - 40], [bx - 26, by - 52], [bx - 30, by - 34], [bx - 6, by - 30]], {
      color: "#3f6329", weight: "confident", looseness: 0.25, fill: { color: "#6c9440", style: "solid" },
    }).lintIgnore("overlap")
  );
  whole.add(
    sketch.loop([[bx, by - 62], [bx + 24, by - 74], [bx + 28, by - 56], [bx + 6, by - 52]], {
      color: "#3f6329", weight: "confident", looseness: 0.25, fill: { color: "#6c9440", style: "solid" },
    }).lintIgnore("overlap")
  );
  const bloom = sketch.group();
  for (let p = 0; p < 6; p++) {
    const a = (p / 6) * Math.PI * 2 - Math.PI / 2;
    bloom.add(
      sketch.blob(bx + Math.cos(a) * 20, topY + Math.sin(a) * 20, 15, {
        color: petalColor, weight: "confident", looseness: 0.22, fill: { color: petalLight, style: "solid" },
      }, 10).lintIgnore("overlap")
    );
  }
  bloom.add(
    sketch.ellipse(bx, topY, 12, 12, { color: "#a06a20", weight: "confident", looseness: 0, fill: { color: "#f0cf62", style: "solid" } }, 16).lintIgnore("overlap")
  );
  whole.add(bloom);
  scene.add(whole);

  stem.drawOn({ at: 1.0 + i * 0.2, duration: 0.4 });
  drawIn(whole.children.slice(1, 3), { from: 1.3 + i * 0.2, to: 1.7 + i * 0.2, each: 0.25 });
  bloom.stagger(0.06, { at: 1.8 + i * 0.22, duration: 0.35, effect: "appear" });

  whole.pivotAt(bx, by);
  swayRotate(whole, deg, i === 1 ? 3 : 2);
});

// --- The circuit: a lemniscate, generated rather than hand-listed so the crossing is exactly
// on the centre line and the two lobes are actually symmetric. Closed by construction (t wraps
// a full 2*pi), which is what `lapAlong` needs to come back to its own first frame.
const CX = 240;
const CY = 196;
const eight: [number, number][] = Array.from({ length: 41 }, (_, i) => {
  const t = (i / 40) * Math.PI * 2;
  const s = Math.sin(t);
  const c = Math.cos(t);
  const d = 1 + s * s;
  return [CX + (140 * c) / d, CY + (250 * s * c) / d];
});

// The bee is authored at the path's own start point (the right lobe's outer edge) so its
// reveal happens where the loop will pick it up, not somewhere it then teleports from.
const BX = eight[0][0];
const BY = eight[0][1];

const bee = sketch.group();
const abdomen = sketch.loop(
  [
    [BX - 33, BY - 2],
    [BX - 26, BY - 17],
    [BX - 4, BY - 24],
    [BX + 20, BY - 19],
    [BX + 30, BY - 3],
    [BX + 21, BY + 16],
    [BX - 3, BY + 22],
    [BX - 26, BY + 15],
  ],
  { color: INK, weight: "bold", looseness: 0.24, fill: { color: sketch.shade(BEE_YELLOW, { from: "top", amount: 0.3 }), style: "solid" } }
);
bee.add(abdomen);

// Three bands, drawn as strokes that follow the body's curve. A bumblebee is unmistakable from
// its stripes alone, which is what has to survive at thumbnail size.
for (const dx of [-16, 1, 17]) {
  bee.add(
    sketch.stroke([[BX + dx + 1, BY - 20], [BX + dx - 2, BY - 1], [BX + dx + 1, BY + 18]], {
      color: INK, weight: "bold", looseness: 0.2,
    }).lintIgnore("overlap")
  );
}
// Stinger, sharp corners so smooth:false.
bee.add(
  sketch.loop([[BX - 32, BY - 3], [BX - 48, BY + 3], [BX - 31, BY + 9]], {
    color: INK, weight: "confident", looseness: 0.18, fill: { color: "#2b2420", style: "solid" }, smooth: false,
  }).lintIgnore("overlap")
);
// Legs, dangling — a hovering bee never tucks them.
for (const [lx, ly, tx, ty] of [[-8, 19, -16, 33], [4, 21, 1, 36], [16, 15, 20, 31]] as [number, number, number, number][]) {
  bee.add(
    sketch.stroke([[BX + lx, BY + ly], [BX + tx, BY + ty]], { color: "#3a2f22", weight: "confident", looseness: 0.3 }).lintIgnore("overlap")
  );
}
// Head last of the body parts, dropped into the thorax so there is no gap at the join.
const head = sketch.blob(BX + 32, BY - 3, 16, {
  color: INK, weight: "bold", looseness: 0.2, fill: { color: "#2f2823", style: "solid" },
}, 11);
bee.add(head.lintIgnore("overlap"));
bee.add(
  sketch.ellipse(BX + 38, BY - 7, 7, 6, { color: "#1c1712", weight: "light", looseness: 0, fill: { color: "#f4ecd2", style: "solid" } }, 12).lintIgnore("overlap")
);
for (const [ax, ay, bx2, by2] of [[34, -15, 54, -30], [38, -12, 60, -20]] as [number, number, number, number][]) {
  bee.add(
    sketch.stroke([[BX + ax, BY + ay], [BX + (ax + bx2) / 2 + 4, BY + (ay + by2) / 2 - 6], [BX + bx2, BY + by2]], {
      color: INK, weight: "confident", looseness: 0.25,
    }).lintIgnore("overlap")
  );
}

// --- Wings: not drawn as membranes at all, but as two pale ellipses — at a bumblebee's ~200Hz
// there is nothing to see but blur, and an outlined wing would read as frozen.
const wings = sketch.group([
  sketch.ellipse(BX - 6, BY - 30, 30, 14, { color: "#9dc2d4", weight: "light", looseness: 0, fill: { color: "#dff0f899", style: "solid" } }, 18).lintIgnore("overlap"),
  sketch.ellipse(BX + 13, BY - 23, 20, 9, { color: "#9dc2d4", weight: "light", looseness: 0, fill: { color: "#e8f4fa99", style: "solid" } }, 16).lintIgnore("overlap"),
]);
bee.add(wings);

scene.add(bee);
drawIn([abdomen, head], { from: 2.1, to: 2.55, each: 0.3 });
appearIn(bee.children.filter((c) => c !== abdomen && c !== head), { from: 2.35, to: 2.85, each: 0.25 });

// --- Two whole laps of the eight across the window. `turn: 0` on purpose: a bumblebee's body
// stays roughly level whatever direction it drifts, and banking a nearly-round silhouette into
// every turn only makes the crossing read as a wobble.
lapAlong(bee, eight, 2);

// The wing beat: 22 pulses across the window, hinged at the wing root rather than the ellipse's
// own middle, so the blur fans from the shoulder instead of pumping in place.
wings.pivotAt(BX + 4, BY - 16);
pulseSquash(wings, 1.05, 0.42, 22);

export default scene;
