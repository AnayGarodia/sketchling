import { sketch } from "../../src/index.js";

// Showcase: the VERTICAL counterpart to quiet-ride.ts's wide world — a 1200x2600 world
// (taller than wide, more than 2:1) inside a 620x440 viewport, so the camera move that
// reveals scale is a pull-back-and-up rather than a sideways pan. Same restrained
// silhouette register as quiet-crossing.ts / quiet-ride.ts (one small no-face figure,
// naturalistic proportions, patient timing, huge negative space, look:"ink" +
// texture:"grain"), applied to a climber topping out at sunrise.
//
// The triumph is carried entirely by light and camera: a faint pre-dawn wash blooms into a
// full sunrise (one translucent gradient overlay fading up, plus a sun clearing a distant
// ridge, a warm-lit summit face, a rim on the crest, warm snow), while the camera pulls
// from a tight 2x scramble shot to 1x and up, dropping the figure to the lower third of a
// frame that is now mostly sky. No fist-pump, no face, no squash-stretch — the figure just
// straightens up out of its uphill lean, once, over 1.6s.
//
// Camera notes (both gotchas AGENTS.md documents, handled deliberately):
//  - camera.follow() only holds its framing inside its own [at, at+duration] window and
//    the reveal has to keep running past every other animation, so this follows ONE
//    invisible rig node for a window that covers the whole timeline with room to spare
//    (FOLLOW_PAD) instead of following the climber for the climb and handing back to a
//    panTo. Following a rig also buys framing control follow() alone doesn't have: it
//    centers a target's bbox center exactly, and the figure should sit off-center.
//  - Every camera center this scene reaches stays >= half a viewport (310px / 220px) clear
//    of all four world edges — checked in code at build time, see CAM_CENTRES below. That's
//    the margin that avoids the stray pale rectangle quiet-ride.ts hit when a viewport
//    crossed a world bound.

const WORLD_W = 1200;
const WORLD_H = 2600;
const VIEW_W = 620;
const VIEW_H = 440;

const SIL = "#0a0d12"; // the figure and the summit rocks — the darkest value in the frame

// blob()'s outline wobble has a floor even at looseness 0 (see geometry.ts's blobPoints),
// which reads as a lumpy cloud rather than a disc on anything sun/moon sized — same reason
// nightfall-hill.ts's moon is a hand-plotted trig circle instead of a blob.
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
  height: WORLD_H,
  viewport: { width: VIEW_W, height: VIEW_H },
  // Pre-dawn, cool and desaturated, graded across the WHOLE 2600px world — so the stops
  // are placed by absolute world y, not by "where the horizon looks like it is": the pale
  // band (0.57-0.62 = y 1480-1610) has to land at summit height, since that's the only
  // slice of this gradient the camera is ever framed on.
  background: {
    stops: [
      { offset: 0, color: "#101830" },
      { offset: 0.2, color: "#1a2440" },
      { offset: 0.36, color: "#2b3651" },
      { offset: 0.45, color: "#465066" },
      { offset: 0.52, color: "#6b7180" },
      { offset: 0.57, color: "#8f8c8f" },
      { offset: 0.62, color: "#a89892" },
      { offset: 0.68, color: "#7c7c86" },
      { offset: 0.8, color: "#3f4552" },
      { offset: 1, color: "#1b2030" },
    ],
    direction: "vertical",
  },
  seed: "summit-sunrise",
  look: "ink",
  texture: "grain",
});

// --- Timeline ---------------------------------------------------------------------------
const CLIMB_START = 1.6;
const STEPS = 14;
const STEP_DUR = 0.72;
const STEP_DX = 21;
const STEP_DY = -14; // 33 degrees — a real summit ridge's final stretch, not a wall
const CLIMB_DUR = STEPS * STEP_DUR;
const CLIMB_END = CLIMB_START + CLIMB_DUR;
const STAND_AT = CLIMB_END + 0.25;
const REVEAL_AT = CLIMB_END + 0.6;
const REVEAL_DUR = 5.4;
const REVEAL_END = REVEAL_AT + REVEAL_DUR;
const FOLLOW_PAD = 6; // the follow window has to outlast everything, incl. the settle tail

