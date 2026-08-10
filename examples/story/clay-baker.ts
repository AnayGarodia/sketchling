import { sketch } from "../../src/index.js";
import type { Group } from "../../src/core/group.js";
import type { Limb } from "../../src/core/limb.js";
import type { Scene } from "../../src/core/scene.js";
import type { Stroke } from "../../src/core/stroke.js";

// "Piece of Cake" — a stop-motion short in five scenes, look: "clay" throughout.
//
// A clumsy clay baker sets out to make a cake, with total confidence. The batter
// explodes. The rebuilt three-layer tower survives the carry, survives the wobble,
// survives everything — until a single fly lands on the cherry. Then the flour sack
// on the shelf finishes the job. Payoff: one surviving cupcake, one candle, one
// hand-lettered verdict.
//
// The clay look quantizes time to a ~10fps hold, which is the whole comic engine
// here: a beat held slightly too long before the mess reads as stop-motion comic
// timing rather than dead air. Every deliberate pause below (the lean-in before the
// batter blows, the fly's landing before the collapse, the sack's slow tilt) is
// authored to sit across several of those held frames.
//
// Register: bright clay colors, solid fills (clay forces them anyway), pop-in
// entrances with a squash settle instead of pen-traced drawOns — things being
// PLACED on the set between frames, the way stop-motion props actually arrive.

type Pt = [number, number];

const W = 640;
const H = 420;

const INK = "#33241a";
const WALL = "#f2ddb4";
const WALL_TRIM = "#e4c48c";
const FLOOR = "#c99860";
const WOOD = "#a76b38";
const WOOD_DARK = "#8a5527";
const SHIRT = "#d1543f";
const APRON = "#f6efdd";
const SKIN = "#eec39a";
const HAT = "#faf5ea";
const BOWL = "#4f8a8b";
const BATTER = "#e0b054";
const FLOUR = "#f6f0e3";
const SPONGE = "#c98a4b";
const ICING = "#eda3b6";
const CHERRY = "#c0392b";

// ---------------------------------------------------------------------------------
// The baker — one builder, reused in every scene he appears in. Authored in a local
// space whose origin is the waist; group translated into place with initial({x, y}).
// Arms are 2-bone IK limbs so a reach reads as a hand leading and an elbow solving
// itself, not two tweened segments. The hat and the eyes come back as refs — the hat
// flies off in scene 3, the eyes blink for the comic beats.
// ---------------------------------------------------------------------------------

interface Baker {
  group: Group;
  armNear: Limb;
  armFar: Limb;
  hat: Group;
  eyeL: Stroke;
  eyeR: Stroke;
  /** Scene coords → the group's local (pre-translate) space, for ikTo targets. */
  local: (sx: number, sy: number) => Pt;
  /** Group rotation pivot from a LOCAL point (pivotAt wants translate + local). */
  pivotLocal: (px: number, py: number) => void;
}

function buildBaker(
  scene: Scene,
  o: { x: number; y: number; s?: number; facing?: 1 | -1; seated?: boolean; armLen?: [number, number] }
): Baker {
  const s = o.s ?? 1;
  const f = o.facing ?? 1;
  const [AL1, AL2] = o.armLen ?? [32, 28];
  const P = (p: Pt): Pt => [p[0] * s * f, p[1] * s];
  const g = sketch.group();
  scene.add(g);

  const solid = (color: string) => ({ color, style: "solid" as const });

  if (o.seated) {
    // Legs splayed out on the floor in front of him — the defeated sit.
    g.add(
      sketch.loop([P([2, 8]), P([34, 22]), P([40, 34]), P([30, 38]), P([0, 26])], {
        color: INK, weight: "confident", looseness: 0.18, smooth: true, fill: solid("#5a4632"),
      })
    );
    g.add(
      sketch.loop([P([-4, 12]), P([22, 30]), P([24, 42]), P([12, 44]), P([-8, 28])], {
        color: INK, weight: "confident", looseness: 0.18, smooth: true, fill: solid("#6b543c"),
      }).lintIgnore("overlap")
    );
  } else {
    // Two stubby legs and two little clay shoes.
    for (const side of [-1, 1] as const) {
      g.add(
        sketch.loop([P([side * 14 - 6, 16]), P([side * 14 + 6, 16]), P([side * 14 + 5, 36]), P([side * 14 - 5, 36])], {
          color: INK, weight: "confident", looseness: 0.15, smooth: true, fill: solid("#5a4632"),
        })
      );
      g.add(
        sketch.ellipse(P([side * 14 + 2 * f, 38])[0], P([side * 14 + 2 * f, 38])[1], 9 * s, 5 * s, {
          color: INK, weight: "confident", looseness: 0, fill: solid("#3f2f21"),
        })
      );
    }
  }

  // Far arm behind the torso.
  const limbStyle = { weight: Math.max(3, 7 * s), looseness: 0.14, energy: "calm" as const, smooth: true };
  const armFar = sketch
    .limb(P([-14, -42])[0], P([-14, -42])[1], AL1 * s, AL2 * s, { ...limbStyle, color: "#b04532" }, {
      bend: (f === 1 ? -1 : 1), capRadius: 5.5 * s, capColor: SKIN,
    })
    .restAt(P([-30, -6])[0], P([-30, -6])[1]);
  g.add(armFar);

  // Pear body in shirt red, shaded like a pressed clay form.
  g.add(
    sketch.loop(
      [P([-19, -54]), P([-27, -36]), P([-30, -12]), P([-26, 8]), P([-15, 18]), P([15, 18]), P([26, 8]), P([30, -12]), P([27, -36]), P([19, -54])],
      { color: INK, weight: "confident", looseness: 0.16, smooth: true, fill: { color: sketch.shade(SHIRT, { amount: 0.3 }), style: "solid" } }
    )
  );
  // Apron front — intentionally flush against the body, so the overlap is suppressed.
  g.add(
    sketch.loop([P([-16, -32]), P([16, -32]), P([21, 12]), P([-21, 12])], {
      color: INK, weight: "confident", looseness: 0.14, smooth: true, fill: { color: sketch.shade(APRON, { amount: 0.18 }), style: "solid" },
    }).lintIgnore("overlap")
  );
  // Apron tie — one little bow knot dot.
  g.add(sketch.ellipse(P([0, -32])[0], P([0, -32])[1], 4.5 * s, 3.5 * s, { color: INK, weight: "light", looseness: 0, fill: solid("#caa66d") }));

  // Head.
  g.add(
    sketch.ellipse(P([0, -72])[0], P([0, -72])[1], 20 * s, 18 * s, {
      color: INK, weight: "confident", looseness: 0, fill: { color: sketch.shade(SKIN, { amount: 0.2 }), style: "solid" },
    })
  );
  // Nose — a proud little clay ball, shifted toward facing.
  g.add(sketch.ellipse(P([10, -68])[0], P([10, -68])[1], 5 * s, 4.5 * s, { color: INK, weight: "light", looseness: 0, fill: solid("#e2a67d") }));
  // Eyes — separate refs so they can blink.
  const eyeL = sketch.ellipse(P([1, -77])[0], P([1, -77])[1], 2.6 * s, 3.2 * s, { color: INK, weight: "light", looseness: 0, fill: solid(INK) });
  g.add(eyeL);
  const eyeR = sketch.ellipse(P([15, -77])[0], P([15, -77])[1], 2.6 * s, 3.2 * s, { color: INK, weight: "light", looseness: 0, fill: solid(INK) });
  g.add(eyeR);
  // Mustache — two confident swoops under the nose.
  g.add(sketch.stroke([P([3, -63]), P([9, -61.5]), P([13, -63.5])], { color: "#6b4324", weight: Math.max(2, 3 * s), looseness: 0.2, smooth: true }));
  // Blush.
  g.add(sketch.ellipse(P([-9, -66])[0], P([-9, -66])[1], 3.4 * s, 2.2 * s, { color: "#e79b8100", weight: "light", looseness: 0, fill: solid("#e79b81") }));

  // Chef hat — its own sub-group so it can fly off / tip.
  const hat = sketch.group();
  hat.add(
    sketch.loop([P([-15, -86]), P([15, -86]), P([13, -95]), P([-13, -95])], {
      color: INK, weight: "confident", looseness: 0.12, smooth: true, fill: { color: sketch.shade(HAT, { amount: 0.15 }), style: "solid" },
    })
  );
  hat.add(sketch.blob(P([-9, -101])[0], P([-9, -101])[1], 10 * s, { color: INK, weight: "light", looseness: 0.15, fill: solid(HAT) }, 10));
  hat.add(sketch.blob(P([9, -101])[0], P([9, -101])[1], 10 * s, { color: INK, weight: "light", looseness: 0.15, fill: solid(HAT) }, 10));
  hat.add(sketch.blob(P([0, -107])[0], P([0, -107])[1], 12 * s, { color: INK, weight: "light", looseness: 0.15, fill: solid(HAT) }, 10));
  g.add(hat);

  // Near arm in front. bend -1 keeps the elbow bowing OUTWARD (away from the body)
  // at rest — with bend 1 the upper arm solved across the chest and read as a
  // strange red sash over the apron.
  const armNear = sketch
    .limb(P([16, -42])[0], P([16, -42])[1], AL1 * s, AL2 * s, { ...limbStyle, color: SHIRT }, {
      bend: (f === 1 ? -1 : 1), capRadius: 5.5 * s, capColor: SKIN,
    })
    .restAt(P([34, -4])[0], P([34, -4])[1]);
  g.add(armNear);

  g.initial({ x: o.x, y: o.y });

  return {
    group: g,
    armNear,
    armFar,
    hat,
    eyeL,
    eyeR,
    local: (sx: number, sy: number) => [sx - o.x, sy - o.y],
    pivotLocal: (px: number, py: number) => g.pivotAt(o.x + px, o.y + py),
  };
}

