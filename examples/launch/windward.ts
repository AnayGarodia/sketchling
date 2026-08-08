import { sketch } from "../../src/index.js";
import type { Point } from "../../src/core/types.js";

// "Windward" — a small pilot's balloon flight from a dawn meadow, through fair skies and
// a storm, to a lighthouse-guided landing at dawn again. One continuous scene: the world
// is wide (4200x680), the balloon is built once and never redrawn, and the camera follows
// it the whole way — no Film cuts, no "everything gets sketched again every scene."
const W = 4200;
// Taller than any authored content needs (drawn content stays within ~0-680) so the
// final zoom-out (0.68x, centered on the low-flying landed balloon at y~462) doesn't
// reveal blank space past the world's own bottom edge.
const H = 860;

const ink = "#241d15";
const inkNight = "#f2ead8";

const balloonMain = "#d1603f";
const balloonAlt = "#f2c66d";
const basketBrown = "#8a5a34";
const ropeTan = "#b88a5e";
const skinTone = "#e79a52";

// ---------------------------------------------------------------------------------
// Sky — a hand-painted gradient across the whole world (dawn -> day -> storm -> night ->
// dawn again), built from many overlapping wide bands rather than a single flat
// scene.background, since the journey passes through several skies, not one.
// ---------------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

const SKY_STOPS: [number, string][] = [
  [0, "#f2d4a3"],
  [950, "#f2d4a3"],
  [1150, "#bfe0ef"],
  [2000, "#bfe0ef"],
  [2200, "#4f5666"],
  [2900, "#4f5666"],
  [3100, "#17243a"],
  [3350, "#17243a"],
  [3950, "#f5cf86"],
  [4200, "#f5cf86"],
];
function skyColorAt(x: number): string {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [x0, c0] = SKY_STOPS[i];
    const [x1, c1] = SKY_STOPS[i + 1];
    if (x >= x0 && x <= x1) return lerpColor(c0, c1, x1 === x0 ? 0 : (x - x0) / (x1 - x0));
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

const scene = sketch.scene({ width: W, height: H, viewport: { width: 640, height: 440 }, background: "#f2d4a3", seed: "windward" });

// Extends above y=0 and below H: the camera zooms in near the storm (balloon flies
// close to the world's own top edge there) and pulls back at the landing (past the
// world's bottom edge at that zoom) — either exceeds the *authored* 0..H band without
// this margin, revealing blank space above/below the painted sky.
const SKY_TOP = -260;
const SKY_BOTTOM = H + 120;
const BAND_W = 70;
const BAND_OVERLAP = 4;
for (let x = 0; x < W; x += BAND_W) {
  const c = skyColorAt(x + BAND_W / 2);
  const band = sketch.loop(
    [
      [x - BAND_OVERLAP, SKY_TOP],
      [x + BAND_W + BAND_OVERLAP, SKY_TOP],
      [x + BAND_W + BAND_OVERLAP, SKY_BOTTOM],
      [x - BAND_OVERLAP, SKY_BOTTOM],
    ],
    { color: c, weight: "light", looseness: 0, energy: "calm", smooth: false, fill: { color: c, style: "solid" } }
  );
  scene.add(band); // no drawOn/appear — a painted backdrop, always present, not pen-traced
}

function jagged(cx: number, cy: number, r: number): Point[] {
  const mults = [1.0, 0.82, 1.12, 0.88, 1.05, 0.8, 1.15, 0.9, 1.08, 0.85];
  return mults.map((m, i) => {
    const angle = (i / mults.length) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(angle) * r * m, cy + Math.sin(angle) * r * m] as Point;
  });
}

