import { sketch } from "../../src/index.js";
import type { Group } from "../../src/core/group.js";
import type { Limb } from "../../src/core/limb.js";
import type { Scene } from "../../src/core/scene.js";
import type { Stroke } from "../../src/core/stroke.js";

// "The Lantern Maker" — a 2:57 short in nine scenes, cut together with sketch.film().
//
// An elderly artisan spends an evening making one paper lantern (cutting, folding, painting,
// lighting it), then carries it out through a darkening town to a bridge and lets it go.
// Beginning (the workshop and the craft), middle (the finished lantern, the walk), end (the
// release, and the lantern small against the dark).
//
// Two things this piece is deliberately trying to do better than the earlier showcase work:
//
// 1. HANDS THAT AREN'T RIGID. Every character animation in this repo so far was built from
//    rotateTo/moveTo on `sine.inOut`, which reads as a limb arriving at its target and
//    dead-stopping. Nothing here does that. The craft scenes drive both arms as 2-bone IK
//    chains (sketch.limb + .ikTo), so the hand LEADS and the elbow is re-solved behind it
//    every frame instead of two segments being interpolated independently; the ease is picked
//    per motion (a blade draw is `power3.out`, a press is `power4.out` answered a beat later
//    by a `back.out(2.4)` recoil, a patient fold is `power2.inOut`, a brush dab is
//    `back.out(3)`), never one ease for everything; and every commit-and-settle gesture is
//    followed by a small counter-move at the wrist, so the hand overshoots and comes back
//    rather than stopping dead. The three things that genuinely hang off the hand — the brush,
//    the bamboo strip, the carried lantern — are real damped springs (`springTo`) attached
//    with `sketch.connector`, so the brush shaft bows as the tip drags, the strip whips when
//    it's bent, and the lantern lags and sways while it's carried. `connector`'s anchor is a
//    FIXED scene point, and that shaped the staging rather than being worked around: the
//    painting beat keeps the wrist deliberately still and sweeps only the tip (which is how a
//    brush is actually held), and the bamboo strip is pinned to the bench — in both cases
//    there genuinely is a fixed end for the connector to bow away from.
//
// 2. ONE LIGHT SOURCE PER SCENE, driving the whole palette (the instinct campfire-story.ts
//    and lighthouse-watch.ts proved out). The workshop is lit by one hanging oil lamp: warm
//    on the lamp side of every form, cool only where the dusk window competes with it, and a
//    warm rim along the artisan's lamp-facing contour. Outdoors the world cools to
//    blue-violet and the lantern itself becomes the only warm thing in frame. All of it
//    through sketch.shade()/gradient fills rather than flat color, so a form has a lit side
//    and a shadow side instead of one tone.
//
// The artisan and the lantern are built ONCE (buildArtisan / buildLantern below) and reused
// in every scene they appear in, so it stays the same character and the same object all the
// way through — the same reason examples/story/_shared.ts exists for "Pip and the Sapling".
//
// Register note: naturalistic proportions, no cartoon eyes, no flat mascot shapes. The face
// is a profile — brow, nose, beard — drawn only where the framing is close enough to earn it,
// and in shadow everywhere else. look: "ink" + texture: "grain" throughout, the same
// storybook register quiet-crossing.ts / campfire-story.ts settled on.
//
// Three things found the hard way while building this, all worth knowing before authoring
// something at this length (each is also commented at the place it bit):
//
//   - drawOn on a CLOSED filled shape taller than ~160px keeps thin horizontal gaps in it
//     permanently, not just during the reveal. The reveal mask's interior zigzag is clamped to 16
//     rows while its stroke width stays tied to the shape's outline weight, so past that height
//     the rows stop overlapping. Use appear() for anything bigger. (Scene 3's paper sheet.)
//   - Two `moveBy` calls that OVERLAP in time on the same node fight each other, because every
//     moveBy tweens x and y together: a bob authored as its own `moveBy(0, -3)` across a stride
//     also animates `x: "+=0"`, and the later tween pins x to whatever it captured. A walk built
//     that way covers about a tenth of the ground it should. Fold the bob into the stride.
//     (Scene 7's gait.)
//   - `springTo` overwrites its node's translate every frame, so a springable object cannot be
//     placed with `initial({x, y})` — author it in absolute coordinates instead, or it snaps to
//     the canvas origin the moment the spring takes over. (buildLantern.)

type Pt = [number, number];

const W = 640;
const H = 420;

// Deterministic hash instead of Math.random — every render gets the same stars, the same
// flame flicker, the same ripples, like every other seeded thing in this library.
function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 3.7) * 43758.5453;
  return x - Math.floor(x);
}

// blob() keeps a ~15%-of-radius wobble floor even at looseness 0, so anything that has to
// read as a clean disc/ellipse at size (glow pools, heads, the lantern's rims and body) is a
// hand-plotted trig ellipse through loop() instead.
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n = 24): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

// An open arc — a rim-light stroke hugging one side of a head, a bridge span, a lantern hoop.
function arcPoints(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 10): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

const CLEAR = "#00000000";

// --- Palette -------------------------------------------------------------------------------
// Interior: one warm lamp against one cool window. Exterior: one warm lantern, everything
// else cooling toward blue-violet.
const INK = "#0e0a07";
const ROBE = "#241811";
const ROBE_DEEP = "#180f0a";
const SKIN = "#a9784a";
const RIM_WARM = "#e0a04ec0";
const LAMP_FLAME = "#ffe9b4";
const PAPER = "#dfc491";
const BAMBOO = "#9a7841";
const WOOD = "#5e3a1f";
const LANTERN_PAPER = "#e3bd71";

// --- A pool of warm light on a surface -----------------------------------------------------
// Concentric alpha-stepped ellipses, brightest at the source and falling off outward. A
// single linearGradient can't fall off radially from a point (it would light the pool's outer
// edges as brightly as its middle at the same y), and stacked low-alpha solids under
// texture: "grain" blend into a soft falloff. Returns the rings so the caller can fade them
// in with the lamp and breathe them with its flicker.
// looseness 0.04 and a high vertex count are both load-bearing: at the style defaults a
// 180px-wide glow ellipse comes back as a scalloped sunflower with a hard visible edge (the
// first render of this scene had exactly that around the lamp), and a pool of light is the one
// thing in the frame that must not read as a drawn shape at all.
function warmPool(scene: Scene, cx: number, cy: number, specs: [number, number, number, string][]): Stroke[] {
  const rings: Stroke[] = [];
  for (const [rx, ry, dy, col] of specs) {
    const ring = sketch.loop(ellipsePoints(cx, cy + dy, rx, ry, 44), {
      color: CLEAR,
      weight: "light",
      looseness: 0.04,
      energy: "calm",
      smooth: true,
      fill: { color: col, style: "solid" },
    });
    scene.add(ring).initial({ opacity: 0 });
    rings.push(ring);
  }
  return rings;
}

// --- The artisan ---------------------------------------------------------------------------
// ONE builder, reused in every scene he appears in. Authored in a local space whose origin is
// the WAIST (not the bbox centre, and not the feet) — a seated figure and a standing one share
// the same upper body from that point, and it's the natural pivot for a lean. All local units
// are multiplied by `s` at authoring time, so the group's own pre-translate space is already
// in pixels: initial({x, y}) then lands local (0, 0) exactly on (x, y), and scene→local is a
// plain subtraction (see `local` on the returned object, which is how every ikTo target below
// gets expressed in scene coordinates and converted once).
//
// Proportions are naturalistic and elderly: a stooped upper back (the shoulders sit forward of
// the waist), a head slightly forward of the spine, a short beard, hair tied at the nape. No
// eyes at all — a profile brow and nose only, and only when `face` is on (a close framing).
// The robe is a single silhouette with a light-direction gradient across it and a warm rim
// stroke down the lamp-facing contour, the cue that makes a dark shape read as lit rather than
// just dark.

const TORSO_UPPER: Pt[] = [
  [-7, -52], [5, -55], [13, -47],
  [16, -32], [18, -16], [19, 0],
  [-17, 0], [-16, -18], [-13, -36],
];
// Standing: the same shoulders, with the robe carried on down past the hip to a hem the legs
// swing out of.
const TORSO_ROBE: Pt[] = [
  [-7, -52], [5, -55], [13, -47],
  [16, -32], [18, -14], [20, 4], [21, 20],
  [-18, 20], [-17, 2], [-16, -16], [-13, -36],
];

const HEAD_C: Pt = [6, -66];
const HEAD_RX = 8;
const HEAD_RY = 9.5;
const SHOULDER_NEAR: Pt = [11, -49];
const SHOULDER_FAR: Pt = [2, -50];

interface ArtisanOpts {
  x: number;
  y: number;
  s?: number;
  facing?: 1 | -1;
  /** Which side of the frame the key light is on — picks the gradient direction and which
   * contour gets the warm rim. "none" for a fully backlit/unlit silhouette. */
  lit?: "left" | "right" | "none";
  /** The lit stop of the robe gradient — dimmer the further he is from the light. */
  warm?: string;
  legs?: boolean;
  /** A seated lower body — thighs forward off the waist, one shin down to the floor. Without it
   * a legless upper body only works when something (a bench) crops it. */
  seated?: boolean;
  face?: boolean;
  armLen?: [number, number];
  handColor?: string;
  /** Overrides the lit near-sleeve tone — dimmer when he's further from the light. */
  sleeveNear?: string;
  bendNear?: 1 | -1;
  bendFar?: 1 | -1;
}

interface Artisan {
  group: Group;
  armNear: Limb;
  armFar: Limb;
  legNear?: Stroke;
  legFar?: Stroke;
  /** Scene → the group's local (pre-translate) space, for ikTo targets and pivots. */
  local: (sx: number, sy: number) => Pt;
  /** Sets the group's rotation pivot from a LOCAL point. pivotAt() is documented as taking an
   * absolute canvas point, but the renderer subtracts the node's own initial translate from it
   * (see applyInitialTransform), so a translated group has to be given translate + local. */
  pivotLocal: (px: number, py: number) => void;
  headScene: Pt;
  shoulderNearScene: Pt;
  shoulderFarScene: Pt;
}

function buildArtisan(scene: Scene, o: ArtisanOpts): Artisan {
  const s = o.s ?? 1;
  const f = o.facing ?? 1;
  const lit = o.lit ?? "right";
  const warm = o.warm ?? "#4a2a13";
  const [l1, l2] = o.armLen ?? [26, 24];
  const P = (p: Pt): Pt => [p[0] * s * f, p[1] * s];

  const g = sketch.group();
  scene.add(g);

  // The warm stop is squeezed into the last ~28% of the form's width on the lit side: a wider
  // ramp floods the whole robe with mid-brown and it stops reading as a dark figure catching
  // one edge of lamplight (campfire-story.ts's own finding — light wrapping too far around a
  // form reads as a different object, not a brighter one).
  const bodyFill =
    lit === "none"
      ? { color: ROBE_DEEP, style: "solid" as const }
      : {
          color: {
            stops:
              lit === "right"
                ? [{ offset: 0, color: ROBE_DEEP }, { offset: 0.72, color: ROBE }, { offset: 1, color: warm }]
                : [{ offset: 0, color: warm }, { offset: 0.28, color: ROBE }, { offset: 1, color: ROBE_DEEP }],
            direction: "horizontal" as const,
          },
          style: "solid" as const,
        };

  // The NEAR sleeve is deliberately warmer than the robe, and that isn't a stylistic hedge: a
  // dark sleeve on a dark interior wall vanished completely in the first render of the workshop —
  // two hands floating in mid-air with no arms behind them. Physically it's the right call
  // anyway, since the top of a reaching forearm is the surface most square-on to a lamp hanging
  // above the bench. The far sleeve stays dark, which is also what separates the two arms.
  const limbStyle = {
    weight: Math.max(2.2, 6.4 * s),
    looseness: 0.16,
    energy: "calm" as const,
    smooth: true,
  };
  const sleeveNear = lit === "none" ? "#221610" : (o.sleeveNear ?? "#4e2f14");
  const sleeveFar = lit === "none" ? "#1b120c" : "#2c1c11";
  const handColor = o.handColor ?? (lit === "none" ? "#231a13" : SKIN);

  // Far arm first so it sits BEHIND the torso in paint order, near arm last so it sits in
  // front — the only depth cue two same-coloured arms on one body get.
  const armFar = sketch
    .limb(P(SHOULDER_FAR)[0], P(SHOULDER_FAR)[1], l1 * s, l2 * s, { ...limbStyle, color: sleeveFar }, {
      bend: o.bendFar ?? 1,
      capRadius: 3.2 * s,
      capColor: lit === "none" ? "#1b120c" : "#7c5530",
    })
    .restAt(14 * s * f, -14 * s);
  g.add(armFar);

  let legNear: Stroke | undefined;
  let legFar: Stroke | undefined;
  if (o.legs) {
    // Two tapered wedges hanging out of the robe hem, each pivoted at its OWN hip point so
    // rotateTo swings it from the hip rather than spinning it around its own bbox centre (the
    // root cause of the splayed-X legs quiet-crossing.ts documents). These are children with no
    // translate of their own, so their pivots are plain local points.
    legFar = sketch.loop([P([-3, 20]), P([6, 20]), P([8, 54]), P([-1, 54])], {
      color: ROBE_DEEP, weight: "confident", looseness: 0.12, smooth: true,
      fill: { color: ROBE_DEEP, style: "solid" },
    });
    legFar.pivotAt(P([2, 20])[0], P([2, 20])[1]);
    g.add(legFar);
    legNear = sketch.loop([P([3, 20]), P([-6, 20]), P([-8, 54]), P([0, 54])], {
      color: ROBE_DEEP, weight: "confident", looseness: 0.12, smooth: true,
      fill: { color: "#1f140e", style: "solid" },
    });
    legNear.pivotAt(P([-2, 20])[0], P([-2, 20])[1]);
    g.add(legNear);
  }

  if (o.seated) {
    // Thighs, then one visible shin. Drawn before the torso so the robe's hem overlaps the top
    // of the thigh rather than butting against it — the join is what would otherwise read as a
    // seam across the hip.
    g.add(
      sketch.loop([P([-15, -6]), P([18, -4]), P([31, 6]), P([33, 22]), P([4, 24]), P([-15, 16])], {
        color: "#17100b", weight: "confident", looseness: 0.12, smooth: true,
        fill: {
          color: lit === "none"
            ? ROBE_DEEP
            : { stops: [{ offset: 0, color: "#1d130d" }, { offset: 1, color: "#3d2412" }], direction: "vertical" as const },
          style: "solid",
        },
      })
    );
    g.add(
      sketch.loop([P([21, 20]), P([33, 20]), P([34, 30]), P([23, 30])], {
        color: "#17100b", weight: "confident", looseness: 0.12, smooth: true,
        fill: { color: ROBE_DEEP, style: "solid" },
      })
    );
  }

  const torso = sketch.loop((o.legs ? TORSO_ROBE : TORSO_UPPER).map(P), {
    color: lit === "none" ? ROBE_DEEP : "#1a110c",
    weight: "confident",
    looseness: 0.12,
    smooth: true,
    fill: bodyFill,
  });
  g.add(torso);

  const hx = P(HEAD_C)[0];
  const hy = P(HEAD_C)[1];
  const head = sketch.loop(ellipsePoints(hx, hy, HEAD_RX * s, HEAD_RY * s, 20), {
    color: lit === "none" ? ROBE_DEEP : "#1a110c",
    weight: "confident",
    looseness: 0.1,
    smooth: true,
    fill: bodyFill,
  });
  g.add(head);
  // Grey hair tied at the nape, and a short grey beard forward of the throat. Both are
  // deliberately PALE against the robe: at the robe's own value they were invisible, and with
  // them invisible the figure read as a young person with a topknot rather than as an old one —
  // the single most load-bearing detail in the character, since nothing else about a silhouette
  // says "elderly."
  const hairLit = lit === "none" ? "#443f39" : "#8b8173";
  const hairFill = lit === "none"
    ? { color: "#3e3a34", style: "solid" as const }
    : {
        color: {
          stops: lit === "right"
            ? [{ offset: 0, color: "#4a443c" }, { offset: 1, color: hairLit }]
            : [{ offset: 0, color: hairLit }, { offset: 1, color: "#4a443c" }],
          direction: "horizontal" as const,
        },
        style: "solid" as const,
      };
  g.add(
    sketch.loop(ellipsePoints(P([-6.5, -64.5])[0], P([-6.5, -64.5])[1], 4.7 * s, 4.2 * s, 12), {
      color: "#332e28", weight: "light", looseness: 0.16, smooth: true, fill: hairFill,
    })
  );
  g.add(
    sketch.loop([P([3, -60]), P([14, -57.5]), P([12, -42]), P([4, -49])], {
      color: "#332e28", weight: "light", looseness: 0.22, smooth: true, fill: hairFill,
    })
  );

  if (o.face) {
    // Profile only: a brow ridge and the bridge of a nose. No eye shape at all — at this scale
    // an eye is either a cartoon dot or a rendering job, and neither belongs in this register.
    g.add(sketch.stroke([P([9, -72.5]), P([15.4, -71])], { color: "#43290f", weight: Math.max(1, 1.3 * s), looseness: 0.2 }));
    g.add(sketch.stroke([P([13.6, -69]), P([17.2, -64.5]), P([13.2, -62.6])], { color: "#5e3c1a", weight: Math.max(1, 1.2 * s), looseness: 0.18, smooth: true }));
  }

  if (lit !== "none") {
    // Rim light down the lamp-facing contour of the head plus a short catch on the shoulder.
    // The rim is computed in UNMIRRORED local space and then mapped through P(), so a figure
    // authored facing left still catches the light on whichever side of the FRAME it's on.
    const litLocalRight = (lit === "right") === (f === 1);
    const a0 = litLocalRight ? -78 : 258;
    const a1 = litLocalRight ? 52 : 128;
    g.add(
      sketch.stroke(
        arcPoints(HEAD_C[0], HEAD_C[1], HEAD_RX * 1.06, HEAD_RY * 1.06, a0, a1, 9).map(P),
        { color: RIM_WARM, weight: Math.max(1, 1.7 * s), looseness: 0.12 }
      )
    );
    const shoulderRim: Pt[] = litLocalRight ? [[6, -54.5], [13.4, -46.5], [15.6, -34]] : [[4, -54.5], [-8, -52], [-13, -40]];
    g.add(sketch.stroke(shoulderRim.map(P), { color: RIM_WARM, weight: Math.max(1, 1.6 * s), looseness: 0.14, smooth: true }));
  }

  const armNear = sketch
    .limb(P(SHOULDER_NEAR)[0], P(SHOULDER_NEAR)[1], l1 * s, l2 * s, { ...limbStyle, color: sleeveNear }, {
      bend: o.bendNear ?? 1,
      capRadius: 3.6 * s,
      capColor: handColor,
    })
    .restAt(20 * s * f, -12 * s);
  g.add(armNear);

  g.initial({ x: o.x, y: o.y });

  return {
    group: g,
    armNear,
    armFar,
    legNear,
    legFar,
    local: (sx: number, sy: number) => [sx - o.x, sy - o.y],
    pivotLocal: (px: number, py: number) => {
      g.pivotAt(o.x + px, o.y + py);
    },
    headScene: [o.x + hx, o.y + hy],
    shoulderNearScene: [o.x + P(SHOULDER_NEAR)[0], o.y + P(SHOULDER_NEAR)[1]],
    shoulderFarScene: [o.x + P(SHOULDER_FAR)[0], o.y + P(SHOULDER_FAR)[1]],
  };
}

