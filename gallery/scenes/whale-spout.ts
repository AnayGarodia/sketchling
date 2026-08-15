import { sketch } from "../../src/index.js";
import { appearIn, beats, driftOnce, drawIn, pulseScale, ripple, swayMove } from "../lib.js";

// A whale's back and flukes breaking a calm sea at dusk, blowing one slow spout per cycle.

// look: "clay" — its ~10fps hold is the whole reason this scene works. A surfacing whale moves
// at almost no speed at all, and stepped time makes that read as deliberate weight rather than
// as nothing happening; the same motion tweened smoothly at 30fps just looks like a still.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: {
    stops: [
      { offset: 0, color: "#5c6099" },
      { offset: 0.34, color: "#a9789f" },
      { offset: 0.5, color: "#e8a884" },
    ],
  },
  seed: "whale-spout",
  look: "clay",
});

// Every sway below eases with power3.inOut rather than the helpers' default sine: the flatter
// tail dwells at the top and bottom of each rise, which is how something with a whale's mass
// actually turns around, where sine carries the same speed straight through the extremes.
const EASE = "power3.inOut";
const HORIZON = 244;
const WATERLINE = 352;
const HIDE = "#41627f";
const DEEP = "#16394b";

// --- Sea first: dark, and darker toward the viewer, so the whale has something to be a
// silhouette against. A dusk sky over a pale sea would have left the animal the lightest thing
// in frame, which is backwards — the water is what the light is coming off.
const sea = sketch.loop(
  [[0, HORIZON], [480, HORIZON], [480, 480], [0, 480]],
  {
    color: DEEP,
    weight: "confident",
    smooth: false,
    fill: { color: { stops: [{ offset: 0, color: "#2e7186" }, { offset: 1, color: "#123043" }] }, style: "solid" },
  }
);
scene.add(sea).drawOn({ at: 0, duration: 0.8 });

// A low sun just off the horizon, and the reason the sky is peach at the bottom and violet at
// the top. Placed right of centre so it doesn't sit behind the spout.
const sun = sketch.ellipse(388, 208, 27, 27, { color: "#f6d3a4", weight: "light", fill: { color: "#fbe3ba", style: "solid" } }, 24);
scene.add(sun).drawOn({ at: 0.8, duration: 0.4 });

// Two long flat clouds — dusk cloud is stretched thin, and these also stop the top third of the
// frame being empty violet. They drift on different rhythms, a dozen pixels at most.
const clouds = ([
  [116, 104, 96, 15],
  [318, 148, 62, 11],
] as [number, number, number, number][]).map(([x, y, rx, ry]) =>
  sketch.ellipse(x, y, rx, ry, { color: "#8f7fa8", weight: "light", fill: { color: "#b294b0", style: "solid" } }, 20)
);
clouds.forEach((c) => scene.add(c));
appearIn(clouds, { from: 1.0, to: 1.4, each: 0.35 });
swayMove(clouds[0], 12, 0, 1, EASE);
swayMove(clouds[1], -8, 0, 2, EASE);

// Calm water: three long, almost-flat swell lines, well clear of the whale so they never look
// like they are cutting into it. Calm is the point — a choppy sea would fight the spout for
// attention, and the spout is the event here.
const swell = [
  sketch.stroke([[24, 286], [130, 281], [232, 286]], { color: "#5f9fae", weight: 4 }),
  sketch.stroke([[300, 274], [382, 270], [456, 275]], { color: "#5f9fae", weight: 4 }),
  sketch.stroke([[52, 428], [188, 420], [330, 428], [446, 421]], { color: "#3f7c92", weight: 5 }),
];
swell.forEach((s) => scene.add(s));
drawIn(swell, { from: 1.3, to: 2.0 });
swell.forEach((s, i) => swayMove(s, i % 2 === 0 ? 14 : -11, 0, i === 2 ? 1 : 2, EASE));

// The sun's own path on the water, broken into two short dashes rather than drawn as a column:
// on a calm sea the reflection is a chain of glints, and a solid streak would read as a pole.
const glints = [
  sketch.stroke([[372, 258], [404, 256]], { color: "#f3cfa2", weight: 4 }),
  sketch.stroke([[378, 272], [398, 271]], { color: "#e7bd92", weight: 3 }),
];
glints.forEach((g) => scene.add(g).lintIgnore("overlap"));
drawIn(glints, { from: 2.0, to: 2.3 });

// --- Ripples where the animal meets the water, added BEFORE the whale so the body occludes the
// far half of each ring and only the near arc crosses in front of it — which is what a ring
// spreading round something floating actually looks like. Drawn after the whale instead, the
// far arc lay across the animal's back like a stray pencil line.
//
// Both are very wide and very flat: a round ring here would read as a hoop standing in the sea
// rather than a disturbance lying on it. Pivoted at their own centres, or `scaleTo` expands them
// about a bbox origin that isn't the middle and the ring crawls sideways off the whale as it grows.
([
  [232, WATERLINE + 6, 92, 11, 1.45, 0.55, 2],
  [404, WATERLINE + 6, 44, 8, 1.7, 0.45, 4],
] as [number, number, number, number, number, number, number][]).forEach(([x, y, rx, ry, to, peak, n]) => {
  const ring = sketch.ellipse(x, y, rx, ry, { color: "#bfdde5", weight: 3 }, 22);
  scene.add(ring).lintIgnore("overlap");
  ring.pivotAt(x, y);
  ripple(ring, to, n, peak);
});

