import { sketch } from "../../src/index.js";

// Showcase: DENSITY, in the tradition of nightfall-hill.ts — but answering the design
// question that piece leaves open, namely whether more shapes read as "lively" or just
// "cluttered". The answer this scene argues for: count alone is clutter; what reads as
// lively is VALUE AND TEMPERATURE ORGANISED INTO PLANES. Every shape here belongs to one
// of four depth planes, and each plane gets its own value range and its own temperature:
//
//   0.35  distant rooftops    cool, hazy, low contrast against the sky (barely a shape)
//   0.70  the facades behind  warm plaster mid-values, cooler shutters as accents
//   1.00  the market row      the only saturated warm colour in the frame (awnings, goods)
//   1.20  foreground crates   the darkest values, no detail at all
//
// So the frame is busy in the bottom two-fifths and deliberately almost empty above the
// rooftops — restraint by band, not by subtraction. Figures stay in quiet-crossing.ts's
// register (solid silhouettes, no faces, naturalistic proportions, an unhurried
// sine-eased gait, no squashTo anywhere), and the further-back ones are lighter and
// smaller: atmospheric perspective applied to people, not just to landforms. Light
// direction is a real midday sun — every awning, mound and wall is a top-lit gradient,
// each stall casts a shadow band onto the wall behind it, and each figure carries its own
// short contact shadow so nothing floats.

const WORLD_W = 1560;
const H = 500;
const VIEW_W = 800;
const VIEW_H = 500;

// --- The one vertical section every helper below measures from. Ordered top to bottom. --
const SKYLINE_BASE = 340; // distant rooftops' own base, hidden behind the facades
const FACADE_TOP_MIN = 196;
const FACADE_BASE = 394;
const AW_TOP = 246; // awning fabric
const AW_BOT = 276;
const VAL_BOT = 292; // scalloped valance's lowest point
const TABLE_TOP = 336;
const TABLE_BOT = 348;
// The stall cloth hangs almost to the pavement (388) on purpose — see the vendors' own note:
// a shorter cloth leaves 30px of vendor shin showing between hem and ground, which reads as a
// small animal under the table rather than as a person standing behind it.
const CLOTH_BOT = 386;
const PAVE_TOP = 388;
const PAVE_BOT = 436;
const FEET_Y = 404; // where a depth-1 figure's feet land, mid-pavement
const POLE_BOT = 420;

// Silhouette values, near to far — the same figure builder, three distances.
const NEAR_SIL = "#201a12";
const MID_SIL = "#3a3227";
// Haze value is a judgement call worth stating: it has to sit BETWEEN the wall behind it and
// the near figures, never lighter than the wall. A first pass at #89836f went lighter than
// the plaster and the far figures read as apparitions standing in doorways rather than as
// people down the street.
const HAZE_SIL = "#6b6455";

type Style = Parameters<typeof sketch.loop>[1];

function rect(x1: number, y1: number, x2: number, y2: number, style: Style) {
  return sketch.loop(
    [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ],
    { smooth: false, ...style }
  );
}

// Top-lit vertical gradient — the midday key light, reused on every surface in the frame
// so light direction is consistent instead of per-shape guesswork. Only renders as a real
// gradient under fill.style "solid" (see AGENTS.md's Style section), which is what every
// caller here uses.
function lit(top: string, bottom: string) {
  return {
    color: { stops: [{ offset: 0, color: top }, { offset: 1, color: bottom }], direction: "vertical" as const },
    style: "solid" as const,
  };
}

function ellipsePoints(cx: number, cy: number, rx: number, ry: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

// A heaped pile of produce: a half-dome sitting on the table, not a blob(). blob()'s
// wobble floor (see nightfall-hill.ts's own note) makes a 60px-wide mound read as a lumpy
// cloud; a hand-plotted arc keeps the silhouette clean while the ink look still jitters it.
function mound(cx: number, baseY: number, w: number, h: number, top: string, bot: string, edge: string) {
  const pts: [number, number][] = [];
  const n = 11;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * (w / 2), baseY - Math.sin(a) * h]);
  }
  return sketch.loop(pts, { color: edge, weight: "light", looseness: 0.12, fill: lit(top, bot) });
}

const scene = sketch.scene({
  width: WORLD_W,
  height: H,
  viewport: { width: VIEW_W, height: VIEW_H },
  // Midday, not noon-postcard blue: a hazy sky that bleaches out toward the horizon, which
  // is what actually makes the awnings below read as sunlit. An earlier pass sat two stops
  // darker and read as late afternoon — the same composition, but the whole street lost the
  // high-sun feel the shadows below are drawn for.
  background: {
    stops: [
      { offset: 0, color: "#93b3cc" },
      { offset: 0.44, color: "#c2cbc6" },
      { offset: 0.74, color: "#e2d8bb" },
      { offset: 1, color: "#f0e5c6" },
    ],
    direction: "vertical",
  },
  seed: "market-street",
  look: "ink",
  texture: "grain",
});

