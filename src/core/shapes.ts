import { Group } from "./group.js";
import { Stroke } from "./stroke.js";
import type { NodeStyle, Point } from "./types.js";

export interface ArrowOptions {
  headSize?: number; // length of each head stroke, in px (default 16)
  headAngle?: number; // degrees between the shaft and each head stroke (default 28)
}

/**
 * A thin geometric composition, not a new asset type — the same shaft-plus-two-strokes
 * construction any scene could hand-plot (see doodle-flourish.ts), just parameterized so
 * the angle math doesn't have to be redone by hand every time.
 */
export function buildArrow(from: Point, to: Point, style: NodeStyle, opts: ArrowOptions): Group {
  const headSize = opts.headSize ?? 16;
  const headAngle = ((opts.headAngle ?? 28) * Math.PI) / 180;

  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const angle = Math.atan2(dy, dx);

  const group = new Group();
  group.add(new Stroke([from, to], style, false));

  for (const sign of [1, -1] as const) {
    const a = angle + Math.PI - sign * headAngle;
    const tip: Point = [to[0] + Math.cos(a) * headSize, to[1] + Math.sin(a) * headSize];
    group.add(new Stroke([tip, to], style, false));
  }

  return group;
}

export type TailPosition = "bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-center" | "top-right";

export interface SpeechBubbleOptions {
  tailAt?: TailPosition;
  tailSize?: number; // how far the tail pokes out, in px (default 26)
}

const TAIL_FRACTION: Record<string, number> = { left: 0.25, center: 0.5, right: 0.75 };

/**
 * A rounded rectangle with a small triangular tail woven into the same point sequence —
 * one closed Stroke, so it draws and fills as a single shape. Defaults to `smooth: true`
 * (soft corners, including a slightly-rounded tail) since that reads as hand-drawn; pass
 * `smooth: false` in `style` for sharp corners instead.
 */
export function buildSpeechBubble(
  x: number,
  y: number,
  width: number,
  height: number,
  style: NodeStyle,
  opts: SpeechBubbleOptions
): Stroke {
  const tailAt = opts.tailAt ?? "bottom-left";
  const tailSize = opts.tailSize ?? 26;

  const tl: Point = [x, y];
  const tr: Point = [x + width, y];
  const br: Point = [x + width, y + height];
  const bl: Point = [x, y + height];

  function tailNotch(edgeStart: Point, edgeEnd: Point, fraction: number, dir: Point): Point[] {
    const bx = edgeStart[0] + (edgeEnd[0] - edgeStart[0]) * fraction;
    const by = edgeStart[1] + (edgeEnd[1] - edgeStart[1]) * fraction;
    const alongX = (edgeEnd[0] - edgeStart[0]) * 0.06;
    const alongY = (edgeEnd[1] - edgeStart[1]) * 0.06;
    return [
      [bx - alongX, by - alongY],
      [bx + dir[0] * tailSize, by + dir[1] * tailSize],
      [bx + alongX, by + alongY],
    ];
  }

  const [edge, side] = tailAt.split("-") as ["top" | "bottom", "left" | "center" | "right"];
  const fraction = TAIL_FRACTION[side];

  // Walk the rectangle clockwise from top-left, splicing the tail notch into whichever
  // edge it belongs on. `tailNotch`'s fraction is always measured start-to-end of the
  // edge as walked here, so the bottom edge (walked right-to-left, br -> bl) needs
  // `1 - fraction` to keep "left"/"right" meaning the same visual side either way.
  const points: Point[] =
    edge === "top"
      ? [tl, ...tailNotch(tl, tr, fraction, [0, -1]), tr, br, bl]
      : [tl, tr, br, ...tailNotch(br, bl, 1 - fraction, [0, 1]), bl];

  return new Stroke(points, { smooth: true, ...style }, true);
}
