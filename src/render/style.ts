import type { NodeStyle, RenderLook, Weight } from "../core/types.js";

const WEIGHT_PX: Record<string, number> = { light: 1.5, confident: 3, bold: 5 };

export function strokeWidthOf(weight: Weight | undefined): number {
  if (typeof weight === "number") return weight;
  return WEIGHT_PX[weight ?? "confident"] ?? 3;
}

const ENERGY_MULT: Record<string, number> = { calm: 0.7, quick: 1, frantic: 1.6 };

/** Maps sketchling's design vocabulary (weight/looseness/energy) onto rough.js draw
 * options — the one place a scene's `look` actually changes what gets painted.
 * "flat"/"watercolor" share crisp underlying geometry (watercolor's bleed is a filter
 * applied over that, not a different stroke quality). "clay" keeps the geometry
 * imprecise, at a subtler magnitude than "ink" — hand-molded, not hand-sketched — with
 * solid fills; its distinguishing choppiness comes from quantized seek time, not
 * per-shape jitter (see mount()'s seekTo). */
export function roughOptionsFor(
  style: NodeStyle,
  seed: number,
  closed: boolean,
  look: RenderLook = "ink"
): Record<string, unknown> {
  const crisp = look === "flat" || look === "watercolor" || look === "pixel";
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
    opts.fill = style.fill.color;
    opts.fillStyle = crisp || clay ? "solid" : style.fill.style ?? "hachure";
    opts.hachureGap = 3 + (1 - (style.fill.density ?? 0.4)) * 8;
    opts.hachureAngle = style.fill.angle ?? -41;
    opts.fillWeight = Math.max(0.5, strokeWidthOf(style.weight) * 0.4);
  }
  return opts;
}
