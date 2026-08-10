import gsap from "gsap";
import type { AnimOp, SerializedNode, SerializedScene } from "../core/types.js";
import type { PendingSpring } from "./internal.js";
import { computeNodeBBox, findSerializedNodeById, liveOffsetOf } from "./scene-query.js";

const SPRING_DT = 1 / 120;

/** A node with a springTo op can't build its own transform tween the way moveTo/moveBy do —
 * its position depends on precomputing the driver's whole trajectory first (see
 * buildSprings) — so this just records it (its own `g` and authored anchor point) for that
 * later pass instead of building anything here. At most the first springTo op on a node is
 * used; a second would just fight the same transform. */
export function collectSprings(node: SerializedNode, g: SVGGElement, pendingSprings: PendingSpring[]): void {
  const op = node.animations.find((a): a is Extract<AnimOp, { kind: "springTo" }> => a.kind === "springTo");
  if (!op) return;
  const bbox = computeNodeBBox(node);
  const anchorX = bbox ? (bbox.minX + bbox.maxX) / 2 : 0;
  const anchorY = bbox ? (bbox.minY + bbox.maxY) / 2 : 0;
  // Two different reference points, and conflating them is the bug this splits apart. The
  // ANCHOR is the untransformed bbox centre: the per-frame `gsap.set` writes `x` directly, so
  // turning a world position back into a translate has to measure against geometry with no
  // translate in it. The REST position is where the node visibly sits before the spring starts,
  // which does include `initial({x, y})`. Seeding the spring's state from the anchor instead of
  // the rest position meant a node placed with `initial({x, y})` snapped to its untranslated
  // origin the instant the spring took over — a lantern authored around a local (0,0) and placed
  // at (470, 236) jumped to the canvas corner on frame one.
  const restX = anchorX + (node.transform?.x ?? 0);
  const restY = anchorY + (node.transform?.y ?? 0);
  pendingSprings.push({ g, anchorX, anchorY, restX, restY, op });
}

/**
 * Precomputes every springTo's position as a lookup table, once per scene build, rather than
 * evaluating the spring live on each real seek. A damped spring's position at time t depends
 * on its whole history from t=0 (displacement and velocity both carry forward) — not just
 * the driver's position at t alone — so there's no way to answer an arbitrary seek correctly
 * without either integrating from t=0 on every single seek or precomputing once. This does
 * ONE dense forward scan of `tl` (roughly the cost of a handful of extra video frames),
 * reading each driver's live resolved position after every seek — same ordering
 * applyCameraLayers's follow relies on: read only after `tl.seek()` has fully returned, never
 * from inside the same pass that's still resolving the driver's own tween chain — and
 * integrating every pending spring's state alongside it in that same forward pass
 * (semi-implicit Euler). A real seek afterward just interpolates between the two nearest
 * precomputed samples, so repeated seeks to the same t are exact and byte-identical, the same
 * guarantee every other animation in this file has.
 */
export function buildSprings(
  pendingSprings: PendingSpring[],
  scene: SerializedScene,
  tl: gsap.core.Timeline,
  container: SVGElement
): (t: number) => void {
  if (pendingSprings.length === 0) return () => {};

  // A spring isn't a tl.to() call itself, so on its own it wouldn't extend tl.duration()
  // one bit past whatever else is on the timeline — the settle-and-overshoot that's the
  // entire visual point of a spring would get cut off right as its driver stops moving,
  // mid-oscillation, not settled. Reserves a rough settle window (a damped spring's
  // envelope decays to ~1% by roughly 9.2/damping) after the LATER of the timeline's
  // otherwise-natural end or this spring's own start — computed here, after every other
  // node's tweens are already on `tl`, specifically so "the timeline's natural end"
  // actually means what the driver's own last tween produces, not a guess made before it
  // existed.
  const naturalDuration = tl.duration();
  let desiredEnd = naturalDuration;
  for (const { op } of pendingSprings) {
    const settleWindow = Math.max(0.5, 9.2 / op.damping);
    desiredEnd = Math.max(desiredEnd, Math.max(naturalDuration, op.at) + settleWindow);
  }
  if (desiredEnd > naturalDuration) tl.set({}, {}, desiredEnd);

  interface Sample {
    t: number;
    x: number;
    y: number;
  }
  const tables: Sample[][] = pendingSprings.map(() => []);
  // Starts at the spring node's own resting position — where it was drawn, plus any
  // initial({x, y}) — with zero velocity, so it sits still and matches its own geometry until
  // its driver actually moves.
  const states = pendingSprings.map((p) => ({ x: p.restX, y: p.restY, vx: 0, vy: 0 }));
  const drivers = pendingSprings.map((p) => {
    const driverNode = findSerializedNodeById(scene.children, p.op.driverId);
    const bbox = driverNode ? computeNodeBBox(driverNode) : null;
    return {
      g: container.querySelector(`[data-id="${p.op.driverId}"]`) as SVGGElement | null,
      anchorX: bbox ? (bbox.minX + bbox.maxX) / 2 : 0,
      anchorY: bbox ? (bbox.minY + bbox.maxY) / 2 : 0,
    };
  });

  const duration = tl.duration();
  const steps = Math.max(1, Math.ceil(duration / SPRING_DT));

  for (let i = 0; i <= steps; i++) {
    const t = Math.min(duration, i * SPRING_DT);
    tl.seek(t, false);
    for (let s = 0; s < pendingSprings.length; s++) {
      const { op } = pendingSprings[s];
      const driver = drivers[s];
      const state = states[s];
      if (t < op.at) {
        tables[s].push({ t, x: state.x, y: state.y });
        continue;
      }
      const driverOffset = liveOffsetOf(driver.g);
      const targetX = driver.anchorX + driverOffset.x + op.offsetX;
      const targetY = driver.anchorY + driverOffset.y + op.offsetY;
      const ax = -op.stiffness * (state.x - targetX) - op.damping * state.vx;
      const ay = -op.stiffness * (state.y - targetY) - op.damping * state.vy;
      state.vx += ax * SPRING_DT;
      state.vy += ay * SPRING_DT;
      state.x += state.vx * SPRING_DT;
      state.y += state.vy * SPRING_DT;
      tables[s].push({ t, x: state.x, y: state.y });
    }
  }
  tl.seek(0, false);

  return (t: number) => {
    for (let s = 0; s < pendingSprings.length; s++) {
      const { g, anchorX, anchorY } = pendingSprings[s];
      const sample = interpolateTable(tables[s], t);
      gsap.set(g, { x: sample.x - anchorX, y: sample.y - anchorY });
    }
  };
}

function interpolateTable(table: { t: number; x: number; y: number }[], t: number): { x: number; y: number } {
  if (table.length === 0) return { x: 0, y: 0 };
  if (t <= table[0].t) return table[0];
  const last = table[table.length - 1];
  if (t >= last.t) return last;
  // Binary search for the bracketing pair — tables run to hundreds of samples and this runs
  // on every real seek, including every frame of a video export.
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = table[lo];
  const b = table[hi];
  const frac = (t - a.t) / (b.t - a.t || 1);
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}
