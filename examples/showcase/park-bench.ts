import { sketch } from "../../src/index.js";

// A third piece in quiet-crossing.ts / quiet-ride.ts's restrained register, testing
// whether the library can hold a QUIET MOMENT with no locomotion at all — no walk cycle,
// no camera travel, nothing arriving or leaving. Two old friends on a park bench feeding
// pigeons on an overcast autumn afternoon; the entire animation budget goes to four small
// gestures (one hand tossing crumbs, one head tilting down to watch, pigeons pecking,
// leaves coming off the tree) spread over fifteen patient seconds. Everything else is
// stillness plus the line boil every already-drawn stroke gets for free, which is what
// keeps a static frame from reading as a static frame.
//
// Register notes, same throughline as the other two showcase pieces: warm muted autumn
// palette (ochre / rust / soft brown, nothing saturated), naturalistic seated proportions
// worked out from real body ratios rather than cartoon ones (~1.25cm per px: 34px shin =
// 34px seat height, 45px hip-to-shoulder, a 20px head, ~104px total seated), no faces
// beyond a 3px nose bump in profile, no squash-stretch anywhere, and a good half of the
// frame left as empty sky and empty path. Figures are near-black warm silhouettes with a
// vertical gradient fill (lighter at the shoulders, darker at the hem) instead of a flat
// black fill — enough light direction to read as volume without leaving the silhouette
// register.

const WORLD_W = 680;
const WORLD_H = 440;
const VIEW_W = 640;
const VIEW_H = 400;

// The world is deliberately 40x40 bigger than the output frame purely so the closing
// camera drift is legal: the default camera centers the world (340, 220), so the visible
// frame is x 20..660 / y 20..420, and a few px of drift still leaves the viewport fully
// inside the world (quiet-ride.ts's stray-pale-rectangle bug is what happens otherwise).
// Everything meaningful is authored inside x 30..650 / y 25..415; the full-width ground
// bands span 0..WORLD_W so no drift can expose bare background at an edge.
const HORIZON = 300; // top of the grass
const PATH_Y = 372; // top of the gravel path
const GROUND_Y = 366; // where bench legs and shoes meet the ground
const SEAT_Y = 332; // top of the bench seat = underside of both figures' thighs

const scene = sketch.scene({
  width: WORLD_W,
  height: WORLD_H,
  viewport: { width: VIEW_W, height: VIEW_H },
  background: {
    stops: [
      { offset: 0, color: "#96a09f" },
      { offset: 0.32, color: "#bdb59a" },
      { offset: 0.56, color: "#d9c191" },
      { offset: 0.68, color: "#eddcb4" },
      { offset: 1, color: "#eddcb4" },
    ],
    direction: "vertical",
  },
  seed: "park-bench",
  look: "ink",
  texture: "grain",
});

const OUTLINE = "#1a140e";

function gradientFill(top: string, bottom: string) {
  return {
    color: { stops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], direction: "vertical" as const },
    style: "solid" as const,
  };
}

/** Evenly-angled points around an ellipse, with an optional per-index radius multiplier.
 * EVEN angular spacing is the whole point: a small shape (a 22px head) hand-plotted with
 * bunched-up points renders as a spiky crown under look:"ink"'s jitter — blob() gets away
 * with small round shapes precisely because its vertices are evenly spread, so anything
 * head-sized that needs to be asymmetric (a bun, a cap brim, a beak) is built this way
 * rather than by hand-picking outline coordinates. */
function ovalPoints(cx: number, cy: number, rx: number, ry: number, n: number, mods: number[] = []): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = 1 + (mods[i] ?? 0);
    pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
  }
  return pts;
}

// ---------------------------------------------------------------- background

