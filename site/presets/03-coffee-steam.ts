// Coffee — motion after the pen stops
import { sketch } from "sketchling";

const scene = sketch.scene({ width: 360, height: 360, background: "#f5efe3", seed: "coffee-steam" });

const ink = "#241f18";
const cream = "#f7f0e2";
const coffee = "#4a2f1e";
const steamColor = "#8a8478";

const mug = sketch.loop(
  [
    [120, 180],
    [240, 180],
    [230, 280],
    [130, 280],
  ],
  { color: ink, weight: "bold", looseness: 0.22, energy: "calm", smooth: false, fill: { color: cream, style: "solid" } }
);
scene.add(mug).drawOn({ at: 0, duration: 0.81 });

const handle = sketch.stroke(
  [
    [240, 200],
    [270, 205],
    [275, 230],
    [270, 255],
    [240, 260],
  ],
  { color: ink, weight: "confident", looseness: 0.25, energy: "calm", smooth: true }
);
scene.add(handle).drawOn({ at: 0.96, duration: 0.37 });

const surface = sketch.loop(
  [
    [134, 184],
    [226, 184],
    [222, 196],
    [138, 196],
  ],
  { color: ink, weight: "confident", looseness: 0.2, energy: "calm", smooth: false, fill: { color: coffee, style: "solid" } }
);
scene.add(surface).drawOn({ at: 1.49, duration: 0.31 });

// Two wisps, drawn a beat apart, then each drifts up and pulses out of opacity. Chaining
// moveBy/fadeTo past the end of a drawOn window is the difference between a drawing and
// a scene.
const wisps: [number, number][] = [
  [160, -5],
  [195, 5],
];
wisps.forEach(([x, drift], i) => {
  const wisp = sketch.stroke(
    [
      [x, 175],
      [x + drift * 2, 140],
      [x - drift * 2, 110],
      [x + drift, 80],
    ],
    { color: steamColor, weight: "light", looseness: 0.3, energy: "calm", smooth: true }
  );
  const start = 1.98 + i * 0.35;
  scene.add(wisp).drawOn({ at: start, duration: 0.5 });
  wisp
    .moveBy(drift, -18, { at: start + 0.5, duration: 1.12, ease: "sine.inOut" })
    .fadeTo(0.15, { at: start + 0.5, duration: 0.56, ease: "sine.inOut" })
    .fadeTo(0.55, { at: start + 1.06, duration: 0.56, ease: "sine.inOut" })
    .fadeTo(0, { at: start + 1.62, duration: 0.5, ease: "sine.in" });
});

export default scene;