// =====================================================================================
// Depth 0.35 — distant rooftops. Cool, desaturated, deliberately close in value to the
// sky itself: at this distance a building is a shape, not an object. Authored across
// x 250..1240, the span this layer's own parallax offset actually brings through frame.
// =====================================================================================
const farLayer = scene.layer(0.35);

const farBlocks: [number, number, number, string, string][] = [
  [250, 190, 150, "#96a4ae", "#7e8c99"],
  [396, 214, 118, "#a5b0b6", "#8b98a1"],
  [508, 168, 132, "#8b97a4", "#727f8d"],
  [634, 204, 164, "#9fabb2", "#84919b"],
  [792, 178, 126, "#909daa", "#77848f"],
  [912, 210, 148, "#a7b2b7", "#8d9aa2"],
  [1054, 186, 190, "#8f9ca8", "#77838f"],
];
for (const [x, top, w, cTop, cBot] of farBlocks) {
  farLayer.add(rect(x, top, x + w, SKYLINE_BASE, { color: cBot, weight: "light", looseness: 0.08, fill: lit(cTop, cBot) })).appear({
    at: 0,
    duration: 0.01,
  });
  // Three windows, not a grid — enough to say "inhabited" without drawing a spreadsheet.
  // Kept deliberately close in value to the wall they sit in: a distant window that
  // contrasts hard reads as a scrap of paper stuck to the skyline, which is exactly what
  // the first pass looked like.
  for (let i = 0; i < 3; i++) {
    const wx = x + 22 + i * ((w - 50) / 2);
    farLayer
      .add(rect(wx, top + 26, wx + 10, top + 42, { color: "#00000000", weight: "light", fill: { color: i === 1 ? "#78848f" : "#a7b1b6", style: "solid" } }))
      .appear({ at: 0, duration: 0.01 });
  }
}
// One taller accent so the skyline has a shape to it rather than a flat run of boxes.
farLayer.add(rect(730, 140, 756, SKYLINE_BASE, { color: "#75828f", weight: "light", looseness: 0.06, fill: lit("#93a0ac", "#78858f") })).appear({ at: 0, duration: 0.01 });
farLayer
  .add(sketch.loop([[724, 140], [762, 140], [743, 116]], { color: "#75828f", weight: "light", smooth: false, fill: lit("#9dabb5", "#82909a") }))
  .appear({ at: 0, duration: 0.01 });

// =====================================================================================
// Depth 0.70 — the facades the market row leans against. Warm plaster mid-values (the
// step in temperature from the cool skyline above is what separates the planes; a value
// step alone reads as fog). Cool shutters are the only cool notes down here, which is
// exactly what keeps the warm awnings below from turning the bottom half into one mass.
// Authored across x 130..1280.
// =====================================================================================
const midLayer = scene.layer(0.7);

