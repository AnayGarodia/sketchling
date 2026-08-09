import { sketch } from "../../src/index.js";

// Showcase: dramatic LIGHTING as the choreography, in the same restrained silhouette
// register as quiet-crossing.ts / quiet-ride.ts (muted gradients, a small no-face figure at
// naturalistic proportions, huge negative space, look:"ink" + texture:"grain" for medium
// character) — but pushed to a high-contrast night palette where almost nothing in frame is
// lit at all. A near-black sky and sea, a headland and a lighthouse as pure silhouette, one
// small figure standing watch, and the lamp's own beam as the only real light source.
//
// The beam is three nested gradient-filled wedges (bright core, mid, wide halo) sharing one
// group pivoted at the lamp itself, so a single rotateTo sweeps all three together, plus a
// short counter-beam stub pointing off-frame right so the lamp reads as a rotating optic
// rather than a flashlight. Brightness pulses on its own keyframes, peaking each time the
// beam swings down through the horizon — the periodic flash a lighthouse actually has.
// Nothing else in frame moves much: the waves are a handful of drifting crest strokes, the
// figure only shifts its weight, and the camera drifts about 16px across the whole shot.
//
// A gradient fill only renders as a real gradient when the effective fillStyle is "solid"
// (see AGENTS.md's Style section), which is what makes a translucent light wedge possible at
// all here — rgba() stops rather than hex so the alpha ramp is unambiguous.

const WORLD_W = 760;
const WORLD_H = 520;
const VIEW_W = 640;
const VIEW_H = 440;
const HORIZON_Y = 316;
const TOTAL = 18;

// blob()'s outline wobble has a floor even at looseness 0 (deliberate — a "perfect" blob
// should still read as hand-drawn), which turns anything meant to be a clean disc lumpy.
// A hand-plotted trig circle through loop() instead, same fix nightfall-hill.ts's moon and
// quiet-ride.ts's wheels use.
function circlePoints(cx: number, cy: number, r: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// The sky is mostly near-black, but a band of residual twilight sits just above the
// waterline — without it every silhouette in frame (tower, headland, figure) would be black
// on black and read as nothing at all. Light direction for the whole piece: sky glow from
// low on the horizon, plus the lamp itself.
const scene = sketch.scene({
  width: WORLD_W,
  height: WORLD_H,
  viewport: { width: VIEW_W, height: VIEW_H },
  background: {
    stops: [
      { offset: 0, color: "#050912" },
      { offset: 0.22, color: "#070e1c" },
      { offset: 0.42, color: "#0e2032" },
      { offset: 0.55, color: "#1c3d53" },
      { offset: 0.607, color: "#27546e" },
      { offset: 0.63, color: "#122636" },
      { offset: 1, color: "#070f18" },
    ],
    direction: "vertical",
  },
  seed: "lighthouse-watch",
  look: "ink",
  texture: "grain",
});

const SIL = "#04060a";
const silFill = (top: string, bottom: string) => ({
  color: { stops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], direction: "vertical" as const },
  style: "solid" as const,
});

// --- Stars: a sparse, dim, deterministic scatter (golden-angle, no Math.random, so every
// render gets the same sky), kept high enough in the sky not to clutter the beam's own
// sweep band. Each is a 1px stroke carrying a fat weight rather than a tiny filled circle:
// under look:"ink" a 2px-radius blob/loop is smaller than rough.js's own jitter amplitude,
// so it renders as a visible scribbled ring — "moths", not stars. A short thick line's
// wobble is entirely inside its own stroke width, so it stays a clean soft dot.
for (let i = 0; i < 11; i++) {
  const a = (i * 137.508) % 360;
  const r = Math.sqrt((i + 1) / 11);
  const sx = 84 + (r * Math.cos((a * Math.PI) / 180) * 0.5 + 0.5) * 588;
  const sy = 52 + (r * Math.sin((a * Math.PI) / 180) * 0.5 + 0.5) * 132;
  const alpha = 0.16 + ((i * 3) % 4) * 0.05;
  scene.add(
    sketch.stroke([[sx, sy], [sx + 1, sy]], {
      color: `rgba(206,222,240,${alpha.toFixed(2)})`,
      weight: 2.2 + ((i * 5) % 3) * 0.5,
      looseness: 0,
      energy: "calm",
    })
  ).appear({ at: 0, duration: 0.01 });
}

