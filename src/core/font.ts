import { Group } from "./group.js";
import { Stroke } from "./stroke.js";
import type { NodeStyle, Point } from "./types.js";

interface GlyphStroke {
  points: Point[];
  closed?: boolean;
}

/**
 * One-off hand-plotted letterforms, not a real font — there's no outline-font renderer
 * here, just enough of an alphabet to letter a caption or a title in the same sketchy
 * vocabulary as everything else. Lowercase only (uppercase reuses the same glyph); digits
 * and a handful of punctuation marks. Baseline sits at y=100 in each glyph's own local box;
 * ascenders reach up to ~y=15, descenders down to ~y=112.
 */
const GLYPHS: Record<string, GlyphStroke[]> = {
  // Single-story bowl (the same shape "d" uses) plus a right-side stem that overshoots the
  // bowl slightly at both ends — flush top-to-bottom, the stem reads as part of the bowl's
  // own edge and the whole glyph collapses into an "o" at small sizes. The earlier version
  // before that had a horizontal chord cutting through a closed bowl, rendering as a
  // theta-like blob instead of a legible "a".
  a: [
    { points: [[42, 58], [28, 52], [18, 62], [18, 82], [28, 92], [42, 86]], closed: true },
    { points: [[45, 53], [45, 97]] },
  ],
  b: [
    { points: [[18, 15], [18, 100]] },
    { points: [[18, 58], [32, 52], [42, 62], [42, 82], [32, 92], [18, 86]], closed: true },
  ],
  c: [{ points: [[48, 48], [28, 42], [18, 58], [18, 80], [28, 93], [48, 88]] }],
  d: [
    { points: [[42, 15], [42, 100]] },
    { points: [[42, 58], [28, 52], [18, 62], [18, 82], [28, 92], [42, 86]], closed: true },
  ],
  // Same open bowl as "c" (proven legible) with a crossbar through the middle — the
  // earlier version used a narrower, more symmetric bowl that read as a Greek epsilon,
  // not a Latin "e".
  e: [
    { points: [[48, 48], [28, 42], [18, 58], [18, 80], [28, 93], [48, 88]] },
    { points: [[18, 65], [44, 65]] },
  ],
  f: [
    { points: [[30, 20], [26, 100]] },
    { points: [[38, 18], [28, 15], [22, 22]] },
    { points: [[14, 50], [40, 50]] },
  ],
  g: [
    { points: [[44, 50], [30, 44], [20, 52], [20, 68], [30, 76], [44, 70], [44, 52]] },
    { points: [[44, 62], [46, 88], [38, 108], [22, 106]] },
  ],
  h: [
    { points: [[20, 15], [20, 100]] },
    { points: [[20, 62], [26, 50], [38, 50], [44, 60], [44, 100]] },
  ],
  i: [
    { points: [[26, 50], [26, 100]] },
    { points: [[26, 33], [27, 32]] },
  ],
  j: [
    { points: [[30, 45], [30, 100], [22, 112], [10, 110]] },
    { points: [[30, 28], [31, 27]] },
  ],
  k: [
    { points: [[20, 15], [20, 100]] },
    { points: [[20, 68], [46, 40]] },
    { points: [[20, 68], [46, 100]] },
  ],
  l: [{ points: [[26, 12], [26, 100]] }],
  m: [
    { points: [[14, 50], [14, 100]] },
    { points: [[14, 58], [20, 48], [28, 48], [32, 58], [32, 100]] },
    { points: [[32, 58], [38, 48], [46, 48], [50, 58], [50, 100]] },
  ],
  n: [
    { points: [[20, 50], [20, 100]] },
    { points: [[20, 58], [26, 48], [38, 48], [44, 58], [44, 100]] },
  ],
  o: [{ points: [[38, 50], [18, 50], [10, 68], [18, 88], [38, 88], [46, 68]], closed: true }],
  p: [
    { points: [[18, 48], [18, 112]] },
    { points: [[18, 52], [32, 48], [42, 58], [42, 76], [32, 86], [18, 80]], closed: true },
  ],
  q: [
    { points: [[40, 52], [26, 48], [16, 58], [16, 76], [26, 86], [40, 80]], closed: true },
    { points: [[40, 48], [40, 112]] },
  ],
  r: [
    { points: [[18, 50], [18, 100]] },
    { points: [[18, 58], [24, 50], [36, 50], [40, 54]] },
  ],
  s: [{ points: [[40, 42], [24, 48], [26, 66], [42, 68], [44, 86], [26, 94]] }],
  t: [
    { points: [[30, 30], [26, 95]] },
    { points: [[12, 48], [46, 48]] },
  ],
  u: [{ points: [[16, 50], [16, 84], [24, 94], [34, 94], [40, 84], [40, 50]] }],
  v: [{ points: [[14, 50], [27, 100], [40, 50]] }],
  w: [{ points: [[10, 50], [20, 100], [30, 60], [40, 100], [50, 50]] }],
  x: [
    { points: [[16, 50], [42, 100]] },
    { points: [[42, 50], [16, 100]] },
  ],
  y: [
    { points: [[14, 50], [27, 80], [40, 50]] },
    { points: [[27, 80], [24, 112]] },
  ],
  z: [{ points: [[14, 50], [42, 50], [14, 100], [42, 100]] }],
  "0": [{ points: [[38, 20], [16, 20], [8, 58], [16, 96], [38, 96], [46, 58]], closed: true }],
  "1": [
    { points: [[20, 28], [32, 15], [32, 100]] },
    { points: [[18, 100], [46, 100]] },
  ],
  "2": [{ points: [[12, 28], [24, 15], [38, 22], [38, 40], [10, 95], [44, 95]] }],
  "3": [{ points: [[12, 20], [36, 15], [40, 35], [24, 52], [40, 60], [40, 90], [12, 100]] }],
  "4": [
    { points: [[36, 15], [10, 68], [44, 68]] },
    { points: [[36, 50], [36, 100]] },
  ],
  "5": [{ points: [[38, 15], [14, 15], [12, 45], [30, 42], [42, 55], [40, 88], [14, 98]] }],
  "6": [{ points: [[36, 15], [18, 30], [10, 60], [14, 90], [34, 98], [44, 80], [38, 60], [18, 60]] }],
  "7": [{ points: [[10, 18], [44, 18], [20, 100]] }],
  "8": [
    {
      points: [
        [26, 15], [14, 25], [16, 42], [26, 50], [14, 60], [10, 80], [26, 98], [42, 80], [38, 60], [26, 50], [38, 42], [40, 25],
      ],
      closed: true,
    },
  ],
  "9": [{ points: [[16, 85], [34, 70], [42, 40], [38, 10], [18, 18], [12, 38], [18, 58], [38, 58]] }],
  ".": [{ points: [[20, 96], [21, 97]] }],
  ",": [{ points: [[20, 96], [16, 108], [22, 102]] }],
  "!": [
    { points: [[20, 20], [18, 80]] },
    { points: [[18, 96], [19, 97]] },
  ],
  "?": [
    { points: [[10, 25], [30, 15], [38, 30], [30, 45], [20, 55]] },
    { points: [[20, 80], [21, 81]] },
  ],
  "'": [{ points: [[20, 15], [18, 30] as Point] }],
  "-": [{ points: [[10, 70], [35, 70]] }],
};

