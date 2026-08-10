import type { RenderLook, SerializedNode, SerializedScene } from "../core/types.js";
import { pathFromPoints } from "../core/geometry.js";
import { roughOptionsFor } from "./style.js";
import { SVG_NS, type BuildContext, type PendingConnector, type RoughCanvas } from "./internal.js";
import { computeNodeBBox, findSerializedNodeById, liveOffsetOf } from "./scene-query.js";

/** Records a connector node for buildConnectors' per-seek rebuild — its actual path
 * geometry (anchor-to-target) can't be built here, since the target's live position isn't
 * known until each seek resolves. */
export function collectConnector(node: SerializedNode, g: SVGGElement, ctx: BuildContext): SVGGElement {
  const artGroup = document.createElementNS(SVG_NS, "g");
  g.appendChild(artGroup);
  ctx.pendingConnectors.push({
    artGroup,
    anchorX: node.connectorAnchorX ?? 0,
    anchorY: node.connectorAnchorY ?? 0,
    targetId: node.connectorTargetId ?? "",
    style: node.style ?? {},
    baseSeed: ctx.sceneSeed ^ node.seed,
  });
  return artGroup;
}

/** Redraws every connector's path fresh each seek, from its own fixed anchor to its
 * target's live resolved position — the same "authored bbox center plus whatever the
 * target's own animations currently add" read buildSprings' drivers and camera.follow both
 * use, so a connector tracking a springTo'd node sees the exact position that node is
 * actually at this frame, not an approximation. Bowed through one synthetic midpoint
 * (offset perpendicular to the anchor→target line by a fraction of its length) rather than
 * a straight segment, so it reads as a flexible rod bending under the tip's own motion
 * instead of a rigid rotating stick — a pure function of the two live points each call, so
 * identical (anchor, target position) at a given t always redraws byte-identical (same
 * `d` string into rough.js at a fixed per-node seed). */
export function buildConnectors(
  pendingConnectors: PendingConnector[],
  scene: SerializedScene,
  container: SVGElement,
  rc: RoughCanvas,
  look: RenderLook
): (t: number) => void {
  if (pendingConnectors.length === 0) return () => {};

  const targets = pendingConnectors.map((p) => {
    const targetNode = findSerializedNodeById(scene.children, p.targetId);
    const bbox = targetNode ? computeNodeBBox(targetNode) : null;
    return {
      g: container.querySelector(`[data-id="${p.targetId}"]`) as SVGGElement | null,
      anchorX: bbox ? (bbox.minX + bbox.maxX) / 2 : 0,
      anchorY: bbox ? (bbox.minY + bbox.maxY) / 2 : 0,
    };
  });

  return () => {
    for (let i = 0; i < pendingConnectors.length; i++) {
      const p = pendingConnectors[i];
      const target = targets[i];
      const targetOffset = liveOffsetOf(target.g);
      const tipX = target.anchorX + targetOffset.x;
      const tipY = target.anchorY + targetOffset.y;

      while (p.artGroup.firstChild) p.artGroup.removeChild(p.artGroup.firstChild);

      const dx = tipX - p.anchorX;
      const dy = tipY - p.anchorY;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const bow = len * 0.15;
      const midX = (p.anchorX + tipX) / 2 + nx * bow;
      const midY = (p.anchorY + tipY) / 2 + ny * bow;

      const d = pathFromPoints(
        [
          [p.anchorX, p.anchorY],
          [midX, midY],
          [tipX, tipY],
        ],
        false,
        true
      );
      const opts = roughOptionsFor(p.style, p.baseSeed, false, look);
      p.artGroup.appendChild(rc.path(d, opts));
    }
  };
}
