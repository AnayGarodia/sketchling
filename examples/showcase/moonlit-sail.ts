import { sketch } from "../../src/index.js";

// A nocturnal companion to quiet-crossing.ts and quiet-ride.ts — same restrained
// silhouette register (one small subject, a huge graded sky, look:"ink" + texture:"grain",
// no faces, no squash-stretch, no saturated fills), moved from land to open water. The
// whole scene is one sustained mood rather than a story beat: a small sloop gliding at a
// constant pace into the moon's own reflection, its sail going slack and refilling twice on
// the way, one gull crossing the far sky. Nothing else happens.
//
// The light has a single real source — the moon — and every value in the frame is derived
// from it: the sky gradient brightens downward toward the horizon it sits above, the water
// is brightest in the column directly beneath it and falls off to either side, the far
// shore is a hazy near-horizon value, and the boat is a pure silhouette because it's
// backlit by its own reflection.
//
// The moon is a hand-plotted trig circle via loop(), NOT sketch.blob() — blob()'s wobble
// has a ~15% floor even at looseness: 0 (deliberate, see geometry.ts's blobPoints), which
// reads as a lumpy cloud rather than a disc at anything near this radius. Same fix
// nightfall-hill.ts already needed for the same reason.

const W = 640;
const H = 400;
const HORIZON_Y = 238;
const WATER_H = H - HORIZON_Y;
const MOON_X = 452;
const MOON_Y = 96;
const MOON_R = 40;
// The boat's waterline — well down into the near water, so it reads as the closest thing
// in the frame and its silhouette has the bright part of the reflection behind it.
const WATERLINE_Y = 330;
const SIL = "#0a0d16";

function circlePoints(cx: number, cy: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// A seeded LCG rather than Math.random() for the ripple scatter — the same render has to
// come back identical every time (line boil and rough.js are already seeded off the
// scene's own seed; authored point jitter shouldn't be the one nondeterministic thing).
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Reflected moonlight is one ivory at many strengths — every ripple, halo ring and star is
// the same pigment at a different alpha, which is what keeps the whole frame reading as one
// light source rather than as separate pale marks.
function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return `${hex}${a.toString(16).padStart(2, "0")}`;
}
function moonlight(alpha: number): string {
  return withAlpha("#e9e4d4", alpha);
}

const scene = sketch.scene({
  width: W,
  height: H,
  background: {
    stops: [
      { offset: 0, color: "#090d1a" },
      { offset: 0.3, color: "#141c2e" },
      { offset: 0.48, color: "#2a3448" },
      { offset: 0.59, color: "#515c76" },
      { offset: 1, color: "#515c76" },
    ],
    direction: "vertical",
  },
  seed: "moonlit-sail",
  look: "ink",
  texture: "grain",
});

// --- Sky: a few faint stars, kept well clear of the moon's halo (a full moon washes its
// own neighbourhood out — stars crowded up against it would read as decoration, not sky).
const starRnd = rng(0x5eed17);
for (let i = 0; i < 11; i++) {
  const sx = 20 + starRnd() * 600;
  const sy = 14 + starRnd() * 165;
  if (Math.hypot(sx - MOON_X, sy - MOON_Y) < 165) continue;
  const r = 1.1 + starRnd() * 0.9;
  const a = 0.3 + starRnd() * 0.35;
  scene.add(
    sketch.loop(circlePoints(sx, sy, r, 8), {
      color: "transparent",
      weight: "light",
      looseness: 0,
      fill: { color: moonlight(a), style: "solid" },
    })
  ).appear({ at: 0.15 + i * 0.06, duration: 0.4 });
}

