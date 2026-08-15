import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, pulseFade, swayRotate } from "../lib.js";

// A corked jar of moss on a shelf in a dim room, fogging up while one drop runs down the glass.

// A dark, cool room so the jar reads as lit from within: condensation is pale, and pale beads on
// a pale wall are invisible. The gradient goes darkest at the top, which is also what keeps the
// empty upper half of the frame reading as room rather than as unused paper.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#2b3540" },
      { offset: 0.7, color: "#3e4a56" },
      { offset: 1, color: "#4a5560" },
    ],
  },
  seed: "moss-terrarium",
  look: "ink",
});

const GLASS = "#bcd8d8";
// Brighter than it looks like it should be: everything in the jar sits under a pale wash, which
// knocks a mid-green back to olive and welds the moss to the soil behind it.
const MOSS = "#89bd58";
const SOIL = "#4a3527";
const SAND = "#d3bf96";
const WOOD = "#8a5f3a";

type P = [number, number];

// --- The shelf. One board with a front edge and a shadow pool, so the jar has somewhere to be.
const shelf = sketch.loop(
  [
    [20, 412],
    [460, 412],
    [460, 444],
    [20, 444],
  ],
  { color: "#3a2818", weight: "bold", looseness: 0.16, smooth: false, fill: { color: sketch.shade(WOOD, { from: "top", amount: 0.34 }), style: "solid" } }
);
scene.add(shelf).drawOn({ at: 0, duration: 0.8 });
scene.add(
  sketch.stroke([[20, 420], [460, 420]], { color: "#6a4527", weight: "light", looseness: 0.2 })
).lintIgnore("overlap").drawOn({ at: 0.55, duration: 0.35 });
scene.add(
  sketch.ellipse(240, 414, 112, 9, { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#2c1f14", style: "solid" } })
).lintIgnore("overlap").drawOn({ at: 0.7, duration: 0.3 });

// --- The jar's outline goes down before anything is in it, and the pale wash over the contents
// comes later as its own node: one shape cannot be both behind the moss and in front of it.
// Two points per shoulder rather than one: a single corner point made the spline overshoot into a
// little hook on each side of the neck, and the jar read as a bottle with handles.
const jarPts: P[] = [
  [174, 174],
  [166, 174],
  [164, 188],
  [154, 204],
  [151, 232],
  [150, 380],
  [162, 404],
  [190, 412],
  [290, 412],
  [318, 404],
  [330, 380],
  [329, 232],
  [326, 204],
  [316, 188],
  [314, 174],
  [306, 174],
];
const jar = sketch.loop(jarPts, { color: GLASS, weight: "bold", looseness: 0.14 });
scene.add(jar).lintIgnore("overlap").drawOn({ at: 0.85, duration: 0.9 });

// --- Layers, bottom up, the way a terrarium is actually built: drainage pebbles, a pale sand
// line, then soil. Three thin bands read as deliberate strata; one brown mass reads as mud.
// Every layer carries a mid-point down each vertical side. Without one, a closed spline's tangent
// at the bottom corner points at the far corner across the shape, and the band bulges out through
// the glass wall in two brown lobes — the layers have to be a hair inside the jar AND stay there.
const pebbleBed = sketch.loop(
  [
    [160, 392],
    [320, 392],
    [320, 398],
    [318, 404],
    [290, 410],
    [190, 410],
    [163, 404],
    [160, 398],
  ],
  { color: "#4c5254", weight: "light", looseness: 0.24, fill: { color: "#767d7d", style: "solid" } }
);
const pebbles = ([
  [186, 400, 10],
  [216, 398, 11],
  [252, 401, 10],
  [288, 399, 11],
] as [number, number, number][]).map(([x, y, r]) =>
  sketch.blob(x, y, r, { color: "#3f4547", weight: "light", looseness: 0.32, fill: { color: "#9aa1a0", style: "solid" } }, 9)
    .lintIgnore("overlap")
);
const sand = sketch.loop(
  [
    [157, 376],
    [200, 373],
    [268, 376],
    [321, 373],
    [321, 383],
    [320, 392],
    [240, 394],
    [159, 392],
    [157, 383],
  ],
  { color: "#a8916a", weight: "light", looseness: 0.22, fill: { color: SAND, style: "solid" } }
);
// The soil line sits high — contents filling only the bottom third left the jar reading as an
// empty jar with something in the corner, rather than as a planting.
const soil = sketch.loop(
  [
    [154, 324],
    [196, 316],
    [244, 322],
    [292, 314],
    [325, 324],
    [325, 350],
    [324, 377],
    [240, 380],
    [155, 377],
    [154, 350],
  ],
  { color: "#2c1f16", weight: "confident", looseness: 0.24, fill: { color: sketch.shade(SOIL, { from: "top", amount: 0.3 }), style: "solid" } }
);
[pebbleBed, ...pebbles, sand, soil].forEach((n) => scene.add(n).lintIgnore("overlap"));
drawIn([pebbleBed, sand, soil], { from: 1.4, to: 1.9, each: 0.3 });
appearIn(pebbles, { from: 1.55, to: 1.8, each: 0.22 });

// --- Moss: overlapping mounds, because moss is a texture of many humps and one green outline is
// a puddle of paint. They sit ON the soil's own top edge, not floating above it.
const mounds = ([
  [178, 316, 19],
  [212, 310, 17],
  [252, 316, 20],
  [292, 308, 18],
  [318, 320, 15],
] as [number, number, number][]).map(([x, y, r]) =>
  sketch.blob(x, y, r, {
    color: "#3c5a2b",
    weight: "light",
    looseness: 0.4,
    fill: { color: sketch.shade(MOSS, { from: "top", amount: 0.3 }), style: "solid" },
  }, 11).lintIgnore("overlap")
);
mounds.forEach((m) => scene.add(m));
appearIn(mounds, { from: 1.9, to: 2.25, each: 0.3 });

// --- Two seedlings. Each is a stem plus three leaves in one group, pivoted where it enters the
// moss, so it bends from the root — and on different counts, so the pair never moves as one prop.
function seedling(bx: number, by: number, tipDx: number, height: number, leaves: [number, number, number][]) {
  const g = sketch.group();
  g.add(
    sketch.stroke(
      [
        [bx, by],
        [bx + tipDx * 0.4, by - height * 0.55],
        [bx + tipDx, by - height],
      ],
      { color: "#4f7a3a", weight: "confident", looseness: 0.2, energy: "calm" }
    )
  );
  for (const [lx, ly, deg] of leaves) {
    const a = (deg * Math.PI) / 180;
    const len = 24;
    g.add(
      sketch.loop(
        [
          [lx, ly],
          [lx + Math.cos(a) * len * 0.5 - Math.sin(a) * 8, ly + Math.sin(a) * len * 0.5 + Math.cos(a) * 8],
          [lx + Math.cos(a) * len, ly + Math.sin(a) * len],
          [lx + Math.cos(a) * len * 0.5 + Math.sin(a) * 8, ly + Math.sin(a) * len * 0.5 - Math.cos(a) * 8],
        ],
        { color: "#3d6330", weight: "light", looseness: 0.22, fill: { color: sketch.shade("#83b358", { from: "top", amount: 0.3 }), style: "solid" } }
      ).lintIgnore("overlap")
    );
  }
  return g;
}

const sproutL = seedling(196, 320, -8, 60, [
  [192, 278, 205],
  [193, 294, -20],
  [190, 264, -40],
]);
const sproutR = seedling(286, 312, 10, 52, [
  [292, 280, -25],
  [290, 294, 200],
  [295, 266, 215],
]);
scene.add(sproutL);
scene.add(sproutR);
sproutL.stagger(0.08, { at: 2.2, duration: 0.28 });
sproutR.stagger(0.08, { at: 2.42, duration: 0.28 });
sproutL.pivotAt(196, 320);
swayRotate(sproutL, 4.5, 2);
sproutR.pivotAt(286, 312);
swayRotate(sproutR, -3.5, 3);

// --- The wash: one very low-alpha fill with a fully transparent outline, laid over the contents.
// This is the whole glass effect — everything inside now reads as seen THROUGH something, and the
// jar's own bold outline drawn earlier stays crisp on top of it.
// A vertical gradient rather than a flat alpha, heavier at the bottom: humidity pools low in a
// closed jar, and the falloff is what reads as air with water in it instead of tinted plastic.
// It carries the glass outline a second time, over the contents, on purpose: the soil and sand
// bands have to run right up to the walls or a sliver of room shows through beside them, and a
// band that wide overshoots the glass line by a pixel or two. Re-inking the edge on top puts the
// jar back in front of its own contents, and the two hand-drawn outlines a hair apart read as the
// double highlight you actually see on a curved pane.
const wash = sketch.loop(jarPts, {
  color: GLASS,
  weight: "confident",
  looseness: 0.14,
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#cfe6e614" },
        { offset: 1, color: "#e2f4f43a" },
      ],
    },
    style: "solid",
  },
});
scene.add(wash).lintIgnore("overlap").drawOn({ at: 2.35, duration: 0.4 });

