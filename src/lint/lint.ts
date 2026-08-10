import type { SerializedNode, SerializedScene } from "../core/types.js";
import { bboxOfPoints, bboxOverlapRatio, DEFAULT_OP_DURATION, type BBox } from "../core/geometry.js";

export interface LintFinding {
  level: "error" | "warn" | "info";
  message: string;
  nodeId?: string;
}

interface FlatShape {
  nodeId: string;
  bbox: BBox;
  lintSuppress?: string[];
}

/**
 * Tier 0 verification: deterministic, zero-token structural checks that run on
 * every render before anyone spends a single vision token looking at a screenshot.
 * Only accounts for static translation offsets — scale/rotation are ignored for v1.
 */
export function lintScene(scene: SerializedScene): LintFinding[] {
  const findings: LintFinding[] = [];
  const shapes: FlatShape[] = [];

  walk(scene.children, 0, 0, shapes, findings);

  // Off-canvas check
  for (const s of shapes) {
    const { minX, minY, maxX, maxY } = s.bbox;
    const fullyOut = maxX < 0 || maxY < 0 || minX > scene.width || minY > scene.height;
    if (fullyOut) {
      findings.push({ level: "error", message: `node ${s.nodeId} renders fully off-canvas`, nodeId: s.nodeId });
      continue;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const visibleW = Math.max(0, Math.min(maxX, scene.width) - Math.max(minX, 0));
    const visibleH = Math.max(0, Math.min(maxY, scene.height) - Math.max(minY, 0));

    // Area-based visibility breaks down for a perfectly axis-aligned line — a vertical
    // stroke has zero bbox width, so width*height is always zero regardless of position,
    // which used to read as "0% visible" even when the line was fully on-canvas. Fall
    // back to a 1D overlap ratio along whichever axis actually has extent.
    let visibleRatio: number;
    if (w < 0.5 && h < 0.5) {
      visibleRatio = 1; // point-like; the degenerate-shape check below already flags this
    } else if (w < 0.5) {
      visibleRatio = visibleH / h;
    } else if (h < 0.5) {
      visibleRatio = visibleW / w;
    } else {
      visibleRatio = (visibleW * visibleH) / (w * h);
    }

    if (visibleRatio < 0.5) {
      findings.push({
        level: "warn",
        message: `node ${s.nodeId} is mostly off-canvas (${Math.round(visibleRatio * 100)}% visible)`,
        nodeId: s.nodeId,
      });
    }
  }

  // Overlap check (pairwise, top-level shapes only to keep this O(n^2) on a small n).
  // bboxOverlapRatio is intersection / min(areaA, areaB) — "how much of the smaller shape
  // is covered" — which scores a tiny eye fully inside a big head, or a hub inside a gear,
  // the same ~100% as two comparable-sized shapes actually fighting for the same space. The
  // former is normal composition (a detail nested in its container); the latter is the real
  // signal this check exists to catch. Distinguish by how much of the LARGER shape is ALSO
  // covered: a small detail barely dents its container's own area even while it's fully
  // swallowed by it, where two similarly-sized overlapping shapes cover a meaningful chunk
  // of each other. One real film's worth of evidence: 1,446 lint findings on a single scene,
  // 1,444 of them overlap warnings from exactly this containment pattern, burying the 2 that
  // were real.
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i];
      const b = shapes[j];
      if (a.lintSuppress?.includes("overlap") || b.lintSuppress?.includes("overlap")) continue;
      const ratio = bboxOverlapRatio(a.bbox, b.bbox);
      if (ratio <= 0.6) continue;
      const ix = Math.max(0, Math.min(a.bbox.maxX, b.bbox.maxX) - Math.max(a.bbox.minX, b.bbox.minX));
      const iy = Math.max(0, Math.min(a.bbox.maxY, b.bbox.maxY) - Math.max(a.bbox.minY, b.bbox.minY));
      const interArea = ix * iy;
      const areaA = (a.bbox.maxX - a.bbox.minX) * (a.bbox.maxY - a.bbox.minY);
      const areaB = (b.bbox.maxX - b.bbox.minX) * (b.bbox.maxY - b.bbox.minY);
      const largerAreaRatio = interArea / Math.max(areaA, areaB);
      const isContainment = Math.max(areaA, areaB) / Math.min(areaA, areaB) >= 3 && largerAreaRatio < 0.35;
      findings.push({
        level: isContainment ? "info" : "warn",
        message: isContainment
          ? `node ${a.nodeId} sits inside node ${b.nodeId} (${Math.round(ratio * 100)}% contained) — fine if intentional (a detail nested in its container); use .lintIgnore("overlap") on either node to silence.`
          : `node ${a.nodeId} and ${b.nodeId} overlap heavily (${Math.round(ratio * 100)}%)`,
      });
    }
  }

  findings.push(...lintCameraBounds(scene));
  findings.push(...lintDuration(scene));
  findings.push(...lintIKReach(scene));
  findings.push(...lintTweenConflicts(scene));

  // Balance/symmetry: centroid of all ink vs canvas center
  if (shapes.length > 0) {
    let sx = 0,
      sy = 0;
    for (const s of shapes) {
      sx += (s.bbox.minX + s.bbox.maxX) / 2;
      sy += (s.bbox.minY + s.bbox.maxY) / 2;
    }
    const cx = sx / shapes.length;
    const cy = sy / shapes.length;
    const offX = Math.abs(cx - scene.width / 2) / scene.width;
    const offY = Math.abs(cy - scene.height / 2) / scene.height;
    if (offX > 0.3 || offY > 0.3) {
      findings.push({
        level: "info",
        message: `composition is off-center (centroid at ${Math.round(offX * 100)}%/${Math.round(offY * 100)}% offset from middle)`,
      });
    }
  }

  return findings;
}

