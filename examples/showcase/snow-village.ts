import { sketch } from "../../src/index.js";

// A fourth scene in the restrained register quiet-crossing.ts / quiet-ride.ts established
// (muted gradients on every shape, small no-face silhouette figures, patient sine-eased
// motion, huge negative space, look:"ink" + texture:"grain" for medium character) — moved
// to a snow-covered village at dusk. The one new idea here is the warm accent against a
// cold field: every surface in the frame is blue-grey or lavender EXCEPT two lit windows
// and the light they throw onto the cleared path, so the eye lands on the houses and the
// working figure without a single saturated fill anywhere else.
//
// The figure's shoveling is a real labor cycle rather than an idle loop: sink-and-reach,
// bite, a slow heavy lift, a quick toss (the only fast beat in the scene), then a longer
// recovery — one 3.2s cycle repeated three times, all sine-eased, no squashTo anywhere.
// Snow spray is emitted from the shovel blade's own computed position at the bite and at
// the release, so the particles come off the tool rather than from a fixed point.

const W = 640;
const H = 400;

// Snow horizon: the far snow's top edge. Everything's apparent scale keys off distance
// from this line — the houses sit ~16px below it and the figure ~54px below it, which is
// why a ~80px house reads as much bigger than the ~87px figure standing in front of it.
const SNOW_LINE = 252;
const FIG_X = 210;
const FIG_GROUND = 320;

const SIL = "#14161d"; // figure silhouette — a cold near-black, not pure black
const FIR_FAR = "#8b8fa4"; // hazy distant treeline
const FIR_MID = "#394154";
const EAVE = "#1c2029";
const WARM = "#f0b25c";
const FLAKE = "#eaeff8";

const snowFill = (a: string, b: string, c?: string) => ({
  color: {
    stops: c
      ? [{ offset: 0, color: a }, { offset: 0.45, color: b }, { offset: 1, color: c }]
      : [{ offset: 0, color: a }, { offset: 1, color: b }],
    direction: "vertical" as const,
  },
  style: "solid" as const,
});

const scene = sketch.scene({
  width: W,
  height: H,
  background: {
    // Overcast winter dusk: blue-violet overhead falling to a pale dusty lavender at the
    // horizon. No stars and no moon on purpose — it's snowing, so the sky is closed over.
    stops: [
      { offset: 0, color: "#3e4067" },
      { offset: 0.34, color: "#5a5779" },
      { offset: 0.56, color: "#847b93" },
      { offset: 0.66, color: "#b7a3a6" },
      { offset: 1, color: "#c9b3a9" },
    ],
    direction: "vertical",
  },
  seed: "snow-village",
  look: "ink",
  texture: "grain",
});

// --- Snow ------------------------------------------------------------------------------
// The far field: a wide, almost-flat sweep with a slightly wavy horizon so it doesn't read
// as a ruled line. Paler at the back (catching what's left of the sky) and cooler toward
// the viewer, the same "one gradient per landform" instinct quiet-crossing.ts uses.
scene.add(
  sketch.loop(
    [
      [0, SNOW_LINE + 4],
      [140, SNOW_LINE - 1],
      [300, SNOW_LINE + 2],
      [460, SNOW_LINE - 3],
      [620, SNOW_LINE + 1],
      [640, SNOW_LINE - 1],
      [640, H],
      [0, H],
    ],
    { color: "#a7b0c3", weight: "light", looseness: 0.08, fill: snowFill("#cfd5e4", "#b5bdd1", "#98a1b8") }
  )
  // Fades in rather than drawing on: this shape covers everything from the horizon to the
  // frame's bottom edge, so a 1.3s pen-trace left the sky gradient's own lower (warm) stops
  // exposed as a bare tan block across the bottom third for the whole opening.
).appear({ at: 0, duration: 0.5 });

