import { sketch } from "../../src/index.js";
import { drawIn, pulseFade, pulseScale, swayRotate } from "../lib.js";

// A brass notification bell ringing on its mount, clapper counter-swinging, badge dot pulsing.

// look: "ink" on plain paper — no card, no device, no ground. The whole frame is one object doing
// one thing, so anything else in it would only dilute the event.
const scene = sketch.scene({ width: 480, height: 480, background: "#f3ead6", seed: "notification-bell", look: "ink" });

const INK = "#2b2016";
const BRASS = "#dfa63c";
const BRASS_DARK = "#b3762a";
const RED = "#c9463a";

// The mount, and the point everything hangs from. A bell swings about where it is held, not about
// the middle of its own silhouette, so this one coordinate is the scene.
const PIVOT_X = 240;
const PIVOT_Y = 118;

// --- The headstock: a beam across the top of frame, static, so the swing below it has something
// to be measured against. Without it the bell reads as floating and the rotation reads as a wobble.
const beam = sketch.stroke([[184, 116], [296, 116]], { color: INK, weight: 9, looseness: 0.14 });
scene.add(beam);

// --- The bell itself: crown, body, lip and badge in one group, because all four have to swing
// together. The body is smooth (a bell is a curve); the lip is smooth: false and cut as a
// trapezoid flaring outward — as a plain rectangle it read, under a tilted bell, as a see-saw
// plank with a ball on one end.
const bell = sketch.group();
const crown = sketch.ellipse(PIVOT_X, 132, 15, 13, { color: INK, weight: "confident", looseness: 0.14, fill: { color: BRASS_DARK, style: "solid" } }, 18);
bell.add(crown);

const body = sketch.loop(
  [
    [240, 140], [282, 153], [306, 198], [318, 258], [330, 296], [324, 314],
    [156, 314], [150, 296], [162, 258], [174, 198], [198, 153],
  ],
  { color: INK, weight: "bold", looseness: 0.13, fill: { color: sketch.shade(BRASS, { from: "left", amount: 0.32 }), style: "solid" } }
);
bell.add(body.lintIgnore("overlap"));

const lip = sketch.loop(
  [[150, 296], [330, 296], [342, 320], [138, 320]],
  { color: INK, weight: "bold", looseness: 0.13, smooth: false, fill: { color: BRASS_DARK, style: "solid" } }
);
bell.add(lip.lintIgnore("overlap"));

// The badge: one flat red disc on the shoulder, deliberately with no numeral in it — this
// alphabet's "1" at badge scale is a single hairline stroke, which reads as a scratch on the
// paper. Overlap silenced: a badge sitting on its icon is the intended reading.
const badge = sketch.ellipse(314, 160, 23, 23, { color: "#8c2b23", weight: "confident", looseness: 0.12, fill: { color: RED, style: "solid" } }, 22);
bell.add(badge.lintIgnore("overlap"));
scene.add(bell);

// --- The clapper, outside the bell group on purpose: inside it, it would inherit the bell's own
// rotation and hang dead straight forever. It gets its own pivot inside the bell's waist instead,
// and swings the other way on its own shorter arm.
const clapper = sketch.ellipse(PIVOT_X, 344, 17, 17, { color: INK, weight: "confident", looseness: 0.14, fill: { color: "#96601f", style: "solid" } }, 20);
scene.add(clapper).lintIgnore("overlap");

// --- Two pairs of sound marks, struck as arcs of circles centred on the bell so they read as
// coming off it rather than being parked beside it. Kept up at shoulder height and short: a
// swing about a mount 200px above the lip throws the skirt 40px sideways, and the first pass had
// marks level with the mouth that the bell then swung straight through.
const marks: ReturnType<typeof sketch.stroke>[] = [];
for (const side of [0, 180]) {
  for (const j of [0, 1]) {
    const r = 122 + j * 24;
    const pts = Array.from({ length: 9 }, (_, i) => {
      const a = ((-18 + (i / 8) * 36 + side) * Math.PI) / 180;
      return [PIVOT_X + Math.cos(a) * r, 178 + Math.sin(a) * r] as [number, number];
    });
    marks.push(sketch.stroke(pts, { color: INK, weight: j === 0 ? 7 : 5, looseness: 0.13 }));
  }
}
marks.forEach((m) => scene.add(m).lintIgnore("overlap"));

drawIn([beam, crown, body, lip, clapper, badge, ...marks], { from: 0, to: 2.85 });

// --- The loop, and it is the loudest thing in this gallery on purpose: four swings of 11 degrees
// in 3.3 seconds, where the rest of these scenes breathe twice. A notification is an interruption.
bell.pivotAt(PIVOT_X, PIVOT_Y);
swayRotate(bell, 11, 4);

// The clapper counter-swings: a NEGATIVE amplitude on the same count, which starts it at +14
// while the bell starts at -11 and keeps the two exactly out of phase for the whole window. Its
// pivot sits well below the mount so it swings on a SHORTER arm than the bell — hung from the
// crown it threw 64px each way and spent half the loop out past the lip.
clapper.pivotAt(PIVOT_X, 200);
swayRotate(clapper, -14, 4);

// The sound marks pulse on the same four beats, so each pair brightens as the bell reaches the
// end of its swing. They rest dim rather than invisible — a bell with nothing beside it at the
// loop's first frame reads as a bell that has stopped.
marks.forEach((m, i) => pulseFade(m, i % 2 === 0 ? 0.3 : 0.22, 1, 4));

// The badge, breathing at half the bell's rate: pinned at its own centre, since an unpinned scale
// on a drawn-on node swells it away from itself (the origin is measured off the rendered bbox,
// which carries a pen-tip element parked at the local origin).
badge.pivotAt(314, 160);
pulseScale(badge, 1.16, 2);

export default scene;
