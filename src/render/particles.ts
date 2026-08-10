import gsap from "gsap";
import type { RenderLook, SerializedNode } from "../core/types.js";
import { seededRandom } from "../core/geometry.js";
import { roughOptionsFor, flatColorOf } from "./style.js";
import { SVG_NS, type BuildContext, type ParticleParams, type PendingParticleEmitter, type RoughCanvas } from "./internal.js";

/** Draws every particle's own params ONCE, in authored order, from one seeded PRNG walked
 * sequentially — deterministic, and independent of anything else in the scene — and records
 * the emitter for buildParticles' per-seek redraw. Each particle's own spawn point is
 * resolved here too (not deferred to per-seek): if the emitter has a `moveTo` path, that's a
 * plain eased lerp between two known points over a known duration, evaluable at any time —
 * including a particle's own spawnTime — the same closed-form guarantee everything else
 * about a particle already has, no different in kind from its launch angle or speed. */
export function collectParticles(node: SerializedNode, g: SVGGElement, ctx: BuildContext): SVGGElement {
  const artGroup = document.createElementNS(SVG_NS, "g");
  g.appendChild(artGroup);
  const baseSeed = ctx.sceneSeed ^ node.seed;
  const rand = seededRandom(baseSeed);
  const count = node.particlesCount ?? 24;
  const angle = node.particlesAngle ?? -90;
  const spread = node.particlesSpread ?? 40;
  const speedMin = node.particlesSpeedMin ?? 60;
  const speedMax = node.particlesSpeedMax ?? 140;
  const duration = node.particlesDuration ?? 0;
  const emitAt = node.particlesEmitAt ?? 0;
  const sizeMin = node.particlesSizeMin ?? 2;
  const sizeMax = node.particlesSizeMax ?? 5;
  const spawnX0 = node.particlesSpawnX ?? 0;
  const spawnY0 = node.particlesSpawnY ?? 0;
  const moveToDuration = node.particlesMoveToDuration;
  const easeFn = moveToDuration != null ? gsap.parseEase(node.particlesMoveToEase ?? "power2.out") : null;

  const items: ParticleParams[] = [];
  for (let i = 0; i < count; i++) {
    const a = ((angle - spread / 2 + rand() * spread) * Math.PI) / 180;
    const speed = speedMin + rand() * (speedMax - speedMin);
    const spawnTime = emitAt + (duration > 0 ? rand() * duration : 0);
    const size = sizeMin + rand() * (sizeMax - sizeMin);
    let spawnX = spawnX0;
    let spawnY = spawnY0;
    if (easeFn && moveToDuration != null && node.particlesMoveToX != null && node.particlesMoveToY != null) {
      // The move path's own clock starts at the emitter's `at` (emitAt), same as the
      // emitter itself — not absolute t=0 — so it lines up with a source node's own tween
      // when both are authored with the same `at`/duration (see the doc comment above).
      const progress = moveToDuration > 0 ? Math.min(1, Math.max(0, (spawnTime - emitAt) / moveToDuration)) : 1;
      const eased = easeFn(progress);
      spawnX = spawnX0 + (node.particlesMoveToX - spawnX0) * eased;
      spawnY = spawnY0 + (node.particlesMoveToY - spawnY0) * eased;
    }
    items.push({
      spawnTime,
      spawnX,
      spawnY,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size,
      seed: baseSeed + i * 7919 + 13,
    });
  }

  ctx.pendingParticles.push({
    artGroup,
    style: node.style ?? {},
    gravity: node.particlesGravity ?? 220,
    lifetime: node.particlesLifetime ?? 1.2,
    fade: node.particlesFade ?? true,
    shape: node.particlesShape ?? "dot",
    items,
  });
  return artGroup;
}

/** Redraws every emitter's currently-alive particles fresh each seek — each particle's
 * on-screen position/opacity at time t is computed directly from its own fixed params
 * (drawn once from a seeded PRNG when the emitter was built, see collectParticles),
 * a closed-form ballistic formula, not a running simulation. No dependency on any
 * other node, so unlike springs there's no precomputed table and no ordering requirement
 * relative to the other postSeek passes.
 *
 * One thing particles DO need from the timeline, same as springTo: since a particle's
 * motion is never itself a tl.to() call, nothing naturally extends tl.duration() to cover
 * it — a video export (which renders exactly tl.duration() worth of frames) would silently
 * cut every particle out entirely otherwise. Reserves timeline duration through the latest
 * particle's own (spawnTime + lifetime) across every emitter, same "compute after
 * everything else already on tl" reasoning buildSprings' settle-window uses. */
export function buildParticles(
  pendingParticles: PendingParticleEmitter[],
  rc: RoughCanvas,
  tl: gsap.core.Timeline,
  look: RenderLook
): (t: number) => void {
  if (pendingParticles.length === 0) return () => {};

  const naturalDuration = tl.duration();
  let desiredEnd = naturalDuration;
  for (const emitter of pendingParticles) {
    for (const p of emitter.items) {
      desiredEnd = Math.max(desiredEnd, p.spawnTime + emitter.lifetime);
    }
  }
  if (desiredEnd > naturalDuration) tl.set({}, {}, desiredEnd);

  return (t: number) => {
    for (const emitter of pendingParticles) {
      while (emitter.artGroup.firstChild) emitter.artGroup.removeChild(emitter.artGroup.firstChild);

      for (const p of emitter.items) {
        const age = t - p.spawnTime;
        if (age < 0 || age > emitter.lifetime) continue;

        const px = p.spawnX + p.vx * age;
        const py = p.spawnY + p.vy * age + 0.5 * emitter.gravity * age * age;

        let opacity = 1;
        if (emitter.fade) {
          const frac = age / emitter.lifetime;
          if (frac < 0.15) opacity = frac / 0.15;
          else if (frac > 0.6) opacity = Math.max(0, 1 - (frac - 0.6) / 0.4);
        }
        if (opacity <= 0) continue;

        const fillColor = flatColorOf(emitter.style.fill?.color, emitter.style.color ?? "#333");
        const opts = roughOptionsFor(emitter.style, p.seed, true, look);

        let el: SVGGElement;
        if (emitter.shape === "streak") {
          // Oriented along the INSTANTANEOUS velocity (gravity has been bending vy since
          // launch, same as the position itself) — a falling streak visibly arcs as it
          // accelerates, not frozen at its launch angle.
          const vyNow = p.vy + emitter.gravity * age;
          const speed = Math.hypot(p.vx, vyNow) || 1;
          const ux = (p.vx / speed) * p.size;
          const uy = (vyNow / speed) * p.size;
          opts.stroke = fillColor;
          opts.strokeWidth = Math.max(1, p.size * 0.4);
          el = rc.line(px - ux, py - uy, px + ux, py + uy, opts);
        } else {
          opts.fill = fillColor;
          opts.fillStyle = "solid";
          el = rc.circle(px, py, p.size * 2, opts);
        }
        el.setAttribute("opacity", String(opacity));
        emitter.artGroup.appendChild(el);
      }
    }
  };
}