// --- The sea: one painted mass, darkest at the bottom, holding a little of the horizon's
// glow at the top where the water is seen at a grazing angle. Spans the full world so the
// camera drift never uncovers bare background. -------------------------------------------
scene.add(
  sketch.loop(
    [[0, HORIZON_Y], [WORLD_W, HORIZON_Y], [WORLD_W, WORLD_H], [0, WORLD_H]],
    { color: "#00000000", weight: "light", fill: silFill("#193c53", "#03070c") }
  )
).appear({ at: 0, duration: 0.01 });

// A thin lit line right on the waterline — without it the sea's own top stop and the sky's
// glow stop blend into each other and the seascape loses its horizon entirely. Stops short
// of the headland, which stands well in front of the true horizon.
scene.add(
  sketch.stroke([[58, HORIZON_Y], [180, HORIZON_Y - 0.5], [300, HORIZON_Y], [394, HORIZON_Y - 0.5]], {
    color: "rgba(176,208,230,0.26)",
    weight: "light",
    looseness: 0.05,
    energy: "calm",
  })
).drawOn({ at: 0.1, duration: 0.9 });

// --- Waves: crest strokes, not a simulation. Brighter and tighter near the horizon (more
// sky reflected at a grazing angle, less apparent size), broader and darker close in. Each
// drifts sideways and bobs on a slow period chosen to divide TOTAL exactly, so the last
// cycle lands on the scene's own end instead of extending the timeline past it.
//
// Two things learned from the first pass, both of which made the water read as a venetian
// blind rather than a sea: crests of similar length at a near-constant y interval line up
// into visible stripes (so lengths and y gaps are deliberately uneven here, clustered rather
// than ruled), and any crest reaching past x≈396 runs straight across the headland's face
// instead of the water — every one of these now stops short of it, which also keeps the open
// water confined to the left of frame where the composition wants it. -----------------------
const crests: [number, number, number, number, number][] = [
  [90, 198, 321, 0.26, 1.2],
  [238, 332, 323, 0.21, 1.2],
  [62, 134, 331, 0.19, 1.5],
  [178, 298, 334, 0.2, 1.5],
  [104, 216, 346, 0.18, 2.1],
  [262, 372, 352, 0.15, 2.2],
  [64, 156, 362, 0.16, 2.5],
  [204, 306, 373, 0.13, 2.7],
  [80, 198, 391, 0.13, 3.2],
  [248, 366, 403, 0.11, 3.4],
  [70, 200, 421, 0.1, 3.8],
  [230, 352, 439, 0.09, 4.2],
];

crests.forEach(([x0, x1, y, alpha, amp], i) => {
  const pts: [number, number][] = [];
  for (let k = 0; k <= 5; k++) {
    const f = k / 5;
    pts.push([x0 + (x1 - x0) * f, y + Math.sin(f * 6.1 + i * 1.7) * amp]);
  }
  const c = scene.add(
    sketch.stroke(pts, {
      color: `rgba(158,190,214,${alpha})`,
      weight: "light",
      looseness: 0.3,
      energy: "calm",
      smooth: true,
    })
  );
  c.appear({ at: 0.15 + (i % 4) * 0.12, duration: 0.7 });
  const per = [9, 6, 4.5][i % 3];
  const dx = (i % 2 === 0 ? 1 : -1) * (4 + (i % 3) * 2.5);
  for (let k = 0; k < TOTAL / per; k++) {
    c.moveBy(dx, 1.3, { at: k * per, duration: per / 2, ease: "sine.inOut" });
    c.moveBy(-dx, -1.3, { at: k * per + per / 2, duration: per / 2, ease: "sine.inOut" });
  }
});