// The last number is where the doorway sits across that facade's width, or -1 for no
// doorway at all. One centred door per facade (the first pass) put an identical dark slab at
// an identical pitch all down the street, and a repeated interval is what actually reads as
// clutter — not the number of shapes. Four doors at four different offsets read as a street.
const facades: [number, number, number, string, string, string, number][] = [
  [130, 224, 208, "#cbb99c", "#a89877", "#6f8079", 0.26],
  [338, 206, 176, "#bda787", "#9c8968", "#74879b", -1],
  [514, 232, 196, "#d4c6a9", "#b1a286", "#6f8079", 0.63],
  [710, FACADE_TOP_MIN, 184, "#b4b6a7", "#939685", "#7d6f5c", 0.34],
  [894, 228, 202, "#c8b697", "#a69479", "#74879b", -1],
  [1096, 210, 184, "#bfae90", "#9d8c70", "#6f8079", 0.57],
];
for (const [x, top, w, cTop, cBot, shutter, doorAt] of facades) {
  midLayer.add(rect(x, top, x + w, FACADE_BASE, { color: "#7d6f57", weight: "light", looseness: 0.07, fill: lit(cTop, cBot) })).appear({ at: 0, duration: 0.01 });
  // Terracotta roof lip — a thin warm line reading as a tiled edge catching the sun.
  midLayer.add(rect(x - 5, top - 7, x + w + 5, top, { color: "#8a5540", weight: "light", looseness: 0.06, fill: lit("#b3714c", "#8d5439") })).appear({ at: 0, duration: 0.01 });
  // Upper-floor windows: a dark opening with a shutter pair either side.
  for (let i = 0; i < 2; i++) {
    const wx = x + 34 + i * (w - 100);
    const wy = top + 30;
    midLayer.add(rect(wx, wy, wx + 30, wy + 44, { color: "#4b4032", weight: "light", fill: lit("#65563f", "#3d3327") })).appear({ at: 0, duration: 0.01 });
    midLayer.add(rect(wx - 11, wy - 2, wx - 1, wy + 44, { color: "#3f4b45", weight: "light", fill: lit(shutter, "#4f5c56") })).appear({ at: 0, duration: 0.01 });
    midLayer.add(rect(wx + 31, wy - 2, wx + 41, wy + 44, { color: "#3f4b45", weight: "light", fill: lit(shutter, "#4f5c56") })).appear({ at: 0, duration: 0.01 });
  }
  // A doorway, mostly hidden behind the stalls — it only has to register in the gaps. Sized
  // against the figures below (a 100px-tall person needs a taller opening than the 74px one
  // the first pass drew, which read as a hatch, not a door) with a pale stone lintel.
  if (doorAt < 0) continue;
  const dx0 = x + w * doorAt - 22;
  // Fill kept off pure black (at #4c4031→#2b241b the row of them read as a run of empty
  // garages before the stalls draw in, a bleak opening for a market at midday) — but a flat
  // rectangle at any value is just a slab, so it gets a centre seam for the two door leaves
  // and a pale threshold at the bottom. Two strokes is the whole difference between "grey
  // monolith" and "door".
  midLayer.add(rect(dx0, FACADE_BASE - 112, dx0 + 44, FACADE_BASE, { color: "#4e4234", weight: "light", fill: lit("#6a5b45", "#40372a") })).appear({ at: 0, duration: 0.01 });
  midLayer
    .add(sketch.stroke([[dx0 + 22, FACADE_BASE - 108], [dx0 + 22, FACADE_BASE - 4]], { color: "#2f281e", weight: "light", looseness: 0.08 }))
    .appear({ at: 0, duration: 0.01 });
  midLayer
    .add(rect(dx0 - 3, FACADE_BASE - 5, dx0 + 47, FACADE_BASE, { color: "#00000000", weight: "light", fill: { color: "#bdb094", style: "solid" } }))
    .appear({ at: 0, duration: 0.01 });
  midLayer
    .add(rect(dx0 - 5, FACADE_BASE - 119, dx0 + 49, FACADE_BASE - 110, { color: "#8b7f66", weight: "light", fill: lit("#d3c8ad", "#ab9f84") }))
    .appear({ at: 0, duration: 0.01 });
}

// Two pennant strings slung across the street. They live on the mid plane so they drift
// against the market row as the camera moves — the cue that says "the awnings are nearer
// than the walls", which no amount of extra detail on one plane can say.
function pennantString(x1: number, x2: number, sag: number, colors: string[]) {
  const y = 208;
  const line: [number, number][] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    line.push([x1 + (x2 - x1) * t, y + Math.sin(Math.PI * t) * sag]);
  }
  midLayer.add(sketch.stroke(line, { color: "#6b6152", weight: "light", looseness: 0.1 })).appear({ at: 0, duration: 0.01 });
  for (let i = 1; i < n; i++) {
    const [px, py] = line[i];
    midLayer
      .add(
        sketch.loop([[px - 8, py], [px + 8, py], [px, py + 17]], {
          color: "#6b6152",
          weight: "light",
          smooth: false,
          fill: { color: colors[i % colors.length], style: "solid" },
        })
      )
      .appear({ at: 0, duration: 0.01 });
  }
}
pennantString(300, 620, 26, ["#c98a4a", "#8d9c8a", "#b56a58", "#cbb992"]);
pennantString(880, 1200, 24, ["#8d9c8a", "#b56a58", "#cbb992", "#c98a4a"]);

// A few hazy figures far down the street, on the facade plane rather than the market row:
// smaller, lighter, no gait. Depth in a crowd is a value problem, not a count problem —
// three silhouettes back here do more than a dozen more dark ones up front would. They're
// built by the same buildFigure() the near figures use (defined below, hoisted) rather than
// by a simplified legless outline: a solid one-piece body at this size lost its silhouette
// entirely and read as a translucent smear, not a person standing down the street. The one
// concession to distance is a wider stance instead of a walk cycle.
function hazyFigure(x: number, face: 1 | -1 = 1) {
  const f = buildFigure(HAZE_SIL, 0.72, face);
  midLayer.add(f.group);
  f.group.initial({ x, y: 388 });
  f.group.appear({ at: 0, duration: 0.01 });
  f.legL.rotateTo(9, { at: 0, duration: 0.01 });
  f.legR.rotateTo(-5, { at: 0, duration: 0.01 });
  return f;
}
hazyFigure(384);
hazyFigure(662, -1);
hazyFigure(1246);

// =====================================================================================
// Depth 1.0 — the street itself and the market row on it. The only plane allowed
// saturated colour.
// =====================================================================================

// Pavement: the sunlit band the whole market stands on.
scene
  .add(rect(-40, PAVE_TOP, WORLD_W + 40, PAVE_BOT, { color: "#7f7359", weight: "light", looseness: 0.06, fill: lit("#cdc0a2", "#a8997c") }))
  .drawOn({ at: 0, duration: 1.1 });