// Hazy trees behind the hedge — a soft rounded canopy over a short trunk, desaturated
// toward the sky's own tone so they read as distance rather than as more subject matter.
// Bare branch strokes were the first attempt and read as antennae at this size; a soft
// filled canopy is what actually says "tree, far away".
const HAZE = "#96a087";
function hazyTree(x: number, cy: number, rx: number, ry: number) {
  const g = sketch.group();
  scene.add(g);
  g.add(
    sketch.stroke([[x, HORIZON], [x - 1, cy]], { color: "#8d9680", weight: "confident", looseness: 0.2 })
  );
  g.add(
    sketch.loop(ovalPoints(x, cy, rx, ry, 14, [0, 0.06, -0.05, 0.05, 0, -0.06, 0.05, 0, -0.04, 0.06, 0, -0.05, 0.03, 0]), {
      color: HAZE,
      weight: "light",
      looseness: 0.06,
      fill: { color: HAZE, style: "solid" },
    })
  );
  return g;
}
hazyTree(96, 266, 26, 13).appear({ at: 0.3, duration: 0.5 });
hazyTree(250, 272, 19, 10).appear({ at: 0.45, duration: 0.5 });
hazyTree(444, 268, 22, 11).appear({ at: 0.6, duration: 0.5 });

// A low hedge along the horizon: one wavy-topped band, no leaf detail. The cheapest
// possible "this park continues past the frame" cue.
scene.add(
  sketch.loop(
    [
      [0, 286], [70, 278], [150, 284], [230, 276], [320, 283], [410, 275],
      [500, 282], [580, 276], [680, 284], [680, HORIZON + 6], [0, HORIZON + 6],
    ],
    { color: "#4f5340", weight: "light", looseness: 0.2, fill: gradientFill("#8b8f76", "#5f6350") }
  )
).appear({ at: 0.2, duration: 0.6 });

// Lawn — muted olive-ochre, dry late-autumn grass, not a fresh green.
scene.add(
  sketch.loop(
    [[0, HORIZON], [WORLD_W, HORIZON], [WORLD_W, PATH_Y + 2], [0, PATH_Y + 2]],
    { color: "#3f3a24", weight: "confident", looseness: 0.08, fill: gradientFill("#8a8054", "#5e5636"), smooth: false }
  )
).drawOn({ at: 0, duration: 1.3 });

// The gravel path across the foreground — pale enough to hold the pigeons and the landed
// leaves in silhouette against it.
scene.add(
  sketch.loop(
    [[0, PATH_Y], [WORLD_W, PATH_Y], [WORLD_W, WORLD_H], [0, WORLD_H]],
    { color: "#00000000", weight: "light", fill: gradientFill("#b3a68a", "#8d8168"), smooth: false }
  )
).appear({ at: 0, duration: 0.01 });

// Sparse dry tufts where the lawn meets the path — the only ground detail allowed.
for (const [tx, lean] of [[62, -4], [148, 3], [286, -3], [420, 4], [512, -4], [606, 3]] as [number, number][]) {
  scene.add(
    sketch.stroke([[tx, PATH_Y + 2], [tx + lean, 360]], { color: "#4b4530", weight: "light", looseness: 0.3 })
  ).drawOn({ at: 1.0 + tx / 900, duration: 0.4 });
}

// ---------------------------------------------------------------- the tree

// The tree is at the right edge and runs straight out of frame — we only see trunk and the
// lower branches, which is what puts the falling leaves' origin inside the frame without
// spending half the composition on a canopy. Branch STROKES plus small leaf loops, never a
// filled canopy blob (blob()'s wobble floor turns anything that big lumpy).
const BARK = { color: "#1f170f", weight: "confident" as const, looseness: 0.18 };
// The branch group goes in FIRST and the trunk after it, so the trunk paints over the point
// each branch grows out of — otherwise every branch's blunt root end is visible on top of
// the bark as a little stub.
const tree = sketch.group();
scene.add(tree);
// Trunk: flared at the base, unevenly tapered, and deliberately running off the right edge
// of the frame (the world is 20px wider than the viewport there, so it's clipped rather
// than ending in mid-air). An earlier pass had it fully inside the frame with a uniform
// width and a rounded foot, which read unmistakably as a lamppost, not a tree.
//
// It uses appear(), not drawOn(), and that's load-bearing: drawOn reveals a closed shape's
// INTERIOR through a boustrophedon scribble mask whose row count is clamped at 16 (see
// renderer.ts's revealByMask), so a shape taller than roughly 16 x (stroke*1.5*1.7) —
// ~160px at "confident" weight — has rows spaced further apart than the mask stroke is
// wide, and the gaps never close. On a 369px trunk that renders as a permanent ladder of
// pale horizontal rungs down the middle, which is exactly what the first pass of this
// scene did. Nothing else here is tall enough to hit it (the lawn band is 72px, the
// figures 85px); a fading-in trunk under a set of branches that DO draw on reads fine.
scene.add(
  sketch.loop(
    [
      [622, 369], [676, 369], [668, 300], [663, 232], [660, 150], [658, 62], [657, 0],
      [640, 0], [639, 66], [636, 154], [632, 236], [629, 302],
    ],
    {
      ...BARK,
      fill: {
        color: { stops: [{ offset: 0, color: "#43331f" }, { offset: 1, color: "#1d150e" }], direction: "horizontal" },
        style: "solid",
      },
    }
  )
).appear({ at: 0.6, duration: 0.9 });
const branches: [number, number][][] = [
  [[642, 196], [596, 180], [552, 190]],
  [[640, 150], [560, 118], [478, 128]],
  [[506, 124], [492, 98], [496, 82]],
  [[478, 128], [446, 112], [424, 120]],
  [[641, 104], [530, 68], [446, 60]],
  [[482, 64], [464, 44], [468, 30]],
  [[446, 60], [418, 52], [402, 58]],
];
for (const b of branches) tree.add(sketch.stroke(b, BARK));
tree.stagger(0.16, { at: 0.8, duration: 0.7, effect: "drawOn" });

