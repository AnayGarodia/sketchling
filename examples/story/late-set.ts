import { sketch } from "../../src/index.js";
import type { Group } from "../../src/core/group.js";
import type { Scene } from "../../src/core/scene.js";

// "The Late Set" — a jazz trio (upright bass, piano, drums) playing a smoky basement
// club at night, cut as a three-scene film: the street door and the stairs down, the
// set itself (with the bassist stepping forward for a solo under the room's single
// hanging light), and the sign going dark after the last chord.
//
// Register: look: "ink" + texture: "grain" — chosen against "flat"+grain after comparing
// stills of the same interior. Ink's line boil and jitter read as the right kind of
// looseness for live music (nothing in a club sits perfectly still), and grain over the
// warm-on-dark palette lands close to pushed film stock, which is exactly the noir this
// subject wants. Palette rule borrowed from rain-city-night.ts: everything ambient is
// cold blue-violet; every warm value in frame comes from one light somebody is paying
// for — the hanging bulb inside, the sign and the doorway leak outside.
//
// The score is the scene: a walking bassline ("pluck"), sparse piano comping, brushes
// and a soft kick ("brush"/"thud"), all on the same scene-global `at` timeline as the
// visuals — every pluck of the bassist's arm is scheduled at the same `at` as its note.

type Pt = [number, number];

const W = 640;
const H = 420;