// --- The moon's halo. There's no radial gradient primitive here (fill gradients are
// linear), so the falloff has to be stacked discs — and getting that to read as glow rather
// than as a target took three passes worth finding out about:
//   1. Three discs at 0.045-0.09 alpha rendered as an unmistakable bullseye.
//   2. Eleven at 0.017 still banded visibly: against a sky this dark, even a 4/255 step
//      lands as a findable edge, and 11 perfectly concentric circles make 11 of them.
//   3. What works is many rings at ~1-2/255 each AND a radius wobble that grows with radius,
//      so no two ring boundaries are parallel. The residual steps stop forming clean arcs
//      and read as atmospheric haze, which is what a real lunar corona is.
// 64 vertices keeps the rings circular rather than polygonal at this radius.
const HALO_RINGS = 18;
const haloRnd = rng(0x40100f);
for (let i = 0; i < HALO_RINGS; i++) {
  const k = i / (HALO_RINGS - 1);
  const r = MOON_R + 5 + k * 176;
  // Two low harmonics with a per-ring phase, not per-vertex white noise — 64 vertices of
  // independent jitter splined through would read as a spiky starburst, whereas a couple of
  // slow lobes just make each ring a slightly different soft oval.
  const wobble = 0.02 + 0.06 * k;
  const p1 = haloRnd() * Math.PI * 2;
  const p2 = haloRnd() * Math.PI * 2;
  const pts: [number, number][] = [];
  for (let v = 0; v < 64; v++) {
    const a = (v / 64) * Math.PI * 2;
    const s = 1 + wobble * (0.62 * Math.sin(a * 2 + p1) + 0.38 * Math.sin(a * 3 + p2));
    pts.push([MOON_X + Math.cos(a) * r * s, MOON_Y + Math.sin(a) * r * s]);
  }
  scene.add(
    sketch.loop(pts, {
      color: "transparent",
      weight: "light",
      looseness: 0,
      fill: { color: moonlight(0.011), style: "solid" },
    })
  ).appear({ at: 0.2, duration: 1.0 });
}

const moon = sketch.loop(circlePoints(MOON_X, MOON_Y, MOON_R, 52), {
  color: "#f2ecdb",
  weight: "light",
  looseness: 0,
  fill: {
    color: { stops: [{ offset: 0, color: "#f8f4e8" }, { offset: 1, color: "#d9d0bb" }], direction: "vertical" },
    style: "solid",
  },
});
scene.add(moon).drawOn({ at: 0.3, duration: 1.2 });

// Two barely-there maria — a full moon with no tonal variation at all reads as a sticker.
// Same ivory family, a step darker, low alpha. (Tier 0 flags these as heavy overlap; they
// are nested on purpose, the expected noise the docs describe.)
for (const [mx, my, mr] of [[441, 86, 13], [463, 107, 9], [449, 110, 6]] as [number, number, number][]) {
  scene.add(
    sketch.loop(circlePoints(mx, my, mr, 18), {
      color: "transparent",
      weight: "light",
      looseness: 0,
      fill: { color: "#c6bda640", style: "solid" },
    })
  ).appear({ at: 1.1, duration: 0.8 });
}

// --- A hazy far shore hugging the horizon on the left. Purely for scale and depth: it
// tells you the water is open and the boat is a long way out, in about twelve pixels of
// height. Value sits between the horizon sky and the near water, never darker.
scene.add(
  sketch.loop(
    [
      [-10, HORIZON_Y + 2], [46, HORIZON_Y - 6], [104, HORIZON_Y - 10],
      [168, HORIZON_Y - 5], [232, HORIZON_Y - 8], [286, HORIZON_Y - 2],
      [316, HORIZON_Y + 2], [-10, HORIZON_Y + 2],
    ],
    { color: "transparent", weight: "light", looseness: 0.1, fill: { color: "#46506a", style: "solid" } }
  )
).appear({ at: 0.5, duration: 0.9 });

