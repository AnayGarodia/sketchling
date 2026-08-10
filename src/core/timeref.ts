import type { AnimOp, AuthorAnimOp, AuthorCameraOp, CameraOp, TimeRef } from "./types.js";

const LABEL_REF = /^\s*([A-Za-z_][\w-]*)\s*([+-]\s*[0-9]*\.?[0-9]+)?\s*$/;

/**
 * Resolves a TimeRef (a plain number, or "label" / "label+N" / "label-N") to a number
 * against a scene's own label table (declared with `scene.label(name, seconds)`). Throws on
 * an unknown label or a malformed reference — a typo here should fail loudly at build time,
 * not silently resolve to NaN and produce a scene that renders wrong with no error anywhere.
 */
export function resolveAt(at: TimeRef | undefined, labels: Readonly<Record<string, number>>): number {
  if (at == null) return 0;
  if (typeof at === "number") return at;
  const m = LABEL_REF.exec(at);
  if (!m) {
    throw new Error(
      `Invalid "at" value "${at}". Expected a number, a label name, or "label+N"/"label-N" (e.g. "liftoff+0.4").`
    );
  }
  const [, name, offsetStr] = m;
  if (!(name in labels)) {
    throw new Error(`Unknown label "${name}" referenced in an "at" option. Declare it first with scene.label("${name}", <seconds>).`);
  }
  const offset = offsetStr ? parseFloat(offsetStr.replace(/\s+/g, "")) : 0;
  return labels[name] + offset;
}

/** AuthorAnimOp/AuthorCameraOp and AnimOp/CameraOp differ only in `at`'s type — once it's
 * been resolved to a number, the rest of the object already matches the target shape. */
export function resolveAnimOp(op: AuthorAnimOp, labels: Readonly<Record<string, number>>): AnimOp {
  return { ...op, at: resolveAt(op.at, labels) } as AnimOp;
}

export function resolveCameraOp(op: AuthorCameraOp, labels: Readonly<Record<string, number>>): CameraOp {
  return { ...op, at: resolveAt(op.at, labels) } as CameraOp;
}
