import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, spin, swayRotate } from "../lib.js";

// A parked bicycle whose front wheel is still spinning from being flicked, basket flowers nodding.

// look: "flat" — crisp ligne-claire lines, no jitter and no boil, which is the register a
// machine made of true circles and straight tubes actually wants. Every blob in here is
// looseness: 0 for the same reason (a blob's authored wobble is baked into its points, not
// added at render time, so a "flat" scene still has to ask for precision explicitly).
const scene = sketch.scene({ width: 480, height: 480, background: "#f4efe3", seed: "bicycle", look: "flat" });

const INK = "#26221d";
const TEAL = "#2f7d76";
const GROUND_Y = 392;

// --- Frame geometry, named once. Authored as the real diamond a bicycle actually is — the
// first pass eyeballed the tubes and rendered as a truss with an X through the rear wheel,
// which is exactly what happens when you place tube endpoints instead of joints.
const R = 62; // wheel radius; both hubs sit R above the ground line
const RH: [number, number] = [136, GROUND_Y - R]; // rear hub
const FH: [number, number] = [356, GROUND_Y - R]; // front hub
const BB: [number, number] = [240, 332]; // bottom bracket
const SC: [number, number] = [196, 234]; // seat cluster (top of seat tube)
const HT: [number, number] = [306, 230]; // head tube, top
const HB: [number, number] = [296, 260]; // head tube, bottom

