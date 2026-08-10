import type { SceneBackground, SerializedScene } from "../core/types.js";
import { SVG_NS, nextUid } from "./internal.js";

/** A flat color renders exactly as before (a plain rect). A gradient spec renders as one
 * real SVG linearGradient — smooth, cheap, and clean, where a hand-authored sky previously
 * needed dozens of individually-sketched band rectangles to fake the same effect (and still
 * showed visible banding). A backdrop is painted, not pen-traced, so this deliberately
 * bypasses rough.js. */
export function applyBackground(scene: SerializedScene, layer: SVGGElement): void {
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("width", String(scene.width));
  bg.setAttribute("height", String(scene.height));

  if (typeof scene.background === "string") {
    bg.setAttribute("fill", scene.background);
  } else {
    const defs = layer.ownerSVGElement?.querySelector("defs");
    const gradId = nextUid("sk-bg-grad");
    const grad = document.createElementNS(SVG_NS, "linearGradient");
    grad.setAttribute("id", gradId);
    grad.setAttribute("gradientUnits", "userSpaceOnUse");
    if (scene.background.direction === "horizontal") {
      grad.setAttribute("x1", "0");
      grad.setAttribute("y1", "0");
      grad.setAttribute("x2", String(scene.width));
      grad.setAttribute("y2", "0");
    } else {
      grad.setAttribute("x1", "0");
      grad.setAttribute("y1", "0");
      grad.setAttribute("x2", "0");
      grad.setAttribute("y2", String(scene.height));
    }
    for (const stop of scene.background.stops) {
      const s = document.createElementNS(SVG_NS, "stop");
      s.setAttribute("offset", `${stop.offset * 100}%`);
      s.setAttribute("stop-color", stop.color);
      grad.appendChild(s);
    }
    defs?.appendChild(grad);
    bg.setAttribute("fill", `url(#${gradId})`);
  }

  layer.appendChild(bg);
}

/** Builds a per-shape SVG linearGradient sized to the shape's own bounding box
 * (`gradientUnits="objectBoundingBox"`, the SVG default — 0..1 fractional coordinates
 * across whatever bbox the shape it's applied to actually has, so this needs no knowledge
 * of the shape's real pixel size) and returns its url() reference — the volumetric cue a
 * flat fill has none of: a light-to-shadow gradient across one form instead of a uniform
 * flat color. Same {stops, direction} shape scene.background already takes; unlike the
 * background's own gradient, this one is real per-shape geometry, not a backdrop rect, so
 * it uses objectBoundingBox instead of userSpaceOnUse. */
export function buildShapeGradient(defs: SVGDefsElement | null | undefined, spec: Exclude<SceneBackground, string>): string {
  const gradId = nextUid("sk-fill-grad");
  const grad = document.createElementNS(SVG_NS, "linearGradient");
  grad.setAttribute("id", gradId);
  if (spec.direction === "horizontal") {
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "1");
    grad.setAttribute("y2", "0");
  } else {
    grad.setAttribute("x1", "0");
    grad.setAttribute("y1", "0");
    grad.setAttribute("x2", "0");
    grad.setAttribute("y2", "1");
  }
  for (const stop of spec.stops) {
    const s = document.createElementNS(SVG_NS, "stop");
    s.setAttribute("offset", `${stop.offset * 100}%`);
    s.setAttribute("stop-color", stop.color);
    grad.appendChild(s);
  }
  defs?.appendChild(grad);
  return `url(#${gradId})`;
}
