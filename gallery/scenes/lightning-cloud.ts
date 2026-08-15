import { sketch } from "../../src/index.js";
import { appearIn, drawIn, fallLoop, pulseSquash, rng } from "../lib.js";
import type { SketchNode } from "../../src/index.js";

// One storm cloud filling the upper frame, a bolt striking under it twice a cycle, rain sheeting down.

// look: "ink", no texture. This is the darkest, hardest-contrast scene of the set and it wants the
// bare pen: ink's own boil keeps the cloud's underside alive between strikes, and a texture pass
// over the top would only lift the blacks the whole effect depends on.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#121824" },
      { offset: 0.55, color: "#1d2836" },
      { offset: 1, color: "#2c3847" },
    ],
  },
  seed: "lightning-cloud",
});

const BOLT = "#fdf4c2";
const rand = rng(0x10c3);

// --- The cloud's top edge is the upper hull of six overlapping circles, so every scallop is a
// real arc. Its BASE is hand-placed and ragged instead: a storm cloud's underside is torn, and a
// flat bottom would read as the fair-weather cumulus this deliberately isn't.
const bumps: [number, number, number][] = [
  [74, 190, 52],
  [136, 148, 76],
  [222, 132, 94],
  [320, 142, 86],
  [398, 176, 60],
  [442, 204, 32],
];
const BASE: [number, number][] = [
  [468, 228],
  [430, 246],
  [386, 226],
  [340, 248],
  [292, 230],
  [246, 252],
  [200, 232],
  [152, 250],
  [104, 230],
  [58, 246],
  [16, 226],
];

const top: [number, number][] = [];
for (const [bx, by, r] of bumps) {
  for (let deg = 178; deg >= 2; deg -= 13) {
    const a = (deg * Math.PI) / 180;
    const p: [number, number] = [bx + Math.cos(a) * r, by - Math.sin(a) * r];
    if (p[1] > 214) continue;
    if (bumps.some(([ox, oy, or]) => (ox !== bx || oy !== by) && Math.hypot(p[0] - ox, p[1] - oy) < or - 0.5)) continue;
    top.push(p);
  }
}
top.sort((p, q) => p[0] - q[0]);
const CLOUD: [number, number][] = [...top, ...BASE];

const body = sketch.loop(CLOUD, {
  color: "#0f1520",
  weight: "bold",
  looseness: 0.3,
  fill: {
    color: { stops: [{ offset: 0, color: "#55627a" }, { offset: 0.58, color: "#333d4f" }, { offset: 1, color: "#1d2533" }] },
    style: "solid",
  },
});

// The under-lighting is the SAME outline as the cloud, filled with a gradient that is fully
// transparent for its top two thirds and warm only at the very bottom. Authoring it as its own
// hand-drawn crescent would mean keeping two ragged base lines in registration by hand; sharing
// the cloud's points means the glow can never drift off the edge it belongs to.
const underlit = sketch.loop(CLOUD, {
  color: "#00000000",
  weight: "light",
  looseness: 0.3,
  fill: {
    color: {
      stops: [
        { offset: 0, color: "#ffe3a000" },
        { offset: 0.8, color: "#ffe3a000" },
        { offset: 1, color: "#ffeab4" },
      ],
    },
    style: "solid",
  },
});

const storm = sketch.group([body, underlit]);
scene.add(storm);
body.drawOn({ at: 0, duration: 1.6 });
underlit.lintIgnore("overlap");

// --- Ground: one near-black ridge with a farmhouse and two firs on it. Purely for scale and for
// one warm window — a bolt with nothing underneath it is a diagram, and the whole drama here is
// that the storm is happening OVER somewhere.
scene.add(
  sketch.loop(
    [[0, 438], [82, 424], [172, 436], [262, 420], [352, 432], [440, 418], [480, 428], [480, 480], [0, 480]],
    { color: "#0b1017", weight: "confident", looseness: 0.25, fill: { color: "#141b25", style: "solid" } }
  )
).drawOn({ at: 1.5, duration: 0.8 });

const farm = sketch.group();
farm.add(
  sketch.loop([[330, 430], [368, 430], [368, 404], [330, 404]], {
    color: "#080d13",
    weight: "confident",
    looseness: 0.2,
    fill: { color: "#10161f", style: "solid" },
    smooth: false,
  })
);
farm.add(
  sketch.loop([[323, 406], [349, 386], [375, 406]], {
    color: "#080d13",
    weight: "confident",
    looseness: 0.2,
    fill: { color: "#0c1218", style: "solid" },
    smooth: false,
  }).lintIgnore("overlap")
);
farm.add(
  sketch.loop([[341, 424], [357, 424], [357, 412], [341, 412]], {
    color: "#c98a3c",
    weight: "light",
    looseness: 0.15,
    fill: { color: "#f0a94e", style: "solid" },
    smooth: false,
  }).lintIgnore("overlap")
);
scene.add(farm);

