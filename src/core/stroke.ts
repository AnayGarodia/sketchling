import { SketchNode } from "./node.js";
import type { NodeStyle, Point } from "./types.js";
import { bboxOfPoints, type BBox } from "./geometry.js";

export class Stroke extends SketchNode {
  readonly type = "stroke" as const;
  points: Point[];
  closed: boolean;

  constructor(points: Point[], style: NodeStyle = {}, closed = false) {
    super(style);
    this.points = points;
    this.closed = closed;
  }

  bbox(): BBox {
    return bboxOfPoints(this.points);
  }
}