// A nearer drift, one shade cooler and darker, its own soft crest — depth in the snow
// itself instead of one flat field from the horizon to the frame's bottom edge.
scene.add(
  sketch.loop(
    [
      [0, 304],
      [110, 298],
      [240, 303],
      [380, 296],
      [510, 302],
      [640, 297],
      [640, H],
      [0, H],
    ],
    { color: "#9ea7bc", weight: "light", looseness: 0.1, fill: snowFill("#b9c1d4", "#8a92ab") }
  )
).drawOn({ at: 0.5, duration: 1.1 });

// --- Distant treeline: a sparse dusting of tiny hazy firs along the horizon. Lighter and
// lower-contrast than anything nearer (atmospheric perspective), and drawn before the
// houses so the ones behind a wall are simply hidden by it. -----------------------------
function fir(x: number, baseY: number, h: number, w: number, color: string, weight: "light" | "confident") {
  const pts: [number, number][] = [
    [x, baseY - h],
    [x + w * 0.34, baseY - h * 0.56],
    [x + w * 0.2, baseY - h * 0.59],
    [x + w * 0.62, baseY - h * 0.25],
    [x + w * 0.4, baseY - h * 0.27],
    [x + w, baseY],
    [x - w, baseY],
    [x - w * 0.4, baseY - h * 0.27],
    [x - w * 0.62, baseY - h * 0.25],
    [x - w * 0.2, baseY - h * 0.59],
    [x - w * 0.34, baseY - h * 0.56],
  ];
  return scene.add(sketch.loop(pts, { color, weight, looseness: 0.12, smooth: false, fill: { color, style: "solid" } }));
}

const farFirs: [number, number, number][] = [
  [30, 20, 7],
  [74, 15, 5],
  [150, 23, 8],
  [250, 17, 6],
  [300, 21, 7],
  [440, 19, 6],
  [520, 24, 8],
  [600, 16, 5],
];
for (const [x, h, w] of farFirs) fir(x, SNOW_LINE + 3, h, w, FIR_FAR, "light").appear({ at: 0.3, duration: 0.3 });

// Three nearer firs at full contrast — one anchoring the empty left third, one just behind
// the snowbank, one past the houses. Deliberately placed clear of the figure's own reach
// (its shovel blade never passes x ≈ 280) so nothing overlaps the working silhouette.
fir(92, 264, 62, 19, FIR_MID, "confident").drawOn({ at: 0.7, duration: 0.9 });
fir(330, 262, 44, 14, FIR_MID, "confident").drawOn({ at: 1.0, duration: 0.7 });
fir(612, 268, 54, 17, FIR_MID, "confident").drawOn({ at: 1.2, duration: 0.8 });

// --- The cleared path: it runs from the shoveler's own boots up to the lit house's door,
// widening toward the viewer, and STOPS at the figure with a ragged cut edge — the work
// isn't finished, which is why the figure is still standing there. Exposed wet stone, the
// only non-snow, non-sky surface in the frame, and deliberately cool and dark rather than
// warm brown so nothing competes with the two lit windows for the eye.
//
// Its extent is what fixed the scene's worst problem: an earlier pass ran the path out
// through the bottom-left corner with the figure standing mid-way along it, which put the
// figure's own working side (and therefore the shovel blade at the bite, a near-black
// silhouette) on top of the dark path, where it disappeared completely for most of every
// cycle. Ending the path AT the figure puts the whole dig-and-toss arc over pale untouched
// snow instead, and gives the composition a leading line that ends on the lit door.
// Drawn before the houses so the wall overlaps its far end at the threshold. ------------
scene.add(
  sketch.loop(
    [
      [200, 299],
      [340, 285],
      [484, 270],
      [484, 282],
      [330, 314],
      [196, 344],
      [202, 326],
      [194, 312],
    ],
    {
      color: "#494b54",
      weight: "light",
      looseness: 0.12,
      smooth: false,
      fill: snowFill("#5c5e69", "#43454e"),
    }
  )
).drawOn({ at: 1.5, duration: 1.0 });

