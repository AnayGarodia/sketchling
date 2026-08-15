import { sketch } from "../../src/index.js";
import { appearIn, drawIn, pulseScale, swayMove, swayRotate } from "../lib.js";

// Four ridgelines receding into haze with fog banks pooled between them, two pines on the near crest.

// look: "ink" with texture: "watercolor" — the whole subject is edges dissolving into damp air,
// and watercolor's displacement-and-bleed filter does that to every outline in the frame for
// free. This is the one scene of the set where a hard edge anywhere would be the mistake.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#b9cbd2" },
      { offset: 0.5, color: "#d7e2e2" },
      { offset: 1, color: "#eaeee6" },
    ],
  },
  seed: "fog-valley",
  texture: "watercolor",
});

// A pale disc burning through the overcast. Barely there on purpose — a bright sun would give
// the scene a light direction, and fog is the absence of one.
scene.add(
  sketch.ellipse(302, 126, 46, 46, {
    color: "#e4eae7",
    weight: "light",
    looseness: 0.3,
    fill: { color: "#eff3ec", style: "solid" },
  }, 24)
).drawOn({ at: 0, duration: 0.7 });

// --- A ridge: a crest line, then straight down past the bottom of the canvas. Closing the loop
// below the frame keeps its return edge out of sight, so each ridge reads as a solid landmass
// rather than a floating strip.
// Each is filled dark at the crest and pale at its foot: that vertical wash IS the aerial
// perspective, fog pooling in the low ground of every fold rather than sitting only where I
// painted an explicit bank.
function ridge(crest: [number, number][], top: string, foot: string, line: string, weight: "light" | "confident" | "bold") {
  return sketch.loop(
    [...crest, [480, 500], [0, 500]],
    {
      color: line,
      weight,
      looseness: 0.3,
      fill: { color: { stops: [{ offset: 0, color: top }, { offset: 1, color: foot }] }, style: "solid" },
    }
  );
}

const ridges = [
  ridge(
    [[0, 268], [64, 236], [132, 258], [196, 224], [268, 250], [344, 228], [412, 252], [480, 240]],
    "#a8bcc4", "#cfdadc", "#9db3bb", "light"
  ),
  ridge(
    [[0, 312], [78, 286], [158, 306], [244, 278], [322, 300], [402, 282], [480, 302]],
    "#82a0a6", "#b4c7c8", "#75949b", "light"
  ),
  ridge(
    [[0, 356], [90, 336], [176, 354], [262, 330], [352, 350], [430, 336], [480, 348]],
    "#5b787c", "#93aaaa", "#4e6c6f", "confident"
  ),
  ridge(
    [[0, 414], [72, 396], [152, 408], [242, 390], [330, 402], [418, 388], [480, 398]],
    "#33474a", "#5e7476", "#26383a", "bold"
  ),
];

// --- A fog bank: one long lens with an uneven top, not an ellipse — real fog has a ragged
// upper edge where it is being pulled apart and a flat-ish underside where it is sitting on the
// land it filled.
function fogBank(cx: number, cy: number, w: number, h: number, tint: string) {
  return sketch.loop(
    [
      [cx - w * 0.5, cy],
      [cx - w * 0.32, cy - h * 0.9],
      [cx - w * 0.06, cy - h * 0.55],
      [cx + w * 0.2, cy - h],
      [cx + w * 0.4, cy - h * 0.5],
      [cx + w * 0.5, cy + h * 0.1],
      [cx + w * 0.2, cy + h * 0.7],
      [cx - w * 0.26, cy + h * 0.6],
    ],
    // The outline is all but transparent on purpose. A bank drawn with its own visible edge reads
    // as a snowdrift cut out of paper — which is exactly what the first pass looked like — and fog
    // has no edge, only a place where it stops being thick enough to see.
    { color: "#ffffff1a", weight: "light", looseness: 0.45, fill: { color: tint, style: "solid" } }
  );
}