// --- The whale, as one group: back, fin, blowhole and flukes all rise and sink together, which
// is the only way the gap of water between the back and the tail stays believable.
const whale = sketch.group();

// The back is one wide, low hump with a flat waterline for a base — everything below the surface
// is simply not drawn. A whale rendered as a whole body seen through water reads as a fish in a
// tank; a whale rendered as the part above the line reads as a whale.
const back = sketch.loop(
  [
    [102, WATERLINE], [128, 324], [180, 302], [244, 298], [300, 310], [340, 332], [362, WATERLINE],
    [362, WATERLINE + 6], [102, WATERLINE + 6],
  ],
  { color: DEEP, weight: "bold", fill: { color: sketch.shade(HIDE, { from: "top", amount: 0.42 }), style: "solid" } }
);
whale.add(back);

// The dorsal fin, hard-edged (smooth: false) so it stays a blade instead of melting into the
// back. One triangle is most of what makes this animal read as a whale at thumbnail size.
whale.add(
  sketch.loop([[286, 312], [300, 282], [316, 316]], {
    color: DEEP,
    weight: "confident",
    smooth: false,
    fill: { color: "#3c5b76", style: "solid" },
  }).lintIgnore("overlap")
);

// The blowhole, where the spout has to come from. Small and dark: a lighter mark here read as an
// eye, which put the whale's face in the middle of its back.
whale.add(sketch.ellipse(186, 306, 9, 5, { color: "#0f2733", weight: "light", fill: { color: "#16394b", style: "solid" } }, 12).lintIgnore("overlap"));

// The flukes, well behind the back with open water between them: the peduncle is under the
// surface, and that gap is what gives the animal its real length. Hard edges again — a fluke is
// two stiff blades with a notch, and a spline through the notch fills it in.
whale.add(
  sketch.loop(
    [
      [396, WATERLINE + 4], [382, 330], [356, 300], [386, 322], [400, 328],
      [416, 314], [442, 292], [422, 326], [412, WATERLINE + 4],
    ],
    { color: DEEP, weight: "bold", smooth: false, fill: { color: sketch.shade("#3a5c78", { from: "left", amount: 0.34 }), style: "solid" } }
  )
);
// The tail stock, barely clearing the surface between back and flukes. Without it the flukes
// read as a separate V-shaped object floating near a hump; with it, the eye joins the three
// shapes into one animal that happens to be mostly underwater.
whale.add(
  sketch.loop(
    [[354, WATERLINE + 5], [372, 344], [398, 342], [412, WATERLINE + 5]],
    { color: DEEP, weight: "confident", fill: { color: "#31536e", style: "solid" } }
  ).lintIgnore("overlap")
);
scene.add(whale);
drawIn(whale.children, { from: 1.7, to: 2.8, each: 0.34 });

// Rising and sinking five pixels, twice: at this scale that is the difference between a whale
// surfacing and a whale-shaped rock. The clay look's stepped time is what makes so small a
// motion legible at all — each hold lands on a visibly different position.
swayMove(whale, 0, 5, 2, EASE);

// --- The spout: ONE silhouette, a narrow stem at the blowhole flaring steadily wider all the
// way up, with a scalloped top edge for the spray tearing off it. Two earlier passes are in this
// shape's negative: five stacked blobs read as a cairn of pale boulders balanced on the whale
// (clay outlines every shape, so all the internal seams showed), and a plume widest at its
// MIDDLE read as a light bulb. Vapour under pressure only ever gets wider as it rises.
const plume = sketch.loop(
  [
    [183, 310], [173, 274], [159, 246], [145, 220],
    [136, 206], [150, 197], [163, 204], [177, 192], [191, 201], [205, 190], [219, 201], [232, 205],
    [228, 222], [216, 250], [202, 278], [194, 310],
  ],
  { color: "#a7c4cf", weight: "light", looseness: 0.25, fill: { color: "#e2f0f4", style: "solid" } }
);
const spout = sketch.group([plume]);
scene.add(spout);

// No drawOn anywhere on this group: driftOnce owns its opacity for the entire timeline, so a
// reveal scheduled during the intro would only ever be drawn at opacity 0 (see cat-nap's z's).
// One beat = the whole loop, so the whale blows exactly once per cycle: the puff fades up out of
// the blowhole, drifts a little further up, and is gone again before the seam.
driftOnce(spout, 6, -15, beats(1)[0], { peak: 0.92, ease: "sine.out" });

// The swell is a separate property from the drift, so they compose: the puff also expands by a
// third as it rises, pivoted at the blowhole so it grows OUT of the whale rather than about its
// own middle (which would sink the bottom of the plume into the animal's back).
spout.pivotAt(186, 300);
pulseScale(spout, 1.34, 1, EASE);

export default scene;
