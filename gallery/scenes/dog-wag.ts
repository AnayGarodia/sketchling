import { sketch } from "../../src/index.js";
import { LOOP_START, appearIn, blink, drawIn, pulseSquash, swayRotate } from "../lib.js";

// A scruffy tan dog sitting three-quarter on, tongue out, wagging hard while it breathes and blinks.

const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#71879a" },
      { offset: 0.7, color: "#93a6ae" },
      { offset: 1, color: "#a8b6ba" },
    ],
  },
  seed: "dog-wag",
  look: "ink",
});

const INK = "#2c2118";
const FUR = "#cd9350";
const FUR_DARK = "#a06f35";
const CREAM = "#f2e0c0";
const FLOOR_Y = 386;

// --- Floor first. A cool grey wall against a warm floor gives the dog somewhere to be, and
// puts the one warm/cool boundary in the frame behind the warmest thing in it.
const floor = sketch.loop(
  [[0, FLOOR_Y], [140, FLOOR_Y - 6], [300, FLOOR_Y - 2], [480, FLOOR_Y - 10], [480, 480], [0, 480]],
  { color: "#a3854f", weight: "bold", looseness: 0.18, fill: { color: sketch.shade("#d8c298", { from: "top", amount: 0.26 }), style: "solid" } }
);
scene.add(floor).drawOn({ at: 0, duration: 0.8 });