// Banks are authored between the ridges, palest and thinnest at the back — the same recession the
// ridge fills carry, held to on the fog too so the depth never contradicts itself.
const banks = [
  { node: fogBank(160, 276, 268, 24, "#f4f7f652"), dx: 15, breath: 1.03, n: 1 },
  { node: fogBank(346, 292, 214, 20, "#f2f6f647"), dx: -12, breath: 1.04, n: 1 },
  { node: fogBank(212, 336, 300, 28, "#f6f9f861"), dx: 18, breath: 1.035, n: 1 },
  { node: fogBank(360, 366, 218, 26, "#f8fbfa70"), dx: -14, breath: 1.05, n: 2 },
  { node: fogBank(118, 394, 236, 26, "#fbfdfc7d"), dx: 13, breath: 1.04, n: 2 },
];

// --- Painting order is the whole illusion: ridge, then the bank that sits in front of it, then
// the next ridge over the top of that bank. Interleaved like this the fog is genuinely BETWEEN
// the landforms; all four ridges first and all five banks after would just be gauze over a
// finished picture.
scene.add(ridges[0]);
scene.add(banks[0].node).lintIgnore("overlap");
scene.add(banks[1].node).lintIgnore("overlap");
scene.add(ridges[1]).lintIgnore("overlap");
scene.add(banks[2].node).lintIgnore("overlap");
scene.add(ridges[2]).lintIgnore("overlap");
scene.add(banks[3].node).lintIgnore("overlap");
scene.add(ridges[3]).lintIgnore("overlap");
scene.add(banks[4].node).lintIgnore("overlap");

// Ridges draw on back to front across most of the reveal; the banks only fade, since a fog bank
// being traced by a visible pen tip is the one thing that would give away that any of this was
// drawn with lines.
drawIn(ridges, { from: 0.3, to: 2.0, each: 0.7 });
appearIn(banks.map((b) => b.node), { from: 1.1, to: 2.5, each: 0.6 });

// --- Two pines on the near crest, the only shapes in the frame with a recognisable silhouette.
// Everything else is a tone; these are what give all that tone a scale.
function pine(px: number, py: number, h: number, halfW: number) {
  const g = sketch.group();
  g.add(
    sketch.loop([[px - 3, py], [px + 3, py], [px + 2, py - h * 0.3], [px - 2, py - h * 0.3]], {
      color: "#1d2c2c",
      weight: "confident",
      looseness: 0.25,
      fill: { color: "#243434", style: "solid" },
      smooth: false,
    })
  );
  ([[0.26, 1], [0.55, 0.76], [0.82, 0.5]] as [number, number][]).forEach(([base, spread]) => {
    g.add(
      sketch.loop(
        [[px - halfW * spread, py - h * base], [px + halfW * spread, py - h * base], [px, py - h * (base + 0.34)]],
        {
          color: "#1a2827",
          weight: "confident",
          looseness: 0.28,
          fill: { color: "#22322f", style: "solid" },
          smooth: false,
        }
      ).lintIgnore("overlap")
    );
  });
  return g;
}

const pines: { group: ReturnType<typeof pine>; x: number; y: number }[] = [
  { group: pine(126, 404, 74, 21), x: 126, y: 404 },
  { group: pine(348, 398, 56, 16), x: 348, y: 398 },
];
pines.forEach(({ group }) => scene.add(group));
drawIn(pines.map((p) => p.group.children).flat(), { from: 2.1, to: 2.8, each: 0.24 });

// --- The loop. Every bank drifts sideways and breathes at the same time: drift is x, breath is
// scale, two different axes on the same node, which compose instead of fighting. Rates and
// directions differ per bank so the valley never reads as one sheet of gauze sliding.
banks.forEach(({ node, dx, breath, n }) => {
  swayMove(node, dx, 0, n);
  pulseScale(node, breath, 2);
});

// The pines get barely more than a degree, pivoted at the root. They are the only thing in frame
// with any stiffness, and holding them almost still is what makes the fog look like it's moving.
pines.forEach(({ group, x, y }, i) => {
  group.pivotAt(x, y);
  swayRotate(group, 1.2, i === 0 ? 2 : 3);
});

export default scene;
