import type { Stroke } from "./stroke.js";
import type { Group } from "./group.js";
import { Limb, limb } from "./limb.js";
import type { NodeStyle } from "./types.js";

export interface QuickRigOpts {
  groundY: number;
  // How far a step will actually reach (matches sketch.walk's own stepLength) — used only
  // to size leg length with headroom, not to place anything. Default 40.
  stepLength?: number;
  // Vertical offset from the body's own bottom edge down to the hip line. Default 0 (hips
  // sit right at the body's bottom edge, the common case for a round body blob).
  hipDrop?: number;
  // Horizontal distance between the two hips. Default 30% of the body's own width.
  hipSpread?: number;
  // Safety factor over the worst-case reach (see below) — how much slack len1+len2 keeps
  // past what a step could ever actually need. Default 1.35 (35% headroom).
  reachMargin?: number;
  legStyle?: NodeStyle;
  capRadius?: number;
}

export interface QuickRig {
  legL: Limb;
  legR: Limb;
  hipY: number;
  hipLX: number;
  hipRX: number;
  len1: number;
  len2: number;
}

/**
 * Auto-derives a headroom-safe two-legged rig from a drawn body's own bounding box, instead
 * of hand-placing hip coordinates and leg lengths — automates exactly the math
 * examples/gallery/walk-cycle.ts otherwise does inline (see that file's own comment): a
 * worst-case-reach check, `sqrt(stepLength² + hipToGroundDrop²)`, sized with `reachMargin`
 * headroom so a step's IK target never gets silently clamped mid-stride (see AGENTS.md's
 * IK/walk headroom note for why that clamp is worth avoiding).
 *
 * Named honestly: this derives hip/leg proportions from a bounding box (center, width,
 * bottom edge) — NOT a real skeleton extracted from an arbitrary drawn silhouette, which is
 * a much harder problem this does not attempt. Good for the common case (a round or
 * roughly-humanoid body blob or group); an unusual or asymmetric shape may still want
 * hand-placed joints via sketch.limb directly.
 */
export function quickRig(body: Stroke | Group, opts: QuickRigOpts): QuickRig {
  const box = body.bbox();
  const centerX = (box.minX + box.maxX) / 2;
  const width = box.maxX - box.minX;
  const bottomY = box.maxY;

  const hipDrop = opts.hipDrop ?? 0;
  const hipSpread = opts.hipSpread ?? width * 0.3;
  const stepLength = opts.stepLength ?? 40;
  const reachMargin = opts.reachMargin ?? 1.35;
  const capRadius = opts.capRadius ?? 0;
  const legStyle = opts.legStyle ?? {};

  const hipY = bottomY + hipDrop;
  const hipLX = centerX - hipSpread / 2;
  const hipRX = centerX + hipSpread / 2;

  const drop = opts.groundY - hipY;
  const worstCaseReach = Math.hypot(stepLength, drop);
  const totalLen = worstCaseReach * reachMargin;
  const len1 = totalLen / 2;
  const len2 = totalLen / 2;

  const legL = limb(hipLX, hipY, len1, len2, legStyle, { bend: 1, capRadius });
  const legR = limb(hipRX, hipY, len1, len2, legStyle, { bend: -1, capRadius });
  legL.restAt(hipLX, opts.groundY);
  legR.restAt(hipRX, opts.groundY);

  return { legL, legR, hipY, hipLX, hipRX, len1, len2 };
}
