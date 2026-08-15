// Hello — hand-lettered text
import { sketch } from "sketchling";

const scene = sketch.scene({ width: 520, height: 300, background: "#f4efe2", seed: "hello" });

const ink = "#221d16";
const accent = "#c1543c";

// sketch.text() returns a Group of one Stroke per letter-stroke, so .stagger() draws the
// word on letter by letter instead of all at once.
const word = sketch.text("hello", 120, 70, { color: ink, weight: "confident", looseness: 0.16 }, { size: 96 });
scene.add(word);
word.stagger(0.08, { at: 0.2, duration: 0.45 });

const underline = sketch.stroke(
  [
    [112, 200],
    [200, 190],
    [290, 206],
    [360, 194],
  ],
  { color: accent, weight: "bold", looseness: 0.3, energy: "quick", smooth: true }
);
scene.add(underline).drawOn({ at: 1.5, duration: 0.55 });

const dot = sketch.blob(392, 178, 11, { color: ink, weight: "confident", fill: { color: accent, style: "solid" } }, 10);
scene.add(dot).drawOn({ at: 2.15, duration: 0.25 });
// Every line keeps re-jittering on its own once drawn, but nothing else moves unless you
// say so — here the dot hops up and settles back down.
dot
  .moveBy(0, -26, { at: 2.5, duration: 0.35, ease: "power2.out" })
  .moveBy(0, 26, { at: 2.85, duration: 0.4, ease: "bounce.out" });

export default scene;