// --- Ground: one line plus a soft contact shadow, so the bike stands on something.
scene.add(
  sketch.stroke([[36, GROUND_Y], [444, GROUND_Y]], { color: "#b7ad97", weight: "confident", looseness: 0 })
).drawOn({ at: 0, duration: 0.6 });
scene.add(
  sketch.ellipse(246, GROUND_Y + 6, 152, 11, { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#dcd4c0", style: "solid" } })
).lintIgnore("overlap").drawOn({ at: 0.25, duration: 0.5 });

// --- Wheels. Each is a group of rim + tyre + spokes + hub all centred on the same point, so
// the group's own bbox centre IS the axle and `spin` turns it about the hub with nothing to
// configure. (Anything asymmetric in here would make the wheel orbit instead of rotate.)
function wheel(cx: number, cy: number) {
  const g = sketch.group();
  g.add(sketch.ellipse(cx, cy, R, R, { color: INK, weight: "bold", looseness: 0 }, 32));
  g.add(sketch.ellipse(cx, cy, R - 8, R - 8, { color: "#8a8375", weight: "light", looseness: 0 }, 32).lintIgnore("overlap"));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
    g.add(
      sketch.stroke(
        [
          [cx + Math.cos(a) * 7, cy + Math.sin(a) * 7],
          [cx + Math.cos(a) * (R - 7), cy + Math.sin(a) * (R - 7)],
        ],
        { color: "#6f6a5e", weight: "light", looseness: 0 }
      ).lintIgnore("overlap")
    );
  }
  g.add(sketch.ellipse(cx, cy, 8, 8, { color: INK, weight: "confident", looseness: 0, fill: { color: "#c9c0aa", style: "solid" } }, 16).lintIgnore("overlap"));
  return g;
}

const rear = wheel(...RH);
const front = wheel(...FH);
scene.add(rear);
scene.add(front);
// Each wheel draws as one fast sweep rather than twenty separate beats — a wheel is one object.
rear.stagger(0.04, { at: 0.4, duration: 0.45 });
front.stagger(0.04, { at: 0.95, duration: 0.45 });

// --- The diamond: chain stay, seat tube, seat stay, down tube, top tube, head tube, fork.
const tubes: [number, number][][] = [
  [BB, RH],
  [BB, SC],
  [SC, RH],
  [BB, HB],
  [SC, HT],
  [HT, HB],
  [HB, FH],
  [SC, [192, 214]], // seat post
  [HT, [320, 216]], // stem
];
const tubeNodes = tubes.map((pts) =>
  sketch.stroke(pts, { color: TEAL, weight: "bold", looseness: 0, smooth: false })
);
tubeNodes.forEach((t) => scene.add(t).lintIgnore("overlap"));
drawIn(tubeNodes, { from: 1.35, to: 2.25, each: 0.26 });

// --- Saddle, bar, chainring: the three shapes that turn a diagram of tubes into a bicycle.
const saddle = sketch.loop(
  [[168, 210], [212, 206], [216, 216], [172, 220]],
  { color: INK, weight: "confident", looseness: 0, fill: { color: "#4a3a2c", style: "solid" } }
);
scene.add(saddle).lintIgnore("overlap");
// Swept-back city bar: up off the stem, then back toward the rider, ending in a grip. Held
// clear above the basket's rim on purpose — drawn at the basket's own height it disappeared
// behind it and the bike lost its handlebars entirely.
const bar = sketch.stroke([[320, 214], [342, 196], [364, 192]], { color: INK, weight: "bold", looseness: 0 });
scene.add(bar);
const grip = sketch.stroke([[364, 192], [382, 190]], { color: "#8a5f33", weight: 7, looseness: 0 });
scene.add(grip);
const chainring = sketch.ellipse(BB[0], BB[1], 15, 15, { color: INK, weight: "confident", looseness: 0, fill: { color: "#b9b1a0", style: "solid" } }, 18);
scene.add(chainring).lintIgnore("overlap");
const crank = sketch.stroke([[BB[0], BB[1]], [BB[0] + 12, BB[1] + 22]], { color: INK, weight: "confident", looseness: 0 });
scene.add(crank).lintIgnore("overlap");
const pedal = sketch.stroke([[BB[0] + 4, BB[1] + 26], [BB[0] + 24, BB[1] + 22]], { color: INK, weight: 5, looseness: 0 });
scene.add(pedal).lintIgnore("overlap");
// Chain: a slack line from the chainring back to the rear hub and along the top.
const chain = sketch.stroke([[BB[0] - 12, BB[1] + 4], [RH[0] + 20, RH[1] + 12], [RH[0], RH[1]]], { color: "#7a746a", weight: "light", looseness: 0 });
scene.add(chain).lintIgnore("overlap");
drawIn([saddle, bar, grip, chainring, crank, pedal, chain], { from: 2.1, to: 2.6, each: 0.2 });

// --- Basket hung off the bar, in front of the head tube where a real one sits.
const basket = sketch.loop(
  [[318, 222], [380, 222], [372, 262], [326, 262]],
  { color: "#8a5f33", weight: "confident", looseness: 0, fill: { color: "#c99655", style: "solid" }, smooth: false }
);
scene.add(basket).lintIgnore("overlap").drawOn({ at: 2.45, duration: 0.3 });
scene.add(
  sketch.stroke([[320, 236], [377, 236]], { color: "#8a5f33", weight: "light", looseness: 0 })
).lintIgnore("overlap").drawOn({ at: 2.65, duration: 0.15 });
scene.add(
  sketch.stroke([[322, 249], [375, 249]], { color: "#8a5f33", weight: "light", looseness: 0 })
).lintIgnore("overlap").drawOn({ at: 2.72, duration: 0.15 });

// Three flowers, the only warm notes in the frame. Each bloom and its own stem live in one
// group pivoted where the stem meets the basket rim — a flower nods from where it's held, not
// around the middle of its own bounding box.
([
  [330, 222, 318, 178, "#e4695f"],
  [348, 222, 350, 162, "#f0b64a"],
  [366, 222, 382, 184, "#d98ab4"],
] as [number, number, number, number, string][]).forEach(([bx, by, tx, ty, petalColor], i) => {
  const stem = sketch.stroke([[bx, by], [(bx + tx) / 2 - 5, (by + ty) / 2], [tx, ty]], {
    color: "#4f7a3c",
    weight: "confident",
    looseness: 0,
  });
  const bloom = sketch.group();
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
    bloom.add(
      sketch.blob(tx + Math.cos(a) * 10, ty + Math.sin(a) * 10, 9, {
        color: petalColor,
        weight: "light",
        looseness: 0,
        fill: { color: petalColor, style: "solid" },
      }, 10).lintIgnore("overlap")
    );
  }
  bloom.add(sketch.ellipse(tx, ty, 6, 6, { color: "#8a5a2a", weight: "light", looseness: 0, fill: { color: "#f6e3b0", style: "solid" } }, 12).lintIgnore("overlap"));
  const whole = sketch.group([stem, bloom]);
  scene.add(whole);
  stem.drawOn({ at: 2.5 + i * 0.1, duration: 0.25 });
  bloom.stagger(0.05, { at: 2.65 + i * 0.1, duration: 0.3, effect: "appear" });
  whole.pivotAt(bx, by);
  swayRotate(whole, 2.5 + i * 0.8, i === 1 ? 3 : 2);
});

// --- The loop's event: the front wheel, still turning from a flick, plus a leaf tumbling
// past it. Two turns across the window reads as "slowing, not stopped"; the rear wheel's
// quarter-turn is the drivetrain being dragged along by the chain.
spin(front, 2);
spin(rear, 0.25);

const leaf = sketch.loop(
  [[420, 128], [432, 137], [426, 156], [413, 147]],
  { color: "#8a6a34", weight: "light", looseness: 0, fill: { color: "#c69a4a", style: "solid" } }
);
scene.add(leaf);
driftOnce(leaf, -38, 236, beats(2)[1], { ease: "sine.in", peak: 0.95 });

export default scene;
