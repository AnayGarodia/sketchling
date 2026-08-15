import { sketch } from "../../src/index.js";
import { appearIn, drawIn, spin, swayMove, swayRotate } from "../lib.js";

// A Dutch windmill on a low hill, sails turning, with a fence, two birds and grass in the wind.

const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#a9c8da" },
      { offset: 0.62, color: "#cfdfe2" },
      { offset: 1, color: "#e6eddc" },
    ],
  },
  seed: "windmill-field",
  look: "ink",
  texture: "watercolor",
});

const INK = "#2a231b";
const WOOD = "#3d3025";
const BRICK = "#b3805a";
const CLOTH = "#f2e8d2";
const TURF = "#7d9c58";
const DEEP_GREEN = "#4a6534";

const HX = 240; // the hub — the sails are built outward from here in all four directions
const HY = 232;
const ARM = 108;

// --- The hill, one long loop rather than a stroke plus a fill, so the horizon and the ground
// are the same object and can't drift apart. Shaded from the top: the crest catches the light
// and the near slope falls away, which is what makes it read as land instead of a green stripe.
const hill = sketch.loop(
  [
    [0, 394],
    [64, 376],
    [140, 358],
    [220, 348],
    [300, 352],
    [372, 364],
    [440, 378],
    [480, 390],
    [480, 480],
    [0, 480],
  ],
  { color: "#3f5a2c", weight: "bold", looseness: 0.18, fill: { color: sketch.shade(TURF, { from: "top", amount: 0.32 }), style: "solid" } }
);
scene.add(hill).drawOn({ at: 0, duration: 1.0 });

// --- Tower: a tapered box, smooth:false. The taper is the entire silhouette cue — a straight
// cylinder with a hat on it reads as a lighthouse. Brick rather than the grey stone this started
// as: against the dark cap and the green hill, a warm mid-tone was the only value that kept the
// tower from merging into its own roof.
const tower = sketch.loop(
  [
    [196, 246],
    [284, 246],
    [302, 386],
    [178, 386],
  ],
  { color: INK, weight: "bold", looseness: 0.12, fill: { color: sketch.shade(BRICK, { from: "top", amount: 0.3 }), style: "solid" }, smooth: false }
);
scene.add(tower).lintIgnore("overlap");

// The cap is the one part that wants a spline: a real mill cap is a boat-shaped hood, and
// straight edges here made the whole thing look like a chimney.
const cap = sketch.loop(
  [
    [188, 250],
    [200, 222],
    [280, 222],
    [292, 250],
  ],
  { color: INK, weight: "bold", looseness: 0.12, fill: { color: WOOD, style: "solid" } }
);
scene.add(cap).lintIgnore("overlap");

const gallery = sketch.loop(
  [
    [180, 296],
    [300, 296],
    [302, 310],
    [178, 310],
  ],
  { color: INK, weight: "confident", looseness: 0.12, fill: { color: WOOD, style: "solid" }, smooth: false }
);
scene.add(gallery).lintIgnore("overlap");

const door = sketch.loop(
  [
    [226, 344],
    [254, 344],
    [255, 386],
    [225, 386],
  ],
  { color: INK, weight: "confident", looseness: 0.12, fill: { color: "#2f251c", style: "solid" }, smooth: false }
);
scene.add(door).lintIgnore("overlap");

const millWindow = sketch.loop(
  [
    [230, 264],
    [250, 264],
    [250, 284],
    [230, 284],
  ],
  { color: INK, weight: "confident", looseness: 0.12, fill: { color: "#e8d68c", style: "solid" }, smooth: false }
);
scene.add(millWindow).lintIgnore("overlap");

// --- The sails. Four identical arms at 45-degree increments of 90 degrees, every point derived
// from (HX, HY) — so the union of the four is invariant under a quarter turn about the hub, and
// the group's bbox is therefore a square centred exactly on it. That is what lets `spin` turn
// the sails about the hub instead of wobbling them around some accidental centre of mass.
function sailArm(deg: number) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const px = -dy;
  const py = dx;
  const P = (r: number, w: number): [number, number] => [HX + dx * r + px * w, HY + dy * r + py * w];
  return [
    sketch.loop([P(16, -5), P(ARM, -5), P(ARM, 25), P(16, 25)], {
      color: WOOD,
      weight: "bold",
      looseness: 0.1,
      fill: { color: CLOTH, style: "solid" },
      smooth: false,
    }),
    sketch.stroke([P(16, 10), P(ARM, 10)], { color: WOOD, weight: "confident", looseness: 0.1 }),
    ...[38, 60, 82].map((r) => sketch.stroke([P(r, -5), P(r, 25)], { color: "#6b5a44", weight: "light", looseness: 0.1 })),
  ];
}

const sails = sketch.group();
for (const deg of [45, 135, 225, 315]) {
  for (const part of sailArm(deg)) sails.add(part.lintIgnore("overlap"));
}
scene.add(sails);

