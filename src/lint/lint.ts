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