// The lip of snow left standing along each edge of the cut. Without these the path read as
// a grey slab laid on top of the snow rather than a channel cleared down through it.
scene.add(
  sketch.stroke([[200, 297], [340, 283], [484, 269]], { color: "#d6dce9", weight: "light", looseness: 0.16 })
).drawOn({ at: 2.0, duration: 0.7 });
scene.add(
  sketch.stroke([[198, 346], [330, 316], [482, 284]], { color: "#c3cbdc", weight: "light", looseness: 0.18 })
).drawOn({ at: 2.15, duration: 0.7 });

// --- Houses: dark cool walls, snow-covered gable roofs (the roof IS the snow, with a thin
// dark eave strip under it, rather than a dark roof with a snow cap drawn on top — one less
// shape and it reads immediately). Two lit windows are the frame's only warm color. ------
type House = { cx: number; base: number; halfW: number; wallH: number; roofH: number; far: boolean };

function house(h: House, at: number) {
  const wallTop = h.base - h.wallH;
  const apex = wallTop - h.roofH;
  const wallFill = h.far ? snowFill("#464c61", "#333949") : snowFill("#3c4256", "#282d3c");
  scene.add(
    sketch.loop(
      [
        [h.cx - h.halfW, h.base],
        [h.cx + h.halfW, h.base],
        [h.cx + h.halfW, wallTop],
        [h.cx - h.halfW, wallTop],
      ],
      { color: h.far ? "#272c39" : "#1f2330", weight: "confident", looseness: 0.08, smooth: false, fill: wallFill }
    )
  ).drawOn({ at, duration: 0.55 });

  scene.add(
    sketch.loop(
      [
        [h.cx - h.halfW - 8, wallTop],
        [h.cx + h.halfW + 8, wallTop],
        [h.cx, apex],
      ],
      {
        color: "#8e96a8",
        weight: "confident",
        looseness: 0.09,
        smooth: false,
        fill: snowFill("#e8ecf4", "#c0c8d9"),
      }
    )
  ).drawOn({ at: at + 0.35, duration: 0.6 });

  scene.add(
    sketch.loop(
      [
        [h.cx - h.halfW - 8, wallTop],
        [h.cx + h.halfW + 8, wallTop],
        [h.cx + h.halfW + 8, wallTop + 4],
        [h.cx - h.halfW - 8, wallTop + 4],
      ],
      { color: EAVE, weight: "light", looseness: 0.06, smooth: false, fill: { color: EAVE, style: "solid" } }
    )
  ).appear({ at: at + 0.85, duration: 0.25 });

  return { wallTop, apex };
}

/** A chimney standing on a roof slope, with its own little snow cap. Returns the smoke
 * origin (just above the flue) so the emitter doesn't have to re-derive it. */
function chimney(h: House, x: number, height: number, at: number): [number, number] {
  const wallTop = h.base - h.wallH;
  const apex = wallTop - h.roofH;
  const slopeY = apex + ((x - h.cx) / (h.halfW + 8)) * (wallTop - apex);
  const top = slopeY - height;
  scene.add(
    sketch.loop(
      [[x - 5, slopeY + 2], [x + 5, slopeY + 2], [x + 5, top], [x - 5, top]],
      { color: "#1c2029", weight: "light", looseness: 0.07, smooth: false, fill: snowFill("#343a4b", "#232836") }
    )
  ).drawOn({ at, duration: 0.35 });
  scene.add(
    sketch.loop(
      [[x - 6, top], [x + 6, top], [x + 6, top - 3], [x - 6, top - 3]],
      { color: "#aeb6c8", weight: "light", looseness: 0.1, smooth: false, fill: { color: "#e2e7f0", style: "solid" } }
    )
  ).appear({ at: at + 0.3, duration: 0.25 });
  return [x, top - 6];
}

/** A lit window: two nested low-alpha warm discs behind a small bright pane. The glow sits
 * on top of the wall (light bleeding onto the boards around the frame), so it has to be
 * added after the wall and before the pane itself. */
