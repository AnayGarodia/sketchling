import { sketch } from "../../src/index.js";
import { drawIn, lapAlong, pulseFade, pulseSquash, ringPath } from "../lib.js";

// An angled desk lamp at night, lighting one warm patch of desk with a book and a pencil on it.

const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#1a2130" },
      { offset: 0.7, color: "#101520" },
      { offset: 1, color: "#0a0d14" },
    ],
  },
  seed: "desk-lamp-night",
  look: "ink",
});

const INK = "#080b11";
const METAL = "#5c6679";
const WARM = "#ffcf5c";
const PAPER = "#e8d9b4";

// --- Desk surface, lit only where the lamp reaches it. This scene is a value problem rather
// than a colour one: the desk has to stay dark enough that a translucent yellow ellipse laid
// over it reads as light and not as paint.
const desk = sketch.loop(
  [
    [0, 360],
    [480, 360],
    [480, 480],
    [0, 480],
  ],
  {
    color: "#0a0d13",
    weight: "bold",
    looseness: 0.12,
    fill: { color: { stops: [{ offset: 0, color: "#1f160f" }, { offset: 1, color: "#33251a" }] }, style: "solid" },
    smooth: false,
  }
);
scene.add(desk).drawOn({ at: 0, duration: 0.8 });

// --- The pool of light. One radial gradient falling to a fully transparent outer stop, which
// is the whole trick: flat ellipses stacked at decreasing alpha leave visible steps, and a
// single continuous falloff is what makes a yellow patch read as illumination.
const pool = sketch.ellipse(288, 428, 160, 54, {
  color: "#00000000",
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#ffcf5cb8" },
        { offset: 0.45, color: "#ffcf5c66" },
        { offset: 1, color: "#ffcf5c00" },
      ],
      type: "radial",
    },
    style: "solid",
  },
});
scene.add(pool).lintIgnore("overlap");

// The beam, a wedge from the shade's mouth down to the pool — without it the pool reads as a
// stain on the desk with no visible cause. Kept at a fifth of the pool's alpha: any stronger
// and its two dead-straight edges read as a paper cutout rather than as air.
const beam = sketch.loop(
  [
    [211, 259],
    [131, 326],
    [176, 444],
    [412, 424],
  ],
  { color: "#00000000", fill: { color: { stops: [{ offset: 0, color: "#ffcf5c22" }, { offset: 1, color: "#ffcf5c05" }] }, style: "solid" }, smooth: false }
);
scene.add(beam).lintIgnore("overlap");

// --- Book, lying where the pool is brightest: cover, page block, spine. Three flat quads at
// slightly different angles read as a solid object seen from above; one rectangle reads as a
// playing card.
const cover = sketch.loop(
  [
    [190, 376],
    [306, 364],
    [316, 406],
    [200, 420],
  ],
  { color: "#3a1a14", weight: "bold", looseness: 0.14, fill: { color: sketch.shade("#b3543d", { from: "top", amount: 0.28 }), style: "solid" }, smooth: false }
);
scene.add(cover).lintIgnore("overlap");

const pages = sketch.loop(
  [
    [200, 420],
    [316, 406],
    [318, 420],
    [202, 434],
  ],
  { color: "#7a6a4a", weight: "confident", looseness: 0.14, fill: { color: PAPER, style: "solid" }, smooth: false }
);
scene.add(pages).lintIgnore("overlap");

const spine = sketch.loop(
  [
    [190, 376],
    [200, 420],
    [202, 434],
    [192, 388],
  ],
  { color: "#2c130f", weight: "confident", looseness: 0.14, fill: { color: "#7d3729", style: "solid" }, smooth: false }
);
scene.add(spine).lintIgnore("overlap");

// --- Pencil, out at the right where the pool is already falling off, and clear of the book by
// a hand's width so the two don't merge into one bar at thumbnail size.
const pencil = sketch.loop(
  [
    [348, 434],
    [424, 412],
    [428, 426],
    [352, 448],
  ],
  { color: "#6b4f18", weight: "confident", looseness: 0.12, fill: { color: "#dda63c", style: "solid" }, smooth: false }
);
scene.add(pencil);

const nib = sketch.loop(
  [
    [348, 434],
    [352, 448],
    [326, 447],
  ],
  { color: "#4a3a24", weight: "confident", looseness: 0.12, fill: { color: "#cbb894", style: "solid" }, smooth: false }
);
scene.add(nib).lintIgnore("overlap");

const eraser = sketch.loop(
  [
    [424, 412],
    [428, 426],
    [440, 422],
    [436, 408],
  ],
  { color: "#6b3038", weight: "confident", looseness: 0.12, fill: { color: "#c9707a", style: "solid" }, smooth: false }
);
scene.add(eraser).lintIgnore("overlap");

