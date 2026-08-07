import { sketch } from "../src/index.js";

// A jellyfish drifting in open water — tests a smoothed dome loop, several pivoted
// tentacle strokes each waving independently (phase-offset, not in unison), a slow
// bell pulse via scaleTo, and small rising bubbles that drift and fade like the
// coffee-steam wisps.
const scene = sketch.scene({ width: 400, height: 460, background: "#bce3ea", seed: "jellyfish-drift" });

const ink = "#16282b";
const bellFill = "#f2b8d4";
const tentacleColor = "#e79cc2";
const bubbleFill = "#eaf7fa";

const bell = sketch.loop(
  [
    [105, 183],
    [92, 145],
    [100, 100],
    [130, 68],
    [165, 52],
    [200, 48],
    [235, 52],
    [270, 68],
    [300, 100],
    [308, 145],
    [295, 183],
  ],
  { color: ink, weight: "bold", looseness: 0.22, energy: "calm", smooth: true, fill: { color: bellFill, style: "solid" } }
);
scene.add(bell).drawOn({ at: 0.0, duration: 1.05 });

const ridgeLeft = sketch.stroke(
  [
    [150, 70],
    [145, 110],
    [155, 150],
  ],
  { color: ink, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(ridgeLeft).drawOn({ at: 1.2, duration: 0.3 });

const ridgeRight = sketch.stroke(
  [
    [250, 70],
    [255, 110],
    [245, 150],
  ],
  { color: ink, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
);
scene.add(ridgeRight).drawOn({ at: 1.55, duration: 0.3 });

// Slow breathing pulse — starts once the bell is settled, keeps going through the
// rest of the scene so the bell never reads as a static, laser-cut shape.
bell
  .scaleTo(1.05, { at: 2.0, duration: 0.9, ease: "sine.inOut" })
  .scaleTo(0.98, { at: 2.9, duration: 0.9, ease: "sine.inOut" })
  .scaleTo(1.03, { at: 3.8, duration: 0.9, ease: "sine.inOut" })
  .scaleTo(1.0, { at: 4.7, duration: 0.7, ease: "sine.inOut" });

const tentacle1 = sketch
  .stroke(
    [
      [130, 183],
      [118, 225],
      [133, 262],
      [120, 300],
      [130, 332],
    ],
    { color: tentacleColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
  )
  .pivotAt(130, 183);
scene.add(tentacle1).drawOn({ at: 1.95, duration: 0.35 });
tentacle1
  .rotateTo(7, { at: 2.3, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-6, { at: 2.6, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(5, { at: 2.9, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(0, { at: 3.2, duration: 0.3, ease: "sine.inOut" });

const tentacle2 = sketch
  .stroke(
    [
      [165, 184],
      [157, 228],
      [170, 265],
      [159, 303],
      [168, 338],
    ],
    { color: tentacleColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
  )
  .pivotAt(165, 184);
scene.add(tentacle2).drawOn({ at: 2.35, duration: 0.35 });
tentacle2
  .rotateTo(-7, { at: 2.7, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(6, { at: 3.0, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-5, { at: 3.3, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(0, { at: 3.6, duration: 0.3, ease: "sine.inOut" });

const tentacle3 = sketch
  .stroke(
    [
      [200, 185],
      [194, 232],
      [206, 270],
      [196, 310],
      [203, 347],
    ],
    { color: tentacleColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
  )
  .pivotAt(200, 185);
scene.add(tentacle3).drawOn({ at: 2.75, duration: 0.35 });
tentacle3
  .rotateTo(7, { at: 3.1, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-6, { at: 3.4, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(5, { at: 3.7, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(0, { at: 4.0, duration: 0.3, ease: "sine.inOut" });

const tentacle4 = sketch
  .stroke(
    [
      [235, 184],
      [243, 228],
      [229, 265],
      [241, 303],
      [232, 338],
    ],
    { color: tentacleColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
  )
  .pivotAt(235, 184);
scene.add(tentacle4).drawOn({ at: 3.15, duration: 0.35 });
tentacle4
  .rotateTo(-7, { at: 3.5, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(6, { at: 3.8, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-5, { at: 4.1, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(0, { at: 4.4, duration: 0.3, ease: "sine.inOut" });

const tentacle5 = sketch
  .stroke(
    [
      [270, 183],
      [282, 225],
      [266, 262],
      [280, 300],
      [269, 332],
    ],
    { color: tentacleColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
  )
  .pivotAt(270, 183);
scene.add(tentacle5).drawOn({ at: 3.55, duration: 0.35 });
tentacle5
  .rotateTo(7, { at: 3.9, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(-6, { at: 4.2, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(5, { at: 4.5, duration: 0.3, ease: "sine.inOut" })
  .rotateTo(0, { at: 4.8, duration: 0.3, ease: "sine.inOut" });

const bubble1 = sketch.blob(150, 360, 5, { color: ink, weight: "light", fill: { color: bubbleFill, style: "solid" } }, 10);
scene.add(bubble1).drawOn({ at: 4.0, duration: 0.2 });
bubble1
  .moveBy(-8, -70, { at: 4.2, duration: 1.3, ease: "sine.inOut" })
  .fadeTo(0, { at: 4.8, duration: 0.7, ease: "sine.in" });

const bubble2 = sketch.blob(185, 375, 4, { color: ink, weight: "light", fill: { color: bubbleFill, style: "solid" } }, 10);
scene.add(bubble2).drawOn({ at: 4.2, duration: 0.2 });
bubble2
  .moveBy(5, -80, { at: 4.4, duration: 1.3, ease: "sine.inOut" })
  .fadeTo(0, { at: 5.0, duration: 0.7, ease: "sine.in" });

const bubble3 = sketch.blob(225, 370, 6, { color: ink, weight: "light", fill: { color: bubbleFill, style: "solid" } }, 10);
scene.add(bubble3).drawOn({ at: 4.4, duration: 0.2 });
bubble3
  .moveBy(-6, -75, { at: 4.6, duration: 1.3, ease: "sine.inOut" })
  .fadeTo(0, { at: 5.2, duration: 0.7, ease: "sine.in" });

const bubble4 = sketch.blob(255, 355, 4, { color: ink, weight: "light", fill: { color: bubbleFill, style: "solid" } }, 10);
scene.add(bubble4).drawOn({ at: 4.6, duration: 0.2 });
bubble4
  .moveBy(7, -65, { at: 4.8, duration: 1.3, ease: "sine.inOut" })
  .fadeTo(0, { at: 5.4, duration: 0.7, ease: "sine.in" });

export default scene;