// --- The lantern ---------------------------------------------------------------------------
// The object the whole film is about, built once and reused from the moment it's finished
// (scene 5) through to the last frame. Authored directly in scene coordinates around (x, y) —
// see the note at the end of the builder for why a springable object can't use initial({x, y}).
//
// Two copies of the paper body are stacked: a cold one (lit only by whatever is around it) and
// a warm one (lit from inside) that fades in when the candle is lit — the difference between a
// paper shade and a paper shade with a flame in it is which side the light is coming from, not
// a brightness change, so a single fill couldn't do both.

interface LanternOpts {
  x: number;
  y: number;
  s?: number;
  lit?: boolean;
  /** Include the painted motif from scene 5 (everything after it was painted). */
  motif?: boolean;
  /** Scales every glow layer's opacity — the lantern reads dimmer at distance. */
  glowStrength?: number;
  /** Overrides the unlit paper tone. An unlit lantern in the dark part of a room is a dark
   * object, not a pale one — at the default it read as hanging cloth on the workshop shelf. */
  cold?: string;
}

interface Lantern {
  group: Group;
  /** Draw order: rims and ribs, for staggering a reveal. */
  parts: Stroke[];
  bodyCold: Stroke;
  bodyWarm: Stroke;
  glow: Stroke[];
  flame: Stroke;
  candle: Stroke;
}

function lanternBodyPoints(cx: number, cy: number, s: number): Pt[] {
  return ([
    [-15, -25], [-18, -13], [-19, 0], [-18, 13], [-15, 25],
    [15, 25], [18, 13], [19, 0], [18, -13], [15, -25],
  ] as Pt[]).map(([x, y]) => [cx + x * s, cy + y * s] as Pt);
}

function buildLantern(scene: Scene, o: LanternOpts): Lantern {
  const s = o.s ?? 1;
  const gs = o.glowStrength ?? 1;
  const cx = o.x;
  const cy = o.y;
  const g = sketch.group();
  scene.add(g);
  const parts: Stroke[] = [];
  const glow: Stroke[] = [];
  const A = (a: number) => {
    // Alpha suffix helper: keeps the halo colours in one place while letting distance scale
    // them, since a hex alpha can't be tweened and fadeTo on a whole halo layer is coarser.
    const v = Math.max(0, Math.min(255, Math.round(a * gs)));
    return v.toString(16).padStart(2, "0");
  };

  // Outer halo: light in the air around the paper. Deliberately tight — any ellipse wide
  // enough to read as atmosphere also shows its own hard elliptical edge against a dark sky.
  for (const [rx, ry, a] of [[64, 70, 12], [46, 51, 18], [32, 36, 26], [22, 25, 38]] as [number, number, number][]) {
    const halo = sketch.loop(ellipsePoints(cx, cy + 2 * s, rx * s, ry * s, 40), {
      color: CLEAR, weight: "light", looseness: 0.04, energy: "calm", smooth: true,
      fill: { color: `#f0a63c${A(a)}`, style: "solid" },
    });
    g.add(halo).initial({ opacity: 0 });
    glow.push(halo);
  }

  const bodyCold = sketch.loop(lanternBodyPoints(cx, cy, s), {
    color: "#3a2612", weight: "confident", looseness: 0.1, smooth: true,
    fill: { color: sketch.shade(o.cold ?? LANTERN_PAPER, { from: "top", amount: 0.3 }), style: "solid" },
  });
  g.add(bodyCold);
  parts.push(bodyCold);

  // Lit from inside: brightest at the middle where the flame is, falling off to the rims.
  const bodyWarm = sketch.loop(lanternBodyPoints(cx, cy, s), {
    color: "#8a5a22", weight: "confident", looseness: 0.1, smooth: true,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#e9b25e" },
          { offset: 0.45, color: "#ffdd9a" },
          { offset: 1, color: "#dc9a45" },
        ],
        direction: "vertical",
      },
      style: "solid",
    },
  });
  g.add(bodyWarm);
  bodyWarm.initial({ opacity: 0 });

  const candle = sketch.loop(ellipsePoints(cx, cy + 14 * s, 3.4 * s, 5 * s, 12), {
    color: "#6b4a1e", weight: "light", looseness: 0.14, smooth: true,
    fill: { color: "#f3e0b0", style: "solid" },
  });
  g.add(candle);
  candle.initial({ opacity: 0 });

  const flame = sketch.loop(
    [
      [cx - 3 * s, cy + 8 * s], [cx - 2.4 * s, cy + 3 * s], [cx, cy - 2 * s],
      [cx + 2.4 * s, cy + 3.4 * s], [cx + 3 * s, cy + 8 * s],
    ],
    {
      color: CLEAR, weight: "light", looseness: 0.2, energy: "quick", smooth: true,
      fill: {
        color: { stops: [{ offset: 0, color: "#fff3cf" }, { offset: 1, color: "#f0a83a" }], direction: "vertical" },
        style: "solid",
      },
    }
  );
  g.add(flame);
  flame.initial({ opacity: 0 });
  // A child node carries no translate of its own, so its pivot is just the authored point — the
  // flame flickers from its base rather than its middle.
  flame.pivotAt(cx, cy + 8 * s);

  // Rims and ribs last so the bamboo frame sits over both paper copies.
  const rimTop = sketch.loop(ellipsePoints(cx, cy - 25 * s, 15 * s, 3.6 * s, 14), {
    color: "#3a2612", weight: "confident", looseness: 0.12, smooth: true,
    fill: { color: "#4a3117", style: "solid" },
  });
  g.add(rimTop);
  parts.push(rimTop);
  const rimBottom = sketch.loop(ellipsePoints(cx, cy + 25 * s, 15 * s, 3.6 * s, 14), {
    color: "#3a2612", weight: "confident", looseness: 0.12, smooth: true,
    fill: { color: "#412b14", style: "solid" },
  });
  g.add(rimBottom);
  parts.push(rimBottom);
  // Ribs only above ~24px of body width: below that the rib strokes, the rim outlines and the
  // body outline all land within a few pixels and the whole lantern reads as a shredded scrap
  // (the workshop shelf's small ones did exactly that).
  for (const rx of s >= 0.85 ? [-9, 0, 9] : []) {
    const rib = sketch.stroke(
      [[cx + rx * s, cy - 24 * s], [cx + rx * 1.14 * s, cy], [cx + rx * s, cy + 24 * s]] as Pt[],
      { color: "#4a3117", weight: Math.max(0.9, 1.5 * s), looseness: 0.12, smooth: true }
    );
    g.add(rib);
    parts.push(rib);
  }
  // The carrying hoop.
  const hoop = sketch.stroke(arcPoints(cx, cy - 26 * s, 11 * s, 14 * s, 182, 358, 11), {
    color: "#3a2612", weight: Math.max(1, 1.8 * s), looseness: 0.12, smooth: true,
  });
  g.add(hoop);
  parts.push(hoop);

  if (o.motif) {
    // The motif he paints in scene 5 — two reeds and three dabs. Same shapes every time it
    // appears afterward, so it stays the same lantern rather than a similar one.
    for (const pts of lanternMotif(cx, cy, s)) {
      const m = sketch.stroke(pts, { color: "#6d3f1a", weight: Math.max(0.9, 1.7 * s), looseness: 0.22, smooth: true });
      g.add(m);
      parts.push(m);
    }
  }

  // Deliberately NO initial({x, y}): every point above is already authored in absolute scene
  // coordinates. A lantern that gets a springTo (carried, swaying) has its own translate
  // overwritten every frame by the spring's lookup table, which would discard an initial
  // translate entirely and snap the whole object to the canvas origin — caught by exactly that
  // happening on the first render of the title card.

  if (o.lit) {
    bodyWarm.initial({ opacity: 1 });
    candle.initial({ opacity: 1 });
    flame.initial({ opacity: 1 });
    for (const h of glow) h.initial({ opacity: 1 });
  }

  return { group: g, parts, bodyCold, bodyWarm, glow, flame, candle };
}

/** The painted motif — reeds bending one way, three dabs beside them. Authored in
 * lantern-relative units and offset into scene space, so the same marks land in the same place
 * on the paper at any scale, in any scene. */
function lanternMotif(cx: number, cy: number, s: number): Pt[][] {
  const raw: Pt[][] = [
    [[-8, 14], [-5, 2], [-9, -10]],
    [[-2, 15], [2, 3], [-1, -8]],
    [[6, -3], [7.6, -1.4]],
    [[9, 4], [10.6, 5.6]],
    [[6, 10], [7.6, 11.6]],
  ];
  return raw.map((pts) => pts.map(([x, y]) => [cx + x * s, cy + y * s] as Pt));
}

// --- Secondary motion plumbing -------------------------------------------------------------
// springTo reads its driver's AUTHORED bbox centre plus that driver's own translate, and starts
// the spring at the springing node's own authored bbox centre. So a driver placed exactly on the
// node's own centre with a zero offset means "chase me, with lag" and nothing jumps at `at`.
// The driver itself is an invisible dot that carries the real tweens — the same physics-anchor
// pattern bendy-antenna.ts uses, except the anchor here has to be ON canvas (an off-world one
// trips Tier 0's off-canvas error), so it's parked inside the shape it drives.
function springDriver(scene: Scene, node: Group | Stroke): Stroke {
  const bb = node.bbox();
  const d = sketch.blob((bb.minX + bb.maxX) / 2, (bb.minY + bb.maxY) / 2, 1.4, {
    color: CLEAR, looseness: 0, energy: "calm", fill: { color: CLEAR, style: "solid" },
  }, 6);
  scene.add(d);
  return d;
}

// --- The hanging oil lamp: the workshop's single light source -------------------------------
// Hung on a connector (a real bending cord) off a fixed ceiling point, with its body on a
// damped spring — so it drifts and settles rather than hanging perfectly still, and the cord
// bows with it. Everything warm in the workshop scenes is measured from here.
interface Lamp {
  body: Group;
  glow: Stroke[];
  flame: Stroke;
  driver: Stroke;
}

function buildLamp(scene: Scene, x: number, y: number, s: number, ceilingY: number): Lamp {
  // Airglow immediately around the flame, kept SMALL on purpose: against a dark wall any
  // ellipse wide enough to read as "light in the air" also shows its own edge, and the first
  // pass put a 120px brown disc on the wall that read as a stain rather than as light. The
  // lamp's real reach is the pool it throws on the bench, plus the wall's own gradient.
  const glow = warmPool(scene, x, y + 3 * s, [
    [34 * s, 36 * s, 0, "#e8952c14"],
    [23 * s, 24 * s, 0, "#efa63c22"],
    [14 * s, 15 * s, 0, "#f8c06a3c"],
  ]);

  const body = sketch.group();
  scene.add(body);
  // A small metal shade over a glass bowl — the shade lit on top (nothing above it but the
  // beam), the bowl lit from inside by its own flame.
  body.add(
    sketch.loop([[x - 14 * s, y - 5 * s], [x - 8 * s, y - 17 * s], [x + 8 * s, y - 17 * s], [x + 14 * s, y - 5 * s]], {
      color: "#241811", weight: "confident", looseness: 0.12, smooth: false,
      fill: { color: sketch.shade("#6b4523", { from: "top", amount: 0.45 }), style: "solid" },
    })
  );
  body.add(
    sketch.loop(ellipsePoints(x, y + 5 * s, 9.5 * s, 10.5 * s, 18), {
      color: "#6b4a22", weight: "light", looseness: 0.1, smooth: true,
      fill: {
        color: { stops: [{ offset: 0, color: "#ffe3a8" }, { offset: 1, color: "#e08c2c" }], direction: "vertical" },
        style: "solid",
      },
    })
  );
  const flame = sketch.loop(
    [[x - 2.6 * s, y + 6 * s], [x - 2 * s, y + 1 * s], [x, y - 4 * s], [x + 2 * s, y + 1.4 * s], [x + 2.6 * s, y + 6 * s]],
    {
      color: CLEAR, weight: "light", looseness: 0.2, energy: "quick", smooth: true,
      fill: { color: { stops: [{ offset: 0, color: LAMP_FLAME }, { offset: 1, color: "#f6bb52" }], direction: "vertical" }, style: "solid" },
    }
  );
  body.add(flame);
  flame.pivotAt(x, y + 6 * s);

  const driver = springDriver(scene, body);
  // damping 8 rather than 5.5: a spring reserves 9.2/damping seconds of settle time at the END of
  // the scene's timeline, so an almost-undamped lamp sway silently added ~1.7s of dead air to every
  // one of the five workshop scenes. 8 still drifts visibly and costs 1.15s.
  body.springTo(driver, { stiffness: 26, damping: 8, at: 0 });
  scene.add(sketch.connector([x, ceilingY], body, { color: "#2a1d13", weight: Math.max(1.2, 1.9 * s), looseness: 0.2 }));

  return { body, glow, flame, driver };
}

/** A slow irregular sway on a lamp/lantern driver, so the spring has something to chase for the
 * whole scene instead of settling once and going dead. */
function driftDriver(driver: Stroke, from: number, to: number, amp: number, period: number, seed: number): void {
  let k = 0;
  for (let t = from; t < to; t += period, k++) {
    const dx = (rnd(k + seed) - 0.5) * 2 * amp;
    const dy = (rnd(k + seed + 41) - 0.5) * amp * 0.5;
    driver.moveBy(dx, dy, { at: t, duration: period, ease: "sine.inOut" });
  }
}

// --- Hands ---------------------------------------------------------------------------------
// At the distance the craft scenes are shot from, a limb's own end cap is a ball on a stick. A
// real hand — palm, three fingers, a thumb — is a small group authored around the WRIST point
// and moved in lockstep with the IK target (see handPath below), which also means the tool it
// holds can ride the same path and stay in the grip.
interface Hand {
  group: Group;
  /** The wrist/grip point it was authored around, for pivots and for path bookkeeping. */
  at: Pt;
}

function buildHand(scene: Scene, x: number, y: number, s: number, facing: 1 | -1, lit: boolean): Hand {
  const g = sketch.group();
  scene.add(g);
  const P = (p: Pt): Pt => [x + p[0] * s * facing, y + p[1] * s];
  const skinFill = lit
    ? { color: { stops: [{ offset: 0, color: "#6e4a28" }, { offset: 1, color: "#c99459" }], direction: "vertical" as const }, style: "solid" as const }
    : { color: { stops: [{ offset: 0, color: "#4e3520" }, { offset: 1, color: "#8a6038" }], direction: "vertical" as const }, style: "solid" as const };
  g.add(
    sketch.loop([P([-3, -9]), P([13, -12]), P([22, -5]), P([21, 6]), P([9, 11]), P([-4, 8])], {
      color: "#3a2413", weight: Math.max(1, 1.5 * s), looseness: 0.16, smooth: true, fill: skinFill,
    })
  );
  for (const f of [
    [[19, -7], [30, -10]],
    [[22, -1], [34, -2]],
    [[20, 5], [31, 8]],
  ] as Pt[][]) {
    g.add(sketch.stroke(f.map(P), { color: lit ? "#a9784a" : "#7c5530", weight: Math.max(1.6, 4.6 * s), looseness: 0.14, smooth: true }));
  }
  g.add(sketch.stroke([P([4, 8]), P([11, 15])], { color: lit ? "#9c6d42" : "#6e4a2c", weight: Math.max(1.6, 5 * s), looseness: 0.14, smooth: true }));
  g.pivotAt(x, y);
  return { group: g, at: [x, y] };
}

// --- Choreographing a hand ------------------------------------------------------------------
// One beat = one destination for the hand, with its own duration and its own ease. Everything in
// `followers` (the drawn hand, whatever tool is in it, a spring driver) gets the same relative
// move over the same window, so the tool never drifts out of the grip. The point of routing all
// of it through one list is that the ease is chosen PER BEAT: a blade draw and the recoil after
// it are different motions and shouldn't share a curve.
interface Beat {
  x: number;
  y: number;
  at: number;
  dur: number;
  ease?: string;
  /** Absolute rotation for the followers (a wrist turn), pivoted at their own grip point. */
  rot?: number;
  rotDur?: number;
  rotEase?: string;
}