// --- The water. One graded band: brightest where it meets the lit horizon, darkest in the
// near field, which is what sells depth on a surface with no other detail.
scene.add(
  sketch.loop(
    [[0, HORIZON_Y], [W, HORIZON_Y], [W, H], [0, H]],
    {
      color: "transparent",
      weight: "light",
      fill: {
        color: { stops: [{ offset: 0, color: "#3b465d" }, { offset: 1, color: "#0e1420" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 0, duration: 0.01 });

// The sea/sky seam — one light stroke, drawn on. The only crisp line in the upper half.
scene.add(
  sketch.stroke([[0, HORIZON_Y], [W, HORIZON_Y]], { color: "#7d879e", weight: "light", looseness: 0.06 })
).drawOn({ at: 0, duration: 1.4 });

// --- The moonlight column. Two parts, and both are needed: a wash that establishes the
// column's presence, and discrete ripple dashes that make it read as reflected light rather
// than a painted shape. The wash is FIVE nested trapezoids at ~0.03 alpha each, widening
// from the horizon toward the viewer — one trapezoid at a readable alpha (0.2) read as a
// hard-edged theatre spotlight cone, because a single fill can only fall off along the
// gradient's own axis, never sideways. Nesting gets the sideways falloff the single shape
// couldn't have, and drops the visible edge with it. The bands also fade in slightly LATER
// than the glitter starts, staggered — brought in first, they spend two seconds on screen as
// a bare cone with nothing on it, which is exactly the look the nesting was meant to avoid.
const COLUMN_BANDS = 5;
for (let i = 0; i < COLUMN_BANDS; i++) {
  const k = (i + 1) / COLUMN_BANDS;
  const topHalf = 5 + 16 * k;
  const botHalf = 14 + 68 * k;
  scene.add(
    sketch.loop(
      [
        [MOON_X - topHalf, HORIZON_Y + 1], [MOON_X + topHalf, HORIZON_Y + 1],
        [MOON_X + botHalf, H], [MOON_X - botHalf, H],
      ],
      {
        color: "transparent",
        weight: "light",
        looseness: 0.05,
        fill: {
          color: { stops: [{ offset: 0, color: moonlight(0.035) }, { offset: 1, color: moonlight(0.012) }], direction: "vertical" },
          style: "solid",
        },
      }
    )
  ).appear({ at: 1.2 + i * 0.12, duration: 1.2 });
}

// Glitter: short horizontal dashes, crowded near the horizon and spreading forward, with
// brightness falling off from the column's own centre line as well as with distance. This
// is the part that actually looks like water — a sparse handful reads as debris floating on
// the surface, so the field has to be genuinely dense.
const rippleRnd = rng(0x1a5e11);
const ROWS = 44;
// The per-row y jitter grows with distance from the horizon, so the deepest rows have to be
// authored with real headroom above the bottom edge — an earlier pass ran the last row out
// to exactly HORIZON_Y + WATER_H and the jitter put two dashes at y≈405, which Tier 0
// correctly flagged as rendering fully off-canvas.
for (let i = 0; i < ROWS; i++) {
  const t = i / (ROWS - 1);
  const y = HORIZON_Y + 3 + (WATER_H - 16) * Math.pow(t, 1.8);
  const spread = 12 + 62 * t;
  // The column's own centre line wanders a few pixels with depth instead of running dead
  // straight down from the moon — a perfectly straight band of light reads as a projected
  // stripe rather than as a reflection on a surface that isn't flat.
  const centre = MOON_X + Math.sin(t * 5.4) * 9 * t;
  const dashes = 1 + (rippleRnd() < 0.55 ? 1 : 0) + (t > 0.35 && rippleRnd() < 0.35 ? 1 : 0);
  for (let d = 0; d < dashes; d++) {
    const off = (rippleRnd() * 2 - 1) * spread;
    const w = 5 + 30 * t * (0.5 + rippleRnd() * 0.8);
    const centreFall = 1 - 0.55 * Math.abs(off) / spread;
    const a = (0.58 - 0.26 * t) * centreFall * (0.6 + rippleRnd() * 0.6);
    const yy = Math.min(H - 4, y + (rippleRnd() * 2 - 1) * (1 + 3 * t));
    scene.add(
      sketch.stroke([[centre + off - w / 2, yy], [centre + off + w / 2, yy + (rippleRnd() * 2 - 1)]], {
        color: moonlight(a),
        weight: "light",
        looseness: 0.2,
      })
    ).appear({ at: 1.1 + i * 0.035, duration: 0.5 });
  }
}

// Ambient ripples away from the column — much dimmer, sparse. They keep the rest of the
// surface from going dead flat without competing with the reflection. Line boil (automatic,
// a few times a second, on every already-drawn line) is what makes them read as water
// rather than as pencil marks; no animation is authored on them at all.
const calmRnd = rng(0xca1f0e);
for (let i = 0; i < 16; i++) {
  const t = calmRnd();
  const y = HORIZON_Y + 8 + (WATER_H - 18) * Math.pow(t, 1.6);
  const cx = 20 + calmRnd() * (W - 40);
  if (Math.abs(cx - MOON_X) < 80) continue;
  const w = 8 + 30 * t;
  scene.add(
    sketch.stroke([[cx - w / 2, y], [cx + w / 2, y + (calmRnd() * 2 - 1)]], {
      color: moonlight(0.05 + calmRnd() * 0.07),
      weight: "light",
      looseness: 0.2,
    })
  ).appear({ at: 0.9 + i * 0.05, duration: 0.5 });
}

// --- The boat. Local space: (0, 0) is the mast foot at the waterline, so
// initial({ x, y }) lands the whole rig exactly on WATERLINE_Y without any bbox-center
// arithmetic (initial() sets the translate directly; moveTo's bbox-center behaviour is the
// gotcha this deliberately sidesteps). Bow is +x, stern -x.
//
// Nothing on this boat rotates independently. pivotAt() takes a canvas point that stays
// fixed while the node translates away from it, so a pivoted sail on a moving hull would
// swing around a point the boat had already left; the luff below is a morphTo on the sail's
// own outline instead, which is also what luffing physically is — the camber going slack
// and refilling, not the sail swinging.
//
// Two things the first pass got wrong, both only findable by zooming into a render:
//   - The mainsail sat FORWARD of the mast. Sailing bow-right, the main is always aft of the
//     mast (it's the boom's own arc); forward of it is a rig that doesn't exist. Flipped.
//   - Its foot sat 5px above the deck, so at this scale sail and hull fused into one black
//     wedge — an ice-cream-scoop shape, not a boat. The boom now sits ~25px above the deck,
//     and the open gap between them (mast, helmsman, sky) is what makes the silhouette
//     legible at all.
const MAST_X = 8;
const SAIL_FULL: [number, number][] = [
  [MAST_X, -90], [-3, -70], [-14, -52], [-23, -40], [-27, -36], [6, -37], [7, -63],
];
const SAIL_LUFFED: [number, number][] = [
  [MAST_X, -90], [1, -68], [-8, -50], [-18, -39], [-27, -36], [6, -37], [7, -63],
];

// Two nested groups, not one, and the reason is load-bearing: `moveBy` compiles to a single
// tween that writes BOTH axes (`{ x: "+=dx", y: "+=dy" }`), so a vertical heave authored on
// the same node as the horizontal glide, overlapping it in time, does not just add a bob —
// its own `x: "+=0"` pins x at whatever it was when that tween started, and (being added to
// the timeline second) it wins the tick. The glide silently stops for as long as the heave
// runs. This cost a full video render to find: the boat sat at its start position through
// almost the whole timeline and then jumped to the end once the last heave tween finished,
// with no error and a perfectly correct-looking settled end frame. The outer group owns the
// glide, the inner group owns the heave, and the two transforms compose in SVG for free.
function buildBoat(): {
  glide: ReturnType<typeof sketch.group>;
  heave: ReturnType<typeof sketch.group>;
  sail: ReturnType<typeof sketch.loop>;
} {
  const outer = sketch.group();
  scene.add(outer);
  const g = sketch.group();
  outer.add(g);

  // The boat's own reflection first, so the hull sits on top of it: a dark smear directly
  // below the waterline plus a broken mast streak. Both live inside the group, so they
  // travel with the boat for free.
  g.add(
    sketch.loop(
      [[-26, 4], [20, 4], [13, 17], [-18, 14]],
      { color: "transparent", weight: "light", looseness: 0.3, fill: { color: "#080b1250", style: "solid" } }
    )
  );
  g.add(sketch.stroke([[MAST_X, 5], [MAST_X - 3, 22]], { color: withAlpha("#080b12", 0.22), weight: "light", looseness: 0.2 }));

  // A short wake trailing off the stern — two dim dashes. The only cue for direction of
  // travel other than the motion itself.
  g.add(sketch.stroke([[-40, 3], [-60, 4]], { color: moonlight(0.16), weight: "light", looseness: 0.25 }));
  g.add(sketch.stroke([[-48, 7], [-74, 8]], { color: moonlight(0.1), weight: "light", looseness: 0.25 }));

  // Hull: one closed silhouette, low and shallow with the sheer rising toward the bow. Only
  // a couple of pixels of it sit below the waterline — the earlier deeper version splined
  // into a rounded bowl that read as a bathtub floating on top of the water rather than a
  // hull sitting in it.
  g.add(
    sketch.loop(
      [[-34, -9], [-8, -12], [20, -14], [36, -15], [27, 0], [-4, 2], [-28, -1]],
      { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true }
    )
  );

  // Mast, boom, and standing rigging (forestay to the bow, backstay to the stern) — four
  // hairlines. Cheap, and it's the detail that makes the silhouette read as a rigged boat
  // rather than a triangle on a bathtub.
  g.add(sketch.stroke([[MAST_X, -92], [35, -14]], { color: SIL, weight: "light", looseness: 0.06 }));
  g.add(sketch.stroke([[MAST_X, -92], [-33, -10]], { color: SIL, weight: "light", looseness: 0.06 }));
  g.add(sketch.stroke([[MAST_X, -11], [MAST_X, -93]], { color: SIL, weight: "confident", looseness: 0.05, smooth: false }));
  g.add(sketch.stroke([[MAST_X, -37], [-27, -35]], { color: SIL, weight: "confident", looseness: 0.06, smooth: false }));

  const sail = sketch.loop(SAIL_FULL, {
    color: SIL,
    weight: "confident",
    looseness: 0.08,
    fill: { color: SIL, style: "solid" },
    smooth: true,
  });
  g.add(sail);

  // One figure at the tiller, hunched, no face — roughly 1.1m against a 4m hull, the same
  // naturalistic proportion the walker and the cyclist hold to. Sits in the open gap under
  // the boom (head top at -27, boom overhead at about -36), which is where a helmsman
  // actually sits and also the only place it stays readable instead of being swallowed by
  // the sail. Fused-by-overlap into the deck rather than posed, and never animated on its
  // own, so there's no seam to open up.
  g.add(
    sketch.loop(
      [[-26, -9], [-25, -19], [-22, -26], [-18, -27], [-16, -20], [-15, -9]],
      { color: SIL, weight: "confident", looseness: 0.09, fill: { color: SIL, style: "solid" }, smooth: true }
    )
  );

  return { glide: outer, heave: g, sail };
}

const boat = buildBoat();
const BOAT_X0 = 104;
const GLIDE_START = 2.0;
const GLIDE_DIST = 326; // ends with the hull sitting inside the reflection column
const GLIDE_SPEED = 29; // px/sec — a slow, unhurried constant glide, no acceleration
const GLIDE_DUR = GLIDE_DIST / GLIDE_SPEED;
const GLIDE_END = GLIDE_START + GLIDE_DUR;

boat.glide.initial({ x: BOAT_X0, y: WATERLINE_Y, opacity: 0 });
boat.glide.appear({ at: 1.2, duration: 0.9 });
boat.glide.moveBy(GLIDE_DIST, 0, { at: GLIDE_START, duration: GLIDE_DUR, ease: "none" });

// A long, shallow heave — two pixels, four cycles across the whole glide, on the inner group
// so it can't fight the glide (see buildBoat's note). Calm water moves a hull like this;
// anything more would read as chop, and any squash/stretch would read as cartoon weight,
// which is not this register.
const HEAVE_CYCLES = 4;
const HEAVE_T = GLIDE_DUR / HEAVE_CYCLES;
for (let i = 0; i < HEAVE_CYCLES; i++) {
  const at = GLIDE_START + i * HEAVE_T;
  boat.heave.moveBy(0, -2, { at, duration: HEAVE_T / 2, ease: "sine.inOut" });
  boat.heave.moveBy(0, 2, { at: at + HEAVE_T / 2, duration: HEAVE_T / 2, ease: "sine.inOut" });
}

// The only event in the scene: the sail goes soft, hangs slack for a beat, then refills —
// twice, on an uneven rhythm so it reads as weather rather than as a loop. A morphTo, not a
// rotation, for the reason above.
boat.sail.morphTo(SAIL_LUFFED, { at: 4.6, duration: 1.1, ease: "sine.out" });
boat.sail.morphTo(SAIL_FULL, { at: 6.4, duration: 1.4, ease: "sine.inOut" });
boat.sail.morphTo(SAIL_LUFFED, { at: 8.6, duration: 0.9, ease: "sine.out" });
boat.sail.morphTo(SAIL_FULL, { at: 9.9, duration: 1.3, ease: "sine.inOut" });

// --- One gull, far off and small: two short strokes, a shallow glide across the left sky,
// three unhurried flaps via morphTo (same reasoning as the sail — a rotated wing on a
// translating body would pivot around a canvas point the gull has flown past). Kept clear
// of the moon's halo so it never reads as a mark on the disc.
const WING_UP_L: [number, number][] = [[-9, 2], [-5, -3], [0, 0]];
const WING_UP_R: [number, number][] = [[0, 0], [5, -3], [9, 2]];
const WING_DN_L: [number, number][] = [[-9, -2], [-5, 2], [0, 0]];
const WING_DN_R: [number, number][] = [[0, 0], [5, 2], [9, -2]];

const gull = sketch.group();
scene.add(gull);
const wingL = sketch.stroke(WING_UP_L, { color: "#0d1320", weight: "light", looseness: 0.15 });
const wingR = sketch.stroke(WING_UP_R, { color: "#0d1320", weight: "light", looseness: 0.15 });
gull.add(wingL);
gull.add(wingR);
gull.initial({ x: 74, y: 126, opacity: 0 });
gull.appear({ at: 3.4, duration: 1.2 });
// Two SEQUENTIAL moveBy legs, each carrying its own dx and dy, rather than one long
// horizontal tween with vertical ones layered over it — same trap the boat's heave fell into
// (a moveBy writes both axes, so overlapping ones fight). Sequential legs never overlap, so
// one tween owns the position at any moment; the sag and lift come from the easing.
gull.moveBy(126, 20, { at: 3.4, duration: 3.7, ease: "sine.out" });
gull.moveBy(124, -12, { at: 7.1, duration: 3.7, ease: "sine.in" });
gull.fadeTo(0, { at: 9.8, duration: 1.6, ease: "sine.in" });
for (let i = 0; i < 3; i++) {
  const at = 4.2 + i * 1.9;
  wingL.morphTo(WING_DN_L, { at, duration: 0.45, ease: "sine.inOut" });
  wingR.morphTo(WING_DN_R, { at, duration: 0.45, ease: "sine.inOut" });
  wingL.morphTo(WING_UP_L, { at: at + 0.5, duration: 0.55, ease: "sine.inOut" });
  wingR.morphTo(WING_UP_R, { at: at + 0.5, duration: 0.55, ease: "sine.inOut" });
}

// --- Score: quieter and slower than quiet-crossing.ts's waltz — a held low pad, a handful
// of piano notes that drift from centre to the right as the boat crosses toward the moon,
// and three soft brush hits standing in for water against the hull. No percussion pulse.
const TAIL = GLIDE_END + 2.4;
scene.add(sketch.sound("D2", { at: 0, duration: TAIL, instrument: "pad", velocity: 0.15 }));
scene.add(sketch.sound("A2", { at: 2.0, duration: TAIL - 2.0, instrument: "pad", velocity: 0.1 }));
const phrase: [string, number, number][] = [
  ["A3", 0.6, -0.25],
  ["E4", 2.4, -0.15],
  ["D4", 4.1, -0.05],
  ["F3", 6.3, 0.05],
  ["C4", 8.2, 0.15],
  ["A3", 10.4, 0.25],
];
for (const [pitch, offset, pan] of phrase) {
  scene.add(sketch.sound(pitch, { at: GLIDE_START + offset, duration: 1.4, instrument: "piano", velocity: 0.26, pan }));
}
for (const [offset, pan] of [[1.4, -0.2], [5.6, 0.0], [9.6, 0.2]] as [number, number][]) {
  scene.add(sketch.sound(null, { at: GLIDE_START + offset, duration: 0.6, instrument: "brush", velocity: 0.12, pan }));
}
scene.add(sketch.sound("D3", { at: GLIDE_END, duration: 2.4, instrument: "strings", velocity: 0.2 }));

export default scene;
