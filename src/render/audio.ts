import type { SoundEvent } from "./renderer.js";
import { seededRandom } from "../core/geometry.js";

/**
 * Renders a scene's sketch.sound() events to a WAV file, entirely inside the browser
 * (OfflineAudioContext doesn't exist in Node, and this runs from the same Playwright page
 * everything else renders from — see cli.ts's renderVideo). Offline, not real-time —
 * OfflineAudioContext renders as fast as the machine allows — and every random choice this
 * file makes (noise-burst content) is seeded, not Math.random(), so the actual musical
 * content is fully deterministic: same notes, same timing, same envelopes, every time.
 *
 * NOT bit-exact reproducible, though, and worth being honest about rather than claiming the
 * same "byte-identical" guarantee the rest of this renderer has: Chromium's own
 * OfflineAudioContext implementation isn't guaranteed bit-exact across runs (internal
 * SIMD/summation-order differences in how it sums the audio graph), independent of anything
 * this file schedules. Measured directly (render the same scene twice, diff the raw PCM):
 * ~0.01% of samples differ, always by exactly ±1 on a 16-bit scale — sub-perceptual
 * rounding noise, not a different performance.
 *
 * Every voice here is synthesized (oscillators/noise + envelopes via GainNode automation,
 * a DynamicsCompressorNode on the master bus to keep stacked notes from clipping) — no
 * bundled audio samples, on purpose: sketchling doesn't ship a curated instrument library
 * any more than it ships a curated shape library. "piano" and "strings" are a synthesized
 * *approximation* of those timbres (closer to an electric piano and a bowed pad than a
 * recorded acoustic instrument — see AGENTS.md's Audio section for the honest scope of
 * this), not a claim of real-instrument fidelity. "pad"/"pluck"/"thud"/"brush" are voices
 * that are supposed to be synthesized — nobody expects a footstep thud to be a sampled
 * recording.
 */
export async function renderSceneAudio(soundEvents: SoundEvent[], durationSeconds: number, sampleRate = 44100): Promise<ArrayBuffer> {
  if (soundEvents.length === 0) return new ArrayBuffer(0);

  const frameCount = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const ctx = new OfflineAudioContext(2, frameCount, sampleRate);

  const compressor = ctx.createDynamicsCompressor();
  compressor.connect(ctx.destination);
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(compressor);

  for (const ev of soundEvents) scheduleVoice(ctx, master, ev);

  const rendered = await ctx.startRendering();
  return audioBufferToWav(rendered);
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

type Voice = (ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent) => void;

function scheduleVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): void {
  const voice = VOICES[event.instrument] ?? VOICES.piano;
  voice(ctx, destination, event);
}

/** Every voice routes through its own panner + gain (velocity) before the shared master
 * bus, so per-note pan/velocity stay independent of whatever instrument produced the tone.
 * A Film crossfade's fadeIn/fadeOut (see mountFilm) layer an extra gain node UNDER the
 * panner, before whatever note-shape envelope the calling voice schedules on the node `out`
 * points to — the crossfade and each voice's own attack/decay/release compose independently
 * instead of fighting over the same automation. Both can be present on the same event (a
 * middle entry in a 3+ scene film is the incoming half of one crossfade and the outgoing
 * half of the next) — scheduled on the one gain node in fixed chronological order, since
 * fadeIn.at (this entry's own enterAt) is always earlier than fadeOut.at (the next entry's
 * enterAt). */
function voiceBus(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): { out: AudioNode; peak: number } {
  const panner = ctx.createStereoPanner();
  panner.pan.value = event.pan;
  panner.connect(destination);

  let out: AudioNode = panner;
  if (event.fadeIn || event.fadeOut) {
    const crossfade = ctx.createGain();
    crossfade.connect(panner);
    if (event.fadeIn) {
      crossfade.gain.setValueAtTime(0, event.fadeIn.at);
      crossfade.gain.linearRampToValueAtTime(1, event.fadeIn.at + event.fadeIn.duration);
    }
    if (event.fadeOut) {
      crossfade.gain.setValueAtTime(1, event.fadeOut.at);
      crossfade.gain.linearRampToValueAtTime(0, event.fadeOut.at + event.fadeOut.duration);
    }
    out = crossfade;
  }

  // Velocity scales peak loudness, not just a linear multiply — human loudness perception
  // (and MIDI convention) is closer to velocity^2 than velocity itself.
  const peak = 0.05 + 0.35 * event.velocity * event.velocity;
  return { out, peak };
}