// Roadway, a step cooler and darker than the pavement — the value floor of the frame
// before the foreground plane goes darker still.
scene
  .add(rect(-40, PAVE_BOT, WORLD_W + 40, H + 20, { color: "#5e5745", weight: "light", looseness: 0.05, fill: lit("#9c9581", "#7c7663") }))
  .drawOn({ at: 0.2, duration: 1.1 });
// One drawn line along the kerb: without it the pavement/road boundary is only a change of
// colour, and two flat bands of ground read as a wall rather than as a street.
scene
  .add(sketch.stroke([[-40, PAVE_BOT], [WORLD_W + 40, PAVE_BOT]], { color: "#6e6350", weight: "light", looseness: 0.12 }))
  .drawOn({ at: 0.35, duration: 1.0 });

// --- The figure builder: one continuous filled outline for the body (arm folded in, per
// quiet-crossing.ts's hard-won note that a separately rotated limb detaches from a body
// whose pivot sits at its edge), a head blob with a real neck gap, two hip-pivoted leg
// wedges, and a short contact shadow parented into the group so it travels along. `face`
// mirrors the whole silhouette for a figure walking the other way. -----------------------
function buildFigure(color: string, s = 1, face: 1 | -1 = 1) {
  const g = sketch.group();
  const P = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [x * s * face, y * s] as [number, number]);

  g.add(
    sketch.loop(ellipsePoints(0, 3 * s, 16 * s, 4 * s, 14), {
      color: "#00000000",
      weight: "light",
      fill: { color: "#5a513c55", style: "solid" },
    })
  );
  g.add(
    sketch.loop(P([[-6, -84], [6, -84], [10, -77], [14, -58], [11, -49], [13, -38], [-13, -38], [-10, -77]]), {
      color,
      weight: "confident",
      looseness: 0.1,
      fill: { color, style: "solid" },
    })
  );
  g.add(sketch.blob(0, -92 * s, 8 * s, { color, weight: "confident", looseness: 0.08, fill: { color, style: "solid" } }, 12));

  const legL = sketch.loop(P([[2, -38], [-5, -38], [-8, 2], [0, 2]]), {
    color,
    weight: "confident",
    looseness: 0.1,
    fill: { color, style: "solid" },
  });
  legL.pivotAt(-2 * s * face, -38 * s);
  const legR = sketch.loop(P([[-2, -38], [5, -38], [8, 2], [0, 2]]), {
    color,
    weight: "confident",
    looseness: 0.1,
    fill: { color, style: "solid" },
  });
  legR.pivotAt(2 * s * face, -38 * s);
  g.add(legL);
  g.add(legR);
  return { group: g, legL, legR };
}

// A patient gait: long steps, sine easing, a 2px bob. No squashTo in this scene either —
// weight comes from the timing, not from a cartoon impact cue.
function walkCycle(f: ReturnType<typeof buildFigure>, at: number, steps: number, dx: number, dur: number) {
  for (let i = 0; i < steps; i++) {
    const t = at + i * dur;
    f.group.moveBy(dx, 0, { at: t, duration: dur, ease: "sine.inOut" });
    f.group.moveBy(0, -2, { at: t, duration: dur / 2, ease: "sine.out" });
    f.group.moveBy(0, 2, { at: t + dur / 2, duration: dur / 2, ease: "sine.in" });
    f.legL.rotateTo(i % 2 === 0 ? 20 : -20, { at: t, duration: dur, ease: "sine.inOut" });
    f.legR.rotateTo(i % 2 === 0 ? -20 : 20, { at: t, duration: dur, ease: "sine.inOut" });
  }
  const end = at + steps * dur;
  f.legL.rotateTo(0, { at: end, duration: 0.35, ease: "sine.out" });
  f.legR.rotateTo(0, { at: end, duration: 0.35, ease: "sine.out" });
  return end;
}

