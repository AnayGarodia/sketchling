import { sketch } from "../../src/index.js";
import { beats, driftOnce, drawIn, pulseScale } from "../lib.js";

// A fat orange ball bouncing three times on a lime-edged platform, squashing flat on every landing.

// texture: "pixel" — the gallery's one pixel-art entry. The texture is an 8px-cell post-process
// over the whole frame, so anything smaller than about 16px stops being a shape and becomes two
// stray pixels: everything here is a big block, a big disc, or nothing. look: "flat" pairs with
// it because a hand-wobbled outline is the one thing an 8px grid cannot resolve.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: "#3d2a66",
  seed: "bouncing-ball",
  look: "flat",
  texture: "pixel",
});

const DEEP = "#1d1136"; // platform body and every outline — one dark, so the palette stays four wide
const LIME = "#a8e02a";
const ORANGE = "#ff6b35";
const SUN = "#f7c948";
const HAZE = "#523a86"; // one step off the ground colour, for the shapes that are only depth

const GROUND_Y = 392; // the contact line: the ball rests on it, the platform starts at it
const BALL_R = 54;
const REST_Y = GROUND_Y - BALL_R;
const RISE = 168; // apex leaves the ball's top just clear of the sun disc

function block(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

// --- Platform. A dark slab with a thick lime cap, inset from the frame so it reads as a thing to
// land on rather than as the bottom of the picture. The cap is a band rather than an outline for
// a reason the first pass found the hard way: the contact shadow below is dark, and on a dark
// slab it was simply invisible. A light landing surface is what a shadow needs to exist at all.
const slab = sketch.loop(block(24, GROUND_Y, 456, 466), {
  color: DEEP,
  weight: "bold",
  looseness: 0,
  smooth: false,
  fill: { color: DEEP, style: "solid" },
});
scene.add(slab).drawOn({ at: 0, duration: 0.9 });

const cap = sketch.loop(block(24, GROUND_Y, 456, GROUND_Y + 16), {
  color: "#00000000",
  weight: "light",
  looseness: 0,
  smooth: false,
  fill: { color: LIME, style: "solid" },
});
scene.add(cap).lintIgnore("overlap").drawOn({ at: 0.5, duration: 0.5 });

// Two steps rising off the left end of the platform, capped in the same lime. They exist for
// weight: with only a slab, a ball and a sun, the whole lower left of the frame was flat ground,
// and a bounce with nothing to measure it against reads as a shape twitching in an empty box.
// The third one floats: a ledge on the right at mid-height, which answers the stairs across the
// frame and keeps the ball's own column the only empty lane in the picture.
([
  [24, 344, 128, 392],
  [24, 296, 76, 344],
  [344, 248, 448, 288],
] as [number, number, number, number][]).forEach(([x0, y0, x1, y1], i) => {
  const body = sketch.loop(block(x0, y0, x1, y1), { color: DEEP, weight: "bold", looseness: 0, smooth: false, fill: { color: DEEP, style: "solid" } });
  scene.add(body).lintIgnore("overlap").drawOn({ at: 1.0 + i * 0.25, duration: 0.3 });
  const lip = sketch.loop(block(x0, y0, x1, y0 + 14), { color: "#00000000", weight: "light", looseness: 0, smooth: false, fill: { color: LIME, style: "solid" } });
  scene.add(lip).lintIgnore("overlap").drawOn({ at: 1.15 + i * 0.25, duration: 0.2 });
});

// Three chunky ticks across the platform face — the only texture in the frame, and 8px wide so
// the pixel grid resolves them as bars instead of dithering them into noise.
const ticks = [120, 240, 360].map((x) =>
  sketch.loop(block(x - 4, 412, x + 4, 448), {
    color: "#00000000",
    weight: "light",
    looseness: 0,
    smooth: false,
    fill: { color: HAZE, style: "solid" },
  }).lintIgnore("overlap")
);
ticks.forEach((t) => scene.add(t));
drawIn(ticks, { from: 0.8, to: 1.25, each: 0.2 });

// --- Sun disc, off to one side of the ball's column so the apex never collides with it. It gets
// the loop's one op that spans the whole window — the bounce itself is authored per beat, and a
// loop where every op sits inside a sub-beat freezes partway through when it is exported.
const sun = sketch.ellipse(368, 112, 60, 60, {
  color: DEEP,
  weight: "bold",
  looseness: 0,
  fill: { color: SUN, style: "solid" },
}, 32);
scene.add(sun).drawOn({ at: 0.55, duration: 0.8 });
sun.pivotAt(368, 112);
pulseScale(sun, 1.07, 3);

// --- A stepped block cloud, in one step off the ground colour. It is depth, not subject: at 8px
// cells any detail on it would just dither.
const clouds = [
  sketch.loop(block(48, 128, 192, 164), { color: HAZE, weight: "light", looseness: 0, smooth: false, fill: { color: HAZE, style: "solid" } }),
  sketch.loop(block(80, 164, 224, 196), { color: HAZE, weight: "light", looseness: 0, smooth: false, fill: { color: HAZE, style: "solid" } }),
];
clouds.forEach((c) => scene.add(c).lintIgnore("overlap"));
drawIn(clouds, { from: 1.3, to: 1.95, each: 0.35 });

// --- Contact shadow. It shrinks while the ball is up and grows back as it falls, which is what
// sells the height — a ball rising with a fixed shadow reads as a ball sliding up a wall.
const shadow = sketch.ellipse(240, GROUND_Y + 8, 52, 7, {
  color: "#00000000",
  weight: "light",
  looseness: 0,
  fill: { color: DEEP, style: "solid" },
});
scene.add(shadow).lintIgnore("overlap").drawOn({ at: 2.0, duration: 0.35 });
shadow.pivotAt(240, GROUND_Y + 8);

// --- The ball, authored resting ON the line rather than mid-air, because that is the state the
// loop's first frame is in: every beat has to give the ball back to the floor before the seam.
// Ball and highlight live in one group so the squash flattens BOTH — driven separately, the
// highlight floated free above the flattened ball on every landing.
const skin = sketch.ellipse(240, REST_Y, BALL_R, BALL_R, {
  color: DEEP,
  weight: "bold",
  looseness: 0,
  fill: { color: ORANGE, style: "solid" },
}, 32);
const gleam = sketch.loop(block(208, 304, 232, 324), {
  color: "#00000000",
  weight: "light",
  looseness: 0,
  smooth: false,
  fill: { color: "#ffb26b", style: "solid" },
});
const ball = sketch.group([skin, gleam]);
scene.add(ball);
skin.drawOn({ at: 2.15, duration: 0.65 });
gleam.lintIgnore("overlap").drawOn({ at: 2.7, duration: 0.2 });
// Pivoted at the contact point, not the ball's middle: a squash about the centre sinks the ball
// halfway into the platform on impact, where a squash about the contact point spreads against it.
// The pivot is in the node's own local space, so it travels with the ball on the way up.
ball.pivotAt(240, GROUND_Y);

// --- Three landings per cycle, exactly. Each beat is: stretch off the floor, up, down, squash
// flat, spring back to (1, 1) — the last of those landing precisely on the beat's own end, so
// the beat after it (and the loop's seam) starts from an unscaled ball at rest.
const dust = [
  sketch.loop(block(170, 374, 198, 390), { color: "#00000000", weight: "light", looseness: 0, smooth: false, fill: { color: LIME, style: "solid" } }),
  sketch.loop(block(282, 374, 310, 390), { color: "#00000000", weight: "light", looseness: 0, smooth: false, fill: { color: LIME, style: "solid" } }),
];
dust.forEach((d) => scene.add(d).lintIgnore("overlap"));

for (const { at } of beats(3)) {
  // Weight leaving the ground: tall and thin, rounding out by the time it is properly airborne.
  ball.squashTo(0.86, 1.2, { at, duration: 0.18, ease: "power2.out" });
  ball.squashTo(1, 1, { at: at + 0.18, duration: 0.22, ease: "sine.out" });
  // Vertical travel as two relative hops, which sum to zero and so cannot drift at the seam.
  ball.moveBy(0, -RISE, { at, duration: 0.42, ease: "power2.out" });
  ball.moveBy(0, RISE, { at: at + 0.42, duration: 0.42, ease: "power2.in" });
  // Impact, then an overshooting recovery — the springy ease is what makes it read as rubber.
  ball.squashTo(1.34, 0.68, { at: at + 0.84, duration: 0.1, ease: "power2.out" });
  ball.squashTo(1, 1, { at: at + 0.94, duration: 0.16, ease: "back.out(2.4)" });

  shadow.squashTo(0.45, 0.45, { at, duration: 0.42, ease: "power2.out" });
  shadow.squashTo(1, 1, { at: at + 0.42, duration: 0.42, ease: "power2.in" });

  // Two blocks kicked sideways out of the landing. `driftOnce` wants a beat, so it gets a
  // hand-made one that starts at the impact and ends with the beat — the same "take one beat
  // from the list" trick lib.ts uses, only offset to a moment inside it.
  const impact = { at: at + 0.84, dur: 0.26 };
  driftOnce(dust[0], -44, -18, impact, { ease: "power1.out", peak: 0.9 });
  driftOnce(dust[1], 44, -18, impact, { ease: "power1.out", peak: 0.9 });
}

export default scene;