// ---------------------------------------------------------------------------------
// The balloon — built once, drawn once, then travels the whole world via moveAlong.
// ---------------------------------------------------------------------------------
function buildBalloon(cx: number, cy: number, startAt: number) {
  const group = sketch.group();
  scene.add(group);

  const basketHalfH = 17;
  const ropeLen = 20;
  const envBottomY = cy - basketHalfH - ropeLen;

  const envelope = sketch.loop(
    [
      [cx, envBottomY - 150],
      [cx + 70, envBottomY - 90],
      [cx + 45, envBottomY],
      [cx, envBottomY + 35],
      [cx - 45, envBottomY],
      [cx - 70, envBottomY - 90],
    ],
    { color: ink, weight: "bold", looseness: 0.22, energy: "calm", smooth: true, fill: { color: balloonMain, style: "solid" } }
  );
  const stripeY = envBottomY - 55;
  const stripe = sketch.loop(
    [
      [cx - 58, stripeY],
      [cx + 58, stripeY],
      [cx + 50, stripeY + 26],
      [cx - 50, stripeY + 26],
    ],
    { color: ink, weight: "confident", looseness: 0.16, energy: "quick", smooth: false, fill: { color: balloonAlt, style: "solid" } }
  );
  const ropeLeft = sketch.stroke(
    [
      [cx - 45, envBottomY],
      [cx - 22, cy - basketHalfH],
    ],
    { color: ropeTan, weight: "light", looseness: 0.2, energy: "calm", smooth: false }
  );
  const ropeRight = sketch.stroke(
    [
      [cx + 45, envBottomY],
      [cx + 22, cy - basketHalfH],
    ],
    { color: ropeTan, weight: "light", looseness: 0.2, energy: "calm", smooth: false }
  );
  const basket = sketch.loop(
    [
      [cx - 22, cy - basketHalfH],
      [cx + 22, cy - basketHalfH],
      [cx + 26, cy + basketHalfH],
      [cx - 26, cy + basketHalfH],
    ],
    { color: ink, weight: "confident", looseness: 0.2, energy: "quick", smooth: false, fill: { color: basketBrown, style: "hachure", density: 0.5, angle: 30 } }
  );
  const headCy = cy - basketHalfH - 5;
  const head = sketch.blob(cx, headCy, 13, { color: ink, weight: "light", looseness: 0.2, energy: "calm", fill: { color: skinTone, style: "solid" } }, 9);

  let t = startAt;
  group.add(envelope).drawOn({ at: t, duration: 0.95 });
  t += 1.05;
  group.add(stripe).drawOn({ at: t, duration: 0.4 });
  t += 0.46;
  group.add(ropeLeft).drawOn({ at: t, duration: 0.25 });
  group.add(ropeRight).drawOn({ at: t + 0.12, duration: 0.25 });
  t += 0.45;
  group.add(basket).drawOn({ at: t, duration: 0.4 });
  t += 0.46;
  group.add(head).drawOn({ at: t, duration: 0.32 });
  t += 0.36;

  const shoulderPt: Point = [cx + 22, cy - basketHalfH];
  return { group, endAt: t, shoulderPt };
}

const balloon = buildBalloon(500, 430, 2.0);

// ---------------------------------------------------------------------------------
// Zone 1 — meadow, dawn launch (x 0-950)
// ---------------------------------------------------------------------------------
const title = sketch.text("windward", 175, 20, { color: ink, weight: "confident", looseness: 0.1, energy: "calm", smooth: true }, { size: 72 });
scene.add(title);
title.stagger(0.045, { at: 0, duration: 0.11, effect: "drawOn" });
title.fadeTo(0, { at: 6.5, duration: 0.8 });

const hillsBack1 = sketch.loop(
  [
    [-20, 330],
    [110, 300],
    [220, 316],
    [330, 288],
    [440, 310],
    [560, 292],
    [700, 304],
    [900, 300],
    [970, 310],
    [970, 680],
    [-20, 680],
  ],
  { color: ink, weight: "light", looseness: 0.28, energy: "calm", smooth: true, fill: { color: "#c9b98a", style: "hachure", density: 0.28, angle: 20 } }
);
scene.add(hillsBack1).drawOn({ at: 0.6, duration: 0.85 });