// A quick double-blink on both eyes — the clay reaction shot.
function blink(baker: Baker, at: number): void {
  for (const eye of [baker.eyeL, baker.eyeR]) {
    eye.fadeTo(0, { at, duration: 0.05 });
    eye.fadeTo(1, { at: at + 0.14, duration: 0.05 });
    eye.fadeTo(0, { at: at + 0.42, duration: 0.05 });
    eye.fadeTo(1, { at: at + 0.56, duration: 0.05 });
  }
}

// ---------------------------------------------------------------------------------
// The kitchen — split into a BACK half (wall, floor, window, shelf, hanging pans) and
// the counter, so the baker can be added between them and genuinely stand BEHIND the
// counter (paint order is the only depth this world has). Shared between scenes 2
// and 3 so the set doesn't secretly change between cuts.
// ---------------------------------------------------------------------------------

const COUNTER_Y = 296;

function buildKitchenBack(scene: Scene): void {
  const solid = (color: string) => ({ color, style: "solid" as const });

  // Floor.
  scene.add(
    sketch.loop([[0, 352], [W, 352], [W, H], [0, H]], {
      color: "#00000000", weight: "light", smooth: false, fill: { color: sketch.shade(FLOOR, { amount: 0.2 }), style: "solid" },
    })
  );
  // Wall trim line.
  scene.add(sketch.stroke([[0, 352], [W, 352]], { color: WOOD_DARK, weight: "confident", looseness: 0.1 }));
  // Floor tile hints.
  for (let i = 0; i < 5; i++) {
    scene.add(sketch.stroke([[50 + i * 130, 366 + (i % 2) * 22], [110 + i * 130, 366 + (i % 2) * 22]], { color: "#b3854f", weight: "light", looseness: 0.25 }));
  }

  // Window, upper left, with a cheery sky.
  scene.add(
    sketch.loop([[52, 66], [176, 66], [176, 168], [52, 168]], {
      color: WOOD_DARK, weight: "bold", looseness: 0.1, smooth: false,
      fill: { color: { stops: [{ offset: 0, color: "#9cc4d8" }, { offset: 1, color: "#cfe3d8" }], direction: "vertical" as const }, style: "solid" },
    })
  );
  scene.add(sketch.stroke([[114, 66], [114, 168]], { color: WOOD_DARK, weight: "confident", looseness: 0.1 }));
  scene.add(sketch.stroke([[52, 118], [176, 118]], { color: WOOD_DARK, weight: "confident", looseness: 0.1 }));
  // A puff of cloud in the window.
  scene.add(sketch.blob(88, 92, 12, { color: "#ffffff00", weight: "light", looseness: 0.2, fill: solid("#f4fbff") }, 9)).lintIgnore("overlap");

  // Shelf, upper right, crockery stacked one bowl too high (the chaos is furniture).
  scene.add(sketch.stroke([[420, 128], [620, 128]], { color: WOOD_DARK, weight: "bold", looseness: 0.1, smooth: false }));
  scene.add(sketch.loop([[434, 128], [446, 128], [446, 148], [434, 148]], { color: WOOD_DARK, weight: "confident", looseness: 0.1, smooth: false, fill: solid(WOOD_DARK) }));
  scene.add(sketch.loop([[596, 128], [608, 128], [608, 148], [596, 148]], { color: WOOD_DARK, weight: "confident", looseness: 0.1, smooth: false, fill: solid(WOOD_DARK) }));
  const bowlStack = [
    { w: 62, h: 18, color: "#7f9f6a" },
    { w: 52, h: 16, color: "#d18a4e" },
    { w: 44, h: 15, color: BOWL },
  ];
  let stackY = 128;
  for (const b of bowlStack) {
    stackY -= b.h;
    scene.add(
      sketch.loop([[498 - b.w / 2, stackY + b.h], [498 + b.w / 2, stackY + b.h], [498 + b.w / 2 - 8, stackY], [498 - b.w / 2 + 8, stackY]], {
        color: INK, weight: "confident", looseness: 0.14, smooth: true, fill: { color: sketch.shade(b.color, { amount: 0.25 }), style: "solid" },
      })
    );
  }
  // The flour sack on the shelf — floppy, smug, waiting for scene 4.
  scene.add(
    sketch.loop([[556, 128], [592, 128], [588, 84], [576, 74], [562, 82]], {
      color: INK, weight: "confident", looseness: 0.22, smooth: true, fill: { color: sketch.shade(FLOUR, { amount: 0.2 }), style: "solid" },
    })
  );
  scene.add(sketch.text("flour", 560, 100, { color: "#8a6b42", weight: "light", looseness: 0.25 }, { size: 12 }));

  // Two hanging pans on hooks, top middle.
  for (const [hx, r] of [[248, 20], [306, 15]] as const) {
    scene.add(sketch.stroke([[hx, 40], [hx, 70]], { color: INK, weight: "light", looseness: 0.15 }));
    scene.add(sketch.ellipse(hx, 70 + r, r, r, { color: INK, weight: "confident", looseness: 0, fill: solid("#6e6a63") }));
    scene.add(sketch.ellipse(hx, 70 + r, r * 0.55, r * 0.55, { color: "#4d4a45", weight: "light", looseness: 0, fill: solid("#57534d") })).lintIgnore("overlap");
  }
}

function buildCounter(scene: Scene): void {
  const solid = (color: string) => ({ color, style: "solid" as const });

  // The counter — the stage for everything that goes wrong.
  scene.add(
    sketch.loop([[196, COUNTER_Y], [612, COUNTER_Y], [612, COUNTER_Y + 16], [196, COUNTER_Y + 16]], {
      color: INK, weight: "confident", looseness: 0.1, smooth: false, fill: { color: sketch.shade(WOOD, { amount: 0.25 }), style: "solid" },
    })
  );
  scene.add(
    sketch.loop([[214, COUNTER_Y + 16], [594, COUNTER_Y + 16], [594, 352], [214, 352]], {
      color: INK, weight: "confident", looseness: 0.1, smooth: false, fill: { color: sketch.shade(WOOD_DARK, { amount: 0.2 }), style: "solid" },
    })
  );
  // Cabinet door lines and knobs.
  scene.add(sketch.stroke([[404, COUNTER_Y + 20], [404, 348]], { color: "#6e4520", weight: "light", looseness: 0.12 }));
  scene.add(sketch.ellipse(384, 324, 4, 4, { color: INK, weight: "light", looseness: 0, fill: solid("#5c3a1c") }));
  scene.add(sketch.ellipse(424, 324, 4, 4, { color: INK, weight: "light", looseness: 0, fill: solid("#5c3a1c") }));
}

