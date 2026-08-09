import { sketch } from "../../src/index.js";

// Showcase: the same restrained silhouette register as quiet-crossing.ts / quiet-ride.ts
// (small no-face figure, naturalistic proportions, patient weighted motion, huge negative
// space, look:"ink" + texture:"grain"), moved into a palette family the gallery didn't have
// yet — a cold blue-violet rainy night with warm window light as the ONE accent, instead of
// another dusk-orange sky. Everything cool is ambient (sky, mist, wet road, rain); every
// warm value in the frame comes from a light somebody left on, and pays for itself twice:
// once on the building, once smeared down the wet road below it.
//
// Three things this scene is actually testing:
//   1. sketch.particles as WEATHER rather than as a burst — 21 emitters at two parallax
//      depths, each spread across the whole shot (duration ≈ timeline length) instead of
//      firing at one instant, with fade:false and a lifetime tuned so every drop spawns
//      above the viewport and dies below it (no visible pop-in/pop-out, see RAIN below).
//      Particles alone don't finish the job: a particle is drawn as a CIRCLE, and round
//      specks read as sleet no matter how small or fast, so the actual rain read comes from
//      26 recycled streak STROKES falling through the same wind angle, with the particle
//      sheets underneath as the veil (see the streak block for the recycling trick).
//   2. Reflections as authored geometry, not a simulation: the near skyline's own rects
//      mirrored about the road line and vertically squashed, plus a warm smear under each
//      lit window. Cheap, and it reads.
//   3. Silhouette readability in a dark-on-dark composition — a black figure in front of
//      dark buildings needs a value gap the dusk scenes got for free from a bright sky.
//      Solved with a low-alpha street-level mist band (rain haze) lightening exactly the
//      band the figure's head and umbrella pass through, not by lightening the buildings.

const WORLD_W = 1080;
const WORLD_H = 560;
const VIEW_W = 640;
const VIEW_H = 440;

const CURB_Y = 330; // building bases / top of the sidewalk
const ROAD_Y = 352; // wet asphalt starts here — also the mirror line for every reflection
const CAM_CY = 280; // exactly WORLD_H/2, so the camera never pans vertically at all

// The camera drifts left-to-right with the walk. Both ends keep a full half-viewport
// (VIEW_W/2 = 320) between the centered point and either world edge — the margin rule
// quiet-ride.ts's stray-pale-rectangle bug forced: 380-320 = 60px of slack on the left,
// 1080-520-320 = 240px on the right. Vertically CAM_CY is dead center of a world 120px
// taller than the viewport, so there's 60px of slack top and bottom too.
const CAM_X_START = 380;
const CAM_X_END = 520;

const SIL = "#080a14"; // the figure — the darkest value in the frame, by a real margin
const FAR_TOWER = "#242c52"; // distant towers: lighter/hazier (atmospheric perspective)
const NEAR_BLOCK = "#141830"; // street-front row: much darker, closer
const WARM = "#e0a75e";
const WARM_HOT = "#f4cd91";
const WARM_DIM = "#a97a48";

// Walk: 10 steps of 26px. Stride is sized against the figure's own 44px legs (swinging 20
// degrees off vertical opens the feet ~30px apart, so a 26px step lands inside what the legs
// can actually cover) — not against how far across the world it would be nice to travel.
const FEET_Y = 440; // ground contact, ~88px in front of the curb — mid-road, foreground
const WALK_START = 1.7;
const STEPS = 10;
const STEP_DUR = 1.15;
const STEP_DX = 26;
const START_X = 300;
const WALK_END = WALK_START + STEPS * STEP_DUR;
const TOTAL = WALK_END + 2.3; // a long held tail: the rain keeps going after the walk does
// A particle emitter reserves timeline duration through its last drop's DEATH (spawn +
// lifetime), so whatever the emission window is, the timeline always outlives it by one
// lifetime and the settled final frame is always drier than the shot itself. That's how
// particles reserve duration, not something to fight — so the ending is SHAPED around it
// instead: each rain emitter and each streak stops at a slightly different time across the
// last couple of seconds, so the shower visibly eases off as the figure walks on, rather than
// stopping dead. Everything (streak cycles, camera pan, closing string note) is capped to
// RAIN_TAIL so nothing extends past it — an earlier pass let the streaks run their own cycle
// count out to 18.1s, which parked every streak off-screen and left two dry seconds at the
// end. Note that a `--out` still with no `--at` lands on that last frame by definition; the
// docs still for this scene is deliberately taken mid-shot instead.
const RAIN_LIFETIME = 1.15;
const RAIN_TAIL = TOTAL + RAIN_LIFETIME;
const EASE_OFF = 2.2; // seconds over which the rain thins out at the end

function rect(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

// A squashed trig ellipse rather than blob() — blob's outline jitter has a floor that turns
// a wide shallow shape lumpy (the same reason nightfall-hill.ts hand-plots its moon), and a
// puddle is exactly the wide shallow case.
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n = 26): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

const scene = sketch.scene({
  width: WORLD_W,
  height: WORLD_H,
  viewport: { width: VIEW_W, height: VIEW_H },
  background: {
    // Cool all the way down, and LIGHTEST near the rooftops — city light bounced back off
    // low rain cloud, which is what actually makes a rainy night sky read as overcast
    // rather than clear. No warm stop anywhere in the sky; the warmth is all man-made.
    stops: [
      { offset: 0, color: "#0a0d22" },
      { offset: 0.34, color: "#161c3c" },
      { offset: 0.55, color: "#28305a" },
      { offset: 0.63, color: "#333a63" },
      { offset: 1, color: "#22284a" },
    ],
    direction: "vertical",
  },
  seed: "rain-city-night",
  look: "ink",
  texture: "grain",
});

