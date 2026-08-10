import type { Point, SerializedNode } from "../core/types.js";
import { pathFromPoints } from "../core/geometry.js";
import { roughOptionsFor } from "./style.js";
import { SVG_NS, type BuildContext } from "./internal.js";

/**
 * Morphs the currently-visible rendering into a fresh rough.js rendering of `targetPoints`,
 * path by path (stroke pass(es) first, then fill, matched by index — safe since both
 * renderings use the same style/seed, so rough.js produces the same *number* of paths for
 * either geometry). The target is rendered once into a hidden holder purely so MorphSVGPlugin
 * has real path elements to read `d` from; it's never itself shown.
 */
export function applyMorphTo(
  g: SVGGElement,
  ctx: BuildContext,
  at: number,
  duration: number,
  ease: string,
  targetPoints: Point[],
  node: SerializedNode
): void {
  const artGroup = g.querySelector(":scope > g") as SVGGElement | null;
  const variantWrap = artGroup?.querySelector(":scope > g") as SVGGElement | null;
  if (!artGroup || !variantWrap) return;

  const smooth = node.style?.smooth ?? true;
  const closed = !!node.closed;
  const targetD = pathFromPoints(targetPoints, closed, smooth);
  const baseSeed = ctx.sceneSeed ^ node.seed;
  const opts = roughOptionsFor(node.style ?? {}, baseSeed, closed, ctx.look);
  const targetRendered = ctx.rc.path(targetD, opts);

  const hiddenHolder = document.createElementNS(SVG_NS, "g");
  hiddenHolder.setAttribute("display", "none");
  hiddenHolder.appendChild(targetRendered);
  g.appendChild(hiddenHolder);

  const sourcePaths = Array.from(variantWrap.querySelectorAll("path")) as SVGPathElement[];
  const targetPaths = Array.from(hiddenHolder.querySelectorAll("path")) as SVGPathElement[];
  const count = Math.min(sourcePaths.length, targetPaths.length);

  for (let i = 0; i < count; i++) {
    ctx.tl.to(sourcePaths[i], { morphSVG: targetPaths[i], duration, ease }, at);
  }
}