// A mixing bowl as a group centered on (cx, rimY) — rim at rimY, belly below.
function buildBowl(cx: number, rimY: number, w: number, h: number): Group {
  const g = sketch.group();
  g.add(
    sketch.loop([[cx - w / 2, rimY], [cx + w / 2, rimY], [cx + w / 2 - 14, rimY + h], [cx - w / 2 + 14, rimY + h]], {
      color: INK, weight: "bold", looseness: 0.14, smooth: true, fill: { color: sketch.shade(BOWL, { amount: 0.3 }), style: "solid" },
    })
  );
  g.add(
    sketch.loop([[cx - w / 2 + 4, rimY], [cx + w / 2 - 4, rimY], [cx + w / 2 - 10, rimY + 8], [cx - w / 2 + 10, rimY + 8]], {
      color: "#3c6b6c", weight: "light", looseness: 0.12, smooth: true, fill: { color: "#3c6b6c", style: "solid" },
    })
  );
  return g;
}

// A cake layer — sponge slab with an icing drape on top.
function cakeLayer(cx: number, topY: number, w: number, h: number): Group {
  const g = sketch.group();
  g.add(
    sketch.loop([[cx - w / 2, topY + h], [cx + w / 2, topY + h], [cx + w / 2 - 3, topY], [cx - w / 2 + 3, topY]], {
      color: INK, weight: "confident", looseness: 0.14, smooth: true, fill: { color: sketch.shade(SPONGE, { amount: 0.28 }), style: "solid" },
    })
  );
  g.add(
    sketch.loop(
      [[cx - w / 2 + 2, topY + 3], [cx + w / 2 - 2, topY + 3], [cx + w / 2 - 6, topY + h * 0.45], [cx + w / 6, topY + h * 0.32], [cx - w / 6, topY + h * 0.5], [cx - w / 2 + 6, topY + h * 0.36]],
      { color: "#d98ba0", weight: "light", looseness: 0.18, smooth: true, fill: { color: sketch.shade(ICING, { amount: 0.15 }), style: "solid" } }
    )
  ).lintIgnore("overlap");
  return g;
}

// A splat of batter/icing stuck to a surface — it lands ON things by design, so the
// overlap check is suppressed on every splat.
function splat(x: number, y: number, r: number, color: string): ReturnType<typeof sketch.blob> {
  return sketch.blob(x, y, r, { color: "#00000000", weight: "light", looseness: 0.55, energy: "frantic", fill: { color, style: "solid" } }, 8).lintIgnore("overlap");
}

// ===================================================================================
// Scene 1 — title card (~7s). "half baked", says the title, over a cake doodle
// that gets flattened by a falling rolling pin before the scene is even over.
// (Title and subtitle avoid "i" and "." on purpose — the font's dot glyphs are
// point-like strokes the degenerate-shape lint correctly refuses to like.)
// ===================================================================================

const scene1 = sketch.scene({ width: W, height: H, background: "#b8452f", seed: "clay-baker-1", look: "clay" });
{
  const title = sketch.text("half baked", 140, 130, { color: "#f6efdd", weight: "bold", looseness: 0.3 }, { size: 56 });
  scene1.add(title);
  title.stagger(0.07, { at: 0.5, duration: 0.3, effect: "appear" });

  // A proud little cake under the title.
  const cake = sketch.group();
  cake.add(sketch.loop([[280, 322], [360, 322], [360, 336], [280, 336]], { color: INK, weight: "confident", looseness: 0.12, smooth: true, fill: { color: "#8a5527", style: "solid" } }));
  cake.add(cakeLayer(320, 288, 66, 34));
  cake.add(sketch.ellipse(320, 282, 6, 6, { color: INK, weight: "light", looseness: 0, fill: { color: CHERRY, style: "solid" } }));
  scene1.add(cake);
  // A GROUP's squash/rotate needs an explicit pivot — without one it transforms
  // around the local origin, not its own center (found the hard way: the flattening
  // cake teleported to the top-right corner of the frame). Pivot at the plate.
  cake.pivotAt(320, 336);
  cake.appear({ at: 2.2, duration: 0.25, ease: "back.out(2.5)" });
  cake.squashTo(0.92, 1.1, { at: 2.45, duration: 0.12, ease: "sine.out" });
  cake.squashTo(1, 1, { at: 2.57, duration: 0.15, ease: "sine.in" });

  // The rolling pin pops into the top of the frame, considers, then flattens it.
  // Authored fully on-canvas (the lint checks static bounds) and hidden until its
  // appear — a prop placed on the set between frames, the stop-motion way.
  const pin = sketch.group();
  pin.add(sketch.loop([[276, 30], [364, 30], [364, 52], [276, 52]], { color: INK, weight: "confident", looseness: 0.12, smooth: true, fill: { color: sketch.shade("#c99860", { amount: 0.3 }), style: "solid" } }));
  pin.add(sketch.loop([[254, 35], [276, 35], [276, 47], [254, 47]], { color: INK, weight: "confident", looseness: 0.12, smooth: false, fill: { color: "#8a5527", style: "solid" } }));
  pin.add(sketch.loop([[364, 35], [386, 35], [386, 47], [364, 47]], { color: INK, weight: "confident", looseness: 0.12, smooth: false, fill: { color: "#8a5527", style: "solid" } }));
  scene1.add(pin);
  pin.appear({ at: 4.0, duration: 0.1 });
  // Hold... hold... drop.
  pin.moveBy(0, 250, { at: 4.4, duration: 0.26, ease: "power2.in" });
  pin.moveBy(0, -26, { at: 4.66, duration: 0.16, ease: "power1.out" });
  pin.moveBy(0, 14, { at: 4.82, duration: 0.12, ease: "power1.in" });
  cake.squashTo(1.55, 0.28, { at: 4.64, duration: 0.1, ease: "power2.out" });
  scene1.add(
    sketch.particles(320, 300, { color: ICING }, { count: 18, angle: -90, spread: 130, speedMin: 60, speedMax: 160, gravity: 300, lifetime: 0.8, sizeMin: 2, sizeMax: 5, at: 4.64 })
  );
  scene1.add(sketch.text("the cake must go on", 190, 372, { color: "#e8b9a3", weight: "light", looseness: 0.3 }, { size: 20 })).appear({ at: 5.3, duration: 0.5 });

  scene1.add(sketch.sound("C4", { at: 0.6, duration: 0.3, instrument: "pluck", velocity: 0.5 }));
  scene1.add(sketch.sound("E4", { at: 1.0, duration: 0.3, instrument: "pluck", velocity: 0.5 }));
  scene1.add(sketch.sound("G4", { at: 2.25, duration: 0.4, instrument: "pluck", velocity: 0.55, pan: 0.1 }));
  scene1.add(sketch.sound(null, { at: 4.66, duration: 0.3, instrument: "thud", velocity: 0.85 }));
  scene1.add(sketch.sound("C3", { at: 4.72, duration: 1.2, instrument: "piano", velocity: 0.3 }));
  scene1.duration(6.5);
}

// ===================================================================================
// Scene 2 — the confident baker (~15s). He waddles in, the hat lands on his head,
// he claps a puff of old flour off his hands, the bowl thumps down. "easy," he says.
// ===================================================================================

