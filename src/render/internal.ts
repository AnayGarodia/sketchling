import type rough from "roughjs";
import type gsap from "gsap";
import type { AnimOp, NodeStyle, Point, RenderLook } from "../core/types.js";

export const SVG_NS = "http://www.w3.org/2000/svg";

export type RoughCanvas = ReturnType<typeof rough.svg>;

let uidCounter = 0;

/** Unique DOM ids for defs references (masks, clips, gradients). Uniqueness is all that
 * matters — the ids never affect pixels — so one shared counter across every module keeps
 * multiple mounts into the same document collision-free. */
export function nextUid(prefix: string): string {
  return `${prefix}-${uidCounter++}`;
}

export interface BoilTarget {
  variants: SVGGElement[];
}

export interface PendingSpring {
  g: SVGGElement;
  /** The node's own authored bbox centre, with NO transform applied — the reference the
   * per-frame `gsap.set` converts a desired world position back into a translate against. */
  anchorX: number;
  anchorY: number;
  /** Where the node actually sits before the spring takes over: the bbox centre plus whatever
   * `initial({x, y})` translated it by. Distinct from the anchor on purpose — see collectSprings. */
  restX: number;
  restY: number;
  op: Extract<AnimOp, { kind: "springTo" }>;
}

export interface PendingConnector {
  artGroup: SVGGElement;
  anchorX: number;
  anchorY: number;
  targetId: string;
  style: NodeStyle;
  baseSeed: number;
}

export interface ParticleParams {
  spawnTime: number;
  // Per-particle, not just a shared emitter-wide spawn point: when the emitter itself has a
  // `moveTo` path, each particle launches from wherever that path is AT ITS OWN spawnTime,
  // not the emitter's current position — a trailing dust cloud follows behind its source
  // instead of the whole trail rigidly snapping to the source's current spot every frame.
  // Computed once at build time (closed-form: the path is a plain eased lerp, no different
  // in kind from any other precomputed particle param here), not read live off the DOM.
  spawnX: number;
  spawnY: number;
  vx: number;
  vy: number;
  size: number;
  seed: number;
}

export interface PendingParticleEmitter {
  artGroup: SVGGElement;
  style: NodeStyle;
  gravity: number;
  lifetime: number;
  fade: boolean;
  // "dot" (default): a plain circle, as always. "streak": a short line oriented along the
  // particle's own instantaneous velocity (recomputed each seek as gravity changes it) —
  // rain, sparks, anything a round dot reads as snow instead of motion.
  shape: "dot" | "streak";
  items: ParticleParams[];
}

/** One scheduled note or hit, with `at` already resolved to the containing Renderable's own
 * master timeline (Scene-local seconds for a plain Scene; shifted by that entry's own cut
 * offset for a Film — see mountFilm). No live per-frame resolution needed, unlike springs/
 * connectors/particles: a sound's params are fixed at build time, so collecting these once
 * during the initial build is enough — there's no soundsPostSeek. */
export interface SoundEvent {
  pitch: number | null;
  at: number;
  duration: number;
  instrument: string;
  velocity: number;
  pan: number;
}

/** Everything one scene build threads through its node builders — one shared bag instead
 * of the same nine positional arguments repeated through every buildNode/applyAnimations
 * call (the old signature made `applyAnimations(g, node, tl, null, 0, false, null, rc,
 * seed, look)` easy to misorder and impossible to read). */
export interface BuildContext {
  rc: RoughCanvas;
  tl: gsap.core.Timeline;
  sceneSeed: number;
  look: RenderLook;
  boilTargets: BoilTarget[];
  pendingSprings: PendingSpring[];
  pendingConnectors: PendingConnector[];
  pendingParticles: PendingParticleEmitter[];
  soundEvents: SoundEvent[];
}

/** The drawable geometry a stroke/loop/blob node registers for drawOn/morph — null for
 * node types with no single clean path to reveal (groups, meshes, limbs, emitters). */
export interface DrawTarget {
  cleanPathD: string;
  strokeWidthPx: number;
  closed: boolean;
  points: Point[];
}