function handPath(arm: Limb | null, followers: (Group | Stroke)[], start: Pt, beats: Beat[]): Pt {
  let prev = start;
  for (const b of beats) {
    const ease = b.ease ?? "power2.inOut";
    if (arm) arm.ikTo(b.x, b.y, { at: b.at, duration: b.dur, ease });
    for (const f of followers) {
      f.moveBy(b.x - prev[0], b.y - prev[1], { at: b.at, duration: b.dur, ease });
      if (b.rot !== undefined) f.rotateTo(b.rot, { at: b.at, duration: b.rotDur ?? b.dur, ease: b.rotEase ?? ease });
    }
    prev = [b.x, b.y];
  }
  return prev;
}

/** Flame flicker: squash from the base plus a couple of degrees of sway, on its own phase.
 * Deterministic from rnd(), like every other seeded thing here. */
function flicker(flame: Stroke, from: number, to: number, amp: number, seed: number): void {
  let k = 0;
  for (let t = from; t < to; t += 0.34, k++) {
    flame.squashTo(1 + (rnd(k + seed) - 0.5) * 0.14 * amp, 1 + (rnd(k + seed + 19) - 0.5) * 0.3 * amp, {
      at: t, duration: 0.34, ease: "sine.inOut",
    });
    flame.rotateTo((rnd(k + seed + 37) - 0.5) * 7 * amp, { at: t, duration: 0.34, ease: "sine.inOut" });
  }
}

// ============================================================================================
// SCENE 1 — Title. One lit lantern in the dark, and the name of the piece.
// ============================================================================================
const TOTAL1 = 6.4;

const scene1 = sketch.scene({
  width: W,
  height: H,
  background: {
    stops: [
      { offset: 0, color: "#141019" },
      { offset: 0.55, color: "#1b1310" },
      { offset: 1, color: "#241710" },
    ],
    direction: "vertical",
  },
  seed: "lantern-title",
  look: "ink",
  texture: "grain",
});

const titleLantern = buildLantern(scene1, { x: 470, y: 236, s: 1.15, lit: false, motif: true });
// The glow comes up first, in the dark, before any of the paper is legible — the image the whole
// film ends on, offered as its opening.
titleLantern.candle.fadeTo(1, { at: 0.2, duration: 0.4 });
titleLantern.flame.fadeTo(1, { at: 0.3, duration: 0.5 });
titleLantern.bodyWarm.fadeTo(1, { at: 0.4, duration: 1.4, ease: "sine.out" });
for (let i = 0; i < titleLantern.glow.length; i++) {
  titleLantern.glow[i].fadeTo(1, { at: 0.4 + i * 0.16, duration: 1.5, ease: "sine.out" });
}
flicker(titleLantern.flame, 1.0, TOTAL1, 1, 3);
const titleDriver = springDriver(scene1, titleLantern.group);
titleLantern.group.springTo(titleDriver, { stiffness: 18, damping: 7, at: 0.2 });
driftDriver(titleDriver, 0.6, TOTAL1, 3.4, 2.4, 11);

const TITLE_INK = "#dcc094";
const title = sketch.text("the lantern maker", 92, 196, { color: TITLE_INK, weight: "confident", looseness: 0.28, energy: "calm" }, { size: 31 });
scene1.add(title);
title.stagger(0.055, { at: 1.5, duration: 0.5, ease: "power2.out" });

scene1.add(sketch.sound("D2", { at: 0, duration: TOTAL1, instrument: "pad", velocity: 0.17 }));
scene1.add(sketch.sound("A3", { at: 1.5, duration: 1.4, instrument: "piano", velocity: 0.26, pan: -0.2 }));
scene1.add(sketch.sound("E4", { at: 3.1, duration: 1.6, instrument: "piano", velocity: 0.22, pan: -0.1 }));

// A frame that barely breathes. panTo takes an ABSOLUTE scene point to centre on, so a ~4px
// drift targets just off this canvas's real centre (320, 210), not (4, -3).
scene1.camera().panTo(324, 207, { at: 0, duration: TOTAL1, ease: "sine.inOut" });

// ============================================================================================
// SCENE 2 — The workshop. Lamp-lit, dusk in the window. He reaches for a sheet of paper.
//
// Staged side-on with him seated at the LEFT END of the bench rather than behind it: the first
// pass put him behind the work surface, which is where a lantern maker would actually sit but
// which crops a seated figure to a head and shoulders — 100px of person in a 420px frame, with
// his hands hidden under the bench edge exactly where the whole point is to watch them. Side-on
// costs nothing and gives the full figure plus an unobstructed bench running away toward the
// lamp.
// ============================================================================================
// Every hand position in this scene is inside a circle of ~105px around his shoulder, and that
// constraint set the whole layout rather than being fitted afterward. A 2-bone chain silently
// clamps a target past len1+len2, and a clamped arm renders as one dead-straight plank with a
// ball on the end — which is exactly what the first pass of this scene looked like, with the
// work sitting 180px from a 124px arm. 124px is the correct arm length for a figure this tall
// (~82cm at this scene's scale), so the work moved to him, not the reverse.
const TOTAL2 = 17.6;
const FLOOR_Y = 300;
const BENCH_TOP = 330;
const BENCH_EDGE = 346;
const BENCH_L = 330;
const LAMP_X = 400;
const LAMP_Y = 126;

const scene2 = sketch.scene({
  width: W,
  height: H,
  background: "#150e0b",
  seed: "lantern-workshop",
  look: "ink",
  texture: "grain",
});

// The back wall: warm toward the lamp, falling into near-black away from it. One horizontal
// gradient does the whole room's light direction.
scene2.add(
  sketch.loop([[-20, -20], [660, -20], [660, FLOOR_Y], [-20, FLOOR_Y]], {
    color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#191110" },
          { offset: 0.32, color: "#241811" },
          { offset: 0.62, color: "#3d2716" },
          { offset: 1, color: "#291a12" },
        ],
        direction: "horizontal",
      },
      style: "solid",
    },
  })
).appear({ at: 0, duration: 0.9 });

scene2.add(
  sketch.loop([[-20, FLOOR_Y], [660, FLOOR_Y], [660, H + 20], [-20, H + 20]], {
    color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
    fill: {
      color: {
        stops: [{ offset: 0, color: "#221509" }, { offset: 0.45, color: "#150e07" }, { offset: 1, color: "#0d0805" }],
        direction: "vertical",
      },
      style: "solid",
    },
  })
).appear({ at: 0.25, duration: 0.9 });
// A baseboard: without one, the wall/floor join is two similar browns meeting at nothing and
// the room reads as one flat backdrop rather than a corner.
scene2.add(
  sketch.loop([[-20, FLOOR_Y - 7], [660, FLOOR_Y - 7], [660, FLOOR_Y + 2], [-20, FLOOR_Y + 2]], {
    color: "#120c07", weight: "light", looseness: 0.08, smooth: false,
    fill: { color: sketch.shade("#4a2d16", { from: "top", amount: 0.4 }), style: "solid" },
  })
).appear({ at: 0.4, duration: 0.8 });

// The window: the only cool light in the room, and the only clue that it's evening outside.
// Drawn before the wall's warm side has anything on it, so the two lights read as competing.
// Set high on the wall on purpose: at the height it started at, the artisan's head sat right in
// front of it, and a warm-rimmed silhouette against a cool pane fights itself.
const winL = 32;
const winR = 142;
const winT = 56;
const winB = 150;
scene2.add(
  sketch.loop([[winL, winT], [winR, winT], [winR, winB], [winL, winB]], {
    color: "#1a1a24", weight: "confident", looseness: 0.08, smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#5d6d90" }, { offset: 0.6, color: "#3d4a6d" }, { offset: 1, color: "#2b3552" }], direction: "vertical" },
      style: "solid",
    },
  })
).drawOn({ at: 0.9, duration: 1.1 });
// A rooftop and a single star out there — the town he'll walk through in scene 7.
scene2.add(
  sketch.loop([[winL, 130], [60, 130], [72, 118], [86, 130], [winR, 130], [winR, winB], [winL, winB]], {
    color: CLEAR, weight: "light", looseness: 0.1, smooth: false,
    fill: { color: "#212a44", style: "solid" },
  })
).appear({ at: 1.7, duration: 0.6 });
scene2.add(sketch.loop(ellipsePoints(118, 76, 1.5, 1.5, 8), { color: "#cfd8ea", weight: 0.9, looseness: 0, energy: "calm", fill: { color: "#cfd8ea", style: "solid" } })).appear({ at: 2.2, duration: 0.5 });
for (const [x0, y0, x1, y1] of [[87, winT, 87, winB], [winL, 103, winR, 103]] as [number, number, number, number][]) {
  scene2.add(sketch.stroke([[x0, y0], [x1, y1]], { color: "#20180f", weight: "confident", looseness: 0.1 })).drawOn({ at: 1.4, duration: 0.4 });
}
// Cool spill on the floor under the window — the counter-light, kept faint so the lamp still
// owns the room.
for (const [rx, ry, col] of [[112, 30, "#4a5c8208"], [68, 18, "#5a6f940a"]] as [number, number, string][]) {
  scene2.add(
    sketch.loop(ellipsePoints(96, 340, rx, ry, 40), { color: CLEAR, weight: "light", looseness: 0.04, energy: "calm", smooth: true, fill: { color: col, style: "solid" } })
  ).appear({ at: 2.0, duration: 1.2 });
}
// Tools and stock hanging on the wall behind the bench — the middle of this frame was bare wall
// until these went in, which read as an empty room rather than a working one. Kept dim: they're
// well outside the lamp's reach.
scene2.add(sketch.stroke([[196, 178], [292, 174]], { color: "#2e1f13", weight: "confident", looseness: 0.12 })).drawOn({ at: 1.9, duration: 0.5 });
for (const [px, ph, pw] of [[206, 54, 3], [216, 68, 2.4], [226, 46, 3], [262, 60, 2.6], [272, 74, 3], [281, 52, 2.4]] as [number, number, number][]) {
  scene2.add(sketch.stroke([[px, 176], [px + 2, 176 + ph]], { color: "#4a3720", weight: pw, looseness: 0.14 })).drawOn({ at: 2.2, duration: 0.4 });
}
scene2.add(
  sketch.loop([[314, 176], [352, 190], [350, 199], [312, 185]], {
    color: "#1e160f", weight: "light", looseness: 0.14, smooth: false,
    fill: { color: "#2a231d", style: "solid" },
  })
).drawOn({ at: 2.5, duration: 0.5 });
scene2.add(sketch.stroke([[352, 190], [368, 196]], { color: "#3a2918", weight: "bold", looseness: 0.14 })).drawOn({ at: 2.7, duration: 0.3 });

// A shelf of lanterns he's already made — the same object, smaller and unlit, so the one he's
// about to build reads as one of a life's worth of them.
scene2.add(
  sketch.loop([[470, 150], [644, 150], [644, 160], [470, 160]], {
    color: "#1c130c", weight: "confident", looseness: 0.1, smooth: false,
    fill: { color: sketch.shade("#54341a", { from: "top", amount: 0.4 }), style: "solid" },
  })
).drawOn({ at: 2.1, duration: 0.9 });
for (const [lx, ls, at] of [[512, 0.72, 2.7], [578, 0.62, 2.95], [630, 0.56, 3.15]] as [number, number, number][]) {
  scene2.add(sketch.stroke([[lx, 160], [lx, 160 + 14 * ls]], { color: "#241811", weight: "light", looseness: 0.2 })).drawOn({ at, duration: 0.3 });
  const shelfLantern = buildLantern(scene2, { x: lx, y: 160 + 44 * ls, s: ls, lit: false, cold: "#6a4b25" });
  shelfLantern.group.initial({ opacity: 0 });
  shelfLantern.group.fadeTo(0.92, { at: at + 0.15, duration: 0.7, ease: "sine.out" });
}
// Bundles of bamboo strip stock leaning in the corner behind him, and a finished-work basket on
// the floor — a workshop is a room with materials in it, not an empty box with a bench.
for (const [bx, tilt, h, col] of [[16, 13, 104, "#6a4f28"], [24, 9, 118, "#7d5c2e"], [33, 16, 96, "#5c4423"]] as [number, number, number, string][]) {
  scene2.add(sketch.stroke([[bx, FLOOR_Y + 34], [bx + tilt, FLOOR_Y + 34 - h]], { color: col, weight: "confident", looseness: 0.14 })).drawOn({ at: 2.4, duration: 0.5 });
}
scene2.add(
  sketch.loop([[556, 372], [608, 372], [614, 404], [550, 404]], {
    color: "#1a1209", weight: "confident", looseness: 0.16, smooth: true,
    fill: { color: sketch.shade("#4e3418", { from: "top", amount: 0.35 }), style: "solid" },
  })
).drawOn({ at: 5.9, duration: 0.7 });

// The lamp. Everything warm in this scene is measured from (LAMP_X, LAMP_Y).
scene2.add(sketch.loop([[-20, 20], [660, 20], [660, 34], [-20, 34]], {
  color: "#150e09", weight: "confident", looseness: 0.08, smooth: false,
  fill: { color: sketch.shade("#3a2414", { from: "top", amount: 0.35 }), style: "solid" },
})).appear({ at: 0.1, duration: 0.7 });
const lamp2 = buildLamp(scene2, LAMP_X, LAMP_Y, 1, 34);
lamp2.body.initial({ opacity: 0 });
lamp2.body.fadeTo(1, { at: 2.6, duration: 0.9, ease: "sine.out" });
for (let i = 0; i < lamp2.glow.length; i++) {
  lamp2.glow[i].fadeTo(1, { at: 3.0 + i * 0.14, duration: 1.6, ease: "sine.out" });
}
flicker(lamp2.flame, 3.6, TOTAL2, 0.8, 5);
driftDriver(lamp2.driver, 3.4, TOTAL2, 2.6, 3.1, 23);

// His stool, drawn before him so he sits on it rather than in front of it.
scene2.add(
  sketch.loop([[228, 356], [312, 356], [306, 366], [234, 366]], {
    color: "#150e08", weight: "confident", looseness: 0.1, smooth: false,
    fill: { color: sketch.shade("#4a2d15", { from: "top", amount: 0.4 }), style: "solid" },
  })
).drawOn({ at: 4.2, duration: 0.6 });
for (const sx of [238, 296]) {
  scene2.add(sketch.stroke([[sx, 366], [sx - 5, 412]], { color: "#241710", weight: "bold", looseness: 0.14 })).drawOn({ at: 4.5, duration: 0.4 });
}

// The artisan, seated at the near end of the bench, lit from the lamp off to his right. armLen
// is set generously ([32, 30] local, ~124px at this scale): the far corner of the work is 101px
// from his shoulder, and a 2-bone chain silently clamps its target at full extension, which
// reads as the hand popping rather than reaching.
const art2 = buildArtisan(scene2, {
  x: 270, y: 352, s: 2.0, facing: 1, lit: "right", warm: "#6f421d",
  armLen: [32, 30], seated: true, face: true, bendNear: 1, bendFar: 1,
});
art2.armNear.restAt(...art2.local(366, 316));
art2.armFar.restAt(...art2.local(348, 324));
art2.group.initial({ opacity: 0 });
art2.group.fadeTo(1, { at: 5.0, duration: 1.1, ease: "sine.out" });
art2.pivotLocal(0, 0);

// The bench: a lit top surface in slight perspective, a dark apron under it, two legs. It runs
// off the right edge of the frame — a workbench that ends inside the shot reads as a table.
scene2.add(
  sketch.loop([[BENCH_L, BENCH_TOP], [664, BENCH_TOP], [664, BENCH_EDGE], [BENCH_L + 14, BENCH_EDGE]], {
    color: "#1a1109", weight: "confident", looseness: 0.08, smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#7d4e25" }, { offset: 0.55, color: "#5c3719" }, { offset: 1, color: "#3d2411" }], direction: "vertical" },
      style: "solid",
    },
  })
).drawOn({ at: 3.3, duration: 1.2 });
scene2.add(
  sketch.loop([[BENCH_L + 14, BENCH_EDGE], [664, BENCH_EDGE], [664, BENCH_EDGE + 22], [BENCH_L + 14, BENCH_EDGE + 22]], {
    color: "#150e08", weight: "confident", looseness: 0.08, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#38220f" }, { offset: 1, color: "#180f08" }], direction: "vertical" }, style: "solid" },
  })
).drawOn({ at: 3.9, duration: 0.9 });
for (const lx of [378, 578]) {
  scene2.add(
    sketch.loop([[lx, BENCH_EDGE + 22], [lx + 22, BENCH_EDGE + 22], [lx + 26, 414], [lx + 4, 414]], {
      color: "#140d08", weight: "confident", looseness: 0.1, smooth: false,
      fill: { color: "#241609", style: "solid" },
    })
  ).drawOn({ at: 4.4, duration: 0.7 });
}

// The pool of lamplight on the bench top, and its breathing.
const pool2 = warmPool(scene2, LAMP_X, BENCH_TOP + 6, [
  [176, 26, 0, "#c2661d18"],
  [122, 19, 0, "#d1791f26"],
  [76, 13, 0, "#e2913138"],
  [40, 8, 0, "#f5b45c40"],
]);
for (let i = 0; i < pool2.length; i++) pool2[i].fadeTo(1, { at: 4.8 + i * 0.14, duration: 1.5, ease: "sine.out" });
{
  let k = 0;
  for (let t = 6.4; t < TOTAL2; t += 0.9, k++) {
    for (let i = 0; i < pool2.length; i++) pool2[i].fadeTo(0.78 + rnd(k + i * 13) * 0.22, { at: t, duration: 0.9, ease: "sine.inOut" });
  }
}