const scene2 = sketch.scene({ width: W, height: H, background: WALL, seed: "clay-baker-2", look: "clay" });
{
  buildKitchenBack(scene2);

  // Built at the left edge (fully on-canvas — the lint checks static bounds, so an
  // entrance starts at the doorway, not off-world) and waddles to his mark. Drawn
  // BEFORE the counter, so his legs pass behind it.
  const baker = buildBaker(scene2, { x: 42, y: 314, facing: 1 });
  buildCounter(scene2);
  // The waddle: x slides in one continuous move, the wiggle is rotation on top
  // (different property, no axis fight).
  baker.group.moveBy(258, 0, { at: 0.8, duration: 2.6, ease: "power1.inOut" });
  baker.pivotLocal(0, 36);
  for (let i = 0; i < 6; i++) {
    baker.group.rotateTo(i % 2 === 0 ? 4 : -4, { at: 0.8 + i * 0.42, duration: 0.42, ease: "sine.inOut" });
  }
  baker.group.rotateTo(0, { at: 3.4, duration: 0.3, ease: "sine.out" });

  // The hat arrives separately — pops into frame above him, then drops with a squash.
  // initial({y: -160}) keeps its static bounds on-canvas (top puff at scene y ~35);
  // the appear keeps it invisible until just before the drop.
  baker.hat.initial({ y: -160 });
  // Group squash pivot: the hat band's bottom, in authored-local space. pivotAt's
  // point gets the node's own translate subtracted, so the -160 initial is added
  // back here to land the origin on local (0, -86).
  baker.hat.pivotAt(0, -86 - 160);
  baker.hat.appear({ at: 4.0, duration: 0.1 });
  baker.hat.moveBy(0, 160, { at: 4.2, duration: 0.35, ease: "power2.in" });
  baker.hat.squashTo(1.25, 0.75, { at: 4.55, duration: 0.1, ease: "power2.out" });
  baker.hat.squashTo(1, 1, { at: 4.65, duration: 0.18, ease: "back.out(2.5)" });
  baker.group.squashTo(1.06, 0.94, { at: 4.55, duration: 0.1, ease: "power2.out" });
  baker.group.squashTo(1, 1, { at: 4.65, duration: 0.18, ease: "back.out(2)" });

  // He claps his hands together — a puff of yesterday's flour comes off them.
  baker.armNear.ikTo(6, -34, { at: 5.6, duration: 0.28, ease: "power3.out" });
  baker.armFar.ikTo(-4, -34, { at: 5.6, duration: 0.28, ease: "power3.out" });
  scene2.add(
    sketch.particles(300, 282, { color: FLOUR }, { count: 16, angle: -90, spread: 160, speedMin: 30, speedMax: 90, gravity: 120, lifetime: 0.7, sizeMin: 2, sizeMax: 4, at: 5.86 })
  );
  scene2.add(sketch.sound(null, { at: 5.86, duration: 0.2, instrument: "brush", velocity: 0.5 }));
  baker.armNear.ikTo(34, -18, { at: 6.4, duration: 0.4, ease: "back.out(2)" });
  baker.armFar.ikTo(-32, -18, { at: 6.4, duration: 0.4, ease: "back.out(2)" });

  // "easy" — the single most punishable word in animation. (No period: the font's
  // period glyph is a point-like stroke the degenerate-shape lint flags.)
  const bubble = sketch.speechBubble(360, 150, 130, 62, { color: INK, weight: "confident", looseness: 0.15, fill: { color: "#fdfaf2", style: "solid" } }, { tailAt: "bottom-left" });
  scene2.add(bubble).appear({ at: 7.4, duration: 0.25, ease: "back.out(2)" });
  const easy = sketch.text("easy", 330, 132, { color: INK, weight: "confident", looseness: 0.25 }, { size: 30 });
  scene2.add(easy);
  easy.stagger(0.06, { at: 7.6, duration: 0.2, effect: "appear" });
  scene2.add(sketch.sound("A4", { at: 7.6, duration: 0.3, instrument: "pluck", velocity: 0.45, pan: 0.2 }));

  // The bowl thumps onto the counter. Authored at its landing spot, held in the top
  // of the frame by initial({y}), invisible until just before the drop.
  const bowl = buildBowl(430, COUNTER_Y - 46, 120, 46);
  scene2.add(bowl);
  bowl.initial({ y: -240 });
  // Squash pivot at the bowl's base (authored space + the -240 initial added back).
  bowl.pivotAt(430, COUNTER_Y - 240);
  bowl.appear({ at: 9.2, duration: 0.1 });
  bowl.moveBy(0, 240, { at: 9.4, duration: 0.32, ease: "power2.in" });
  bowl.squashTo(1.18, 0.8, { at: 9.72, duration: 0.1, ease: "power2.out" });
  bowl.squashTo(1, 1, { at: 9.82, duration: 0.2, ease: "back.out(2.5)" });
  scene2.add(sketch.sound(null, { at: 9.72, duration: 0.3, instrument: "thud", velocity: 0.7 }));

  // Bubble gone, sleeves metaphorically rolled, a determined nod. Hold the pose.
  bubble.fadeTo(0, { at: 10.4, duration: 0.3 });
  easy.fadeTo(0, { at: 10.4, duration: 0.3 });
  baker.group.rotateTo(3, { at: 11.2, duration: 0.4, ease: "sine.inOut" });
  baker.group.rotateTo(0, { at: 11.6, duration: 0.4, ease: "sine.inOut" });
  blink(baker, 12.4);

  scene2.add(sketch.sound("C3", { at: 0.2, duration: 3.0, instrument: "pad", velocity: 0.14 }));
  scene2.add(sketch.sound("C4", { at: 1.0, duration: 0.3, instrument: "pluck", velocity: 0.4, pan: -0.2 }));
  scene2.add(sketch.sound("E4", { at: 1.8, duration: 0.3, instrument: "pluck", velocity: 0.4 }));
  scene2.add(sketch.sound("G4", { at: 2.6, duration: 0.3, instrument: "pluck", velocity: 0.4, pan: 0.2 }));
  scene2.duration(13.5);
}

// ===================================================================================
// Scene 3 — mixing (~23s). Flour in, eggs in, stir... the bowl starts to rumble. He
// leans in to look. Holds. Holds one beat too long. BOOM.
// ===================================================================================