const hillsFront1 = sketch.loop(
  [
    [-20, 390],
    [150, 356],
    [310, 372],
    [480, 348],
    [700, 376],
    [900, 400],
    [970, 410],
    [970, 680],
    [-20, 680],
  ],
  { color: ink, weight: "bold", looseness: 0.22, energy: "quick", smooth: true, fill: { color: "#a9bb63", style: "solid" } }
);
scene.add(hillsFront1).drawOn({ at: 1.35, duration: 0.75 });

const sun1 = sketch.blob(700, 90, 34, { color: "#d9a13d", weight: "confident", looseness: 0.15, energy: "calm", fill: { color: balloonAlt, style: "dots", density: 0.5 } }, 13);
scene.add(sun1).drawOn({ at: 1.0, duration: 0.5 });

// Liftoff: the balloon rises off the meadow once fully drawn, then the flight begins.
balloon.group.pivotAt(500, 430 - 17 - 20 - 150);
balloon.group
  .moveBy(30, -90, { at: balloon.endAt + 0.3, duration: 2.2, ease: "sine.inOut" })
  .rotateTo(-4, { at: balloon.endAt + 0.5, duration: 0.9, ease: "sine.inOut" })
  .rotateTo(3, { at: balloon.endAt + 1.4, duration: 0.9, ease: "sine.inOut" })
  .rotateTo(0, { at: balloon.endAt + 2.3, duration: 0.6, ease: "sine.inOut" });

// ---------------------------------------------------------------------------------
// Zone 2 — fair skies, cruise (x 950-2050)
// ---------------------------------------------------------------------------------
const clouds2 = sketch.group([
  sketch.blob(1100, 130, 30, { color: ink, weight: "light", looseness: 0.32, energy: "calm", fill: { color: "#ffffff", style: "solid" } }, 11),
  sketch.blob(1450, 90, 36, { color: ink, weight: "light", looseness: 0.32, energy: "calm", fill: { color: "#ffffff", style: "solid" } }, 11),
  sketch.blob(1750, 180, 28, { color: ink, weight: "light", looseness: 0.32, energy: "calm", fill: { color: "#ffffff", style: "solid" } }, 11),
  sketch.blob(1950, 110, 32, { color: ink, weight: "light", looseness: 0.32, energy: "calm", fill: { color: "#ffffff", style: "solid" } }, 11),
]);
scene.add(clouds2);
clouds2.stagger(0.3, { at: 10, duration: 0.5, effect: "drawOn" });

const bird2a = sketch.stroke(
  [
    [1500, 140],
    [1515, 132],
    [1530, 140],
  ],
  { color: ink, weight: "light", looseness: 0.25, energy: "quick", smooth: true }
);
const bird2b = sketch.stroke(
  [
    [1535, 155],
    [1550, 147],
    [1565, 155],
  ],
  { color: ink, weight: "light", looseness: 0.25, energy: "quick", smooth: true }
);
const birds2 = sketch.group([bird2a, bird2b]);
scene.add(birds2);
birds2.stagger(0.18, { at: 13, duration: 0.2, effect: "drawOn" });
birds2.moveBy(300, -20, { at: 13.4, duration: 5.0, ease: "sine.in" });

const bubble2 = sketch.speechBubble(1650, 210, 150, 62, { color: ink, weight: "light", looseness: 0.18, energy: "calm", smooth: true, fill: { color: "#fbf8f1", style: "solid" } }, { tailAt: "bottom-left" });
scene.add(bubble2).drawOn({ at: 14.5, duration: 0.45 });
const bubbleText2 = sketch.text("onward", 1673, 226, { color: ink, weight: "confident", looseness: 0.08, energy: "calm", smooth: true }, { size: 26 });
scene.add(bubbleText2).drawOn({ at: 15.1, duration: 0.5 });
bubble2.fadeTo(0, { at: 17.5, duration: 0.5 });
bubbleText2.fadeTo(0, { at: 17.5, duration: 0.5 });

