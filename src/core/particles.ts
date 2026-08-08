import { SketchNode } from "./node.js";
import type { NodeStyle } from "./types.js";

export interface ParticleOpts {
  count?: number;
  // Degrees, screen convention: 0 = +x (right), 90 = +y (down) — default -90 (straight up),
  // the natural "fountain" direction against this library's y-down canvas.
  angle?: number;
  spread?: number; // degrees, total cone width around `angle`
  speedMin?: number; // px/sec
  speedMax?: number;
  gravity?: number; // px/sec^2, positive pulls toward +y (down)
  lifetime?: number; // seconds each particle stays visible
  duration?: number; // seconds emission is spread across; 0 (default) = one burst
  at?: number; // when emission starts
  sizeMin?: number;
  sizeMax?: number;
  fade?: boolean; // opacity ramps in then out over each particle's own lifetime; default true
}

/**
 * A particle emitter: `count` small dots launched from (x, y) within a cone (`angle` ±
 * `spread`/2), each under constant gravity — sparks, dust, confetti, snow, a firework burst.
 * Deliberately NOT a simulation: every particle's spawn time, launch angle, speed, and size
 * are drawn ONCE from a seeded PRNG at scene-build time (see renderer.ts's buildParticles),
 * so a particle's position at any t is a closed-form ballistic formula
 * (x0 + vx*age, y0 + vy*age + 0.5*gravity*age^2) — a pure function of t and that particle's
 * own fixed params, with no history and no dependency on any other node's state. Unlike
 * springTo (whose damped motion genuinely depends on its whole past and needs precomputing
 * into a lookup table), particles need no precomputed table at all — an arbitrary seek is
 * exact for free, the same way a plain moveTo tween already is.
 */
export class Particles extends SketchNode {
  readonly type = "particles" as const;
  spawnX: number;
  spawnY: number;
  count: number;
  angle: number;
  spread: number;
  speedMin: number;
  speedMax: number;
  gravity: number;
  lifetime: number;
  duration: number;
  emitAt: number;
  sizeMin: number;
  sizeMax: number;
  fade: boolean;

  constructor(x: number, y: number, style: NodeStyle = {}, opts: ParticleOpts = {}) {
    super(style);
    this.spawnX = x;
    this.spawnY = y;
    this.count = opts.count ?? 24;
    this.angle = opts.angle ?? -90;
    this.spread = opts.spread ?? 40;
    this.speedMin = opts.speedMin ?? 60;
    this.speedMax = opts.speedMax ?? 140;
    this.gravity = opts.gravity ?? 220;
    this.lifetime = opts.lifetime ?? 1.2;
    this.duration = opts.duration ?? 0;
    this.emitAt = opts.at ?? 0;
    this.sizeMin = opts.sizeMin ?? 2;
    this.sizeMax = opts.sizeMax ?? 5;
    this.fade = opts.fade ?? true;
  }
}

export function particles(x: number, y: number, style: NodeStyle = {}, opts: ParticleOpts = {}): Particles {
  return new Particles(x, y, style, opts);
}