const scene3 = sketch.scene({ width: W, height: H, background: WALL, seed: "clay-baker-3", look: "clay" });
{
  buildKitchenBack(scene3);

  // The baker works BEHIND the counter this time (drawn before it), close enough to
  // the bowl that his 60px arms genuinely reach the spoon — the lint's reach check
  // caught the first staging, where he stood a full counter-width away and every
  // stir target was 2x past max extension.
  const baker = buildBaker(scene3, { x: 380, y: 314, facing: 1 });
  buildCounter(scene3);

  const BOWL_X = 430;
  const bowl = buildBowl(BOWL_X, COUNTER_Y - 46, 120, 46);
  scene3.add(bowl);

  // --- Flour: he hoists a sack over the bowl and tips it. ---
  const sack = sketch.group();
  sack.add(
    sketch.loop([[300, COUNTER_Y - 2], [336, COUNTER_Y - 2], [332, COUNTER_Y - 48], [320, COUNTER_Y - 58], [306, COUNTER_Y - 50]], {
      color: INK, weight: "confident", looseness: 0.22, smooth: true, fill: { color: sketch.shade(FLOUR, { amount: 0.2 }), style: "solid" },
    })
  );
  scene3.add(sack);
  sack.appear({ at: 0.4, duration: 0.2, ease: "back.out(2)" });

  scene3.label("pour", 1.6);
  baker.armFar.ikTo(-58, -52, { at: 0.9, duration: 0.5, ease: "power2.inOut" });
  sack.pivotAt(318, COUNTER_Y - 30);
  sack.moveBy(100, -70, { at: 0.9, duration: 0.5, ease: "power2.inOut" });
  sack.rotateTo(118, { at: "pour", duration: 0.45, ease: "power2.inOut" });
  scene3.add(
    sketch.particles(BOWL_X - 6, COUNTER_Y - 104, { color: FLOUR }, {
      count: 44, angle: 90, spread: 26, speedMin: 30, speedMax: 80, gravity: 160, lifetime: 0.55, duration: 1.5, sizeMin: 2, sizeMax: 5, at: 1.6,
    })
  );
  scene3.add(sketch.sound(null, { at: 1.7, duration: 1.2, instrument: "brush", velocity: 0.35 }));
  sack.rotateTo(0, { at: 3.3, duration: 0.4, ease: "power2.inOut" });
  sack.moveBy(-100, 70, { at: 3.7, duration: 0.4, ease: "power2.in" });
  sack.fadeTo(0, { at: 4.15, duration: 0.2 });
  baker.armFar.ikTo(-30, -6, { at: 3.6, duration: 0.4, ease: "back.out(1.8)" });

  // --- Eggs: two of them arc into the bowl. plink, plink. ---
  for (const [i, ex] of [545, 570].entries()) {
    const egg = sketch.ellipse(ex, COUNTER_Y - 10, 9, 11, { color: INK, weight: "light", looseness: 0, fill: { color: "#f3ead6", style: "solid" } });
    scene3.add(egg);
    egg.appear({ at: 4.6 + i * 0.9, duration: 0.15 });
    egg.moveAlong([[ex, COUNTER_Y - 10], [(ex + BOWL_X) / 2, COUNTER_Y - 120], [BOWL_X + 8, COUNTER_Y - 52]], { at: 5.1 + i * 0.9, duration: 0.5, ease: "power1.inOut" });
    egg.fadeTo(0, { at: 5.62 + i * 0.9, duration: 0.1 });
    scene3.add(sketch.sound(i === 0 ? "E5" : "G5", { at: 5.6 + i * 0.9, duration: 0.2, instrument: "pluck", velocity: 0.4, pan: 0.25 }));
  }
  // A right-hand toss gesture roughly in time with each egg's flight.
  baker.armNear.ikTo(52, -50, { at: 4.7, duration: 0.4, ease: "power2.out" });
  baker.armNear.ikTo(46, -58, { at: 5.7, duration: 0.35, ease: "power2.out" });
  baker.armNear.ikTo(36, -8, { at: 7.2, duration: 0.5, ease: "back.out(1.8)" });

  // --- The stir: spoon wags side to side, batter starts escaping. ---
  const spoon = sketch.group();
  spoon.add(sketch.stroke([[BOWL_X + 2, COUNTER_Y - 52], [BOWL_X + 22, COUNTER_Y - 118]], { color: INK, weight: 6, looseness: 0.1 }));
  spoon.add(sketch.ellipse(BOWL_X + 25, COUNTER_Y - 124, 8, 10, { color: INK, weight: "light", looseness: 0, fill: { color: "#8a5527", style: "solid" } }));
  scene3.add(spoon);
  spoon.appear({ at: 7.8, duration: 0.2 });
  spoon.pivotAt(BOWL_X, COUNTER_Y - 40);

  scene3.label("stir", 8.4);
  // Hand targets sit low on the wagging handle — chosen inside the arm's actual
  // reach from the shoulder (local (16,-42), 60px max), with real headroom.
  const stirBeat = 0.36;
  for (let i = 0; i < 8; i++) {
    spoon.rotateTo(i % 2 === 0 ? -26 : 26, { at: 8.4 + i * stirBeat, duration: stirBeat, ease: "power1.inOut" });
    baker.armNear.ikTo(i % 2 === 0 ? 46 : 62, i % 2 === 0 ? -73 : -71, { at: 8.4 + i * stirBeat, duration: stirBeat, ease: "power1.inOut" });
  }
  spoon.rotateTo(0, { at: 8.4 + 8 * stirBeat, duration: 0.3, ease: "sine.out" });
  // Batter droplets escape, escalating — the bowl is already unhappy.
  scene3.add(sketch.particles(BOWL_X, COUNTER_Y - 60, { color: BATTER }, { count: 6, angle: -90, spread: 120, speedMin: 60, speedMax: 120, gravity: 320, lifetime: 0.7, sizeMin: 2, sizeMax: 4, at: 9.2 }));
  scene3.add(sketch.particles(BOWL_X, COUNTER_Y - 60, { color: BATTER }, { count: 12, angle: -90, spread: 140, speedMin: 80, speedMax: 170, gravity: 320, lifetime: 0.8, sizeMin: 2, sizeMax: 5, at: 10.3 }));
  scene3.add(sketch.sound(null, { at: 8.5, duration: 2.6, instrument: "brush", velocity: 0.3 }));

  // --- The rumble. The spoon is abandoned. The bowl shudders. ---
  scene3.label("rumble", 11.6);
  spoon.fadeTo(0, { at: 11.5, duration: 0.15 });
  baker.armNear.ikTo(36, -20, { at: 11.5, duration: 0.35, ease: "power2.out" });
  bowl.pivotAt(BOWL_X, COUNTER_Y);
  for (let i = 0; i < 10; i++) {
    bowl.rotateTo((i % 2 === 0 ? 1 : -1) * (2 + i * 0.6), { at: 11.6 + i * 0.16, duration: 0.16, ease: "none" });
  }
  bowl.rotateTo(0, { at: 13.2, duration: 0.12, ease: "none" });
  scene3.add(sketch.particles(BOWL_X, COUNTER_Y - 64, { color: BATTER }, { count: 10, angle: -90, spread: 60, speedMin: 40, speedMax: 90, gravity: 300, lifetime: 0.5, sizeMin: 2, sizeMax: 4, at: 12.4 }));
  scene3.add(sketch.sound("C2", { at: 11.6, duration: 1.8, instrument: "pad", velocity: 0.3 }));

  // He leans in to peer at it. Everything goes quiet. This hold is the joke.
  baker.pivotLocal(0, 36);
  baker.group.rotateTo(9, { at: 12.6, duration: 0.5, ease: "power2.inOut" });
  blink(baker, 13.5);
  // ...nothing moves from 13.3 to 14.6. Clay-held silence. Then:

  // --- BOOM. ---
  scene3.label("boom", 14.6);
  const BOOM = 14.6;
  scene3.add(sketch.particles(BOWL_X, COUNTER_Y - 60, { color: BATTER }, { count: 46, angle: -90, spread: 150, speedMin: 150, speedMax: 380, gravity: 420, lifetime: 1.2, sizeMin: 3, sizeMax: 8, at: BOOM }));
  scene3.add(sketch.particles(BOWL_X, COUNTER_Y - 60, { color: "#c98f3a" }, { count: 24, angle: -90, spread: 120, speedMin: 100, speedMax: 260, gravity: 380, lifetime: 1.0, sizeMin: 2, sizeMax: 5, at: BOOM + 0.05, shape: "streak" }));
  scene3.add(sketch.sound(null, { at: BOOM, duration: 0.4, instrument: "thud", velocity: 1.0 }));
  scene3.add(sketch.sound("C2", { at: BOOM, duration: 1.6, instrument: "piano", velocity: 0.5 }));

  // Splats bloom on the wall, the window, the counter, and the baker's face.
  const splats: [number, number, number][] = [
    [372, 176, 16], [472, 150, 20], [540, 200, 13], [420, 96, 11], [300, 210, 12], [160, 150, 10], [560, 262, 14], [250, 120, 9],
  ];
  for (const [i, [sx, sy, sr]] of splats.entries()) {
    scene3.add(splat(sx, sy, sr, BATTER)).appear({ at: BOOM + 0.12 + i * 0.04, duration: 0.08 });
  }
  // On his face — placed where his head ends up AFTER the knockback (380 - 46).
  const faceSplat = splat(340, 240, 12, BATTER);
  scene3.add(faceSplat).appear({ at: BOOM + 0.32, duration: 0.08 });

  // The bowl itself jumps and lands cockeyed; the baker is blown back.
  bowl.moveBy(0, -30, { at: BOOM, duration: 0.18, ease: "power2.out" });
  bowl.moveBy(0, 30, { at: BOOM + 0.18, duration: 0.16, ease: "power2.in" });
  bowl.rotateTo(-8, { at: BOOM, duration: 0.34, ease: "power1.out" });
  bowl.squashTo(1.12, 0.85, { at: BOOM + 0.34, duration: 0.1, ease: "power2.out" });

  baker.group.rotateTo(-6, { at: BOOM, duration: 0.22, ease: "power3.out" });
  baker.group.moveBy(-46, 0, { at: BOOM, duration: 0.3, ease: "power2.out" });
  baker.group.squashTo(1.18, 0.82, { at: BOOM + 0.3, duration: 0.1, ease: "power2.out" });
  baker.group.squashTo(1, 1, { at: BOOM + 0.4, duration: 0.25, ease: "back.out(2.5)" });
  // The hat flies clean off and lands upside-down behind him. Pivot at its own
  // middle so the tumble spins in place instead of orbiting the group origin.
  baker.hat.pivotAt(0, -100);
  baker.hat.moveBy(-40, -130, { at: BOOM, duration: 0.35, ease: "power2.out" });
  baker.hat.rotateBy(-150, { at: BOOM, duration: 0.8, ease: "power1.out" });
  baker.hat.moveBy(-40, 210, { at: BOOM + 0.35, duration: 0.45, ease: "power2.in" });
  scene3.add(sketch.sound(null, { at: BOOM + 0.82, duration: 0.2, instrument: "thud", velocity: 0.4 }));

  // One last drip of batter falls off the ceiling onto his bare head. plink.
  const drip = sketch.ellipse(334, 30, 5, 7, { color: "#00000000", weight: "light", looseness: 0, fill: { color: BATTER, style: "solid" } });
  drip.pivotAt(334, 37);
  scene3.add(drip);
  drip.appear({ at: BOOM + 1.8, duration: 0.1 });
  drip.moveBy(0, 186, { at: BOOM + 2.3, duration: 0.3, ease: "power2.in" });
  drip.squashTo(1.8, 0.3, { at: BOOM + 2.6, duration: 0.08, ease: "power2.out" });
  scene3.add(sketch.sound("C6", { at: BOOM + 2.6, duration: 0.15, instrument: "pluck", velocity: 0.5 }));
  blink(baker, BOOM + 2.8);
  baker.group.rotateTo(0, { at: BOOM + 3.6, duration: 0.6, ease: "sine.inOut" });

  scene3.duration(19.5);
}

// ===================================================================================
// Scene 4 — the tower (~26s). Attempt two produced a glorious three-layer cake. He
// carries it. It sways. He saves it. He sets it down. It's fine. It's FINE. A fly
// lands on the cherry. It is not fine. Then the flour sack finishes the job.
// ===================================================================================