const arrow2 = sketch.arrow([1780, 300], [1870, 288], { color: "#8fa9bb", weight: "light", looseness: 0.25, energy: "calm", smooth: true }, { headSize: 10 });
scene.add(arrow2).drawOn({ at: 16.0, duration: 0.4 });
arrow2.fadeTo(0, { at: 19, duration: 0.6 });

// ---------------------------------------------------------------------------------
// Zone 3 — storm (x 2050-2900)
// ---------------------------------------------------------------------------------
const stormCloudL = sketch.blob(2180, 130, 52, { color: ink, weight: "light", looseness: 0.3, energy: "calm", fill: { color: "#3f4550", style: "solid" } }, 10);
scene.add(stormCloudL).drawOn({ at: 19.5, duration: 0.5 });
stormCloudL.morphTo(jagged(2180, 130, 62), { at: 20.2, duration: 0.7, ease: "power2.inOut" });

const stormCloudR = sketch.blob(2650, 100, 46, { color: ink, weight: "light", looseness: 0.3, energy: "calm", fill: { color: "#3f4550", style: "solid" } }, 10);
scene.add(stormCloudR).drawOn({ at: 19.8, duration: 0.5 });
stormCloudR.morphTo(jagged(2650, 100, 56), { at: 20.5, duration: 0.7, ease: "power2.inOut" });

function rainBurst(cx: number, at: number) {
  const xs = [-220, -160, -100, -40, 20, 80, 140, 200, 260].map((dx) => cx + dx);
  const rain = sketch.group(
    xs.map((x, i) =>
      sketch.stroke(
        [
          [x, 60 + (i % 3) * 20],
          [x - 10, 94 + (i % 3) * 20],
        ],
        { color: "#c4ccd6", weight: "light", looseness: 0.15, energy: "quick", smooth: false }
      )
    )
  );
  scene.add(rain);
  rain.stagger(0.04, { at, duration: 0.12, effect: "appear" });
  rain.moveBy(18, 70, { at: at + 0.6, duration: 0.8, ease: "none" });
  rain.fadeTo(0, { at: at + 1.1, duration: 0.5 });
}
rainBurst(2280, 21.5);
rainBurst(2500, 22.8);
rainBurst(2380, 24.0);

const bolt3 = sketch.stroke(
  [
    [2400, 40],
    [2375, 120],
    [2405, 120],
    [2365, 210],
  ],
  { color: "#f5efe0", weight: "confident", looseness: 0.08, energy: "quick", smooth: false }
);
scene.add(bolt3).appear({ at: 21.2, duration: 0.03 });
bolt3.fadeTo(0, { at: 21.37, duration: 0.35 });

// Turbulence: buffets the balloon's rotation while moveAlong (below) carries it through
// the storm's x-range — two independent tweened properties on the same group, so they
// compose instead of fighting each other.
balloon.group
  .rotateTo(-11, { at: 20.5, duration: 0.35, ease: "power1.inOut" })
  .rotateTo(9, { at: 20.85, duration: 0.35, ease: "power1.inOut" })
  .rotateTo(-10, { at: 21.2, duration: 0.35, ease: "power1.inOut" })
  .rotateTo(7, { at: 21.55, duration: 0.35, ease: "power1.inOut" })
  .rotateTo(-8, { at: 21.9, duration: 0.35, ease: "power1.inOut" })
  .rotateTo(6, { at: 22.25, duration: 0.35, ease: "power1.inOut" })
  .rotateTo(-4, { at: 22.6, duration: 0.4, ease: "power1.inOut" })
  .rotateTo(0, { at: 23.2, duration: 0.6, ease: "sine.out" });

// ---------------------------------------------------------------------------------
// Zone 4 — night, the lighthouse, and dawn landing (x 2900-4200)
// ---------------------------------------------------------------------------------
const moon4 = sketch.blob(3080, 110, 30, { color: inkNight, weight: "confident", looseness: 0.18, energy: "calm", fill: { color: "#f6dda0", style: "dots", density: 0.5 } }, 14);
scene.add(moon4).drawOn({ at: 26, duration: 0.45 });