// ---------------------------------------------------------------------------------------
// Depth 0.45 — the distant tower cluster. Taller than the street-front row on purpose:
// a contiguous near skyline would hide a far layer entirely, and then the parallax would
// be doing nothing. Towers poke well above the near roofline instead.
// ---------------------------------------------------------------------------------------
const farLayer = scene.layer(0.45);
const FAR_TOWERS: [number, number, number][] = [
  [20, 132, 142],
  [140, 216, 112],
  [232, 330, 158],
  [346, 432, 124],
  [450, 562, 168],
  [576, 690, 132],
  [700, 792, 160],
  [806, 906, 118],
  [916, 1050, 150],
];
for (const [x0, x1, top] of FAR_TOWERS) {
  farLayer.add(
    sketch.loop(rect(x0, top, x1, CURB_Y), {
      color: FAR_TOWER,
      weight: "light",
      looseness: 0.06,
      smooth: false,
      fill: { color: FAR_TOWER, style: "solid" },
    })
  ).appear({ at: 0, duration: 0.01 });

  // Five dim windows per tower at fixed offsets, not a full grid — a grid at this distance
  // is hundreds of near-identical nodes for a texture nobody can resolve through the rain.
  const w = x1 - x0;
  const spots: [number, number][] = [
    [0.22, 0.18],
    [0.62, 0.3],
    [0.34, 0.52],
    [0.75, 0.62],
    [0.5, 0.8],
  ];
  spots.forEach(([fx, fy], i) => {
    const wx = x0 + w * fx;
    const wy = top + (CURB_Y - top) * fy;
    const lit = (i + x0) % 3 === 0;
    farLayer.add(
      sketch.loop(rect(wx, wy, wx + 4, wy + 6), {
        color: "#00000000",
        weight: "light",
        looseness: 0.05,
        smooth: false,
        fill: { color: lit ? "#7d6a5e" : "#39416e", style: "solid" },
      })
    ).appear({ at: 0.1 + i * 0.05, duration: 0.4 });
  });
}

// Depth 0.7 — rain haze over the tower cluster's lower half. Sits between the far towers
// and the street-front row so it veils the distance without touching the near buildings.
scene.layer(0.7).add(
  sketch.loop(rect(-40, 190, WORLD_W + 40, CURB_Y + 4), {
    color: "#00000000",
    weight: "light",
    // Same smooth:false reasoning as the reflections below — a 1160px-wide rect splined
    // through four corners bows its top edge into a visible arc across the middle of frame.
    smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#39447200" }, { offset: 1, color: "#4d5a8544" }], direction: "vertical" },
      style: "solid",
    },
  })
).appear({ at: 0, duration: 0.01 });

// ---------------------------------------------------------------------------------------
// Depth 1 — the street the figure actually walks on: near buildings, their windows, the one
// warm shopfront, the road, every reflection, the lamp, the figure.
// ---------------------------------------------------------------------------------------
const NEAR_BLOCKS: [number, number, number][] = [
  [-40, 142, 238],
  [142, 272, 214],
  [272, 396, 252],
  [396, 520, 222],
  [520, 662, 206],
  [662, 782, 246],
  [782, 902, 218],
  [902, WORLD_W + 40, 236],
];
for (const [x0, x1, top] of NEAR_BLOCKS) {
  scene.add(
    sketch.loop(rect(x0, top, x1, CURB_Y), {
      color: "#0f1226",
      weight: "light",
      looseness: 0.07,
      smooth: false,
      fill: { color: NEAR_BLOCK, style: "solid" },
    })
  ).appear({ at: 0, duration: 0.01 });
}

// A little rooftop hardware, purely for silhouette interest against the sky — a water tank,
// a vent housing, an antenna mast. Three shapes total: an unbroken row of plain rectangles
// reads as placeholder geometry, and a roofline full of detail would fight the figure.
const tank = sketch.group();
scene.add(tank);
tank.add(
  sketch.loop(rect(300, 232, 330, 252), {
    color: "#0d1024",
    weight: "light",
    looseness: 0.08,
    smooth: false,
    fill: { color: "#101427", style: "solid" },
  })
);
tank.add(
  sketch.loop(
    [
      [298, 232],
      [332, 232],
      [315, 220],
    ],
    { color: "#0d1024", weight: "light", looseness: 0.1, smooth: false, fill: { color: "#101427", style: "solid" } }
  )
);
for (const lx of [303, 327]) {
  tank.add(sketch.stroke([[lx, 252], [lx, 262]], { color: "#0d1024", weight: "light", looseness: 0.1 }));
}
tank.appear({ at: 0.05, duration: 0.6 });
scene.add(
  sketch.loop(rect(830, 206, 862, 218), {
    color: "#0d1024",
    weight: "light",
    looseness: 0.08,
    smooth: false,
    fill: { color: "#101427", style: "solid" },
  })
).appear({ at: 0.05, duration: 0.6 });
const mast = sketch.group();
scene.add(mast);
mast.add(sketch.stroke([[452, 222], [452, 176]], { color: "#0d1024", weight: "light", looseness: 0.1 }));
mast.add(sketch.stroke([[446, 196], [458, 196]], { color: "#0d1024", weight: "light", looseness: 0.12 }));
mast.add(sketch.stroke([[448, 186], [456, 186]], { color: "#0d1024", weight: "light", looseness: 0.12 }));
mast.appear({ at: 0.05, duration: 0.6 });