// ---------------------------------------------------------------- leaves

const LEAF_COLORS = ["#a85c2c", "#c08b39", "#8f5a25", "#b06f2e", "#946a2b"];

/** A small almond leaf, authored around (cx, cy) and rotated by `tilt` radians. Two of the
 * six points sit off the long axis so it reads as a leaf and not a lens. */
function leafPoints(cx: number, cy: number, size: number, tilt: number): [number, number][] {
  const raw: [number, number][] = [[0, -1], [0.5, -0.4], [0.66, 0.3], [0, 1.05], [-0.66, 0.3], [-0.5, -0.4]];
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return raw.map(([x, y]) => {
    const px = x * size;
    const py = y * size;
    return [cx + px * c - py * s, cy + px * s + py * c] as [number, number];
  });
}

function leaf(cx: number, cy: number, size: number, tilt: number, color: string) {
  return sketch.loop(leafPoints(cx, cy, size, tilt), {
    color,
    weight: "light",
    looseness: 0.18,
    fill: { color, style: "solid" },
  });
}

// What's still on the tree: a sparse scatter along the branches, the frame's only real
// color accent. Deliberately not a full canopy — a nearly bare autumn tree is the mood.
const canopy = sketch.group();
scene.add(canopy);
const canopyLeaves: [number, number, number, number][] = [
  [598, 180, 6, 0.4], [568, 183, 5, -0.5], [552, 190, 6, 0.8], [600, 132, 5, -0.3],
  [524, 118, 6, 0.2], [492, 98, 5, 1.0], [478, 128, 6, -0.6], [446, 112, 5, 0.5],
  [424, 120, 6, -0.2], [604, 90, 5, 0.9], [468, 32, 6, -0.9], [404, 58, 5, 0.3],
];
canopyLeaves.forEach(([x, y, s, t], i) => {
  canopy.add(leaf(x, y, s, t, LEAF_COLORS[i % LEAF_COLORS.length]));
});
canopy.stagger(0.09, { at: 2.0, duration: 0.35, effect: "appear" });

// Already fallen, resting where they landed — on the path and in the grass. Static.
const restingLeaves: [number, number, number, number][] = [
  [296, 398, 6, 1.4], [341, 389, 5, 0.2], [455, 410, 6, 1.1], [583, 402, 5, 0.6],
  [258, 357, 5, 0.9], [478, 362, 5, 1.5],
];
restingLeaves.forEach(([x, y, s, t], i) => {
  scene.add(leaf(x, y, s, t, LEAF_COLORS[(i + 2) % LEAF_COLORS.length])).appear({ at: 0.9 + i * 0.12, duration: 0.4 });
});

// ---------------------------------------------------------------- the bench