// --- A stall: awning fabric + stripes + scalloped valance, the shadow it throws onto the
// wall behind, a table with a hanging cloth, heaped goods, and two front poles. One call
// per stall, each with its own colour pair, so density comes from variation rather than
// from repeating one shape at four x positions. -----------------------------------------
interface Goods {
  dx: number;
  w: number;
  h: number;
  top: string;
  bot: string;
}
function stall(o: {
  x1: number;
  x2: number;
  dy?: number; // per-stall awning height offset — see the call sites' own note
  fabricTop: string;
  fabricBot: string;
  stripe?: string;
  valance: string;
  cloth: string;
  clothBot: string;
  goods: Goods[];
  at: number;
}) {
  const { x1, x2, at } = o;
  const dy = o.dy ?? 0;
  const awTop = AW_TOP + dy;
  const awBot = AW_BOT + dy;
  const valBot = VAL_BOT + dy;
  const cx = (x1 + x2) / 2;

  // The stall's own shadow thrown onto the pavement, offset slightly right of the stall
  // because the key light sits high and a little to the left — the same direction the `lit`
  // gradients everywhere else in the frame assume. Without this the whole market row floats
  // on top of the pavement instead of standing on it.
  scene
    .add(rect(x1 + 14, PAVE_TOP + 6, x2 + 30, PAVE_BOT - 4, { color: "#00000000", weight: "light", fill: { color: "#41371f38", style: "solid" } }))
    .appear({ at: at + 0.5, duration: 0.5 });

  // The awning's own cast shadow on the wall/goods below it — a midday sun this high
  // throws a short hard band, and without it the awning reads as pasted on rather than
  // standing off the wall.
  scene
    .add(rect(x1 + 4, valBot - 4, x2 - 4, valBot + 30, { color: "#00000000", weight: "light", fill: { color: "#3a2e1e2e", style: "solid" } }))
    .appear({ at: at + 0.7, duration: 0.4 });

  scene
    .add(rect(x1, awTop, x2, awBot, { color: o.valance, weight: "confident", looseness: 0.07, fill: lit(o.fabricTop, o.fabricBot) }))
    .drawOn({ at, duration: 0.8 });

  if (o.stripe) {
    for (let sx = x1 + 14; sx < x2 - 16; sx += 46) {
      scene
        .add(rect(sx, awTop + 1, Math.min(sx + 20, x2 - 2), awBot, { color: "#00000000", weight: "light", fill: lit(o.stripe, o.stripe) }))
        .appear({ at: at + 0.75, duration: 0.35 });
    }
  }

  // Scalloped valance — the bottom edge alternates between two depths, which is what makes
  // fabric read as fabric instead of as a painted board.
  const val: [number, number][] = [[x1, awBot - 4], [x2, awBot - 4]];
  const scallops = Math.max(3, Math.round((x2 - x1) / 26));
  for (let i = scallops; i >= 0; i--) {
    const px = x2 - ((x2 - x1) * i) / scallops;
    val.push([px, i % 2 === 0 ? valBot : awBot + 3]);
  }
  scene.add(sketch.loop(val, { color: o.valance, weight: "light", looseness: 0.08, fill: lit(o.valance, o.valance) })).drawOn({ at: at + 0.55, duration: 0.6 });

  // Table: a slab edge over a hanging cloth.
  scene
    .add(rect(x1 + 2, TABLE_TOP, x2 - 2, TABLE_BOT, { color: "#3f3020", weight: "confident", looseness: 0.07, fill: lit("#7a6041", "#4d3a26") }))
    .drawOn({ at: at + 0.5, duration: 0.7 });
  scene
    .add(rect(x1 + 6, TABLE_BOT, x2 - 6, CLOTH_BOT, { color: "#2f2718", weight: "light", looseness: 0.08, fill: lit(o.cloth, o.clothBot) }))
    .drawOn({ at: at + 0.9, duration: 0.6 });

  // Goods, heaped on the table. Warm, saturated, and the brightest thing in the frame —
  // the whole point of the stall.
  for (let i = 0; i < o.goods.length; i++) {
    const gd = o.goods[i];
    scene.add(mound(cx + gd.dx, TABLE_TOP + 1, gd.w, gd.h, gd.top, gd.bot, "#5c4526")).appear({ at: at + 1.05 + i * 0.14, duration: 0.35 });
    // Two or three individual pieces sitting ON the heap — placed against the dome's own
    // surface height at that x (h at the crown, h*cos30 a quarter-width out), not at one
    // flat y above it, which is what made the first pass's fruit hover in a row over the
    // pile instead of resting in it. Radius 8 is the floor where a blob still reads as a
    // shape rather than as its own jitter (AGENTS.md's note).
    for (let k = -1; k <= 1; k++) {
      if (k === 0 && gd.w < 46) continue;
      const surface = TABLE_TOP - (k === 0 ? gd.h : gd.h * 0.866) + 2;
      scene
        .add(sketch.blob(cx + gd.dx + k * (gd.w / 4), surface, 8, { color: "#5c4526", weight: "light", looseness: 0.16, fill: lit(gd.top, gd.bot) }, 10))
        .appear({ at: at + 1.2 + i * 0.14, duration: 0.3 });
    }
  }

  // Front poles, drawn last so they sit in front of the table they hold up.
  for (const px of [x1 + 7, x2 - 7]) {
    scene.add(rect(px - 2, awBot, px + 2, POLE_BOT, { color: "#3a2d1e", weight: "light", looseness: 0.06, fill: lit("#4c3b27", "#2f2417") })).drawOn({ at: at + 0.3, duration: 0.5 });
  }
  return { cx };
}

