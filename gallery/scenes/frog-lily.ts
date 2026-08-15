import { sketch } from "../../src/index.js";
import { LOOP_START, appearIn, blink, drawIn, pulseSquash, ripple, swayRotate } from "../lib.js";

// A frog sitting front-on on a lily pad, croaking — its throat pouch inflating as the pad rocks.

// look: "flat" — a ligne-claire register, which is what a graphic, front-on, almost-symmetrical
// creature wants: no boil, no wobble, just shape. Every blob and ellipse in here is
// looseness: 0 for the same reason (a blob bakes its wobble into the authored points, so the
// look alone can't undo it).
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#79b6bc" },
      { offset: 0.6, color: "#4a8e9a" },
      { offset: 1, color: "#2c6472" },
    ],
  },
  seed: "frog-lily",
  look: "flat",
});

const INK = "#20301b";
const SKIN = "#8cc24c";
const THROAT = "#dbe98a";
const PADGREEN = "#3f7f3a";
const GOLD = "#f0c33a";

// --- Water first: three surface lines and two distant pads, so the near pad is floating on
// something rather than pasted onto a flat teal card.
const surface = [
  sketch.stroke([[52, 138], [130, 132], [206, 140]], { color: "#8fc9cd", weight: "light", looseness: 0 }),
  sketch.stroke([[286, 108], [352, 114], [424, 106]], { color: "#8fc9cd", weight: "light", looseness: 0 }),
  sketch.stroke([[40, 214], [116, 206], [188, 216]], { color: "#7ebcc4", weight: "light", looseness: 0 }),
  sketch.stroke([[300, 196], [376, 190], [442, 200]], { color: "#7ebcc4", weight: "light", looseness: 0 }),
];
surface.forEach((s) => scene.add(s));
appearIn(surface, { from: 0, to: 0.7, each: 0.35 });

/** A lily pad: a disc with one wedge cut out of it, the notch that says "lily pad" and not
 * "green coin". The two straight edges of the cut want sharp corners, hence smooth: false at
 * every call site. */
