import { SketchNode } from "./node.js";
import { Stroke } from "./stroke.js";
import type { NodeStyle } from "./types.js";
import { unionBBox, type BBox } from "./geometry.js";

export class Group extends SketchNode {
  readonly type = "group" as const;
  children: SketchNode[];
  // Parallax depth, set via scene.layer(depth) — see SerializedNode.depth for semantics.
  depth?: number;

  constructor(children: SketchNode[] = [], style: NodeStyle = {}) {
    super(style);
    this.children = children;
  }

  add(node: SketchNode): SketchNode {
    this.children.push(node);
    return node;
  }

  bbox(): BBox {
    const boxes: BBox[] = [];
    for (const c of this.children) {
      if (c instanceof Stroke) boxes.push(c.bbox());
      else if (c instanceof Group) boxes.push(c.bbox());
    }
    return boxes.length ? unionBBox(boxes) : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  /**
   * Choreographs each child's drawOn/appear entrance with an incrementing offset,
   * so a group of elements arrives with rhythm instead of all at once.
   */
  stagger(each = 0.15, opts: { at?: number; duration?: number; ease?: string; effect?: "drawOn" | "appear" } = {}) {
    const { at = 0, duration = 0.6, ease = "power2.out", effect = "drawOn" } = opts;
    this.children.forEach((child, i) => {
      const t = at + i * each;
      if (effect === "drawOn") child.drawOn({ at: t, duration, ease });
      else child.appear({ at: t, duration, ease });
    });
    return this;
  }
}