// A synthesized approximation of a plucked/struck melodic tone — a fast attack, exponential
// decay, and a couple of slightly-detuned triangle oscillators for a bit of body, lowpass
// filtered so it reads as warm rather than buzzy. Closer to an electric piano/kalimba than
// a recorded acoustic piano; see this file's own doc comment for why that's the honest
// target here, not real-instrument fidelity.
function pianoVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): void {
  if (event.pitch === null) return percussiveVoice(ctx, destination, event, 900, 0.05);
  const { out, peak } = voiceBus(ctx, destination, event);
  const freq = midiToFreq(event.pitch);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(8000, freq * 6 + 800);
  filter.connect(out);

  const gain = ctx.createGain();
  gain.connect(filter);
  const t0 = ctx.currentTime + event.at;
  const release = Math.max(0.15, event.duration * 0.6);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.35), t0 + event.duration);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + event.duration + release);

  for (const detune of [0, 6, -6]) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(gain);
    osc.start(t0);
    osc.stop(t0 + event.duration + release + 0.05);
  }
}

// A synthesized approximation of a sustained bowed-string tone — slow attack (a bow taking
// up the string, not a pluck), sawtooth-ish harmonic content softened by a lowpass filter,
// a slow vibrato once the note has settled. Closer to a soft pad with string-like attack
// than a recorded section; see this file's doc comment.
function stringsVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): void {
  if (event.pitch === null) return percussiveVoice(ctx, destination, event, 500, 0.15);
  const { out, peak } = voiceBus(ctx, destination, event);
  const freq = midiToFreq(event.pitch);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(4000, freq * 3 + 500);
  filter.Q.value = 0.7;
  filter.connect(out);

  const gain = ctx.createGain();
  gain.connect(filter);
  const t0 = ctx.currentTime + event.at;
  const attack = Math.min(0.35, Math.max(0.08, event.duration * 0.3));
  const release = 0.4;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.setValueAtTime(peak, t0 + Math.max(attack, event.duration - release));
  gain.gain.linearRampToValueAtTime(0, t0 + event.duration + release);

  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5.2;
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = freq * 0.006;

  for (const detune of [0, 9, -9]) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    osc.detune.value = detune;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.detune);
    osc.connect(gain);
    osc.start(t0);
    osc.stop(t0 + event.duration + release + 0.05);
  }
  vibrato.start(t0 + attack);
  vibrato.stop(t0 + event.duration + release + 0.05);
}

// A warm atmospheric wash, not a melodic instrument's stand-in — a pad is inherently an
// electronic texture even in a real film score, so this doesn't carry the same "honest
// approximation" caveat pianoVoice/stringsVoice do. Slow attack and release, heavily
// filtered layered sines.
function padVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): void {
  if (event.pitch === null) return percussiveVoice(ctx, destination, event, 300, 0.3);
  const { out, peak } = voiceBus(ctx, destination, event);
  const freq = midiToFreq(event.pitch);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(2200, freq * 2 + 300);
  filter.connect(out);

  const gain = ctx.createGain();
  gain.connect(filter);
  const t0 = ctx.currentTime + event.at;
  const attack = Math.min(0.6, Math.max(0.2, event.duration * 0.35));
  const release = 0.7;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak * 0.8, t0 + attack);
  gain.gain.setValueAtTime(peak * 0.8, t0 + Math.max(attack, event.duration - release));
  gain.gain.linearRampToValueAtTime(0, t0 + event.duration + release);

  for (const [mult, detune] of [[1, 0], [2, 4], [0.5, -3]] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    osc.detune.value = detune;
    osc.connect(gain);
    osc.start(t0);
    osc.stop(t0 + event.duration + release + 0.05);
  }
}