const scene4 = sketch.scene({ width: W, height: H, background: WALL, seed: "clay-baker-4", look: "clay" });
{
  const solid = (color: string) => ({ color, style: "solid" as const });

  // Floor.
  scene4.add(
    sketch.loop([[0, 352], [W, 352], [W, H], [0, H]], {
      color: "#00000000", weight: "light", smooth: false, fill: { color: sketch.shade(FLOOR, { amount: 0.2 }), style: "solid" },
    })
  );
  scene4.add(sketch.stroke([[0, 352], [W, 352]], { color: WOOD_DARK, weight: "confident", looseness: 0.1 }));
  for (let i = 0; i < 5; i++) {
    scene4.add(sketch.stroke([[50 + i * 130, 366 + (i % 2) * 22], [110 + i * 130, 366 + (i % 2) * 22]], { color: "#b3854f", weight: "light", looseness: 0.25 }));
  }

  // The table, right of frame, waiting to receive greatness.
  const TABLE_X = 470;
  const TABLE_Y = 300;
  scene4.add(
    sketch.loop([[TABLE_X - 90, TABLE_Y], [TABLE_X + 90, TABLE_Y], [TABLE_X + 90, TABLE_Y + 14], [TABLE_X - 90, TABLE_Y + 14]], {
      color: INK, weight: "confident", looseness: 0.1, smooth: false, fill: { color: sketch.shade(WOOD, { amount: 0.25 }), style: "solid" },
    })
  );
  scene4.add(sketch.loop([[TABLE_X - 70, TABLE_Y + 14], [TABLE_X - 56, TABLE_Y + 14], [TABLE_X - 60, 352], [TABLE_X - 74, 352]], { color: INK, weight: "confident", looseness: 0.1, smooth: false, fill: solid(WOOD_DARK) }));
  scene4.add(sketch.loop([[TABLE_X + 56, TABLE_Y + 14], [TABLE_X + 70, TABLE_Y + 14], [TABLE_X + 74, 352], [TABLE_X + 60, 352]], { color: INK, weight: "confident", looseness: 0.1, smooth: false, fill: solid(WOOD_DARK) }));

  // A shelf directly above the table, holding one (1) flour sack. Chekhov's sack.
  scene4.add(sketch.stroke([[400, 110], [600, 110]], { color: WOOD_DARK, weight: "bold", looseness: 0.1, smooth: false }));
  scene4.add(sketch.loop([[414, 110], [426, 110], [426, 130], [414, 130]], { color: WOOD_DARK, weight: "confident", looseness: 0.1, smooth: false, fill: solid(WOOD_DARK) }));
  scene4.add(sketch.loop([[576, 110], [588, 110], [588, 130], [576, 130]], { color: WOOD_DARK, weight: "confident", looseness: 0.1, smooth: false, fill: solid(WOOD_DARK) }));
  const sack = sketch.group();
  sack.add(
    sketch.loop([[462, 110], [504, 110], [500, 58], [486, 46], [468, 56]], {
      color: INK, weight: "confident", looseness: 0.22, smooth: true, fill: { color: sketch.shade(FLOUR, { amount: 0.2 }), style: "solid" },
    })
  );
  sack.add(sketch.text("flour", 466, 78, { color: "#8a6b42", weight: "light", looseness: 0.25 }, { size: 13 }));
  scene4.add(sack);

  // The baker, entering left, carrying the tower. Baker and tower are moved with
  // IDENTICAL moveBy calls (same at/duration/ease) so they track exactly — the same
  // trick sketch.walk uses to keep a planted foot still.
  const START_X = 120;
  const baker = buildBaker(scene4, { x: START_X, y: 314, facing: 1 });
  baker.armNear.ikTo(40, -58, { at: 0, duration: 0 });
  baker.armFar.ikTo(30, -62, { at: 0, duration: 0 });

  // The tower: platter + three layers + cherry, authored where the carry starts.
  const TWR_X = START_X + 58;
  const platter = sketch.group();
  platter.add(sketch.loop([[TWR_X - 62, 252], [TWR_X + 62, 252], [TWR_X + 54, 262], [TWR_X - 54, 262]], { color: INK, weight: "confident", looseness: 0.12, smooth: true, fill: solid("#d8cfc0") }));
  const layer1 = cakeLayer(TWR_X, 214, 110, 38);
  const layer2 = cakeLayer(TWR_X, 182, 82, 32);
  const layer3 = cakeLayer(TWR_X, 154, 58, 28);
  const cherry = sketch.ellipse(TWR_X, 146, 7, 7, { color: INK, weight: "light", looseness: 0, fill: solid(CHERRY) });
  cherry.pivotAt(TWR_X, 146);
  const tower = sketch.group([platter, layer1, layer2, layer3, cherry]);
  scene4.add(tower);
  tower.pivotAt(TWR_X, 258);
  // Each layer squashes/tumbles around its OWN base — a group without a pivot
  // transforms around the local origin, not its bbox center.
  layer1.pivotAt(TWR_X, 252);
  layer2.pivotAt(TWR_X, 214);
  layer3.pivotAt(TWR_X, 180);

  // The carry: four shuffling stop-motion steps rightward, tower swaying more each
  // step, baker counter-tilting like a man negotiating with physics.
  baker.pivotLocal(0, 36);
  const STEP = 52;
  const stepDur = 0.55;
  let t = 1.0;
  const sway = [3, -5, 7, -9];
  for (let i = 0; i < 4; i++) {
    baker.group.moveBy(STEP, 0, { at: t, duration: stepDur, ease: "power1.inOut" });
    tower.moveBy(STEP, 0, { at: t, duration: stepDur, ease: "power1.inOut" });
    tower.rotateTo(sway[i], { at: t, duration: stepDur, ease: "sine.inOut" });
    baker.group.rotateTo(-sway[i] * 0.5, { at: t, duration: stepDur, ease: "sine.inOut" });
    scene4.add(sketch.sound(null, { at: t + stepDur * 0.8, duration: 0.12, instrument: "thud", velocity: 0.2 }));
    t += stepDur + 0.22;
  }

  // Mid-carry crisis: the top layer slips. He freezes. Nudges it back with his nose.
  scene4.label("slip", t);
  layer3.moveBy(14, 0, { at: "slip", duration: 0.25, ease: "power2.out" });
  cherry.moveBy(14, 0, { at: "slip", duration: 0.25, ease: "power2.out" });
  scene4.add(sketch.sound("D5", { at: t + 0.1, duration: 0.15, instrument: "pluck", velocity: 0.4 }));
  // Freeze. Hold. (t+0.25 .. t+1.1 — nothing moves. That's the joke.)
  blink(baker, t + 0.35);
  baker.group.rotateTo(6, { at: t + 1.1, duration: 0.35, ease: "power2.inOut" });
  layer3.moveBy(-14, 0, { at: t + 1.5, duration: 0.3, ease: "back.out(1.6)" });
  cherry.moveBy(-14, 0, { at: t + 1.5, duration: 0.3, ease: "back.out(1.6)" });
  baker.group.rotateTo(0, { at: t + 1.9, duration: 0.35, ease: "sine.inOut" });
  tower.rotateTo(0, { at: t + 1.5, duration: 0.4, ease: "sine.inOut" });
  t += 2.5;

  // Final two steps to the table.
  for (let i = 0; i < 2; i++) {
    baker.group.moveBy(STEP, 0, { at: t, duration: stepDur, ease: "power1.inOut" });
    tower.moveBy(STEP, 0, { at: t, duration: stepDur, ease: "power1.inOut" });
    tower.rotateTo(i === 0 ? 4 : -3, { at: t, duration: stepDur, ease: "sine.inOut" });
    baker.group.rotateTo(i === 0 ? -2 : 1.5, { at: t, duration: stepDur, ease: "sine.inOut" });
    t += stepDur + 0.22;
  }
  tower.rotateTo(0, { at: t, duration: 0.3, ease: "sine.out" });
  baker.group.rotateTo(0, { at: t, duration: 0.3, ease: "sine.out" });

  // Set it down on the table. Gentle. Gentle... there.
  scene4.label("setdown", t + 0.4);
  tower.moveBy(0, 44, { at: "setdown", duration: 0.5, ease: "power1.inOut" });
  baker.armNear.ikTo(46, -30, { at: "setdown" as unknown as number, duration: 0.5, ease: "power1.inOut" });
  baker.armFar.ikTo(36, -34, { at: "setdown" as unknown as number, duration: 0.5, ease: "power1.inOut" });
  scene4.add(sketch.sound(null, { at: t + 0.9, duration: 0.2, instrument: "thud", velocity: 0.3 }));
  t += 1.1;

  // He steps back to admire it. Wipes his brow. It stands. It actually stands.
  baker.group.moveBy(-70, 0, { at: t, duration: 0.7, ease: "power1.inOut" });
  baker.armNear.ikTo(20, -74, { at: t + 0.9, duration: 0.35, ease: "power2.out" });
  baker.armNear.ikTo(34, -14, { at: t + 1.4, duration: 0.45, ease: "back.out(1.8)" });
  scene4.add(sketch.sound("C5", { at: t + 1.0, duration: 0.5, instrument: "piano", velocity: 0.3, pan: -0.1 }));
  t += 2.0;

  // The fly. One tiny idiot changes everything. (Authored just inside the frame
  // edge — the lint checks static bounds, so it enters from the margin, not off-world.)
  scene4.label("fly", t);
  const fly = sketch.ellipse(628, 60, 3.5, 3, { color: INK, weight: "light", looseness: 0, fill: solid(INK) });
  scene4.add(fly);
  fly.appear({ at: "fly", duration: 0.1 });
  const twrEndX = TWR_X + STEP * 6;
  fly.moveAlong(
    [[628, 60], [560, 130], [600, 170], [500, 150], [530, 190], [twrEndX + 30, 168], [twrEndX, 186]],
    { at: "fly+0.1", duration: 2.2, ease: "power1.inOut" }
  );
  scene4.add(sketch.sound("A5", { at: t + 0.2, duration: 0.6, instrument: "pluck", velocity: 0.15, pan: 0.3 }));
  scene4.add(sketch.sound("B5", { at: t + 1.1, duration: 0.6, instrument: "pluck", velocity: 0.15, pan: 0.2 }));
  blink(baker, t + 1.2);
  t += 2.3;
  // The fly is down. Landed on the cherry. Hold. Hold. HOLD.
  // (Nothing moves for a full second. The clay hold does all the work.)
  t += 1.0;

  // --- The collapse. ---
  scene4.label("crash", t);
  const CR = t;
  scene4.add(sketch.sound(null, { at: CR, duration: 0.5, instrument: "thud", velocity: 1.0 }));
  scene4.add(sketch.sound("C2", { at: CR + 0.05, duration: 2.0, instrument: "piano", velocity: 0.5 }));
  // Fly exits, disgusted.
  fly.moveBy(120, -140, { at: CR, duration: 0.5, ease: "power2.out" });
  fly.fadeTo(0, { at: CR + 0.4, duration: 0.15 });
  // Top layer pancakes, then slides off the right edge of the tower onto the table.
  layer3.squashTo(1.4, 0.4, { at: CR, duration: 0.12, ease: "power2.out" });
  layer3.moveBy(0, 16, { at: CR + 0.02, duration: 0.12, ease: "power2.in" });
  layer3.moveBy(58, 34, { at: CR + 0.4, duration: 0.4, ease: "power2.in" });
  layer3.rotateBy(48, { at: CR + 0.4, duration: 0.4, ease: "power1.in" });
  // Cherry launches straight up, hangs, then bonks off the baker's head.
  cherry.moveBy(0, -110, { at: CR, duration: 0.4, ease: "power2.out" });
  cherry.moveBy(-108, 150, { at: CR + 0.9, duration: 0.45, ease: "power2.in" });
  cherry.squashTo(1.5, 0.5, { at: CR + 1.35, duration: 0.08, ease: "power2.out" });
  scene4.add(sketch.sound("E5", { at: CR + 1.35, duration: 0.15, instrument: "pluck", velocity: 0.5 }));
  // Middle layer squashes and slumps left.
  layer2.squashTo(1.3, 0.5, { at: CR + 0.25, duration: 0.15, ease: "power2.out" });
  layer2.moveBy(-42, 30, { at: CR + 0.55, duration: 0.35, ease: "power2.in" });
  layer2.rotateBy(-30, { at: CR + 0.55, duration: 0.35, ease: "power1.in" });
  // Bottom layer just gives up vertically.
  layer1.squashTo(1.25, 0.55, { at: CR + 0.5, duration: 0.3, ease: "power2.out" });
  // Icing shrapnel.
  scene4.add(sketch.particles(twrEndX, 240, { color: ICING }, { count: 30, angle: -90, spread: 150, speedMin: 80, speedMax: 240, gravity: 380, lifetime: 1.0, sizeMin: 2, sizeMax: 6, at: CR }));
  scene4.add(sketch.particles(twrEndX, 250, { color: SPONGE }, { count: 16, angle: -90, spread: 130, speedMin: 60, speedMax: 160, gravity: 340, lifetime: 0.9, sizeMin: 2, sizeMax: 5, at: CR + 0.1 }));
  // Baker recoils, hands to face.
  baker.group.squashTo(0.88, 1.12, { at: CR + 0.1, duration: 0.12, ease: "power2.out" });
  baker.group.squashTo(1, 1, { at: CR + 0.25, duration: 0.2, ease: "back.out(2)" });
  baker.armNear.ikTo(14, -66, { at: CR + 0.3, duration: 0.3, ease: "power3.out" });
  baker.armFar.ikTo(-2, -68, { at: CR + 0.3, duration: 0.3, ease: "power3.out" });
  blink(baker, CR + 1.6);

  // And then, because the universe is thorough: the shelf lets go of the sack.
  // Tilt... hold... drop.
  sack.pivotAt(483, 110);
  sack.rotateTo(14, { at: CR + 2.4, duration: 0.5, ease: "power1.inOut" });
  // hold from CR+2.9 to CR+3.7 — the sack considers its options
  sack.rotateTo(24, { at: CR + 3.7, duration: 0.2, ease: "power1.in" });
  sack.moveBy(0, 190, { at: CR + 3.9, duration: 0.32, ease: "power2.in" });
  scene4.add(sketch.sound(null, { at: CR + 4.22, duration: 0.4, instrument: "thud", velocity: 0.9 }));
  // The whiteout. Flour everywhere. EVERYWHERE.
  scene4.add(sketch.particles(483, 286, { color: FLOUR }, { count: 70, angle: -90, spread: 170, speedMin: 60, speedMax: 300, gravity: 160, lifetime: 1.8, sizeMin: 3, sizeMax: 9, at: CR + 4.22 }));
  scene4.add(sketch.particles(483, 286, { color: "#efe6d2" }, { count: 40, angle: -90, spread: 180, speedMin: 20, speedMax: 120, gravity: 60, lifetime: 2.6, sizeMin: 4, sizeMax: 12, at: CR + 4.3 }));
  // A soft white cloud that hangs over the lower half of the frame and mostly settles.
  const cloud = sketch.group();
  for (const [cx, cy, cr] of [[483, 270, 70], [400, 300, 55], [560, 300, 55], [330, 320, 45], [620, 320, 40]] as const) {
    cloud.add(sketch.blob(cx, cy, cr, { color: "#ffffff00", weight: "light", looseness: 0.3, fill: { color: "#f4eddcbb", style: "solid" } }, 10).lintIgnore("overlap"));
  }
  scene4.add(cloud);
  cloud.appear({ at: CR + 4.25, duration: 0.3 });
  cloud.fadeTo(0.35, { at: CR + 5.4, duration: 1.6, ease: "sine.inOut" });
  // The baker, dusted white head to toe.
  // He ends up at START_X + 6*STEP - 70 after the admire step-back.
  const dusted = sketch.blob(START_X + STEP * 6 - 70, 260, 62, { color: "#ffffff00", weight: "light", looseness: 0.35, fill: { color: "#f4eddc99", style: "solid" } }, 11);
  scene4.add(dusted.lintIgnore("overlap"));
  dusted.appear({ at: CR + 4.4, duration: 0.3 });
  blink(baker, CR + 5.6);

  scene4.duration(CR + 7.2);
}