// --- Two sea stacks out in the water, left of the headland — depth cues, and something for
// the beam to graze on its way down. Blocky and notched rather than smooth triangles: a
// clean tapering point reads as a shark fin, not weathered rock. ------------------------
const stacks: [number, number][][] = [
  [[300, 376], [303, 348], [309, 337], [316, 331], [320, 338], [327, 347], [332, 376]],
  [[222, 359], [226, 347], [231, 341], [237, 345], [240, 351], [244, 359]],
];
for (const stack of stacks) {
  scene.add(
    sketch.loop(stack, {
      color: SIL,
      weight: "confident",
      looseness: 0.25,
      smooth: false,
      fill: silFill("#0d1a25", "#020408"),
    })
  ).drawOn({ at: 1.15, duration: 0.45 });
  // Same seaward rim light the headland gets, at the scale of a rock in the water — kept
  // dimmer than the headland's, or a fully outlined 40px shape reads as a sticker pasted on
  // the sea rather than rock sitting in it.
  scene.add(
    sketch.stroke(stack.slice(0, 4), { color: "rgba(150,186,210,0.15)", weight: "light", looseness: 0.15, smooth: false })
  ).drawOn({ at: 1.5, duration: 0.35 });
}

// --- The headland: an angular rock mass filling the right third, its seaward face dropping
// into the water well below the horizon line (so it reads as much nearer than the horizon).
// Its gradient runs light-to-black across only the top few percent of a very tall bbox,
// which puts a thin lit rim along the rock's upper edge and drops everything below it into
// near-black — the volumetric cue a flat silhouette fill has none of. ---------------------
const cliffPts: [number, number][] = [
  [396, 388], [402, 356], [409, 332], [418, 318], [432, 308],
  [448, 303], [468, 300], [494, 297], [528, 296], [560, 295],
  [590, 298], [620, 294], [652, 300], [700, 296], [760, 302],
  [760, WORLD_H], [396, WORLD_H],
];
scene.add(
  sketch.loop(cliffPts, {
    color: SIL,
    weight: "confident",
    looseness: 0.22,
    smooth: false,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#1a2b3a" },
          { offset: 0.055, color: "#080f16" },
          { offset: 1, color: "#010203" },
        ],
        direction: "vertical",
      },
      style: "solid",
    },
  })
  // appear(), NOT drawOn(), and not a stylistic choice: drawOn reveals a closed shape's fill
  // through a serpentine mask whose row count is clamped at 16 (renderer.ts's applyDrawOn),
  // while the mask stroke covering each row stays at rowSpacing * 1.7 ≈ 10.2px for any
  // normal weight. Past roughly 163px of bbox HEIGHT the rows therefore stop overlapping and
  // the gaps between them are never revealed at all — a shape this tall keeps a permanent set
  // of evenly spaced horizontal stripes across its fill, at every timestamp including the
  // settled end state. Cost me a full render cycle chasing it as a stray hachure fill; it is
  // neither, and it does not show up as any lint finding. Every other closed shape in this
  // scene is comfortably under that height, so they all still drawOn normally. Large painted
  // landforms appearing rather than pen-tracing also matches what nightfall-hill.ts and
  // quiet-crossing.ts already do with their own ground masses, so nothing is lost.
).appear({ at: 0, duration: 0.9 });

// A faint cool rim along the seaward profile — the horizon glow catching the rock's edge,
// the same light source the sky's own glow band comes from. One thin stroke, not a fill.
scene.add(
  sketch.stroke(cliffPts.slice(0, 9), {
    color: "rgba(146,182,208,0.26)",
    weight: "light",
    looseness: 0.2,
    smooth: false,
  })
).drawOn({ at: 0.9, duration: 0.7 });

// Surf breaking at the base of the rock and around the stacks — a few short light strokes
// that wash in and out rather than a particle spray. All of them hug the WATER side of the
// headland's own waterline corner at (396, 388): anything further right than that sits inside
// the rock polygon, where a bright surf stroke reads as a stray scratch across the cliff face
// rather than foam (the first pass had one at x 404-446 doing exactly that).
const foamStrokes: [number, number][][] = [
  [[380, 386], [394, 383], [404, 387]],
  [[362, 392], [382, 389], [398, 393]],
  [[296, 374], [310, 371], [326, 375]],
  [[218, 358], [232, 356], [246, 359]],
  [[338, 396], [364, 393], [392, 397]],
];
foamStrokes.forEach((f, i) => {
  const s = scene.add(
    sketch.stroke(f, { color: "rgba(196,218,234,0.34)", weight: "light", looseness: 0.4, energy: "calm" })
  );
  s.initial({ opacity: 0.35 });
  s.appear({ at: 1.4 + i * 0.1, duration: 0.5 });
  const per = 4.5 + (i % 3) * 1.5;
  for (let k = 0; k * per < TOTAL - per; k++) {
    s.fadeTo(0.95, { at: k * per, duration: per * 0.45, ease: "sine.inOut" });
    s.fadeTo(0.3, { at: k * per + per * 0.45, duration: per * 0.55, ease: "sine.inOut" });
  }
});

