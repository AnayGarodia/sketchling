import { sketch } from "../../src/index.js";

// Showcase: the same restrained silhouette register as quiet-crossing.ts / quiet-ride.ts —
// one small no-face figure, naturalistic proportions, huge negative space, look:"ink" +
// texture:"grain" — moved off land and onto still water at first light. What's new here
// isn't a primitive, it's a lighting problem: the water is a real REFLECTION of the sky's
// own gradient (the same stop sequence, flipped top-to-bottom and darkened, so the warm
// horizon band lands at the waterline and the sky's cool zenith reappears nearest the
// viewer) rather than one flat darker band, with a low-alpha sun column and a handful of
// slowly-shimmering glint dashes riding on top of it. Motion is deliberately almost
// nothing: a slow cast, a boat drifting ~18px over the whole shot, one ripple set every
// few seconds, two birds. Held breath, not an event.

const WORLD_W = 800;
const WORLD_H = 520;
const VIEW_W = 640;
const VIEW_H = 400;
const HORIZON = 232;

// The world is intentionally only a little larger than the viewport: enough that the slow
// camera drift below has somewhere to go, while keeping the framing provably inside the
// world on every axis for the whole shot (quiet-ride.ts's stray-pale-rectangle bug appears
// the moment center ± viewport/2 crosses a world edge). Worst case over the whole drift is
// x in [76, 732] of [0, 800] and y in [54, 462] of [0, 520] — see the camera block at the
// bottom for the arithmetic.
const CAM_X0 = 396;
const CAM_Y0 = 262;
const CAM_X1 = 412;
const CAM_Y1 = 254;

const SIL = "#141924"; // boat + figure: near-black, cooled toward the sky rather than warm
const HAZE = "#6a7488"; // the far bank, hazed out by distance
const HAZE_DK = "#5b657d";
const TOTAL = 15.8;

const scene = sketch.scene({
  width: WORLD_W,
  height: WORLD_H,
  viewport: { width: VIEW_W, height: VIEW_H },
  // Dawn: a cool blue-grey zenith falling through a dusty transition into one soft warm
  // band right at the horizon (offset 0.446 = HORIZON / WORLD_H). Everything past that
  // offset sits under the water plane below and never shows.
  background: {
    stops: [
      { offset: 0, color: "#37425a" },
      { offset: 0.2, color: "#4d5771" },
      { offset: 0.34, color: "#7a8096" },
      { offset: 0.41, color: "#b39a95" },
      { offset: 0.446, color: "#f0cd9e" },
      { offset: 1, color: "#f0cd9e" },
    ],
    direction: "vertical",
  },
  seed: "dawn-fisherman",
  look: "ink",
  texture: "grain",
});