const stars4 = sketch.group([
  sketch.blob(3200, 70, 8, { color: balloonAlt, weight: "light", looseness: 0.3, fill: { color: balloonAlt, style: "solid" } }, 8),
  sketch.blob(3300, 130, 9, { color: balloonAlt, weight: "light", looseness: 0.3, fill: { color: balloonAlt, style: "solid" } }, 8),
  sketch.blob(3450, 80, 8, { color: balloonAlt, weight: "light", looseness: 0.3, fill: { color: balloonAlt, style: "solid" } }, 8),
  sketch.blob(3600, 150, 7, { color: balloonAlt, weight: "light", looseness: 0.3, fill: { color: balloonAlt, style: "solid" } }, 8),
]);
scene.add(stars4);
stars4.stagger(0.15, { at: 26.5, duration: 0.2, effect: "drawOn" });

const bubble4 = sketch.speechBubble(3280, 220, 130, 50, { color: inkNight, weight: "light", looseness: 0.18, energy: "calm", smooth: true, fill: { color: "#23324a", style: "solid" } }, { tailAt: "bottom-left", tailSize: 14 });
scene.add(bubble4).drawOn({ at: 28.5, duration: 0.4 });
const bubbleText4 = sketch.text("there!", 3297, 232, { color: inkNight, weight: "confident", looseness: 0.08, energy: "calm", smooth: true }, { size: 21 });
scene.add(bubbleText4).drawOn({ at: 28.95, duration: 0.45 });
bubble4.fadeTo(0, { at: 30.5, duration: 0.4 });
bubbleText4.fadeTo(0, { at: 30.5, duration: 0.4 });

// Lighthouse geometry, relative to the tower's own base-center.
const LH = {
  island: [
    [-171.5, 48], [-137.5, 12], [-89.5, -8], [-37.5, -2], [10.5, -14], [66.5, -4], [102.5, 22], [132.5, 48],
  ] as Point[],
  tower: [[-54.5, 0], [54.5, 0], [30.5, -175], [-28.5, -175]] as Point[],
  stripeTop: [[-33.5, -134], [36.5, -134], [41.5, -98], [-38.5, -98]] as Point[],
  stripeBottom: [[-45.5, -56], [48.5, -56], [53.5, -20], [-49.5, -20]] as Point[],
  lanternRoom: [[-34.5, -213], [36.5, -213], [29.5, -175], [-27.5, -175]] as Point[],
  roof: [[-46.5, -213], [0.5, -247], [48.5, -213]] as Point[],
  door: [[-15.5, -43], [18.5, -43], [18.5, 0], [-15.5, 0]] as Point[],
  beamPivot: [0.5, -186] as Point,
  beamFar: [[-5.5, -196], [-327.5, -264], [-327.5, -140], [-5.5, -177]] as Point[],
};