// Two fissures on the upper rock face, each catching the same faint horizon glow its top rim
// does. Enough to keep the mass from reading as an unmodelled black void; not enough to make
// it a textured surface competing with the beam.
for (const fissure of [
  [[476, 301], [484, 320], [479, 342]],
  [[562, 297], [572, 322], [566, 350]],
] as [number, number][][]) {
  scene.add(
    sketch.stroke(fissure, { color: "rgba(132,168,196,0.13)", weight: "light", looseness: 0.3, smooth: true })
  ).drawOn({ at: 1.6, duration: 0.5 });
}

// --- Foreground swell: the closest band of water, darker than everything behind it, with a
// faintly lit top edge. Gives the bottom of the frame weight instead of flat sea. ---------
scene.add(
  sketch.loop(
    [[0, 450], [130, 444], [268, 453], [404, 446], [540, 454], [660, 447], [760, 451], [760, WORLD_H], [0, WORLD_H]],
    {
      color: "rgba(126,158,184,0.2)",
      weight: "light",
      looseness: 0.12,
      smooth: true,
      fill: silFill("#0c1926", "#02050a"),
    }
  )
).drawOn({ at: 0.3, duration: 1.1 });

// --- A near rock shelf at the bottom of the headland, in front of that swell — the one place
// two rock masses overlap, which is what gives the whole right side depth instead of a single
// undifferentiated black wedge. Its own left face runs off the bottom of frame rather than
// terminating visibly. ---------------------------------------------------------------------
const shelfPts: [number, number][] = [
  [380, 506], [424, 466], [486, 448], [556, 436], [628, 426], [700, 419], [760, 415],
  [760, WORLD_H], [380, WORLD_H],
];
scene.add(
  sketch.loop(shelfPts, {
    color: SIL,
    weight: "confident",
    looseness: 0.26,
    smooth: false,
    fill: {
      color: {
        stops: [
          { offset: 0, color: "#152634" },
          { offset: 0.08, color: "#080f17" },
          { offset: 1, color: "#010305" },
        ],
        direction: "vertical",
      },
      style: "solid",
    },
  })
).drawOn({ at: 1.75, duration: 0.8 });
scene.add(
  sketch.stroke(shelfPts.slice(0, 7), { color: "rgba(150,184,208,0.2)", weight: "light", looseness: 0.18, smooth: false })
).drawOn({ at: 2.4, duration: 0.5 });

// --- The figure standing watch, on the seaward shoulder of the rock. Same construction
// lesson quiet-crossing.ts's walker arrived at: one continuous filled coat outline with the
// arms folded into it (a separately rotated limb detaches the moment its pivot sits at the
// body's own edge rather than inside it), a hand-plotted circle for the head instead of a
// small blob, and legs as two static wedges. No face, naturalistic proportions, ~85px tall
// in a 440px frame. Its only motion is a sub-degree weight shift. ------------------------
const FIG_X = 436;
const FIG_GY = 308;
const figStyle = { color: SIL, weight: "confident" as const, looseness: 0.1, fill: { color: SIL, style: "solid" as const }, smooth: true };
const fig = sketch.group();
scene.add(fig);
fig.add(
  sketch.loop(
    [
      [FIG_X - 6, FIG_GY - 68], [FIG_X + 6, FIG_GY - 68], [FIG_X + 10, FIG_GY - 59],
      [FIG_X + 13, FIG_GY - 42], [FIG_X + 10, FIG_GY - 29], [FIG_X + 12, FIG_GY - 22],
      [FIG_X - 12, FIG_GY - 22], [FIG_X - 10, FIG_GY - 59],
    ],
    figStyle
  )
);
// Head set a hair left of the body's centreline — the whole reason the figure reads as
// looking out to sea rather than standing square to the viewer.
fig.add(sketch.loop(circlePoints(FIG_X - 2, FIG_GY - 79, 6.2, 16), { ...figStyle, looseness: 0 }));
fig.add(sketch.loop([[FIG_X - 1, FIG_GY - 22], [FIG_X - 8, FIG_GY - 22], [FIG_X - 9, FIG_GY], [FIG_X - 2, FIG_GY]], figStyle));
fig.add(sketch.loop([[FIG_X + 1, FIG_GY - 22], [FIG_X + 8, FIG_GY - 22], [FIG_X + 9, FIG_GY], [FIG_X + 2, FIG_GY]], figStyle));
fig.pivotAt(FIG_X, FIG_GY);
fig.initial({ opacity: 0 });
fig.appear({ at: 2.1, duration: 0.7 });
for (let k = 0; k < 2; k++) {
  fig.rotateTo(0.9, { at: 3 + k * 7.4, duration: 3.7, ease: "sine.inOut" });
  fig.rotateTo(-0.6, { at: 6.7 + k * 7.4, duration: 3.7, ease: "sine.inOut" });
}

