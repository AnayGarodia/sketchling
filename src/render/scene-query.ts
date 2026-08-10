import gsap from "gsap";
import { bboxOfPoints, unionBBox, type BBox } from "../core/geometry.js";
import type { SerializedNode } from "../core/types.js";

export function findSerializedNodeById(nodes: SerializedNode[], id: string): SerializedNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findSerializedNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * A node's own authored points/children are already in absolute canvas coordinates (every
 * example draws a shape directly where it should appear) — `transform.x/y` is a translate
 * layered on top of that. So "absolute position" for moveTo means: find where this node's
 * own geometry is centered, and set the transform so that center lands on (x, y) — not a
 * bare assignment of transform.x/y, which just offsets from wherever the shape was drawn
 * and reads exactly like moveBy the first time it's called (confirmed via a cold-agent
 * scene that visibly moved a shape relative to itself while expecting an absolute landing
 * spot).
 */
export function computeNodeBBox(node: SerializedNode): BBox | null {
  const boxes: BBox[] = [];
  if (node.points && node.points.length) boxes.push(bboxOfPoints(node.points));
  if (node.children) {
    for (const child of node.children) {
      const b = computeNodeBBox(child);
      if (b) boxes.push(b);
    }
  }
  return boxes.length ? unionBBox(boxes) : null;
}

/** The live "local offset" a node's own animations currently add to its authored position
 * — the same read camera.follow, springTo drivers, and connectors all share. Only ever
 * read strictly AFTER `tl.seek()` has fully returned for the current tick (see
 * applyCameraLayers' doc comment for the mid-seek stale-read trap this avoids). */
export function liveOffsetOf(g: SVGGElement | null): { x: number; y: number } {
  if (!g) return { x: 0, y: 0 };
  return {
    x: ((gsap.getProperty(g, "x") as number) || 0),
    y: ((gsap.getProperty(g, "y") as number) || 0),
  };
}