// --- The lamp, built as separate parts rather than one silhouette: the shade has to be a
// hard-edged cone (smooth:false) while the stem is a bent curve, and one node can't be both.
const foot = sketch.loop(
  [
    [52, 388],
    [136, 388],
    [146, 412],
    [42, 412],
  ],
  { color: INK, weight: "bold", looseness: 0.12, fill: { color: sketch.shade(METAL, { from: "top", amount: 0.3 }), style: "solid" }, smooth: false }
);
scene.add(foot).lintIgnore("overlap");

const stem = sketch.stroke([[94, 392], [104, 310], [112, 228]], { color: METAL, weight: "bold", looseness: 0.12 });
scene.add(stem).lintIgnore("overlap");

const joint = sketch.ellipse(112, 224, 15, 15, { color: INK, weight: "confident", looseness: 0.12, fill: { color: "#7b8598", style: "solid" } }, 16);
scene.add(joint).lintIgnore("overlap");

// A cone frustum: 36px across at the collar, 104 at the mouth, tipped 50 degrees down-right.
// The taper is the whole reason it reads as pointed AT the book rather than just leaning.
const shade = sketch.loop(
  [
    [98, 234],
    [126, 210],
    [211, 259],
    [131, 326],
  ],
  { color: INK, weight: "bold", looseness: 0.1, fill: { color: sketch.shade("#4d5768", { from: "top", amount: 0.34 }), style: "solid" }, smooth: false }
);
scene.add(shade).lintIgnore("overlap");

// One warm line along the mouth: the lit inside of the rim. Without it the shade was a grey
// quad that happened to have a bright blob near one corner.
const rim = sketch.stroke([[211, 259], [131, 326]], { color: "#ffe0a0", weight: "bold", looseness: 0.1 });
scene.add(rim).lintIgnore("overlap");

// The bulb, sitting in the mouth of the shade — the brightest pixel in the frame, which is
// what tells the eye where all this light is actually coming from.
const bulb = sketch.ellipse(171, 292, 21, 15, {
  color: "#ffe9a8",
  weight: "light",
  looseness: 0.05,
  fill: { color: { stops: [{ offset: 0, color: "#fffbe6" }, { offset: 1, color: WARM }], type: "radial" }, style: "solid" },
}, 18);
scene.add(bulb).lintIgnore("overlap");

// drawOn rather than appear on the glow shapes: drawOn is a mask wipe and never touches
// opacity, so it can't fight the pulseFade that owns these nodes across the loop window.
drawIn([pool, beam, cover, pages, spine, pencil, nib, eraser, foot, stem, joint, shade, rim, bulb], {
  from: 0.55,
  to: 2.9,
});

// --- The loop. Five breaths of the light across the window: a filament this old doesn't hold
// a steady value, and pool, beam and bulb dim together because they are all the same lamp. The
// range stays narrow on purpose — at 0.68 the pool visibly switched off and back on, which
// reads as a fault rather than as an old bulb.
pulseFade(pool, 0.96, 0.82, 5);
pulseFade(beam, 0.92, 0.74, 5);
pulseFade(bulb, 1, 0.9, 5);

// --- A moth working the shade on a closed ellipse. Authored at the top of its own ring, where
// ringPath starts, so frame one has it exactly where the path picks it up. The ring is offset to
// the right of the shade rather than concentric with it, which puts that starting point in open
// dark air: centred on the shade, the moth spent the first and last frames of the loop parked
// directly above the lamp's joint, reading as a bow tied to it. turn stays 0 — a moth stays
// upright all the way round; only its wings move.
const moth = sketch.group([
  sketch.loop([[196, 184], [177, 172], [169, 186], [184, 195]], { color: "#a89574", weight: "light", looseness: 0.2, fill: { color: "#ece0c4", style: "solid" } }),
  sketch.loop([[196, 184], [215, 172], [223, 186], [208, 195]], { color: "#a89574", weight: "light", looseness: 0.2, fill: { color: "#ece0c4", style: "solid" } }),
  sketch.ellipse(196, 186, 6, 11, { color: "#4a3f2e", weight: "confident", looseness: 0.15, fill: { color: "#6b5a44", style: "solid" } }, 12).lintIgnore("overlap"),
]);
scene.add(moth);
// 2.45, not 2.6: a stagger keeps going until `at + (n-1)*each + duration`, so three children at
// 0.08 apart is a 0.46s reveal. Left at 2.6 the body was still fading in on the loop's first
// frame and settled on its last — an invisible broken seam with no loop op anywhere near it.
moth.stagger(0.08, { at: 2.45, duration: 0.3, effect: "appear" });
lapAlong(moth, ringPath(196, 268, 96, 84), 2);
// Wingbeat, six times round: squash writes scaleX/scaleY and lapAlong only writes x/y, so the
// two compose instead of fighting over the same property.
pulseSquash(moth, 0.78, 1, 6);

export default scene;
