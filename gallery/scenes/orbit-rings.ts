import { sketch } from "../../src/index.js";
import { appearIn, drawIn, pulseFade, pulseScale, spin } from "../lib.js";

// An orrery reduced to its diagram: four concentric rings, each with beads riding it at its own speed.

// look: "flat" — this is a drawing of a mechanism, and a mechanism made of true circles wants
// no boil and no wobble. Every disc is sketch.ellipse rather than sketch.blob for the same
// reason: a blob keeps ~15% of its radius as baked-in jitter even at looseness 0, which on a ring
// this size reads as a hand-drawn scribble instead of an orbit.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#25396a" },
      { offset: 0.6, color: "#152547" },
      { offset: 1, color: "#0b1122" },
    ],
    type: "radial",
  },
  seed: "orbit-rings",
  look: "flat",
});

const CX = 240;
const CY = 240;
const RAIL = "#5f83bd"; // the rings themselves — dimmer than the beads, but not so dim they drop out at thumbnail size
const EDGE = "#0d1424"; // one dark outline colour for every bead, which is what ties them together
const OCHRE = "#f2b13c";
const CORAL = "#ef6a4d";
const MINT = "#5fd3b2";
const CREAM = "#f4ead3";

// --- The rails. Four of them, spaced widely enough that a bead on one never touches the next
// ring's line — an orrery reads as depth, and depth needs air between the tracks.
const RINGS: { r: number; beads: number; bead: number; color: string; turns: number }[] = [
  { r: 62, beads: 2, bead: 16, color: OCHRE, turns: 5 },
  { r: 106, beads: 4, bead: 14, color: CORAL, turns: 3 },
  { r: 150, beads: 6, bead: 13, color: MINT, turns: 2 },
  { r: 194, beads: 2, bead: 19, color: CREAM, turns: 1 },
];

// A thin outer bezel, drawn first: it frames the whole mechanism and stops the outermost
// beads from looking like they fell off the edge of something.
scene.add(
  sketch.ellipse(CX, CY, 222, 222, { color: "#39527f", weight: "light", looseness: 0 }, 64)
).lintIgnore("overlap").drawOn({ at: 0, duration: 0.9 });

const rails = RINGS.map(({ r }) =>
  sketch
    .ellipse(CX, CY, r, r, { color: RAIL, weight: "bold", looseness: 0 }, 48)
    // Concentric rings of similar size are the textbook intentional overlap: every rail's bbox
    // sits wholly inside the next one's, and the size heuristic can't tell that from a collision.
    .lintIgnore("overlap")
);
rails.forEach((rail) => scene.add(rail));
drawIn(rails, { from: 0.3, to: 2.0, each: 0.55 });

// --- The beads. Each ring's beads live in ONE group built symmetrically about (CX, CY) — an
// even count, opposite pairs — so the group's own bbox centre IS the common centre and `spin`
// turns them about it with nothing else to configure. An odd count (three beads at 120
// degrees) puts the bbox centre off to one side and the whole ring would visibly orbit
// something that isn't there.
RINGS.forEach(({ r, beads, bead, color, turns }, ringIndex) => {
  const group = sketch.group();
  for (let i = 0; i < beads; i++) {
    // Each ring starts at a different angle so the beads read as unrelated bodies rather than
    // one radial comb; the whole-number turn counts (5, 3, 2, 1) are what make them drift out
    // of alignment and back into it exactly once per loop.
    const a = (i / beads) * Math.PI * 2 + ringIndex * 0.55;
    group.add(
      sketch.ellipse(CX + Math.cos(a) * r, CY + Math.sin(a) * r, bead, bead, {
        color: EDGE,
        weight: "confident",
        looseness: 0,
        fill: { color, style: "solid" },
      }, 20).lintIgnore("overlap")
    );
  }
  scene.add(group);
  // Beads pop in rather than draw: at this size a drawOn on a 12px disc is a flicker, and the
  // rails already carried the "one hand drawing this" beat.
  appearIn(group.children, { from: 1.5 + ringIndex * 0.12, to: 2.2 + ringIndex * 0.12, each: 0.35 });
  // The pivot is the same point the symmetric layout already puts the bbox centre on, and it
  // is not redundant: measured against this renderer, a rotation with no explicit pivot turns
  // about the SVG's own origin, so every bead orbits the top-left corner and leaves the frame.
  group.pivotAt(CX, CY);
  spin(group, turns);
});

// --- The hub. It gets the loop's only non-rotational motion, three beats of it, so the centre
// of the frame has a pulse of its own instead of being the one dead spot in a turning machine.
const hub = sketch.ellipse(CX, CY, 28, 28, {
  color: EDGE,
  weight: "bold",
  looseness: 0,
  fill: { color: OCHRE, style: "solid" },
}, 28);
scene.add(hub).lintIgnore("overlap").drawOn({ at: 2.2, duration: 0.4 });
// Same reason as the bead groups: a scaleTo with no pivot scales about the SVG origin, which
// walks the hub down the diagonal instead of swelling it in place.
hub.pivotAt(CX, CY);
pulseScale(hub, 1.16, 3);

// A halo just outside the hub, breathing on the same three beats but through opacity — a
// second scaleTo on the hub itself would be two tweens fighting over the same axis.
const halo = sketch.ellipse(CX, CY, 39, 39, { color: OCHRE, weight: "confident", looseness: 0 }, 32);
scene.add(halo).lintIgnore("overlap").drawOn({ at: 2.5, duration: 0.3 });
pulseFade(halo, 0.75, 0.15, 3);

export default scene;
