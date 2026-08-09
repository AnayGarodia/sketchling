import { sketch } from "../../src/index.js";

// Showcase: the same restraint quiet-crossing.ts/quiet-ride.ts hold to (one small figure,
// naturalistic proportions, no face, huge negative space, look:"ink" + texture:"grain"),
// moved into BRIGHT MIDDAY instead of dusk — proving the restrained register isn't just a
// desaturated palette trick. Real light direction (sun high and slightly left: every form's
// gradient runs light-on-top, distant grass pales toward the horizon, cloud tops white and
// undersides cool), real color saturation, and a windy day carried by three things moving at
// three different rates: foreground grass bending on spring lag, a kite floating on its own
// (much slower, much floatier) spring, and a child running under both.
//
// The wind is ONE authored rhythm, two drivers: `windDriver` (grass, ~10px of sway) and
// `gustDriver` (the kite, up to ~30px and mostly vertical, inside the child's own group) share
// gust times but not amplitudes — one shared driver would have forced the grass to sway as far
// as the kite swings, since a spring's steady-state displacement IS its driver's.
//
// Everything about the kite lives INSIDE the child's group on purpose. `sketch.connector`'s
// anchor is a fixed point, not a node, so a string tied to a hand that translates 660px
// across the field can only work if the hand and the kite share one moving parent: the
// anchor is then a fixed point in the group's own local space, and the connector tracks only
// the kite's own local (spring-driven) offset — which is exactly what connector/springTo
// read anyway ("a target whose motion comes from an animated ancestor reads as stationary").

// 1700 wide for a 654px run, which is more slack than the travel alone needs — the binding
// constraint is the depth-1.15 foreground layer, which at the pan's far end frames layer-space
// out to ~1572. Authored at 1560 wide (first pass) the last blades in that fringe had to sit
// past the world's own right edge to avoid a visible gap there, which Tier 0 correctly flagged
// as content rendering fully off-canvas. A layer with depth > 1 always needs more world than
// the camera's own travel does.
const WORLD_W = 1700;
// World height == viewport height deliberately. The camera only ever pans horizontally
// (cy stays pinned at H/2), which keeps every parallax layer's vertical offset identical —
// layerCy = worldCy + (cy - worldCy) * depth is worldCy for EVERY depth when cy == worldCy.
// That matters: quiet-ride.ts's stray pale band at the bottom of frame is what happens when
// cy leaves worldCy (camera.follow tracks its target's y), because the backdrop sits on its
// own depth-0 plane and doesn't follow the depth-1 ground up. Panning x-only can't produce
// it, and it also keeps a depth-0.4 treeline welded to the horizon the depth-1 field draws.
const H = 420;
const VIEW_W = 640;
const HORIZON_Y = 288;
const NEAR_Y = 344;
// The child's own footing line — a few px inside the near band's top edge, so he stands IN
// the field with grass both behind and in front of him, not on the horizon line itself.
const GROUND_Y = 350;

// Deterministic scatter (mulberry32) — Math.random would redraw a different field on every
// build, which makes "did my change do that?" unanswerable across renders.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(0x6b17e);

/** Center of the union bbox of several authored point arrays. springTo resolves its target
 * as `driver's own bbox center + driver's translate + offset`, and starts the spring at the
 * SPRING node's own bbox center — so an invisible driver parked exactly at the spring node's
 * bbox center (with offset [0,0]) is the only placement where the rest pose holds still
 * instead of snapping somewhere else on frame 1. Computed here rather than eyeballed. */