// --- The two vendors, built BEFORE their stalls on purpose. Paint order here is scene.add
// order, so a vendor added after stall() stands in front of its own table and reads as one
// more shopper (exactly what the first pass looked like); added first, the table crops them
// at the chest, which is all a vendor behind a stall ever shows. ------------------------
// Standing further "back" than the street figures (feet at 386 rather than 404) so the stall
// cloth hides the legs entirely and more of the torso clears the tabletop. Nothing below the
// hem is visible, so the exact foot height behind a counter is free to choose.
const vendorA = buildFigure(NEAR_SIL, 0.94);
scene.add(vendorA.group);
vendorA.group.initial({ x: 226, y: FEET_Y - 18 });
// Each vendor fades in only after its own table has finished drawing (stall A's table lands
// at 1.5, stall C's at 3.1) — appearing earlier shows a whole standing figure for a beat
// before the table crops it, which reads as someone walking into the stall.
vendorA.group.appear({ at: 1.65, duration: 0.5 });

const vendorC = buildFigure(NEAR_SIL, 1.0, -1);
scene.add(vendorC.group);
vendorC.group.initial({ x: 782, y: FEET_Y - 18 });
vendorC.group.appear({ at: 3.2, duration: 0.5 });

// A standing stance rather than legs pinned together — invisible on the vendors themselves
// now that the cloth covers them, but it costs nothing and keeps the rig honest if a later
// pass raises the hem again.
for (const v of [vendorA, vendorC]) {
  v.legL.rotateTo(6, { at: 0, duration: 0.01 });
  v.legR.rotateTo(-4, { at: 0, duration: 0.01 });
}

// Four stalls, each a different hue and a different value — a terracotta-striped one, a
// cool teal one (the one cool awning, so the run of warm ones has something to be warm
// against), a mustard one, a plum one. Widths and awning heights vary per stall (`dy`) and
// the gap before the last one is deliberately wider than the others: four identical shapes
// at an even pitch is the exact thing that turns density into wallpaper, and the eye needs
// one stretch of bare pavement to rest on.
stall({
  x1: 140,
  x2: 310,
  fabricTop: "#c26b45",
  fabricBot: "#9b4d31",
  stripe: "#d6c19c",
  valance: "#8c452c",
  cloth: "#6b7a84",
  clothBot: "#4b565e",
  goods: [
    { dx: -52, w: 58, h: 20, top: "#e09a3c", bot: "#b06a22" },
    { dx: 14, w: 50, h: 17, top: "#c0492f", bot: "#8d3324" },
    { dx: 68, w: 42, h: 15, top: "#7f8f45", bot: "#586630" },
  ],
  at: 0.3,
});

// A 150px stretch of bare pavement between this stall and the last one — the rest.
stall({
  x1: 460,
  x2: 600,
  dy: 12,
  fabricTop: "#5c8d86",
  fabricBot: "#3f6c67",
  valance: "#335955",
  cloth: "#8a5a3e",
  clothBot: "#5e3c28",
  goods: [
    { dx: -38, w: 54, h: 19, top: "#dfcd8a", bot: "#b0a05d" },
    { dx: 30, w: 46, h: 16, top: "#a5573f", bot: "#7a3b2a" },
  ],
  at: 1.15,
});

// The widest stall, with the lowest-hanging awning — the one the scene's single event
// happens at.
stall({
  x1: 700,
  x2: 900,
  dy: -6,
  fabricTop: "#d0a04a",
  fabricBot: "#a97c2c",
  stripe: "#a4573a",
  valance: "#8d6524",
  cloth: "#5d6650",
  clothBot: "#3f4737",
  goods: [
    { dx: -62, w: 60, h: 21, top: "#e2953a", bot: "#ad6420" },
    { dx: 8, w: 52, h: 18, top: "#855a6b", bot: "#5f3f4d" },
    { dx: 72, w: 46, h: 16, top: "#cf9c58", bot: "#9d7139" },
  ],
  at: 1.9,
});

stall({
  x1: 1010,
  x2: 1180,
  dy: 6,
  fabricTop: "#a5647a",
  fabricBot: "#7f4a5c",
  stripe: "#d0bb98",
  valance: "#6d3c4c",
  cloth: "#4f5a70",
  clothBot: "#363e50",
  goods: [
    { dx: -42, w: 56, h: 19, top: "#c9a44e", bot: "#9c7a3a" },
    { dx: 30, w: 48, h: 17, top: "#b4462f", bot: "#83301f" },
  ],
  at: 2.65,
});

// Chillies strung up under the first awning — three short hanging clusters. Cheap density
// in a spot that would otherwise be a bare gap between the valance and the goods.
for (const hx of [176, 204, 232]) {
  scene
    .add(sketch.stroke([[hx, VAL_BOT - 4], [hx + 2, VAL_BOT + 8], [hx - 1, VAL_BOT + 20]], { color: "#9c4230", weight: "confident", looseness: 0.2 }))
    .drawOn({ at: 2.0, duration: 0.4 });
}

