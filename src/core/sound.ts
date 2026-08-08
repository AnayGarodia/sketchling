import { SketchNode } from "./node.js";

export interface SoundOpts {
  at?: number;
  duration?: number;
  instrument?: string;
  velocity?: number; // 0..1
  pan?: number; // -1 (left) .. 1 (right)
}

const NOTE_INDEX: Record<string, number> = {
  c: 0,
  "c#": 1,
  db: 1,
  d: 2,
  "d#": 3,
  eb: 3,
  e: 4,
  f: 5,
  "f#": 6,
  gb: 6,
  g: 7,
  "g#": 8,
  ab: 8,
  a: 9,
  "a#": 10,
  bb: 10,
  b: 11,
};

/** Scientific pitch notation ("C4" = middle C = MIDI 60) to a MIDI note number. Accepts a
 * raw MIDI number too, unchanged, so callers who already think in MIDI don't need to
 * round-trip through a name. */
export function toMidi(pitch: string | number): number {
  if (typeof pitch === "number") return pitch;
  const m = /^([a-gA-G][#b]?)(-?\d+)$/.exec(pitch.trim());
  if (!m) throw new Error(`Invalid pitch "${pitch}" — expected scientific pitch notation like "C4" or "F#3".`);
  const index = NOTE_INDEX[m[1].toLowerCase()];
  const octave = Number(m[2]);
  return 12 * (octave + 1) + index;
}

/**
 * One scheduled note or hit — sketchling's only audio primitive. `pitch` is scientific
 * pitch notation ("C4"), a raw MIDI number, or `null` for an unpitched sound (a synthesized
 * percussive hit — a footstep thud, a brush). `instrument` names a voice the renderer knows
 * how to produce (see renderer/audio.ts): melodic instruments ("piano", "strings", "pad")
 * are sample-based where a real sample set is available and fall back to a synthesized
 * approximation otherwise; percussive/effect voices ("pluck", "thud", "brush") are always
 * synthesized — real-instrument fidelity isn't the point for a footstep or a gust of wind
 * the way it is for a melody.
 *
 * Scheduled on the same scene-global `at` timeline as every other animation — composing a
 * melody is scheduling `sketch.sound()` calls the same way composing a walk is scheduling
 * `moveBy()` calls, not a separate audio track with its own clock. No visual footprint: `x`/
 * `y`/style/`drawOn`/etc. are all meaningless on a Sound node, the same way they're
 * meaningless on a Connector or a Particles emitter.
 *
 * Deliberately just ONE primitive, not a note/chord/melody hierarchy: a chord is several
 * `sketch.sound()` calls at the same `at`; sketchling supplies no chord/melody/mood
 * generator on top, the same "primitives, not a curated library" boundary the visual side
 * draws around shape helpers — the composition is the agent's, not the library's.
 */
export class Sound extends SketchNode {
  readonly type = "sound" as const;
  pitch: number | null;
  at: number;
  duration: number;
  instrument: string;
  velocity: number;
  pan: number;

  constructor(pitch: string | number | null, opts: SoundOpts = {}) {
    super({});
    this.pitch = pitch === null ? null : toMidi(pitch);
    this.at = opts.at ?? 0;
    this.duration = opts.duration ?? 0.4;
    this.instrument = opts.instrument ?? "piano";
    this.velocity = Math.min(1, Math.max(0, opts.velocity ?? 0.8));
    this.pan = Math.min(1, Math.max(-1, opts.pan ?? 0));
  }
}

export function sound(pitch: string | number | null, opts: SoundOpts = {}): Sound {
  return new Sound(pitch, opts);
}
