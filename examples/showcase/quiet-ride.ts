import { sketch } from "../../src/index.js";

// Companion to quiet-crossing.ts, same restrained silhouette register (one small figure,
// muted dusk gradient, huge negative space, look:"ink" + texture:"grain" for medium
// character) — but a cyclist instead of a walker, across a world wider than the viewport
// so camera.follow() actually has to move the background, not just translate one figure
// across a static frame. A depth-0.45 hazy tree layer scrolls slower than the depth-1
// embankment the bike rides on — the parallax read that sells "the world is going by,"
// not just "the bike is sliding sideways."

const WORLD_W = 1900;
const H = 400;
const VIEW_W = 640;
const GROUND_Y = 300;
const SIL = "#100d09";
const START_X = 140;
// The camera's viewport (half-width VIEW_W/2 = 320) has to fit inside the world on both
// sides of wherever it ends up centered, or the SVG shows content past the authored world
// bounds — a real rendering bug (verified: a stray pale rectangle appears once
// viewport-right-edge > WORLD_W, gone once the ride's stop point is pulled back far enough
// that it never happens). 400px of margin from WORLD_W covers the 320px half-viewport with
// real room to spare.
const RIDE_END_X = WORLD_W - 400;

function circlePoints(cx: number, cy: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

const scene = sketch.scene({
  width: WORLD_W,
  height: H,
  viewport: { width: VIEW_W, height: H },
  background: {
    stops: [
      { offset: 0, color: "#525f77" },
      { offset: 0.45, color: "#9a8f8c" },
      { offset: 0.78, color: "#d7a97a" },
      { offset: 1, color: "#eecd9c" },
    ],
    direction: "vertical",
  },
  seed: "quiet-ride",
  look: "ink",
  texture: "grain",
});

// Water below the embankment, spanning the full world now (not just one viewport width) —
// every foreground shape has to cover the whole world it's meant to sit in, or panning
// past its edge reveals bare background.
scene.add(
  sketch.loop(
    [[0, GROUND_Y + 34], [WORLD_W, GROUND_Y + 34], [WORLD_W, H], [0, H]],
    {
      color: "#00000000",
      weight: "light",
      fill: {
        color: { stops: [{ offset: 0, color: "#8b8378" }, { offset: 1, color: "#5c5850" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 0, duration: 0.01 });

// The embankment / path the bike rides along, same device as quiet-crossing.ts's — full
// world width this time.
scene.add(
  sketch.loop(
    [[0, GROUND_Y], [WORLD_W, GROUND_Y], [WORLD_W, GROUND_Y + 34], [0, GROUND_Y + 34]],
    {
      color: "#3a3226",
      weight: "confident",
      looseness: 0.1,
      fill: {
        color: { stops: [{ offset: 0, color: "#877b5c" }, { offset: 1, color: "#4a4636" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).drawOn({ at: 0, duration: 1.2 });

// A hazier, lighter-toned distant tree row on its own depth-0.45 layer — panning the
// camera moves this at under half the rate of the depth-1 embankment/bike, the actual
// "moving background" cue: things further back visibly lag things up close, rather than
// the whole world just sliding uniformly with the bike.
const HAZE = "#4a5261";
const farLayer = scene.layer(0.45);
function hazyTree(x: number) {
  const g = sketch.group();
  farLayer.add(g);
  g.add(
    sketch.loop(
      [[x - 4, GROUND_Y], [x + 4, GROUND_Y], [x + 2, GROUND_Y - 62], [x - 2, GROUND_Y - 62]],
      { color: HAZE, weight: "light", looseness: 0.15, fill: { color: HAZE, style: "solid" }, smooth: false }
    )
  );
  const b: [number, number][] = [
    [[x, GROUND_Y - 62], [x - 20, GROUND_Y - 82], [x - 32, GROUND_Y - 76]],
    [[x, GROUND_Y - 62], [x + 18, GROUND_Y - 80], [x + 30, GROUND_Y - 70]],
    [[x, GROUND_Y - 62], [x + 3, GROUND_Y - 92], [x - 8, GROUND_Y - 100]],
  ];
  for (const branch of b) g.add(sketch.stroke(branch, { color: HAZE, weight: "light", looseness: 0.2, smooth: true }));
  return g;
}
for (const x of [180, 520, 900, 1280, 1480]) hazyTree(x).appear({ at: 0, duration: 0.01 });

// Two foreground trees, full-black (depth 1, same plane as the embankment/bike), placed
// well clear of GROUND_Y-100..-160 where the rider's head passes — quiet-crossing.ts's own
// gotcha (a walk path that crossed straight through a canopy, reading as antlers) checked
// against directly here by keeping these off the bike's own path x-range instead of
// re-deriving clearance math by hand.
function tree(x: number) {
  const g = sketch.group();
  scene.add(g);
  g.add(
    sketch.loop(
      [[x - 5, GROUND_Y], [x + 5, GROUND_Y], [x + 3, GROUND_Y - 95], [x - 3, GROUND_Y - 95]],
      { color: SIL, weight: "confident", looseness: 0.15, fill: { color: SIL, style: "solid" }, smooth: false }
    )
  );
  const b: [number, number][] = [
    [[x, GROUND_Y - 95], [x - 34, GROUND_Y - 128], [x - 52, GROUND_Y - 118]],
    [[x, GROUND_Y - 95], [x - 34, GROUND_Y - 128], [x - 46, GROUND_Y - 148]],
    [[x, GROUND_Y - 95], [x + 30, GROUND_Y - 122], [x + 50, GROUND_Y - 108]],
    [[x, GROUND_Y - 95], [x + 22, GROUND_Y - 130], [x + 18, GROUND_Y - 156]],
  ];
  for (const branch of b) g.add(sketch.stroke(branch, { color: SIL, weight: "confident", looseness: 0.2, smooth: true }));
  return g;
}
// The second tree sits ahead of where the ride stops (RIDE_END_X, see the top-of-file
// margin note) rather than at the world's own edge — a "still approaching a landmark"
// composition, not "arriving at the edge of the drawn world."
const TREE2_X = RIDE_END_X + 140;
tree(60).appear({ at: 0, duration: 0.01 });
tree(TREE2_X).appear({ at: 0, duration: 0.01 });

// Sparse reeds along the embankment edge, scattered across the whole world.
for (const rx of [40, 55, 68, 350, 760, 1140, 1520, 1615, 1662]) {
  scene.add(
    sketch.stroke(
      [[rx, GROUND_Y + 30], [rx + (rx % 2 === 0 ? 4 : -4), GROUND_Y - 8]],
      { color: "#241f16", weight: "light", looseness: 0.25 }
    )
  ).appear({ at: 0, duration: 0.01 });
}

// The bike + rider — one small silhouette group, translated as a whole. Local space: y:0
// is ground contact under the wheels (WHEEL_R below each hub), matching the same
// "translate y lands local-0 at the target canvas y" convention quiet-crossing.ts's
// walker uses, so GROUND_Y + group-y-offset puts the wheels exactly on the embankment.
const WHEEL_R = 15;
function buildBike(): { group: ReturnType<typeof sketch.group>; wheels: ReturnType<typeof sketch.group>[] } {
  const g = sketch.group();
  scene.add(g);

  // Frame: a handful of thin confident strokes, not filled — spokes/frame tubes read as
  // lines even in a silhouette register, unlike the rider's own solid-filled body.
  const rearHub: [number, number] = [-30, -WHEEL_R];
  const frontHub: [number, number] = [30, -WHEEL_R];
  const seat: [number, number] = [-14, -46];
  const bars: [number, number] = [22, -50];
  const crank: [number, number] = [0, -28];
  const frameLines: [number, number][][] = [
    [rearHub, seat],
    [seat, bars],
    [bars, frontHub],
    [rearHub, crank],
    [crank, bars],
  ];
  for (const line of frameLines) {
    g.add(sketch.stroke(line, { color: SIL, weight: "confident", looseness: 0.08, smooth: false }));
  }

  // Wheels: hollow rim (no fill — a filled disc would read as two heavy dots, not a bike)
  // plus one spoke each so the spin is actually visible; a plain circle rotating around
  // its own center is a no-op without some asymmetric mark on it.
  function wheel(cx: number): ReturnType<typeof sketch.group> {
    const wg = sketch.group();
    g.add(wg);
    wg.add(sketch.loop(circlePoints(cx, -WHEEL_R, WHEEL_R, 28), { color: SIL, weight: "confident", looseness: 0.05, smooth: true }));
    wg.add(sketch.stroke([[cx, -WHEEL_R], [cx, -WHEEL_R * 2]], { color: SIL, weight: "light", looseness: 0.05 }));
    wg.pivotAt(cx, -WHEEL_R);
    return wg;
  }
  const rearWheel = wheel(rearHub[0]);
  const frontWheel = wheel(frontHub[0]);

  // Rider: one continuous filled outline (leaning torso, arm folded into the silhouette
  // reaching the bars, one bent leg toward the crank) — same lesson quiet-crossing.ts's
  // walker learned the hard way: a separately animated limb piece detaches the instant it
  // rotates unless its pivot sits deep inside the body, so this rider has no separately
  // animated limbs at all, just the whole-body lean plus the two wheels spinning under it.
  g.add(
    sketch.loop(
      [
        [18, -68], [24, -62], [27, -50], [18, -47],
        [-12, -44], [-8, -30], [6, -27], [4, -13],
        [10, -12], [12, -22], [10, -30], [2, -49], [10, -66],
      ],
      { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true }
    )
  );
  g.add(sketch.blob(22, -75, 8, { color: SIL, weight: "confident", looseness: 0.08, fill: { color: SIL, style: "solid" } }, 12));

  return { group: g, wheels: [rearWheel, frontWheel] };
}

const bike = buildBike();

const RIDE_START = 1.2;
const RIDE_DISTANCE = RIDE_END_X - START_X;
const RIDE_SPEED = 130; // px/sec — a steady, unhurried pace, not a sprint
const RIDE_DURATION = RIDE_DISTANCE / RIDE_SPEED;
const RIDE_END = RIDE_START + RIDE_DURATION;

bike.group.initial({ x: START_X, y: GROUND_Y - 4 });
bike.group.appear({ at: RIDE_START - 0.3, duration: 0.3 });
// Constant speed, linear ease — a bike holds a steady glide, unlike the walker's
// start/stop stride bob.
bike.group.moveBy(RIDE_DISTANCE, 0, { at: RIDE_START, duration: RIDE_DURATION, ease: "none" });

// Wheel spin geometrically matched to distance traveled (circumference = 2*pi*WHEEL_R) so
// the wheels roll at the correct rate for the bike's own speed instead of an arbitrary spin
// rate that would visibly slip against the ground.
const WHEEL_TURNS = RIDE_DISTANCE / (2 * Math.PI * WHEEL_R);
for (const w of bike.wheels) {
  w.rotateTo(WHEEL_TURNS * 360, { at: RIDE_START, duration: RIDE_DURATION, ease: "none" });
}

// Long stillness before and after — same patience quiet-crossing.ts holds to.
scene.camera().panTo(START_X, GROUND_Y - 100, { at: 0, duration: 0 });
scene.camera().follow(bike.group, { at: RIDE_START, duration: RIDE_DURATION + 2.5 });

// Sparse waltz, same three-voice restraint as quiet-crossing.ts's score.
scene.add(sketch.sound("D2", { at: 0, duration: RIDE_END + 2.5, instrument: "pad", velocity: 0.16 }));
const waltz: [string, number][] = [
  ["A3", 0], ["E4", 1.1], ["C4", 2.0],
  ["G3", 3.6], ["D4", 4.6], ["B3", 5.4],
  ["F3", 7.0], ["C4", 8.0], ["A3", 8.8],
];
for (const [pitch, offset] of waltz) {
  scene.add(sketch.sound(pitch, { at: RIDE_START + offset, duration: 1.1, instrument: "piano", velocity: 0.3 }));
}
scene.add(sketch.sound("E3", { at: RIDE_END, duration: 2.2, instrument: "strings", velocity: 0.22 }));

export default scene;
