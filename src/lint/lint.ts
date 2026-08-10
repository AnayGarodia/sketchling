import type { SerializedNode, SerializedScene } from "../core/types.js";
import { bboxOfPoints, bboxOverlapRatio, type BBox } from "../core/geometry.js";

export interface LintFinding {
  level: "error" | "warn" | "info";
  message: string;
  nodeId?: string;
}

interface FlatShape {
  nodeId: string;
  bbox: BBox;
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

  // Overlap check (pairwise, top-level shapes only to keep this O(n^2) on a small n)
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const ratio = bboxOverlapRatio(shapes[i].bbox, shapes[j].bbox);
      if (ratio > 0.6) {
        findings.push({
          level: "warn",
          message: `node ${shapes[i].nodeId} and ${shapes[j].nodeId} overlap heavily (${Math.round(ratio * 100)}%)`,
        });
      }
    }
  }

  findings.push(...lintCameraBounds(scene));

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
      out.push({ nodeId: node.id, bbox });
    }

    if (node.children) {
      walk(node.children, ox, oy, out, findings);
    }
  }
}
