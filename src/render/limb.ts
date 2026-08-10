import type { SerializedNode } from "../core/types.js";
import { pathFromPoints } from "../core/geometry.js";
import { solveTwoBoneIK } from "../core/ik.js";
import { roughOptionsFor, flatColorOf } from "./style.js";
import { SVG_NS, type BuildContext } from "./internal.js";

/**
 * Builds a limb node's live re-solving: the joint (knee/elbow) position depends on the
 * current IK target, which can be animated, so — same reasoning as buildMesh3D —
 * this can't precompute a path once at build time. It tweens a plain {x, y} state object
 * (the target, in the limb's own local space) and re-solves + redraws on every tick that
 * target is moving. Deliberately does NOT read the limb's own live transform (`g`'s x/y)
 * to compute anything: reading a moving node's own GSAP-driven transform from inside the
 * same tl.seek() pass that's still resolving it is exactly the trap documented above
 * applyCameraLayers's `follow` handling — a limb's IK target is authored in the same
 * local space as rootX/rootY from the start (callers needing a "planted foot" effect
 * while the body translates compute the local-space countershift themselves, at authoring
 * time, the same way every other point in this library is authored relative to a group's
 * own untransformed origin).
 */
export function buildLimb(node: SerializedNode, g: SVGGElement, ctx: BuildContext): void {
  const { rc, tl, sceneSeed, look } = ctx;
  const rootX = node.limbRootX ?? 0;
  const rootY = node.limbRootY ?? 0;
  const len1 = node.limbLen1 ?? 40;
  const len2 = node.limbLen2 ?? 40;
  const bend = node.limbBend ?? 1;
  const capRadius = node.limbCapRadius ?? 0;
  const capColor = node.limbCapColor ?? flatColorOf(node.style?.fill?.color, node.style?.color ?? "#181511");
  const baseSeed = sceneSeed ^ node.seed;
  // A joint should read as an actual bend, not a spline blend erasing it — smooth defaults
  // false here regardless of the general stroke default (true), unless a scene explicitly
  // wants a softer limb silhouette.
  const smooth = node.style?.smooth ?? false;

  const limbGroup = document.createElementNS(SVG_NS, "g");
  g.appendChild(limbGroup);

  const ikState = { x: node.limbTargetX ?? rootX, y: node.limbTargetY ?? rootY + len1 + len2 };

  const redraw = () => {
    while (limbGroup.firstChild) limbGroup.removeChild(limbGroup.firstChild);

    const { jointX, jointY, endX, endY } = solveTwoBoneIK(rootX, rootY, ikState.x, ikState.y, len1, len2, bend);

    const d = pathFromPoints(
      [
        [rootX, rootY],
        [jointX, jointY],
        [endX, endY],
      ],
      false,
      smooth
    );
    const opts = roughOptionsFor(node.style ?? {}, baseSeed, false, look);
    limbGroup.appendChild(rc.path(d, opts));

    if (capRadius > 0) {
      const capOpts = roughOptionsFor(
        { color: capColor, weight: node.style?.weight, looseness: node.style?.looseness, energy: node.style?.energy },
        baseSeed + 7919,
        true,
        look
      );
      capOpts.fill = capColor;
      capOpts.fillStyle = "solid";
      limbGroup.appendChild(rc.circle(endX, endY, capRadius * 2, capOpts));
    }
  };

  redraw();

  // Every ikTo call gets its own tween on the SAME shared ikState — chaining several
  // composes the same way chained moveBy/rotateTo calls do on any other node.
  for (const op of node.animations) {
    if (op.kind !== "ikTo") continue;
    const at = op.at ?? 0;
    const duration = op.duration ?? 0.5;
    tl.to(ikState, { x: op.x, y: op.y, duration, ease: op.ease ?? "power2.inOut", onUpdate: redraw }, at);
  }
}