// Windows, hand-placed rather than generated: restraint means MOST windows are dark, and the
// lit ones are placed deliberately — kept out of x 300..600 at the 250..310 band, which is
// exactly where the figure's umbrella passes, so a warm rectangle never has to compete with
// the silhouette for the same pixels.
interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}
const WINDOWS: Win[] = [
  { x: 22, y: 252, w: 12, h: 15, color: WARM },
  { x: 52, y: 252, w: 12, h: 15, color: "#1e2545" },
  { x: 82, y: 252, w: 12, h: 15, color: "#1e2545" },
  { x: 22, y: 284, w: 12, h: 15, color: "#1e2545" },
  { x: 52, y: 284, w: 12, h: 15, color: WARM_DIM },
  { x: 160, y: 228, w: 11, h: 14, color: "#1e2545" },
  { x: 188, y: 228, w: 11, h: 14, color: WARM_HOT },
  { x: 216, y: 228, w: 11, h: 14, color: "#1e2545" },
  { x: 160, y: 258, w: 11, h: 14, color: "#1e2545" },
  { x: 216, y: 258, w: 11, h: 14, color: "#1e2545" },
  { x: 296, y: 266, w: 11, h: 14, color: "#1e2545" },
  { x: 324, y: 266, w: 11, h: 14, color: "#1e2545" },
  { x: 352, y: 266, w: 11, h: 14, color: "#1e2545" },
  { x: 420, y: 236, w: 11, h: 14, color: "#1e2545" },
  { x: 448, y: 236, w: 11, h: 14, color: "#1e2545" },
  { x: 476, y: 236, w: 11, h: 14, color: "#1e2545" },
  { x: 690, y: 262, w: 12, h: 15, color: WARM },
  { x: 720, y: 262, w: 12, h: 15, color: "#1e2545" },
  { x: 750, y: 262, w: 12, h: 15, color: "#1e2545" },
  { x: 690, y: 292, w: 12, h: 15, color: "#1e2545" },
  { x: 750, y: 292, w: 12, h: 15, color: WARM_DIM },
  { x: 806, y: 234, w: 11, h: 14, color: "#1e2545" },
  { x: 834, y: 234, w: 11, h: 14, color: WARM_HOT },
  { x: 862, y: 234, w: 11, h: 14, color: "#1e2545" },
  { x: 806, y: 266, w: 11, h: 14, color: "#1e2545" },
];
WINDOWS.forEach((win, i) => {
  scene.add(
    sketch.loop(rect(win.x, win.y, win.x + win.w, win.y + win.h), {
      color: "#00000000",
      weight: "light",
      looseness: 0.06,
      smooth: false,
      fill: { color: win.color, style: "solid" },
    })
  ).appear({ at: 0.2 + i * 0.03, duration: 0.5 });
});

// The one real light in the frame: a lit ground-floor shopfront. Placed AHEAD of where the
// walk stops (the figure ends at x 560, the window is at 596..656) — the same "still
// approaching the landmark" composition quiet-ride.ts settled on, rather than arriving at it.
const SHOP_X0 = 596;
const SHOP_X1 = 656;
const SHOP_TOP = 258;
// Halo passes before the window itself, so the glow sits UNDER the light rather than over
// it. Concentric ELLIPSES, not padded rects: there's no radial gradient in this library, so
// a soft falloff has to be faked with a few nested shapes — and a padded rect reads as a
// rounded rectangle sitting on the wall (it did, on the first render), where nested ovals at
// low alpha read as light. No stroke on any of them: a halo with an outline is a shape.
const SHOP_CX = (SHOP_X0 + SHOP_X1) / 2;
for (const [rx, ry, alpha] of [
  [96, 82, "07"],
  [82, 70, "08"],
  [68, 58, "09"],
  [56, 48, "0b"],
  [44, 38, "0d"],
] as [number, number, string][]) {
  scene.add(
    sketch.loop(ellipsePoints(SHOP_CX, 292, rx, ry, 24), {
      color: "#00000000",
      weight: "light",
      looseness: 0.2,
      fill: { color: `#f0b96a${alpha}`, style: "solid" },
    })
  ).appear({ at: 0.6, duration: 1.2 });
}
scene.add(
  sketch.loop(rect(SHOP_X0, SHOP_TOP, SHOP_X1, 322), {
    color: WARM_DIM,
    weight: "light",
    looseness: 0.05,
    smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#f7d59a" }, { offset: 1, color: "#cf9048" }], direction: "vertical" },
      style: "solid",
    },
  })
).appear({ at: 0.6, duration: 1.2 });
// One mullion, so the shopfront reads as glass and not as a glowing brick.
scene.add(
  sketch.stroke(
    [
      [SHOP_X0 + 30, SHOP_TOP + 2],
      [SHOP_X0 + 30, 320],
    ],
    { color: "#8a5f33", weight: "light", looseness: 0.1 }
  )
).appear({ at: 0.9, duration: 0.6 });

// Street-level rain mist, in front of the near buildings. This is the readability fix: it
// lifts the value of the 240..352 band — exactly where the umbrella and head sit — so a
// near-black silhouette has something to be dark against. Cool, and it fades to nothing
// upward so it never looks like a pasted rectangle.
scene.add(
  sketch.loop(rect(-40, 236, WORLD_W + 40, CURB_Y + 6), {
    color: "#00000000",
    weight: "light",
    smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#4a578000" }, { offset: 1, color: "#5b6a9a3c" }], direction: "vertical" },
      style: "solid",
    },
  })
).appear({ at: 0, duration: 0.01 });

// Sidewalk band + wet road. The CURB is the one thing in the scene that draws itself on —
// one long horizontal pen pass across the frame, the same opening gesture quiet-crossing.ts
// uses for its embankment.
//
// The road slab deliberately does NOT drawOn, and that's worth writing down: drawOn reveals
// a closed shape's interior through a boustrophedon scribble mask whose row COUNT is capped
// at 16 (see renderer.ts's applyDrawOn) while its stroke width comes from the shape's own
// pen weight. Past roughly 160px of height those two stop matching — a 228px-tall slab at
// weight "light" gets 16 rows spaced 14.25px apart drawn with a 10.2px-wide mask stroke, so
// ~4px of every row is never unmasked, permanently. The first render of this scene came back
// with the whole wet road ruled in evenly spaced horizontal stripes because of exactly that
// (measured: bright bands every 14px, which is 228/16). Reveal a slab this size with
// appear(), or keep drawOn for shapes short enough that the rows genuinely overlap — the
// 22px curb band below is fine.
scene.add(
  sketch.loop(rect(-40, CURB_Y, WORLD_W + 40, ROAD_Y), {
    color: "#191e3a",
    weight: "light",
    looseness: 0.08,
    smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#2b3358" }, { offset: 1, color: "#1b2140" }], direction: "vertical" },
      style: "solid",
    },
  })
).drawOn({ at: 0, duration: 1.1 });
scene.add(
  sketch.loop(rect(-40, ROAD_Y, WORLD_W + 40, WORLD_H + 20), {
    color: "#00000000",
    weight: "light",
    smooth: false,
    fill: {
      // Lightest right at the road line (where the sky and the buildings' light land on the
      // wet surface) and darkest toward the viewer — the reverse of a dry road, and what
      // makes asphalt read as WET before a single reflection is drawn on it.
      color: { stops: [{ offset: 0, color: "#2a3157" }, { offset: 0.45, color: "#1a2040" }], direction: "vertical" },
      style: "solid",
    },
  })
).appear({ at: 0.15, duration: 1.3 });