const contact = sketch.ellipse(224, 394, 132, 15, { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#b9a077", style: "solid" } });
scene.add(contact).lintIgnore("overlap").drawOn({ at: 0.6, duration: 0.4 });

// --- The tail goes in FIRST, before any of the body, so the rump's silhouette closes over its
// root. It is the loudest thing in the loop and it still has to look attached.
//
// It is authored pointing LEFT and only 35 degrees up, not up-left at 57 degrees as it started
// out: swung to the top of its arc from that steeper rest pose, two thirds of its length ended
// up hidden behind the haunch and the wag read as the tail vanishing rather than sweeping. From
// here both extremes of the swing clear the body's own silhouette by about the same amount.
const tail = sketch.loop(
  [[139, 298], [123, 322], [77, 285], [27, 255], [41, 233], [89, 269]],
  { color: INK, weight: "bold", looseness: 0.24, fill: { color: sketch.shade(FUR_DARK, { from: "top", amount: 0.28 }), style: "solid" } }
);
scene.add(tail).drawOn({ at: 0.9, duration: 0.5 });

// --- Everything that breathes goes in ONE group, head included: a chest that swelled while the
// head held still would tear a gap open at the neck, however deep the overlap.
const torso = sketch.group();

const rump = sketch.blob(174, 300, 64, {
  color: INK, weight: "bold", looseness: 0.2, fill: { color: sketch.shade(FUR, { from: "top", amount: 0.3 }), style: "solid" },
}, 13);
torso.add(rump.lintIgnore("overlap"));

// Chest, rising from the haunch to the shoulders. Its top edge deliberately runs 24px higher
// than the head's own bottom, so the two shapes interlock instead of butting together.
const chest = sketch.loop(
  [[204, 262], [234, 226], [286, 216], [310, 240], [314, 300], [298, 352], [244, 368], [202, 336], [190, 290]],
  { color: INK, weight: "bold", looseness: 0.2, fill: { color: sketch.shade(FUR, { from: "top", amount: 0.3 }), style: "solid" } }
);
torso.add(chest.lintIgnore("overlap"));

// Hind paw peeking out from under the haunch — the detail that says "sitting" rather than
// "standing behind something".
const hindPaw = sketch.loop(
  [[196, 348], [232, 344], [246, 362], [238, 376], [200, 376], [188, 362]],
  { color: "#8a5d2b", weight: "confident", looseness: 0.2, fill: { color: CREAM, style: "solid" } }
);
torso.add(hindPaw.lintIgnore("overlap"));

// Forelegs, the far one first so the near one overlaps it.
const legs = ([[238, 8], [270, 11]] as [number, number][]).map(([lx, w], i) =>
  sketch.loop(
    [[lx - w, 316], [lx + w, 314], [lx + w + 2, 384], [lx - w - 2, 386]],
    { color: INK, weight: i === 0 ? "confident" : "bold", looseness: 0.2, fill: { color: sketch.shade(i === 0 ? FUR_DARK : FUR, { from: "top", amount: 0.24 }), style: "solid" } }
  ).lintIgnore("overlap")
);
legs.forEach((l) => torso.add(l));
const paws = ([238, 270] as number[]).map((px) =>
  sketch.loop(
    [[px - 15, 372], [px + 15, 372], [px + 18, 390], [px - 18, 390]],
    { color: "#8a5d2b", weight: "confident", looseness: 0.2, fill: { color: CREAM, style: "solid" } }
  ).lintIgnore("overlap")
);
paws.forEach((p) => torso.add(p));

// --- Head. Its own group inside the torso, so the tilt is a local rotation that composes with
// the breath instead of fighting it, and the face rides along with both.
const headGroup = sketch.group();
const head = sketch.blob(306, 190, 50, {
  color: INK, weight: "bold", looseness: 0.18, fill: { color: sketch.shade(FUR, { from: "top", amount: 0.26 }), style: "solid" },
}, 13);
headGroup.add(head.lintIgnore("overlap"));

// One ear up, one down — the whole "scruffy mutt" read in two shapes. The pricked one is a wedge
// (smooth:false, or the point rounds off into a bear's ear); the flopped one is a soft lobe.
const earUp = sketch.loop([[300, 142], [346, 98], [340, 160]], {
  color: INK, weight: "confident", looseness: 0.2, fill: { color: sketch.shade(FUR_DARK, { from: "top", amount: 0.3 }), style: "solid" }, smooth: false,
});
const earDown = sketch.loop([[278, 156], [252, 168], [244, 214], [264, 228], [282, 198]], {
  color: INK, weight: "confident", looseness: 0.24, fill: { color: sketch.shade(FUR_DARK, { from: "top", amount: 0.3 }), style: "solid" },
});
headGroup.add(earUp.lintIgnore("overlap"));
headGroup.add(earDown.lintIgnore("overlap"));

// Muzzle, then the nose on top of it, then the tongue below — three shapes stacked front to
// back, so nothing has to be clipped to sit right.
const muzzle = sketch.blob(346, 214, 28, {
  color: "#8a5d2b", weight: "confident", looseness: 0.2, fill: { color: CREAM, style: "solid" },
}, 12);
headGroup.add(muzzle.lintIgnore("overlap"));

const tongue = sketch.loop(
  [[338, 232], [356, 232], [354, 258], [344, 266], [334, 250]],
  { color: "#a8434f", weight: "confident", looseness: 0.22, fill: { color: "#e0808b", style: "solid" } }
);
headGroup.add(tongue.lintIgnore("overlap"));

// The lip line goes on AFTER the tongue, capping it: without it the tongue reads as a pink blob
// stuck to the side of the head rather than as something coming out of a mouth.
const lip = sketch.stroke([[328, 226], [346, 236], [364, 228]], { color: INK, weight: "bold", looseness: 0.2 });
headGroup.add(lip.lintIgnore("overlap"));

const nose = sketch.blob(364, 204, 12, {
  color: "#1e1712", weight: "confident", looseness: 0.18, fill: { color: "#241c16", style: "solid" },
}, 10);
headGroup.add(nose.lintIgnore("overlap"));

// --- Eyes. Their own group so the blink squashes only these; sized and spaced before anything
// else went on the face, because nothing else can rescue them if they are wrong.
const eyes = sketch.group();
([[298, 178], [334, 174]] as [number, number][]).forEach(([ex, ey]) => {
  eyes.add(sketch.ellipse(ex, ey, 13, 13, { color: INK, weight: "confident", looseness: 0, fill: { color: "#c98f45", style: "solid" } }, 18).lintIgnore("overlap"));
  eyes.add(sketch.ellipse(ex + 2, ey + 1, 7, 8, { color: "#1a130e", weight: "light", looseness: 0, fill: { color: "#1d1610", style: "solid" } }, 14).lintIgnore("overlap"));
  eyes.add(sketch.ellipse(ex - 3, ey - 5, 4, 4, { color: "#ffffff", weight: "light", looseness: 0, fill: { color: "#ffffff", style: "solid" } }, 10).lintIgnore("overlap"));
});
headGroup.add(eyes);

// Brows: two short strokes, the cheapest expression in the whole library.
([[286, 158, 306, 154], [324, 154, 344, 158]] as [number, number, number, number][]).forEach(([x1, y1, x2, y2]) => {
  headGroup.add(sketch.stroke([[x1, y1], [x2, y2]], { color: "#7a5228", weight: "confident", looseness: 0.3 }).lintIgnore("overlap"));
});

torso.add(headGroup);

// Collar last of all, painted over both neck and chin, so it reads as sitting on the neck
// rather than buried under the jaw. The one saturated colour in the frame.
const collar = sketch.loop(
  [[272, 236], [316, 246], [312, 264], [268, 254]],
  { color: "#7e2b26", weight: "bold", looseness: 0.18, fill: { color: "#bf4a3f", style: "solid" } }
);
torso.add(collar.lintIgnore("overlap"));
const tag = sketch.ellipse(292, 266, 8, 8, { color: "#8a6a1a", weight: "confident", looseness: 0, fill: { color: "#e8bd4a", style: "solid" } }, 12);
torso.add(tag.lintIgnore("overlap"));

// Scruff: six stray tufts poking out of the silhouette. Without them a filled tan blob reads as
// a smooth short-haired dog, which this one is not.
const scruff = ([
  [146, 246, 138, 228],
  [176, 238, 180, 218],
  [206, 232, 204, 212],
  [264, 150, 252, 142],
  [284, 142, 278, 128],
  [128, 288, 106, 282],
] as [number, number, number, number][]).map(([x1, y1, x2, y2]) =>
  sketch.stroke([[x1, y1], [x2, y2]], { color: "#8a5d2b", weight: "confident", looseness: 0.35 }).lintIgnore("overlap")
);
scruff.forEach((s) => torso.add(s));

scene.add(torso);

// --- Reveal: haunch, chest, legs, then the face last. A face landing last is what makes the
// drawing look like it comes alive rather than being assembled.
drawIn([rump, chest], { from: 1.2, to: 1.9, each: 0.45 });
drawIn([hindPaw, ...legs, ...paws], { from: 1.7, to: 2.2, each: 0.22 });
head.drawOn({ at: 2.05, duration: 0.4 });
drawIn([earUp, earDown], { from: 2.3, to: 2.55, each: 0.22 });
drawIn([muzzle, tongue, lip, nose], { from: 2.4, to: 2.78, each: 0.18 });
// `to: 2.85` here put the last of six staggered children 8ms past LOOP_START — enough for the
// loop's first frame to hold a not-quite-opaque catchlight while its last frame holds a full
// one. Invisible to the eye, caught by check-loop.sh. Everything lands by 2.96.
appearIn(eyes.children, { from: 2.55, to: 2.8, each: 0.2 });
appearIn(headGroup.children.slice(-2), { from: 2.7, to: 2.8, each: 0.15 });
drawIn([collar, tag], { from: 2.6, to: 2.85, each: 0.2 });
appearIn(scruff, { from: 2.5, to: 2.85, each: 0.2 });

// --- The wag: six full sweeps across the window, 32 degrees of travel, pivoted where the tail
// leaves the haunch. This is the event of the loop, so it is the one gesture allowed to be both
// big and fast — everything else in the dog is idle by comparison.
tail.pivotAt(134, 312);
swayRotate(tail, 16, 6);

// The breath: 2.8% on the vertical only, pivoted at the floor between the front paws, so the
// dog presses down into the ground rather than floating off it.
torso.pivotAt(252, 390);
pulseSquash(torso, 1.01, 1.028, 2);

// The head tilt: four degrees, pivoted at the base of the neck rather than the skull's own
// middle. That one pivot is the difference between a dog cocking its head and a head rolling.
headGroup.pivotAt(296, 250);
swayRotate(headGroup, 4, 2);

// Two blinks, unevenly spaced so they don't read as a metronome. The pivot on the eye group is
// load-bearing: with none set, a group's squash resolves its origin from a bbox that isn't the
// one on screen and the lids slide off the face instead of closing.
eyes.pivotAt(316, 176);
blink(eyes, LOOP_START + 0.6);
blink(eyes, LOOP_START + 2.35);

// --- A ball left on the floor, out at the right. Nothing animates it: it is there to balance a
// composition whose dog sits well left of centre, and to give the frame a second red note.
const ball = sketch.blob(414, 366, 24, {
  color: "#7e2b26", weight: "bold", looseness: 0.2, fill: { color: sketch.shade("#c4544a", { from: "top", amount: 0.34 }), style: "solid" },
}, 14);
scene.add(ball).lintIgnore("overlap").drawOn({ at: 2.3, duration: 0.4 });
scene.add(
  sketch.stroke([[394, 356], [412, 348], [432, 358]], { color: "#f0e0c8", weight: "confident", looseness: 0.2 })
).lintIgnore("overlap").drawOn({ at: 2.7, duration: 0.25 });

export default scene;