// --- The people in FRONT of the row: a customer at the fruit stall and two figures walking
// the street at different distances and different speeds. (The vendors behind the tables are
// built further up, before the stalls — see the note there.) ----------------------------
// The customer: waits at the fruit stall, takes what's handed over, then walks on. This is
// the only actual event in the scene — a busy street doesn't need a plot, it needs one
// thing to happen while everything else simply carries on.
const customer = buildFigure(NEAR_SIL, 0.92);
scene.add(customer.group);
customer.group.initial({ x: 856, y: FEET_Y });
customer.group.appear({ at: 3.2, duration: 0.5 });

// Vendor leans out over the table and back. A translate, not a pivoted rotation — a
// rotateTo on a group that already carries its own initial() translate is exactly the
// combination nightfall-hill.ts flags as fragile, and a 6px lean reads the same.
vendorC.group.moveBy(8, -5, { at: 6.0, duration: 0.5, ease: "sine.out" });
vendorC.group.moveBy(-8, 5, { at: 7.1, duration: 0.7, ease: "sine.inOut" });

// Pale melon rather than another orange, and the arc peaks ABOVE the goods line: the first
// pass handed over a #e2953a blob that travelled straight across an identically-coloured
// heap of oranges and was effectively invisible for the whole tween. One event in the scene
// means it has to be legible against whatever it passes over.
const handoff = sketch.blob(812, 318, 9, { color: "#5c4526", weight: "confident", looseness: 0.14, fill: lit("#efe0a8", "#c3ad66") }, 10);
scene.add(handoff);
handoff.appear({ at: 6.1, duration: 0.25 });
handoff.moveAlong(
  [
    [812, 318],
    [832, 288],
    [852, 326],
  ],
  { at: 6.5, duration: 0.9, ease: "sine.inOut" }
);
handoff.fadeTo(0, { at: 7.5, duration: 0.3 });
customer.group.moveBy(0, -3, { at: 6.6, duration: 0.4, ease: "sine.out" });
customer.group.moveBy(0, 3, { at: 7.2, duration: 0.5, ease: "sine.in" });
walkCycle(customer, 8.0, 6, 40, 1.0);

// A near figure crossing left to right, slightly faster than the camera's own drift so it
// gains on the frame instead of sitting pinned in it.
const walkerA = buildFigure(NEAR_SIL, 1.0);
scene.add(walkerA.group);
walkerA.group.initial({ x: 96, y: FEET_Y + 6 });
walkerA.group.appear({ at: 2.6, duration: 0.4 });
walkCycle(walkerA, 3.0, 11, 42, 1.0);

// And one coming the other way, genuinely further back: 0.74 scale, a lighter value, feet
// 16px higher on the pavement. It crosses the customer around t≈12, and a real depth
// separation is what makes that read as one figure passing behind another rather than two
// silhouettes merging into one dark mass — a 10px offset at near-identical scale and value
// (the first pass) merges.
const walkerB = buildFigure(MID_SIL, 0.74, -1);
scene.add(walkerB.group);
walkerB.group.initial({ x: 1256, y: FEET_Y - 16 });
walkerB.group.appear({ at: 4.6, duration: 0.4 });
walkCycle(walkerB, 5.0, 9, -38, 1.05);

// A charcoal brazier standing in the gap in the row, with a thin plume off it — the one
// moving thing in the frame that isn't a person, and the cheapest possible "this street is
// alive" cue. It sits in the OPEN gap deliberately: an earlier pass put the pot on the teal
// stall's table, where the awning hangs 34px above it, so the plume had nowhere to go and
// massed into a pale lump that read as a bag sitting on the stall. Smoke needs headroom, and
// the only headroom on a street of awnings is between two stalls.
scene.add(rect(378, 382, 402, 404, { color: "#2b2519", weight: "confident", looseness: 0.09, fill: lit("#4a4132", "#282218") })).appear({ at: 1.9, duration: 0.3 });
scene.add(rect(374, 379, 406, 384, { color: "#2b2519", weight: "light", looseness: 0.08, fill: lit("#5d5241", "#3a3225") })).appear({ at: 1.9, duration: 0.3 });
// Embers: the only warm note at ground level, and the plume's own source.
scene.add(sketch.blob(390, 379, 9, { color: "#7d3d1c", weight: "light", looseness: 0.2, fill: lit("#d9701f", "#93400f") }, 8)).appear({ at: 2.2, duration: 0.4 });
scene.add(
  sketch.particles(
    390,
    374,
    { color: "#cfc7b4" },
    { count: 8, angle: -90, spread: 20, speedMin: 22, speedMax: 44, gravity: -4, lifetime: 2.6, duration: 9.0, at: 2.6, sizeMin: 2, sizeMax: 3 }
  )
);

// =====================================================================================
// Depth 1.2 — the foreground plane: the darkest values in the frame and no detail at all.
// Crates and a shaded strip of road, close enough that they slide past faster than the
// street behind them. Authored across x -40..1340, the span this layer brings through.
// =====================================================================================
const fgLayer = scene.layer(1.2);