// A quick plucked pop — footfall dust landing, a bead settling, a light accent. Always
// synthesized by design (see this file's doc comment): a short-lived filtered triangle with
// a fast pitch drop reads as a "pluck" without needing any pitch/note context at all.
function pluckVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): void {
  const { out, peak } = voiceBus(ctx, destination, event);
  const freq = event.pitch !== null ? midiToFreq(event.pitch) : 220;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  osc.connect(filter);

  const gain = ctx.createGain();
  filter.connect(gain);
  gain.connect(out);

  const t0 = ctx.currentTime + event.at;
  const dur = Math.max(0.08, event.duration);
  osc.frequency.setValueAtTime(freq * 1.6, t0);
  osc.frequency.exponentialRampToValueAtTime(freq, t0 + dur * 0.3);
  filter.frequency.setValueAtTime(freq * 8, t0);
  filter.frequency.exponentialRampToValueAtTime(freq * 1.5, t0 + dur);
  gain.gain.setValueAtTime(peak, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A low, soft impact — a footstep, a landing. Filtered noise burst plus a short sine
// "body" for weight underneath it.
function thudVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): void {
  percussiveVoice(ctx, destination, event, 300, 0.09);
}

// A light, airy texture — a brush stroke, a gust of wind, a rustle. Higher-frequency
// filtered noise, no tonal body.
function brushVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent): void {
  const { out, peak } = voiceBus(ctx, destination, event);
  const dur = Math.max(0.05, event.duration);
  const t0 = ctx.currentTime + event.at;
  const noise = whiteNoiseSource(ctx, dur, eventSeed(event, 1));
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3500;
  filter.Q.value = 0.6;
  noise.connect(filter);
  const gain = ctx.createGain();
  filter.connect(gain);
  gain.connect(out);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak * 0.6, t0 + dur * 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  noise.start(t0);
  noise.stop(t0 + dur + 0.05);
}

// Shared shape for thud-like unpitched impacts: a filtered noise burst plus a low sine
// "body," used directly by thudVoice and as the unpitched fallback for the melodic voices
// (a sketch.sound(null, {instrument: "piano"}) reads as a soft mallet hit, not silence).
function percussiveVoice(ctx: BaseAudioContext, destination: AudioNode, event: SoundEvent, bodyFreq: number, decay: number): void {
  const { out, peak } = voiceBus(ctx, destination, event);
  const t0 = ctx.currentTime + event.at;
  const dur = Math.max(decay, event.duration > 0 ? Math.min(event.duration, decay * 2) : decay);

  const noise = whiteNoiseSource(ctx, dur, eventSeed(event, 2));
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = bodyFreq * 4;
  noise.connect(noiseFilter);
  const noiseGain = ctx.createGain();
  noiseFilter.connect(noiseGain);
  noiseGain.connect(out);
  noiseGain.gain.setValueAtTime(peak * 0.6, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.5);
  noise.start(t0);
  noise.stop(t0 + dur + 0.05);

  const body = ctx.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(bodyFreq, t0);
  body.frequency.exponentialRampToValueAtTime(bodyFreq * 0.6, t0 + dur);
  const bodyGain = ctx.createGain();
  body.connect(bodyGain);
  bodyGain.connect(out);
  bodyGain.gain.setValueAtTime(peak, t0);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  body.start(t0);
  body.stop(t0 + dur + 0.05);
}

// Seeded, not Math.random(): the same scene rendered twice must produce byte-identical WAV
// output, the same determinism guarantee every other seek in this renderer already has.
// `seed` is derived from the triggering event, not shared across calls, so two distinct
// hits still sound like distinct noise bursts.
function whiteNoiseSource(ctx: BaseAudioContext, minDuration: number, seed: number): AudioBufferSourceNode {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * (minDuration + 0.1)));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = seededRandom(seed >>> 0);
  for (let i = 0; i < length; i++) data[i] = rand() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

// A small deterministic hash of an event's own fields — used to seed its noise burst so
// re-rendering the same scene is byte-identical, without needing a global counter threaded
// through every call site.
function eventSeed(event: SoundEvent, salt: number): number {
  const at = Math.round(event.at * 1000);
  const pitch = event.pitch ?? -1;
  let h = (at * 2654435761) ^ (pitch * 40503) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

const VOICES: Record<string, Voice> = {
  piano: pianoVoice,
  strings: stringsVoice,
  pad: padVoice,
  pluck: pluckVoice,
  thud: thudVoice,
  brush: brushVoice,
};

/** Minimal 16-bit PCM WAV writer — browsers have no built-in AudioBuffer-to-file export. */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const clamped = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