function litWindow(cx: number, cy: number, w: number, h: number, at: number) {
  for (const [r, color] of [[32, "#f2b45c1c"], [19, "#f4bd6b30"]] as [number, string][]) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92]);
    }
    scene.add(sketch.loop(pts, { color: "#00000000", weight: "light", looseness: 0, fill: { color, style: "solid" } }))
      .appear({ at, duration: 0.9, ease: "sine.inOut" });
  }
  scene.add(
    sketch.loop(
      [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]],
      { color: "#b8813a", weight: "light", looseness: 0.08, smooth: false, fill: snowFill("#f7d69a", WARM) }
    )
  ).appear({ at, duration: 0.7, ease: "sine.inOut" });
}

const houseC: House = { cx: 556, base: 270, halfW: 23, wallH: 30, roofH: 20, far: true };
const houseB: House = { cx: 376, base: 268, halfW: 27, wallH: 34, roofH: 22, far: true };
const houseA: House = { cx: 468, base: 274, halfW: 42, wallH: 48, roofH: 32, far: false };

house(houseC, 0.6);
house(houseB, 1.0);
house(houseA, 1.4);

// One dark pane on the unlit house — a shape, not a light. The village isn't all awake.
scene.add(
  sketch.loop(
    [[549, 250], [559, 250], [559, 259], [549, 259]],
    { color: "#20242f", weight: "light", looseness: 0.08, smooth: false, fill: { color: "#2b3040", style: "solid" } }
  )
).appear({ at: 1.5, duration: 0.3 });

// The door of the lit house, sitting where the cleared path arrives.
scene.add(
  sketch.loop(
    [[476, 274], [495, 274], [495, 247], [476, 247]],
    { color: "#171b25", weight: "light", looseness: 0.07, smooth: false, fill: snowFill("#31374a", "#232836") }
  )
).drawOn({ at: 2.0, duration: 0.4 });

const smokeA = chimney(houseA, 496, 21, 2.0);
const smokeB = chimney(houseB, 392, 15, 1.6);
chimney(houseC, 568, 12, 1.3); // cold flue — no smoke from this one

// The lights come up a beat after the houses finish drawing, which is the moment the whole
// frame's temperature contrast actually lands.
litWindow(446, 246, 17, 15, 1.9);
litWindow(368, 250, 11, 10, 2.2);

// Warm spill on the cleared path below the lit window — soft-edged, very low alpha. This is
// the one place the scene's light source touches the ground, and it's what keeps the warm
// accent from reading as a sticker pasted onto a cold picture.
scene.add(
  sketch.loop(
    [[434, 272], [458, 272], [478, 300], [414, 298]],
    { color: "#00000000", weight: "light", looseness: 0.2, fill: { color: "#f0b25c26", style: "solid" } }
  )
).appear({ at: 2.1, duration: 1.0, ease: "sine.inOut" });

// --- The pile of shoveled snow: sits where the tossed snow actually lands (the release
// point is around x:142, and the spray arcs left and down from there), not wherever a mound
// would have looked nice. Brighter than the settled field behind it because it's loose
// fresh snow, with its own shaded underside. ------------------------------------------
// Asymmetric on purpose — it rises gently from the left and breaks off steeply on the side
// the snow is arriving from, which is what a heap thrown by one person from one spot looks
// like. A symmetrical dome read as an igloo sitting on the field.
scene.add(
  sketch.loop(
    [
      [36, 319], [70, 313], [100, 306], [130, 297], [152, 305], [163, 315],
      [166, 320], [120, 321], [80, 322], [36, 321],
    ],
    { color: "#a4adc0", weight: "light", looseness: 0.2, fill: snowFill("#eef2f9", "#b7bfd1") }
  )
).drawOn({ at: 2.2, duration: 0.8 });

// One barely-there drift contour across the empty foreground — just enough for the lower
// third to read as a snow surface with form rather than a flat pale rectangle. Kept very
// close to the snow's own value; at any real contrast it read as a scratch on the frame.
scene.add(
  sketch.stroke([[0, 344], [130, 352], [300, 345], [470, 355], [640, 349]], {
    color: "#b4bccd",
    weight: "light",
    looseness: 0.15,
  })
).drawOn({ at: 1.1, duration: 1.2 });