// Seen flat-on (seat and slats running left-right) with the figures in profile on it —
// the standard storybook flattening, and the only arrangement where two people fit on one
// bench AND a head tilt still reads at a 22px head.
//
// First, one soft cast shadow under the whole bench, thrown slightly right (the light is high and
// a little left, same direction every gradient fill in the scene is lit from). Translucent
// black over the grass rather than a darker opaque shape — it has to read as shade on the
// lawn, not as a painted board lying there.
scene.add(
  sketch.loop(
    [[144, 364], [418, 362], [440, 372], [156, 375]],
    { color: "#00000000", weight: "light", fill: { color: "#00000022", style: "solid" }, smooth: false }
  )
).appear({ at: 1.5, duration: 0.6 });

const bench = sketch.group();
scene.add(bench);
const plank = {
  color: OUTLINE,
  weight: "confident" as const,
  looseness: 0.07,
  fill: gradientFill("#57422c", "#2e2317"),
  smooth: false,
};
const benchParts: [number, number][][] = [
  [[140, 292], [149, 292], [149, 336], [140, 336]], // back post, left
  [[395, 292], [404, 292], [404, 336], [395, 336]], // back post, right
  [[140, 294], [404, 294], [404, 303], [140, 303]], // upper slat
  [[140, 309], [404, 309], [404, 318], [140, 318]], // lower slat
  [[132, SEAT_Y], [412, SEAT_Y], [412, 341], [132, 341]], // seat
  [[152, 341], [161, 341], [161, GROUND_Y], [152, GROUND_Y]], // front leg, left
  [[383, 341], [392, 341], [392, GROUND_Y], [383, GROUND_Y]], // front leg, right
];
for (const p of benchParts) bench.add(sketch.loop(p, plank));
bench.stagger(0.14, { at: 1.6, duration: 0.5, effect: "drawOn" });

// ---------------------------------------------------------------- the friends

/** One seated figure in profile facing right, hips at x = `hx`, built from real seated
 * proportions (see the header note). Returned pieces: the head (pivoted at the neck, so a
 * small rotateTo reads as a head tilting rather than a circle spinning in place) and the
 * near arm (pivoted at a shoulder point deep INSIDE the torso outline — quiet-crossing.ts
 * learned that a limb pivoted at the body's own edge visibly detaches the moment it
 * rotates, so this is the one place a separate limb is worth it, and the amplitude stays
 * small). Everything else is one continuous static outline. */
function buildSitter(hx: number, tone: { top: string; mid: string; dark: string; arm: string }, hair: "bun" | "cap") {
  const g = sketch.group();
  scene.add(g);
  const cloth = {
    color: OUTLINE,
    weight: "confident" as const,
    looseness: 0.09,
    fill: gradientFill(tone.top, tone.dark),
    smooth: true,
  };
  // Each piece gets a FLAT fill picked for where it sits in the body, not its own gradient:
  // a per-shape gradient is scaled to that shape's own bbox, so giving the arm the torso's
  // gradient made a 30px arm run the full light-to-shadow range and read as a pale sash
  // laid across the coat instead of an arm in front of it. Only the torso — the tallest
  // piece, where the light falloff is actually meant to be visible — keeps a gradient.
  const shade = { ...cloth, fill: { color: tone.dark, style: "solid" as const } };
  const legTone = { ...cloth, fill: { color: tone.mid, style: "solid" as const } };
  const armTone = { ...cloth, fill: { color: tone.arm, style: "solid" as const } };

  const at = (pts: [number, number][], dx = 0): [number, number][] =>
    pts.map(([x, y]) => [hx + x + dx, y] as [number, number]);

  // Thigh + shin + shoe as one wedge; the far leg is the same wedge shifted back and
  // filled flat with the coat's own shadow tone, which reads as depth without a new shape.
  const leg: [number, number][] = [
    [-2, 318], [18, 316], [30, 324], [36, SEAT_Y], [34, 348], [40, 365],
    [26, GROUND_Y], [25, 344], [16, SEAT_Y], [-4, SEAT_Y],
  ];
  g.add(sketch.loop(at(leg, -9), shade));

  // Torso: leaning back into the bench (shoulders sit further back than the hips), tapering
  // from a coat hem at the seat up to narrow shoulders, with a real neck gap above.
  g.add(
    sketch.loop(
      at([[-15, 286], [-18, 302], [-16, 322], [-13, 331], [4, SEAT_Y], [16, 329], [15, 312], [11, 296], [2, 285]]),
      cloth
    )
  );
  g.add(sketch.loop(at(leg), legTone));

  const arm = sketch.loop(
    at([[-9, 289], [0, 289], [12, 305], [26, 311], [29, 317], [22, 318], [9, 311], [-10, 296]]),
    armTone
  );
  arm.pivotAt(hx - 4, 293);
  g.add(arm);

  // Profile head, 22px tall, built off an evenly-spaced oval (see ovalPoints) with per-vertex
  // radius nudges: a small nose/brow at the front, a chin, and either a low bun at the back
  // or a flat cap's raised crown, so the two friends are distinguishable in silhouette.
  // Index 0 is the face side (+x, they both face right), running clockwise from there.
  const headMods =
    hair === "bun"
      ? [0.08, 0.02, -0.04, 0, 0.02, 0.16, 0.2, 0.14, 0.02, -0.04, -0.02, 0.04]
      : [0.1, 0.02, -0.06, -0.02, 0, 0.04, 0.06, 0.1, 0.14, 0.1, 0.12, 0.14];
  const head = sketch.loop(ovalPoints(hx - 5, 272, 9, 11, 12, headMods), { ...cloth, looseness: 0.05 });
  head.pivotAt(hx - 5, 283);
  g.add(head);

  return { group: g, head, arm };
}