// --- Reflections: the near skyline's own rects, mirrored about ROAD_Y and squashed. Not a
// reflection simulation — the same geometry, flipped, darkened, and roughed up. Squash 0.42
// because a 1:1 mirror of a 120px-tall block reaches 120px down the road and reads as a
// second city rather than as a reflection.
const MIRROR_SQUASH = 0.42;
for (const [x0, x1, top] of NEAR_BLOCKS) {
  const depth = (CURB_Y - top) * MIRROR_SQUASH;
  scene.add(
    sketch.loop(rect(x0 + 4, ROAD_Y, x1 - 4, ROAD_Y + depth), {
      color: "#00000000",
      weight: "light",
      looseness: 0.35,
      // smooth:false matters here specifically: a 4-corner rect splined through its own
      // corners (the default) comes out as an oval, and a mirrored skyline made of ovals
      // reads as a row of random dark blobs on the road instead of as buildings. Vertical
      // edges aligned with the building above are the whole reflection cue.
      smooth: false,
      fill: {
        color: { stops: [{ offset: 0, color: "#0c1024bb" }, { offset: 1, color: "#131a3300" }], direction: "vertical" },
        style: "solid",
      },
    })
  ).appear({ at: 1.4, duration: 1.4 });
}

// Warm window light smeared down the wet road: one soft vertical streak per lit window,
// same x, high looseness so the edges break up like water. This is the second half of the
// "one warm accent" idea — the light appears twice, and the palette stays cool everywhere
// the light isn't.
const LIT = WINDOWS.filter((w) => w.color === WARM || w.color === WARM_HOT || w.color === WARM_DIM);
for (const win of LIT) {
  const cx = win.x + win.w / 2;
  const len = (ROAD_Y - (win.y + win.h)) * 0.55;
  const hot = win.color === WARM_HOT;
  scene.add(
    sketch.loop(rect(cx - win.w * 0.42, ROAD_Y, cx + win.w * 0.42, ROAD_Y + len), {
      color: "#00000000",
      weight: "light",
      looseness: 0.75,
      fill: {
        color: {
          stops: [
            { offset: 0, color: hot ? "#f6cd8e66" : "#dfa55f4d" },
            { offset: 1, color: "#dfa55f00" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    })
  ).appear({ at: 1.6, duration: 1.6 });
}

// The shopfront's own spill: a widening wedge of light across the road (smooth:false so the
// wedge keeps real straight edges) plus a brighter core inside it.
scene.add(
  sketch.loop(
    [
      [SHOP_X0 - 2, ROAD_Y],
      [SHOP_X1 + 2, ROAD_Y],
      [SHOP_X1 + 56, WORLD_H],
      [SHOP_X0 - 56, WORLD_H],
    ],
    {
      color: "#00000000",
      weight: "light",
      looseness: 0.3,
      smooth: false,
      fill: {
        color: { stops: [{ offset: 0, color: "#e8ac6244" }, { offset: 1, color: "#e8ac6200" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 1.2, duration: 1.6 });
scene.add(
  sketch.loop(
    [
      [SHOP_X0 + 12, ROAD_Y],
      [SHOP_X1 - 12, ROAD_Y],
      [SHOP_X1 + 6, 500],
      [SHOP_X0 - 6, 500],
    ],
    {
      color: "#00000000",
      weight: "light",
      looseness: 0.6,
      smooth: false,
      fill: {
        color: { stops: [{ offset: 0, color: "#f6cf9166" }, { offset: 1, color: "#f6cf9100" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 1.4, duration: 1.6 });

// Puddles: standing water reads as a LIGHTER patch than wet asphalt (it mirrors the bright
// overcast sky), so these go slightly up-value with a thin brighter rim, not down-value.
const PUDDLES: [number, number, number, number][] = [
  [405, 470, 92, 15],
  [690, 424, 62, 10],
  [206, 428, 54, 9],
  [860, 462, 74, 12],
];
for (const [cx, cy, rx, ry] of PUDDLES) {
  const warmish = cx > SHOP_X0 - 80 && cx < SHOP_X1 + 80;
  scene.add(
    sketch.loop(ellipsePoints(cx, cy, rx, ry), {
      // Stroke fully transparent: a rough.js outline on standing water read as a bright
      // jagged rim, more like an ice patch than a puddle. The fill's own value step against
      // the asphalt is enough of an edge.
      color: "#00000000",
      weight: "light",
      looseness: 0.28,
      fill: {
        color: {
          stops: [
            { offset: 0, color: warmish ? "#8c7a7799" : "#3d4b7b99" },
            { offset: 1, color: "#232b4e99" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    })
  ).appear({ at: 1.8, duration: 1.2 });
}

// Rain landing on standing water: a flattened ring that expands and fades out. Each ripple is
// one node doing one cycle (a scaleTo plus a fadeTo it outlives), so "repeating" is just
// several nodes at different `at` values on the same puddle — there's no loop primitive here,
// and hand-placing six beats is both cheaper and easier to choreograph against the walk than
// faking one. The stroke thickens slightly as it expands (SVG scale scales stroke-width,
// where a real ripple thins) — visible only if you go looking for it at this size.
const RIPPLES: [number, number, number, boolean][] = [
  [405, 470, 2.6, false],
  [690, 424, 4.3, true],
  [206, 428, 3.4, false],
  [405, 470, 6.4, false],
  [690, 424, 9.2, true],
  [405, 470, 10.9, false],
];
for (const [cx, cy, at, warm] of RIPPLES) {
  const ring = sketch.loop(ellipsePoints(cx, cy, 9, 3, 18), {
    color: warm ? "#d6ab7c" : "#93a7cf",
    weight: 0.6,
    looseness: 0.15,
  });
  scene.add(ring).initial({ opacity: 0 });
  ring.fadeTo(warm ? 0.5 : 0.42, { at, duration: 0.14, ease: "none" });
  ring.scaleTo(4.2, { at, duration: 1.6, ease: "sine.out" });
  ring.fadeTo(0, { at: at + 0.14, duration: 1.4, ease: "sine.out" });
}

// --- Streetlamp. Cooler and dimmer than the shopfront on purpose: two warm sources at the
// same intensity would cancel the "one accent" idea. It starts near the left of frame and
// drifts out of it as the camera travels — the parallax payoff of panning at all.
const LAMP_X = 210;
const lamp = sketch.group();
scene.add(lamp);
lamp.add(
  sketch.loop(
    [
      [LAMP_X - 3, 344],
      [LAMP_X + 3, 344],
      [LAMP_X + 1.6, 170],
      [LAMP_X - 1.6, 170],
    ],
    { color: SIL, weight: "light", looseness: 0.1, smooth: false, fill: { color: SIL, style: "solid" } }
  )
);
lamp.add(
  sketch.stroke(
    [
      [LAMP_X, 172],
      [LAMP_X + 16, 164],
      [LAMP_X + 30, 166],
    ],
    { color: SIL, weight: "light", looseness: 0.12 }
  )
);
lamp.add(
  sketch.loop(
    [
      [LAMP_X + 24, 167],
      [LAMP_X + 38, 167],
      [LAMP_X + 35, 180],
      [LAMP_X + 27, 180],
    ],
    { color: "#4c3d2c", weight: "light", looseness: 0.08, smooth: false, fill: { color: "#e7bd7e", style: "solid" } }
  )
);
lamp.appear({ at: 0.4, duration: 0.9 });
for (const [r, alpha] of [[26, "14"], [14, "22"]] as [number, string][]) {
  scene.add(
    sketch.loop(ellipsePoints(LAMP_X + 31, 174, r, r * 0.9, 20), {
      color: "#00000000",
      weight: "light",
      looseness: 0.25,
      fill: { color: `#f2c98a${alpha}`, style: "solid" },
    })
  ).appear({ at: 0.5, duration: 1.0 });
}
// Cone of light under the lamp — the volume the rain gets to fall through (see the warm
// emitter in the RAIN section).
scene.add(
  sketch.loop(
    [
      [LAMP_X + 26, 180],
      [LAMP_X + 37, 180],
      [LAMP_X + 84, 404],
      [LAMP_X - 22, 404],
    ],
    {
      color: "#00000000",
      weight: "light",
      looseness: 0.3,
      smooth: false,
      fill: {
        color: { stops: [{ offset: 0, color: "#f0c88a26" }, { offset: 1, color: "#f0c88a00" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 0.7, duration: 1.2 });

// ---------------------------------------------------------------------------------------
// The figure. Local space: y = 0 is ground contact under the feet, so initial({y: FEET_Y})
// plants it on the road (the "translate lands local-0 at the target canvas y" convention
// quiet-crossing.ts / quiet-ride.ts both use — NOT moveTo, which would land the group's
// bbox CENTER there and float the whole thing ~70px off the ground).
//
// Umbrella-specific structure worth knowing: the arm is fused into the coat's single
// outline (quiet-crossing.ts's hard-won lesson — a separately rotated limb detaches unless
// its pivot sits deep inside the body), and the grip point sits INSIDE that outline, which
// is what lets the umbrella subgroup rotate about the hand without any seam appearing where
// the shaft meets the body.
// ---------------------------------------------------------------------------------------
// The grip sits just forward of the body's centerline and well inside the coat outline (at
// y = -70 the coat spans roughly x -11..15) — deep enough inside that rotating the umbrella
// about it can't open a seam where the shaft crosses the shoulder. Tuned down twice from an
// initial x = 13 / 11-degree pair: at the canopy's 36px radius, every 1 degree of tilt walks
// the dome ~0.8px forward on top of the grip's own offset, and the first two renders both
// came back with the head sitting under the canopy's left RIM instead of near its center.
// Some forward offset is correct (that's what leaning into weather looks like); 20px was not.
const GRIP: [number, number] = [4, -70];
const UMBRELLA_TILT = 8; // degrees, canopy pitched forward into the wind (toward +x)

// Hem at -44 rather than -36: the legs need to be long enough that a 26px stride reads as a
// stride (a 44px leg swinging 20 degrees moves its foot 15px, so the two feet open to ~30px
// apart — matching the step), and a coat whose hem lands exactly where the legs start reads
// as a dress with a lump under it, which is what the first pass looked like. The hem carries
// two intermediate points so the closing spline can't hook outward at the back corner.
const COAT: [number, number][] = [
  [-5, -81],
  [3, -83],
  [11, -79],
  [16, -71],
  [12, -63],
  [15, -54],
  [16, -44],
  [6, -46],
  [-5, -46],
  [-14, -44],
  [-12, -62],
  [-8, -76],
];
// Canopy authored UPRIGHT around the shaft at x = 4 (the grip's own x), then tilted as a
// group: 5 rib tips at y = -118 with the fabric arcing up to -126 between them (the tips are
// the LOW points of a real scalloped edge and the dips between them are high, not the other
// way round), and a dome over the top.
const CANOPY: [number, number][] = [
  [-32, -118],
  [-28, -131],
  [-18, -140],
  [-5, -145],
  [8, -145],
  [21, -140],
  [32, -131],
  [40, -118],
  [31, -126],
  [22, -118],
  [13, -126],
  [4, -118],
  [-5, -126],
  [-14, -118],
  [-23, -126],
];

// TWO nested groups, and this is load-bearing rather than tidiness: `fig` only ever tweens
// HORIZONTAL travel, `body` only ever tweens the vertical step bob. Putting both on one node
// (a moveBy(STEP_DX, 0) for the step plus an overlapping moveBy(0, -bob) for the same window,
// which is the obvious way to write it) has the two tweens fighting over the same x/y
// transform — moveBy always writes BOTH axes, so the bob's own `x: "+=0"` sits on top of the
// travel tween and pins x wherever it was when the bob started. It renders correctly on a
// direct seek (GSAP resolves the whole timeline in one pass) and silently WRONG under
// monotonic playback, which is exactly what a --video export does: the first video render of
// this scene had the figure bobbing and swinging its legs while drifting BACKWARD with the
// camera pan, having advanced zero pixels of its own, and every still I'd checked looked
// perfect. Measured, not guessed — sampling video frames 60/180/300/420 gives the figure at
// frame x 242/197/158/112 with travel+bob on one node (pure camera drift, no walk) versus
// 244/298/325/374 with them split (260px of walk minus 140px of pan). Worth knowing that
// docs/showcase-quiet-crossing.mp4 pairs them on one node the same way and has the same
// frozen-x walk in its shipped video, so this is a library-wide authoring trap rather than
// anything specific to this scene. (When sampling frames to check this kind of thing, pass
// ffmpeg `-fps_mode passthrough` — a plain `select` filter pads back up to CFR by duplicating
// the first selected frame, which makes every sample look identical and reads as a much more
// dramatic bug than it is. That cost a full round of wrong conclusions here.)
const fig = sketch.group();
scene.add(fig);
const body = sketch.group();
fig.add(body);

const legL = sketch.loop(
  [
    [2, -44],
    [-6, -44],
    [-9, 0],
    [0, 0],
  ],
  { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" } }
);
legL.pivotAt(-2, -44);
const legR = sketch.loop(
  [
    [-2, -44],
    [6, -44],
    [9, 0],
    [0, 0],
  ],
  { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" } }
);
legR.pivotAt(2, -44);
body.add(legL);
body.add(legR);
body.add(
  sketch.loop(COAT, { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" } })
);
body.add(sketch.blob(3, -92, 8, { color: SIL, weight: "confident", looseness: 0.08, fill: { color: SIL, style: "solid" } }, 12));

const umbrella = sketch.group();
body.add(umbrella);
umbrella.add(
  sketch.stroke(
    [
      [4, -122],
      [4, -64],
    ],
    { color: SIL, weight: "confident", looseness: 0.08 }
  )
);
umbrella.add(
  sketch.loop(CANOPY, { color: SIL, weight: "confident", looseness: 0.09, fill: { color: SIL, style: "solid" } })
);
umbrella.add(
  sketch.stroke(
    [
      [1, -146],
      [1, -155],
    ],
    { color: SIL, weight: "light", looseness: 0.1 }
  )
);
umbrella.pivotAt(GRIP[0], GRIP[1]).initial({ rotation: UMBRELLA_TILT });

// Water running off the rim. These are children of the figure's own group, so they travel
// with the walk instead of being emitted at fixed world points — the drops do get dragged
// sideways with the figure a little (~12px over a drop's 0.5s life at this walking speed),
// which is a real inaccuracy of parenting an emitter to a moving node, and invisible at
// this scale. Spawn points are the rim tips AFTER the 8-degree tilt, worked out by hand
// (rotating each tip about GRIP) rather than read off the untilted CANOPY points.
for (const [dx, dy, n] of [[46, -113, 16], [11, -117, 12], [-24, -122, 12]] as [number, number, number][]) {
  body.add(
    sketch.particles(
      dx,
      dy,
      { color: "#a9bce0", looseness: 0, weight: 0.8 },
      {
        count: n,
        angle: 92,
        spread: 14,
        speedMin: 30,
        speedMax: 80,
        gravity: 700,
        lifetime: 0.5,
        duration: TOTAL - WALK_START,
        at: WALK_START,
        sizeMin: 0.7,
        sizeMax: 1.3,
        fade: false,
      }
    )
  );
}

// The figure's own reflection: the coat and canopy outlines mirrored about the feet line and
// squashed harder than the buildings are (0.33 vs 0.42 — a nearer object's reflection
// foreshortens more), then dropped nearly to the road's own value so it reads as a
// disturbance in the water rather than a second figure standing upside down. It gets the
// same moveBy chain as the walker below, which is what keeps the two locked together.
const MIRROR_FIG = 0.33;
function mirrored(pts: [number, number][], k: number, shiftX = 0): [number, number][] {
  return pts.map(([x, y]) => [x + shiftX, -y * k] as [number, number]);
}
const reflection = sketch.group();
scene.add(reflection);
reflection.add(
  sketch.loop(
    [
      [-9, 0],
      [9, 0],
      [8, 15],
      [-8, 15],
    ],
    { color: "#00000000", weight: "light", looseness: 0.5, fill: { color: "#070a18aa", style: "solid" } }
  )
);
reflection.add(
  sketch.loop(mirrored(COAT, MIRROR_FIG), {
    color: "#00000000",
    weight: "light",
    looseness: 0.55,
    fill: { color: "#070a1899", style: "solid" },
  })
);
// +6px of x shift approximates where the tilted canopy actually sits, without re-deriving
// the rotation for the mirror.
reflection.add(
  sketch.loop(mirrored(CANOPY, MIRROR_FIG, 6), {
    color: "#00000000",
    weight: "light",
    looseness: 0.6,
    fill: { color: "#070a1877", style: "solid" },
  })
);

fig.initial({ x: START_X, y: FEET_Y });
reflection.initial({ x: START_X, y: FEET_Y });
fig.appear({ at: WALK_START - 0.5, duration: 0.5 });
reflection.appear({ at: WALK_START - 0.5, duration: 0.5 });

// A slow weighted gait: long sine-eased steps, a shallow vertical bob, no squashTo anywhere.
// Weather adds two things on top of quiet-crossing.ts's walk — the umbrella sways a couple
// of degrees against the gusts, and the whole figure leans a hair further forward on the
// steps where the gust is strongest.
for (let i = 0; i < STEPS; i++) {
  const at = WALK_START + i * STEP_DUR;
  fig.moveBy(STEP_DX, 0, { at, duration: STEP_DUR, ease: "sine.inOut" });
  // Bob goes on `body`, never on `fig` — see the two-group note above.
  body.moveBy(0, -2.5, { at, duration: STEP_DUR / 2, ease: "sine.out" });
  body.moveBy(0, 2.5, { at: at + STEP_DUR / 2, duration: STEP_DUR / 2, ease: "sine.in" });
  reflection.moveBy(STEP_DX, 0, { at, duration: STEP_DUR, ease: "sine.inOut" });
  legL.rotateTo(i % 2 === 0 ? 20 : -20, { at, duration: STEP_DUR, ease: "sine.inOut" });
  legR.rotateTo(i % 2 === 0 ? -20 : 20, { at, duration: STEP_DUR, ease: "sine.inOut" });
}
for (let i = 0; i < 4; i++) {
  const at = WALK_START + 0.6 + i * 2.9;
  umbrella.rotateTo(i % 2 === 0 ? UMBRELLA_TILT + 3.5 : UMBRELLA_TILT - 2.5, {
    at,
    duration: 2.9,
    ease: "sine.inOut",
  });
}

// ---------------------------------------------------------------------------------------
// RAIN. Two parallax depths of emitters plus one warm emitter inside the lamp cone.
//
// The tuning that matters, and why:
//   * fade: false. The default opacity ramp fades every particle out after 60% of its
//     lifetime, which for rain means drops politely vanishing in mid-air halfway down the
//     frame. Instead every drop spawns at y = -40 (above the viewport's own top edge at
//     y = 60) and its lifetime is set so it dies below the bottom edge at y = 500 — both the
//     pop-in and the pop-out happen off-screen, so no fade is needed or wanted.
//   * angle 100 (down, slightly to screen-left) — the wind is in the walker's face, which
//     is the same wind the umbrella is tilted forward against. One wind direction, two cues.
//   * BOTH depths are > 1. A rain layer at depth 0.6 (the intuitive "distant rain" value)
//     paints BEFORE the depth-1 plane, so the whole city, road and mist sit on top of it and
//     the only drops that survive are the handful crossing open sky above the rooftops —
//     which is exactly how the first render came back. Layer depth is paint order as well as
//     parallax rate here, so "far" rain has to be sold by size/value/speed instead, at a
//     depth just above 1 (1.06 vs 1.3 still gives the two sheets different pan rates).
//   * weight is set explicitly, and small. A particle is drawn as a rough.js circle using
//     the emitter style's own pen weight, so the default ("confident", 3px) renders a 2px
//     drop as a ~7px sketchy blob — the first pass read as falling snow/bokeh, not rain.
//   * count is big; per-frame cost is not. buildParticles only draws the drops alive at t,
//     so ~2400 authored drops across 21 emitters is ~175 circles per frame.
// ---------------------------------------------------------------------------------------
const RAIN_ANGLE = 100;
const midRain = scene.layer(1.06);
let sheetIdx = 0;
for (let x = -60; x <= WORLD_W + 60; x += 100) {
  // Staggered stop times across EASE_OFF — see the RAIN_TAIL note at the top of the file.
  const stop = TOTAL - (sheetIdx++ % 5) * (EASE_OFF / 5);
  midRain.add(
    sketch.particles(
      x,
      -40,
      { color: "#6b7ba8", looseness: 0, weight: 0.4 },
      {
        count: 210,
        angle: RAIN_ANGLE,
        spread: 7,
        speedMin: 400,
        speedMax: 480,
        gravity: 110,
        lifetime: RAIN_LIFETIME,
        duration: stop,
        at: 0,
        sizeMin: 0.4,
        sizeMax: 0.72,
        fade: false,
      }
    )
  );
}
const nearRain = scene.layer(1.3);
let nearIdx = 0;
for (let x = -60; x <= WORLD_W + 60; x += 165) {
  const stop = TOTAL - (nearIdx++ % 4) * (EASE_OFF / 4);
  nearRain.add(
    sketch.particles(
      x,
      -40,
      { color: "#9dafd6aa", looseness: 0, weight: 0.6 },
      {
        count: 46,
        angle: RAIN_ANGLE,
        spread: 9,
        speedMin: 600,
        speedMax: 720,
        gravity: 130,
        lifetime: 0.9,
        duration: stop,
        at: 0,
        sizeMin: 0.7,
        sizeMax: 1.05,
        fade: false,
      }
    )
  );
}
// Streaks — the actual "this is rain, not snow" cue, and the one thing particles alone
// genuinely can't do here: a particle renders as a rough.js CIRCLE, so however small and fast
// it is, a still frame shows round specks (the first two passes of this scene read as sleet
// for exactly that reason). A rain streak is a short line, so these are plain strokes angled
// along the same RAIN_ANGLE, each looping a fall-then-jump-back cycle: moveBy over
// STREAK_FALL seconds to travel from above the top edge to below the bottom one, then a
// duration-0 moveBy of the exact negative, which lands instantly and off-screen where nobody
// can see the reset. 26 streaks recycled ~20 times each keeps the DOM (and the per-frame
// line-boil pass) small; ~390 one-shot streaks would look identical and cost 15x the nodes.
const STREAK_FALL = 0.8;
// A streak's rest position has to sit ABOVE the viewport (which starts at y = 60, since the
// camera holds CAM_CY dead center of a world 120px taller) but still INSIDE the world: Tier 0
// lint reads authored geometry, not animated transforms, so parking these at y = -70 like the
// particle emitters raised a real "renders fully off-canvas" error on every render. y0 lands
// in 6..38 instead — invisible at rest, clean under lint — and the fall is sized to carry the
// tail well past y = 500 from there.
const STREAK_DY = 560;
const STREAK_DX = -STREAK_DY * Math.tan(((RAIN_ANGLE - 90) * Math.PI) / 180);
const streakLayer = scene.layer(1.18);
for (let i = 0; i < 26; i++) {
  // Deterministic scatter, not Math.random: the same rain every render, like every other
  // seeded thing in this library.
  const jitter = ((i * 7919) % 997) / 997;
  const x0 = 30 + i * 39 + jitter * 26;
  const y0 = 6 + ((i * 13) % 3) * 16;
  const fall = STREAK_FALL * (0.86 + jitter * 0.28);
  const len = 13 + jitter * 7;
  const streak = sketch.stroke(
    [
      [x0, y0],
      [x0 - len * 0.176, y0 + len],
    ],
    { color: "#a6b9e0aa", weight: 0.9, looseness: 0.04 }
  );
  streakLayer.add(streak);
  // Each streak also retires at its own moment inside the ease-off window, so the streaks
  // stop one by one rather than all at once — and no cycle ever runs past RAIN_TAIL.
  const cycles = Math.floor((RAIN_TAIL - jitter * EASE_OFF - jitter * fall) / fall);
  for (let c = 0; c < cycles; c++) {
    const at = jitter * fall + c * fall;
    streak.moveBy(STREAK_DX, STREAK_DY, { at, duration: fall, ease: "none" });
    streak.moveBy(-STREAK_DX, -STREAK_DY, { at: at + fall, duration: 0 });
  }
}

// The same rain, lit: one warm emitter aimed down the lamp cone, dying at the bottom of it.
scene.add(
  sketch.particles(
    LAMP_X + 32,
    182,
    { color: "#e8c391", looseness: 0, weight: 0.7 },
    {
      count: 90,
      angle: RAIN_ANGLE,
      spread: 12,
      speedMin: 420,
      speedMax: 520,
      gravity: 120,
      lifetime: 0.44,
      // at + duration + lifetime lands exactly on RAIN_TAIL, so this emitter rides the
      // timeline to its very end without being the thing that extends it.
      duration: RAIN_TAIL - 0.8 - 0.44,
      at: 0.8,
      sizeMin: 0.8,
      sizeMax: 1.5,
      fade: false,
    }
  )
);
// Rain hitting the road: tiny short-lived upward flecks, fade ON here (a splash genuinely
// should appear and vanish in place, unlike a falling drop).
for (const [sx, sy, color] of [
  [300, 486, "#7b8db6"],
  [405, 468, "#8fa2c8"],
  [620, 452, "#c99f70"],
  [852, 470, "#7b8db6"],
] as [number, number, string][]) {
  scene.add(
    sketch.particles(
      sx,
      sy,
      { color, looseness: 0, weight: 0.6 },
      {
        count: 54,
        angle: -90,
        spread: 130,
        speedMin: 18,
        speedMax: 58,
        gravity: 320,
        lifetime: 0.34,
        duration: RAIN_TAIL - 0.4 - 0.34,
        at: 0.4,
        sizeMin: 0.6,
        sizeMax: 1.2,
      }
    )
  );
}

// ---------------------------------------------------------------------------------------
// Camera: one slow lateral drift, no zoom. panTo takes an ABSOLUTE scene-space point to
// center on (not a delta), so the drift is authored as two real points either side of the
// world's own center, with the duration-0 op first to set the opening frame.
// ---------------------------------------------------------------------------------------
const cam = scene.camera();
cam.panTo(CAM_X_START, CAM_CY, { at: 0, duration: 0 });
cam.panTo(CAM_X_END, CAM_CY, { at: 0.2, duration: RAIN_TAIL - 0.2, ease: "sine.inOut" });

// ---------------------------------------------------------------------------------------
// Score: the same three-voice restraint as the other two quiet scenes, retuned cold. A low
// pad drone holds the whole shot; "brush" hits every 0.42s alternating across the stereo
// field are the rain itself (sketchling has no noise-bed voice, but a dense enough sequence
// of soft brushes IS one); one distant "thud" for thunder that never arrives; and a sparse
// minor-key piano figure instead of quiet-crossing.ts's waltz.
// ---------------------------------------------------------------------------------------
scene.add(sketch.sound("A2", { at: 0, duration: RAIN_TAIL, instrument: "pad", velocity: 0.15 }));
scene.add(sketch.sound("E2", { at: 0, duration: RAIN_TAIL, instrument: "pad", velocity: 0.1 }));
const HISS_STEP = 0.42;
for (let i = 0; 0.1 + i * HISS_STEP < RAIN_TAIL - 0.45; i++) {
  scene.add(
    sketch.sound(null, {
      at: 0.1 + i * HISS_STEP,
      duration: 0.4,
      instrument: "brush",
      velocity: 0.055 + (i % 3) * 0.012,
      pan: i % 2 === 0 ? -0.35 : 0.3,
    })
  );
}
scene.add(sketch.sound(null, { at: 4.6, duration: 1.8, instrument: "thud", velocity: 0.2, pan: 0.4 }));
const motif: [string, number][] = [
  ["A3", 0],
  ["E4", 1.3],
  ["C4", 2.2],
  ["F3", 4.4],
  ["C4", 5.6],
  ["A3", 6.3],
  ["G3", 8.5],
  ["D4", 9.7],
  ["B3", 10.4],
];
for (const [pitch, offset] of motif) {
  scene.add(sketch.sound(pitch, { at: WALK_START + offset, duration: 1.1, instrument: "piano", velocity: 0.26 }));
}
scene.add(sketch.sound("A2", { at: WALK_END, duration: RAIN_TAIL - WALK_END, instrument: "strings", velocity: 0.2 }));

export default scene;