fgLayer.add(rect(-60, 470, WORLD_W + 60, H + 20, { color: "#4a4335", weight: "light", looseness: 0.05, fill: lit("#6b6250", "#514a3b") })).appear({ at: 0, duration: 0.01 });

// A crate, not just a dark rectangle: a lit top rail, two slat gaps, and (optionally) a
// second box stacked slightly inset. Even the darkest plane needs enough internal structure
// to name the object — the first pass's plain filled boxes read as holes in the frame.
function crateStack(x: number, baseY: number, w: number, h: number, tall: boolean) {
  function box(bx: number, by: number, bw: number, bh: number, at: number) {
    fgLayer
      .add(rect(bx, by - bh, bx + bw, by, { color: "#1c150e", weight: "confident", looseness: 0.07, fill: lit("#42331f", "#241b12") }))
      .appear({ at, duration: 0.3 });
    // Top rail catching the sun, then two darker slat gaps down the face.
    fgLayer
      .add(rect(bx + 2, by - bh, bx + bw - 2, by - bh + 5, { color: "#00000000", weight: "light", fill: { color: "#6b5334", style: "solid" } }))
      .appear({ at, duration: 0.3 });
    for (let k = 1; k <= 2; k++) {
      const sy = by - bh + (bh * k) / 3;
      fgLayer
        .add(rect(bx + 2, sy, bx + bw - 2, sy + 3, { color: "#00000000", weight: "light", fill: { color: "#0e0a06aa", style: "solid" } }))
        .appear({ at, duration: 0.3 });
    }
  }
  box(x, baseY, w, h, 0.2);
  if (tall) box(x + 5, baseY - h, w - 10, h * 0.8, 0.35);
}
crateStack(120, 452, 42, 30, true);
crateStack(392, 448, 36, 26, false);
crateStack(646, 456, 46, 32, true);
crateStack(918, 450, 38, 28, false);
crateStack(1204, 454, 44, 30, true);

// =====================================================================================
// Camera: one slow lateral drift down the street, no follow. panTo takes an ABSOLUTE
// scene-space point to centre on (not a delta), and the viewport's half-width (400) has to
// stay inside the world at every moment — 440..900 keeps 440px of clearance at the left
// edge and 660px at the right, well past the half-viewport margin the stray-pale-rectangle
// bug needs (see quiet-ride.ts's note). No follow() anywhere, so there's no window to
// under-cover either.
// =====================================================================================
const TOTAL = 15.0;
const cam = scene.camera();
cam.panTo(440, H / 2, { at: 0, duration: 0 });
cam.panTo(900, H / 2, { at: 0.6, duration: TOTAL - 0.6, ease: "sine.inOut" });

// =====================================================================================
// Sound: a market murmur SUGGESTED, not recorded — a low pad bed, sparse plucks panned
// across the stereo field (activity happening at different places down the street rather
// than one crowd), a few soft thuds for crates set down, and a short modal piano figure so
// the bed has a shape. Everything quiet enough to sit under the picture.
// =====================================================================================
scene.add(sketch.sound("A2", { at: 0, duration: TOTAL, instrument: "pad", velocity: 0.13 }));
scene.add(sketch.sound("E3", { at: 1.2, duration: TOTAL - 2.2, instrument: "pad", velocity: 0.1 }));

const murmur: [string, number, number][] = [
  ["A4", 1.0, -0.55],
  ["D4", 1.9, 0.4],
  ["E4", 2.7, -0.2],
  ["A3", 3.6, 0.6],
  ["G4", 4.4, -0.45],
  ["D4", 5.3, 0.15],
  ["B3", 6.2, -0.6],
  ["E4", 7.0, 0.5],
  ["A4", 8.1, -0.3],
  ["G3", 9.0, 0.55],
  ["D4", 9.9, -0.5],
  ["E4", 10.9, 0.25],
  ["A3", 11.8, -0.15],
  ["B3", 12.8, 0.45],
];
for (const [pitch, at, pan] of murmur) {
  scene.add(sketch.sound(pitch, { at, duration: 0.5, instrument: "pluck", velocity: 0.16, pan }));
}
for (const [at, pan] of [[2.3, -0.4], [5.8, 0.35], [9.4, -0.25], [12.2, 0.5]] as [number, number][]) {
  scene.add(sketch.sound(null, { at, duration: 0.35, instrument: "thud", velocity: 0.15, pan }));
}
const piano: [string, number][] = [["A3", 2.0], ["C4", 3.4], ["E4", 5.0], ["D4", 7.4], ["A3", 9.6], ["G3", 12.0]];
for (const [pitch, at] of piano) {
  scene.add(sketch.sound(pitch, { at, duration: 1.0, instrument: "piano", velocity: 0.26 }));
}
scene.add(sketch.sound("A3", { at: TOTAL - 2.4, duration: 2.4, instrument: "strings", velocity: 0.18 }));

export default scene;