/**
 * Every `panTo` target checked against the world's own bounds, because a camera framing that
 * runs off the edge of the world is the single most confusing failure this library produces.
 * It shows up as a hard-edged "stray pale rectangle" — which is not an artifact at all, just
 * the backdrop (pinned at depth 0, so it never pans) still covering the frame after the
 * depth-1 content has run out. It was carried in AGENTS.md as an unexplained renderer bug for
 * a while on the strength of how little it looks like an authoring mistake.
 *
 * `follow` targets aren't checked: where a followed node ends up is only knowable once the
 * timeline runs, and guessing here would mean false positives on scenes that are fine.
 */
function lintCameraBounds(scene: SerializedScene): LintFinding[] {
  const ops = scene.camera ?? [];
  if (ops.length === 0) return [];
  const findings: LintFinding[] = [];

  // Only meaningful when the viewport is actually smaller than the world; a scene whose
  // viewport IS the world can't pan anywhere revealing.
  const halfW = scene.viewportWidth / 2;
  const halfH = scene.viewportHeight / 2;
  const seen = new Set<string>();

  for (const op of ops) {
    if (op.kind !== "panTo") continue;
    const over: string[] = [];
    if (op.x - halfW < -0.5) over.push("left");
    if (op.x + halfW > scene.width + 0.5) over.push("right");
    if (op.y - halfH < -0.5) over.push("top");
    if (op.y + halfH > scene.height + 0.5) over.push("bottom");
    if (over.length === 0) continue;

    const key = over.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({
      level: "warn",
      message:
        `camera panTo(${Math.round(op.x)}, ${Math.round(op.y)}) frames past the world's ` +
        `${over.join(" and ")} edge — the viewport (${scene.viewportWidth}x${scene.viewportHeight}) ` +
        `reaches outside 0,0..${scene.width},${scene.height}, so bare background will show where ` +
        `the scene's content runs out. Keep pan targets within ` +
        `[${Math.round(halfW)}, ${Math.round(scene.width - halfW)}] x ` +
        `[${Math.round(halfH)}, ${Math.round(scene.height - halfH)}], or extend the world.`,
    });
  }
  return findings;
}

/**
 * Checks every op with an explicit numeric `duration` against `scene.declaredDuration`
 * (set with `scene.duration(n)`) — the fix for a real bug class: a scene silently running
 * several seconds longer than intended because one op (an extrapolated off-screen ground
 * segment, a chain whose last leg ran long) was scheduled past where the author actually
 * meant the scene to end, discoverable before this check only by noticing the rendered
 * video was mysteriously long. Deliberately skips ops with no explicit `duration` (drawOn's
 * auto-pace from path length, springTo's automatic settle window) — their real end time
 * isn't knowable without rendering, and guessing here would just trade silent overruns for
 * false positives. A scene with no declared duration at all is unaffected either way.
 */