// Left friend: cool slate-grey coat, hair gathered in a low bun. Right friend: warmer brown
// coat, flat cap. Sat 105px apart — close enough to read as company, far enough apart to
// read as two separate people rather than one wide silhouette.
const friendA = buildSitter(215, { top: "#3d3d37", mid: "#2a2a26", dark: "#181815", arm: "#343430" }, "bun");
const friendB = buildSitter(320, { top: "#463323", mid: "#31241a", dark: "#1c1510", arm: "#3d2c1f" }, "cap");
friendA.group.stagger(0.26, { at: 2.6, duration: 0.7, effect: "drawOn" });
friendB.group.stagger(0.26, { at: 3.9, duration: 0.7, effect: "drawOn" });

// ---------------------------------------------------------------- pigeons

/** A pigeon as one continuous filled outline (beak through tail) plus a wing line and two
 * leg ticks — a single loop can't show a seam when the peck rotates it, and the pivot sits
 * at the top of the legs so the whole bird tips forward from its feet. `facing` -1 points it
 * left (toward the bench), +1 right. A first pass at 15px tall read as a flat lozenge on the
 * path, closer to a fish than a bird; the fix was a taller standing posture with a real
 * constriction at the neck, plus a soft cast shadow so it sits ON the path instead of over
 * it. ~25x19px works out to a 31cm bird at this scene's ~1.25cm/px — actual pigeon size. */
function buildPigeon(px: number, py: number, s: number, facing: -1 | 1) {
  const g = sketch.group();
  scene.add(g);
  const P = (pts: [number, number][]): [number, number][] =>
    pts.map(([x, y]) => [px + x * s * facing, py + y * s] as [number, number]);

  g.add(
    sketch.loop(ovalPoints(px + 2 * s * facing, py + 1, 11 * s, 2.6 * s, 10), {
      color: "#00000000",
      weight: "light",
      fill: { color: "#0000001f", style: "solid" },
    })
  );
  const body = sketch.loop(
    P([
      [-12, -18], [-8, -16], [-6, -13], [-9, -9], [-6, -4], [0, -2],
      [7, -3], [13, -5], [8, -8], [3, -12], [-1, -16], [-6, -20], [-11, -19],
    ]),
    { color: "#202228", weight: "confident", looseness: 0.1, fill: gradientFill("#666a74", "#383b42") }
  );
  body.pivotAt(px, py - 3 * s);
  g.add(body);
  g.add(sketch.stroke(P([[-4, -13], [1, -10], [7, -7]]), { color: "#474b54", weight: "light", looseness: 0.15 }));
  g.add(sketch.stroke(P([[-2, -2], [-3, 0]]), { color: "#63503f", weight: "light", looseness: 0.2 }));
  g.add(sketch.stroke(P([[2, -2], [3, 0]]), { color: "#63503f", weight: "light", looseness: 0.2 }));
  return { group: g, body, peck: -20 * facing };
}

