import { sketch } from "../../src/index.js";
import { LOOP_END, LOOP_START, beats, drawIn, spin } from "../lib.js";

// A terminal window: one command types itself out, a spinner turns while it works, cursor blinks.

const scene = sketch.scene({ width: 480, height: 480, background: "#efe8da", seed: "terminal", look: "flat" });

const CHROME = "#2b2b33";
const SHELL = "#20202a";
const TEXT = "#c8d3c0";
const ACCENT = "#7fc7a5";

// --- Window: one dark panel with a title bar, its own drop shadow offset behind it.
const shadow = sketch.loop(
  [[68, 132], [420, 132], [420, 372], [68, 372]],
  { color: "#00000000", weight: "light", looseness: 0, fill: { color: "#d3cbb8", style: "solid" }, smooth: false }
);
scene.add(shadow).drawOn({ at: 0, duration: 0.4 });

const panel = sketch.loop(
  [[56, 120], [408, 120], [408, 360], [56, 360]],
  { color: CHROME, weight: "bold", looseness: 0, fill: { color: SHELL, style: "solid" }, smooth: false }
);
scene.add(panel).lintIgnore("overlap").drawOn({ at: 0.15, duration: 0.9 });

const titleBar = sketch.loop(
  [[56, 120], [408, 120], [408, 152], [56, 152]],
  { color: CHROME, weight: "confident", looseness: 0, fill: { color: "#33333f", style: "solid" }, smooth: false }
);
scene.add(titleBar).lintIgnore("overlap").drawOn({ at: 0.9, duration: 0.4 });

[["#e0705f", 78], ["#e5b455", 100], ["#7fc7a5", 122]].forEach(([color, x], i) => {
  const dot = sketch.ellipse(Number(x), 136, 7, 7, { color: String(color), weight: "light", looseness: 0, fill: { color: String(color), style: "solid" } }, 14);
  scene.add(dot).lintIgnore("overlap").drawOn({ at: 1.2 + i * 0.1, duration: 0.15 });
});

// --- Output already on screen when we arrive. Authored as coloured token runs rather than
// lettering: at 480px a real glyph run is unreadable mush, and what actually says "code" to
// the eye is the RHYTHM — an indent, a keyword, a long string, a trailing comment — which
// segment lengths and colours carry on their own. One long rule per line (the first pass)
// reads as a paragraph of prose instead.
const rows: [number, [number, number, string][]][] = [
  [178, [[82, 26, ACCENT], [116, 64, TEXT]]],
  [198, [[98, 40, "#e5b455"], [146, 86, TEXT], [242, 22, "#767c6c"]]],
  [218, [[98, 54, "#7fa8c7"], [160, 36, TEXT]]],
  [238, [[82, 30, ACCENT], [120, 108, TEXT], [236, 46, "#e5b455"]]],
];
const tokens = rows.flatMap(([y, segs]) =>
  segs.map(([x, w, color]) => sketch.stroke([[x, y], [x + w, y]], { color, weight: "confident", looseness: 0 }))
);
tokens.forEach((t) => scene.add(t));
drawIn(tokens, { from: 1.4, to: 2.4, each: 0.16 });

// The prompt chevron for the live line.
scene.add(
  sketch.stroke([[82, 268], [92, 276], [82, 284]], { color: ACCENT, weight: "bold", looseness: 0, smooth: false })
).drawOn({ at: 2.4, duration: 0.25 });

// --- The loop. Four "words" type themselves in across the first half of the window, the
// spinner turns the whole time, and everything clears before the seam so the cycle can start
// from an empty prompt again — which is also exactly the state the loop's first frame is in.
const typeBeats = beats(4);
const words: [number, number][] = [[104, 34], [144, 22], [172, 46], [226, 28]];
words.forEach(([x, w], i) => {
  const word = sketch.stroke([[x, 276], [x + w, 276]], { color: TEXT, weight: "confident", looseness: 0 });
  scene.add(word);
  word.initial({ opacity: 0 });
  // A hard cut in, not a fade: characters land on a terminal, they don't dissolve onto it.
  word.fadeTo(1, { at: typeBeats[i].at, duration: 0.02 });
  word.fadeTo(0, { at: LOOP_END - 0.34, duration: 0.02 });
});

// Block cursor, parked after the last word, blinking on the half-beat.
const cursor = sketch.loop(
  [[258, 266], [272, 266], [272, 286], [258, 286]],
  { color: ACCENT, weight: "light", looseness: 0, fill: { color: ACCENT, style: "solid" }, smooth: false }
);
scene.add(cursor).lintIgnore("overlap");
cursor.initial({ opacity: 0 });
for (const { at, dur } of beats(6)) {
  cursor.fadeTo(0.95, { at, duration: 0.02 });
  cursor.fadeTo(0, { at: at + dur / 2, duration: 0.02 });
}

// --- Spinner: a broken ring plus one gap, turning three times across the loop. The classic
// "working" tell, and the only continuously-moving thing in the frame.
const spinner = sketch.group();
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const inner = 11;
  const outer = 22;
  spinner.add(
    sketch.stroke(
      [
        [350 + Math.cos(a) * inner, 316 + Math.sin(a) * inner],
        [350 + Math.cos(a) * outer, 316 + Math.sin(a) * outer],
      ],
      { color: i < 5 ? ACCENT : "#4b5a52", weight: 4, looseness: 0 }
    ).lintIgnore("overlap")
  );
}
scene.add(spinner);
spinner.stagger(0.03, { at: 2.55, duration: 0.2 });
spin(spinner, 3);

// A progress bar under it, filling and resetting once per loop: the track is static, the fill
// grows from zero and is snapped back while it's already scaled to nothing.
const track = sketch.loop(
  [[82, 310], [326, 310], [326, 322], [82, 322]],
  { color: "#3d4a44", weight: "light", looseness: 0, fill: { color: "#2a3630", style: "solid" }, smooth: false }
);
scene.add(track).drawOn({ at: 2.6, duration: 0.35 });

const fill = sketch.loop(
  [[82, 310], [326, 310], [326, 322], [82, 322]],
  { color: "#00000000", weight: "light", looseness: 0, fill: { color: ACCENT, style: "solid" }, smooth: false }
);
scene.add(fill).lintIgnore("overlap");
// Pivoted at its left edge so scaleX reads as "filling", not "growing out of the middle".
// The empty state has to be scaleX-only, which initial() can't express (its `scale` is
// uniform), so it's a zero-duration squash during the reveal instead — and that is also the
// state the loop's first frame is in, since the fill tween hasn't started yet at LOOP_START.
fill.pivotAt(82, 316);
fill.squashTo(0.001, 1, { at: 0.05, duration: 0 });
fill.squashTo(1, 1, { at: LOOP_START, duration: 3.0, ease: "power1.inOut" });
fill.squashTo(0.001, 1, { at: LOOP_START + 3.0, duration: 0.3, ease: "power2.in" });

export default scene;
