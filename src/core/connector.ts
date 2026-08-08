import { SketchNode } from "./node.js";
import type { NodeStyle, Point } from "./types.js";

/**
 * A stroke that isn't drawn once and left alone — it's rebuilt fresh every seek to run from
 * a fixed `anchor` to `target`'s own live resolved position (the same "authored bbox center
 * plus whatever its own animations currently add" space `camera.follow` and `springTo` both
 * read), bowed into a gentle curve rather than a rigid straight line. What `springTo` alone
 * can't do: `springTo` moves ONE node's own position, so it can drive a nearby accessory
 * (a bead, a bobble) but can't visually attach that accessory to anything, since a plain
 * drawn stroke never redraws itself to follow a moving point. A connector is that missing
 * link — pair it with a `springTo`'d node to get an actual bendy ear/antenna/tail, not just
 * a trailing accessory floating near its driver.
 *
 * No `drawOn` (there's no stable path length to reveal against when the geometry itself
 * changes every frame) and no line-boil (a connector already fully rebuilds its path each
 * seek, so there's nothing for boil's stacked-variant trick to add) — `fadeTo`/`moveTo`/etc.
 * on the connector's own transform still work normally, same as any other node.
 */
export class Connector extends SketchNode {
  readonly type = "connector" as const;
  anchorX: number;
  anchorY: number;
  targetId: string;

  constructor(anchor: Point, target: SketchNode, style: NodeStyle = {}) {
    super(style);
    this.anchorX = anchor[0];
    this.anchorY = anchor[1];
    this.targetId = target.id;
  }
}

export function connector(anchor: Point, target: SketchNode, style: NodeStyle = {}): Connector {
  return new Connector(anchor, target, style);
}