const firs = ([[118, 434, 46, 15], [186, 430, 34, 11]] as [number, number, number, number][]).map(([fx, fy, h, w]) =>
  sketch.loop([[fx - w, fy], [fx + w, fy], [fx, fy - h]], {
    color: "#080d13",
    weight: "confident",
    looseness: 0.28,
    fill: { color: "#0e141c", style: "solid" },
    smooth: false,
  }).lintIgnore("overlap")
);
firs.forEach((f) => scene.add(f));
drawIn([...farm.children, ...firs], { from: 2.0, to: 2.7, each: 0.24 });

// --- Rain, in two layers that do different jobs.
// The sheets: long faint hatch strokes, drawn on in the reveal and then left alone. They are what
// makes the frame read as rain on the loop's very first frame, when every falling streak is still
// at the opacity 0 that driftOnce rests at.
const sheets = Array.from({ length: 10 }, (_, i) => {
  const x = 26 + i * 46 + (rand() - 0.5) * 22;
  return sketch.stroke([[x, 250 + rand() * 24], [x - 22, 420 + rand() * 20]], {
    color: "#8fa8c044",
    weight: "light",
    looseness: 0.2,
  }).lintIgnore("overlap");
});
sheets.forEach((s) => scene.add(s));
appearIn(sheets, { from: 1.7, to: 2.6, each: 0.5 });

// --- The bolt. A ribbon around a zigzag spine, tapering to a point, with smooth: false so every
// corner stays a corner — a spline through these points would give a wet noodle.
function ribbon(spine: [number, number][], w0: number): [number, number][] {
  const half = (i: number) => Math.max(1.5, (w0 - i * (w0 - 3) / (spine.length - 1)) / 2);
  const right = spine.map(([x, y], i) => [x + half(i), y] as [number, number]);
  const left = spine.map(([x, y], i) => [x - half(i), y] as [number, number]).reverse();
  return [...right, ...left];
}

const bolt = sketch.loop(ribbon([[250, 236], [220, 286], [248, 280], [216, 340], [244, 332], [218, 386]], 17), {
  color: "#ffffff",
  weight: "bold",
  looseness: 0.12,
  fill: { color: BOLT, style: "solid" },
  smooth: false,
});
scene.add(bolt).lintIgnore("overlap");

const fork = sketch.loop(ribbon([[240, 330], [278, 350], [264, 356], [302, 390]], 11), {
  color: "#ffffff",
  weight: "confident",
  looseness: 0.12,
  fill: { color: BOLT, style: "solid" },
  smooth: false,
});
scene.add(fork).lintIgnore("overlap");

// The air around the strike, as one radial wash fading to fully transparent alpha at its rim. This
// is what sells the flash as light rather than as a yellow shape switching on.
const halo = sketch.ellipse(238, 300, 196, 148, {
  color: "#00000000",
  weight: "light",
  fill: {
    color: { stops: [{ offset: 0, color: "#fff3c47a" }, { offset: 1, color: "#fff3c400" }], type: "radial" },
    style: "solid",
  },
}, 28);
scene.add(halo).lintIgnore("overlap");

// --- The loop's event. A hard cut, not a fade: 0.02s on, 0.09s of hold, 0.02s off is about two
// frames at the clip's 30fps, and that snap is the entire difference between lightning and a lamp
// on a dimmer. Every strike lands back on 0, which is also each node's resting opacity, so the
// seam needs no special handling.
[bolt, fork, halo, underlit].forEach((n: SketchNode) => n.initial({ opacity: 0 }));

function strike(node: SketchNode, at: number, peak: number) {
  node.fadeTo(peak, { at, duration: 0.02 });
  node.fadeTo(0, { at: at + 0.09, duration: 0.02 });
}

// Twice per cycle, and the second one is a double flicker — a real strike rarely fires once, and
// the stutter is what stops the loop feeling metronomic.
const STRIKES: [number, number][] = [[3.55, 1], [5.02, 0.9], [5.24, 1]];
STRIKES.forEach(([at, peak], i) => {
  strike(bolt, at, peak);
  strike(halo, at, peak * 0.85);
  strike(underlit, at, peak * 0.95);
  // The fork only joins the second strike, so the two events aren't the same picture twice.
  if (i > 0) strike(fork, at, peak);
});

// --- Everything that moves between strikes.
// The cloud breathes, pivoted at its own top edge so it swells DOWNWARD into the frame; scaling
// about its centre would lift the base off the rain.
storm.pivotAt(240, 44);
pulseSquash(storm, 1.008, 1.03, 2);

// The falling streaks. fallLoop covers the entire window, which is also what keeps the exported
// clip from freezing partway through. Two different beat counts, so the two halves of the rain
// reset at different moments and the fall never all stops at once.
for (let i = 0; i < 16; i++) {
  const x = 22 + (i / 15) * 440 + (rand() - 0.5) * 26;
  const y = 252 + rand() * 96;
  const len = 16 + rand() * 12;
  const streak = sketch.stroke([[x, y], [x - len * 0.3, y + len]], {
    color: "#c9dcec",
    weight: "light",
    looseness: 0.16,
  });
  scene.add(streak).lintIgnore("overlap");
  fallLoop(streak, -14, 104 + rand() * 30, i % 2 === 0 ? 6 : 5, { ease: "sine.in", peak: 0.8 });
}

export default scene;