// Deterministic hash instead of Math.random — same stars, same render, every time.
function rnd(i: number): number {
  const x = Math.sin(i * 127.1 + 3.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------------------
// Shared exterior builder — scene 1 (arrival) and scene 3 (closing) are the same street,
// so the geometry is built once and each scene adds its own timeline on the handles.
// ---------------------------------------------------------------------------------------
function buildExterior(seed: string): {
  scene: Scene;
  signGlow: ReturnType<typeof sketch.ellipse>;
  signText: Group;
  subText: Group;
  doorGlow: ReturnType<typeof sketch.ellipse>;
} {
  const scene = sketch.scene({
    width: W,
    height: H,
    background: {
      stops: [
        { offset: 0, color: "#04050c" },
        { offset: 0.55, color: "#0d1124" },
        { offset: 1, color: "#191724" },
      ],
      direction: "vertical",
    },
    seed,
    look: "ink",
    texture: "grain",
  });

  // A thin scatter of stars above the roofline — small and dim, or ink's render jitter
  // turns each one into a scribble instead of a point of light.
  for (let i = 0; i < 12; i++) {
    const sx = 20 + rnd(i * 3 + 1) * 600;
    const sy = 8 + rnd(i * 3 + 2) * 96;
    const r = 0.8 + rnd(i * 3 + 3) * 0.7;
    const star = sketch.ellipse(sx, sy, r, r, {
      color: "#00000000",
      weight: "light",
      fill: { color: "#8b90a8", style: "solid" },
    }, 8);
    scene.add(star).appear({ at: 0.1 + rnd(i) * 0.5, duration: 0.4 });
  }

  // The building face — one dark block, cool, with a parapet line at the roof.
  const wall = sketch.loop(
    [[-8, 118], [648, 118], [648, 334], [-8, 334]],
    {
      color: "#05060a",
      weight: "confident",
      smooth: false,
      looseness: 0.1,
      fill: {
        color: { stops: [{ offset: 0, color: "#181a28" }, { offset: 1, color: "#0e0f18" }], direction: "vertical" },
        style: "solid",
      },
    }
  );
  scene.add(wall).appear({ at: 0, duration: 0.3 });
  scene.add(sketch.stroke([[0, 118], [640, 116]], { color: "#232637", weight: "light" })).appear({ at: 0.2, duration: 0.3 });

  // Two dark upper windows and one where somebody's still up.
  for (const [wx, lit] of [[420, false], [510, false], [572, true]] as [number, boolean][]) {
    const win = sketch.loop(
      [[wx, 148], [wx + 34, 148], [wx + 34, 196], [wx, 196]],
      {
        color: "#1e2030",
        weight: "light",
        smooth: false,
        fill: { color: lit ? "#6b5232" : "#0a0b12", style: "solid" },
      }
    );
    scene.add(win).appear({ at: 0.3, duration: 0.3 });
  }

  // Sidewalk and road.
  scene.add(
    sketch.loop([[-8, 334], [648, 334], [648, 364], [-8, 364]], {
      color: "#08090f",
      weight: "light",
      smooth: false,
      fill: { color: { stops: [{ offset: 0, color: "#181923" }, { offset: 1, color: "#101017" }], direction: "vertical" }, style: "solid" },
    })
  ).appear({ at: 0, duration: 0.3 });
  scene.add(
    sketch.loop([[-8, 364], [648, 364], [648, 428], [-8, 428]], {
      color: "#05060a",
      weight: "light",
      smooth: false,
      fill: { color: "#090a10", style: "solid" },
    })
  ).appear({ at: 0, duration: 0.3 });

  // The club doorway — a dark opening at street level with stairs descending inside,
  // and a warm leak from the room below. The one warm thing at street level.
  const doorway = sketch.loop(
    [[252, 208], [336, 208], [336, 334], [252, 334]],
    { color: "#231d2b", weight: "confident", smooth: false, fill: { color: "#050309", style: "solid" } }
  );
  scene.add(doorway.named("doorway")).appear({ at: 0.2, duration: 0.4 });
  // Steps falling away into the dark.
  for (let i = 0; i < 4; i++) {
    scene.add(
      sketch.stroke(
        [[262 + i * 4, 268 + i * 17], [328 - i * 4, 268 + i * 17]],
        { color: "#221c2e", weight: "light" }
      )
    ).appear({ at: 0.5, duration: 0.3 });
  }
  const doorGlow = sketch.ellipse(294, 328, 36, 15, {
    color: "#00000000",
    fill: {
      color: { stops: [{ offset: 0, color: "#e8a75c55" }, { offset: 1, color: "#e8a75c00" }], type: "radial" },
      style: "solid",
    },
  });
  scene.add(doorGlow.named("door-glow")).appear({ at: 0.6, duration: 0.8 });
  // Railing down the stairs.
  scene.add(sketch.stroke([[256, 246], [256, 330]], { color: "#2a2437", weight: "confident" })).appear({ at: 0.5, duration: 0.3 });

  // The sign — a small board over the door, glowing amber.
  const signGlow = sketch.ellipse(294, 170, 92, 34, {
    color: "#00000000",
    fill: {
      color: { stops: [{ offset: 0, color: "#f2b96833" }, { offset: 1, color: "#f2b96800" }], type: "radial" },
      style: "solid",
    },
  });
  // The glow deliberately blankets the board it's lighting — same-size overlap by design.
  scene.add(signGlow.named("sign-glow").lintIgnore("overlap")).appear({ at: 0.8, duration: 0.9 });
  const signBoard = sketch.loop(
    [[212, 150], [378, 150], [378, 192], [212, 192]],
    { color: "#2a2233", weight: "confident", smooth: false, fill: { color: "#0f0b15", style: "solid" } }
  );
  scene.add(signBoard.named("sign-board")).appear({ at: 0.7, duration: 0.4 });
  const signText = sketch.text("the cellar", 226, 160, { color: "#f2b968", weight: "confident", looseness: 0.18, energy: "calm" }, { size: 20 });
  scene.add(signText.named("sign-text"));
  signText.stagger(0.05, { at: 1.0, duration: 0.2 });
  const subText = sketch.text("jazz tonight", 250, 198, { color: "#b98d55", weight: "light", looseness: 0.2, energy: "calm" }, { size: 11 });
  // "i"/"j" dot glyphs are point-like strokes by construction at this size — intentional.
  for (const c of subText.children) c.lintIgnore("degenerate");
  scene.add(subText.named("sign-sub"));
  subText.stagger(0.04, { at: 1.5, duration: 0.15 });

  // A cool, tired streetlamp far left — the only other light, and it's the wrong color
  // on purpose (cold civic white against the club's warm amber).
  scene.add(sketch.stroke([[62, 152], [62, 364]], { color: "#191b28", weight: "bold" })).appear({ at: 0.3, duration: 0.4 });
  scene.add(sketch.stroke([[62, 152], [84, 158]], { color: "#191b28", weight: "confident" })).appear({ at: 0.5, duration: 0.2 });
  const lampHead = sketch.ellipse(88, 162, 7, 5, { color: "#232637", fill: { color: "#aeb6d0", style: "solid" } });
  scene.add(lampHead).appear({ at: 0.6, duration: 0.3 });
  const lampGlow = sketch.ellipse(88, 164, 30, 26, {
    color: "#00000000",
    fill: { color: { stops: [{ offset: 0, color: "#aeb6d02a" }, { offset: 1, color: "#aeb6d000" }], type: "radial" }, style: "solid" },
  });
  scene.add(lampGlow).appear({ at: 0.6, duration: 0.5 });
  scene.add(
    sketch.ellipse(88, 360, 42, 8, {
      color: "#00000000",
      fill: { color: { stops: [{ offset: 0, color: "#aeb6d014" }, { offset: 1, color: "#aeb6d000" }], type: "radial" }, style: "solid" },
    })
  ).appear({ at: 0.7, duration: 0.5 });

  // Steam off a vent grate — the city breathing. Alpha in the color, small sizes: opaque
  // dots read as thrown pebbles, not vapor.
  scene.add(
    sketch.particles(470, 350, { color: "#8f97ad44" }, {
      count: 18, angle: -90, spread: 42, speedMin: 4, speedMax: 11, gravity: -5,
      lifetime: 5, duration: 9.5, at: 0.4, sizeMin: 1.5, sizeMax: 2.6,
    })
  );

  return { scene, signGlow, signText, subText, doorGlow };
}

// ---------------------------------------------------------------------------------------
// Scene 1 — the street, and one figure heading down the stairs. ~12.5s
// ---------------------------------------------------------------------------------------
const ext = buildExterior("late-set-street");
const s1 = ext.scene;

// Muffled set leaking up from below — low, felt more than heard.
s1.add(sketch.sound("D2", { at: 0.4, duration: 11.5, instrument: "pad", velocity: 0.12 }));
const muffled: [string, number][] = [
  ["D2", 1.0], ["A2", 1.9], ["F2", 2.8], ["E2", 3.7],
  ["D2", 4.6], ["G2", 5.5], ["A2", 6.4], ["C3", 7.3],
  ["D2", 8.2], ["A2", 9.1], ["F2", 10.0],
];
for (const [p, t] of muffled) {
  s1.add(sketch.sound(p, { at: t, duration: 0.7, instrument: "pluck", velocity: 0.2 }));
}
for (let t = 1.0; t < 10.4; t += 0.9) {
  s1.add(sketch.sound(null, { at: t + 0.45, duration: 0.1, instrument: "brush", velocity: 0.07 }));
}

// Title.
const title = sketch.text("the late set", 202, 44, { color: "#c8cde0", weight: "confident", looseness: 0.22, energy: "calm" }, { size: 26 });
s1.add(title.named("title"));
title.stagger(0.06, { at: 1.4, duration: 0.25 });
title.fadeTo(0, { at: 9.8, duration: 1.0 });

// The sign breathes — a soft flicker, twice.
ext.signGlow.fadeTo(0.55, { at: 3.2, duration: 0.1 });
ext.signGlow.fadeTo(1, { at: 3.35, duration: 0.15 });
ext.signGlow.fadeTo(0.6, { at: 7.4, duration: 0.09 });
ext.signGlow.fadeTo(1, { at: 7.55, duration: 0.14 });

// One figure — coat, no face — crosses to the doorway and drops down the stairs.
const walker = sketch.group();
s1.add(walker.named("walker"));
const WSIL = "#07060c";
walker.add(
  sketch.loop(
    [[-7, -58], [7, -58], [12, -50], [16, -34], [13, -20], [15, -4], [-15, -4], [-12, -50]],
    { color: WSIL, weight: "confident", looseness: 0.1, fill: { color: WSIL, style: "solid" }, smooth: true }
  )
);
walker.add(sketch.blob(0, -68, 9, { color: WSIL, weight: "confident", looseness: 0.08, fill: { color: WSIL, style: "solid" } }, 12));
// A hat brim.
walker.add(sketch.stroke([[-11, -70], [11, -70]], { color: WSIL, weight: "bold" }));
const wLegL = sketch.loop([[2, -4], [-6, -4], [-8, 40], [0, 40]], { color: WSIL, weight: "confident", looseness: 0.1, fill: { color: WSIL, style: "solid" } });
wLegL.pivotAt(-2, -4);
const wLegR = sketch.loop([[-2, -4], [6, -4], [8, 40], [0, 40]], { color: WSIL, weight: "confident", looseness: 0.1, fill: { color: WSIL, style: "solid" } });
wLegR.pivotAt(2, -4);
walker.add(wLegL);
walker.add(wLegR);

walker.initial({ x: 520, y: 294 }); // feet land on the sidewalk at ~334
walker.appear({ at: 1.6, duration: 0.4 });
const W_STEPS = 6;
const W_STEP_DUR = 0.72;
const W_START = 2.0;
for (let i = 0; i < W_STEPS; i++) {
  const at = W_START + i * W_STEP_DUR;
  walker.moveBy(-38, 0, { at, duration: W_STEP_DUR, ease: "sine.inOut" });
  wLegL.rotateTo(i % 2 === 0 ? 20 : -20, { at, duration: W_STEP_DUR, ease: "sine.inOut" });
  wLegR.rotateTo(i % 2 === 0 ? -20 : 20, { at, duration: W_STEP_DUR, ease: "sine.inOut" });
  s1.add(sketch.sound(null, { at: at + W_STEP_DUR * 0.5, duration: 0.08, instrument: "thud", velocity: 0.1 }));
}
const W_AT_DOOR = W_START + W_STEPS * W_STEP_DUR; // ~6.32
wLegL.rotateTo(0, { at: W_AT_DOOR, duration: 0.3 });
wLegR.rotateTo(0, { at: W_AT_DOOR, duration: 0.3 });
// Down the stairs: sinking into the dark opening while fading.
walker.moveBy(-16, 34, { at: W_AT_DOOR + 0.2, duration: 1.4, ease: "sine.in" });
walker.fadeTo(0, { at: W_AT_DOOR + 0.6, duration: 1.1 });

s1.duration(12.5);
// Hold the empty street a beat before the cut.
ext.signGlow.fadeTo(1, { at: 11.8, duration: 0.5 });

// ---------------------------------------------------------------------------------------
// Scene 2 — the set. One room, one hanging bulb, three players. ~54s
// ---------------------------------------------------------------------------------------
const s2 = sketch.scene({
  width: W,
  height: H,
  background: {
    stops: [
      { offset: 0, color: "#0b0a14" },
      { offset: 0.7, color: "#131020" },
      { offset: 1, color: "#191323" },
    ],
    direction: "vertical",
  },
  seed: "late-set-club",
  look: "ink",
  texture: "grain",
});

// Timing — swing at ~103bpm.
const BEAT = 0.58;
const BAR = BEAT * 4;
const T0 = 2.2; // brushes count the band in
const HEAD1_AT = T0 + 1 * BAR; // bass and piano enter
const HEAD_BARS = 8;
const SOLO_AT = HEAD1_AT + HEAD_BARS * BAR;
const SOLO_BARS = 8;
const OUT_AT = SOLO_AT + SOLO_BARS * BAR;
const OUT_BARS = 4;
const END_AT = OUT_AT + OUT_BARS * BAR; // the last chord lands here
s2.label("solo", SOLO_AT);
s2.label("outhead", OUT_AT);
s2.label("final", END_AT);

const SIL = "#0b0910";
const FLOOR_Y = 372;

// Room shell: ceiling beam, a pipe, the floor.
s2.add(
  sketch.loop([[-8, -4], [648, -4], [648, 26], [-8, 26]], {
    color: "#040308", weight: "light", smooth: false, fill: { color: "#070510", style: "solid" },
  })
).appear({ at: 0, duration: 0.2 });
s2.add(sketch.stroke([[0, 40], [640, 35]], { color: "#131322", weight: "confident" })).appear({ at: 0.1, duration: 0.3 });
s2.add(sketch.stroke([[96, 37], [96, 82]], { color: "#131322", weight: "confident" })).appear({ at: 0.2, duration: 0.2 });
s2.add(
  sketch.loop([[-8, FLOOR_Y], [648, FLOOR_Y], [648, 428], [-8, 428]], {
    color: "#08070d", weight: "light", smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#1a1523" }, { offset: 1, color: "#0a080e" }], direction: "vertical" }, style: "solid" },
  })
).appear({ at: 0, duration: 0.3 });

// Two dim posters on the back wall — old bills nobody's taken down.
for (const [px, py] of [[104, 116], [376, 106]] as Pt[]) {
  s2.add(
    sketch.loop([[px, py], [px + 52, py], [px + 52, py + 72], [px, py + 72]], {
      color: "#1e1830", weight: "light", smooth: false, fill: { color: "#141020", style: "solid" },
    })
  ).appear({ at: 0.3, duration: 0.3 });
}

// --- The hanging light: cord, shade, bulb, glow — grouped and swaying gently from the
// ceiling; the cone sways with it. The floor pool stays put (wide enough to absorb the
// few pixels of sweep).
const LX = 330;
const lamp = sketch.group();
s2.add(lamp.named("lamp"));
lamp.add(sketch.stroke([[LX, 0], [LX, 90]], { color: "#08080c", weight: "light" }));
lamp.add(
  sketch.loop([[LX - 14, 90], [LX + 14, 90], [LX + 24, 112], [LX - 24, 112]], {
    color: "#0d0a08", weight: "confident", smooth: false, fill: { color: "#241a12", style: "solid" },
  })
);
const bulbGlow = sketch.ellipse(LX, 120, 30, 30, {
  color: "#00000000",
  fill: { color: { stops: [{ offset: 0, color: "#ffd98c5a" }, { offset: 1, color: "#ffd98c00" }], type: "radial" }, style: "solid" },
});
lamp.add(bulbGlow);
lamp.add(sketch.ellipse(LX, 119, 6.5, 7.5, { color: "#f2c37a", weight: "light", fill: { color: "#ffdf9e", style: "solid" } }));
const cone = sketch.loop([[LX - 22, 112], [LX + 22, 112], [LX + 74, 366], [LX - 74, 366]], {
  color: "#00000000",
  weight: "light",
  smooth: false,
  fill: {
    color: { stops: [{ offset: 0, color: "#f4cd9130" }, { offset: 1, color: "#f4cd9106" }], direction: "vertical" },
    style: "solid",
  },
});
cone.initial({ opacity: 0.75 });
lamp.add(cone);
lamp.pivotAt(LX, 0);
const pool = sketch.ellipse(LX, 368, 94, 13, {
  color: "#00000000",
  fill: { color: { stops: [{ offset: 0, color: "#f2c37a3d" }, { offset: 1, color: "#f2c37a00" }], type: "radial" }, style: "solid" },
});
pool.initial({ opacity: 0.8 });
s2.add(pool.named("light-pool"));

// The sway — slow, continuous, the whole set long.
const SCENE2_END = END_AT + 3.6;
{
  let t = 0;
  let dir = 1;
  while (t < SCENE2_END - 2.6) {
    lamp.rotateTo(2.1 * dir, { at: t, duration: 2.6, ease: "sine.inOut" });
    t += 2.6;
    dir = -dir;
  }
}

// --- Piano and pianist, stage left. The piano is a big upright block — appear, not
// drawOn (a filled shape this tall keeps permanent reveal-mask gaps, see lantern-maker).
const pianoAll = sketch.group();
s2.add(pianoAll.named("piano-station"));
pianoAll.add(
  sketch.loop([[62, 206], [192, 206], [192, FLOOR_Y], [62, FLOOR_Y]], {
    color: "#060409", weight: "confident", smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#1c1526" }, { offset: 1, color: "#0d0a12" }], direction: "vertical" }, style: "solid" },
  })
);
pianoAll.add(sketch.stroke([[62, 224], [192, 224]], { color: "#241d31", weight: "light" }));
// The keys ledge poking out toward the player.
pianoAll.add(
  sketch.loop([[192, 288], [230, 288], [230, 304], [192, 304]], {
    color: "#0a0810", weight: "confident", smooth: false, fill: { color: "#2a2438", style: "solid" },
  })
);
for (let i = 0; i < 5; i++) {
  pianoAll.add(sketch.stroke([[198 + i * 7, 289], [198 + i * 7, 297]], { color: "#0d0b14", weight: "light" }));
}
// Pianist: seated, leaning into the keys.
pianoAll.add(sketch.ellipse(252, 232, 10, 11, { color: SIL, weight: "confident", fill: { color: SIL, style: "solid" } }));
pianoAll.add(
  sketch.loop([[242, 246], [262, 250], [268, 296], [264, 332], [238, 332], [236, 292]], {
    color: SIL, weight: "confident", looseness: 0.1, smooth: true,
    fill: { color: { stops: [{ offset: 0, color: "#221a20" }, { offset: 1, color: "#0b0910" }], direction: "vertical" }, style: "solid" },
  })
);
// Stool and a leg to the pedals.
pianoAll.add(
  sketch.loop([[238, 332], [268, 332], [266, 342], [240, 342]], {
    color: SIL, weight: "confident", smooth: false, fill: { color: SIL, style: "solid" },
  })
);
pianoAll.add(sketch.stroke([[244, 342], [242, FLOOR_Y]], { color: SIL, weight: "bold" }));
pianoAll.add(sketch.stroke([[262, 342], [264, FLOOR_Y]], { color: SIL, weight: "bold" }));
pianoAll.add(sketch.stroke([[246, 332], [230, 354], [226, 368]], { color: SIL, weight: "bold" }));
const pianistHands = sketch.group();
// Two arms reaching for the same keyboard overlap on purpose.
pianistHands.add(sketch.stroke([[244, 254], [228, 274], [214, 292]], { color: SIL, weight: "bold" }).lintIgnore("overlap"));
pianistHands.add(sketch.blob(212, 291, 4.5, { color: SIL, weight: "light", fill: { color: SIL, style: "solid" } }, 8));
pianistHands.add(sketch.stroke([[248, 258], [236, 280], [222, 298]], { color: SIL, weight: "bold" }));
pianistHands.add(sketch.blob(220, 297, 4.5, { color: SIL, weight: "light", fill: { color: SIL, style: "solid" } }, 8));
pianoAll.add(pianistHands);
pianoAll.appear({ at: 0.2, duration: 0.5 });
pianoAll.pivotAt(250, FLOOR_Y);

// --- Drum kit and drummer, stage right.
const drumsAll = sketch.group();
s2.add(drumsAll.named("drum-station"));
// Drummer behind the kit (added before the drums so the kick occludes him).
drumsAll.add(sketch.ellipse(548, 212, 10, 11, { color: SIL, weight: "confident", fill: { color: SIL, style: "solid" } }));
drumsAll.add(
  sketch.loop([[534, 228], [562, 228], [570, 268], [564, 298], [532, 298], [528, 264]], {
    color: SIL, weight: "confident", looseness: 0.1, smooth: true,
    fill: { color: { stops: [{ offset: 0, color: "#201a24" }, { offset: 1, color: "#0b0910" }], direction: "vertical" }, style: "solid" },
  })
);
const rideArm = sketch.group();
rideArm.add(sketch.stroke([[560, 236], [578, 246], [592, 244]], { color: SIL, weight: "bold" }));
rideArm.add(sketch.blob(594, 244, 4, { color: SIL, weight: "light", fill: { color: SIL, style: "solid" } }, 8));
rideArm.pivotAt(560, 236);
drumsAll.add(rideArm);
const snareArm = sketch.group();
snareArm.add(sketch.stroke([[538, 238], [520, 264], [502, 288]], { color: SIL, weight: "bold" }));
snareArm.add(sketch.blob(500, 289, 4, { color: SIL, weight: "light", fill: { color: SIL, style: "solid" } }, 8));
snareArm.pivotAt(538, 238);
drumsAll.add(snareArm);
// Kick drum with its front hoop.
const kick = sketch.ellipse(532, 336, 30, 30, {
  color: "#060409", weight: "confident",
  fill: { color: { stops: [{ offset: 0, color: "#2a2032" }, { offset: 1, color: "#120d16" }], direction: "vertical" }, style: "solid" },
});
drumsAll.add(kick);
drumsAll.add(sketch.ellipse(532, 336, 22, 22, { color: "#3a2c42", weight: "light" }).lintIgnore("overlap"));
// Snare + stand.
drumsAll.add(sketch.stroke([[488, 303], [488, FLOOR_Y]], { color: "#1c1826", weight: "confident" }));
drumsAll.add(sketch.ellipse(488, 298, 17, 5, { color: "#0a0810", weight: "confident", fill: { color: "#38304a", style: "solid" } }));
// Ride cymbal + stand.
drumsAll.add(sketch.stroke([[592, 250], [586, FLOOR_Y]], { color: "#1c1826", weight: "confident" }));
drumsAll.add(sketch.ellipse(592, 246, 28, 6, { color: "#241c10", weight: "confident", fill: { color: "#4a3c28", style: "solid" } }));
// Hi-hat + stand.
drumsAll.add(sketch.stroke([[462, 271], [462, FLOOR_Y]], { color: "#1c1826", weight: "confident" }));
drumsAll.add(sketch.ellipse(462, 266, 13, 4, { color: "#241c10", weight: "light", fill: { color: "#3a3040", style: "solid" } }));
drumsAll.appear({ at: 0.35, duration: 0.5 });
drumsAll.pivotAt(548, FLOOR_Y);

// --- The bassist and the upright bass, grouped so the solo step moves them together.
const BX = 408; // the bass's own center line
const bassGroup = sketch.group();
s2.add(bassGroup.named("bassist"));
// The bass: waisted body, neck, scroll, strings, bridge.
bassGroup.add(
  sketch.loop(
    [
      [BX, 250], [BX + 20, 258], [BX + 28, 278], [BX + 22, 296], [BX + 30, 316],
      [BX + 24, 344], [BX, 354], [BX - 24, 344], [BX - 30, 316], [BX - 22, 296],
      [BX - 28, 278], [BX - 20, 258],
    ],
    {
      color: "#0a0705", weight: "confident", looseness: 0.08, smooth: true,
      fill: {
        color: { stops: [{ offset: 0, color: "#40281c" }, { offset: 0.45, color: "#241410" }, { offset: 1, color: "#120a08" }], direction: "vertical" },
        style: "solid",
      },
    }
  ).lintIgnore("overlap")
);
bassGroup.add(sketch.stroke([[BX, 252], [BX - 6, 160]], { color: "#170f0a", weight: "bold" }));
bassGroup.add(sketch.blob(BX - 7, 152, 5.5, { color: "#170f0a", weight: "light", fill: { color: "#170f0a", style: "solid" } }, 8));
// The string runs down the neck it's strung on — overlap is the whole point.
bassGroup.add(sketch.stroke([[BX - 5, 166], [BX - 1, 328]], { color: "#c9a26a88", weight: "light" }).lintIgnore("overlap"));
bassGroup.add(sketch.stroke([[BX - 9, 322], [BX + 9, 322]], { color: "#0a0705", weight: "confident" }));
// The player, standing behind and to the right, leaning over the shoulder of the bass.
bassGroup.add(sketch.ellipse(446, 208, 10, 11, { color: SIL, weight: "confident", fill: { color: SIL, style: "solid" } }));
bassGroup.add(
  sketch.loop([[438, 224], [454, 226], [464, 258], [460, 300], [466, 352], [438, 352], [434, 300], [430, 258]], {
    color: SIL, weight: "confident", looseness: 0.1, smooth: true,
    fill: {
      color: { stops: [{ offset: 0, color: "#2c2018" }, { offset: 0.4, color: "#151011" }, { offset: 1, color: "#0b0910" }], direction: "vertical" },
      style: "solid",
    },
  }).lintIgnore("overlap")
);
// Feet.
bassGroup.add(sketch.loop([[436, 352], [448, 352], [450, 370], [432, 370]], { color: SIL, weight: "light", smooth: false, fill: { color: SIL, style: "solid" } }));
bassGroup.add(sketch.loop([[452, 352], [464, 352], [468, 370], [450, 370]], { color: SIL, weight: "light", smooth: false, fill: { color: SIL, style: "solid" } }));
// Left arm up the fingerboard, still (the hand walks positions, but at this distance a
// still arm reads better than a wandering one).
bassGroup.add(sketch.stroke([[442, 232], [420, 210], [BX - 3, 188]], { color: SIL, weight: "bold" }));
bassGroup.add(sketch.blob(BX - 4, 186, 4.5, { color: SIL, weight: "light", fill: { color: SIL, style: "solid" } }, 8));
// The plucking arm — pivoted at the shoulder, flicked on every note below.
const pluckArm = sketch.group();
pluckArm.add(sketch.stroke([[448, 240], [432, 268], [BX + 8, 288]], { color: SIL, weight: "bold" }));
pluckArm.add(sketch.blob(BX + 6, 290, 4.5, { color: SIL, weight: "light", fill: { color: SIL, style: "solid" } }, 8));
pluckArm.pivotAt(448, 240);
bassGroup.add(pluckArm);
bassGroup.appear({ at: 0.5, duration: 0.5 });
bassGroup.pivotAt(446, 370);

// --- The room: three heads in the dark at the bottom of frame, and smoke.
const audience = sketch.group();
s2.add(audience.named("audience"));
audience.add(sketch.ellipse(86, 416, 26, 30, { color: "#04030a", weight: "light", fill: { color: "#05040a", style: "solid" } }));
const head2 = sketch.ellipse(196, 414, 30, 34, { color: "#04030a", weight: "light", fill: { color: "#05040a", style: "solid" } });
head2.pivotAt(196, 448);
audience.add(head2);
audience.add(sketch.ellipse(560, 412, 28, 32, { color: "#04030a", weight: "light", fill: { color: "#05040a", style: "solid" } }));
audience.appear({ at: 0.7, duration: 0.6 });
// One listener nods along, out of time, the way people do.
{
  let t = 3.1;
  let dir = 1;
  while (t < END_AT - 1) {
    head2.rotateTo(2.4 * dir, { at: t, duration: 1.45, ease: "sine.inOut" });
    t += 1.45;
    dir = -dir;
  }
}

// Smoke — a cigarette over the front table, and two slow room-haze emitters. Translucent
// (alpha in the color) and small, so it reads as drifting haze, not falling popcorn.
s2.add(
  sketch.particles(96, 392, { color: "#9aa3b83e" }, {
    count: 26, angle: -88, spread: 26, speedMin: 4, speedMax: 10, gravity: -5,
    lifetime: 7.5, duration: SCENE2_END - 9, at: 0.8, sizeMin: 1.5, sizeMax: 2.6,
  })
);
s2.add(
  sketch.particles(300, 410, { color: "#6f769036" }, {
    count: 22, angle: -90, spread: 60, speedMin: 3, speedMax: 7, gravity: -3,
    lifetime: 9, duration: SCENE2_END - 10, at: 1.2, sizeMin: 1.5, sizeMax: 3,
  })
);
s2.add(
  sketch.particles(520, 404, { color: "#6f769036" }, {
    count: 18, angle: -92, spread: 50, speedMin: 3, speedMax: 8, gravity: -3,
    lifetime: 8, duration: SCENE2_END - 11, at: 1.6, sizeMin: 1.5, sizeMax: 3,
  })
);

// =========================================================================================
// The music, and the playing that goes with it.
// =========================================================================================

// One bass note: the sound plus the pluck-arm flick at the same instant. The flick window
// (0.09 + 0.16 = 0.25s) stays inside the tightest note spacing used anywhere (0.29s).
function bassNote(t: number, pitch: string, vel = 0.5, dur = 0.55) {
  s2.add(sketch.sound(pitch, { at: t, duration: dur, instrument: "pluck", velocity: vel }));
  pluckArm.rotateTo(10, { at: t, duration: 0.09, ease: "power2.out" });
  pluckArm.rotateTo(0, { at: t + 0.09, duration: 0.16, ease: "sine.out" });
}

// One comp chord: three piano voices plus the hands dipping.
function compChord(t: number, notes: string[], vel = 0.3) {
  for (const n of notes) s2.add(sketch.sound(n, { at: t, duration: 0.7, instrument: "piano", velocity: vel }));
  pianistHands.moveBy(0, 3, { at: t, duration: 0.08, ease: "power2.out" });
  pianistHands.moveBy(0, -3, { at: t + 0.08, duration: 0.22, ease: "sine.out" });
}

// One bar of brushes-and-kick swing. Arms sync to the quarter pulse only (the skip notes
// at 1.66/3.66 would overlap the arm's own return tween).
function swingBar(t: number, mult = 1) {
  const rideHits: [number, number][] = [[0, 0.3], [1, 0.2], [1 + 2 / 3, 0.15], [2, 0.28], [3, 0.2], [3 + 2 / 3, 0.15]];
  for (const [b, v] of rideHits) {
    s2.add(sketch.sound(null, { at: t + b * BEAT, duration: 0.13, instrument: "brush", velocity: v * mult }));
  }
  s2.add(sketch.sound(null, { at: t, duration: 0.2, instrument: "thud", velocity: 0.24 * mult }));
  s2.add(sketch.sound(null, { at: t + 2 * BEAT, duration: 0.2, instrument: "thud", velocity: 0.18 * mult }));
  for (let b = 0; b < 4; b++) {
    rideArm.rotateTo(7, { at: t + b * BEAT, duration: 0.09, ease: "power2.out" });
    rideArm.rotateTo(0, { at: t + b * BEAT + 0.09, duration: 0.2, ease: "sine.out" });
  }
  // Backbeat sweeps on the snare, beats 2 and 4.
  for (const b of [1, 3]) {
    snareArm.rotateTo(-6, { at: t + b * BEAT, duration: 0.12, ease: "sine.out" });
    snareArm.rotateTo(0, { at: t + b * BEAT + 0.14, duration: 0.3, ease: "sine.inOut" });
  }
}

// The tune: an 8-bar minor blues in D.
const CHORDS: Record<string, string[]> = {
  dm: ["D4", "F4", "C5"],
  gm: ["G3", "Bb3", "F4"],
  bb: ["Bb3", "D4", "Ab4"],
  a7: ["A3", "C#4", "G4"],
};
const HEAD_PROG = ["dm", "dm", "gm", "dm", "bb", "a7", "dm", "a7"];
const HEAD_BASS: string[][] = [
  ["D2", "F2", "A2", "C3"],
  ["D2", "E2", "F2", "A2"],
  ["G2", "Bb2", "D3", "Bb2"],
  ["D2", "F2", "E2", "D2"],
  ["Bb2", "D3", "F3", "D3"],
  ["A2", "C#3", "E3", "G3"],
  ["D2", "F2", "A2", "F2"],
  ["A2", "G2", "E2", "C#3"],
];
const OUT_PROG = ["dm", "gm", "a7", "dm"];
const OUT_BASS: string[][] = [
  ["D2", "F2", "A2", "C3"],
  ["G2", "Bb2", "D3", "F3"],
  ["A2", "E2", "C#3", "A2"],
  ["D2", "A2", "F2", "D2"],
];

// Count-in: one bar of brushes alone.
swingBar(T0, 0.8);

// Head, first time: full trio.
for (let bar = 0; bar < HEAD_BARS; bar++) {
  const t = HEAD1_AT + bar * BAR;
  swingBar(t);
  for (let b = 0; b < 4; b++) bassNote(t + b * BEAT, HEAD_BASS[bar][b], 0.5);
  compChord(t + 1.5 * BEAT, CHORDS[HEAD_PROG[bar]], 0.28);
  compChord(t + 3 * BEAT, CHORDS[HEAD_PROG[bar]], 0.22);
}

// The solo — a written line up in the bass's singing register, phrases with real air
// between them. Offsets are in beats from SOLO_AT; minimum spacing is a swung half-beat.
const SOLO_LINE: [number, string][] = [
  [0, "D3"], [1, "F3"], [1.5, "G3"], [2, "A3"], [3, "F3"],
  [4, "E3"], [5, "D3"], [5.5, "E3"], [6, "F3"],
  [8, "G3"], [9, "Bb3"], [9.5, "A3"], [10, "G3"], [11, "D3"],
  [12, "F3"], [13, "E3"], [13.5, "D3"], [14, "C3"],
  [16, "Bb2"], [16.5, "D3"], [17, "F3"], [17.5, "A3"], [18, "Bb3"],
  [19, "A3"], [20, "G3"], [20.5, "E3"], [21, "C#3"], [22, "E3"],
  [24, "D3"], [24.5, "F3"], [25, "A3"], [26, "D4"], [27, "C4"],
  [27.5, "A3"], [28, "F3"], [29, "E3"], [29.5, "C#3"], [30, "D3"],
];
for (const [b, p] of SOLO_LINE) bassNote(SOLO_AT + b * BEAT, p, 0.58, 0.5);
// Under the solo: drums pulled way back, piano feeding one quiet chord a bar.
for (let bar = 0; bar < SOLO_BARS; bar++) {
  const t = SOLO_AT + bar * BAR;
  swingBar(t, 0.55);
  compChord(t + 1.5 * BEAT, CHORDS[HEAD_PROG[bar]], 0.16);
}

// Head out, once, and done.
for (let bar = 0; bar < OUT_BARS; bar++) {
  const t = OUT_AT + bar * BAR;
  swingBar(t);
  for (let b = 0; b < 4; b++) bassNote(t + b * BEAT, OUT_BASS[bar][b], 0.5);
  compChord(t + 1.5 * BEAT, CHORDS[OUT_PROG[bar]], 0.28);
  compChord(t + 3 * BEAT, CHORDS[OUT_PROG[bar]], 0.22);
}

// The final chord — everyone lands on it together and lets it ring.
s2.add(sketch.sound("D2", { at: END_AT, duration: 2.8, instrument: "pluck", velocity: 0.55 }));
for (const n of ["D4", "F4", "A4", "C5"]) s2.add(sketch.sound(n, { at: END_AT, duration: 2.8, instrument: "piano", velocity: 0.4 }));
s2.add(sketch.sound(null, { at: END_AT, duration: 0.3, instrument: "brush", velocity: 0.4 }));
s2.add(sketch.sound(null, { at: END_AT + 0.25, duration: 0.3, instrument: "brush", velocity: 0.25 }));
s2.add(sketch.sound("D3", { at: END_AT + 0.2, duration: 3.0, instrument: "strings", velocity: 0.15 }));
pluckArm.rotateTo(12, { at: END_AT, duration: 0.1, ease: "power2.out" });
pluckArm.rotateTo(0, { at: END_AT + 0.12, duration: 0.6, ease: "sine.out" });
pianistHands.moveBy(0, 4, { at: END_AT, duration: 0.1, ease: "power2.out" });
pianistHands.moveBy(0, -4, { at: END_AT + 0.5, duration: 0.7, ease: "sine.out" });

// =========================================================================================
// Playing bodies: everyone leans into the time. Nods run on 2-beat cycles, sequential
// windows so no two rotation tweens on the same node ever overlap.
// =========================================================================================
function nodAlong(node: Group, amp: number, from: number, to: number, phase = 0) {
  let t = from + phase;
  let dir = 1;
  while (t < to - 2 * BEAT) {
    node.rotateTo(amp * dir, { at: t, duration: 2 * BEAT, ease: "sine.inOut" });
    t += 2 * BEAT;
    dir = -dir;
  }
  node.rotateTo(0, { at: to, duration: 0.8, ease: "sine.out" });
}
nodAlong(bassGroup, 1.8, HEAD1_AT, END_AT);
nodAlong(pianoAll, 1.2, HEAD1_AT, END_AT, BEAT);
nodAlong(drumsAll, 1.1, T0, END_AT, BEAT * 0.5);

// =========================================================================================
// The solo staging: the bassist shuffles forward into the pool of light during the last
// bar of the head; the rest of the room falls half a stop darker; the camera leans in.
// =========================================================================================
const STEP_AT = SOLO_AT - 1.6;
bassGroup.moveBy(-84, 8, { at: STEP_AT, duration: 1.5, ease: "sine.inOut" });
// ...and back home during the last bar of the solo.
bassGroup.moveBy(84, -8, { at: OUT_AT - 1.6, duration: 1.5, ease: "sine.inOut" });

for (const g of [pianoAll, drumsAll, audience]) {
  g.fadeTo(0.4, { at: STEP_AT, duration: 1.8 });
  g.fadeTo(1, { at: OUT_AT - 1.6, duration: 1.8 });
}
cone.fadeTo(1, { at: STEP_AT, duration: 1.8 });
cone.fadeTo(0.75, { at: OUT_AT - 1.6, duration: 1.8 });
pool.fadeTo(1, { at: STEP_AT, duration: 1.8 });
pool.fadeTo(0.8, { at: OUT_AT - 1.6, duration: 1.8 });

// Zoom only, no pan: the world is exactly one screen, so any pan target off dead center
// trips the camera-bounds lint (it can't see that zoom shrinks the framed region). The
// solo spot sits near center anyway — the push-in alone carries the lean-in.
const cam = s2.camera();
cam.zoomTo(1.22, { at: STEP_AT, duration: 2.4, ease: "sine.inOut" });
cam.zoomTo(1, { at: OUT_AT - 1.6, duration: 2.2, ease: "sine.inOut" });

// After the last chord: the room settles, the light eases down, the smoke keeps going.
cone.fadeTo(0.42, { at: END_AT + 1.4, duration: 1.8 });
pool.fadeTo(0.45, { at: END_AT + 1.4, duration: 1.8 });
bulbGlow.fadeTo(0.6, { at: END_AT + 1.4, duration: 1.8 });

s2.duration(SCENE2_END);

// ---------------------------------------------------------------------------------------
// Scene 3 — back up on the street. The chord rings out, the sign goes dark. ~11s
// ---------------------------------------------------------------------------------------
const ext3 = buildExterior("late-set-street-close");
const s3 = ext3.scene;

// The last chord still ringing from below, thinning out.
s3.add(sketch.sound("D2", { at: 0, duration: 3.2, instrument: "pad", velocity: 0.12 }));
s3.add(sketch.sound("D3", { at: 0.2, duration: 2.8, instrument: "strings", velocity: 0.1 }));
s3.add(sketch.sound("D2", { at: 1.2, duration: 1.4, instrument: "pluck", velocity: 0.14 }));
s3.add(sketch.sound("A2", { at: 2.6, duration: 1.6, instrument: "pluck", velocity: 0.1 }));

// The sign flickers, argues with itself, and gives up for the night.
ext3.signGlow.fadeTo(0.4, { at: 3.6, duration: 0.1 });
ext3.signGlow.fadeTo(1, { at: 3.75, duration: 0.12 });
ext3.signGlow.fadeTo(0.3, { at: 4.3, duration: 0.09 });
ext3.signGlow.fadeTo(0.85, { at: 4.45, duration: 0.12 });
ext3.signGlow.fadeTo(0.05, { at: 5.2, duration: 0.6 });
ext3.signText.fadeTo(0.2, { at: 5.2, duration: 0.6 });
ext3.subText.fadeTo(0.16, { at: 5.2, duration: 0.6 });
ext3.doorGlow.fadeTo(0, { at: 6.0, duration: 1.0 });
// One last soft note as the light dies.
s3.add(sketch.sound("D3", { at: 5.3, duration: 1.8, instrument: "piano", velocity: 0.2 }));

const goodnight = sketch.text("goodnight", 262, 58, { color: "#8f97ad", weight: "light", looseness: 0.24, energy: "calm" }, { size: 16 });
// The "i" dot glyph is a point-like stroke by construction — intentional.
for (const c of goodnight.children) c.lintIgnore("degenerate");
s3.add(goodnight.named("goodnight"));
goodnight.stagger(0.07, { at: 7.0, duration: 0.2 });

s3.duration(11);

// ---------------------------------------------------------------------------------------
const film = sketch.film({ width: W, height: H, background: "#04050c" });
film.addScene(s1, { transition: "cut", hold: 0.4 });
film.addScene(s2, { transition: "fade", transitionDuration: 1.0, hold: 0.6 });
film.addScene(s3, { transition: "fade", transitionDuration: 1.2, hold: 1.4 });

export default film;
