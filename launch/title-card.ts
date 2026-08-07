import { sketch } from "../src/index.js";
import type { Point } from "../src/core/types.js";

// Hand-lettered "sketchling" wordmark — not a text primitive (there isn't one; letterforms
// are one-off hand-plotted strokes, not a general API). Good stress test for the vocabulary
// on something that has to read correctly at a small, precise scale.
const scene = sketch.scene({ width: 640, height: 220, background: "#f6f1e4", seed: "title-card" });
const ink = "#211c15";

function offset(points: Point[], dx: number, dy = 0): Point[] {
  return points.map(([x, y]) => [x + dx, y + dy] as Point);
}

const ADVANCE = 56;
let cursor = 30;
const strokes: { points: Point[]; closed?: boolean }[] = [];

function letter(...parts: { points: Point[]; closed?: boolean }[]) {
  for (const p of parts) strokes.push({ points: offset(p.points, cursor), closed: p.closed });
  cursor += ADVANCE;
}

// s
letter({ points: [[40, 42], [24, 48], [26, 66], [42, 68], [44, 86], [26, 94]] });
// k
letter(
  { points: [[20, 40], [20, 100]] },
  { points: [[20, 68], [46, 40]] },
  { points: [[20, 68], [46, 100]] }
);
// e
letter(
  { points: [[46, 45], [26, 42], [20, 58], [20, 78], [26, 90], [46, 88]] },
  { points: [[20, 64], [42, 62]] }
);
// t
letter({ points: [[30, 30], [26, 95]] }, { points: [[12, 48], [46, 48]] });
// c
letter({ points: [[48, 48], [28, 42], [18, 58], [18, 80], [28, 93], [48, 88]] });
// h
letter(
  { points: [[20, 15], [20, 100]] },
  { points: [[20, 62], [26, 50], [38, 50], [44, 60], [44, 100]] }
);
// l
letter({ points: [[26, 12], [26, 100]] });
// i
letter({ points: [[26, 50], [26, 100]] });
const iDot = { points: [[26, 33], [27, 32]] };
strokes.push({ points: offset(iDot.points, cursor - ADVANCE) });
// n
letter(
  { points: [[20, 50], [20, 100]] },
  { points: [[20, 58], [26, 48], [38, 48], [44, 58], [44, 100]] }
);
// g
letter(
  { points: [[44, 50], [30, 44], [20, 52], [20, 68], [30, 76], [44, 70], [44, 52]], closed: false },
  { points: [[44, 62], [46, 88], [38, 108], [22, 106]] }
);

let t = 0;
for (const s of strokes) {
  const node = s.closed ? sketch.loop(s.points, { color: ink, weight: "bold", looseness: 0.22, energy: "quick" }) : sketch.stroke(s.points, { color: ink, weight: "bold", looseness: 0.22, energy: "quick", smooth: true });
  scene.add(node).drawOn({ at: t, duration: 0.26 });
  t += 0.09;
}

const underline = sketch.stroke(
  [
    [24, 150],
    [200, 156],
    [400, 148],
    [560, 154],
  ],
  { color: ink, weight: "light", looseness: 0.35, energy: "quick", smooth: true }
);
scene.add(underline).drawOn({ at: t + 0.3, duration: 0.6 });

export default scene;