function lintDuration(scene: SerializedScene): LintFinding[] {
  const declared = scene.declaredDuration;
  if (declared == null) return [];
  const findings: LintFinding[] = [];

  const checkOps = (ops: { kind: string; at?: number; duration?: number }[], ref: string, nodeId?: string) => {
    for (const op of ops) {
      if (op.duration == null) continue;
      const end = (op.at ?? 0) + op.duration;
      if (end > declared + 0.01) {
        findings.push({
          level: "warn",
          message: `${ref}'s ${op.kind}() ends at ${end.toFixed(2)}s, past the scene's declared duration(${declared}).`,
          nodeId,
        });
      }
    }
  };

  const walkNodes = (nodes: SerializedNode[]) => {
    for (const node of nodes) {
      const ref = node.label ? `node "${node.label}" (${node.id})` : `node ${node.id}`;
      checkOps(node.animations, ref, node.id);
      if (node.children) walkNodes(node.children);
    }
  };
  walkNodes(scene.children);
  checkOps(scene.camera ?? [], "the camera");

  return findings;
}

/**
 * A Limb's `ikTo` target beyond `len1+len2` gets silently clamped onto the chain's own
 * reachable annulus (see ik.ts's solveTwoBoneIK) rather than erroring — necessary so a
 * swing arc that briefly overshoots doesn't crash, but it means an authoring mistake (an
 * arm's reach given too little headroom for where it actually needs to trace) reads as a
 * rigid "plank arm" only visible on render, with nothing pointing at why. Both root and
 * target are authored in the same local space (see ikTo's own doc comment), so this is
 * translation-invariant — no need to track the limb's own position in its parent.
 */
function lintIKReach(scene: SerializedScene): LintFinding[] {
  const findings: LintFinding[] = [];
  const walkNodes = (nodes: SerializedNode[]) => {
    for (const node of nodes) {
      if (
        node.type === "limb" &&
        node.limbRootX != null &&
        node.limbRootY != null &&
        node.limbLen1 != null &&
        node.limbLen2 != null
      ) {
        const maxReach = node.limbLen1 + node.limbLen2;
        const ref = node.label ? `node "${node.label}" (${node.id})` : `node ${node.id}`;
        for (const op of node.animations) {
          if (op.kind !== "ikTo") continue;
          const dist = Math.hypot(op.x - node.limbRootX, op.y - node.limbRootY);
          if (dist > maxReach + 0.5) {
            findings.push({
              level: "warn",
              message: `${ref}'s ikTo(${Math.round(op.x)}, ${Math.round(op.y)}) targets ${Math.round(dist)}px from its root, past its ${Math.round(maxReach)}px max reach (len1+len2) — the joint gets silently clamped to full extension instead of reaching it, which reads as a rigid limb. Give the chain more length, move the root, or bring the target in.`,
              nodeId: node.id,
            });
          }
        }
      }
      if (node.children) walkNodes(node.children);
    }
  };
  walkNodes(scene.children);
  return findings;
}

interface PropWindow {
  prop: string;
  start: number;
  end: number;
  kind: string;
}

/**
 * The #1 convergent complaint across every independent stress test this library has had:
 * two tweens that both write the same underlying GSAP property on the same node, running
 * over an overlapping time window, silently fight — the later-inserted one wins for as long
 * as both are active, with no error anywhere. `moveBy`'s own zero-axis skip (see
 * renderer.ts) fixed the most common case (a stride's x overlapping a bob's y) by not
 * writing an axis that isn't actually moving, but that only helps when the two tweens
 * happen to touch different axes — a hand-authored idle sway and a scene-specific rotateTo
 * "acting" gesture both writing `rotation` over the same window still collide, and nothing
 * catches it before the render looks wrong. Per-axis, not per-node: `moveBy(dx, 0)` and a
 * concurrent `moveBy(0, dy)` on the same node are fine (they compose, by design — that's
 * the whole stride+bob pattern) and must NOT be flagged just because they're both `moveBy`.
 */