function buildLighthouse(cx: number, cy: number, s: number, startAt: number) {
  const tp = (p: Point): Point => [cx + p[0] * s, cy + p[1] * s];
  const group = sketch.group();
  scene.add(group);
  let t = startAt;

  const pivot = tp(LH.beamPivot);
  const beam = sketch
    .loop(LH.beamFar.map(tp), { color: balloonAlt, weight: "light", looseness: 0.2, energy: "calm", smooth: false, fill: { color: balloonAlt, style: "hachure", density: 0.22, angle: 8 } })
    .pivotAt(pivot[0], pivot[1]);
  group.add(beam).drawOn({ at: t, duration: 0.7 });
  t += 0.75;

  const island = sketch.loop(LH.island.map(tp), { color: inkNight, weight: "bold", looseness: 0.3, energy: "quick", smooth: true, fill: { color: "#315a6b", style: "cross-hatch", density: 0.5, angle: 32 } });
  group.add(island).drawOn({ at: t, duration: 0.65 });
  t += 0.7;

  const tower = sketch.loop(LH.tower.map(tp), { color: inkNight, weight: "bold", looseness: 0.18, energy: "calm", smooth: false, fill: { color: "#d9d2c2", style: "hachure", density: 0.3, angle: 68 } });
  group.add(tower).drawOn({ at: t, duration: 0.7 });
  t += 0.75;

  const stripeTop = sketch.loop(LH.stripeTop.map(tp), { color: "#c85d52", weight: "confident", looseness: 0.14, energy: "quick", smooth: false, fill: { color: "#c85d52", style: "solid" } });
  group.add(stripeTop).drawOn({ at: t, duration: 0.3 });
  t += 0.34;

  const stripeBottom = sketch.loop(LH.stripeBottom.map(tp), { color: "#c85d52", weight: "confident", looseness: 0.14, energy: "quick", smooth: false, fill: { color: "#c85d52", style: "solid" } });
  group.add(stripeBottom).drawOn({ at: t, duration: 0.32 });
  t += 0.36;

  const lanternRoom = sketch.loop(LH.lanternRoom.map(tp), { color: inkNight, weight: "bold", looseness: 0.16, energy: "calm", smooth: false, fill: { color: balloonAlt, style: "cross-hatch", density: 0.34, angle: 45 } });
  group.add(lanternRoom).drawOn({ at: t, duration: 0.36 });
  t += 0.4;

  const roof = sketch.loop(LH.roof.map(tp), { color: inkNight, weight: "bold", looseness: 0.25, energy: "quick", smooth: false, fill: { color: "#c85d52", style: "solid" } });
  group.add(roof).drawOn({ at: t, duration: 0.3 });
  t += 0.34;

  const door = sketch.loop(LH.door.map(tp), { color: inkNight, weight: "confident", looseness: 0.2, energy: "calm", smooth: false, fill: { color: "#24384a", style: "solid" } });
  group.add(door).drawOn({ at: t, duration: 0.28 });
  t += 0.3;

  return { group, beam, endAt: t };
}

const lighthouse = buildLighthouse(3700, 460, 0.85, 27);
lighthouse.beam
  .rotateTo(-8, { at: 30.2, duration: 0.9, ease: "sine.inOut" })
  .rotateTo(6, { at: 31.2, duration: 1.0, ease: "sine.inOut" })
  .rotateTo(0, { at: 32.3, duration: 0.7, ease: "sine.inOut" });

const waves4 = sketch.group([
  sketch.stroke(
    [
      [3150, 510],
      [3220, 500],
      [3290, 512],
      [3360, 501],
    ],
    { color: "#9bb7c7", weight: "confident", looseness: 0.36, energy: "quick", smooth: true }
  ),
  sketch.stroke(
    [
      [3180, 535],
      [3250, 525],
      [3320, 538],
      [3390, 527],
    ],
    { color: "#9bb7c7", weight: "light", looseness: 0.4, energy: "quick", smooth: true }
  ),
]);
scene.add(waves4);
waves4.stagger(0.2, { at: 27.5, duration: 0.4, effect: "drawOn" });