// --- Geography --------------------------------------------------------------------------
// The climber's feet start on the crest at (FOOT_X0, FOOT_Y0) and walk it to the summit;
// the massif's own left edge is authored through exactly those two points and the three
// waypoints between them, so the crest the figure walks IS the mountain's silhouette edge
// (dark figure against pale sky the whole way up — a figure on the shaded body of the
// mountain would not read at this size).
const FOOT_X0 = 356;
const FOOT_Y0 = 1656;
const SUMMIT_X = FOOT_X0 + STEPS * STEP_DX; // 650
const SUMMIT_Y = FOOT_Y0 + STEPS * STEP_DY; // 1460

// --- Depth 0.12: stars, at effectively infinite distance. -------------------------------
// They only enter frame during the pull-back (at 2x the camera is looking at a 220px-tall
// slice of world 300px below them), so they fade DOWN rather than out — the settled end
// frame, which is the still this scene gets judged on, should still have a couple of them.
const starLayer = scene.layer(0.12);
// Dimmer, smaller, drawn as trig circles with looseness 0, and — the part that actually
// mattered — with a sub-pixel stroke weight. A 1.5px "light" stroke around a 1.5px radius
// dot IS the dot at 2x zoom: these came out as ragged 12px paper cutouts, confetti rather
// than stars, until the outline stopped outweighing the shape.
const STAR = "#bab8ca";
// Placed by working out what the climb framing can actually see (X 418-764, Y 1204-1449 in
// this layer's own space, across the whole pan) and staying outside it: at 2x even a 1.2px
// dot is a visible fleck, and a star hanging next to a climber's head at eye level is
// nonsense. All eight only enter frame as the camera pulls back.
for (const [sx, sy, sr] of [
  [400, 1150, 1.5], [520, 1120, 1.2], [660, 1170, 1.6], [800, 1130, 1.3],
  [880, 1190, 1.4], [350, 1270, 1.2], [390, 1330, 1.3], [860, 1240, 1.1],
] as [number, number, number][]) {
  const star = sketch.loop(circlePoints(sx, sy, sr, 8), {
    color: STAR, weight: 0.4, looseness: 0, fill: { color: STAR, style: "solid" },
  });
  starLayer.add(star).fadeTo(0.4, { at: 13.5, duration: 4, ease: "sine.inOut" });
}

// --- Depth 0.45: EVERYTHING distant, on one single plane. --------------------------------
// One plane, not three, on purpose: two layers a few hundredths apart would drift relative
// to each other across a 250px vertical camera move, and a cloud sea sliding against the
// ridge line it's supposed to be lying in reads as a bug.
//
// The depth number is doing real work here, not decoration. A depth-1 horizon can't be both
// below the figure during the 2x climb and inside the 1x reveal frame at all — the reveal
// frame's bottom edge is 140 world px HIGHER than the climb frame's, so anything visible at
// the end was already visible at the start. Solving both framings at once (start:
// sy = 220 + (Y - 1444)*2, end: sy = 220 + (Y - 1331.5)) puts every distant shape in a
// 65px band around Y 1490-1550 at depth 0.45: below the climber's feet in the opening
// shot, and the bottom sixth of the closing one. Shallower than that and it stops moving
// with the mountain at all; deeper and it climbs up over the figure.
const far = scene.layer(0.45);

