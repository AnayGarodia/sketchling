import type { NodeStyle, RenderLook, SceneBackground, Weight } from "../core/types.js";

/** Collapses a fill color that might be a gradient spec down to one flat string — for
 * pipelines that only ever take one color (the SVG-sketched 3D mesh pipeline's per-face
 * flat shading, the WebGL lit3d/toon3d pipeline's base material color, a limb's cap). Not
 * an error case: those pipelines simply don't have a per-shape gradient concept, so a
 * gradient-filled node just contributes its first stop there, same as it always rendered a
 * single color before FillDef.color could be a gradient at all. */
export function flatColorOf(color: SceneBackground | undefined, fallback: string): string {
  if (color === undefined) return fallback;
  return typeof color === "string" ? color : color.stops[0]?.color ?? fallback;
}

const WEIGHT_PX: Record<string, number> = { light: 1.5, confident: 3, bold: 5 };

export function strokeWidthOf(weight: Weight | undefined): number {
  if (typeof weight === "number") return weight;
  return WEIGHT_PX[weight ?? "confident"] ?? 3;
}

const ENERGY_MULT: Record<string, number> = { calm: 0.7, quick: 1, frantic: 1.6 };

/** The fillStyle rough.js actually ends up using — "flat"/"clay" force solid regardless of
 * what the author asked for. roughOptionsFor calls this directly rather than re-deriving
 * it, so the two never drift; pulled out on its own so renderer.ts can also decide, before
 * calling roughOptionsFor, whether a
 * gradient fill color is even eligible to render as a real gradient (only meaningful on
 * "solid" — hachure/cross-hatch/zigzag/dots are procedural line strokes with no continuous
 * area to gradient across). Independent of SceneTexture entirely — a texture is a
 * whole-frame post-process, not a fillStyle override, so "grain"/"watercolor"/"pixel" don't
 * appear here at all; they combine with whatever fillStyle `look` alone already produced. */
export function effectiveFillStyle(style: NodeStyle, look: RenderLook): string {
  const crisp = look === "flat";
  const clay = look === "clay";
  return crisp || clay ? "solid" : style.fill?.style ?? "hachure";
}

/** Maps sketchling's design vocabulary (weight/looseness/energy) onto rough.js draw
 * options — the one place a scene's `look` actually changes what gets painted. "clay" keeps
 * the geometry imprecise, at a subtler magnitude than "ink" — hand-molded, not
 * hand-sketched — with solid fills; its distinguishing choppiness comes from quantized seek
 * time, not per-shape jitter (see mount()'s seekTo). SceneTexture (watercolor/grain/pixel)
 * is a separate, independent axis — see effectiveFillStyle's doc comment — so it plays no
 * part in this function at all. */
export function roughOptionsFor(
  style: NodeStyle,
  seed: number,
  closed: boolean,
  look: RenderLook = "ink"
): Record<string, unknown> {
  const crisp = look === "flat";
  const clay = look === "clay";
  const looseness = style.looseness ?? 0.3;
  const energyMult = ENERGY_MULT[style.energy ?? "quick"] ?? 1;
  const opts: Record<string, unknown> = {
    stroke: style.color ?? "#181511",
    strokeWidth: strokeWidthOf(style.weight),
    roughness: crisp ? 0 : (clay ? 0.3 + looseness * 1.0 : 0.6 + looseness * 2.2) * energyMult,
    bowing: crisp ? 0 : (clay ? 0.2 + looseness * 0.8 : 0.5 + looseness * 2) * energyMult,
    seed,
    preserveVertices: crisp,
  };
  if (closed && style.fill) {
    // Resolves to a flat string here unconditionally — a real gradient url() is injected
    // by the caller instead, by passing a style clone with fill.color already replaced
    // (see renderer.ts's stroke-rendering block), so this function stays pure/DOM-free.
    // Any gradient spec that reaches here unresolved (a fillStyle that isn't "solid", where
    // a gradient can't render anyway) degrades to its first stop instead of crashing.
    opts.fill = flatColorOf(style.fill.color, style.color ?? "#333");
    opts.fillStyle = effectiveFillStyle(style, look);
    opts.hachureGap = 3 + (1 - (style.fill.density ?? 0.4)) * 8;
    opts.hachureAngle = style.fill.angle ?? -41;
    opts.fillWeight = Math.max(0.5, strokeWidthOf(style.weight) * 0.4);
  }
  return opts;
}