// Two curved highlights down the left shoulder — the specular streak is what turns a pale
// outline into curved glass, and two beat one, since real glass reflects a window's two edges.
// Both hug the wall itself (x within a few px of the glass line): drawn further in they stop
// being a reflection ON the glass and start looking like a straw standing in the jar.
const highlights = [
  sketch.stroke([[161, 222], [157, 272], [161, 322]], { color: "#e2f2f2", weight: "confident", looseness: 0.2 }),
  sketch.stroke([[173, 214], [170, 246]], { color: "#e2f2f2", weight: "light", looseness: 0.2 }),
];
highlights.forEach((h) => scene.add(h).lintIgnore("overlap"));
drawIn(highlights, { from: 2.55, to: 2.75, each: 0.2 });

// --- Cork, last: it sits over the jar's open mouth line, so it has to be painted after it.
const cork = sketch.loop(
  [
    [176, 170],
    [304, 170],
    [298, 136],
    [182, 136],
  ],
  { color: "#6d4520", weight: "bold", looseness: 0.16, smooth: false, fill: { color: sketch.shade("#c08a4e", { from: "top", amount: 0.32 }), style: "solid" } }
);
scene.add(cork).lintIgnore("overlap").drawOn({ at: 2.6, duration: 0.3 });
// The rim overhangs the glass by a few pixels on each side — true of any cork in any jar, and it
// also parks itself exactly over the two corners where the neck meets the mouth.
const corkRim = sketch.loop(
  [
    [158, 166],
    [322, 166],
    [320, 182],
    [160, 182],
  ],
  { color: "#6d4520", weight: "confident", looseness: 0.14, smooth: false, fill: { color: "#a06f37", style: "solid" } }
);
scene.add(corkRim).lintIgnore("overlap").drawOn({ at: 2.8, duration: 0.18 });