const DEFAULT_ADVANCE = 56;
const NARROW_ADVANCE = 30;
const WIDE_ADVANCE = 62;
const NARROW_LETTERS = new Set(["i", "j", "l", "t", "f", "r", "1", ".", ",", "!", "'", "-"]);
const WIDE_LETTERS = new Set(["m", "w", "0", "8"]);
const SPACE_ADVANCE = 34;

function advanceFor(ch: string): number {
  if (ch === " ") return SPACE_ADVANCE;
  if (NARROW_LETTERS.has(ch)) return NARROW_ADVANCE;
  if (WIDE_LETTERS.has(ch)) return WIDE_ADVANCE;
  return DEFAULT_ADVANCE;
}

// Glyphs are plotted in a ~100-unit-tall local box (baseline to cap height, see the
// coordinates above) — `size` is expressed as an approximate letter height in pixels
// (like a font-size), not a raw multiplier, so `size: 40` reads as "about 40px tall"
// rather than needing something like `0.4` to avoid every letter landing off-canvas.
const GLYPH_EM_HEIGHT = 100;
const DEFAULT_SIZE_PX = 48;

export function buildText(str: string, x: number, y: number, style: NodeStyle, sizePx: number | undefined): Group {
  const size = (sizePx ?? DEFAULT_SIZE_PX) / GLYPH_EM_HEIGHT;
  const group = new Group();
  // Accumulated in raw, unscaled glyph-space units — scaling is applied exactly once,
  // at the point-computation step below. Scaling `cursor` on every accumulation AND
  // again when placing points compounds with each letter (fine by coincidence at
  // size≈1, badly wrong everywhere else — letters drifting closer together the longer
  // the string, since each already-scaled cursor value gets re-shrunk on every glyph).
  let cursor = 0;
  for (const rawCh of str) {
    const ch = rawCh.toLowerCase();
    if (ch === " ") {
      cursor += advanceFor(ch);
      continue;
    }
    const glyph = GLYPHS[ch];
    if (glyph) {
      for (const stroke of glyph) {
        const pts: Point[] = stroke.points.map(([px, py]) => [x + (cursor + px) * size, y + py * size] as Point);
        group.add(new Stroke(pts, style, !!stroke.closed));
      }
    }
    cursor += advanceFor(ch);
  }
  return group;
}