// --- The shoveler ----------------------------------------------------------------------
// Authored in local coordinates with y:0 at the boots (the group's own translate lands that
// on FIG_GROUND). Nested groups rather than sibling limbs: the arm and shovel live INSIDE
// the torso group, so the torso's own rotation carries the shoulder and the arm can never
// detach from it — the failure quiet-crossing.ts hit when a separately rotated limb sat
// next to a body instead of inside it. The arm's pivot is its own first point, which sits
// ~11px inside the coat outline on both sides at that height.
//
// FACE flips the whole rig horizontally: every local x and every rotation angle is scaled
// by it (mirroring a shape about x negates its rotations too). Authored facing right and
// then flipped to -1, because facing right pointed the shovel at the cleared path, where a
// near-black blade on near-black stone was invisible — facing left works into the pale
// untouched snow instead, which is the whole reason the motion reads at all.
const FACE = -1;
const HIP: [number, number] = [0 * FACE, -31];
const SHOULDER: [number, number] = [5 * FACE, -56];
const flip = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [x * FACE, y]);

const figure = sketch.group();
scene.add(figure);

// Boots planted in a braced stance, one foot behind the hip, one ahead of it — static for
// the whole cycle (a person shoveling doesn't step; the weight shows in the torso and the
// vertical sink). Both leg tops are hidden under the coat hem.
for (const leg of [
  [[-5, -31], [3, -31], [-14, 0], [-4, 0]],
  [[5, -31], [14, -31], [20, 0], [9, 0]],
] as [number, number][][]) {
  figure.add(
    sketch.loop(flip(leg), { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" } })
  );
}

const torso = sketch.group();
figure.add(torso);
torso.pivotAt(HIP[0], HIP[1]);
// Head, neck and tapered winter coat as ONE closed outline rather than a blob head sitting
// above a coat loop. The two-shape version left a ~4px gap at the neck which the strokes
// bridged in the neutral pose and opened into a visible pale notch through the middle of the
// silhouette the moment the torso rotated — the same class of failure as a separately
// rotated limb detaching from a body, and the same fix: if there's no seam there's nothing
// to come apart. The head still reads because the neck pinches to 10px between a 25px
// shoulder line and an 18px skull, not because it's a separate circle.
torso.add(
  sketch.loop(
    flip([
      [11, -87], [17, -84], [20, -78], [17, -71], [15, -66],
      [19, -62], [17, -46], [15, -34], [12, -24],
      [-14, -26], [-11, -46], [-6, -62],
      [5, -66], [3, -72], [2, -79], [5, -85],
    ]),
    { color: SIL, weight: "confident", looseness: 0.1, fill: { color: SIL, style: "solid" } }
  )
);

const arm = sketch.group();
torso.add(arm);
arm.pivotAt(SHOULDER[0], SHOULDER[1]);
arm.add(sketch.stroke(flip([[5, -56], [14, -49], [22, -41]]), { color: SIL, weight: 4.5, looseness: 0.1 }));
arm.add(sketch.stroke(flip([[9, -53], [46, -13]]), { color: SIL, weight: 3, looseness: 0.06, smooth: false }));
arm.add(
  sketch.loop(flip([[42, -18], [58, -12], [55, 0], [38, -6]]), {
    color: SIL,
    weight: "confident",
    looseness: 0.08,
    smooth: false,
    fill: { color: SIL, style: "solid" },
  })
);

figure.initial({ x: FIG_X, y: FIG_GROUND });
figure.appear({ at: 2.5, duration: 0.45 });

/** Where the blade's centroid ends up in world space for a given torso/arm rotation — the
 * snow spray has to leave the tool, so the emitters need the real rotated position rather
 * than a hand-guessed point that drifts out of sync the moment a rotation changes. */
function bladeAt(torsoDeg: number, armDeg: number): [number, number] {
  const rot = (p: [number, number], o: [number, number], deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    const dx = p[0] - o[0];
    const dy = p[1] - o[1];
    return [o[0] + dx * Math.cos(a) - dy * Math.sin(a), o[1] + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  const centroid: [number, number] = [48.25 * FACE, -9];
  const afterArm = rot(centroid, SHOULDER, armDeg);
  const afterTorso = rot(afterArm, HIP, torsoDeg);
  return [FIG_X + afterTorso[0], FIG_GROUND + afterTorso[1]];
}

/** Rotation targets flip sign with the rig (see FACE). */
const turn = (deg: number) => deg * FACE;
/** Particle cone direction mirrored to match — the spray has to leave the blade on the
 * side the figure is actually working. */
const spray = (deg: number) => (FACE === 1 ? deg : 180 - deg);

// One dig-lift-toss cycle, three times over. Every phase is sine-eased and the fast beat
// (the toss, 0.4s) is the only quick thing in the scene — the lift before it takes a full
// second on purpose, which is what makes the load read as heavy. The vertical sink and
// rise cancel out within each cycle, so the figure never drifts off the path.
const CYCLE_START = 2.8;
const CYCLE = 3.2;
const CYCLES = 3;

for (let i = 0; i < CYCLES; i++) {
  const c = CYCLE_START + i * CYCLE;

  // sink and reach the blade forward into the snow
  torso.rotateTo(turn(10), { at: c, duration: 0.8, ease: "sine.inOut" });
  arm.rotateTo(turn(-4), { at: c, duration: 0.8, ease: "sine.inOut" });
  figure.moveBy(0, 3, { at: c + 0.2, duration: 0.6, ease: "sine.inOut" });

  // the bite — blade drawn back and down under the load
  torso.rotateTo(turn(12), { at: c + 0.8, duration: 0.4, ease: "sine.inOut" });
  arm.rotateTo(turn(16), { at: c + 0.8, duration: 0.4, ease: "sine.inOut" });
  const bite = bladeAt(turn(12), turn(16));
  scene.add(
    sketch.particles(bite[0], bite[1], { color: "#dee5f0", weight: 1 }, {
      count: 7,
      angle: spray(-66),
      spread: 80,
      speedMin: 12,
      speedMax: 34,
      gravity: 150,
      lifetime: 0.8,
      duration: 0.12,
      at: c + 1.0,
      sizeMin: 0.7,
      sizeMax: 1.6,
    })
  );

  // the lift — slowest phase, straightening past neutral
  torso.rotateTo(turn(-3), { at: c + 1.2, duration: 1.0, ease: "sine.inOut" });
  arm.rotateTo(turn(-20), { at: c + 1.2, duration: 1.0, ease: "sine.inOut" });
  figure.moveBy(0, -3, { at: c + 1.3, duration: 0.8, ease: "sine.inOut" });

  // the toss — one quick swing up and forward, snow leaving the blade
  torso.rotateTo(turn(-7), { at: c + 2.2, duration: 0.4, ease: "sine.out" });
  arm.rotateTo(turn(-46), { at: c + 2.2, duration: 0.4, ease: "sine.out" });
  const release = bladeAt(turn(-7), turn(-46));
  scene.add(
    sketch.particles(release[0], release[1], { color: "#e4eaf4", weight: 1 }, {
      count: 20,
      angle: spray(-28),
      spread: 52,
      speedMin: 45,
      speedMax: 95,
      gravity: 170,
      lifetime: 1.0,
      // A short emission window rather than one instant burst — everything leaving on the
      // same frame at the same size read as a single thrown snowball, not a spray.
      duration: 0.14,
      at: c + 2.4,
      sizeMin: 0.8,
      sizeMax: 1.9,
    })
  );

  // recover to the ready pose, with the remaining slack of the cycle as a breath
  torso.rotateTo(turn(2), { at: c + 2.6, duration: 0.6, ease: "sine.inOut" });
  arm.rotateTo(0, { at: c + 2.6, duration: 0.6, ease: "sine.inOut" });
}

const WORK_END = CYCLE_START + CYCLES * CYCLE; // 12.4
torso.rotateTo(0, { at: WORK_END, duration: 0.6, ease: "sine.out" });

// --- Chimney smoke: slow rising columns with a slight rightward lean, matching the snow's
// own drift direction so one light breeze reads consistently across the frame. Negative
// gravity is what makes a particle emitter rise instead of fall. ------------------------
for (const [sx, sy] of [smokeA, smokeB]) {
  scene.add(
    sketch.particles(sx, sy, { color: "#c2c6d2b8", weight: 1 }, {
      count: 20,
      angle: -75,
      spread: 26,
      speedMin: 12,
      speedMax: 22,
      gravity: -4,
      // Emission window and lifetime sized to land on the same end point the falling snow
      // reserves (see below), so one of them doesn't quietly stretch the scene past the
      // other and leave a stretch of the shot with smoke but no snow.
      lifetime: 2.5,
      duration: 11.4,
      at: 0.7,
      sizeMin: 1.3,
      sizeMax: 3.0,
    })
  );
}

// --- Falling snow ----------------------------------------------------------------------
// A grid of emitters rather than a few big ones: a single emitter's cone only fans ~40px
// wide over a flake's lifetime, so one emitter per screenful would fall as a narrow column.
// Short lifetimes with several rows stacked down the frame (each row's flakes fall ~68px,
// just past the 60px row spacing) keep the field continuous top to bottom AND keep the
// timeline's own end close to the last emission — particles reserve duration through
// (last spawn + lifetime), which means the field is unavoidably empty at exactly the
// timeline's end, and a long lifetime makes that dead tail long. At 2s it reads as the
// snow easing off as the work finishes; at 8s (one emitter row falling the whole frame
// height) it read as the snow simply switching off with seconds of the shot still to run.
const SNOW_EMIT = 12.6;
const FLAKE_LIFE = 2.0;
const rows = [-14, 46, 106, 166, 226, 286, 346];
for (let r = 0; r < rows.length; r++) {
  for (let c = 0; c < 8; c++) {
    const x = 30 + c * 80 + (r % 2 === 0 ? 0 : 40);
    scene.add(
      // weight matters more than size here: a particle is drawn as a rough.js circle with
      // the style's own stroke around it, so the default 3px "confident" stroke turns a
      // 2px flake into a 6px popcorn kernel regardless of sizeMin/sizeMax.
      sketch.particles(x, rows[r], { color: FLAKE, weight: 0.8 }, {
        count: 4,
        angle: 74,
        spread: 30,
        speedMin: 16,
        speedMax: 34,
        gravity: 9,
        lifetime: FLAKE_LIFE,
        duration: SNOW_EMIT,
        at: 0,
        sizeMin: 0.7,
        sizeMax: 1.7,
      })
    );
  }
}

// --- Sound: the same three-voice restraint quiet-crossing.ts and quiet-ride.ts hold to (a
// held pad, a sparse piano line, one closing strings note), plus two unpitched brush hits
// per cycle — the scrape of the bite and the softer release of the toss. That pair is the
// scene's only rhythm, and it's the shoveling's own rhythm rather than a beat under it.
scene.add(sketch.sound("C2", { at: 0, duration: 13.4, instrument: "pad", velocity: 0.16 }));
scene.add(sketch.sound("G2", { at: 0.6, duration: 12.6, instrument: "pad", velocity: 0.12 }));

const line: [string, number][] = [
  ["A3", 1.2], ["C4", 2.4], ["E4", 3.4],
  ["D4", 5.0], ["A3", 6.6], ["G3", 7.8],
  ["C4", 9.0], ["E4", 10.4], ["A3", 11.8],
];
for (const [pitch, at] of line) {
  scene.add(sketch.sound(pitch, { at, duration: 1.0, instrument: "piano", velocity: 0.28 }));
}

for (let i = 0; i < CYCLES; i++) {
  const c = CYCLE_START + i * CYCLE;
  scene.add(sketch.sound(null, { at: c + 0.85, duration: 0.35, instrument: "brush", velocity: 0.22, pan: -0.15 }));
  scene.add(sketch.sound(null, { at: c + 2.3, duration: 0.3, instrument: "brush", velocity: 0.15, pan: 0.1 }));
}

scene.add(sketch.sound("E3", { at: 12.6, duration: 1.8, instrument: "strings", velocity: 0.2 }));

export default scene;