// --- The lighthouse. Tapered tower, gallery slab, lamp room, conical cap. The tower's own
// fill runs light-to-dark HORIZONTALLY (left edge catching the seaward glow, right edge
// black) rather than vertically — the tower is lit from the side, unlike the rock. --------
const LH_X = 528;
const LAMP_Y = 168;
const TOWER_BASE_Y = 298;
const lighthouse = sketch.group();
scene.add(lighthouse);
const towerParts: [[number, number][], number, number][] = [
  // tower shaft
  [[[LH_X - 17, TOWER_BASE_Y], [LH_X + 17, TOWER_BASE_Y], [LH_X + 11, 190], [LH_X - 11, 190]], 1.35, 0.85],
  // gallery slab
  [[[LH_X - 19, 191], [LH_X + 19, 191], [LH_X + 19, 180], [LH_X - 19, 180]], 2.2, 0.3],
];
for (const [pts, at, dur] of towerParts) {
  lighthouse.add(
    sketch.loop(pts, {
      color: SIL,
      weight: "confident",
      looseness: 0.1,
      smooth: false,
      fill: {
        color: { stops: [{ offset: 0, color: "#101d29" }, { offset: 0.7, color: "#050a10" }, { offset: 1, color: "#020407" }], direction: "horizontal" },
        style: "solid",
      },
    })
  ).drawOn({ at, duration: dur });
}
// Faint warm spill running down the tower's seaward edge, from the lamp above — the one
// place in frame where the lamp's own light lands on something solid.
lighthouse.add(
  sketch.stroke([[LH_X - 11, 192], [LH_X - 14, 240], [LH_X - 17, TOWER_BASE_Y - 2]], {
    color: "rgba(255,226,172,0.22)",
    weight: "light",
    looseness: 0.1,
    smooth: false,
  })
).drawOn({ at: 2.5, duration: 0.5 });
// Conical cap + finial, drawn last of the dark parts. looseness 0 here, unlike the rock:
// a 30x22px triangle carrying ink's default jitter reads as a torn scrap rather than a
// machined metal cap, and it sits right against the brightest thing in frame where every
// ragged edge shows.
lighthouse.add(
  sketch.loop([[LH_X - 15, 157], [LH_X + 15, 157], [LH_X, 135]], {
    color: "#0a1017", weight: "confident", looseness: 0, energy: "calm", smooth: false, fill: { color: "#05080d", style: "solid" },
  })
).drawOn({ at: 2.5, duration: 0.35 });
lighthouse.add(
  sketch.stroke([[LH_X, 136], [LH_X, 126]], { color: "#0a1017", weight: "light", looseness: 0, energy: "calm" })
).drawOn({ at: 2.8, duration: 0.2 });