// --- Condensation: six beads on the inside of the glass, each breathing on its own count between
// nearly-clear and nearly-opaque. pulseFade's `from` is also the resting opacity, so they read
// correctly on the loop's first frame with no separate reveal (and no fade fighting a drawOn).
([
  [174, 248, 2],
  [196, 210, 3],
  [308, 240, 3],
  [286, 202, 2],
  [166, 284, 5],
  [312, 280, 2],
] as [number, number, number][]).forEach(([x, y, n]) => {
  // An ellipse, not a blob: at 9px a blob's own outline wobble is most of the shape, and six
  // wobbly grey lumps floating in a jar read as gravel. A clean tall droplet reads as water.
  const bead = sketch.ellipse(x, y, 8, 10, {
    color: "#f4feff",
    weight: "light",
    looseness: 0,
    fill: { color: "#fbffff", style: "solid" },
  }, 12);
  scene.add(bead).lintIgnore("overlap");
  // Rests at half opacity, not a fifth: a pale bead at a fifth over a dark jar interior is a grey
  // smudge, and the loop's whole job here is that they come and go visibly.
  pulseFade(bead, 0.5, 0.95, n);
});

// --- The event of the loop: one drop letting go and running down the inside of the glass. It
// travels on the second half of the window only, so the eye has time to find it, and it snaps
// back to the top while fully transparent (driftOnce).
const drop = sketch.loop(
  [
    [176, 216],
    [182, 224],
    [180, 238],
    [176, 242],
    [171, 238],
    [170, 224],
  ],
  { color: "#cfe6e6", weight: "light", looseness: 0.18, fill: { color: "#eaf6f6", style: "solid" } }
);
scene.add(drop).lintIgnore("overlap");
driftOnce(drop, 6, 112, beats(2)[1], { ease: "sine.in", peak: 0.95 });

export default scene;