// What's already on the bench: a stack of paper, bamboo strips, an ink dish, a brush.
for (const [sy, sw, at] of [[320, 80, 6.3], [317, 76, 6.5]] as [number, number, number][]) {
  scene2.add(
    sketch.loop([[356, sy], [356 + sw, sy - 3], [356 + sw, sy + 4], [356, sy + 6]], {
      color: "#7a5e33", weight: "light", looseness: 0.14, smooth: false,
      fill: { color: sketch.shade("#c8ac79", { from: "right", amount: 0.26 }), style: "solid" },
    })
  ).drawOn({ at, duration: 0.5 });
}
const sheet2 = sketch.loop([[352, 312], [436, 308], [438, 316], [354, 320]], {
  color: "#94764a", weight: "light", looseness: 0.12, smooth: false,
  fill: { color: sketch.shade("#dfc79a", { from: "right", amount: 0.26 }), style: "solid" },
});
scene2.add(sheet2).drawOn({ at: 6.8, duration: 0.6 });
for (const [bx, by] of [[466, 322], [464, 327]] as Pt[]) {
  scene2.add(sketch.stroke([[bx, by], [bx + 84, by - 5]], { color: BAMBOO, weight: "light", looseness: 0.2 })).drawOn({ at: 7.1, duration: 0.5 });
}
scene2.add(
  sketch.loop(ellipsePoints(576, 322, 15, 6, 16), {
    color: "#241811", weight: "light", looseness: 0.12, smooth: true,
    fill: { color: { stops: [{ offset: 0, color: "#4a3320" }, { offset: 1, color: "#100a06" }], direction: "vertical" }, style: "solid" },
  })
).drawOn({ at: 7.3, duration: 0.5 });
scene2.add(sketch.stroke([[598, 322], [634, 312]], { color: "#3a2614", weight: "confident", looseness: 0.16 })).drawOn({ at: 7.5, duration: 0.4 });

// --- The beat: he leans in, reaches, and draws a sheet toward himself. ----------------------
// The lean starts BEFORE the arm does and finishes after it — the body committing to the reach
// first is what makes the arm read as attached to a person rather than swinging on its own.
art2.group.rotateTo(2.6, { at: 8.4, duration: 1.3, ease: "power2.out" });
art2.armNear.ikTo(...art2.local(382, 306), { at: 8.9, duration: 0.9, ease: "back.out(1.6)" });
// Draws the sheet in. The hand and the sheet share one window and one ease, so the paper reads
// as being pulled rather than sliding on its own.
sheet2.moveBy(-38, 6, { at: 10.1, duration: 0.8, ease: "power2.out" });
art2.armNear.ikTo(...art2.local(344, 314), { at: 10.1, duration: 0.8, ease: "power2.out" });
// The follow-through: a small counter-move at the wrist a beat after the pull has landed. This
// one line is most of the difference between "arrived and stopped" and "settled".
art2.armNear.ikTo(...art2.local(350, 310), { at: 11.1, duration: 0.55, ease: "back.out(2.4)" });
art2.armFar.ikTo(...art2.local(336, 308), { at: 11.7, duration: 1.0, ease: "power2.inOut" });
art2.armFar.ikTo(...art2.local(340, 312), { at: 12.8, duration: 0.6, ease: "back.out(1.8)" });
art2.group.rotateTo(1.5, { at: 13.4, duration: 1.5, ease: "sine.inOut" });
// Breathing, so the held frame isn't a freeze.
art2.group.rotateTo(2.1, { at: 14.4, duration: 1.5, ease: "sine.inOut" });
art2.group.rotateTo(1.6, { at: 15.9, duration: 1.6, ease: "sine.inOut" });

// A slow push in toward him and the work, ending tighter than it began.
scene2.camera().panTo(308, 222, { at: 0, duration: TOTAL2, ease: "sine.inOut" });
scene2.camera().zoomTo(1.12, { at: 0, duration: TOTAL2, ease: "sine.inOut" });

scene2.add(sketch.sound("D2", { at: 0, duration: TOTAL2, instrument: "pad", velocity: 0.16 }));
for (const [pitch, at, vel] of [["A3", 1.2, 0.26], ["E4", 5.2, 0.22], ["D4", 8.4, 0.24], ["G3", 13.8, 0.18]] as [string, number, number][]) {
  scene2.add(sketch.sound(pitch, { at, duration: 1.3, instrument: "piano", velocity: vel, pan: -0.22 }));
}
scene2.add(sketch.sound(null, { at: 10.15, duration: 0.12, instrument: "brush", velocity: 0.16 }));
scene2.add(sketch.sound("E3", { at: 8.4, duration: 3.4, instrument: "strings", velocity: 0.13 }));

// ============================================================================================
// The craft close-ups (scenes 3-5) share one framing: the bench top filling the frame, the room
// and the lamp beyond its far edge, and both of his arms entering from below. The arms' roots are
// set a long way off the bottom of the canvas ON PURPOSE — at a root just below the frame edge,
// the elbow swings hundreds of pixels sideways between a far reach and a near one (a 2-bone
// solve at 90% extension is nearly straight, at 60% it's folded double), which reads as a
// chicken wing flapping at the bottom of frame. A distant root keeps every target in this scene
// between ~70% and ~90% of full extension, so what enters the frame is a forearm whose ANGLE
// changes as the hand moves and whose elbow is always out of shot, which is what an
// over-the-work camera position actually sees.
// ============================================================================================
const CU_FAR = 96;
const CU_LAMP_X = 452;
const CU_LAMP_Y = 44;
const CU_POOL: [number, number, number, string][] = [
  [252, 152, 0, "#c2661d14"],
  [182, 108, 0, "#d1791f1e"],
  [118, 70, 0, "#e2913128"],
  [64, 38, 0, "#f5b45c32"],
];

