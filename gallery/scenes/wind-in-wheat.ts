import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, rng, swayRotate } from "../lib.js";

// A field of wheat under a late-summer sky, one tall stalk in front, wind travelling through the crop.

// look: "ink" with texture: "grain" — the aged-paper grain is doing real work here rather than
// being decoration: a field is dozens of near-identical thin strokes, and the grain gives the
// gaps between them some tooth so the crop reads as a mass instead of a comb.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#cd8340" },
      { offset: 0.52, color: "#f0cd83" },
      { offset: 1, color: "#f7e6bb" },
    ],
  },
  seed: "wind-in-wheat",
  texture: "grain",
});

const STEM = "#6f4a18";
const EAR_LINE = "#4c2f0e";
const rand = rng(0x7ea7);

// --- A low sun behind the crop, big and pale. It sets the light direction every ear is shaded
// against, and gives the stalk silhouettes something to be silhouettes against.
scene.add(
  sketch.ellipse(322, 268, 62, 62, {
    color: "#f0cf86",
    weight: "light",
    looseness: 0.2,
    fill: { color: "#fae7ab", style: "solid" },
  }, 28)
).drawOn({ at: 0, duration: 0.8 });

// --- The field floor. Deliberately shallow: the stalks are the subject, and the ground only has
// to say they're rooted in something rather than hanging in the sky.
scene.add(
  sketch.loop(
    [[0, 436], [124, 430], [252, 438], [370, 428], [480, 434], [480, 480], [0, 480]],
    {
      color: "#6b4a18",
      weight: "confident",
      looseness: 0.22,
      fill: { color: sketch.shade("#966d29", { from: "top", amount: 0.34 }), style: "solid" },
    }
  )
).drawOn({ at: 0.3, duration: 0.9 });

// --- One stalk: a stem that leans as it rises, a spindle-shaped ear on top, and awns only on the
// nearest few. Everything for one stalk goes in one group so it bends as a plant, not as a stem
// with an ear hovering above it.
function stalk(bx: number, by: number, h: number, curve: number, near: boolean) {
  const g = sketch.group();
  const tipX = bx + curve;
  const tipY = by - h;
  g.add(
    sketch.stroke(
      [[bx, by], [bx + curve * 0.28, by - h * 0.42], [bx + curve * 0.7, by - h * 0.78], [tipX, tipY]],
      { color: STEM, weight: near ? "confident" : "light", looseness: 0.24, energy: "calm" }
    )
  );

  // The ear: a spindle, fat at the shoulders and pointed at the tip. A plain oval reads as a
  // seed pod; the point is what makes it wheat.
  const L = 36 + h * 0.1;
  const W = near ? 7 : 5.6;
  g.add(
    sketch.loop(
      [
        [tipX, tipY - L],
        [tipX + W, tipY - L * 0.6],
        [tipX + W * 0.72, tipY - L * 0.2],
        [tipX, tipY + 3],
        [tipX - W * 0.72, tipY - L * 0.2],
        [tipX - W, tipY - L * 0.6],
      ],
      {
        color: EAR_LINE,
        weight: near ? "confident" : "light",
        looseness: 0.26,
        fill: { color: sketch.shade(near ? "#c98f2c" : "#dcaa48", { from: "top", amount: 0.34 }), style: "solid" },
      }
    ).lintIgnore("overlap")
  );

  // Awns are hair-fine and would just be dirt at thumbnail size on a background stalk, so only
  // the near ones get them — which doubles as a depth cue. They fan up off the tip, near-vertical:
  // splayed sideways they read as insect legs, which is exactly what the first pass looked like.
  if (near) {
    ([[2, -26], [9, -21], [-6, -22]] as [number, number][]).forEach(([dx, dy]) => {
      g.add(
        sketch.stroke([[tipX + dx * 0.15, tipY - L * 0.9], [tipX + dx, tipY - L + dy]], {
          color: EAR_LINE,
          weight: "light",
          looseness: 0.28,
        }).lintIgnore("overlap")
      );
    });
    // Tried a leaf blade off each near stem here too, and cut it: at this scale every blade read
    // as a broken twig hooked onto the stalk, and sixteen of them turned the crop into brambles.
  }
  return g;
}

// --- The crop: sixteen stalks on a seeded scatter, even spacing nudged by rng so the row reads as
// grown rather than planted on a grid. Bases sit a little deeper toward the front of the field.
const crop: { group: ReturnType<typeof stalk>; bx: number; by: number; near: boolean }[] = [];
for (let i = 0; i < 16; i++) {
  const bx = 24 + (i / 15) * 432 + (rand() - 0.5) * 24;
  const by = 424 + rand() * 20;
  const h = 142 + rand() * 90;
  const curve = (rand() - 0.5) * 26;
  const near = h > 202;
  const g = stalk(bx, by, h, curve, near);
  scene.add(g);
  crop.push({ group: g, bx, by, near });
}

// The one stalk in front, taller and bolder than anything behind it: a field of equals has no
// subject, and at thumbnail size the eye needs somewhere to land first.
const HERO_X = 196;
const HERO_Y = 462;
const hero = stalk(HERO_X, HERO_Y, 306, 14, true);
scene.add(hero);

// --- Reveal: stems first as a left-to-right sweep, then every ear fades in as one short shower.
// Drawing 40-odd hairline strokes one at a time would eat the entire three seconds, and a field
// doesn't need to be watched being planted.
drawIn([...crop.map((c) => c.group.children[0]), hero.children[0]], { from: 0.6, to: 2.3, each: 0.4 });
appearIn(
  [...crop.map((c) => c.group.children.slice(1)).flat(), ...hero.children.slice(1)],
  { from: 1.4, to: 2.7, each: 0.4 }
);

// --- The loop: the wind. Every stalk gets the same small amplitude, but the number of sways per
// cycle alternates by position (two, three, two, ...) so neighbours drift steadily in and out of
// phase with each other. That phase drift is what reads as a gust travelling across the field —
// one shared beat count would be sixteen stalks in a chorus line. Each pivots at its own base,
// because a plant bends from the soil, not from the middle of its own bounding box.
crop.forEach(({ group, bx, by, near }, i) => {
  group.pivotAt(bx, by);
  swayRotate(group, near ? 4.5 : 3.4 + (bx / 480) * 1.6, i % 3 === 0 ? 3 : 2);
});

// The hero sways widest and slowest — the clear event of the loop, with the field breathing
// behind it rather than competing.
hero.pivotAt(HERO_X, HERO_Y);
swayRotate(hero, 6, 2);

// Two husks torn loose and carried off downwind, on opposite halves of the loop, so the air
// itself is visibly moving and not just the crop.
const half = beats(2);
([
  [128, 250, 168, -54, 0],
  [286, 196, 132, -38, 1],
] as [number, number, number, number, number][]).forEach(([x, y, dx, dy, beat]) => {
  const husk = sketch.loop(
    [[x, y], [x + 9, y - 4], [x + 14, y + 3], [x + 5, y + 7]],
    { color: EAR_LINE, weight: "light", looseness: 0.3, fill: { color: "#e8c473", style: "solid" } }
  );
  scene.add(husk).lintIgnore("overlap");
  driftOnce(husk, dx, dy, half[beat], { ease: "sine.inOut", peak: 0.9 });
});

export default scene;
