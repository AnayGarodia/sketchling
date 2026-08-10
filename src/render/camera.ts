import gsap from "gsap";
import type { SerializedScene } from "../core/types.js";
import { computeNodeBBox, findSerializedNodeById, liveOffsetOf } from "./scene-query.js";

/**
 * Drives every depth layer's transform from one shared camera state — pan/zoom are plain
 * GSAP tweens on that state, `follow` is resolved live. `follow` is the subtle one: it
 * reads the target's current animated offset off the DOM, but a read taken from inside
 * the same `tl.seek()` pass that is still resolving the target's own tween chain sees a
 * STALE position — GSAP resolves tweens in insertion order within a seek, so whichever
 * update callback fires first reads whatever transform the previous seek left behind, one
 * frame (or one whole seek-jump) behind the position the target actually lands on this
 * tick. In a video render, that lag is re-baked into every frame: the camera visibly
 * rubber-bands behind a walking character instead of tracking whatever offset the walk
 * had. A single one-shot tween on the target didn't show it; any target with a genuine
 * multi-step path (a walk cycle, any real character rig) reliably did. The returned
 * `postSeek(t)` callback is the fix: it's called by the caller (mount/mountFilm's seekTo)
 * strictly *after* `tl.seek()` has fully returned, so every other tween — including
 * whatever chain the followed node has — has already settled for this tick before the
 * read happens.
 */
export function applyCameraLayers(
  layerGroups: Map<number, SVGGElement>,
  scene: SerializedScene,
  tl: gsap.core.Timeline,
  container: SVGElement
): (t: number) => void {
  const camOps = scene.camera;
  if (!camOps || camOps.length === 0) return () => {};

  const worldCx = scene.width / 2;
  const worldCy = scene.height / 2;
  const camState = { cx: worldCx, cy: worldCy, zoom: 1 };
  const apply = () => {
    const { cx, cy, zoom } = camState;
    for (const [depth, g] of layerGroups) {
      const layerCx = worldCx + (cx - worldCx) * depth;
      const layerCy = worldCy + (cy - worldCy) * depth;
      // Centers world-space (layerCx, layerCy) in the VIEWPORT (the output frame), not
      // the world — those differ whenever scene.camera() is actually doing something.
      const tx = scene.viewportWidth / 2 - layerCx * zoom;
      const ty = scene.viewportHeight / 2 - layerCy * zoom;
      g.setAttribute("transform", `translate(${tx} ${ty}) scale(${zoom})`);
    }
  };
  apply();

  interface FollowWindow {
    start: number;
    targetG: SVGGElement | null;
    anchorX: number;
    anchorY: number;
  }
  const followWindows: FollowWindow[] = [];
  const otherOpStarts: number[] = [];

  for (const op of camOps) {
    const at = op.at ?? 0;
    const duration = op.duration ?? 1;

    if (op.kind === "panTo") {
      tl.to(camState, { cx: op.x, cy: op.y, duration, ease: op.ease ?? "sine.inOut", onUpdate: apply }, at);
      otherOpStarts.push(at);
    } else if (op.kind === "panBy") {
      // Same "+=" relative-value trick rotateBy/moveBy use — resolves against wherever
      // camState actually is when this tween starts (an earlier panTo's target, mid-follow,
      // whatever), so a repeated small nudge doesn't need its absolute destination computed
      // by hand from the current center the way panTo alone would require.
      tl.to(camState, { cx: `+=${op.dx}`, cy: `+=${op.dy}`, duration, ease: op.ease ?? "sine.inOut", onUpdate: apply }, at);
      otherOpStarts.push(at);
    } else if (op.kind === "zoomTo") {
      tl.to(camState, { zoom: op.scale, duration, ease: op.ease ?? "sine.inOut", onUpdate: apply }, at);
      otherOpStarts.push(at);
    } else {
      const targetNode = findSerializedNodeById(scene.children, op.nodeId);
      const bbox = targetNode ? computeNodeBBox(targetNode) : null;
      const anchorX = bbox ? (bbox.minX + bbox.maxX) / 2 : camState.cx;
      const anchorY = bbox ? (bbox.minY + bbox.maxY) / 2 : camState.cy;
      // data-id is unique scene-wide, so searching the whole container (not just one
      // layer's group) finds the target regardless of which depth plane it lives on.
      const targetG = container.querySelector(`[data-id="${op.nodeId}"]`) as SVGGElement | null;
      followWindows.push({ start: at, targetG, anchorX, anchorY });
    }
  }

  return (t: number) => {
    // Which follow (if any) is "current" at t: the one with the latest start <= t. Unlike
    // the old `t >= start && t <= start+duration` window check, this isn't bounded by its
    // own duration — a follow keeps winning past its nominal end until something else
    // (a later panTo/zoomTo, or another follow) actually takes over. That matters because
    // this callback runs after tl.seek() has already resolved every real GSAP tween on
    // camState, including an EARLIER panTo — which (like any completed tween) re-asserts
    // its own held end value on every later seek. Previously, once a follow's window ended,
    // this callback did nothing, so that earlier panTo's reassertion went uncontested and
    // the camera visibly snapped back to it — a real bug, not the documented "give follow a
    // duration covering the whole tracked span" tradeoff it was mistaken for (the Lantern
    // Maker follow-ups hit this despite AGENTS.md already warning about it). Deliberately
    // re-reads the target's LIVE position every call rather than freezing a captured value
    // at end-of-window: since the target's own moveTo/moveBy/moveAlong is itself a real
    // GSAP tween that already holds its end value for any later seek, this stays exact and
    // determinism-safe for an arbitrary or non-monotonic seek (contact-sheet, `--at`) the
    // same way every other op here already is — no historical state to get wrong.
    let currentFollow: FollowWindow | null = null;
    for (const w of followWindows) {
      if (w.start > t) continue;
      if (!currentFollow || w.start > currentFollow.start) currentFollow = w;
    }
    if (!currentFollow) return;
    for (const at of otherOpStarts) {
      if (at > currentFollow.start && at <= t) return; // a later pan/zoom has taken over
    }
    const offset = liveOffsetOf(currentFollow.targetG);
    camState.cx = currentFollow.anchorX + offset.x;
    camState.cy = currentFollow.anchorY + offset.y;
    apply();
  };
}