// Pre-dawn wash -> full sunrise. ONE translucent gradient over the whole sky slice, held at
// a faint 0.16 from the first frame (a sky twenty minutes from sunrise is never neutral)
// and bloomed to full as the climber tops out. It sits behind the massif, so the mountain
// stays a cool dark silhouette while the air around it goes gold — the light changes,
// nothing is repainted.
far.add(
  sketch.loop(
    [[-140, 1040], [1340, 1040], [1340, 1700], [-140, 1700]],
    {
      color: "#00000000",
      weight: "light",
      smooth: false,
      looseness: 0,
      fill: {
        color: {
          stops: [
            { offset: 0, color: "#f19b5a00" },
            { offset: 0.42, color: "#ef9d5c1f" },
            { offset: 0.7, color: "#f6b06b52" },
            { offset: 0.88, color: "#ffca8b8c" },
            { offset: 1, color: "#ffdcae99" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    }
  )
).initial({ opacity: 0.16 })
  .fadeTo(1, { at: 7.6, duration: 6.6, ease: "sine.inOut" });

// The sun, drawn BEFORE the ranges so their silhouettes cut into it — it doesn't appear in
// the sky, it comes up out of the range, and it's still doing that when the scene ends.
const SUN_X = 850;
const SUN_Y = 1500;
// Two widely-spaced, very faint rings for the glare. Getting this to stop looking wrong took
// four tries: one translucent disc draws a visible hard circle across the sky, five closely
// spaced rings read as a bullseye, and a third ring at r174 was wide enough to sweep a
// visible arc right across the frame mid-pull-back. This pipeline has no radial gradient and
// no per-shape blur, so a couple of wide ~6% steps is the cheapest bloom available here.
for (const [r, n, style] of [
  [120, 44, { color: "#00000000", weight: "light" as const, looseness: 0, fill: { color: "#ffd28a10", style: "solid" as const } }],
  [72, 40, { color: "#00000000", weight: "light" as const, looseness: 0, fill: { color: "#ffd28a17", style: "solid" as const } }],
  [30, 36, {
    color: "#ffe9bd", weight: "light" as const, looseness: 0,
    fill: {
      color: { stops: [{ offset: 0, color: "#fff8e4" }, { offset: 1, color: "#ffcb78" }], direction: "vertical" as const },
      style: "solid" as const,
    },
  }],
] as [number, number, Record<string, unknown>][]) {
  far.add(sketch.loop(circlePoints(SUN_X, SUN_Y, r, n), style))
    .initial({ opacity: 0 })
    .fadeTo(1, { at: 9.4, duration: 3.8, ease: "sine.inOut" })
    .moveBy(0, -28, { at: 9.4, duration: 8.6, ease: "sine.out" });
}

// Two jagged ranges below, generated rather than hand-placed so the wavelength stays short
// enough (34px / 46px) to read as distant even under the opening 2x zoom — a smooth
// hand-drawn swell at that magnification reads as a near hill instead.
function ridgePoints(topY: number, baseY: number, amp: number, wavelength: number, salt: number): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0;
  for (let x = -80; x <= 1300; x += wavelength, i++) {
    const j = i % 2 === 0 ? (((i * 5 + salt) % 4) / 4) * 0.3 : 0.6 + (((i * 3 + salt) % 4) / 4) * 0.4;
    pts.push([x, topY + j * amp]);
  }
  pts.push([1300, baseY]);
  pts.push([-80, baseY]);
  return pts;
}

far.add(
  sketch.loop(ridgePoints(1490, 1660, 26, 34, 1), {
    color: "#6f7789",
    weight: "light",
    looseness: 0.08,
    smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#79839a" }, { offset: 1, color: "#5f6880" }], direction: "vertical" },
      style: "solid",
    },
  })
).appear({ at: 0, duration: 0.01 });

far.add(
  sketch.loop(ridgePoints(1512, 1680, 22, 46, 3), {
    color: "#575f74",
    weight: "light",
    looseness: 0.08,
    smooth: false,
    fill: {
      color: { stops: [{ offset: 0, color: "#616a80" }, { offset: 1, color: "#454d61" }], direction: "vertical" },
      style: "solid",
    },
  })
).appear({ at: 0, duration: 0.01 });

// The cloud sea the ranges stand in — a flat pale band with a gently bumped top edge. Kept
// deliberately featureless: at this distance it's a suggestion, not weather.
far.add(
  sketch.loop(
    [
      [-80, 1534], [70, 1528], [200, 1538], [330, 1526], [470, 1536], [610, 1528],
      [750, 1540], [890, 1526], [1030, 1536], [1170, 1528], [1290, 1538],
      [1290, 1740], [-80, 1740],
    ],
    {
      color: "#00000000",
      weight: "light",
      looseness: 0.1,
      fill: {
        color: { stops: [{ offset: 0, color: "#a3aabc" }, { offset: 1, color: "#767e91" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 0, duration: 0.01 });

// Haze in front of everything distant, warming as the sun comes up — kept under 0.3 alpha
// so it tints the ranges and the cloud tops without washing the sun back out. Its top stop
// is fully transparent on purpose: a wash that starts at its own peak alpha draws a hard
// horizontal seam right across the sky at its top edge (it did, on the first pass).
far.add(
  sketch.loop(
    [[-140, 1400], [1340, 1400], [1340, 1760], [-140, 1760]],
    {
      color: "#00000000",
      weight: "light",
      smooth: false,
      looseness: 0,
      fill: {
        color: {
          stops: [
            { offset: 0, color: "#ffc98c00" },
            { offset: 0.45, color: "#ffc98c40" },
            { offset: 0.75, color: "#f7b47a33" },
            { offset: 1, color: "#d1926e1f" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    }
  )
).initial({ opacity: 0 })
  .fadeTo(1, { at: 10.6, duration: 4.6, ease: "sine.inOut" });

// --- Depth 1: the mountain the climber is actually on. ----------------------------------
// One continuous silhouette from the summit down past both edges of the world — the whole
// point of the vertical world is that this thing keeps going long after it leaves frame.
//
// smooth:false everywhere on this shape, which matters twice over. Splined through these
// points it read as a rounded grassy dome, not rock (checked as a still — it was the single
// biggest thing wrong with the first pass); and straight segments make the walked crest
// EXACTLY the line through the five waypoints below, which is the line the climber's own
// step math lands on, so the feet sit on the rock instead of a few px off a bowing spline.
// The first two points give the summit a genuine 50px-wide flat shoulder before the flank
// drops away. Without it the crest starts falling immediately past the climber's stopping
// point, and the cairn below ended up perched several px clear of a sloping surface.
const FLANK: [number, number][] = [
  [700, 1458], [726, 1482], [752, 1506], [786, 1552], [826, 1612], [880, 1700],
];
scene.add(
  sketch.loop(
    [
      [-80, 2600], [40, 2410], [138, 2216], [196, 2062], [244, 1908], [282, 1800],
      [316, 1724], [334, 1698],
      // the walked crest — the same five points the climber's own step math lands on
      [FOOT_X0, FOOT_Y0], [430, 1607], [504, 1558], [578, 1509], [SUMMIT_X, SUMMIT_Y],
      // over the top and down the sunlit flank, steeper than the way up — the side that
      // "falls away" in the closing frame
      ...FLANK,
      [944, 1826], [1006, 2010], [1068, 2254], [1150, 2520], [1280, 2600],
    ],
    {
      color: "#080b10",
      weight: "confident",
      looseness: 0.05,
      smooth: false,
      // The bbox is 1146px tall but only its top ~140px is ever in frame, so every stop
      // that matters is packed into the first 0.15 — a lit peak falling off into shadow.
      fill: {
        color: {
          stops: [
            { offset: 0, color: "#515c74" },
            { offset: 0.05, color: "#3f4a60" },
            { offset: 0.12, color: "#2c3547" },
            { offset: 0.3, color: "#1a2130" },
            { offset: 1, color: "#0b0f16" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    }
  )
).appear({ at: 0, duration: 0.01 });

// Rock striations — the only reason the mountain body doesn't read as a flat black mass at
// the opening 2x framing. Kept to four, short, and only barely off the local fill value:
// longer/lighter ones read as scratches across the silhouette rather than strata.
for (const s of [
  [[404, 1700], [462, 1662], [508, 1642]],
  [[352, 1766], [410, 1730], [462, 1712]],
  [[478, 1620], [534, 1584], [572, 1568]],
  [[296, 1836], [360, 1800], [416, 1782]],
] as [number, number][][]) {
  scene.add(sketch.stroke(s, { color: "#171d2a", weight: "light", looseness: 0.35 })).appear({ at: 0, duration: 0.01 });
}

// Old snow caught on the upper faces — small, angular slivers hugging the crest and the
// flank, not the big smooth slabs the first pass had (which read as pale puddles painted
// onto a hill). Cool grey-blue while it's still pre-dawn.
const SNOW_PATCHES: [number, number][][] = [
  [[600, 1510], [626, 1500], [644, 1494], [636, 1506], [612, 1516], [598, 1518]],
  [[698, 1488], [722, 1500], [740, 1518], [722, 1518], [704, 1504]],
  [[788, 1578], [816, 1602], [828, 1634], [804, 1618], [786, 1596]],
];
for (const p of SNOW_PATCHES) {
  scene.add(
    sketch.loop(p, {
      color: "#69738a",
      weight: "light",
      looseness: 0.14,
      smooth: false,
      // Snow in pre-dawn shade is a dark blue-grey, not white — at the paler value these
      // first had, each patch read as a sheet of white plastic laid on the rock under the
      // opening 2x framing. The warm copies below are what make them snow.
      fill: {
        color: { stops: [{ offset: 0, color: "#7b8598" }, { offset: 1, color: "#5a6479" }], direction: "vertical" },
        style: "solid",
      },
    })
  ).appear({ at: 0, duration: 0.01 });
}

// The sun-facing face, lit. A separate warm shape fading in over the same flank rather than
// a recolour of the mountain — real light direction (the sun is low and off to the right, so
// this is the right face and nothing else), and it can arrive on its own beat. Desaturated
// to lit ROCK rather than the orange paint an earlier pass put on this flank.
scene.add(
  sketch.loop(
    [
      [SUMMIT_X, 1463], ...FLANK.slice(0, 4).map(([x, y]) => [x, y + 2] as [number, number]),
      [756, 1548], [726, 1512], [696, 1486], [666, 1472],
    ],
    {
      color: "#00000000",
      weight: "light",
      looseness: 0.05,
      smooth: false,
      fill: {
        color: { stops: [{ offset: 0, color: "#b78a5f" }, { offset: 1, color: "#4f4239" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).initial({ opacity: 0 })
  .fadeTo(0.7, { at: 11, duration: 4, ease: "sine.inOut" });

// The same snow patches again in warm gold, cross-fading over the cool ones.
for (const p of SNOW_PATCHES) {
  scene.add(
    sketch.loop(p, {
      color: "#00000000",
      weight: "light",
      looseness: 0.14,
      smooth: false,
      fill: {
        color: { stops: [{ offset: 0, color: "#fbdcae" }, { offset: 1, color: "#d29d70" }], direction: "vertical" },
        style: "solid",
      },
    })
  ).initial({ opacity: 0 })
    .fadeTo(0.85, { at: 11.6, duration: 3.4, ease: "sine.inOut" });
}

// A warm rim along the crest's own upper edge — the last light cue, and the one that
// actually says "the sun is behind that ridge".
scene.add(
  sketch.stroke(
    [[578, 1509], [SUMMIT_X, SUMMIT_Y], ...FLANK.slice(0, 3)],
    { color: "#ffd9a0", weight: "light", looseness: 0.08 }
  )
).initial({ opacity: 0 })
  .fadeTo(0.9, { at: 11.4, duration: 3.2, ease: "sine.inOut" });

// The one drawn-by-hand beat in the scene: the line of the ridge still to be climbed,
// drawing itself just inside the crest before the climber starts moving. Deliberately only
// a little lighter than the rock — at the brighter value it first had, it read as a glowing
// outline traced around the whole mountain rather than light catching an edge.
scene.add(
  sketch.stroke(
    [[362, 1659], [430, 1610], [504, 1561], [578, 1512], [646, 1464]],
    { color: "#5f6a80", weight: "light", looseness: 0.16 }
  )
).drawOn({ at: 0.2, duration: 1.7 });

// A summit cairn — a squat pile of stones, the only man-made thing in the frame, on the
// summit shoulder a little past where the climber stops. Wide, low and irregular on purpose:
// stacked into a three-stone spire it read as a small fir tree at 1x (nonsense above a cloud
// sea), and as a rectangular two-stone pile it read as a suitcase.
for (const stone of [
  [[665, 1453], [671, 1449], [684, 1447], [694, 1451], [691, 1456], [679, 1454], [668, 1459]],
  [[674, 1442], [681, 1438], [689, 1440], [685, 1444], [676, 1448]],
] as [number, number][][]) {
  scene.add(
    sketch.loop(stone, { color: SIL, weight: "light", looseness: 0.2, fill: { color: SIL, style: "solid" }, smooth: false })
  ).appear({ at: 0, duration: 0.01 });
}

// --- The climber ------------------------------------------------------------------------
// ~52px tall, no face, head about 1/7 of height. Local space: (0, 0) is the mid-point of
// the stance on the ground, so `initial({x, y})` drops the feet straight onto a crest
// point (the bbox-center trap moveTo/moveAlong fall into doesn't apply — this is a
// translate of geometry authored around its own contact point, the same convention
// quiet-crossing.ts's walker uses).
function buildClimber() {
  const g = sketch.group();
  scene.add(g);

  // Back (downhill) leg's foot sits lower than the front (uphill) one — an 11px stance on
  // a 33-degree slope really does straddle ~7px of height, and level feet on a slope is
  // the first thing that reads as "pasted on".
  const legBack = sketch.loop([[-1, -26], [-6, -26], [-5.5, 2.5], [-1.5, 2.5]], {
    color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true,
  });
  legBack.pivotAt(-3.5, -26);
  const legFront = sketch.loop([[1, -26], [6, -26], [5.5, -2.5], [1.5, -2.5]], {
    color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true,
  });
  legFront.pivotAt(3.5, -26);
  g.add(legBack);
  g.add(legFront);

  // Torso, pack and arm are ONE closed outline (the bump at x:-11 is the pack, the taper
  // down the right side is the arm) — quiet-crossing.ts's hard-won lesson: a limb that
  // only overlaps the body by proximity detaches the moment it rotates, and a silhouette
  // with no seam in it can't come apart.
  g.add(
    sketch.loop(
      [[4, -43], [7.5, -39], [9, -34], [7.5, -30], [6, -26], [-5, -26], [-7, -33], [-11.5, -36], [-10, -41], [-4, -44]],
      { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true }
    )
  );
  // A trig circle, not a blob: at r under 4 blob()'s wobble floor makes a head lumpy.
  g.add(
    sketch.loop(circlePoints(1, -48, 3.9, 12), {
      color: SIL, weight: "confident", looseness: 0.08, fill: { color: SIL, style: "solid" },
    })
  );

  // An axe/pole, pivoted at the hand — deep inside the torso outline, which is the one
  // place a separately rotated piece is safe to hang off a small silhouette.
  const pole = sketch.stroke([[3, -30], [13, -10]], { color: SIL, weight: "light", looseness: 0.08 });
  pole.pivotAt(3, -30);
  g.add(pole);

  // A thread of the sunrise catching the figure's own leading edge. Fades in with the rest
  // of the light; at 1x it's a single warm pixel-wide hint, which is the intended weight.
  const rim = sketch.stroke([[4.5, -42], [7.5, -38]], { color: "#f0c894", weight: 0.7, looseness: 0.1 });
  rim.initial({ opacity: 0 }).fadeTo(0.85, { at: 11.8, duration: 2.6, ease: "sine.inOut" });
  g.add(rim);

  return { group: g, legBack, legFront, pole };
}

const climber = buildClimber();
// Leaning into the slope, rotating about the feet (pivotAt is absolute-canvas minus the
// node's own translate, so this resolves to local (0,0) — the contact point — and stays
// there through every later moveBy).
climber.group.initial({ x: FOOT_X0, y: FOOT_Y0, rotation: 3.5 });
climber.group.pivotAt(FOOT_X0, FOOT_Y0);

// A slow, heavy plod: 14 short uphill steps, sine-eased, the body rising through the middle
// of each step and settling at the end. No squashTo anywhere — uphill walking has weight
// because it's slow and short-strided, not because it bounces.
for (let i = 0; i < STEPS; i++) {
  const t0 = CLIMB_START + i * STEP_DUR;
  const half = STEP_DUR / 2;
  climber.group.moveBy(STEP_DX / 2, STEP_DY / 2 - 2.5, { at: t0, duration: half, ease: "sine.out" });
  climber.group.moveBy(STEP_DX / 2, STEP_DY / 2 + 2.5, { at: t0 + half, duration: half, ease: "sine.in" });
  const lead = i % 2 === 0;
  climber.legBack.rotateTo(lead ? -13 : 13, { at: t0, duration: STEP_DUR, ease: "sine.inOut" });
  climber.legFront.rotateTo(lead ? 13 : -13, { at: t0, duration: STEP_DUR, ease: "sine.inOut" });
  climber.pole.rotateTo(lead ? -9 : 7, { at: t0, duration: STEP_DUR, ease: "sine.inOut" });
  // Boots in old snow, barely there.
  scene.add(sketch.sound(null, { at: t0 + 0.05, duration: 0.22, instrument: "brush", velocity: 0.09 }));
}

// Topping out: legs and pole settle, then the whole figure straightens out of its lean over
// 1.6s. That single rotation is the entire "triumph" gesture.
climber.legBack.rotateTo(0, { at: CLIMB_END, duration: 0.5, ease: "sine.out" });
climber.legFront.rotateTo(0, { at: CLIMB_END, duration: 0.5, ease: "sine.out" });
climber.pole.rotateTo(-3, { at: CLIMB_END, duration: 0.6, ease: "sine.out" });
climber.group.rotateTo(0, { at: STAND_AT, duration: 1.6, ease: "sine.inOut" });

// --- Spindrift ---------------------------------------------------------------------------
// Snow off the crest, blowing up and toward the sun. Two emitters: one beside the climber
// early (the only moving thing in an otherwise empty opening sky), one off the summit that
// runs through the whole reveal.
//
// Sized way down, with looseness 0 AND a sub-pixel stroke weight — the last one being what
// actually fixed it. A particle is drawn as rc.circle(size * 2) through the same rough.js
// treatment as every other shape, so a "light" (1.5px) outline around a 1px-radius speck,
// doubled again by the opening 2x zoom, rendered as ~15px of white popcorn strewn across a
// muted sky. Dropping size alone did nothing, because the size was never the problem.
const SPINDRIFT = { weight: 0.4, looseness: 0 };
scene.add(
  sketch.particles(424, 1602, { ...SPINDRIFT, color: "#c3cddc80" }, {
    count: 10, angle: -32, spread: 44, speedMin: 12, speedMax: 36, gravity: -6,
    lifetime: 1.8, duration: 3.2, at: 1.2, sizeMin: 0.6, sizeMax: 1.1,
  })
);
scene.add(
  sketch.particles(SUMMIT_X + 10, SUMMIT_Y - 6, { ...SPINDRIFT, color: "#cdd7e58c" }, {
    count: 18, angle: -26, spread: 44, speedMin: 16, speedMax: 46, gravity: -7,
    lifetime: 2.2, duration: 7, at: 8.6, sizeMin: 0.6, sizeMax: 1.2,
  })
);

// --- Camera ------------------------------------------------------------------------------
// An invisible rig node IS the camera centre (see the header note on why follow() tracks
// this instead of the climber). Authored at its start point with no translate, so its own
// bbox centre — what follow() reads — is exactly (380, 1620).
const CAM_X0 = 380;
const CAM_Y0 = 1620;
const camRig = sketch.loop(
  [[CAM_X0 - 4, CAM_Y0 - 4], [CAM_X0 + 4, CAM_Y0 - 4], [CAM_X0 + 4, CAM_Y0 + 4], [CAM_X0 - 4, CAM_Y0 + 4]],
  { color: "#00000000", weight: "light", smooth: false, looseness: 0 }
);
scene.add(camRig);
// Tracks the climb at a constant rate (a camera operator panning, not a step-by-step bob),
// then keeps going up and right for the reveal.
camRig.moveBy(STEPS * STEP_DX, STEPS * STEP_DY, { at: CLIMB_START, duration: CLIMB_DUR, ease: "none" });
camRig.moveBy(60, -54, { at: REVEAL_AT, duration: REVEAL_DUR, ease: "sine.inOut" });

// Every centre the rig passes through, checked against the world bounds it has to stay
// clear of: (380,1620) -> (674,1424) -> (734,1370), all of them >= 310px from x:0/x:1200
// and >= 220px from y:0/y:2600. The tightest is x:380 (70px of slack) at 2x zoom, where the
// viewport only reaches 155px sideways anyway.
const CAM_CENTRES: [number, number][] = [[CAM_X0, CAM_Y0], [674, 1424], [734, 1370]];
for (const [cx, cy] of CAM_CENTRES) {
  if (cx < VIEW_W / 2 || cx > WORLD_W - VIEW_W / 2 || cy < VIEW_H / 2 || cy > WORLD_H - VIEW_H / 2) {
    throw new Error(`camera centre (${cx}, ${cy}) is inside half a viewport of a world edge`);
  }
}

const cam = scene.camera();
cam.follow(camRig, { at: 0, duration: REVEAL_END + FOLLOW_PAD });
cam.zoomTo(2, { at: 0, duration: 0 });
// The pull-back. 2x -> 1x drops the figure from a fifth of the frame height to a
// twelfth, and the rig's own rise puts it in the lower third with the sky above it.
cam.zoomTo(1, { at: REVEAL_AT, duration: REVEAL_DUR, ease: "sine.inOut" });

// --- Sound -------------------------------------------------------------------------------
// Cold minor drone under the climb, resolving to major as the light lands — the same
// three-voice restraint quiet-crossing.ts and quiet-ride.ts hold to, no percussion beyond
// the footsteps above.
scene.add(sketch.sound("D2", { at: 0, duration: 12, instrument: "pad", velocity: 0.15 }));
scene.add(sketch.sound("A2", { at: 2, duration: 10, instrument: "pad", velocity: 0.1 }));
for (const [pitch, at] of [["D4", 2.4], ["F4", 4.1], ["A3", 6], ["C4", 7.8]] as [string, number][]) {
  scene.add(sketch.sound(pitch, { at, duration: 1.2, instrument: "piano", velocity: 0.26 }));
}
// D minor -> D major, arriving with the sun.
scene.add(sketch.sound("D3", { at: CLIMB_END - 0.1, duration: 6, instrument: "strings", velocity: 0.2 }));
scene.add(sketch.sound("A3", { at: CLIMB_END + 0.2, duration: 5.8, instrument: "strings", velocity: 0.17 }));
scene.add(sketch.sound("F#4", { at: CLIMB_END + 0.7, duration: 5.2, instrument: "strings", velocity: 0.15 }));
for (const [pitch, at] of [["A3", 11.7], ["D4", 12.7], ["F#4", 13.8], ["A4", 15.1]] as [string, number][]) {
  scene.add(sketch.sound(pitch, { at, duration: 1.4, instrument: "piano", velocity: 0.28 }));
}
scene.add(sketch.sound("D3", { at: 15.4, duration: 3.6, instrument: "pad", velocity: 0.14 }));

export default scene;