// --- Lamp glow: there's no radial-gradient primitive here, so the falloff is faked the way
// nightfall-hill.ts's moon halo is — concentric translucent discs, widest and faintest
// outermost. Three big alpha steps showed their own edges as visible scalloped rings (a
// trig circle's short segments each pick up rough.js's endpoint jitter, which reads as gear
// teeth on a hard alpha boundary); seven small steps put every edge below the threshold
// where the jitter is legible at all, which is what actually makes it read as glow. Pulses
// in step with the beam below. -------------------------------------------------------------
const lampGlow = sketch.group();
scene.add(lampGlow);
for (let i = 0; i < 7; i++) {
  const r = 60 - i * 7.5;
  lampGlow.add(
    sketch.loop(circlePoints(LH_X, LAMP_Y, r, 44), {
      color: "transparent",
      weight: "light",
      looseness: 0,
      energy: "calm",
      fill: { color: `rgba(255,${230 - i * 2},${172 + i * 6},0.05)`, style: "solid" },
    })
  );
}
// The lamp room itself — the brightest thing in frame, and the only saturated warm mass. No
// outline stroke at all (an ink-jittered dark edge around a 24px bright square reads as a
// scorch mark); two hairline mullions inside it do the "glazed lantern" job instead.
lampGlow.add(
  sketch.loop([[LH_X - 12, 180], [LH_X + 12, 180], [LH_X + 12, 157], [LH_X - 12, 157]], {
    color: "transparent",
    weight: "light",
    looseness: 0,
    energy: "calm",
    smooth: false,
    fill: silFill("#fff6dd", "#eaa947"),
  })
);
lampGlow.add(
  sketch.loop(circlePoints(LH_X, LAMP_Y, 5.5, 16), { color: "transparent", weight: "light", looseness: 0, energy: "calm", fill: { color: "#fffdf2", style: "solid" } })
);
for (const mx of [LH_X - 4.5, LH_X + 4.5]) {
  lampGlow.add(sketch.stroke([[mx, 158], [mx, 179]], { color: "rgba(52,34,12,0.5)", weight: 1, looseness: 0, energy: "calm" }));
}
lampGlow.initial({ opacity: 0 });
lampGlow.appear({ at: 2.6, duration: 0.6 });

// --- The beam. Three nested wedges plus a counter-beam stub, all sharing one group pivoted
// at the lamp so a single rotateTo sweeps the whole optic. Each wedge is authored pointing
// horizontally LEFT from the lamp, which puts its apex at the RIGHT edge of its own bbox —
// so a "horizontal" per-shape gradient runs offset 0 = far end (transparent) to offset 1 =
// apex (bright), i.e. the stops read outside-in. The far end sits at world x 0, comfortably
// outside the camera's own visible window (x 54..710 across the drift), so the beam always
// leaves frame instead of terminating on a visible edge. ---------------------------------
const BEAM_LEN = 520;
const STUB_LEN = 205;
const beam = sketch.group();
scene.add(beam);

function wedge(len: number, apexHalf: number, farHalf: number, stops: [number, string][], dir: 1 | -1) {
  const fx = LH_X + dir * len;
  return sketch.loop(
    [[LH_X, LAMP_Y - apexHalf], [LH_X, LAMP_Y + apexHalf], [fx, LAMP_Y + farHalf], [fx, LAMP_Y - farHalf]],
    {
      color: "transparent",
      weight: "light",
      looseness: 0,
      energy: "calm",
      smooth: false,
      fill: {
        color: { stops: stops.map(([offset, color]) => ({ offset, color })), direction: "horizontal" },
        style: "solid",
      },
    }
  );
}

// Outermost first so the bright core paints over the haze, not under it.
beam.add(wedge(BEAM_LEN, 10, 72, [[0, "rgba(255,228,176,0)"], [0.62, "rgba(255,228,176,0.04)"], [1, "rgba(255,233,190,0.14)"]], -1));
beam.add(wedge(BEAM_LEN, 6, 46, [[0, "rgba(255,232,186,0)"], [0.5, "rgba(255,232,186,0.08)"], [1, "rgba(255,240,206,0.28)"]], -1));
beam.add(wedge(BEAM_LEN, 3, 21, [[0, "rgba(255,246,214,0)"], [0.45, "rgba(255,246,214,0.13)"], [1, "rgba(255,250,232,0.5)"]], -1));
// The counter-beam: same optic, 180° round, cropped by the frame's right edge. Deliberately
// much fainter than the main beam so the composition stays weighted to the open sea.
beam.add(wedge(STUB_LEN, 8, 34, [[0, "rgba(255,235,190,0.13)"], [0.55, "rgba(255,235,190,0.05)"], [1, "rgba(255,235,190,0)"]], 1));
beam.pivotAt(LH_X, LAMP_Y);
beam.initial({ rotation: 12, opacity: 0 });