const hub = sketch.ellipse(HX, HY, 15, 15, { color: INK, weight: "bold", looseness: 0.1, fill: { color: "#5c4a36", style: "solid" } }, 18);
scene.add(hub).lintIgnore("overlap");

// --- Fence along the left of the crest, walking away up the slope: three posts and two rails,
// which is the cheapest way to say "this is farmland" and to give the hill a scale.
const fencePosts: [number, number][] = [
  [40, 384],
  [78, 373],
  [116, 364],
];
const fence = fencePosts.map(([x, y]) =>
  sketch.stroke([[x, y], [x, y - 40]], { color: "#7a5d3c", weight: "bold", looseness: 0.14 })
);
const rails = [12, 28].map((drop) =>
  sketch.stroke(fencePosts.map(([x, y]) => [x, y - 40 + drop] as [number, number]), { color: "#7a5d3c", weight: "confident", looseness: 0.14 }).lintIgnore("overlap")
);
[...fence, ...rails].forEach((f) => scene.add(f));

drawIn([tower, cap, gallery, door, millWindow, hub, ...fence, ...rails], { from: 0.8, to: 2.2 });
// A Group's own drawOn is a no-op, so the sails get a stagger — twenty pieces of frame and
// lattice drawn as one quick sweep, because a sail assembly reads as one object.
//
// Started at 1.9, not 2.1: a stagger runs until `at + (n-1)*each + duration`, so across twenty
// children this reveal is 1.01s long, not 0.45s. At 2.1 the last two slats were still masked
// half-drawn on the loop's FIRST frame and fully drawn on its last, which is a broken seam that
// no amount of staring at the loop ops would ever explain.
sails.stagger(0.03, { at: 1.9, duration: 0.4 });

// --- One cloud, top right, to give the empty half of the sky some weight against the birds on
// the other side. Three overlapping blobs rather than one: a cloud's whole character is a lumpy
// outline, which is the case blob() exists for.
const cloud = sketch.group(
  ([
    [378, 112, 36],
    [418, 122, 26],
    [346, 124, 25],
  ] as [number, number, number][]).map(([x, y, r]) =>
    sketch.blob(x, y, r, { color: "#cfdde4", weight: "light", looseness: 0.32, fill: { color: "#f6faf7", style: "solid" } }, 12).lintIgnore("overlap")
  )
);
scene.add(cloud);
cloud.stagger(0.12, { at: 1.1, duration: 0.5, effect: "appear" });

// --- Two birds, high and to the left, well clear of the sails' 210px circle so they never look
// like something that fell off the mill.
const birds = ([
  [72, 128, 13],
  [126, 106, 10],
] as [number, number, number][]).map(([x, y, s]) =>
  sketch.stroke([[x - s, y], [x, y - s * 0.5], [x + s, y]], { color: "#3c4a52", weight: "confident", looseness: 0.25, energy: "calm" })
);
birds.forEach((b) => scene.add(b));
appearIn(birds, { from: 2.3, to: 2.6, each: 0.3 });

// --- Grass along the near slope. Three separate blades per tuft, not one polyline through five
// points: a single zigzag stroke read as a letter W lying in the grass, whereas three arcs
// leaning off a shared root read as a clump. Each tuft is pivoted at that root, so the sway is a
// bend from the ground rather than the whole clump sliding sideways.
const tufts: [number, number, number, number][] = [
  [166, 400, 30, 5],
  [326, 384, 26, -4],
  [374, 398, 32, 6],
  [430, 412, 28, -5],
  [96, 414, 30, 4],
  [268, 404, 24, -6],
];
tufts.forEach(([x, y, h, deg], i) => {
  const tuft = sketch.group(
    ([
      [-8, -0.62, -0.86],
      [1, 0.08, -1],
      [9, 0.72, -0.8],
    ] as [number, number, number][]).map(([off, lean, tall]) =>
      sketch.stroke(
        [
          [x + off, y],
          [x + off + lean * h * 0.45, y + tall * h * 0.55],
          [x + off + lean * h, y + tall * h],
        ],
        { color: DEEP_GREEN, weight: "confident", looseness: 0.18, energy: "calm" }
      ).lintIgnore("overlap")
    )
  );
  scene.add(tuft);
  tuft.stagger(0.05, { at: 2.1 + i * 0.06, duration: 0.25 });
  tuft.pivotAt(x, y);
  swayRotate(tuft, deg, i % 2 === 0 ? 2 : 3);
});

// --- The loop. One full revolution of the sails across the window: 360 renders identically to
// 0, so the seam is exact, and 18rpm is about the pace a big mill actually turns at. pivotAt
// names the hub outright rather than trusting the browser-side bbox centre of a 20-child group.
sails.pivotAt(HX, HY);
spin(sails, 1);

// The birds glide on their own slower rhythm — relative moveBy, so the pair sums back to zero.
birds.forEach((b, i) => swayMove(b, i === 0 ? 9 : -8, i === 0 ? -5 : 4, 2));

export default scene;