function padPoints(cx: number, cy: number, rx: number, ry: number, notchDeg: number): [number, number][] {
  const pts: [number, number][] = [];
  const gap = 34;
  for (let i = 0; i <= 22; i++) {
    const a = ((notchDeg + gap / 2 + (i / 22) * (360 - gap)) * Math.PI) / 180;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  // The notch stops well short of the centre — cut all the way in and a flattened,
  // perspective-squashed disc reads as a pac-man wedge instead of a leaf.
  const a0 = (notchDeg * Math.PI) / 180;
  pts.push([cx + rx * 0.3 * Math.cos(a0), cy + ry * 0.3 * Math.sin(a0)]);
  return pts;
}

const farPads = [
  sketch.loop(padPoints(92, 246, 52, 18, 210), { color: "#2f5f34", weight: "light", looseness: 0, fill: { color: "#4a8a44", style: "solid" } }),
  sketch.loop(padPoints(398, 208, 42, 15, 340), { color: "#2f5f34", weight: "light", looseness: 0, fill: { color: "#478541", style: "solid" } }),
];
farPads.forEach((p) => scene.add(p));
drawIn(farPads, { from: 0.5, to: 1.1, each: 0.4 });

// --- The raft: pad and frog in ONE group, so the rock at the end of the file tips the whole
// thing together. A pad that rocked under a frog bolted to the canvas would read as two
// separate drawings, not as one animal on one floating leaf.
const raft = sketch.group();

// Notch turned to the lower right: at the bottom of the disc the frog's own haunches sit over
// it and the pad loses the one cut that identifies it.
const pad = sketch.loop(padPoints(240, 384, 156, 48, 26), {
  color: "#20431d",
  weight: "bold",
  looseness: 0,
  fill: { color: sketch.shade(PADGREEN, { from: "top", amount: 0.3 }), style: "solid" },
  smooth: false,
});
raft.add(pad);
// Veins radiating from the notch, the pad's own drawing rather than a plain filled disc.
const veins = ([200, 232, 300, 336, 80, 120] as number[]).map((deg) => {
  const a = (deg * Math.PI) / 180;
  return sketch.stroke([[240, 384], [240 + 148 * Math.cos(a), 384 + 44 * Math.sin(a)]], {
    color: "#2f6b2c", weight: "light", looseness: 0,
  }).lintIgnore("overlap");
});
veins.forEach((v) => raft.add(v));

// --- Hind legs go down FIRST, so the body silhouette closes over them and the thighs read as
// tucked behind the flanks rather than stuck on top of them.
const hindLegs = [
  sketch.loop([[186, 330], [148, 336], [128, 358], [146, 374], [190, 370], [200, 344]], {
    color: INK, weight: "confident", looseness: 0, fill: { color: "#74a83f", style: "solid" },
  }),
  sketch.loop([[294, 330], [332, 336], [352, 358], [334, 374], [290, 370], [280, 344]], {
    color: INK, weight: "confident", looseness: 0, fill: { color: "#74a83f", style: "solid" },
  }),
];
hindLegs.forEach((l) => raft.add(l.lintIgnore("overlap")));

// --- The body. Front-on, a frog is one wide dome from crown to belly — there is no neck to
// draw, and giving it one is what makes a cartoon frog read as a lizard instead.
const body = sketch.loop(
  [
    [156, 342],
    [158, 298],
    [176, 262],
    [208, 242],
    [240, 236],
    [272, 242],
    [304, 262],
    [322, 298],
    [324, 342],
    [282, 358],
    [240, 362],
    [198, 358],
  ],
  { color: INK, weight: "bold", looseness: 0, fill: { color: sketch.shade(SKIN, { from: "top", amount: 0.3 }), style: "solid" } }
);
raft.add(body.lintIgnore("overlap"));

// Two dark dorsal blotches — a frog's back is never one flat green.
const spots = [
  sketch.blob(196, 296, 15, { color: "#5f8f33", weight: "light", looseness: 0, fill: { color: "#6ba03a", style: "solid" } }, 10),
  sketch.blob(288, 292, 13, { color: "#5f8f33", weight: "light", looseness: 0, fill: { color: "#6ba03a", style: "solid" } }, 10),
];
spots.forEach((s) => raft.add(s.lintIgnore("overlap")));

// --- Throat pouch: the event of the loop, so it gets the biggest shape budget on the frog
// after the eyes. Authored as the deflated pose and pivoted at the jawline, so inflating it
// balloons downward and outward from where a real vocal sac is anchored.
const throat = sketch.loop(
  [[196, 324], [240, 338], [284, 324], [294, 348], [240, 368], [186, 348]],
  { color: "#77913a", weight: "confident", looseness: 0, fill: { color: THROAT, style: "solid" } }
);
raft.add(throat.lintIgnore("overlap"));

// The mouth goes on AFTER the throat, so the pouch always reads as hanging below the jaw line
// no matter how far it is inflated.
const mouth = sketch.stroke([[168, 306], [204, 330], [240, 337], [276, 330], [312, 306]], {
  color: INK, weight: "bold", looseness: 0,
});
raft.add(mouth.lintIgnore("overlap"));

const nostrils = [
  sketch.ellipse(224, 288, 5, 4, { color: INK, weight: "light", looseness: 0, fill: { color: "#3d5a2a", style: "solid" } }, 10),
  sketch.ellipse(256, 288, 5, 4, { color: INK, weight: "light", looseness: 0, fill: { color: "#3d5a2a", style: "solid" } }, 10),
];
nostrils.forEach((n) => raft.add(n.lintIgnore("overlap")));

// --- Eyes: domes straddling the crown line so they bulge above the silhouette, which is the
// single most frog-shaped thing in the drawing. The green lid dome stays put; only the iris
// group blinks, so a closed eye reads as a bare dome instead of a flattened lump.
const irises = sketch.group();
const domes: ReturnType<typeof sketch.ellipse>[] = [];
for (const ex of [193, 287]) {
  const dome = sketch.ellipse(ex, 252, 28, 26, {
    color: INK, weight: "bold", looseness: 0, fill: { color: "#7bb03f", style: "solid" },
  }, 24);
  domes.push(dome.lintIgnore("overlap"));
  raft.add(dome);
  irises.add(sketch.ellipse(ex, 250, 17, 16, { color: "#8a6a1a", weight: "confident", looseness: 0, fill: { color: GOLD, style: "solid" } }, 20).lintIgnore("overlap"));
  irises.add(sketch.ellipse(ex, 251, 8, 9, { color: "#16110c", weight: "light", looseness: 0, fill: { color: "#171208", style: "solid" } }, 16).lintIgnore("overlap"));
  irises.add(sketch.ellipse(ex - 5, 244, 4, 4, { color: "#ffffff", weight: "light", looseness: 0, fill: { color: "#ffffff", style: "solid" } }, 10).lintIgnore("overlap"));
}
raft.add(irises);

// --- Front feet, painted last of the frog so the toes sit over the pad. Pushed right out to
// the flanks on purpose: drawn where a forelimb anatomically belongs — under the chest — they
// covered the throat pouch, and the throat is the whole point of this loop.
const feet: ReturnType<typeof sketch.stroke>[] = [];
for (const [fx, dir] of [[178, -1], [302, 1]] as [number, number][]) {
  feet.push(
    sketch.loop(
      [[fx + dir * 10, 336], [fx + dir * 12, 360], [fx + dir * 6, 374], [fx - dir * 8, 372], [fx - dir * 12, 354], [fx - dir * 6, 336]],
      { color: INK, weight: "confident", looseness: 0, fill: { color: "#7fb244", style: "solid" } }
    ).lintIgnore("overlap")
  );
  for (const t of [-11, 0, 11]) {
    feet.push(
      sketch.stroke([[fx + dir * 2, 370], [fx + dir * 2 + t, 384]], { color: INK, weight: "confident", looseness: 0 }).lintIgnore("overlap")
    );
  }
}
feet.forEach((f) => raft.add(f));

scene.add(raft);

// --- Reveal: pad, then the frog built up from the legs outward, face last. Faces read as the
// moment a drawing comes alive, so they should be the last thing that lands.
pad.drawOn({ at: 1.0, duration: 0.7 });
appearIn(veins, { from: 1.5, to: 1.75, each: 0.2 });
drawIn(hindLegs, { from: 1.6, to: 1.95, each: 0.3 });
body.drawOn({ at: 1.9, duration: 0.55 });
appearIn(spots, { from: 2.3, to: 2.45, each: 0.2 });
throat.drawOn({ at: 2.3, duration: 0.3 });
mouth.drawOn({ at: 2.5, duration: 0.28 });
appearIn(nostrils, { from: 2.6, to: 2.7, each: 0.15 });
drawIn(domes, { from: 2.4, to: 2.7, each: 0.25 });
appearIn(irises.children, { from: 2.65, to: 2.85, each: 0.18 });
appearIn(feet, { from: 2.5, to: 2.8, each: 0.2 });

// --- The croak: three inflations across the window, each a third of a beat's worth of pause.
// This is the one motion in the scene allowed to be big — everything else is idle.
throat.pivotAt(240, 332);
pulseSquash(throat, 1.12, 1.34, 3);

// One blink, tucked between the second and third croak so it doesn't compete with either. The
// pivot is load-bearing: with none set, a group's squash resolves its origin from a bbox that
// isn't the one on screen, and the irises slide clean out of the domes. Pinned to the eyeline,
// they close inside them.
irises.pivotAt(240, 250);
blink(irises, LOOP_START + 1.95);

// --- The rock: 1.5 degrees, pivoted below the pad at the waterline, which is where a floating
// leaf actually hinges. Any more than this and the frog looks like it is on a boat.
raft.pivotAt(240, 404);
swayRotate(raft, 1.5, 2);

// Two ripples spreading off the pad's edge, out of phase, so the water is doing something
// while the frog holds still.
const r1 = sketch.ellipse(120, 330, 26, 9, { color: "#b7dde0", weight: "light", looseness: 0 });
scene.add(r1).lintIgnore("overlap");
ripple(r1, 2.0, 2, 0.5);

const r2 = sketch.ellipse(366, 300, 20, 7, { color: "#c6e4e6", weight: "light", looseness: 0 });
scene.add(r2).lintIgnore("overlap");
ripple(r2, 2.3, 3, 0.42);

export default scene;