function centerOf(groups: [number, number][][]): [number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pts of groups) {
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/** A 2x2 transparent square — an invisible springTo driver whose bbox center is exact
 * (a radius-1 blob's wobbled outline isn't). */
function driverAt(x: number, y: number) {
  return sketch.loop(
    [[x - 1, y - 1], [x + 1, y - 1], [x + 1, y + 1], [x - 1, y + 1]],
    { color: "transparent", weight: "light", looseness: 0, fill: { color: "transparent", style: "solid" }, smooth: false }
  );
}

const scene = sketch.scene({
  width: WORLD_W,
  height: H,
  viewport: { width: VIEW_W, height: H },
  // Clear midday sky: a real blue overhead falling to warm pale haze at the horizon. Not a
  // desaturated dusk ramp — the top stop is the most saturated color in the whole frame.
  background: {
    stops: [
      { offset: 0, color: "#3d82c0" },
      { offset: 0.3, color: "#6ea7d3" },
      { offset: 0.5, color: "#9cc6e0" },
      { offset: 0.63, color: "#c9dee5" },
      { offset: 0.69, color: "#e8ebd7" },
      { offset: 1, color: "#d9e1bd" },
    ],
    direction: "vertical",
  },
  seed: "kite-field",
  look: "ink",
  texture: "grain",
});

// --- Clouds, depth 0.22: high cumulus, drifting downwind (to the right) at a rate the
// camera's own pan barely competes with. Tops white, undersides cool blue-grey — the same
// overhead key light every other form in the frame is lit by. -------------------------------
function cloudPoints(cx: number, cy: number, w: number, h: number): [number, number][] {
  return [
    [cx - w / 2, cy + h * 0.34],
    [cx - w * 0.44, cy - h * 0.06],
    [cx - w * 0.27, cy - h * 0.48],
    [cx - w * 0.04, cy - h * 0.26],
    [cx + w * 0.13, cy - h * 0.6],
    [cx + w * 0.35, cy - h * 0.22],
    [cx + w * 0.47, cy + h * 0.1],
    [cx + w / 2, cy + h * 0.36],
    [cx + w * 0.18, cy + h * 0.45],
    [cx - w * 0.22, cy + h * 0.43],
  ];
}

// Authored only across the x-range this depth actually shows: at depth 0.22 a camera centre
// moving 520 -> 1200 only ever frames layer-space ~457..1247, so clouds outside that band
// would be wasted work that never appears.
const cloudLayer = scene.layer(0.22);
const clouds: [number, number, number, number][] = [
  [462, 70, 180, 46],
  [700, 126, 118, 30],
  // Kept left of where the kite ends up: at 960 this one sat directly behind the settled kite
  // and swallowed its top corner into a white field.
  [890, 58, 214, 52],
  [1180, 118, 132, 34],
];
for (const [cx, cy, cw, ch] of clouds) {
  // Outline in the fill's own top color rather than a contrasting one — a visible sketched
  // edge all the way round turned these into cartoon cloud stickers; letting the gradient's
  // cool underside do the shaping keeps them soft.
  const c = sketch.loop(cloudPoints(cx, cy, cw, ch), {
    color: "#fdfefe",
    weight: "light",
    looseness: 0.16,
    fill: {
      color: { stops: [{ offset: 0, color: "#ffffff" }, { offset: 0.62, color: "#f3f6f6" }, { offset: 1, color: "#cfdbe3" }], direction: "vertical" },
      style: "solid",
    },
  });
  cloudLayer.add(c).appear({ at: 0.1, duration: 0.9 });
  // 13s, not 15: this drift is the single longest tween in the scene, so it — not the kite or
  // the run — is what sets tl.duration(), and every springTo then reserves its own settle
  // window on top of that (~2.2s for the kite's damping of 4.2). At 15s the whole piece ran
  // 17.2s, two of them a static hold nobody asked for.
  c.moveBy(46, 0, { at: 0, duration: 13, ease: "none" });
}

// --- Depth 0.4: the far treeline. Hazy blue-green, low, one continuous lumpy band — real
// atmospheric perspective at midday reads as PALER and cooler with distance, which is a
// different thing from an overall desaturated palette. ---------------------------------------
const farLayer = scene.layer(0.4);
const treeTop: [number, number][] = [];
for (let x = 300; x <= 1400; x += 26) {
  const bump = 12 + Math.sin(x / 61) * 6 + Math.cos(x / 143) * 7 + rand() * 5;
  treeTop.push([x, HORIZON_Y - bump]);
}
// The band's bottom edge is dropped well BELOW the horizon (not a few px under it) so the
// depth-1 field paints over it. Left near the horizon, that edge is a dead-straight pale
// blue-grey line running the full width of the field — the treeline is a closed loop, so it
// has a bottom outline whether the composition wants one or not.
farLayer.add(
  sketch.loop(
    [...treeTop, [1400, HORIZON_Y + 40], [300, HORIZON_Y + 40]],
    {
      color: "#8aa79b",
      weight: "light",
      looseness: 0.2,
      fill: {
        color: { stops: [{ offset: 0, color: "#a6c0b0" }, { offset: 1, color: "#8ba699" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 0.2, duration: 1.0 });

// --- Depth 0.62: three nearer trees standing on the same horizon, greener and a touch
// darker than the treeline behind them. Because the camera never pans vertically, a tree
// based at HORIZON_Y on this plane stays welded to the horizon the depth-1 field draws.
const midLayer = scene.layer(0.62);
function midTree(x: number, scale: number) {
  const g = sketch.group();
  midLayer.add(g);
  const trunkH = 26 * scale;
  g.add(
    sketch.loop(
      [[x - 3.5, HORIZON_Y + 2], [x + 3.5, HORIZON_Y + 2], [x + 2, HORIZON_Y - trunkH], [x - 2, HORIZON_Y - trunkH]],
      { color: "#5d6b4a", weight: "light", looseness: 0.12, fill: { color: "#5d6b4a", style: "solid" }, smooth: false }
    )
  );
  // 16 vertices, not 11: at 11 the canopy came out visibly polygonal — a blocky green lump
  // on a tree this small rather than a mass of leaves.
  const r = 15 * scale;
  const canopy: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = r * (1 + Math.sin(i * 2.3) * 0.11);
    canopy.push([x + Math.cos(a) * rr * 1.15, HORIZON_Y - trunkH - 6 + Math.sin(a) * rr * 0.85]);
  }
  g.add(
    sketch.loop(canopy, {
      color: "#6d8a63",
      weight: "light",
      looseness: 0.24,
      fill: {
        color: { stops: [{ offset: 0, color: "#93ac78" }, { offset: 1, color: "#657f5b" }], direction: "vertical" },
        style: "solid",
      },
    })
  );
  return g;
}
// Placed so none of them ever sits at the child's own screen position while he's running.
// At depth 0.62 a tree crosses the frame's x:280 (where the tracking camera holds him) when
// this layer's own centre passes treeX + 40 — over the run that centre sweeps 645 -> 1051, so
// anything authored between x:605 and x:1011 gets walked straight through. The middle tree was
// at 700 on the first pass and the child's head passed clean through its canopy, the same
// mistake quiet-crossing.ts's walker made with its one bare tree.
midTree(330, 1.0).appear({ at: 0.35, duration: 0.8 });
midTree(1075, 0.8).appear({ at: 0.45, duration: 0.8 });
midTree(1310, 1.1).appear({ at: 0.55, duration: 0.8 });

/** A field band's top edge: a long, gentle undulation rather than a ruled line. */
function bandTop(yBase: number, amp: number, phase: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let x = -70; x <= WORLD_W + 70; x += 120) {
    pts.push([x, yBase + Math.sin(x / 215 + phase) * amp + Math.cos(x / 89 + phase) * amp * 0.35]);
  }
  return pts;
}

// --- Depth 1: the field itself, in two bands. The far band is pale, warm and sun-bleached;
// the near band (the one the child actually stands on) is deeper and greener. Both run the
// full world width — panning past the end of a foreground shape reveals bare backdrop.
//
// Only the NEAR band draws itself on; the far one (which has to cover everything down to the
// world's bottom edge, ~180px of height) fades in with `appear` instead. That split isn't an
// aesthetic choice: drawOn reveals a filled shape's interior with a zigzag "coloring in"
// scribble whose row count is CAPPED at 16, at a stroke width derived from the shape's own
// stroke weight (~10px here). Past roughly 160px of height the rows sit further apart than
// they are wide and the gaps between them never close — drawn on, this band left four
// permanent pale hairlines across the field that read as mown stripes and took a zoomed crop
// to identify. The near band is 126px tall, under the threshold, so it reveals cleanly and
// still gives the shot its one hand-drawing-the-world beat.
scene.add(
  sketch.loop(
    [...bandTop(HORIZON_Y, 5, 0.7), [WORLD_W + 70, H + 40], [-70, H + 40]],
    {
      color: "#8b9b52",
      weight: "confident",
      looseness: 0.08,
      fill: {
        color: { stops: [{ offset: 0, color: "#c6ce82" }, { offset: 0.22, color: "#adbe6a" }, { offset: 1, color: "#87a352" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).appear({ at: 0, duration: 0.9 });

scene.add(
  sketch.loop(
    [...bandTop(NEAR_Y, 7, 2.1), [WORLD_W + 70, H + 40], [-70, H + 40]],
    {
      // Edge color close to the fill's own top stop: a darker outline on a band this wide
      // reads as a ruled stripe across the field rather than as where taller grass starts.
      color: "#8aa855",
      weight: "confident",
      looseness: 0.1,
      fill: {
        color: { stops: [{ offset: 0, color: "#a2b95f" }, { offset: 0.3, color: "#87a84f" }, { offset: 1, color: "#5c8340" }], direction: "vertical" },
        style: "solid",
      },
    }
  )
).drawOn({ at: 1.0, duration: 1.1 });

/** Two blades meeting at the base, both curving downwind — one stroke per tuft. An earlier
 * version used a seven-point zigzag, which at 6-14px tall read as a row of little graphic
 * "M"s scattered over the field rather than as grass; a two-blade "V" with the bend authored
 * into it reads correctly at the same cost. */
function tuft(x: number, y: number, h: number, color: string, weight: "light" | "confident") {
  return sketch.stroke(
    [[x - 1.5, y - h * 0.82], [x + 1, y], [x + 4, y - h * 0.55], [x + 6.5, y - h]],
    { color, weight, looseness: 0.22 }
  );
}

// Sparse texture on the field — pale and short far away, deeper and taller close up. Placed
// on a deterministic scatter, kept sparse: restraint is the point, not ground cover.
for (let i = 0; i < 30; i++) {
  const x = 20 + rand() * (WORLD_W - 40);
  const y = HORIZON_Y + 6 + rand() * 44;
  scene.add(tuft(x, y, 5 + rand() * 4, "#9fb463", "light")).appear({ at: 1.2 + rand() * 0.6, duration: 0.5 });
}
for (let i = 0; i < 26; i++) {
  const x = 20 + rand() * (WORLD_W - 40);
  const y = NEAR_Y + 14 + rand() * 58;
  scene.add(tuft(x, y, 9 + rand() * 7, "#63873d", "light")).appear({ at: 1.4 + rand() * 0.6, duration: 0.5 });
}

// --- The wind. Two drivers, ONE rhythm: the same gust times drive the grass (here) and the
// kite (KITE_GUSTS, further down), at very different amplitudes — a gust lifts a kite 30px
// and bends a grass blade 10. Sharing one driver would have forced those to be equal, since
// a spring's offset is fixed and its steady-state displacement is the driver's, exactly.
// GRASS_GUSTS' net displacement sums to ~zero on both axes, so the field sways around its
// authored lean instead of creeping steadily downwind over the whole shot.
const GRASS_GUSTS: [number, number, number, number][] = [
  [0.2, 7, -2, 1.3],
  [1.5, 9, -3, 1.6],
  [3.1, -10, 3, 1.3],
  [4.4, 13, -5, 1.4],
  [5.8, -12, 4, 1.5],
  [7.3, 10, -3, 1.6],
  [8.9, -11, 4, 1.3],
  [10.2, 9, -3, 1.5],
  [11.4, -12, 4, 1.7],
];
// Parked inside the world (transparent, 2x2) rather than off-canvas the way nightfall-hill.ts
// leaves its own drivers — it costs nothing here and keeps Tier 0's "renders fully
// off-canvas" error out of this scene's lint output entirely.
const WIND_X = WORLD_W / 2;
const WIND_Y = 404;
const windDriver = driverAt(WIND_X, WIND_Y);
scene.add(windDriver);
for (const [at, dx, dy, dur] of GRASS_GUSTS) {
  windDriver.moveBy(dx, dy, { at, duration: dur, ease: "sine.inOut" });
}

/** Tall grass: a connector from a fixed base to a springTo'd tip node, the nightfall-hill.ts
 * technique at midday color. Tips are authored ALREADY leaning downwind (a windy day's grass
 * is never vertical), and the shared wind driver adds sway on top with spring lag, so no two
 * blades in a cluster reach their extreme at quite the same moment. */
function grassCluster(layer: ReturnType<typeof scene.layer>, gx: number, baseY: number, height: number, colors: string[]) {
  for (let b = 0; b < 5; b++) {
    // Base x/y jittered per blade, not evenly spaced: five blades on an exact 17px pitch,
    // repeated on an exact cluster pitch, read as a picket fence rather than as grass.
    const bx = gx + b * 17 - 34 + rand() * 13;
    const hh = height * (0.6 + rand() * 0.62);
    const tipX = bx + 9 + rand() * 10;
    const tipY = baseY - hh - rand() * 8;
    const tip = driverAt(tipX, tipY);
    layer.add(tip);
    tip.springTo(windDriver, { offset: [tipX - WIND_X, tipY - WIND_Y], stiffness: 46 + b * 7, damping: 5.6 });
    layer.add(sketch.connector([bx, baseY], tip, { color: colors[b % colors.length], weight: b % 2 ? "light" : "confident", looseness: 0.18 }));
  }
}

// Foreground fringe at depth 1.15 — sweeps past faster than the field, the parallax cue that
// says the camera is really travelling. Based below the frame's bottom edge so only the top
// two-thirds of each blade is ever in shot, and topping out just BELOW the child's footing
// line so it never hides the gait it's meant to frame. Depth 1.15 rather than nightfall's
// 1.35 keeps the world it needs (see WORLD_W) from having to grow much wider than the run.
const foreground = scene.layer(1.15);
for (let x = 150; x <= 1545; x += 105) {
  grassCluster(foreground, x, 448 + rand() * 10, 96, ["#3f6b34", "#5b8940", "#365d2c", "#6a9445", "#3b6630"]);
}

// --- The child. Colored, not a silhouette (midday, fully lit) — but the restraint is the
// same: no face at all, naturalistic ~5.4-heads proportions, muted clothing (dusty terracotta
// and slate, no primary/candy hues), every form shaded top-lit. Authored in LOCAL coordinates
// with y:0 at the soles, so `initial({x, y: GROUND_Y})` plants the feet exactly on the footing
// line instead of landing a bbox center there and floating.
const SHIRT_EDGE = "#7d3c2c";
const SKIN_EDGE = "#8d6244";

function buildChild() {
  const flyer = sketch.group();
  scene.add(flyer);

  // Midday shadow: small, directly underfoot, no soft edge to fake — the one cue that keeps
  // a colored figure from looking pasted onto the field. It sits inside the flyer group, so it
  // rides the stride's 6px lift with him instead of staying on the ground; separating it would
  // mean duplicating all 23 strides' horizontal tweens on a second node, and at 6px and this
  // cadence it isn't visible in motion.
  flyer.add(
    sketch.loop(
      [[-17, 0], [-7, -4], [11, -3.5], [19, 0.5], [9, 4], [-9, 3.5]],
      { color: "transparent", weight: "light", looseness: 0.2, fill: { color: "#33502a7d", style: "solid" } }
    )
  );

  // Each leg is a group (thigh-to-ankle wedge + shoe) pivoted at its own hip point, so
  // rotateTo swings it from the hip like a real leg. Fully inside the torso's own outline at
  // the top, so a 30-degree swing can't open a seam at the joint.
  function leg(dir: number) {
    const g = sketch.group();
    g.add(
      sketch.loop(
        [[-3.5 + dir, -34], [3.5 + dir, -34], [2.5 + dir, -7], [-2.5 + dir, -7]],
        {
          color: SKIN_EDGE,
          weight: "light",
          looseness: 0.1,
          fill: { color: { stops: [{ offset: 0, color: "#dcac80" }, { offset: 1, color: "#bd8a61" }], direction: "vertical" }, style: "solid" },
        }
      )
    );
    g.add(
      sketch.loop(
        [[-3 + dir, -7], [3.5 + dir, -7], [5.5 + dir, -2.5], [4.5 + dir, 0], [-2.5 + dir, -0.5]],
        { color: "#33291f", weight: "light", looseness: 0.12, fill: { color: "#463a2c", style: "solid" }, smooth: false }
      )
    );
    g.pivotAt(dir, -34);
    return g;
  }
  const legB = leg(-2.5);
  const legF = leg(2.5);
  flyer.add(legB);
  flyer.add(legF);

  // Torso + arms + head + hair as one sub-group pivoted at the hip, so the whole upper body
  // rocks a couple of degrees per stride and can lean back to watch the kite at the end.
  //
  // The arms are thick STROKES rooted a few px inside the torso's own outline, not shapes
  // fused into it and not separately rotated limbs. quiet-crossing.ts's lesson was that a
  // rotated limb pivoting on the body's edge visibly detaches — the fix there was fusing the
  // arm into one silhouette, which works for a dark silhouette but not here: fused as filled
  // wedges at this scale (first pass) the two arms read as a club and a cape rather than
  // limbs, because a Catmull-Rom spline through a 6px-wide "finger" bulges it back out to
  // ~10px. A stroke of weight 5 with a round cap IS an arm at 80px figure height, and since
  // it only ever moves with the torso group it shares, there's no joint that can open.
  const torso = sketch.group();
  torso.add(
    sketch.loop(
      [[-7, -62], [4, -63], [8, -59], [9, -46], [8, -36], [-8, -35], [-9, -46], [-8, -57]],
      {
        color: SHIRT_EDGE,
        weight: "light",
        looseness: 0.12,
        fill: { color: { stops: [{ offset: 0, color: "#c56f50" }, { offset: 1, color: "#8f4633" }], direction: "vertical" }, style: "solid" },
      }
    )
  );
  // Trailing arm, elbow bent with the forearm swung back and UP (the counter-swing of a real
  // run); raised arm reaching up to the string. Both start inside the torso (x within +/-6 of
  // its centre line) so no shoulder seam is possible. Authored angling down at first, the
  // trailing arm read as limp — a dangling noodle rather than a runner's backswing.
  torso.add(sketch.stroke([[-5, -57], [-14, -52], [-18, -59]], { color: "#b06148", weight: 5, looseness: 0.1 }));
  torso.add(sketch.stroke([[5, -59], [14, -69], [20, -77]], { color: "#c06c50", weight: 5, looseness: 0.1 }));
  // The hand: small, but it's where the string is tied, so it wants to be a readable shape
  // rather than implied by the arm's cap alone.
  torso.add(
    sketch.loop(
      [[19, -81], [24, -80], [25, -76], [20, -75.5]],
      { color: SKIN_EDGE, weight: "light", looseness: 0.1, fill: { color: "#dcac80", style: "solid" } }
    )
  );
  torso.add(
    sketch.loop(
      [[-8, -38], [8, -39], [7, -28], [-7, -27]],
      {
        color: "#2f3947",
        weight: "light",
        looseness: 0.12,
        fill: { color: { stops: [{ offset: 0, color: "#586a80" }, { offset: 1, color: "#3a4756" }], direction: "vertical" }, style: "solid" },
      }
    )
  );
  // Head painted after the torso so it sits ON the shoulders (2px of overlap) instead of
  // leaving the neck gap a silhouette can get away with but a colored figure can't.
  torso.add(
    sketch.blob(0, -73.5, 8, {
      color: SKIN_EDGE,
      weight: "light",
      looseness: 0.08,
      fill: { color: { stops: [{ offset: 0, color: "#e2b485" }, { offset: 1, color: "#c39167" }], direction: "vertical" }, style: "solid" },
    }, 14)
  );
  // Hair swept downwind (right), the same direction the grass bends and the kite hangs — a
  // coherent wind read beats the "hair trails backward" running cliché fighting it.
  torso.add(
    sketch.loop(
      [[-8, -75.5], [-4, -81.5], [3, -81.5], [8.5, -77.5], [14, -74], [9.5, -73], [4, -75.5], [-3, -76.5]],
      { color: "#2f231b", weight: "light", looseness: 0.14, fill: { color: "#3b2b21", style: "solid" } }
    )
  );
  torso.pivotAt(0, -34);
  flyer.add(torso);

  return { flyer, legB, legF, torso };
}

const child = buildChild();
const HAND: [number, number] = [22, -79];

// --- The kite. A real diamond (smooth:false — a Catmull-Rom through four points would round
// it into a lozenge), warm rust with a cream lower panel, sunlit top / shadowed bottom, spars
// drawn, a lazy tail with three bows. Nested two deep on purpose: the OUTER group carries the
// spring (position), the INNER one carries the tilt (rotation), so the two never fight over
// the same element's transform.
const KX = 140;
const KY = -230;
const kiteHolder = sketch.group();
const kiteArt = sketch.group();
kiteHolder.add(kiteArt);

const kiteFace: [number, number][] = [[KX, KY - 34], [KX + 30, KY], [KX, KY + 34], [KX - 30, KY]];
const kitePanel: [number, number][] = [[KX, KY], [KX - 30, KY], [KX, KY + 34]];
const kiteSpine: [number, number][] = [[KX, KY - 33], [KX, KY + 33]];
const kiteSpar: [number, number][] = [[KX - 29, KY], [KX + 29, KY]];
const kiteTail: [number, number][] = [[KX, KY + 34], [KX + 11, KY + 52], [KX + 4, KY + 70], [KX + 17, KY + 88]];
const bows: [number, number][] = [[KX + 10, KY + 52], [KX + 4, KY + 70], [KX + 16, KY + 86]];

kiteArt.add(
  sketch.loop(kiteFace, {
    color: "#7d3324",
    weight: "confident",
    looseness: 0.1,
    fill: { color: { stops: [{ offset: 0, color: "#dc8354" }, { offset: 1, color: "#a4422d" }], direction: "vertical" }, style: "solid" },
    smooth: false,
  })
);
kiteArt.add(
  sketch.loop(kitePanel, {
    color: "#c2ae87",
    weight: "light",
    looseness: 0.1,
    fill: { color: "#efe1c1", style: "solid" },
    smooth: false,
  })
);
kiteArt.add(sketch.stroke(kiteSpine, { color: "#4a3a2b", weight: "light", looseness: 0.08 }));
kiteArt.add(sketch.stroke(kiteSpar, { color: "#4a3a2b", weight: "light", looseness: 0.08 }));
kiteArt.add(sketch.stroke(kiteTail, { color: "#8f4a33", weight: "light", looseness: 0.2 }));
for (const [bx, by] of bows) {
  kiteArt.add(
    sketch.loop(
      [[bx - 4.5, by - 3], [bx + 4.5, by - 2], [bx + 4, by + 3], [bx - 4, by + 2]],
      { color: "#c2ae87", weight: "light", looseness: 0.15, fill: { color: "#f0e4c6", style: "solid" }, smooth: false }
    )
  );
}

// The kite's own gust driver, parked at the kite group's exact bbox center (see centerOf) so
// offset [0,0] leaves the rest pose untouched. Soft spring: stiffness 20 / damping 4.2 gives
// a ~1.4s natural period with real overshoot — a kite floats and hunts after a gust, it
// doesn't snap to a new position the way a stiffer spring (the grass's 52) would.
const [kcx, kcy] = centerOf([kiteFace, kitePanel, kiteSpine, kiteSpar, kiteTail, ...bows.map(([bx, by]): [number, number][] => [[bx - 4.5, by - 3], [bx + 4.5, by + 3]])]);
const gustDriver = driverAt(kcx, kcy);
child.flyer.add(gustDriver);
// GRASS_GUSTS' times, the kite's own amplitudes — written out rather than derived with a
// multiplier because the last entry isn't a sway at all: it's the closing climb, mostly
// vertical, after the child has stopped running. (Deriving it and then layering a separate
// climb moveBy on top would put two concurrent tweens on the same x/y, which GSAP resolves
// by whichever renders last rather than by adding them.) Net dy is -52, so the kite finishes
// meaningfully higher than it started; net dx is +29, still comfortably inside frame.
const KITE_GUSTS: [number, number, number, number][] = [
  [0.2, 11, -9, 1.3],
  [1.5, 14, -14, 1.6],
  [3.1, -16, 13, 1.3],
  [4.4, 21, -22, 1.4],
  [5.8, -19, 18, 1.5],
  [7.3, 16, -13, 1.6],
  [8.9, -18, 18, 1.3],
  [10.2, 14, -13, 1.5],
  [11.2, 6, -30, 1.9],
];
for (const [at, dx, dy, dur] of KITE_GUSTS) {
  gustDriver.moveBy(dx, dy, { at, duration: dur, ease: "sine.inOut" });
}

// The string: anchored at the hand (a fixed point in the flyer's local space), tracking the
// kite's live spring-driven offset, bowed through a synthetic midpoint — so it sags and
// straightens as the kite hunts, instead of being a rigid rotating stick.
// weight 1 and a translucent warm grey, not "light" (1.5px, opaque): at 1.5px with ink
// roughness the string rendered as a dark cable thicker than the kite's own spars.
child.flyer.add(
  sketch.connector(HAND, kiteHolder, { color: "#4a453695", weight: 1, looseness: 0.1 })
);
child.flyer.add(kiteHolder);
kiteHolder.springTo(gustDriver, { offset: [0, 0], stiffness: 20, damping: 4.2 });

// --- The run. A light, quick, naturalistic gait: 20 strides at 100px/sec, alternating leg
// swings solved so the planted foot barely slides (a 28px hip-to-ankle leg at 30 degrees
// carries the ankle 14px, so a 30px stride is very close to slip-free), an asymmetric lift
// (6px then 3.5px) that reads as a skip rather than a metronomic bounce, and a 2-degree
// torso rock. No squashTo anywhere — weight comes from the timing, not from deformation.
const START_X = 480;
const RUN_START = 1.9;
const STEP_DX = 30;
const STEP_DUR = 0.3;
const FAST_STEPS = 20;
// Three decelerating strides instead of an abrupt stop — the difference between a child
// slowing to a stand and one hitting an invisible wall.
const DECEL: [number, number][] = [[26, 0.38], [18, 0.48], [10, 0.62]];

child.flyer.initial({ x: START_X, y: GROUND_Y });
child.flyer.appear({ at: 1.4, duration: 0.5 });

let t = RUN_START;
let travelled = 0;
const strides: [number, number][] = [
  ...Array.from({ length: FAST_STEPS }, (): [number, number] => [STEP_DX, STEP_DUR]),
  ...DECEL,
];
strides.forEach(([dx, dur], i) => {
  const lead = i % 2 === 0;
  const settling = i >= FAST_STEPS;
  const lift = settling ? 2 : lead ? 6 : 3.5;
  const swing = settling ? 30 - (i - FAST_STEPS) * 8 : 30;

  // Forward travel and the stride's lift ride on the SAME two tweens (one per half-stride)
  // rather than a horizontal tween with two vertical ones layered over it. moveBy writes BOTH
  // x and y ("+=dx", "+=dy"), so a concurrent moveBy(0, -lift) also asserts x "+=0" — and two
  // live tweens on one property resolve to whichever renders last, not to their sum. Authored
  // the layered way (first pass) the child advanced roughly a third of the intended distance
  // while the camera tracked the full amount, and simply slid out of frame to the left. Not a
  // visible error anywhere: nothing warns, the still just quietly has no child in it.
  child.flyer.moveBy(dx * 0.45, -lift, { at: t, duration: dur * 0.45, ease: "sine.out" });
  child.flyer.moveBy(dx * 0.55, lift, { at: t + dur * 0.45, duration: dur * 0.55, ease: "sine.in" });
  child.legF.rotateTo(lead ? swing : -swing * 0.85, { at: t, duration: dur, ease: "sine.inOut" });
  child.legB.rotateTo(lead ? -swing * 0.85 : swing, { at: t, duration: dur, ease: "sine.inOut" });
  child.torso.rotateTo(lead ? 5.5 : 3.5, { at: t, duration: dur, ease: "sine.inOut" });

  t += dur;
  travelled += dx;
});
const RUN_END = t;
const END_X = START_X + travelled;

// Settle to a stand, then lean back to watch the kite climb — with no face to point at
// anything, the torso's own tilt is what "looking up" has to be made of.
child.legF.rotateTo(7, { at: RUN_END, duration: 0.5, ease: "sine.out" });
child.legB.rotateTo(-7, { at: RUN_END, duration: 0.5, ease: "sine.out" });
child.torso.rotateTo(1.5, { at: RUN_END, duration: 0.5, ease: "sine.out" });
child.torso.rotateTo(-4, { at: RUN_END + 0.5, duration: 1.2, ease: "sine.inOut" });

// The kite's tilt, on the inner group so it never contends with the spring driving the outer
// one: top leaning downwind on a gust, righting itself in the lulls, and steadier than either
// on the closing climb.
KITE_GUSTS.forEach(([at, dx, , dur], i) => {
  const last = i === KITE_GUSTS.length - 1;
  kiteArt.rotateTo(last ? 8 : dx > 0 ? 13 : 3, { at, duration: dur, ease: "sine.inOut" });
});

// --- Seed fluff carried downwind across the field: two long, slow, near-weightless emitters
// (negative gravity, so they rise rather than fall). Sparse on purpose — a dense particle
// field would read as snow, not as a warm windy afternoon.
for (const [px, py, at] of [[560, 300, 1.6], [980, 322, 4.2]] as [number, number, number][]) {
  scene.add(
    sketch.particles(px, py, { color: "#f7f1dcc4" }, {
      count: 7, angle: -12, spread: 34, speedMin: 26, speedMax: 62,
      gravity: -5, lifetime: 4, duration: 7, at, sizeMin: 1.1, sizeMax: 1.8,
    })
  );
}

// A few short foreground blades in the DEFAULT depth-1 plane, added after the child so they
// paint in front of him — grass at the ankles as he passes, which also means the exact
// foot-to-ground contact never has to be pixel-perfect.
for (let i = 0; i < 14; i++) {
  const x = 430 + i * 62 + rand() * 26;
  scene.add(tuft(x, GROUND_Y + 6 + rand() * 10, 11 + rand() * 6, "#4f7434", "confident")).appear({ at: 1.5, duration: 0.5 });
}

// --- Camera: a steady horizontal track with the run (linear, so the child's own sine-eased
// strides visibly breathe against the frame instead of being welded to its center), then a
// barely-perceptible drift toward the kite once he stops. panTo takes an ABSOLUTE scene-space
// point to center on: worldCy = H/2 = 210 is passed on every call so cy never leaves the
// world's own vertical center (see the H comment at the top). No camera.follow() anywhere —
// follow tracks its target's y as well as its x, which is exactly what would break that.
const LEAD = 40; // the frame sits slightly ahead of the child, into the space he's running into
const cam = scene.camera();
cam.panTo(START_X + LEAD, H / 2, { at: 0, duration: 0 });
cam.panTo(END_X + LEAD, H / 2, { at: RUN_START, duration: RUN_END - RUN_START, ease: "none" });
cam.panTo(END_X + LEAD + 26, H / 2, { at: RUN_END + 0.6, duration: 3.0, ease: "sine.inOut" });

// --- Sound: a light major-key bed, not a childish one. Two held pads a fifth apart for the
// wind, one soft brush per gust (the only percussion in the scene), a simple D-major piano
// phrase over the run, and a strings chord under the closing climb.
scene.add(sketch.sound("D2", { at: 0, duration: 13.2, instrument: "pad", velocity: 0.13 }));
scene.add(sketch.sound("A2", { at: 0.4, duration: 12.6, instrument: "pad", velocity: 0.1 }));
for (const [at, dx, , dur] of GRASS_GUSTS) {
  scene.add(sketch.sound(null, { at, duration: dur * 0.5, instrument: "brush", velocity: dx > 0 ? 0.18 : 0.11 }));
}
const melody: [string, number][] = [
  ["A3", 0.3], ["D4", 1.05], ["E4", 1.8], ["F#4", 2.5],
  ["A4", 3.5], ["F#4", 4.25], ["E4", 5.0], ["D4", 5.7],
  ["E4", 6.7], ["D4", 7.45], ["B3", 8.2], ["A3", 8.9],
];
for (const [pitch, offset] of melody) {
  scene.add(sketch.sound(pitch, { at: RUN_START + offset, duration: 0.85, instrument: "piano", velocity: 0.26 }));
}
for (const pitch of ["D3", "A3", "F#4"]) {
  scene.add(sketch.sound(pitch, { at: 11.2, duration: 2.0, instrument: "strings", velocity: 0.19 }));
}

export default scene;
