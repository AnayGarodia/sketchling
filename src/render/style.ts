import type { NodeStyle, RenderLook, Weight } from "../core/types.js";

const WEIGHT_PX: Record<string, number> = { light: 1.5, confident: 3, bold: 5 };

export function strokeWidthOf(weight: Weight | undefined): number {
  if (typeof weight === "number") return weight;
  return WEIGHT_PX[weight ?? "confident"] ?? 3;
}

const ENERGY_MULT: Record<string, number> = { calm: 0.7, quick: 1, frantic: 1.6 };

/** Maps sketchling's design vocabulary (weight/looseness/energy) onto rough.js draw
 * options — the one place a scene's `look` actually changes what gets painted. "flat"
 * zeroes the sketchy perturbation (roughness/bowing) and vertex wobble, and forces solid
 * fills over hachure/cross-hatch — the same geometry and timing, traced precisely instead
 * of by hand. */
export function roughOptionsFor(
  style: NodeStyle,
  seed: number,
  closed: boolean,
  look: RenderLook = "ink"
): Record<string, unknown> {
  const flat = look === "flat";
  const looseness = style.looseness ?? 0.3;
  const energyMult = ENERGY_MULT[style.energy ?? "quick"] ?? 1;
  const opts: Record<string, unknown> = {
    stroke: style.color ?? "#181511",
    strokeWidth: strokeWidthOf(style.weight),
    roughness: flat ? 0 : (0.6 + looseness * 2.2) * energyMult,
    bowing: flat ? 0 : (0.5 + looseness * 2) * energyMult,
    seed,
    preserveVertices: flat,
  };
  if (closed && style.fill) {
    opts.fill = style.fill.color;
    opts.fillStyle = flat ? "solid" : style.fill.style ?? "hachure";
    opts.hachureGap = 3 + (1 - (style.fill.density ?? 0.4)) * 8;
    opts.hachureAngle = style.fill.angle ?? -41;
    opts.fillWeight = Math.max(0.5, strokeWidthOf(style.weight) * 0.4);
  }
  return opts;
}