// Positioned above and left of the lighthouse tower (tower occupies roughly
// x3654-3746, y250-460) — sits inside the pulled-back final frame (the camera tracks
// the landed balloon at ~y460, not the world origin, so text up near the opening
// title's y=20 would be cropped out entirely at a tight zoom).
const closing = sketch.text("home", 3480, 140, { color: ink, weight: "confident", looseness: 0.1, energy: "calm", smooth: true }, { size: 76 });
scene.add(closing);
closing.stagger(0.07, { at: 37.5, duration: 0.16, effect: "drawOn" });
const underline5 = sketch.stroke(
  [
    [3480, 222],
    [3570, 228],
    [3660, 220],
  ],
  { color: ink, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(underline5).drawOn({ at: 38.4, duration: 0.5 });

// ---------------------------------------------------------------------------------
// The flight itself — one curved path carries the balloon from the meadow, across the
// whole world, to a landing beside the lighthouse. The camera follows it the entire way.
// ---------------------------------------------------------------------------------
const FLIGHT_AT = 9.0;
const FLIGHT_DURATION = 29.0;

// moveAlong (like moveTo) targets the node's *bbox center*, not any point the author was
// picturing while choosing numbers. This balloon's bbox center sits 85px above the
// basket (the envelope reaches ~187px above the basket, the basket only ~17px below it,
// so the vertical middle is pulled way up) — every y below is basket-height minus 85, so
// the basket actually ends up where the flight was designed around, not the envelope.
const BASKET_TO_BBOX_DY = -85;
const BASKET_PATH: Point[] = [
  [530, 340],
  [700, 250],
  [1000, 210],
  [1500, 195],
  [2000, 220],
  [2300, 150],
  [2550, 290],
  [2800, 190],
  [3050, 330],
  [3400, 410],
  [3620, 445],
  [3760, 462],
];
balloon.group.moveAlong(
  BASKET_PATH.map(([x, y]) => [x, y + BASKET_TO_BBOX_DY] as Point),
  { at: FLIGHT_AT, duration: FLIGHT_DURATION, ease: "sine.inOut", rotate: false }
);

// Settle upright on landing.
balloon.group.rotateTo(-9, { at: FLIGHT_AT + FLIGHT_DURATION + 0.1, duration: 0.5, ease: "sine.out" });

// Added to balloon.group, not the scene directly — anything meant to travel with the
// balloon has to actually be a child of it, or it just stays behind at the balloon's
// original meadow position while the group moves on without it.
const arm5 = sketch
  .stroke(
    [balloon.shoulderPt, [balloon.shoulderPt[0] + 16, balloon.shoulderPt[1] - 22], [balloon.shoulderPt[0] + 10, balloon.shoulderPt[1] - 40]],
    { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
  )
  .pivotAt(balloon.shoulderPt[0], balloon.shoulderPt[1]);
balloon.group.add(arm5).drawOn({ at: FLIGHT_AT + FLIGHT_DURATION + 0.6, duration: 0.3 });
arm5
  .rotateTo(22, { at: FLIGHT_AT + FLIGHT_DURATION + 1.0, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-14, { at: FLIGHT_AT + FLIGHT_DURATION + 1.35, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(18, { at: FLIGHT_AT + FLIGHT_DURATION + 1.7, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(0, { at: FLIGHT_AT + FLIGHT_DURATION + 2.05, duration: 0.35, ease: "sine.inOut" });

// ---------------------------------------------------------------------------------
// Camera — an initial static frame on the meadow while the balloon is drawn and lifts
// off, then one long follow for the entire flight, with a couple of zoom beats layered
// on top for pacing (the storm feels tighter, the lighthouse reveal opens back up).
// ---------------------------------------------------------------------------------
const cam = scene.camera();
// cy=235, not the balloon's own ~400: the 440-tall viewport centered on the balloon
// would put its top edge at y=180, well below the title text sitting up at y=20-92.
cam.panTo(460, 235, { at: 0, duration: 0 });
cam.follow(balloon.group, { at: FLIGHT_AT, duration: FLIGHT_DURATION + 1.5, ease: "none" });
cam.zoomTo(1.18, { at: 20.0, duration: 1.5, ease: "sine.inOut" });
cam.zoomTo(1.0, { at: 23.5, duration: 1.5, ease: "sine.inOut" });
cam.zoomTo(0.82, { at: 27.0, duration: 2.0, ease: "sine.inOut" });
cam.zoomTo(1.0, { at: 34.0, duration: 2.0, ease: "sine.inOut" });
// Pulls back for the landing — both to read as "camera opens up on the safe arrival"
// and because the tight 1.0 frame doesn't leave room for the lighthouse, the balloon,
// and the closing title all at once.
cam.zoomTo(0.68, { at: 37.0, duration: 2.2, ease: "sine.inOut" });

export default scene;
