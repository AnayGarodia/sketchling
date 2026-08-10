import type { SceneTexture } from "../core/types.js";
import { SVG_NS } from "./internal.js";

/** texture: "watercolor" — a whole-frame bleed: fractal-noise displacement (edges wander
 * like wet pigment) plus a soft blur, layered over whichever `look` geometry is active —
 * the paint is a post-process, not a different stroke style underneath. Returns the
 * filter's id. */
function buildWatercolorFilter(defs: SVGDefsElement): string {
  const id = "sk-watercolor";
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "-20%");
  filter.setAttribute("y", "-20%");
  filter.setAttribute("width", "140%");
  filter.setAttribute("height", "140%");

  const turbulence = document.createElementNS(SVG_NS, "feTurbulence");
  turbulence.setAttribute("type", "fractalNoise");
  turbulence.setAttribute("baseFrequency", "0.012");
  turbulence.setAttribute("numOctaves", "2");
  turbulence.setAttribute("seed", "7");
  turbulence.setAttribute("result", "noise");
  filter.appendChild(turbulence);

  const displace = document.createElementNS(SVG_NS, "feDisplacementMap");
  displace.setAttribute("in", "SourceGraphic");
  displace.setAttribute("in2", "noise");
  displace.setAttribute("scale", "7");
  displace.setAttribute("xChannelSelector", "R");
  displace.setAttribute("yChannelSelector", "G");
  displace.setAttribute("result", "displaced");
  filter.appendChild(displace);

  const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
  blur.setAttribute("in", "displaced");
  blur.setAttribute("stdDeviation", "0.7");
  filter.appendChild(blur);

  defs.appendChild(filter);
  return id;
}

/** texture: "grain" — a whole-frame film-grain/paper-texture filter, the same "SVG filter
 * over the same geometry" technique buildWatercolorFilter uses, aimed at a different target
 * — fine aged-paper texture instead of wet-media bleed. feTurbulence's noise is converted
 * to a pure-black
 * layer whose ALPHA (not color) varies with noise brightness (the color-matrix's last row
 * sums R+G+B into alpha, scaled down to control grain intensity, with R/G/B rows left at
 * zero), then feBlend "overlay" combines that speckle with the source — darkens shadows
 * and lightens highlights slightly, the way real grain modulates an image, rather than a
 * flat semi-transparent noise layer sitting on top of it. */
function buildGrainFilter(defs: SVGDefsElement): string {
  const id = "sk-grain";
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "0%");
  filter.setAttribute("y", "0%");
  filter.setAttribute("width", "100%");
  filter.setAttribute("height", "100%");

  const turbulence = document.createElementNS(SVG_NS, "feTurbulence");
  turbulence.setAttribute("type", "fractalNoise");
  turbulence.setAttribute("baseFrequency", "0.85");
  turbulence.setAttribute("numOctaves", "2");
  turbulence.setAttribute("seed", "5");
  turbulence.setAttribute("result", "noise");
  filter.appendChild(turbulence);

  const toAlpha = document.createElementNS(SVG_NS, "feColorMatrix");
  toAlpha.setAttribute("in", "noise");
  toAlpha.setAttribute("type", "matrix");
  toAlpha.setAttribute(
    "values",
    "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.16 0.16 0.16 0 0"
  );
  toAlpha.setAttribute("result", "grain");
  filter.appendChild(toAlpha);

  const blend = document.createElementNS(SVG_NS, "feBlend");
  blend.setAttribute("in", "grain");
  blend.setAttribute("in2", "SourceGraphic");
  blend.setAttribute("mode", "overlay");
  filter.appendChild(blend);

  defs.appendChild(filter);
  return id;
}

/** Applies a scene's optional texture as an SVG `filter` attribute on `target` — the one
 * place SceneTexture actually does anything, shared between a standalone `mount` (target
 * is the top-level `<svg>`) and `mountFilm` (target is each entry's own wrapper `<g>`, so
 * a texture is scoped to that one scene's own content rather than the whole film canvas).
 * A no-op for `undefined`/`"pixel"` — pixel is a CLI-level raster post-process on the final
 * captured frame, not an SVG filter, so there's nothing to attach here (see SceneTexture's
 * own doc comment for why that keeps it scene-only, unlike watercolor/grain). */
export function applyTextureFilter(texture: SceneTexture | undefined, target: SVGElement, defs: SVGDefsElement): void {
  if (texture === "watercolor") {
    target.setAttribute("filter", `url(#${buildWatercolorFilter(defs)})`);
  } else if (texture === "grain") {
    target.setAttribute("filter", `url(#${buildGrainFilter(defs)})`);
  }
}