function buildBenchCloseup(scene: Scene, poolX: number, lampAt: number): { lamp: Lamp; pool: Stroke[] } {
  scene.add(
    sketch.loop([[-20, -20], [660, -20], [660, CU_FAR], [-20, CU_FAR]], {
      color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
      fill: {
        color: {
          stops: [
            { offset: 0, color: "#191110" },
            { offset: 0.4, color: "#22160f" },
            { offset: 0.72, color: "#3a2515" },
            { offset: 1, color: "#281a11" },
          ],
          direction: "horizontal",
        },
        style: "solid",
      },
    })
  ).appear({ at: 0, duration: 0.7 });

  const lamp = buildLamp(scene, CU_LAMP_X, CU_LAMP_Y, 1.15, -80);
  lamp.body.initial({ opacity: 0 });
  lamp.body.fadeTo(1, { at: lampAt, duration: 0.5 });
  for (let i = 0; i < lamp.glow.length; i++) lamp.glow[i].fadeTo(1, { at: lampAt + i * 0.1, duration: 0.9, ease: "sine.out" });

  // The bench top, lit from beyond the far edge (where the lamp is) and falling off toward the
  // camera — the whole surface is one form with a light side, not a flat brown field.
  scene.add(
    sketch.loop([[-20, CU_FAR], [660, CU_FAR], [660, H + 20], [-20, H + 20]], {
      color: "#1a1109", weight: "light", looseness: 0.06, smooth: false,
      fill: {
        color: {
          stops: [
            { offset: 0, color: "#6e4423" },
            { offset: 0.42, color: "#573319" },
            { offset: 1, color: "#301c0d" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    })
  ).appear({ at: 0.2, duration: 0.8 });
  // Plank seams, so the surface has grain and scale rather than being one continuous plane.
  for (const [sy, at] of [[CU_FAR + 4, 0.5], [188, 0.65], [286, 0.8], [382, 0.95]] as [number, number][]) {
    scene.add(sketch.stroke([[-20, sy], [660, sy + 3]], { color: "#3a2110", weight: "light", looseness: 0.14 })).drawOn({ at, duration: 0.6 });
  }

  const pool = warmPool(scene, poolX, 236, CU_POOL);
  for (let i = 0; i < pool.length; i++) pool[i].fadeTo(1, { at: lampAt + 0.2 + i * 0.12, duration: 1.1, ease: "sine.out" });
  return { lamp, pool };
}

/** Both forearms for a craft close-up, plus their drawn hands. Same sleeve tones as the figure
 * in the wide shots, so the cut from scene 2 to scene 3 lands on the same person. */
function buildCraftArms(scene: Scene, handS: number): {
  armR: Limb;
  armL: Limb;
  handR: Hand;
  handL: Hand;
} {
  // Dark sleeves here, LIGHT ones on the figure in the wide shots — same light, opposite answer.
  // In the wide shots the arm is a dark form against a dark wall and has to be lifted out of it;
  // here it's a foreground form against a brightly lit bench, seen from its shaded side (the lamp
  // is beyond the bench, so a forearm reaching in is backlit from the camera's point of view).
  // Dark against the pool is what makes it read as a silhouette instead of a pale pipe.
  const sleeve = { looseness: 0.15, energy: "calm" as const, smooth: true };
  const armR = sketch
    .limb(430, 1080, 480, 470, { ...sleeve, weight: 24, color: "#32200f" }, { bend: -1, capRadius: 0 })
    .restAt(520, 400);
  scene.add(armR);
  const armL = sketch
    .limb(120, 1040, 500, 490, { ...sleeve, weight: 22, color: "#261709" }, { bend: -1, capRadius: 0 })
    .restAt(200, 400);
  scene.add(armL);
  const handL = buildHand(scene, 200, 400, handS, 1, false);
  const handR = buildHand(scene, 520, 400, handS, -1, true);
  return { armR, armL, handR, handL };
}

// ============================================================================================
// SCENE 3 — Cutting the paper. The first of the three craft beats, and the one the whole film is
// really about: one pair of hands, a blade, a straightedge, and a sheet of paper.
// ============================================================================================
const TOTAL3 = 19.9;

const scene3 = sketch.scene({
  width: W,
  height: H,
  background: "#150e0b",
  seed: "lantern-cutting",
  look: "ink",
  texture: "grain",
});

const cu3 = buildBenchCloseup(scene3, 430, 1.0);
flicker(cu3.lamp.flame, 1.6, TOTAL3, 0.8, 9);
driftDriver(cu3.lamp.driver, 1.6, TOTAL3, 2.2, 3.4, 31);

// The sheet, in perspective — narrower along its far edge than its near one.
//
// Kept under ~160px tall deliberately, and that's a rendering constraint rather than a
// compositional one. drawOn reveals a closed shape through a mask made of a stroked outline plus
// a boustrophedon zigzag that colours the interior in; the zigzag's row count is clamped at 16,
// while its stroke width stays tied to the shape's own outline weight (rowSpacing * 1.7, ~10px
// for a "light" edge). Past roughly 160px of height the rows therefore spread further apart than
// the stroke covering them, and the mask keeps thin horizontal gaps FOREVER — not during the
// reveal, permanently. The first version of this sheet was 174px tall and rendered as ruled
// notebook paper for the whole scene. Anything genuinely larger than that should use appear()
// instead (the same conclusion campfire-story.ts reached from the other direction: a mask sweep
// across a big shape reads as a stripe crossing the frame, not as a pen).
const sheet3 = sketch.loop([[146, 180], [428, 172], [458, 318], [120, 324]], {
  color: "#8e7145", weight: "light", looseness: 0.1, smooth: false,
  fill: {
    color: { stops: [{ offset: 0, color: "#cdb283" }, { offset: 0.55, color: "#e2caa0" }, { offset: 1, color: "#f0dcb4" }], direction: "horizontal" },
    style: "solid",
  },
});
scene3.add(sheet3).drawOn({ at: 1.2, duration: 1.3 });
// The offcut: the narrow strip to the right of where the cut will fall. Drawn as part of the
// sheet's own field until the blade separates it.
const offcut3 = sketch.loop([[406, 173], [428, 172], [458, 318], [434, 320]], {
  color: "#8e7145", weight: "light", looseness: 0.1, smooth: false,
  fill: { color: { stops: [{ offset: 0, color: "#dcc396" }, { offset: 1, color: "#f0dcb4" }], direction: "horizontal" }, style: "solid" },
});
scene3.add(offcut3).appear({ at: 1.2, duration: 0.9 });

const straightedge3 = sketch.loop([[368, 176], [386, 176], [414, 320], [396, 320]], {
  color: "#1d1309", weight: "confident", looseness: 0.1, smooth: false,
  fill: { color: { stops: [{ offset: 0, color: "#6b4520" }, { offset: 1, color: "#2c1a0c" }], direction: "horizontal" }, style: "solid" },
});
scene3.add(straightedge3).drawOn({ at: 2.2, duration: 0.8 });
// An explicit pivot, because the implicit one is wrong here: with no pivot set, a rotateTo falls
// back to transformOrigin 50%/50% of the node's rendered GROUP, which for a drawOn'd node also
// contains the pen-tip element — so the origin sits somewhere off the shape and the straightedge
// swung across the sheet instead of turning in the hand carrying it.
straightedge3.pivotAt(384, 250);

const arms3 = buildCraftArms(scene3, 1.15);

// The knife: authored around the GRIP at (0,0) then translated, so the blade rides the hand's
// path and a wrist rotation turns it about the grip rather than about its own middle.
const KNIFE_GRIP: Pt = [520, 400];
const knife3 = sketch.group();
scene3.add(knife3);
{
  const K = (p: Pt): Pt => [KNIFE_GRIP[0] + p[0], KNIFE_GRIP[1] + p[1]];
  knife3.add(
    sketch.loop([K([8, -9]), K([40, -18]), K([45, -2]), K([13, 7])], {
      color: "#170f08", weight: "confident", looseness: 0.12, smooth: false,
      fill: { color: sketch.shade("#5c3a1c", { from: "top", amount: 0.4 }), style: "solid" },
    })
  );
  knife3.add(
    sketch.loop([K([2, -6]), K([12, -9]), K([15, 4]), K([5, 6])], {
      color: "#241a10", weight: "light", looseness: 0.1, smooth: false,
      fill: { color: "#7a6a52", style: "solid" },
    })
  );
  knife3.add(
    sketch.loop([K([3, -5]), K([-27, 9]), K([-32, 16]), K([1, 6])], {
      color: "#4a4238", weight: "light", looseness: 0.08, smooth: false,
      fill: { color: { stops: [{ offset: 0, color: "#d8d2c4" }, { offset: 1, color: "#8e8778" }], direction: "vertical" }, style: "solid" },
    })
  );
  knife3.pivotAt(KNIFE_GRIP[0], KNIFE_GRIP[1]);
}

// The cut itself: two strokes revealed in step with the blade's two passes, the second darker
// than the first — a scored line, then a cut one.
const cutPath: Pt[] = [[404, 178], [412, 222], [420, 270], [428, 314]];
const score3 = sketch.stroke(cutPath, { color: "#a4884f", weight: "light", looseness: 0.1, smooth: true });
scene3.add(score3);
const cut3 = sketch.stroke(cutPath, { color: "#6b5227", weight: "confident", looseness: 0.12, smooth: true });
scene3.add(cut3);

// --- The choreography -----------------------------------------------------------------------
// The left hand arrives first and pins the straightedge; the right hand follows with the blade.
// Each landing is a fast committed move (power3/power4 out) answered a beat later by a small
// overshoot back (back.out) — a hand that presses something down and then eases off it, rather
// than one that decelerates smoothly into position and stops dead.
handPath(arms3.armL, [arms3.handL.group], arms3.handL.at, [
  { x: 300, y: 300, at: 2.6, dur: 0.9, ease: "power2.out" },
  { x: 352, y: 246, at: 3.6, dur: 0.6, ease: "power3.out", rot: -6 },
  { x: 350, y: 252, at: 4.3, dur: 0.28, ease: "power4.out" },
  { x: 351, y: 248, at: 4.62, dur: 0.34, ease: "back.out(2.4)" },
]);

handPath(arms3.armR, [arms3.handR.group, knife3], KNIFE_GRIP, [
  { x: 470, y: 300, at: 4.0, dur: 0.9, ease: "power2.out" },
  { x: 442, y: 182, at: 5.1, dur: 0.95, ease: "power3.out", rot: -10 },
  // Setting the blade tip on the paper: short, decisive, and then eased off — the two beats a
  // single "place the knife" gesture actually has.
  { x: 438, y: 192, at: 6.2, dur: 0.3, ease: "power4.out" },
  { x: 440, y: 188, at: 6.55, dur: 0.32, ease: "back.out(2.6)" },
  // First pass: a long, even draw. Nearly linear on purpose — a scoring cut is the one motion in
  // this scene that ISN'T eased at both ends, because the pressure is constant through it.
  { x: 456, y: 330, at: 7.1, dur: 1.9, ease: "power1.inOut" },
  { x: 452, y: 322, at: 9.05, dur: 0.42, ease: "back.out(1.8)" },
  // Back to the top for the second pass, then a firmer, faster cut.
  { x: 440, y: 186, at: 9.8, dur: 0.85, ease: "power2.inOut" },
  { x: 458, y: 332, at: 10.85, dur: 1.6, ease: "power1.in" },
  { x: 470, y: 344, at: 12.5, dur: 0.5, ease: "power2.out", rot: 14 },
  // Sets the knife down clear of the work.
  { x: 542, y: 396, at: 13.1, dur: 0.8, ease: "power2.in", rot: 34 },
]);

score3.drawOn({ at: 7.1, duration: 1.9, ease: "power1.inOut" });
cut3.drawOn({ at: 10.85, duration: 1.6, ease: "power1.in" });

// --- Peeling the offcut: a real bending strip -----------------------------------------------
// The strip stays pinned at the bottom of the cut and is lifted by its top corner. The lifted
// corner is a springTo'd point chasing the hand, and the strip itself is a sketch.connector from
// the fixed pin to that point — so the paper genuinely bows and overshoots as it's peeled and
// wobbles when the hand stops, instead of being a rigid quad rotating about a hinge. This is the
// staging `connector`'s fixed anchor asks for rather than fights: one end of the strip really is
// nailed down.
const STRIP_PIN: Pt = [430, 316];
const stripTip3 = sketch.blob(408, 190, 2.2, { color: CLEAR, looseness: 0, energy: "calm", fill: { color: CLEAR, style: "solid" } }, 6);
scene3.add(stripTip3);
const stripDriver3 = springDriver(scene3, stripTip3);
// damping 11 against stiffness 70 (critical would be ~16.7): enough overshoot to read as paper
// whipping, not enough to ring. At damping 6 the tip carried on swinging halfway across the frame
// after the hand had stopped, and the strip read as a thrown ribbon rather than a peeled offcut.
stripTip3.springTo(stripDriver3, { stiffness: 70, damping: 11, at: 15.4 });
const strip3 = sketch.connector(STRIP_PIN, stripTip3, { color: "#f0dcb4", weight: 9, looseness: 0.16 });
scene3.add(strip3);
strip3.initial({ opacity: 0 });

// The left hand takes the straightedge away — the tool it was holding rides along with it, the
// same followers trick the knife uses.
handPath(arms3.armL, [arms3.handL.group, straightedge3], [351, 248], [
  { x: 344, y: 268, at: 12.9, dur: 0.45, ease: "power3.out", rot: -4 },
  { x: 286, y: 348, at: 13.5, dur: 0.85, ease: "power2.inOut", rot: -16 },
  { x: 214, y: 396, at: 14.5, dur: 0.8, ease: "power2.in", rot: -26 },
]);

// The freed knife hand comes back and peels the offcut off the sheet.
handPath(arms3.armR, [arms3.handR.group], [542, 396], [
  { x: 470, y: 262, at: 14.1, dur: 0.7, ease: "power2.out", rot: 0 },
  { x: 408, y: 190, at: 14.9, dur: 0.6, ease: "power2.inOut" },
]);
offcut3.fadeTo(0, { at: 15.5, duration: 0.2 });
strip3.fadeTo(1, { at: 15.5, duration: 0.2 });
handPath(arms3.armR, [arms3.handR.group, stripDriver3], [408, 190], [
  // Up and away — fast enough that the spring genuinely has to catch up, which is the point:
  // the strip bows behind the hand and overshoots when the hand stops.
  { x: 452, y: 178, at: 15.6, dur: 0.45, ease: "power3.out", rot: 14 },
  { x: 470, y: 200, at: 16.15, dur: 0.65, ease: "back.out(1.6)" },
  // Lets it go, and it flops down flat beside the sheet.
  { x: 500, y: 300, at: 17.2, dur: 0.6, ease: "power2.in", rot: 4 },
  { x: 540, y: 392, at: 17.9, dur: 0.8, ease: "power2.inOut", rot: 0 },
]);

// Two flat-handed pats to settle the cut panel — quick in, slow off, the small punctuation that
// ends a piece of work. The left hand, which is free again by now.
handPath(arms3.armL, [arms3.handL.group], [214, 396], [
  { x: 262, y: 300, at: 17.0, dur: 0.8, ease: "power2.out", rot: 0 },
  { x: 261, y: 306, at: 17.9, dur: 0.22, ease: "power4.out" },
  { x: 262, y: 300, at: 18.16, dur: 0.34, ease: "back.out(3)" },
  { x: 318, y: 292, at: 18.6, dur: 0.5, ease: "power2.inOut" },
  { x: 317, y: 298, at: 19.15, dur: 0.22, ease: "power4.out" },
  { x: 318, y: 292, at: 19.4, dur: 0.34, ease: "back.out(3)" },
]);

scene3.camera().panTo(322, 213, { at: 0, duration: TOTAL3, ease: "sine.inOut" });
scene3.camera().zoomTo(1.05, { at: 0, duration: TOTAL3, ease: "sine.inOut" });

scene3.add(sketch.sound("D2", { at: 0, duration: TOTAL3, instrument: "pad", velocity: 0.14 }));
// One brush stroke per blade pass, and a soft hit for every time a hand lands on something.
scene3.add(sketch.sound(null, { at: 7.1, duration: 1.7, instrument: "brush", velocity: 0.22 }));
scene3.add(sketch.sound(null, { at: 10.9, duration: 1.4, instrument: "brush", velocity: 0.3 }));
for (const [at, vel] of [[4.32, 0.12], [6.22, 0.14], [17.9, 0.13]] as [number, number][]) {
  scene3.add(sketch.sound(null, { at, duration: 0.1, instrument: "thud", velocity: vel }));
}
scene3.add(sketch.sound(null, { at: 16.5, duration: 0.14, instrument: "brush", velocity: 0.16 }));
for (const [pitch, at, vel] of [["A3", 1.2, 0.22], ["E4", 5.1, 0.2], ["G3", 14.2, 0.2]] as [string, number, number][]) {
  scene3.add(sketch.sound(pitch, { at, duration: 1.4, instrument: "piano", velocity: vel, pan: -0.18 }));
}

/** Walks a node along a series of points as chained moveBy deltas — for a spring driver that has
 * to follow a brush stroke or a bending strip. Returns where it ended up. */
function tracePath(node: Stroke | Group, from: Pt, pts: Pt[], at: number, dur: number, ease = "power1.inOut"): Pt {
  let prev = from;
  const seg = dur / pts.length;
  pts.forEach((p, i) => {
    node.moveBy(p[0] - prev[0], p[1] - prev[1], { at: at + i * seg, duration: seg, ease: i === 0 ? "power2.out" : ease });
    prev = p;
  });
  return prev;
}

// ============================================================================================
// SCENE 4 — Folding the panel and bending the frame. The cut sheet becomes a lantern.
// ============================================================================================
const TOTAL4 = 18.0;

const scene4 = sketch.scene({
  width: W,
  height: H,
  background: "#150e0b",
  seed: "lantern-folding",
  look: "ink",
  texture: "grain",
});

const cu4 = buildBenchCloseup(scene4, 420, 0.8);
flicker(cu4.lamp.flame, 1.4, TOTAL4, 0.8, 13);
driftDriver(cu4.lamp.driver, 1.4, TOTAL4, 2.2, 3.6, 47);

// The panel he cut in the previous scene, waiting on the bench.
const panel4 = sketch.loop([[152, 192], [428, 184], [450, 312], [128, 318]], {
  color: "#8e7145", weight: "light", looseness: 0.1, smooth: false,
  fill: {
    color: { stops: [{ offset: 0, color: "#cdb283" }, { offset: 0.55, color: "#e2caa0" }, { offset: 1, color: "#eddab2" }], direction: "horizontal" },
    style: "solid",
  },
});
scene4.add(panel4).appear({ at: 0.9, duration: 0.8 });

const arms4 = buildCraftArms(scene4, 1.15);

// Two creases, each revealed under the hand that presses it.
const crease4a = sketch.stroke([[186, 232], [404, 224]], { color: "#a4884f", weight: "confident", looseness: 0.12 });
scene4.add(crease4a);
const crease4b = sketch.stroke([[178, 276], [412, 268]], { color: "#a4884f", weight: "confident", looseness: 0.12 });
scene4.add(crease4b);

// --- Beat 1: two creases folded in -----------------------------------------------------------
// The shape of a press: arrive slowly, commit hard downward for a fifth of a second
// (`power4.out`), then come back up a hair past level (`back.out`). The two hands press slightly
// out of phase, because two hands folding one crease don't land on the same frame.
handPath(arms4.armL, [arms4.handL.group], arms4.handL.at, [
  { x: 226, y: 258, at: 2.2, dur: 0.9, ease: "power2.out" },
  { x: 224, y: 266, at: 3.2, dur: 0.2, ease: "power4.out" },
  { x: 225, y: 258, at: 3.42, dur: 0.36, ease: "back.out(2.6)" },
  { x: 232, y: 302, at: 4.4, dur: 0.7, ease: "power2.inOut" },
  { x: 230, y: 310, at: 5.2, dur: 0.2, ease: "power4.out" },
  { x: 231, y: 302, at: 5.42, dur: 0.36, ease: "back.out(2.6)" },
  { x: 250, y: 350, at: 6.0, dur: 0.8, ease: "power2.inOut" },
]);
handPath(arms4.armR, [arms4.handR.group], arms4.handR.at, [
  { x: 372, y: 250, at: 2.4, dur: 0.9, ease: "power2.out" },
  { x: 370, y: 258, at: 3.35, dur: 0.2, ease: "power4.out" },
  { x: 371, y: 250, at: 3.57, dur: 0.36, ease: "back.out(2.6)" },
  { x: 380, y: 294, at: 4.55, dur: 0.7, ease: "power2.inOut" },
  { x: 378, y: 302, at: 5.35, dur: 0.2, ease: "power4.out" },
  { x: 379, y: 294, at: 5.57, dur: 0.36, ease: "back.out(2.6)" },
]);
crease4a.drawOn({ at: 3.3, duration: 0.8, ease: "power2.out" });
crease4b.drawOn({ at: 5.3, duration: 0.8, ease: "power2.out" });

// --- Beat 2: bending a bamboo rib into a hoop ------------------------------------------------
// The second real use of springTo + connector, and the clearest one: the strip is PINNED to the
// bench at its left end (a genuinely fixed anchor, which is what a connector needs), its free end
// is a spring chasing the hand, and the connector between them is the strip itself. Bending it
// fast makes it bow past where the hand is and spring back — the thing a rigid rotated shape
// cannot do at all.
const RIB_PIN: Pt = [148, 336];
const ribTip4 = sketch.blob(408, 344, 2.2, { color: CLEAR, looseness: 0, energy: "calm", fill: { color: CLEAR, style: "solid" } }, 6);
scene4.add(ribTip4);
const ribDriver4 = springDriver(scene4, ribTip4);
ribTip4.springTo(ribDriver4, { stiffness: 58, damping: 9, at: 6.6 });
const rib4 = sketch.connector(RIB_PIN, ribTip4, { color: BAMBOO, weight: 7, looseness: 0.14 });
scene4.add(rib4);
rib4.initial({ opacity: 0 });
rib4.fadeTo(1, { at: 6.2, duration: 0.4 });

let gripR4 = handPath(arms4.armR, [arms4.handR.group], [379, 294], [
  { x: 408, y: 344, at: 6.8, dur: 0.7, ease: "power2.out", rot: 8 },
]);
// The bend: three unequal pulls, quick then held, so it reads as testing the wood rather than
// executing a curve.
gripR4 = handPath(arms4.armR, [arms4.handR.group, ribDriver4], gripR4, [
  { x: 372, y: 300, at: 7.7, dur: 0.5, ease: "power3.out", rot: -6 },
  { x: 330, y: 276, at: 8.3, dur: 0.45, ease: "power3.out", rot: -18 },
  { x: 302, y: 300, at: 8.9, dur: 0.6, ease: "back.out(1.8)", rot: -30 },
  { x: 288, y: 330, at: 9.7, dur: 0.5, ease: "power2.inOut", rot: -34 },
]);

// The finished hoop: a plotted trig ellipse (a blob at this size is a lumpy potato, see the note
// on the lantern's own rims), revealed as the strip comes round to meet itself.
const hoop4 = sketch.loop(ellipsePoints(300, 322, 62, 15, 26), {
  color: "#4a3117", weight: "confident", looseness: 0.12, smooth: true,
  fill: { color: CLEAR, style: "solid" },
});
scene4.add(hoop4).drawOn({ at: 9.9, duration: 1.0 });
rib4.fadeTo(0, { at: 10.6, duration: 0.5 });
gripR4 = handPath(arms4.armR, [arms4.handR.group], gripR4, [
  { x: 356, y: 352, at: 10.6, dur: 0.7, ease: "power2.inOut", rot: -10 },
]);

// --- Beat 3: the panel wraps the frame, and the lantern exists -------------------------------
// The panel goes; the assembled body arrives in its place, part by part, in the order it would
// actually be built: paper first, then the rims, then the ribs, then the hoop.
panel4.fadeTo(0, { at: 11.4, duration: 0.7 });
crease4a.fadeTo(0, { at: 11.4, duration: 0.5 });
crease4b.fadeTo(0, { at: 11.4, duration: 0.5 });
hoop4.fadeTo(0, { at: 12.0, duration: 0.6 });
const lantern4 = buildLantern(scene4, { x: 300, y: 232, s: 2.0, lit: false });
for (let i = 0; i < lantern4.parts.length; i++) {
  lantern4.parts[i].initial({ opacity: 0 });
  lantern4.parts[i].fadeTo(1, { at: 11.6 + i * 0.34, duration: 0.5, ease: "sine.out" });
}

// He steadies it and squares up the top rim: a light touch, not a press.
handPath(arms4.armL, [arms4.handL.group], [250, 350], [
  { x: 236, y: 268, at: 13.6, dur: 0.9, ease: "power2.out", rot: -8 },
  { x: 240, y: 262, at: 14.7, dur: 0.3, ease: "power3.out" },
  { x: 238, y: 266, at: 15.1, dur: 0.4, ease: "back.out(2.2)" },
  { x: 226, y: 340, at: 16.4, dur: 1.0, ease: "power2.inOut", rot: 0 },
]);
handPath(arms4.armR, [arms4.handR.group], gripR4, [
  { x: 372, y: 200, at: 13.9, dur: 0.9, ease: "power2.out", rot: 0 },
  { x: 368, y: 194, at: 15.0, dur: 0.28, ease: "power3.out" },
  { x: 370, y: 199, at: 15.35, dur: 0.42, ease: "back.out(2.2)" },
  { x: 396, y: 344, at: 16.6, dur: 1.1, ease: "power2.inOut" },
]);

scene4.camera().panTo(318, 210, { at: 0, duration: TOTAL4, ease: "sine.inOut" });
scene4.camera().zoomTo(1.06, { at: 0, duration: TOTAL4, ease: "sine.inOut" });

scene4.add(sketch.sound("D2", { at: 0, duration: TOTAL4, instrument: "pad", velocity: 0.14 }));
for (const [at, vel] of [[3.2, 0.16], [5.2, 0.16], [14.7, 0.1]] as [number, number][]) {
  scene4.add(sketch.sound(null, { at, duration: 0.09, instrument: "thud", velocity: vel }));
}
scene4.add(sketch.sound(null, { at: 8.3, duration: 0.5, instrument: "brush", velocity: 0.2 }));
scene4.add(sketch.sound(null, { at: 9.9, duration: 0.3, instrument: "pluck", velocity: 0.18 }));
for (const [pitch, at, vel] of [["A3", 2.2, 0.2], ["E4", 9.9, 0.22], ["D4", 11.6, 0.24]] as [string, number, number][]) {
  scene4.add(sketch.sound(pitch, { at, duration: 1.5, instrument: "piano", velocity: vel, pan: -0.15 }));
}
scene4.add(sketch.sound("E3", { at: 11.6, duration: 3.6, instrument: "strings", velocity: 0.14 }));

// ============================================================================================
// SCENE 5 — Painting the paper, then lighting the candle. The turn of the whole film: up to here
// the lamp has been the only light in the world, and from here the lantern is one too.
// ============================================================================================
const TOTAL5 = 22.6;

const scene5 = sketch.scene({
  width: W,
  height: H,
  background: "#150e0b",
  seed: "lantern-painting",
  look: "ink",
  texture: "grain",
});

const cu5 = buildBenchCloseup(scene5, 420, 0.8);
flicker(cu5.lamp.flame, 1.4, TOTAL5, 0.8, 17);
driftDriver(cu5.lamp.driver, 1.4, TOTAL5, 2.2, 3.6, 53);

const LANTERN5: Pt = [300, 232];
const lantern5 = buildLantern(scene5, { x: LANTERN5[0], y: LANTERN5[1], s: 2.0, lit: false });
for (let i = 0; i < lantern5.parts.length; i++) lantern5.parts[i].initial({ opacity: 1 });
lantern5.group.initial({ opacity: 0 });
lantern5.group.fadeTo(1, { at: 0.6, duration: 0.7 });

// The ink dish.
scene5.add(
  sketch.loop(ellipsePoints(524, 308, 30, 13, 20), {
    color: "#241811", weight: "light", looseness: 0.12, smooth: true,
    fill: { color: { stops: [{ offset: 0, color: "#3a2818" }, { offset: 1, color: "#0c0806" }], direction: "vertical" }, style: "solid" },
  })
).drawOn({ at: 1.0, duration: 0.6 });
scene5.add(
  sketch.loop(ellipsePoints(524, 309, 21, 8, 18), {
    color: CLEAR, weight: "light", looseness: 0.1, smooth: true,
    fill: { color: "#120c08", style: "solid" },
  })
).appear({ at: 1.5, duration: 0.4 });

const arms5 = buildCraftArms(scene5, 1.15);

// --- The brush -------------------------------------------------------------------------------
// A brush is held with the wrist planted and the tip doing the travelling, which is exactly the
// geometry sketch.connector wants: the anchor (the ferrule, in his fingers) genuinely doesn't
// move, so the shaft can be a connector from that fixed point to a springTo'd tip. The shaft then
// BOWS as the tip drags across the paper and springs straight when it lifts — a loaded brush
// flexing under pressure, which is the one thing a rigid two-point stroke could never show.
// The anchor sits where his fingers hold the ferrule, which is also where the hand parks — kept
// close to the paper (~110px) because the connector IS the visible shaft: anchored back at the
// far side of the bench the "brush" came out 170px long and read as a second forearm.
const WRIST5: Pt = [412, 284];
const brushTip5 = sketch.blob(524, 306, 2.4, { color: CLEAR, looseness: 0, energy: "calm", fill: { color: CLEAR, style: "solid" } }, 6);
scene5.add(brushTip5);
const brushDriver5 = springDriver(scene5, brushTip5);
brushTip5.springTo(brushDriver5, { stiffness: 130, damping: 13, at: 2.0 });
const brushShaft5 = sketch.connector(WRIST5, brushTip5, { color: "#2c1b0c", weight: 5, looseness: 0.1 });
scene5.add(brushShaft5);
brushShaft5.initial({ opacity: 0 });
brushShaft5.fadeTo(1, { at: 1.9, duration: 0.3 });

// The hand that holds it barely moves for the whole painting sequence — one arrival, then small
// adjustments. All the motion is in the tip.
handPath(arms5.armR, [arms5.handR.group], arms5.handR.at, [
  { x: 418, y: 292, at: 1.5, dur: 0.9, ease: "power2.out", rot: -12 },
  { x: 414, y: 286, at: 2.6, dur: 0.4, ease: "back.out(2)" },
]);
// The far hand steadies the lantern while he paints.
handPath(arms5.armL, [arms5.handL.group], arms5.handL.at, [
  { x: 224, y: 262, at: 1.8, dur: 1.0, ease: "power2.out", rot: -6 },
  { x: 226, y: 266, at: 2.9, dur: 0.35, ease: "back.out(2.2)" },
]);

// Dip, paint, dip again. Each mark on the paper is a stroke revealed exactly as the tip crosses
// it, and each dip is a quick drop into the dish with a little pause after — the rhythm of
// actually loading a brush, not a continuous sweep.
const motif5 = lanternMotif(LANTERN5[0], LANTERN5[1], 2.0);
let tip = [524, 306] as Pt;
const DIP: Pt = [520, 306];
const marks: { pts: Pt[]; at: number; dur: number }[] = [
  { pts: motif5[0], at: 4.4, dur: 1.5 },
  { pts: motif5[1], at: 7.0, dur: 1.4 },
  { pts: motif5[2], at: 9.6, dur: 0.3 },
  { pts: motif5[3], at: 10.4, dur: 0.3 },
  { pts: motif5[4], at: 11.2, dur: 0.3 },
];
for (let i = 0; i < marks.length; i++) {
  const m = marks[i];
  const stroke = sketch.stroke(m.pts.length > 2 ? m.pts : [m.pts[0], m.pts[1]], {
    color: "#5e3413", weight: m.pts.length > 2 ? 4 : 6, looseness: 0.22, smooth: true,
  });
  scene5.add(stroke);
  if (m.pts.length > 2) {
    // A drawn stroke: the tip travels it and the ink appears behind it.
    tip = tracePath(brushDriver5, tip, [[m.pts[0][0], m.pts[0][1] - 6], ...m.pts], m.at - 0.5, 0.5 + m.dur, "power1.inOut");
    stroke.drawOn({ at: m.at, duration: m.dur, ease: "power1.inOut" });
  } else {
    // A dab: down fast, off with a snap. `back.out(3)` on the lift is what makes it read as a
    // dab rather than a dot fading in.
    tip = tracePath(brushDriver5, tip, [m.pts[0]], m.at - 0.25, 0.25, "power3.out");
    stroke.drawOn({ at: m.at, duration: 0.2, ease: "power2.out" });
    tip = tracePath(brushDriver5, tip, [[m.pts[1][0] + 4, m.pts[1][1] - 10]], m.at + 0.22, 0.3, "back.out(3)");
  }
  // Back to the dish between marks.
  if (i < marks.length - 1) tip = tracePath(brushDriver5, tip, [DIP], m.at + m.dur + 0.25, 0.6, "power2.inOut");
}
// The brush goes down.
tip = tracePath(brushDriver5, tip, [[540, 330]], 11.9, 0.8, "power2.inOut");
brushShaft5.fadeTo(0, { at: 12.9, duration: 0.4 });
handPath(arms5.armR, [arms5.handR.group], [414, 286], [
  { x: 520, y: 330, at: 12.4, dur: 0.8, ease: "power2.inOut", rot: 4 },
]);

// --- The candle, and the flame ---------------------------------------------------------------
// The left hand sets a candle inside; the right brings a lit splint over from the lamp.
const candle5 = sketch.loop(ellipsePoints(226, 300, 7, 11, 12), {
  color: "#6b4a1e", weight: "light", looseness: 0.14, smooth: true,
  fill: { color: "#f3e0b0", style: "solid" },
});
scene5.add(candle5);
candle5.initial({ opacity: 0 });
candle5.fadeTo(1, { at: 13.2, duration: 0.3 });
handPath(arms5.armL, [arms5.handL.group, candle5], [226, 266], [
  { x: 226, y: 300, at: 13.4, dur: 0.6, ease: "power2.inOut" },
  { x: 296, y: 286, at: 14.1, dur: 0.8, ease: "power2.out" },
  { x: 298, y: 292, at: 15.0, dur: 0.25, ease: "power4.out" },
  { x: 297, y: 286, at: 15.28, dur: 0.36, ease: "back.out(2.6)" },
]);
candle5.fadeTo(0, { at: 15.7, duration: 0.25 });
lantern5.candle.fadeTo(1, { at: 15.7, duration: 0.3 });
handPath(arms5.armL, [arms5.handL.group], [297, 286], [
  { x: 236, y: 336, at: 15.9, dur: 0.9, ease: "power2.inOut" },
]);

// The splint: a thin stick with its own small flame, carried from the lamp to the wick.
const splint5 = sketch.group();
scene5.add(splint5);
const SPLINT_GRIP: Pt = [520, 330];
{
  const S = (p: Pt): Pt => [SPLINT_GRIP[0] + p[0], SPLINT_GRIP[1] + p[1]];
  splint5.add(sketch.stroke([S([6, 2]), S([-26, -26])], { color: "#4a3018", weight: 5, looseness: 0.16 }));
  const f = sketch.loop([S([-28, -24]), S([-30, -32]), S([-34, -26])], {
    color: CLEAR, weight: "light", looseness: 0.2, energy: "quick", smooth: true,
    fill: { color: { stops: [{ offset: 0, color: LAMP_FLAME }, { offset: 1, color: "#f0a83a" }], direction: "vertical" }, style: "solid" },
  });
  splint5.add(f);
  flicker(f, 16.2, TOTAL5, 1.4, 61);
  splint5.pivotAt(SPLINT_GRIP[0], SPLINT_GRIP[1]);
}
splint5.initial({ opacity: 0 });
splint5.fadeTo(1, { at: 16.0, duration: 0.3 });
handPath(arms5.armR, [arms5.handR.group, splint5], [520, 330], [
  { x: 400, y: 300, at: 16.3, dur: 1.0, ease: "power2.out", rot: -8 },
  // The last inch toward the wick is slow — the one moment in the film that should feel careful.
  { x: 344, y: 288, at: 17.5, dur: 1.1, ease: "power2.inOut", rot: -14 },
  { x: 340, y: 292, at: 18.7, dur: 0.35, ease: "power4.out" },
]);

// It catches. Everything warm in the frame steps up together — the lantern's paper lit from
// inside, its halo, and the pool on the bench, because one new light source is now in the room.
const LIT = 19.1;
lantern5.flame.fadeTo(1, { at: LIT, duration: 0.25 });
lantern5.bodyWarm.fadeTo(1, { at: LIT + 0.1, duration: 1.3, ease: "sine.out" });
for (let i = 0; i < lantern5.glow.length; i++) lantern5.glow[i].fadeTo(1, { at: LIT + 0.15 + i * 0.14, duration: 1.4, ease: "sine.out" });
flicker(lantern5.flame, LIT + 0.4, TOTAL5, 1, 71);
for (let i = 0; i < cu5.pool.length; i++) cu5.pool[i].fadeTo(1.0, { at: LIT + 0.2, duration: 1.2, ease: "sine.out" });

// He draws the splint back and away, and the frame holds on what he's made.
handPath(arms5.armR, [arms5.handR.group, splint5], [340, 292], [
  { x: 366, y: 302, at: 19.5, dur: 0.6, ease: "back.out(1.6)", rot: -6 },
  { x: 480, y: 356, at: 20.4, dur: 1.0, ease: "power2.inOut", rot: 14 },
]);
splint5.fadeTo(0, { at: 21.4, duration: 0.5 });

scene5.camera().panTo(312, 216, { at: 0, duration: TOTAL5, ease: "sine.inOut" });
scene5.camera().zoomTo(1.09, { at: 0, duration: TOTAL5, ease: "sine.inOut" });

scene5.add(sketch.sound("D2", { at: 0, duration: TOTAL5, instrument: "pad", velocity: 0.14 }));
for (const m of marks.slice(0, 3)) scene5.add(sketch.sound(null, { at: m.at, duration: Math.max(0.12, m.dur * 0.8), instrument: "brush", velocity: 0.14 }));
for (const [pitch, at, vel] of [["A3", 1.5, 0.2], ["E4", 7.0, 0.2], ["A3", 13.4, 0.2]] as [string, number, number][]) {
  scene5.add(sketch.sound(pitch, { at, duration: 1.5, instrument: "piano", velocity: vel, pan: -0.15 }));
}
// The lighting itself: a soft hit, then the score opens up for the first time in the film.
scene5.add(sketch.sound(null, { at: LIT, duration: 0.2, instrument: "pluck", velocity: 0.26 }));
scene5.add(sketch.sound("A3", { at: LIT + 0.1, duration: 3.6, instrument: "strings", velocity: 0.22 }));
scene5.add(sketch.sound("C5", { at: LIT + 1.4, duration: 2.0, instrument: "piano", velocity: 0.2 }));

// ============================================================================================
// SCENE 6 — The pause. He straightens, lifts what he's made, and looks at it.
// ============================================================================================
const TOTAL6 = 14.1;

const scene6 = sketch.scene({
  width: W,
  height: H,
  background: "#150e0b",
  seed: "lantern-pause",
  look: "ink",
  texture: "grain",
});

// Same room as scene 2, re-established quickly (a cut back to a place the audience has already
// been doesn't need to be drawn on again).
scene6.add(
  sketch.loop([[-20, -20], [660, -20], [660, 300], [-20, 300]], {
    color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
    fill: {
      color: {
        stops: [{ offset: 0, color: "#191110" }, { offset: 0.35, color: "#241811" }, { offset: 0.66, color: "#3d2716" }, { offset: 1, color: "#291a12" }],
        direction: "horizontal",
      },
      style: "solid",
    },
  })
).appear({ at: 0, duration: 0.5 });
scene6.add(
  sketch.loop([[-20, 300], [660, 300], [660, H + 20], [-20, H + 20]], {
    color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#221509" }, { offset: 1, color: "#0d0805" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0, duration: 0.5 });
scene6.add(
  sketch.loop([[-20, 293], [660, 293], [660, 302], [-20, 302]], {
    color: "#120c07", weight: "light", looseness: 0.08, smooth: false,
    fill: { color: sketch.shade("#4a2d16", { from: "top", amount: 0.4 }), style: "solid" },
  })
).appear({ at: 0, duration: 0.5 });

const lamp6 = buildLamp(scene6, 430, 120, 1, 30);
for (const glowRing of lamp6.glow) glowRing.initial({ opacity: 1 });
flicker(lamp6.flame, 0.4, TOTAL6, 0.8, 23);
driftDriver(lamp6.driver, 0.4, TOTAL6, 2.4, 3.2, 67);
scene6.add(sketch.loop([[-20, 16], [660, 16], [660, 30], [-20, 30]], {
  color: "#150e09", weight: "confident", looseness: 0.08, smooth: false,
  fill: { color: sketch.shade("#3a2414", { from: "top", amount: 0.35 }), style: "solid" },
})).appear({ at: 0, duration: 0.5 });

scene6.add(
  sketch.loop([[228, 356], [312, 356], [306, 366], [234, 366]], {
    color: "#150e08", weight: "confident", looseness: 0.1, smooth: false,
    fill: { color: sketch.shade("#4a2d15", { from: "top", amount: 0.4 }), style: "solid" },
  })
).appear({ at: 0.1, duration: 0.5 });
for (const sx of [238, 296]) {
  scene6.add(sketch.stroke([[sx, 366], [sx - 5, 412]], { color: "#241710", weight: "bold", looseness: 0.14 })).appear({ at: 0.1, duration: 0.5 });
}

const art6 = buildArtisan(scene6, {
  x: 270, y: 352, s: 2.0, facing: 1, lit: "right", warm: "#6f421d",
  armLen: [32, 30], seated: true, face: true, bendNear: 1, bendFar: 1,
});
art6.armNear.restAt(...art6.local(352, 312));
art6.armFar.restAt(...art6.local(336, 320));
art6.group.initial({ opacity: 0, rotation: 2.6 });
art6.group.fadeTo(1, { at: 0.2, duration: 0.6 });
art6.pivotLocal(0, 0);

scene6.add(
  sketch.loop([[196, 330], [664, 330], [664, 346], [210, 346]], {
    color: "#1a1109", weight: "confident", looseness: 0.08, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#7d4e25" }, { offset: 0.55, color: "#5c3719" }, { offset: 1, color: "#3d2411" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0.1, duration: 0.5 });
scene6.add(
  sketch.loop([[210, 346], [664, 346], [664, 368], [210, 368]], {
    color: "#150e08", weight: "confident", looseness: 0.08, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#38220f" }, { offset: 1, color: "#180f08" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0.1, duration: 0.5 });

const pool6 = warmPool(scene6, 400, 336, [
  [178, 26, 0, "#c2661d18"], [124, 19, 0, "#d1791f26"], [78, 13, 0, "#e2913138"], [42, 8, 0, "#f5b45c40"],
]);
for (const p of pool6) p.initial({ opacity: 1 });

// The lantern, lit, standing on the bench where scene 5 left it — the same builder, the same
// painted motif, one scale down for the wider framing.
const lantern6 = buildLantern(scene6, { x: 386, y: 303, s: 0.95, lit: true, motif: true });
const lanternDriver6 = springDriver(scene6, lantern6.group);
// Low stiffness and light damping: a paper lantern on a hoop has almost no mass and swings for a
// long time. This is the sway that makes it read as HANGING from his hand rather than pasted to it.
lantern6.group.springTo(lanternDriver6, { stiffness: 34, damping: 4.4, at: 3.6 });
flicker(lantern6.flame, 0.4, TOTAL6, 1, 79);

// --- The beat -------------------------------------------------------------------------------
// A held frame first: nothing moves for a second and a half except the two flames. Then the
// straightening of a back that's been bent over a bench all evening — slow, and past level before
// it settles, which is what makes it read as relief rather than as a pose change.
art6.group.rotateTo(-2.2, { at: 1.6, duration: 2.0, ease: "power2.out" });
art6.group.rotateTo(-0.8, { at: 3.7, duration: 1.2, ease: "back.out(1.4)" });

// Reaching for the hoop, gripping, lifting. The lantern is on a spring, so it lags behind the
// hand on the way up and keeps swinging after the hand has stopped.
art6.armNear.ikTo(...art6.local(388, 268), { at: 3.4, duration: 0.9, ease: "power2.out" });
art6.armNear.ikTo(...art6.local(386, 272), { at: 4.4, duration: 0.3, ease: "power3.out" });
art6.armNear.ikTo(...art6.local(378, 232), { at: 5.0, duration: 1.1, ease: "power2.out" });
art6.armNear.ikTo(...art6.local(380, 238), { at: 6.2, duration: 0.5, ease: "back.out(1.8)" });
lanternDriver6.moveBy(2, -35, { at: 5.0, duration: 1.1, ease: "power2.out" });
lanternDriver6.moveBy(2, 6, { at: 6.2, duration: 0.5, ease: "back.out(1.8)" });
// He turns it a little to look at the painted side.
lanternDriver6.moveBy(-8, 0, { at: 7.4, duration: 1.4, ease: "sine.inOut" });
lanternDriver6.moveBy(6, 2, { at: 9.2, duration: 1.6, ease: "sine.inOut" });
art6.armNear.ikTo(...art6.local(372, 236), { at: 7.4, duration: 1.4, ease: "sine.inOut" });
art6.armNear.ikTo(...art6.local(378, 240), { at: 9.2, duration: 1.6, ease: "sine.inOut" });
// The far hand comes up under it, the way you hold something you don't want to drop.
art6.armFar.ikTo(...art6.local(348, 268), { at: 6.6, duration: 1.0, ease: "power2.inOut" });
art6.armFar.ikTo(...art6.local(352, 264), { at: 7.7, duration: 0.5, ease: "back.out(2)" });
// A small nod.
art6.group.rotateTo(1.4, { at: 11.0, duration: 0.7, ease: "power2.out" });
art6.group.rotateTo(-0.6, { at: 11.8, duration: 1.3, ease: "back.out(1.2)" });

scene6.camera().panTo(352, 258, { at: 0, duration: TOTAL6, ease: "sine.inOut" });
scene6.camera().zoomTo(1.3, { at: 0, duration: TOTAL6, ease: "sine.inOut" });

scene6.add(sketch.sound("D2", { at: 0, duration: TOTAL6, instrument: "pad", velocity: 0.15 }));
scene6.add(sketch.sound("A3", { at: 1.6, duration: 2.4, instrument: "strings", velocity: 0.16 }));
for (const [pitch, at, vel] of [["E4", 3.4, 0.22], ["A4", 7.4, 0.2], ["D4", 12.4, 0.16]] as [string, number, number][]) {
  scene6.add(sketch.sound(pitch, { at, duration: 1.6, instrument: "piano", velocity: vel, pan: -0.16 }));
}

// ============================================================================================
// SCENE 7 — The walk. Out of the workshop and through the town, dusk going over into night, the
// lantern the only warm thing moving through it.
//
// A world 1700px wide against a 640px viewport, four parallax planes, and the camera panning with
// him. panTo takes ABSOLUTE scene points, so this is panTo(START_X) → panTo(END_X), not a delta;
// and the end point is kept 400px clear of the world's right edge, because a viewport that
// extends past the world's own bounds puts a stray pale rectangle in frame (quiet-ride.ts hit
// exactly that). A plain pan rather than camera.follow(): the walk's timing is known exactly, so
// a linear pan is both simpler and free of follow's "only tracks inside its own window" trap.
// ============================================================================================
const TOTAL7 = 21.0;
const WORLD7 = 1700;
const GROUND7 = 330;
const WALK_START_X = 420;
const STEPS7 = 18;
const STEP_DX7 = 44;
const STEP_DUR7 = 0.95;
const WALK_AT7 = 2.4;
const WALK_END7 = WALK_AT7 + STEPS7 * STEP_DUR7;

const scene7 = sketch.scene({
  width: WORLD7,
  height: H,
  viewport: { width: W, height: H },
  background: {
    stops: [
      { offset: 0, color: "#141a30" },
      { offset: 0.42, color: "#26263f" },
      { offset: 0.72, color: "#4a3a44" },
      { offset: 0.88, color: "#6d4a3c" },
      { offset: 1, color: "#3a2a26" },
    ],
    direction: "vertical",
  },
  seed: "lantern-walk",
  look: "ink",
  texture: "grain",
});

// Stars, thinning toward the still-warm western horizon.
const starLayer7 = scene7.layer(0.15);
for (let i = 0; i < 40; i++) {
  const sx = 20 + ((i * 0.6180339887) % 1) * (WORLD7 - 40);
  const sy = 10 + ((i + 0.4 * rnd(i * 3 + 1)) / 40) * 150;
  const st = sketch.loop(ellipsePoints(sx, sy, 1.1 + rnd(i) * 0.7, 1.1 + rnd(i) * 0.7, 8), {
    color: "#cfd6ea", weight: 0.9, looseness: 0, energy: "calm", fill: { color: "#cfd6ea", style: "solid" },
  });
  starLayer7.add(st);
  st.initial({ opacity: 0 });
  st.fadeTo(0.3 + 0.45 * (1 - sy / 160), { at: 0.2 + i * 0.03, duration: 1.4, ease: "sine.out" });
}

// Distant roofline — one long silhouette, cool and hazy.
const far7 = scene7.layer(0.35);
{
  const pts: Pt[] = [[-40, 300]];
  for (let x = -40; x <= WORLD7 + 40; x += 90) {
    const h = 60 + rnd(x * 0.11) * 70;
    pts.push([x, 300 - h], [x + 60, 300 - h], [x + 60, 300 - h + 14 + rnd(x * 0.17) * 20]);
  }
  pts.push([WORLD7 + 40, 300], [WORLD7 + 40, 340], [-40, 340]);
  const roofs = sketch.loop(pts, {
    color: "#20243c", weight: "light", looseness: 0.06, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#2a2e48" }, { offset: 1, color: "#1c2036" }], direction: "vertical" }, style: "solid" },
  });
  far7.add(roofs);
  roofs.initial({ opacity: 0 });
  roofs.fadeTo(1, { at: 0.2, duration: 1.0 });
}

// Mid-ground buildings, with a scattering of lit windows — other people's evenings.
const mid7 = scene7.layer(0.68);
for (let i = 0; i < 9; i++) {
  const bx = -60 + i * 190;
  const bh = 86 + rnd(i * 7 + 2) * 54;
  const bw = 130 + rnd(i * 5 + 3) * 60;
  const b = sketch.loop([[bx, 320], [bx, 320 - bh], [bx + bw, 320 - bh], [bx + bw, 320]], {
    color: "#171a2a", weight: "light", looseness: 0.06, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#2b3050" }, { offset: 1, color: "#1c2138" }], direction: "vertical" }, style: "solid" },
  });
  mid7.add(b);
  b.initial({ opacity: 0 });
  b.fadeTo(1, { at: 0.3 + i * 0.06, duration: 0.9 });
  for (let w = 0; w < 3; w++) {
    if (rnd(i * 13 + w * 3) < 0.45) continue;
    const wx = bx + 24 + w * 38;
    if (wx + 16 > WORLD7 - 12 || wx < 8) continue;
    const wy = 320 - bh + 30 + Math.floor(rnd(i * 17 + w) * 2) * 44;
    // A soft halo behind each pane: a lit window at this distance is a smudge of light, not a
    // hard rectangle — the first pass had bright yellow rectangles floating in the dark.
    const halo = sketch.loop(ellipsePoints(wx + 6, wy + 9, 30, 25, 28), {
      color: CLEAR, weight: "light", looseness: 0.04, energy: "calm", smooth: true,
      fill: { color: "#e2a24e12", style: "solid" },
    });
    mid7.add(halo);
    halo.initial({ opacity: 0 });
    halo.fadeTo(1, { at: 1.0 + i * 0.14 + w * 0.1, duration: 1.2, ease: "sine.out" });
    const win = sketch.loop([[wx, wy], [wx + 12, wy], [wx + 12, wy + 17], [wx, wy + 17]], {
      color: CLEAR, weight: "light", looseness: 0.08, smooth: false,
      fill: { color: "#d99a45", style: "solid" },
    });
    mid7.add(win);
    win.initial({ opacity: 0 });
    win.fadeTo(0.5 + rnd(i * 19 + w) * 0.4, { at: 1.0 + i * 0.14 + w * 0.1, duration: 1.2, ease: "sine.out" });
  }
}

// The street he actually walks on, plus shopfronts at his own depth.
const street7 = sketch.loop([[-40, GROUND7], [WORLD7 + 40, GROUND7], [WORLD7 + 40, H + 20], [-40, H + 20]], {
  color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
  fill: { color: { stops: [{ offset: 0, color: "#332b30" }, { offset: 0.5, color: "#241f24" }, { offset: 1, color: "#171418" }], direction: "vertical" }, style: "solid" },
});
scene7.add(street7).appear({ at: 0, duration: 0.8 });
for (let i = 0; i < 7; i++) {
  const fx = -40 + i * 260;
  const fh = 96 + rnd(i * 11 + 5) * 34;
  scene7.add(
    sketch.loop([[fx, GROUND7], [fx, GROUND7 - fh], [fx + 190, GROUND7 - fh], [fx + 190, GROUND7]], {
      color: "#100e14", weight: "confident", looseness: 0.08, smooth: false,
      fill: { color: { stops: [{ offset: 0, color: "#2a2430" }, { offset: 1, color: "#141118" }], direction: "vertical" }, style: "solid" },
    })
  ).appear({ at: 0.4 + i * 0.08, duration: 0.8 });
  // A lintel line along the top of each front, which is most of what makes a dark rectangle read
  // as a building rather than a hole in the frame.
  scene7.add(
    sketch.stroke([[fx, GROUND7 - fh], [fx + 190, GROUND7 - fh]], { color: "#3d3546", weight: "confident", looseness: 0.1 })
  ).appear({ at: 0.5 + i * 0.08, duration: 0.6 });
  // A shuttered door, and on two of the seven, a lit paper lantern of his own making hanging
  // outside — the town is full of them, which is the quietest way to say what he does for a living.
  scene7.add(
    sketch.loop([[fx + 60, GROUND7], [fx + 60, GROUND7 - 62], [fx + 118, GROUND7 - 62], [fx + 118, GROUND7]], {
      color: "#0c0a0e", weight: "light", looseness: 0.1, smooth: false,
      fill: { color: "#171319", style: "solid" },
    })
  ).appear({ at: 0.6 + i * 0.08, duration: 0.6 });
  if (i % 3 === 1) {
    scene7.add(sketch.stroke([[fx + 158, GROUND7 - fh], [fx + 158, GROUND7 - fh + 18]], { color: "#241811", weight: "light", looseness: 0.16 })).appear({ at: 0.8, duration: 0.4 });
    const shopLantern = buildLantern(scene7, { x: fx + 158, y: GROUND7 - fh + 36, s: 0.5, lit: true, glowStrength: 0.75 });
    shopLantern.group.initial({ opacity: 0 });
    shopLantern.group.fadeTo(1, { at: 1.0, duration: 1.2, ease: "sine.out" });
    flicker(shopLantern.flame, 1.4, TOTAL7, 1.2, 83 + i);
  }
}

// Him, walking. Same builder as every other scene, this time with legs.
const art7 = buildArtisan(scene7, {
  x: WALK_START_X, y: GROUND7 - 62, s: 1.3, facing: 1, lit: "right", warm: "#6b3f1a",
  sleeveNear: "#57331a", armLen: [30, 28], legs: true, bendNear: 1, bendFar: -1,
});
// The pool the carried lantern throws on the street, added as a CHILD of his own group so it
// travels with the walk and rides the body bob without any tweens of its own. Local coordinates,
// because that's the space the group's children are authored in.
for (const [rx, ry, col] of [[104, 20, "#e2903020"], [64, 13, "#f0a84028"]] as [number, number, string][]) {
  art7.group.add(
    sketch.loop(ellipsePoints(24, 74, rx, ry, 40), {
      color: CLEAR, weight: "light", looseness: 0.04, energy: "calm", smooth: true,
      fill: { color: col, style: "solid" },
    })
  );
}
art7.armNear.restAt(...art7.local(WALK_START_X + 34, GROUND7 - 76));
art7.armFar.restAt(...art7.local(WALK_START_X - 5, GROUND7 - 84));
art7.group.initial({ opacity: 0 });
art7.group.fadeTo(1, { at: 0.8, duration: 0.9, ease: "sine.out" });

// The carried lantern: its own top-level node on a spring, chasing an invisible driver that
// carries the same step-by-step motion the body does. That's what makes it lag on every stride
// and keep swinging through the pauses, instead of being welded to the hand.
const lantern7 = buildLantern(scene7, { x: WALK_START_X + 34, y: GROUND7 - 42, s: 0.85, lit: true, motif: true });
lantern7.group.initial({ opacity: 0 });
lantern7.group.fadeTo(1, { at: 0.8, duration: 0.9, ease: "sine.out" });
const lanternDriver7 = springDriver(scene7, lantern7.group);
lantern7.group.springTo(lanternDriver7, { stiffness: 40, damping: 4.2, at: WALK_AT7 - 0.4 });
flicker(lantern7.flame, 1.0, TOTAL7, 1, 91);

// The gait: alternating legs from the hip, a body bob folded INTO each stride, and — the thing
// every walk in this repo so far has left out — the free arm counter-swinging, half a stride out
// of phase with the leg on the same side. The carrying arm stays down but is NOT locked: it rides
// the same rhythm a beat late, which is what a hand holding something does.
//
// Each stride is TWO half-moves (forward+up, then forward+down) rather than a full-width
// horizontal move with two separate vertical bobs layered over it, and that structure is
// load-bearing rather than tidiness. moveBy always tweens x AND y together, so a bob authored as
// its own overlapping `moveBy(0, -3)` also animates `x: "+=0"` across the same window — two live
// tweens writing x on the same element, and the later one pins x to whatever it captured at its
// start. The visible symptom was a walker who crossed about a tenth of the distance he should
// have while the camera panned the whole way: he slid off the back of his own shot. Folding the
// bob into the stride means exactly one tween owns x at any moment.
for (let i = 0; i < STEPS7; i++) {
  const at = WALK_AT7 + i * STEP_DUR7;
  const half = STEP_DUR7 / 2;
  const fwd = i % 2 === 0;
  art7.group.moveBy(STEP_DX7 / 2, -3, { at, duration: half, ease: "sine.out" });
  art7.group.moveBy(STEP_DX7 / 2, 3, { at: at + half, duration: half, ease: "sine.in" });
  lanternDriver7.moveBy(STEP_DX7 / 2, -3, { at, duration: half, ease: "sine.out" });
  lanternDriver7.moveBy(STEP_DX7 / 2, 3, { at: at + half, duration: half, ease: "sine.in" });
  art7.legNear?.rotateTo(fwd ? 20 : -20, { at, duration: STEP_DUR7, ease: "sine.inOut" });
  art7.legFar?.rotateTo(fwd ? -20 : 20, { at, duration: STEP_DUR7, ease: "sine.inOut" });
  // Counter-swing: the free arm reaches forward as the near leg goes back. The target is a fixed
  // point in the body's OWN local space — the whole group is translating, so an ikTo target that
  // also advanced by the stride would run away from the shoulder and clamp at full extension.
  const swing = fwd ? -16 : 16;
  art7.armFar.ikTo(
    ...art7.local(WALK_START_X - 5 + swing, GROUND7 - 82 + (fwd ? 2 : -2)),
    { at, duration: STEP_DUR7, ease: "sine.inOut" }
  );
  art7.armNear.ikTo(
    ...art7.local(WALK_START_X + 34, GROUND7 - 76 + (fwd ? 2 : -1)),
    { at: at + 0.12, duration: STEP_DUR7, ease: "sine.inOut" }
  );
}
// He slows and stops, and the lantern keeps swinging for a moment after he does.
art7.legNear?.rotateTo(4, { at: WALK_END7, duration: 0.8, ease: "power2.out" });
art7.legFar?.rotateTo(-4, { at: WALK_END7, duration: 0.8, ease: "power2.out" });
art7.armFar.ikTo(...art7.local(WALK_START_X - 7, GROUND7 - 80), { at: WALK_END7, duration: 0.9, ease: "back.out(1.4)" });

const cam7 = scene7.camera();
cam7.panTo(WALK_START_X + 40, 208, { at: 0, duration: 0 });
cam7.panTo(WALK_START_X + STEPS7 * STEP_DX7 + 40, 208, { at: WALK_AT7, duration: STEPS7 * STEP_DUR7, ease: "none" });

scene7.add(sketch.sound("D2", { at: 0, duration: TOTAL7, instrument: "pad", velocity: 0.16 }));
for (let i = 0; i < STEPS7; i += 3) {
  scene7.add(sketch.sound(null, { at: WALK_AT7 + i * STEP_DUR7 + 0.1, duration: 0.09, instrument: "thud", velocity: 0.1 + rnd(i) * 0.05 }));
}
const walkTune: [string, number][] = [["A3", 2.4], ["E4", 6.2], ["A3", 11.8], ["C4", 17.4]];
for (const [pitch, at] of walkTune) scene7.add(sketch.sound(pitch, { at, duration: 1.8, instrument: "piano", velocity: 0.2, pan: -0.12 }));
scene7.add(sketch.sound("E3", { at: WALK_END7 - 3.4, duration: 3.6, instrument: "strings", velocity: 0.16 }));

// ============================================================================================
// SCENE 8 — The bridge. He lets it go.
// ============================================================================================
const TOTAL8 = 22.0;
const DECK8 = 296;

const scene8 = sketch.scene({
  width: W,
  height: H,
  background: {
    stops: [
      { offset: 0, color: "#0a0e1e" },
      { offset: 0.4, color: "#141a33" },
      { offset: 0.72, color: "#20263f" },
      { offset: 1, color: "#2b2f43" },
    ],
    direction: "vertical",
  },
  seed: "lantern-bridge",
  look: "ink",
  texture: "grain",
});

for (let i = 0; i < 54; i++) {
  const sx = 8 + ((i * 0.6180339887) % 1) * (W - 16);
  const sy = 8 + ((i + 0.5 * rnd(i * 5 + 2)) / 54) * 230;
  const r = 0.75 + rnd(i * 3 + 3) * 0.6;
  const st = sketch.loop(ellipsePoints(sx, sy, r, r, 8), {
    color: i % 5 === 0 ? "#e8dcc4" : "#ccd4ea", weight: 0.8, looseness: 0, energy: "calm",
    fill: { color: i % 5 === 0 ? "#e8dcc4" : "#ccd4ea", style: "solid" },
  });
  scene8.add(st).initial({ opacity: 0 });
  st.fadeTo(0.18 + 0.36 * (1 - sy / 240), { at: 0.1 + i * 0.02, duration: 1.3, ease: "sine.out" });
  if (i % 6 === 2) {
    st.fadeTo(0.2, { at: 3.0 + i * 0.12, duration: 2.1, ease: "sine.inOut" });
    st.fadeTo(0.6, { at: 5.2 + i * 0.12, duration: 2.3, ease: "sine.inOut" });
  }
}

// The town he's walked out of, small and far off on the left bank.
scene8.add(
  sketch.loop([[-20, 268], [40, 268], [40, 250], [78, 250], [78, 262], [124, 262], [124, 242], [162, 242], [162, 266], [206, 266], [206, 272], [-20, 272]], {
    color: "#12172a", weight: "light", looseness: 0.08, smooth: false,
    fill: { color: "#161c30", style: "solid" },
  })
).appear({ at: 0.4, duration: 0.9 });
for (const [wx, wy] of [[26, 258], [64, 256], [110, 252], [148, 250], [186, 258]] as Pt[]) {
  scene8.add(
    sketch.loop([[wx, wy], [wx + 5, wy], [wx + 5, wy + 6], [wx, wy + 6]], { color: CLEAR, weight: "light", looseness: 0.1, smooth: false, fill: { color: "#d99a45", style: "solid" } })
  ).appear({ at: 1.2, duration: 0.9 });
}

// The river. Its own light comes from the sky and, once he's holding the lantern over it, from
// the lantern — the warm reflection column below is the only warm thing in the lower half.
scene8.add(
  sketch.loop([[-20, 272], [660, 272], [660, H + 20], [-20, H + 20]], {
    color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#1a2138" }, { offset: 0.5, color: "#141a2c" }, { offset: 1, color: "#0d1120" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0.2, duration: 1.0 });
const reflect8: Stroke[] = [];
for (let i = 0; i < 7; i++) {
  const ry = 318 + i * 14;
  const rw = 26 - i * 2.4;
  const r = sketch.loop([[250 - rw, ry], [250 + rw, ry], [250 + rw * 0.8, ry + 5], [250 - rw * 0.8, ry + 5]], {
    color: CLEAR, weight: "light", looseness: 0.3, energy: "quick", smooth: true,
    fill: { color: `#f0a63c${(48 - i * 6).toString(16).padStart(2, "0")}`, style: "solid" },
  });
  scene8.add(r).initial({ opacity: 0 });
  reflect8.push(r);
}
for (let i = 0; i < 8; i++) {
  const ry = 300 + i * 15;
  scene8.add(
    sketch.stroke([[-20 + rnd(i) * 60, ry], [180 + rnd(i + 3) * 120, ry + 2]], { color: "#2a3350", weight: "light", looseness: 0.3, energy: "quick" })
  ).appear({ at: 1.0 + i * 0.1, duration: 0.8 });
  scene8.add(
    sketch.stroke([[380 + rnd(i + 7) * 80, ry + 6], [600 + rnd(i + 11) * 50, ry + 4]], { color: "#2a3350", weight: "light", looseness: 0.3, energy: "quick" })
  ).appear({ at: 1.1 + i * 0.1, duration: 0.8 });
}

// The bridge: a shallow arc with a deck, a railing, and posts.
scene8.add(
  sketch.loop([...arcPoints(320, DECK8 + 96, 420, 118, 200, 340, 22), [660, H + 20], [-20, H + 20]], {
    color: "#0e1018", weight: "confident", looseness: 0.08, smooth: true,
    fill: { color: { stops: [{ offset: 0, color: "#20222c" }, { offset: 1, color: "#0c0e14" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0.6, duration: 1.0 });
const deck8 = sketch.loop([[-20, DECK8], [660, DECK8], [660, DECK8 + 12], [-20, DECK8 + 12]], {
  color: "#0d0f16", weight: "confident", looseness: 0.08, smooth: false,
  fill: { color: { stops: [{ offset: 0, color: "#2e3040" }, { offset: 1, color: "#14161e" }], direction: "vertical" }, style: "solid" },
});
scene8.add(deck8).appear({ at: 0.7, duration: 0.9 });
scene8.add(sketch.stroke([[-20, DECK8 - 42], [660, DECK8 - 44]], { color: "#22242e", weight: "confident", looseness: 0.1 })).drawOn({ at: 1.0, duration: 1.2 });
for (let px = 6; px < 636; px += 62) {
  scene8.add(sketch.stroke([[px, DECK8], [px + 1, DECK8 - 44]], { color: "#1c1e26", weight: "confident", looseness: 0.12 })).drawOn({ at: 1.2 + px * 0.0016, duration: 0.4 });
}

// Him, standing at the rail. Lit only by the lantern now — so the light is on his LEFT (the
// lantern is out over the water to his right... no: he holds it in front of him, and the frame's
// warm side is where it hangs), and the rim runs down that contour.
const art8 = buildArtisan(scene8, {
  x: 250, y: DECK8 - 62, s: 1.25, facing: 1, lit: "right", warm: "#5c3416",
  sleeveNear: "#4a2c13", armLen: [30, 28], legs: true, face: true, bendNear: 1, bendFar: -1,
});
art8.armNear.restAt(...art8.local(286, DECK8 - 74));
art8.armFar.restAt(...art8.local(262, DECK8 - 78));
art8.group.initial({ opacity: 0 });
art8.group.fadeTo(1, { at: 1.4, duration: 1.0, ease: "sine.out" });
art8.pivotLocal(0, 0);

const lantern8 = buildLantern(scene8, { x: 286, y: DECK8 - 46, s: 0.8, lit: true, motif: true });
lantern8.group.initial({ opacity: 0 });
lantern8.group.fadeTo(1, { at: 1.4, duration: 1.0, ease: "sine.out" });
const lanternDriver8 = springDriver(scene8, lantern8.group);
lantern8.group.springTo(lanternDriver8, { stiffness: 30, damping: 4.0, at: 2.0 });
flicker(lantern8.flame, 1.8, TOTAL8, 1, 97);
driftDriver(lanternDriver8, 2.2, 8.0, 2.0, 2.6, 101);
for (let i = 0; i < reflect8.length; i++) reflect8[i].fadeTo(1, { at: 2.4 + i * 0.1, duration: 1.4, ease: "sine.out" });

// --- The release ----------------------------------------------------------------------------
// Both arms come up together, hold, and open. The hold is the point of the scene: nothing moves
// for a second and a half except a flame and the water.
const LIFT8 = 8.6;
art8.armNear.ikTo(...art8.local(292, DECK8 - 104), { at: LIFT8, duration: 1.5, ease: "power2.out" });
art8.armFar.ikTo(...art8.local(272, DECK8 - 100), { at: LIFT8 + 0.15, duration: 1.5, ease: "power2.out" });
art8.armNear.ikTo(...art8.local(290, DECK8 - 98), { at: LIFT8 + 1.6, duration: 0.6, ease: "back.out(1.6)" });
art8.armFar.ikTo(...art8.local(270, DECK8 - 94), { at: LIFT8 + 1.75, duration: 0.6, ease: "back.out(1.6)" });
art8.group.rotateTo(-3.5, { at: LIFT8, duration: 1.6, ease: "power2.out" });
lanternDriver8.moveBy(4, -30, { at: LIFT8, duration: 1.5, ease: "power2.out" });
lanternDriver8.moveBy(0, 5, { at: LIFT8 + 1.6, duration: 0.6, ease: "back.out(1.6)" });

// Let go. The spring is left behind here on purpose — from this moment the lantern is no longer
// reacting to his hand, it's rising on its own, so it gets a real path of its own instead.
const RELEASE8 = 12.4;
lanternDriver8.moveBy(6, -14, { at: RELEASE8, duration: 1.2, ease: "power1.out" });
lanternDriver8.moveBy(10, -40, { at: RELEASE8 + 1.2, duration: 2.0, ease: "power1.in" });
lanternDriver8.moveBy(14, -66, { at: RELEASE8 + 3.2, duration: 3.0, ease: "sine.in" });
lanternDriver8.moveBy(12, -60, { at: RELEASE8 + 6.2, duration: 3.4, ease: "sine.inOut" });
lantern8.group.scaleTo(0.78, { at: RELEASE8 + 1.0, duration: 5.0, ease: "sine.in" });
lantern8.group.scaleTo(0.6, { at: RELEASE8 + 6.0, duration: 4.0, ease: "sine.inOut" });
// A few embers go up with it, on negative gravity so they climb the way hot air actually carries
// them rather than arcing back down.
scene8.add(
  sketch.particles(292, DECK8 - 96, { color: "#f2b25c", weight: 1, looseness: 0, energy: "calm", fill: { color: "#f2b25c", style: "solid" } }, {
    count: 16, angle: -90, spread: 40, speedMin: 12, speedMax: 34, gravity: -10,
    lifetime: 3.0, duration: 3.6, at: RELEASE8, sizeMin: 1, sizeMax: 1.9,
  })
);

// His hands stay open where the lantern was, then come down — slowly, and not together.
art8.armNear.ikTo(...art8.local(298, DECK8 - 92), { at: RELEASE8, duration: 0.5, ease: "power3.out" });
art8.armNear.ikTo(...art8.local(292, DECK8 - 84), { at: RELEASE8 + 2.4, duration: 2.2, ease: "power1.inOut" });
art8.armNear.ikTo(...art8.local(286, DECK8 - 74), { at: RELEASE8 + 5.0, duration: 2.6, ease: "sine.inOut" });
art8.armFar.ikTo(...art8.local(276, DECK8 - 88), { at: RELEASE8 + 0.2, duration: 0.5, ease: "power3.out" });
art8.armFar.ikTo(...art8.local(266, DECK8 - 80), { at: RELEASE8 + 3.0, duration: 2.4, ease: "power1.inOut" });
art8.armFar.ikTo(...art8.local(262, DECK8 - 78), { at: RELEASE8 + 6.0, duration: 2.4, ease: "sine.inOut" });
// He watches it up and away.
art8.group.rotateTo(-5.5, { at: RELEASE8 + 1.0, duration: 3.0, ease: "sine.inOut" });
art8.group.rotateTo(-4.0, { at: RELEASE8 + 6.0, duration: 3.4, ease: "sine.inOut" });
// The reflection fades as its source climbs out of reach of the water.
for (let i = 0; i < reflect8.length; i++) reflect8[i].fadeTo(0.12, { at: RELEASE8 + 1.6, duration: 4.0, ease: "sine.inOut" });

scene8.camera().panTo(322, 206, { at: 0, duration: TOTAL8, ease: "sine.inOut" });

scene8.add(sketch.sound("D2", { at: 0, duration: TOTAL8, instrument: "pad", velocity: 0.15 }));
for (const [pitch, at, vel] of [["A3", 1.4, 0.2], ["E4", LIFT8, 0.22], ["A4", RELEASE8, 0.24], ["D4", RELEASE8 + 5.0, 0.16]] as [string, number, number][]) {
  scene8.add(sketch.sound(pitch, { at, duration: 2.2, instrument: "piano", velocity: vel, pan: -0.1 }));
}
scene8.add(sketch.sound("A2", { at: RELEASE8, duration: 5.4, instrument: "strings", velocity: 0.18 }));

// ============================================================================================
// SCENE 9 — Into the night. The lantern small and glowing against the dark, and him watching it
// go. Almost nothing happens, which is the point.
// ============================================================================================
const TOTAL9 = 17.0;

const scene9 = sketch.scene({
  width: W,
  height: H,
  background: {
    stops: [
      { offset: 0, color: "#080b18" },
      { offset: 0.5, color: "#0e1326" },
      { offset: 0.84, color: "#171d33" },
      { offset: 1, color: "#20263a" },
    ],
    direction: "vertical",
  },
  seed: "lantern-night",
  look: "ink",
  texture: "grain",
});

for (let i = 0; i < 44; i++) {
  const sx = 6 + ((i * 0.6180339887) % 1) * (W - 12);
  const sy = 6 + ((i + 0.5 * rnd(i * 7 + 4)) / 44) * 300;
  const r = 0.75 + rnd(i * 3 + 5) * 0.6;
  const st = sketch.loop(ellipsePoints(sx, sy, r, r, 8), {
    color: i % 4 === 0 ? "#e8dcc4" : "#c8d2ea", weight: 0.8, looseness: 0, energy: "calm",
    fill: { color: i % 4 === 0 ? "#e8dcc4" : "#c8d2ea", style: "solid" },
  });
  scene9.add(st).initial({ opacity: 0 });
  st.fadeTo(0.16 + 0.34 * (1 - sy / 320), { at: 0.1 + i * 0.02, duration: 1.6, ease: "sine.out" });
  if (i % 5 === 1) {
    st.fadeTo(0.14, { at: 2.4 + i * 0.1, duration: 2.4, ease: "sine.inOut" });
    st.fadeTo(0.44, { at: 4.9 + i * 0.1, duration: 2.6, ease: "sine.inOut" });
  }
}

// Everything below is small and low in the frame: the whole upper two thirds is sky, and the
// lantern is a few pixels of warm light in it.
const NIGHT_DECK = 384;
scene9.add(
  sketch.loop([[-20, 352], [660, 352], [660, H + 20], [-20, H + 20]], {
    color: CLEAR, weight: "light", looseness: 0.05, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#151b2e" }, { offset: 1, color: "#0b0f1c" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0, duration: 0.9 });
scene9.add(
  sketch.loop([[-20, NIGHT_DECK], [660, NIGHT_DECK], [660, NIGHT_DECK + 10], [-20, NIGHT_DECK + 10]], {
    color: "#0b0d14", weight: "confident", looseness: 0.08, smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#262a38" }, { offset: 1, color: "#11131b" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0.1, duration: 0.9 });
scene9.add(sketch.stroke([[-20, NIGHT_DECK - 30], [660, NIGHT_DECK - 31]], { color: "#1e212b", weight: "confident", looseness: 0.1 })).appear({ at: 0.3, duration: 0.8 });
for (let px = 6; px < 636; px += 58) {
  scene9.add(sketch.stroke([[px, NIGHT_DECK], [px + 1, NIGHT_DECK - 31]], { color: "#191c24", weight: "light", looseness: 0.12 })).appear({ at: 0.4, duration: 0.6 });
}

// Him: a small silhouette at the rail, unlit now — the lantern is too far away to light him, so
// giving him a warm rim here would be a lie. He gets `lit: "none"`.
const art9 = buildArtisan(scene9, {
  x: 214, y: NIGHT_DECK - 42, s: 0.82, facing: 1, lit: "none", legs: true, bendNear: 1, bendFar: -1,
});
art9.armNear.restAt(...art9.local(238, NIGHT_DECK - 62));
art9.armFar.restAt(...art9.local(222, NIGHT_DECK - 64));
art9.group.initial({ opacity: 0 });
art9.group.fadeTo(1, { at: 0.6, duration: 1.0, ease: "sine.out" });
art9.pivotLocal(0, 0);
// He tips his head back a little further as it climbs, and that is the entire performance.
art9.group.rotateTo(-4.5, { at: 2.0, duration: 4.0, ease: "sine.inOut" });
art9.group.rotateTo(-6.0, { at: 8.0, duration: 5.0, ease: "sine.inOut" });

// The lantern, far up and small. Same builder, same painted motif, 0.34 scale — the object from
// the workshop, three minutes and one whole evening later.
const lantern9 = buildLantern(scene9, { x: 372, y: 150, s: 0.34, lit: true, glowStrength: 0.85, motif: true });
lantern9.group.initial({ opacity: 0 });
lantern9.group.fadeTo(1, { at: 0.4, duration: 1.2, ease: "sine.out" });
flicker(lantern9.flame, 1.0, TOTAL9, 1.3, 107);
// Up and away on a slow curve, shrinking and dimming as the distance opens.
// Three chained moveBy tweens rather than one moveAlong: the curve a 4-point moveAlong fits ended
// up ~180px away from its own last point over a drift this small, and an exact landing matters
// here — this is the last thing in the film and it has to stay high in frame, not sail out of it.
lantern9.group.moveBy(18, -30, { at: 1.4, duration: 4.2, ease: "sine.inOut" });
lantern9.group.moveBy(16, -28, { at: 5.6, duration: 4.4, ease: "sine.inOut" });
lantern9.group.moveBy(14, -26, { at: 10.0, duration: 4.6, ease: "sine.inOut" });
lantern9.group.scaleTo(0.72, { at: 2.0, duration: 8.0, ease: "sine.inOut" });
lantern9.group.scaleTo(0.52, { at: 10.0, duration: 6.0, ease: "sine.inOut" });
lantern9.group.fadeTo(0.86, { at: 9.0, duration: 7.0, ease: "sine.inOut" });

// A last cold breath of wind off the water.
for (let i = 0; i < 5; i++) {
  scene9.add(
    sketch.stroke([[40 + i * 130, 366 + (i % 2) * 8], [150 + i * 130, 368 + (i % 2) * 8]], { color: "#232a40", weight: "light", looseness: 0.3, energy: "quick" })
  ).appear({ at: 1.2 + i * 0.2, duration: 1.0 });
}

scene9.camera().panTo(326, 202, { at: 0, duration: TOTAL9, ease: "sine.inOut" });

scene9.add(sketch.sound("D2", { at: 0, duration: TOTAL9, instrument: "pad", velocity: 0.14 }));
// The title card's two notes come back, and the piece resolves onto the one it opened with.
scene9.add(sketch.sound("A3", { at: 1.6, duration: 2.4, instrument: "piano", velocity: 0.2, pan: -0.2 }));
scene9.add(sketch.sound("E4", { at: 4.6, duration: 2.6, instrument: "piano", velocity: 0.17, pan: -0.1 }));
scene9.add(sketch.sound("E3", { at: 6.0, duration: 6.0, instrument: "strings", velocity: 0.13 }));
scene9.add(sketch.sound("D3", { at: 12.0, duration: 4.4, instrument: "piano", velocity: 0.17, pan: -0.15 }));

// ============================================================================================
// Cut together
// ============================================================================================
// Every cut is a crossfade rather than a hard cut, and the fades get longer as the piece goes on:
// 0.7s through the workshop, where the beats are short and consecutive, out to 1.2s over the
// release, where nothing should feel hurried. The two `hold`s that matter are on scene 6 (the
// pause needs to be allowed to sit) and scene 9 (the last frame is the whole point of the ending).
const film = sketch.film({ width: W, height: H, background: "#000000" });
film
  .addScene(scene1, { hold: 0.4 })
  .addScene(scene2, { transition: "fade", transitionDuration: 0.9, hold: 0.3 })
  .addScene(scene3, { transition: "fade", transitionDuration: 0.7, hold: 0.3 })
  .addScene(scene4, { transition: "fade", transitionDuration: 0.7, hold: 0.3 })
  .addScene(scene5, { transition: "fade", transitionDuration: 0.7, hold: 0.5 })
  .addScene(scene6, { transition: "fade", transitionDuration: 0.9, hold: 0.5 })
  .addScene(scene7, { transition: "fade", transitionDuration: 1.0, hold: 0.4 })
  .addScene(scene8, { transition: "fade", transitionDuration: 1.1, hold: 0.4 })
  .addScene(scene9, { transition: "fade", transitionDuration: 1.2, hold: 0.5 });

export default film;