function lintTweenConflicts(scene: SerializedScene): LintFinding[] {
  const findings: LintFinding[] = [];

  const windowsFor = (node: SerializedNode): PropWindow[] => {
    const windows: PropWindow[] = [];
    for (const op of node.animations) {
      const at = op.at ?? 0;
      const dur = "duration" in op && op.duration != null ? op.duration : DEFAULT_OP_DURATION[op.kind];
      if (dur == null) continue; // an op kind this check doesn't model (drawOn, ikTo, springTo, spin3d, morphTo)
      const end = at + dur;
      switch (op.kind) {
        case "moveTo":
        case "moveAlong":
          windows.push({ prop: "x", start: at, end, kind: op.kind }, { prop: "y", start: at, end, kind: op.kind });
          break;
        case "moveBy":
          // Mirrors renderer.ts's own skip-zero-axis logic exactly: an axis that isn't
          // actually moving doesn't get a live tween on it, so it can't conflict with
          // anything. A true (0,0) no-op still occupies x (renderer's own "+=0" fallback).
          if (op.dx !== 0) windows.push({ prop: "x", start: at, end, kind: op.kind });
          if (op.dy !== 0) windows.push({ prop: "y", start: at, end, kind: op.kind });
          if (op.dx === 0 && op.dy === 0) windows.push({ prop: "x", start: at, end, kind: op.kind });
          break;
        case "rotateTo":
        case "rotateBy":
          windows.push({ prop: "rotation", start: at, end, kind: op.kind });
          break;
        case "scaleTo":
        case "squashTo":
          // GSAP's `scale` is sugar for scaleX+scaleY set together — a plain scaleTo and a
          // squashTo running concurrently genuinely do fight over the same underlying
          // properties, not just superficially similar ones.
          windows.push({ prop: "scaleX", start: at, end, kind: op.kind }, { prop: "scaleY", start: at, end, kind: op.kind });
          break;
        case "fadeTo":
        case "appear":
          windows.push({ prop: "opacity", start: at, end, kind: op.kind });
          break;
      }
    }
    return windows;
  };

  const walkNodes = (nodes: SerializedNode[]) => {
    for (const node of nodes) {
      const windows = windowsFor(node);
      const ref = node.label ? `node "${node.label}" (${node.id})` : `node ${node.id}`;
      for (let i = 0; i < windows.length; i++) {
        for (let j = i + 1; j < windows.length; j++) {
          const a = windows[i];
          const b = windows[j];
          if (a.prop !== b.prop) continue;
          // A small epsilon, not a bare `<`: back-to-back chained calls (`.rotateTo(-7, {at:
          // 5.9, duration: 0.8}).rotateTo(5, {at: 6.7, duration: 0.9})...`) are meant to
          // touch exactly at the boundary, but summing decimal seconds in floating point
          // (6.7 + 0.9 = 7.6000000000000005) can land a hair past it — a real false positive
          // caught on moonlit-lighthouse.ts's own deliberate three-call swing, not a
          // hypothetical.
          const overlaps = Math.min(a.end, b.end) - Math.max(a.start, b.start) > 1e-6;
          if (!overlaps) continue;
          findings.push({
            level: "warn",
            message: `${ref}: ${a.kind}() at ${a.start.toFixed(2)}s and ${b.kind}() at ${b.start.toFixed(2)}s both animate "${a.prop}" over an overlapping window — the later one silently wins for as long as both run, with no error. Stagger them, route one through a different axis/property, or fold them into a single call.`,
            nodeId: node.id,
          });
        }
      }
      if (node.children) walkNodes(node.children);
    }
  };
  walkNodes(scene.children);
  return findings;
}

function walk(
  nodes: SerializedNode[],
  offsetX: number,
  offsetY: number,
  out: FlatShape[],
  findings: LintFinding[]
): void {
  for (const node of nodes) {
    const ox = offsetX + node.transform.x;
    const oy = offsetY + node.transform.y;

    if (node.type === "stroke" && node.points) {
      if (node.points.length < 2) {
        findings.push({ level: "error", message: `node ${node.id} has fewer than 2 points`, nodeId: node.id });
        continue;
      }
      const raw = bboxOfPoints(node.points);
      const bbox: BBox = {
        minX: raw.minX + ox,
        minY: raw.minY + oy,
        maxX: raw.maxX + ox,
        maxY: raw.maxY + oy,
      };
      const w = bbox.maxX - bbox.minX;
      const h = bbox.maxY - bbox.minY;
      if (w < 0.5 && h < 0.5) {
        findings.push({ level: "warn", message: `node ${node.id} is a degenerate (near-zero-area) shape`, nodeId: node.id });
        continue;
      }
      out.push({ nodeId: node.id, bbox, lintSuppress: node.lintSuppress });
    }

    if (node.children) {
      walk(node.children, ox, oy, out, findings);
    }
  }
}
