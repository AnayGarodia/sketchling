import { sketch } from "../../src/index.js";

// Gallery demo for sketch.sound(): a four-note rising motif (piano) over a sustained pad
// chord, a soft thud, then a held strings note — sketchling's only audio primitive, on the
// same scene-global `at` timeline every visual animation already uses. A dot pulses on each
// melody note (scaleTo, timed to the same `at` values) so the video shows the audio and the
// visual genuinely landing on the same beats, not just coexisting in the same file.

const scene = sketch.scene({ width: 400, height: 300, background: "#151b2b", seed: "sound-motif" });

const dot = sketch.blob(200, 150, 20, { color: "#f2c94c", fill: { color: "#f2c94c", style: "solid" } }, 10);
scene.add(dot);
dot.drawOn({ at: 0, duration: 0.3 });

const melody: [string, number][] = [
  ["C4", 0.5],
  ["E4", 0.9],
  ["G4", 1.3],
  ["C5", 1.7],
];
for (const [pitch, at] of melody) {
  scene.add(sketch.sound(pitch, { at, duration: 0.5, instrument: "piano", velocity: 0.9 }));
  dot.scaleTo(1.35, { at, duration: 0.12, ease: "power2.out" });
  dot.scaleTo(1, { at: at + 0.12, duration: 0.25, ease: "power2.in" });
}

// A sustained pad chord underneath the melody, and a strings note after a soft thud —
// three more of the four voices this file's own doc comment lists, in one small scene.
scene.add(sketch.sound("C3", { at: 0.5, duration: 2.2, instrument: "pad", velocity: 0.5 }));
scene.add(sketch.sound(null, { at: 2.3, duration: 0.15, instrument: "thud", velocity: 0.8 }));
scene.add(sketch.sound("A3", { at: 2.5, duration: 1.5, instrument: "strings", velocity: 0.7 }));

export default scene;