const p1 = buildPigeon(424, 397, 1, -1);
const p2 = buildPigeon(476, 405, 1, -1);
const p3 = buildPigeon(532, 390, 0.92, 1);
p1.group.stagger(0.1, { at: 4.9, duration: 0.35, effect: "drawOn" });
p2.group.stagger(0.1, { at: 5.35, duration: 0.35, effect: "drawOn" });
p3.group.stagger(0.1, { at: 5.8, duration: 0.35, effect: "drawOn" });

// ---------------------------------------------------------------- the gestures

// 1. The right friend lifts a hand and tosses crumbs, then lets the arm settle back down.
// The ANGLE is set by what's behind the hand, not by how big a gesture felt right: at -22
// degrees the hand ended at (355, 301), which is dead inside the bench's own backrest slats
// (y 294..318) — a near-black arm swinging across near-black planks, invisible at full frame
// even though the rotation was working perfectly. -50 degrees carries the hand to (354, 282),
// clear above the backrest's top edge, where it's silhouetted against the sky and hedge
// instead. Its reach (~45px from the shoulder) can't clear a 280px-wide bench sideways, so
// up is the only direction with a light background in it — and an underhand scatter does
// finish with the hand high anyway.
friendB.arm.rotateTo(-50, { at: 6.6, duration: 0.75, ease: "sine.inOut" });
friendB.arm.rotateTo(-14, { at: 7.45, duration: 0.8, ease: "sine.inOut" });
friendB.arm.rotateTo(0, { at: 11.6, duration: 1.1, ease: "sine.inOut" });

// 2. The crumbs themselves: released from where the rotated hand actually is at that instant
// (the shoulder pivot plus the hand's own vector rotated -50 degrees, worked out rather than
// guessed at), landing on the path around x 430..450 — right where the near pigeons stand.
// A first pass threw them slowly on a high arc in a mid-brown (#6b5b3c) — which, against
// the near-black bench they pass in front of, read as a cluster of pale beige lumps rather
// than crumbs, since 9 overlapping 5px dots merge into one shape at this scale. Small, dark,
// and fast enough to clear the bench in a third of a second fixes all three problems; the
// throw reaches the ground about 0.83s after it leaves the hand.
scene.add(
  sketch.particles(356, 281, { color: "#3a3025" }, {
    count: 8,
    angle: 4,
    spread: 30,
    speedMin: 90,
    speedMax: 130,
    gravity: 320,
    lifetime: 0.95,
    sizeMin: 1.4,
    sizeMax: 2.4,
    // Emission spread over a fifth of a second rather than one burst — eight dots released
    // at the same instant sit on top of each other and read as a lump in the hand, where a
    // staggered release trails out of it.
    duration: 0.22,
    at: 7.25,
  })
);

// 3. What actually landed: five specks on the path, appearing the moment the thrown
// particles' own arc reaches the ground (the emitter's dots fade out over their lifetime, so
// without these the crumbs would simply vanish and the pecking would have nothing to be
// about). Each sits within a beak's reach of the bird that eats it, and each fades out
// just after that bird's peck — one is deliberately left over at the end.
const crumbSpots: [number, number][] = [[413, 400], [429, 395], [447, 402], [462, 397], [436, 405]];
const crumbs = crumbSpots.map(([x, y], i) =>
  scene.add(
    sketch.loop(ovalPoints(x, y, 2.2, 1.7, 7), {
      color: "#3a3025",
      weight: "light",
      looseness: 0.1,
      fill: { color: "#3a3025", style: "solid" },
    })
  ).appear({ at: 8.05 + i * 0.04, duration: 0.25 })
);

// 4. The pigeons work the crumbs over: each peck tips the bird forward from its feet and
// back, offset from the others so they never move in unison. The third bird faces the other
// way and never pecks at all — it just shuffles, which is what a third pigeon usually does.
const pecks: [typeof p1, number, number][] = [[p1, 8.2, 0], [p2, 8.9, 3], [p1, 9.8, 1], [p2, 11.2, 2]];
for (const [bird, t, crumbIndex] of pecks) {
  bird.body.rotateTo(bird.peck, { at: t, duration: 0.3, ease: "sine.in" });
  bird.body.rotateTo(0, { at: t + 0.35, duration: 0.45, ease: "sine.out" });
  crumbs[crumbIndex].fadeTo(0, { at: t + 0.3, duration: 0.2 });
}
// The whole group moves, legs included, so it walks rather than leaning over.
p3.group.moveBy(-11, 2, { at: 10.4, duration: 0.9, ease: "sine.inOut" });
p3.group.moveBy(-5, -1, { at: 12.4, duration: 0.7, ease: "sine.inOut" });