function circlePoints(cx: number, cy: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// blob() keeps a wobble floor even at looseness 0, which turns anything disc-sized lumpy —
// the sun and the ripple rings are plotted trig shapes for that reason (same call the moon
// in nightfall-hill.ts needed).
function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

// A deterministic 0..1 hash — the glint field below wants scatter, not a grid, and
// Math.random would make every build's water different (same reason nightfall-hill.ts's
// star field is a golden-angle sequence rather than an RNG).
function rnd(i: number, k: number): number {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// --- Sun, barely cresting the far bank -------------------------------------------------
// Seven concentric circles at 4-20% alpha rather than a bright disc with a halo. Under "ink"
// there is no way to get a clean-edged disc: roughness bottoms out at 0.6 (0.42 with
// energy:"calm") and the stacked line-boil variants union into a bumpy outline, which on a
// bright opaque core read unmistakably as a cotton ball. Two steps still banded visibly; at
// seven, each ragged edge is invisible and the stack composites to a soft ~30% bright centre
// — which is what the sun looks like through haze at this hour anyway.
const SUN_X = 560;
const SUN_Y = 230;

const SUN_STEPS: [number, string][] = [
  [96, "#f7dcae0a"], [78, "#f7deb00c"], [62, "#f8e0b40e"], [48, "#f9e2b810"],
  [36, "#f9e4bc16"], [26, "#fae7c420"], [17, "#fbecd034"],
];
SUN_STEPS.forEach(([r, fill], i) => {
  scene.add(
    sketch.loop(circlePoints(SUN_X, SUN_Y - i, r, 48), {
      color: "#00000000",
      weight: "light",
      looseness: 0,
      energy: "calm",
      fill: { color: fill, style: "solid" },
    })
  ).appear({ at: 0.15 + i * 0.06, duration: 1.6 });
});

// --- The far bank — drawn AFTER the sun so it buries the bottom of the disc: the sun is
// cresting the opposite shore, not floating above it. A near-flat band, no detail. -------
// Stroked at 6px in its own fill color, not "light"'s 1.5px: rough.js jitters a shape's fill
// path and its outline path independently, and against the brightest part of the sky that
// few-px mismatch showed up as bright warm slivers cutting into the silhouette. A fat
// same-color stroke covers most of it and softens the edge, which suits a hazed-out distance
// anyway. It doesn't cover all of it — a hairline seam inside a solid ink fill is inherent to
// this look (quiet-crossing.ts's tree trunk has the same one), not something to chase further.
const bankTop: [number, number][] = [];
for (let i = 0; i <= 24; i++) {
  const bx = -20 + (i * 840) / 24;
  bankTop.push([bx, 227 - Math.sin(i * 0.9) * 2.2 - rnd(i, 9) * 2.4]);
}
scene.add(
  sketch.loop([...bankTop, [820, 242], [-20, 242]], {
    color: HAZE,
    weight: 6,
    looseness: 0.15,
    energy: "calm",
    smooth: false,
    fill: { color: HAZE, style: "solid" },
  })
).appear({ at: 0.5, duration: 1.3 });

// A distant treeline, only just perceptible — enough that the bank has a far side rather
// than being a ruled line, not enough to become subject matter.
function shoreClump(cx: number, w: number, h: number) {
  scene.add(
    sketch.loop(
      [
        [cx - w, 234], [cx - w * 0.6, 234 - h * 0.55], [cx - w * 0.2, 234 - h],
        [cx + w * 0.25, 234 - h * 0.7], [cx + w * 0.7, 234 - h * 0.85], [cx + w, 234],
      ],
      { color: HAZE_DK, weight: 5.5, looseness: 0.3, energy: "calm", fill: { color: HAZE_DK, style: "solid" }, smooth: true }
    )
  ).appear({ at: 0.7, duration: 1.2 });
}
shoreClump(150, 42, 19);
shoreClump(404, 30, 12);
shoreClump(672, 50, 22);

// --- The water: the sky's own gradient, flipped and darkened ---------------------------
// offset 0 sits at the horizon and carries the sky's warm band; offset 1 is nearest the
// viewer and comes back around to the sky's cool zenith — which is what a reflection
// actually is, and the whole reason this reads as water instead of a darker floor.
//
// The top edge is subdivided into 20 short segments rather than one 840px span, and drawn
// with looseness 0 / energy "calm" / smooth: false. rough.js's bowing displaces each
// segment's midpoint in proportion to that segment's own LENGTH, so a single full-width
// segment bowed ~30px up into the sky — a warm dome sitting on the horizon that read as a
// sand dune and hid the whole far bank behind it. On land (quiet-crossing.ts's embankment)
// that bow is free character; a water horizon has to be dead straight, so it needs short
// segments. Everything long and edge-to-edge in this scene is built this way for that reason.
const waterTop: [number, number][] = [];
for (let i = 0; i <= 20; i++) waterTop.push([-20 + (i * 840) / 20, HORIZON]);
scene.add(
  sketch.loop(
    [...waterTop, [820, WORLD_H + 20], [-20, WORLD_H + 20]],
    {
      color: "#00000000",
      weight: "light",
      looseness: 0,
      energy: "calm",
      smooth: false,
      fill: {
        color: {
          stops: [
            { offset: 0, color: "#d9b189" },
            { offset: 0.1, color: "#b6a094" },
            { offset: 0.3, color: "#8a8b97" },
            { offset: 0.55, color: "#5f687c" },
            { offset: 1, color: "#3a4458" },
          ],
          direction: "vertical",
        },
        style: "solid",
      },
    }
  )
);

// The sun's reflected path. A wedge widening toward the viewer, but at barely-there alpha
// and with a soft irregular edge: an earlier pass used a crisp straight-edged wedge at 0x2e
// plus eight evenly-spaced dashes, and it read unmistakably as a paved road with lane
// markings. The glow only sets the region; the scatter below is what makes it water.
const COLUMN_TOP = HORIZON + 2;
scene.add(
  sketch.loop(
    [
      [SUN_X - 11, COLUMN_TOP], [SUN_X + 11, COLUMN_TOP], [SUN_X + 30, 318], [SUN_X + 62, 418],
      [SUN_X + 88, WORLD_H], [SUN_X - 92, WORLD_H], [SUN_X - 66, 418], [SUN_X - 34, 318],
    ],
    { color: "#00000000", weight: "light", energy: "calm", smooth: true, fill: { color: "#f6dcae10", style: "solid" } }
  )
).appear({ at: 0.9, duration: 1.7 });

// Glints: short broken dashes scattered through the column, spaced on a perspective
// distribution (rows crowd together toward the horizon, spread wide apart toward the
// viewer). Each drifts between two opacities on its own slow offset, so the surface is
// always faintly alive without anything actually happening — the only continuous motion in
// the frame besides the drift and the birds. The wide horizontal scatter and the jittered
// row spacing are both deliberate: an earlier pass kept the dashes inside a narrow band at
// even intervals and the result read as a road with lane markings, not sun on water.
const GLINTS = 34;
for (let i = 0; i < GLINTS; i++) {
  const t = i / (GLINTS - 1);
  const gy = COLUMN_TOP + 8 + Math.pow(t, 1.8) * 272 + (rnd(i, 8) - 0.5) * 9;
  const hw = 10 + Math.pow(t, 0.85) * 76;
  const gx = SUN_X + (rnd(i, 1) - 0.5) * hw * 1.85;
  const len = (1.4 + rnd(i, 2) * 6.5) * (0.4 + t * 1.7);
  const peak = 0.2 + rnd(i, 3) * 0.45;
  const d = scene.add(
    sketch.stroke([[gx - len, gy], [gx + len, gy]], { color: "#fceecf", weight: "light", looseness: 0.5 })
  );
  d.initial({ opacity: 0 });
  d.fadeTo(peak, { at: 0.9 + rnd(i, 4) * 1.4, duration: 1.4, ease: "sine.inOut" });
  d.fadeTo(peak * 0.35, { at: 3.0 + rnd(i, 5) * 3.4, duration: 2.0, ease: "sine.inOut" });
  d.fadeTo(peak, { at: 6.8 + rnd(i, 6) * 3.2, duration: 2.2, ease: "sine.inOut" });
  d.fadeTo(peak * 0.45, { at: 10.6 + rnd(i, 7) * 2.8, duration: 2.4, ease: "sine.inOut" });
}

// --- Ripples -----------------------------------------------------------------------------
// This group is added to the scene BEFORE the boat specifically so the hull draws over it:
// a ring that starts under the boat and grows out from beneath it reads as displaced water,
// where the same ring drawn on top of the hull reads as a line scribbled across the boat.
// (Their radii also have to start wider than the 150px hull for the same reason — a ring
// smaller than the boat has nowhere to emerge from.)
const surface = sketch.group();
scene.add(surface);

// Flattened rings (rx:ry about 6:1, the perspective of a circle on a receding plane) that
// grow and fade rather than a fixed ring popping in. Opacity is driven by fadeTo from an
// initial 0 rather than appear(), so the peak can sit well under 1 — a ripple on still water
// is a hint of a lighter line, not a drawn circle.
//
// The ellipse is plotted around the ORIGIN and placed with initial({x, y}) rather than
// plotted at its final canvas position: authored in place, scaleTo scaled it about the SVG
// origin instead of its own centre, so a ring under the boat grew AND slid ~65px down-right
// as it expanded — a hoop drifting across the water rather than a ripple. Around the origin,
// scale and translate can't be confused: scaling about (0,0) IS scaling about the centre.
function ripple(
  parent: ReturnType<typeof sketch.group>,
  cx: number, cy: number, rx: number, ry: number,
  at: number, grow: number, peak: number, life: number
) {
  const r = sketch.loop(ellipsePoints(0, 0, rx, ry, 34), {
    color: "#f0dec4",
    weight: 1,
    looseness: 0.35,
    energy: "calm",
    smooth: true,
  });
  r.initial({ opacity: 0, x: cx, y: cy });
  parent.add(r);
  r.fadeTo(peak, { at, duration: life * 0.28, ease: "sine.out" });
  r.scaleTo(grow, { at, duration: life, ease: "sine.out" });
  r.fadeTo(0, { at: at + life * 0.34, duration: life * 0.66, ease: "sine.inOut" });
}

// --- The boat, the fisherman, the rod, the line ----------------------------------------
// Everything below is authored in the boat's own local space (origin = the hull's midpoint
// at the waterline) and placed with one initial({x,y}) on the group, the same convention
// quiet-crossing.ts's walker uses — so no moveTo anywhere and no bbox-center guessing.
const BOAT_X = 330;
const BOAT_Y = 322;
const WATERLINE = 11; // local y where the hull meets the surface

// Radiating from the hull, into the group above.
ripple(surface, BOAT_X - 6, BOAT_Y + WATERLINE + 3, 86, 14, 3.0, 2.0, 0.22, 5.0);
ripple(surface, BOAT_X - 6, BOAT_Y + WATERLINE + 3, 82, 13, 7.0, 2.1, 0.19, 5.0);
ripple(surface, BOAT_X - 14, BOAT_Y + WATERLINE + 3, 84, 14, 11.2, 2.0, 0.18, 4.6);

const HULL: [number, number][] = [
  [-74, -14], [-50, -7], [-18, -3], [18, -3], [53, -8], [76, -16],
  [61, 4], [21, 11], [-21, 11], [-55, 6],
];

const boat = sketch.group();
scene.add(boat);

// The reflection, before the hull so the hull always sits on top of it: the same outline
// mirrored about the waterline and compressed to 45%, at low alpha, with a loose outline so
// the surface visibly breaks it up. Three dark dashes below stand in for the figure's own
// reflection — a rippled surface smears a vertical shape into bands, it doesn't mirror it.
const reflection = sketch.loop(
  HULL.map(([x, y]) => [x, WATERLINE + (WATERLINE - y) * 0.45] as [number, number]),
  { color: "#00000000", weight: "light", looseness: 0.55, fill: { color: "#141924", style: "solid" } }
);
reflection.initial({ opacity: 0 });
boat.add(reflection);
reflection.fadeTo(0.32, { at: 2.3, duration: 1.4, ease: "sine.inOut" });

const smears: [number, number, number][] = [[-12, 20, 26], [-6, 27, 18], [-1, 34, 9]];
for (const [sx, sy, sw] of smears) {
  const s = sketch.stroke([[sx, sy], [sx + sw, sy]], { color: "#161b26", weight: "confident", looseness: 0.45 });
  s.initial({ opacity: 0 });
  boat.add(s);
  s.fadeTo(0.3, { at: 2.6, duration: 1.4, ease: "sine.inOut" });
}

// 4.5px outline in the fill's own color, for the same reason the bank needed a fat stroke:
// at "confident"'s 3px, the gap between rough.js's independently-jittered fill and outline
// paths let pale nicks of water show through the inside of the hull.
boat.add(
  sketch.loop(HULL, {
    color: SIL,
    weight: 4.5,
    looseness: 0.1,
    fill: { color: SIL, style: "solid" },
    smooth: true,
  })
).drawOn({ at: 0.8, duration: 1.7 });

// The figure: one continuous filled outline for a seated body — back, shoulder, the arm
// folded forward to the grip, chest, thigh, shin, foot, back under the thigh to the hip.
// No separately rotated limb anywhere (quiet-crossing.ts's lesson: a limb loop whose pivot
// sits at the body's own edge visibly detaches the instant it moves), and no face. The rod
// lives INSIDE this group so the lean and the cast compose instead of the grip sliding off
// the hands.
const figure = sketch.group();
boat.add(figure);
// A plain Group has no single path to trace, so drawOn is a no-op on it — the figure fades
// up once the hull has finished drawing instead (without this it sat in an empty half-drawn
// boat from frame one, which an early still caught).
figure.appear({ at: 2.4, duration: 0.9 });
figure.add(
  sketch.loop(
    [
      [-12, -3], [-14, -19], [-10, -34], [-7, -42], [2, -44], [7, -39],
      [14, -32], [20, -28], [17, -24], [8, -27], [5, -20],
      [17, -13], [22, -10], [26, -1], [29, 3], [22, 5], [5, 0],
    ],
    { color: SIL, weight: 4, looseness: 0.1, fill: { color: SIL, style: "solid" }, smooth: true }
  )
);
// The head sits high enough to leave a real neck gap over the shoulder line at y:-44 (bottom
// edge at -47.5, and the fattened 4px outlines eat about 0.5px of that from each side) — the
// same gap quiet-crossing.ts's walker needed so head and torso don't fuse into one lump.
figure.add(sketch.blob(0, -55, 7.5, { color: SIL, weight: 4, looseness: 0.08, fill: { color: SIL, style: "solid" } }, 12));
// A flat cap with a short peak forward: the one costume cue, enough to say "fisherman"
// without a face.
figure.add(
  sketch.loop(
    [[-7, -57], [-2, -61], [5, -60], [12, -57], [5, -54], [-4, -54]],
    { color: SIL, weight: 3.5, looseness: 0.12, fill: { color: SIL, style: "solid" }, smooth: true }
  )
);
// pivotAt is documented as taking an ABSOLUTE canvas point, and the renderer makes that true
// by subtracting the node's OWN translate — which means for a node nested inside a
// translated parent (this group's translate is 0; the boat above it carries the placement)
// the pivot has to be given in the PARENT's local space, not canvas space. Passing canvas
// coords here first time round put the origin ~330px away from the shape and a 3-degree lean
// hurled the rod clean off the figure, which is exactly the failure mode the renderer's own
// pivotAt/translate comment describes, just one level of nesting further down.
figure.pivotAt(-10, -6); // the hip, in the boat's local space

// The rod: pivoted exactly at the grip, which sits inside the hand end of the arm bump, so
// rotating it reads as a wrist/forearm rather than a stick sliding out of a fist. Weight 1.8
// rather than "confident" (3px) — a rod is thinner than a body outline's contour.
const ROD_GRIP: [number, number] = [19, -27];
const rod = sketch.stroke([ROD_GRIP, [53, -46], [87, -65]], { color: SIL, weight: 1.8, looseness: 0.12 });
rod.pivotAt(ROD_GRIP[0], ROD_GRIP[1]);
figure.add(rod);
rod.drawOn({ at: 3.2, duration: 0.9 });

// The line, authored from where the rod tip actually ends up once it settles (the grip plus
// the 78px shaft rotated by the settle angle, worked out rather than eyeballed) out to a
// landing point further from the boat — higher on screen than the hull's waterline, which is
// what "further away" means on a flat water plane.
const CAST_LAND: [number, number] = [158, -26];
const line = sketch.stroke([[94, -47], [128, -32], CAST_LAND], { color: "#2b3446", weight: 0.9, looseness: 0.15, energy: "calm" });
figure.add(line);

// The float, where the line meets the surface. A 2.6px trig circle rather than a blob():
// blob's outline jitter has a floor that makes anything under ~9px read as a smudge.
const float = sketch.loop(circlePoints(CAST_LAND[0], CAST_LAND[1], 2.6, 12), {
  color: SIL,
  weight: 1.2,
  looseness: 0,
  energy: "calm",
  fill: { color: SIL, style: "solid" },
});
float.initial({ opacity: 0 });
figure.add(float);
float.fadeTo(1, { at: 9.3, duration: 0.5, ease: "sine.out" });

// --- Choreography: one slow cast, and a boat that never quite holds still ---------------
const BACK_AT = 5.2;
const FWD_AT = 6.7;
const SETTLE_AT = 7.5;

// Backcast (rod almost vertical), forward whip, then a long settle. Sine easing throughout,
// no overshoot, no squashTo — the same patient weighting the walk in quiet-crossing.ts uses.
rod.rotateTo(-58, { at: BACK_AT, duration: 1.5, ease: "sine.inOut" });
rod.rotateTo(22, { at: FWD_AT, duration: 0.8, ease: "sine.inOut" });
rod.rotateTo(14, { at: SETTLE_AT, duration: 1.1, ease: "sine.out" });

// A 3-degree lean of the whole upper body into the cast — the rod's own rotation composes
// on top of it, since it's a child of this group.
figure.rotateTo(-3, { at: BACK_AT, duration: 1.5, ease: "sine.inOut" });
figure.rotateTo(2.5, { at: FWD_AT, duration: 0.8, ease: "sine.inOut" });
figure.rotateTo(0, { at: SETTLE_AT + 0.3, duration: 1.3, ease: "sine.out" });

// The line goes visible just as the rod stops moving (within ~2px of the tip it was
// authored against) rather than during the whip, which would leave a visible gap.
line.initial({ opacity: 0 });
line.fadeTo(1, { at: 8.4, duration: 0.2 });
line.drawOn({ at: 8.4, duration: 1.0 });

boat.initial({ x: BOAT_X, y: BOAT_Y });
boat.pivotAt(BOAT_X, BOAT_Y + WATERLINE);

// Drift: 18px over the whole shot, ~1px/sec. Deliberately below the threshold where you'd
// call it movement.
boat.moveBy(-18, 0, { at: 0, duration: TOTAL, ease: "none" });
// Bob on y and roll about the waterline — separate properties from the drift's x, so the
// tweens compose instead of overwriting each other.
for (let i = 0; i < 4; i++) {
  boat.moveBy(0, i % 2 === 0 ? -2 : 2, { at: i * 2.2, duration: 2.2, ease: "sine.inOut" });
}
boat.rotateTo(-0.8, { at: 0, duration: 3.4, ease: "sine.inOut" });
boat.rotateTo(0.7, { at: 3.4, duration: 3.6, ease: "sine.inOut" });
boat.rotateTo(-0.6, { at: 7.0, duration: 3.8, ease: "sine.inOut" });
boat.rotateTo(0.4, { at: 10.8, duration: 4.0, ease: "sine.inOut" });

// Where the line lands — smaller and tighter, two rings a beat apart, and on their own
// group in front of the boat since nothing occludes them out there.
const landRings = sketch.group();
scene.add(landRings);
const LAND_X = BOAT_X + CAST_LAND[0];
const LAND_Y = BOAT_Y + CAST_LAND[1];
ripple(landRings, LAND_X, LAND_Y, 15, 3, 9.3, 2.6, 0.5, 4.4);
ripple(landRings, LAND_X, LAND_Y, 11, 2.4, 10.0, 2.9, 0.36, 4.4);

// --- Two birds crossing, high and small -------------------------------------------------
// Each is one stroke (a shallow gull mark), entering from off-frame left and leaving past
// the right edge. The flap is a slow squashTo on scaleY only — at this size that's exactly
// what a distant wingbeat looks like, and it composes with moveAlong's own x/y tween.
function bird(cx: number, cy: number, s: number, path: [number, number][], at: number, dur: number, flaps: number[]) {
  const b = sketch.stroke(
    [[cx - 7 * s, cy + 2 * s], [cx - 3 * s, cy - 3 * s], [cx, cy], [cx + 3 * s, cy - 3 * s], [cx + 7 * s, cy + 2 * s]],
    // 1.6px, not "confident"'s 3px: at 20px across, a 3px stroke made these read as bats.
    { color: "#414b62", weight: 1.6, looseness: 0.12, energy: "calm", smooth: true }
  );
  scene.add(b);
  b.appear({ at, duration: 1.0 });
  b.moveAlong(path, { at, duration: dur, ease: "none" });
  for (const f of flaps) {
    b.squashTo(1, 0.55, { at: f, duration: 0.35, ease: "sine.inOut" });
    b.squashTo(1, 1, { at: f + 0.35, duration: 0.35, ease: "sine.inOut" });
  }
}

bird(55, 132, 1.5, [[55, 132], [200, 114], [360, 122], [520, 106], [690, 114], [790, 106]], 4.0, 9.4,
  [4.6, 5.9, 7.5, 9.4, 11.6]);
bird(22, 156, 1.25, [[22, 156], [170, 140], [330, 146], [500, 130], [660, 138], [790, 130]], 4.9, 9.4,
  [5.4, 6.6, 8.2, 10.1, 12.4]);

// --- Camera: a drift, not a move --------------------------------------------------------
// panTo takes an ABSOLUTE scene-space point to center on. The default center of this world
// is (400, 260); both targets sit within 16px of it, so the framing travels a hair over the
// whole shot. Bounds, explicitly: x from 396-320=76 to 412+320=732 (world 0..800), y from
// 254-200=54 to 262+200=462 (world 0..520) — the viewport never reaches a world edge, which
// is the condition quiet-ride.ts's stray-rectangle bug needs.
const cam = scene.camera();
cam.panTo(CAM_X0, CAM_Y0, { at: 0, duration: 0 });
cam.panTo(CAM_X1, CAM_Y1, { at: 0, duration: TOTAL, ease: "sine.inOut" });

// --- Sound: one open drone, a few water drips, one closing swell -------------------------
// Sparser than quiet-crossing.ts's waltz on purpose — there's no gait here to keep time
// with, so anything rhythmic would invent an event the picture doesn't have.
scene.add(sketch.sound("A2", { at: 0, duration: TOTAL, instrument: "pad", velocity: 0.14 }));
scene.add(sketch.sound("E3", { at: 1.4, duration: TOTAL - 3.0, instrument: "pad", velocity: 0.1 }));
scene.add(sketch.sound("A4", { at: 3.1, duration: 0.5, instrument: "pluck", velocity: 0.16, pan: -0.2 }));
scene.add(sketch.sound("E5", { at: 6.9, duration: 0.5, instrument: "pluck", velocity: 0.12, pan: -0.25 }));
scene.add(sketch.sound("D5", { at: 9.4, duration: 0.5, instrument: "pluck", velocity: 0.2, pan: 0.3 }));
scene.add(sketch.sound("A4", { at: 11.3, duration: 0.5, instrument: "pluck", velocity: 0.11, pan: -0.15 }));
scene.add(sketch.sound("A3", { at: 10.8, duration: 3.4, instrument: "strings", velocity: 0.16 }));

export default scene;