// The sweep. Positive rotation tips the left-pointing beam UP, negative rakes it down
// through the horizon and onto the water. Kept inside roughly +12°..-18° so it never sweeps
// through the headland it's standing on, and so the widest halo corner only ever leaves
// frame at the top rather than terminating mid-sky.
const sweep: [number, number, number][] = [
  [2.9, 4.2, -18],
  [7.1, 3.9, 10],
  [11.0, 4.1, -16],
  [15.1, 2.5, -2],
];
for (const [at, duration, deg] of sweep) beam.rotateTo(deg, { at, duration, ease: "sine.inOut" });

// Brightness pulse, peaking each time the beam crosses the horizon rather than at the
// extremes of its arc — the periodic flash, which is what makes a swinging wedge read as a
// lighthouse rather than a searchlight. Peaks solved from the sweep above: 5.15, 9.05,
// 13.2, 16.5. The lamp's own glow pulses on the same clock, at a shallower range.
const pulse: [number, number, number, number][] = [
  [2.9, 0.8, 0.45, 0.78],
  [3.9, 1.25, 1.0, 1.0],
  [5.15, 1.9, 0.42, 0.72],
  [7.05, 2.0, 1.0, 1.0],
  [9.05, 2.1, 0.45, 0.74],
  [11.15, 2.05, 1.0, 1.0],
  [13.2, 2.1, 0.42, 0.72],
  [15.3, 1.2, 0.95, 0.97],
  [16.5, 1.4, 0.5, 0.78],
];
for (const [at, duration, beamOpacity, glowOpacity] of pulse) {
  beam.fadeTo(beamOpacity, { at, duration, ease: "sine.inOut" });
  lampGlow.fadeTo(glowOpacity, { at, duration, ease: "sine.inOut" });
}

// --- Camera: a 16px drift toward the tower over the whole shot, nothing more. panTo takes
// an ABSOLUTE scene-space point to centre on, not a delta. Both ends keep the viewport's own
// half-extents (320 x 220) well inside the world on every axis — a viewport edge crossing a
// world edge is a real renderer bug (a stray pale rectangle in frame; see quiet-ride.ts's
// own note, which only guarded the x axis and still shows it along the bottom).
const cam = scene.camera();
cam.panTo(374, 264, { at: 0, duration: 0 });
cam.panTo(390, 256, { at: 0.2, duration: TOTAL - 0.2, ease: "sine.inOut" });

// --- Sound: a low sea-drone pad, a slow wave wash on unpitched brush hits, a distant fog
// signal on the first and third flashes only (on every flash it turns into a honk keeping
// time with the light), and five sparse piano notes. Same restraint as quiet-crossing.ts's
// score, pitched a good deal lower.
scene.add(sketch.sound("D2", { at: 0, duration: TOTAL, instrument: "pad", velocity: 0.15 }));
scene.add(sketch.sound("A2", { at: 0.6, duration: TOTAL - 0.6, instrument: "pad", velocity: 0.1 }));
for (let i = 0; i < 6; i++) {
  scene.add(sketch.sound(null, { at: 1.4 + i * 2.8, duration: 0.9, instrument: "brush", velocity: 0.1, pan: i % 2 === 0 ? -0.4 : 0.3 }));
}
scene.add(sketch.sound("E2", { at: 5.15, duration: 1.8, instrument: "strings", velocity: 0.26, pan: 0.35 }));
scene.add(sketch.sound("E2", { at: 13.2, duration: 1.8, instrument: "strings", velocity: 0.24, pan: 0.35 }));
const notes: [string, number][] = [["A3", 3.4], ["E4", 6.0], ["C4", 9.6], ["G3", 13.8], ["A3", 16.2]];
for (const [pitch, at] of notes) {
  scene.add(sketch.sound(pitch, { at, duration: 1.1, instrument: "piano", velocity: 0.24, pan: -0.2 }));
}

export default scene;
