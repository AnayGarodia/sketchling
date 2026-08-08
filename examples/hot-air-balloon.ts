import { sketch } from "../src/index.js";

// A hot-air balloon drifting up through a quiet sky — tests a tapered loop envelope,
// hachure fill, a group of balloon parts moving together, staggered background clouds,
// and post-draw drift so the scene doesn't freeze once the drawing is done.
const scene = sketch.scene({ width: 480, height: 420, background: "#c2e3f5", seed: "hot-air-balloon" });

const ink = "#251f1a";
const skyCloud = "#fbf8f1";
const envelopeRed = "#d65a45";
const basketBrown = "#8a5a3a";
const ropeTan = "#b88a5e";
const sunYellow = "#f9e5a0";

// Sun first, small and bright.
const sun = sketch.blob(400, 70, 28, {
  color: "#e8b44a",
  weight: "confident",
  looseness: 0.15,
  energy: "calm",
  fill: { color: sunYellow, style: "solid" },
}, 12);
scene.add(sun).drawOn({ at: 0.0, duration: 0.4 });

// Background clouds drawn in quick succession.
const clouds = sketch.group();
scene.add(clouds);

const cloud1 = sketch.blob(90, 90, 32, {
  color: "#ffffff",
  weight: "light",
  looseness: 0.35,
  energy: "calm",
  fill: { color: skyCloud, style: "solid" },
}, 12);
clouds.add(cloud1);

const cloud2 = sketch.blob(360, 120, 38, {
  color: "#ffffff",
  weight: "light",
  looseness: 0.35,
  energy: "calm",
  fill: { color: skyCloud, style: "solid" },
}, 12);
clouds.add(cloud2);

const cloud3 = sketch.blob(110, 340, 30, {
  color: "#ffffff",
  weight: "light",
  looseness: 0.35,
  energy: "calm",
  fill: { color: skyCloud, style: "solid" },
}, 12);
clouds.add(cloud3);

clouds.stagger(0.28, { at: 0.4, duration: 0.5 });

// Balloon assembly, drawn one part at a time like a single hand working across it.
const balloon = sketch.group();
scene.add(balloon);

const envelope = sketch.loop(
  [
    [240, 70],
    [310, 130],
    [285, 220],
    [240, 255],
    [195, 220],
    [170, 130],
  ],
  {
    color: ink,
    weight: "bold",
    looseness: 0.22,
    energy: "calm",
    smooth: true,
    fill: { color: envelopeRed, style: "hachure", density: 0.6, angle: 45 },
  }
);
balloon.add(envelope).drawOn({ at: 1.2, duration: 0.95 });

// A single vertical gore line down the center of the envelope.
const gore = sketch.stroke(
  [
    [240, 80],
    [240, 240],
  ],
  { color: ink, weight: "light", looseness: 0.15, energy: "calm", smooth: true }
);
balloon.add(gore).drawOn({ at: 1.7, duration: 0.35 });

// Suspension ropes from the envelope's lower edge to the basket.
const ropeLeft = sketch.stroke(
  [
    [215, 245],
    [215, 285],
  ],
  { color: ropeTan, weight: "confident", looseness: 0.2, energy: "calm", smooth: false }
);
balloon.add(ropeLeft).drawOn({ at: 2.0, duration: 0.25 });

const ropeRight = sketch.stroke(
  [
    [265, 245],
    [265, 285],
  ],
  { color: ropeTan, weight: "confident", looseness: 0.2, energy: "calm", smooth: false }
);
balloon.add(ropeRight).drawOn({ at: 2.22, duration: 0.25 });

const basket = sketch.loop(
  [
    [215, 285],
    [265, 285],
    [255, 315],
    [225, 315],
  ],
  {
    color: ink,
    weight: "confident",
    looseness: 0.2,
    energy: "quick",
    smooth: false,
    fill: { color: basketBrown, style: "hachure", density: 0.5, angle: 30 },
  }
);
balloon.add(basket).drawOn({ at: 2.5, duration: 0.35 });

// Once the drawing is finished, the whole balloon gently rises and sways.
balloon
  .rotateTo(-3, { at: 3.4, duration: 0.6, ease: "sine.inOut" })
  .rotateTo(3, { at: 4.0, duration: 0.7, ease: "sine.inOut" })
  .rotateTo(0, { at: 4.7, duration: 0.5, ease: "sine.inOut" })
  .moveBy(0, -55, { at: 4.0, duration: 2.0, ease: "sine.inOut" });

export default scene;