// 5. The left friend tilts their head down to watch the birds, holds a long while, then
// lifts it again. +9 degrees about the neck — at this scale that's the whole "head turn."
friendA.head.rotateTo(9, { at: 10.2, duration: 1.1, ease: "sine.inOut" });
friendA.head.rotateTo(0, { at: 12.6, duration: 1.3, ease: "sine.inOut" });

// 6. Leaves coming off the tree, the one thing moving continuously. Each starts at a real
// branch tip, drifts down through an S-curve (moveAlong, so it's one curved path rather
// than stitched straight segments) while tumbling, and comes to rest on the ground instead
// of fading out — the frame quietly accumulates leaves over fifteen seconds.
const falls: { start: [number, number]; path: [number, number][]; at: number; dur: number; spin: number }[] = [
  { start: [498, 124], path: [[498, 124], [470, 186], [492, 252], [452, 320], [430, 392]], at: 2.4, dur: 6.0, spin: 260 },
  { start: [446, 60], path: [[446, 60], [416, 132], [440, 208], [402, 292], [378, 386]], at: 4.2, dur: 6.2, spin: -300 },
  { start: [568, 183], path: [[568, 183], [542, 244], [564, 304], [532, 360], [510, 400]], at: 6.0, dur: 5.4, spin: 210 },
  { start: [468, 32], path: [[468, 32], [498, 116], [466, 198], [490, 284], [470, 378]], at: 7.6, dur: 5.8, spin: -240 },
  { start: [604, 90], path: [[604, 90], [572, 162], [594, 238], [562, 318], [576, 394]], at: 9.2, dur: 5.2, spin: 280 },
];
falls.forEach((f, i) => {
  const l = scene.add(leaf(f.start[0], f.start[1], 6, 0.3 * i, LEAF_COLORS[i % LEAF_COLORS.length]));
  l.appear({ at: f.at - 0.3, duration: 0.3 });
  l.moveAlong(f.path, { at: f.at, duration: f.dur, ease: "sine.inOut" });
  l.rotateTo(f.spin, { at: f.at, duration: f.dur, ease: "sine.inOut" });
});

// ---------------------------------------------------------------- frame + score

const END = 14.6;

// The frame barely breathes: 6px right, 3px up, across the whole scene. panTo takes an
// ABSOLUTE point to center on — the world's own center is (340, 220), so this is 6px off
// that, not 6px from the origin. Leaves the 640x400 viewport comfortably inside the
// 680x440 world on every edge.
scene.camera().panTo(346, 217, { at: 0, duration: END, ease: "sine.inOut" });

// Same three-voice restraint as quiet-crossing.ts's waltz, one degree warmer and slower:
// a held low pad, a sparse piano line that never resolves in a hurry, a soft pluck on the
// toss and near-inaudible brushes under the pecks.
scene.add(sketch.sound("A2", { at: 0, duration: END, instrument: "pad", velocity: 0.15 }));
const motif: [string, number][] = [
  ["E3", 1.0], ["A3", 2.3], ["C4", 3.6], ["B3", 5.2], ["G3", 6.6],
  ["A3", 8.4], ["E4", 10.0], ["C4", 11.6], ["A3", 13.0],
];
for (const [pitch, at] of motif) {
  scene.add(sketch.sound(pitch, { at, duration: 1.2, instrument: "piano", velocity: 0.28 }));
}
scene.add(sketch.sound("A4", { at: 7.2, duration: 0.4, instrument: "pluck", velocity: 0.18, pan: 0.25 }));
for (const at of [8.25, 8.95, 9.85, 11.25]) {
  scene.add(sketch.sound(null, { at, duration: 0.18, instrument: "brush", velocity: 0.1, pan: 0.35 }));
}
scene.add(sketch.sound("E3", { at: 12.6, duration: 2.0, instrument: "strings", velocity: 0.2 }));

export default scene;