// ===================================================================================
// Scene 5 — the payoff (~14s). The wreckage. The baker, seated in it, spots the one
// cupcake that survived. Candle. Flame. "close enough."
// ===================================================================================

const scene5 = sketch.scene({ width: W, height: H, background: "#ead7ae", seed: "clay-baker-5", look: "clay" });
{
  const solid = (color: string) => ({ color, style: "solid" as const });

  // Floor and a general air of catastrophe.
  scene5.add(
    sketch.loop([[0, 330], [W, 330], [W, H], [0, H]], {
      color: "#00000000", weight: "light", smooth: false, fill: { color: sketch.shade(FLOOR, { amount: 0.2 }), style: "solid" },
    })
  );
  scene5.add(sketch.stroke([[0, 330], [W, 330]], { color: WOOD_DARK, weight: "confident", looseness: 0.1 }));

  // Wreckage: flattened layers, splats, the upside-down hat, a drift of flour.
  const deadLayer = cakeLayer(150, 366, 120, 22);
  deadLayer.pivotAt(150, 377);
  deadLayer.rotateTo(-6, { at: 0, duration: 0 });
  scene5.add(deadLayer);
  const deadLayer2 = cakeLayer(500, 372, 90, 18);
  deadLayer2.pivotAt(500, 381);
  deadLayer2.rotateTo(8, { at: 0, duration: 0 });
  scene5.add(deadLayer2);
  scene5.add(splat(90, 300, 14, BATTER));
  scene5.add(splat(560, 280, 12, BATTER));
  scene5.add(splat(240, 388, 11, ICING));
  scene5.add(splat(440, 396, 9, ICING));
  // Flour drifts along the floor line.
  for (const [fx, fw] of [[60, 120], [300, 160], [520, 100]] as const) {
    scene5.add(
      sketch.loop([[fx, 336], [fx + fw, 336], [fx + fw - 18, 326], [fx + fw / 2, 320], [fx + 16, 327]], {
        color: "#00000000", weight: "light", looseness: 0.3, smooth: true, fill: solid("#f4eddcdd"),
      })
    );
  }
  // The hat, upside down, retired.
  const hat = sketch.group();
  hat.add(sketch.loop([[70, 366], [104, 366], [106, 356], [68, 356]], { color: INK, weight: "confident", looseness: 0.15, smooth: true, fill: solid(HAT) }));
  hat.add(sketch.blob(78, 372, 9, { color: INK, weight: "light", looseness: 0.2, fill: solid(HAT) }, 9).lintIgnore("overlap"));
  hat.add(sketch.blob(96, 372, 9, { color: INK, weight: "light", looseness: 0.2, fill: solid(HAT) }, 9).lintIgnore("overlap"));
  scene5.add(hat);

  // Dust motes still settling — the aftermath breathes.
  scene5.add(
    sketch.particles(320, 120, { color: "#f4eddc" }, { count: 20, angle: 90, spread: 160, speedMin: 6, speedMax: 22, gravity: 8, lifetime: 4.0, duration: 9.0, sizeMin: 2, sizeMax: 4, at: 0.2 })
  );

  // The baker, seated in the middle of it, dusted and done. Slightly longer arms
  // (68px reach) so the cupcake reach stays well inside IK range while seated.
  const baker = buildBaker(scene5, { x: 300, y: 330, facing: 1, seated: true, armLen: [36, 32] });
  baker.pivotLocal(0, 20);
  baker.group.rotateTo(3, { at: 0, duration: 0 });
  blink(baker, 1.0);

  // The survivor: one perfect cupcake, downstage right — close enough to the seated
  // baker that planting the candle is a real reach, not a clamped plank arm.
  const CUP_X = 366;
  const CUP_Y = 356;
  const cupcake = sketch.group();
  cupcake.add(sketch.loop([[CUP_X - 16, CUP_Y + 14], [CUP_X + 16, CUP_Y + 14], [CUP_X + 20, CUP_Y - 6], [CUP_X - 20, CUP_Y - 6]], { color: INK, weight: "confident", looseness: 0.12, smooth: true, fill: solid("#b06a8f") }));
  cupcake.add(sketch.blob(CUP_X, CUP_Y - 12, 16, { color: INK, weight: "confident", looseness: 0.2, fill: { color: sketch.shade(ICING, { amount: 0.2 }), style: "solid" } }, 10));
  scene5.add(cupcake);
  cupcake.pivotAt(CUP_X, CUP_Y + 14);
  // A gentle "notice me" bounce once he looks over.
  scene5.add(sketch.sound("E4", { at: 2.2, duration: 0.4, instrument: "piano", velocity: 0.3, pan: 0.2 }));
  cupcake.squashTo(1.1, 0.9, { at: 2.2, duration: 0.12, ease: "power2.out" });
  cupcake.squashTo(1, 1, { at: 2.32, duration: 0.2, ease: "back.out(2.5)" });
  blink(baker, 2.6);

  // He leans over and plants a single candle in it.
  baker.group.rotateTo(8, { at: 3.6, duration: 0.6, ease: "power2.inOut" });
  baker.armNear.ikTo(baker.local(CUP_X - 6, CUP_Y - 34)[0], baker.local(CUP_X - 6, CUP_Y - 34)[1], { at: 4.0, duration: 0.7, ease: "power2.inOut" });
  const candle = sketch.loop([[CUP_X - 2.5, CUP_Y - 42], [CUP_X + 2.5, CUP_Y - 42], [CUP_X + 2, CUP_Y - 22], [CUP_X - 2, CUP_Y - 22]], { color: INK, weight: "light", looseness: 0.1, smooth: false, fill: solid("#7ec8c9") });
  scene5.add(candle);
  candle.appear({ at: 4.7, duration: 0.15 });
  baker.armNear.ikTo(30, -8, { at: 5.2, duration: 0.6, ease: "back.out(1.6)" });
  baker.group.rotateTo(3, { at: 5.4, duration: 0.5, ease: "sine.inOut" });

  // The flame pops on — the one warm thing in the frame, with a soft radial glow.
  const glow = sketch.ellipse(CUP_X, CUP_Y - 50, 34, 34, {
    color: "#00000000", weight: "light", looseness: 0,
    fill: { color: { stops: [{ offset: 0, color: "#ffd98a88" }, { offset: 1, color: "#ffd98a00" }], type: "radial" as const }, style: "solid" },
  });
  scene5.add(glow.lintIgnore("overlap"));
  glow.appear({ at: 6.4, duration: 0.4 });
  const flame = sketch.ellipse(CUP_X, CUP_Y - 48, 4.5, 7, { color: "#c77b28", weight: "light", looseness: 0, fill: solid("#ffcf5c") });
  flame.pivotAt(CUP_X, CUP_Y - 41);
  scene5.add(flame);
  flame.appear({ at: 6.4, duration: 0.15, ease: "back.out(3)" });
  // The flame breathes — tiny alternating squash, quantized to clay time anyway.
  for (let i = 0; i < 6; i++) {
    flame.squashTo(i % 2 === 0 ? 0.85 : 1.1, i % 2 === 0 ? 1.15 : 0.92, { at: 6.8 + i * 0.5, duration: 0.5, ease: "sine.inOut" });
  }
  scene5.add(sketch.sound("G4", { at: 6.4, duration: 0.6, instrument: "pluck", velocity: 0.4, pan: 0.2 }));

  // The verdict.
  const caption = sketch.text("close enough", 200, 90, { color: "#4a3321", weight: "confident", looseness: 0.3 }, { size: 34 });
  scene5.add(caption);
  caption.stagger(0.08, { at: 7.6, duration: 0.25, effect: "appear" });

  // A quiet resolve — the title card's chord, softened.
  scene5.add(sketch.sound("C3", { at: 7.6, duration: 3.5, instrument: "pad", velocity: 0.18 }));
  scene5.add(sketch.sound("E4", { at: 8.2, duration: 1.6, instrument: "piano", velocity: 0.25, pan: -0.1 }));
  scene5.add(sketch.sound("G4", { at: 9.0, duration: 1.8, instrument: "piano", velocity: 0.22, pan: 0.1 }));
  scene5.add(sketch.sound("C5", { at: 9.8, duration: 2.4, instrument: "piano", velocity: 0.2 }));

  blink(baker, 9.6);
  scene5.duration(12.5);
}

// ===================================================================================
// Cut together. Hard cuts through the comedy (a fade would soften the timing), one
// fade into the aftermath, where softening is the point.
// ===================================================================================

const film = sketch.film({ width: W, height: H, background: "#1c1410" });
film
  .addScene(scene1, { hold: 0.5 })
  .addScene(scene2, { transition: "cut", hold: 0.4 })
  .addScene(scene3, { transition: "cut", hold: 0.6 })
  .addScene(scene4, { transition: "cut", hold: 0.6 })
  .addScene(scene5, { transition: "fade", transitionDuration: 1.0, hold: 0.8 });

export default film;
