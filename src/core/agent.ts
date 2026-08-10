import { nodeBBox, type BBox } from "./geometry.js";
import type { AnimOp, Renderable, SerializedNode, SerializedScene } from "./types.js";

export const AGENT_REPORT_VERSION = 1;

export interface AgentFinding {
  level: "error" | "warn" | "info";
  code: string;
  message: string;
  nodeId?: string;
  nodeLabel?: string;
}

export interface AgentNodeManifest {
  id: string;
  label?: string;
  type: SerializedNode["type"];
  bounds?: BBox;
  animationKinds: AnimOp["kind"][];
}

export interface AgentSceneManifest {
  output: { width: number; height: number };
  world: { width: number; height: number };
  look: SerializedScene["look"];
  texture?: SerializedScene["texture"];
  nodes: AgentNodeManifest[];
  estimatedEnd: number;
}

export interface AgentManifest {
  schemaVersion: typeof AGENT_REPORT_VERSION;
  kind: Renderable["kind"];
  scenes: AgentSceneManifest[];
}

/** A pure, serializable scene report intended for tools and agent feedback loops. It does
 * not claim a browser-exact duration: drawOn's automatic path-length timing and spring
 * settling are renderer decisions, so the render command reports the authoritative value. */
export function inspectRenderable(renderable: Renderable): AgentManifest {
  const scenes = renderable.kind === "scene" ? [renderable] : renderable.entries.map((entry) => entry.scene);
  return {
    schemaVersion: AGENT_REPORT_VERSION,
    kind: renderable.kind,
    scenes: scenes.map(inspectScene),
  };
}

function inspectScene(scene: SerializedScene): AgentSceneManifest {
  const nodes: AgentNodeManifest[] = [];
  let estimatedEnd = 0;
  const walk = (node: SerializedNode) => {
    nodes.push({
      id: node.id,
      label: node.label,
      type: node.type,
      bounds: nodeBounds(node),
      animationKinds: node.animations.map((op) => op.kind),
    });
    for (const op of node.animations) estimatedEnd = Math.max(estimatedEnd, animationEnd(op));
    if (node.type === "particles") {
      estimatedEnd = Math.max(estimatedEnd, (node.particlesEmitAt ?? 0) + (node.particlesDuration ?? 0) + (node.particlesLifetime ?? 1.2));
    }
    if (node.type === "sound") estimatedEnd = Math.max(estimatedEnd, (node.soundAt ?? 0) + (node.soundDuration ?? 0.4));
    for (const child of node.children ?? []) walk(child);
  };
  for (const node of scene.children) walk(node);
  return {
    output: { width: scene.viewportWidth, height: scene.viewportHeight },
    world: { width: scene.width, height: scene.height },
    look: scene.look,
    texture: scene.texture,
    nodes,
    estimatedEnd,
  };
}

function animationEnd(op: AnimOp): number {
  if (op.kind === "springTo") return op.at + Math.max(0.5, 9.2 / op.damping);
  return (op.at ?? 0) + (op.duration ?? 0);
}

export function nodeBounds(node: SerializedNode): BBox | undefined {
  return nodeBBox(node);
}

/** Checks the semantic contract a renderer cannot safely infer. Warnings are explicit by
 * design: agents must never be left to discover a backend limitation from a missing pixel. */
export function validateRenderable(renderable: Renderable): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const scenes = renderable.kind === "scene" ? [renderable] : renderable.entries.map((entry) => entry.scene);
  scenes.forEach((scene, index) => validateScene(scene, index, findings));
  return findings;
}

function validateScene(scene: SerializedScene, sceneIndex: number, findings: AgentFinding[]): void {
  const scenePrefix = sceneIndex === 0 ? "" : `scene ${sceneIndex}: `;
  if (!Number.isFinite(scene.width) || !Number.isFinite(scene.height) || scene.width <= 0 || scene.height <= 0) {
    findings.push({ level: "error", code: "invalid-scene-size", message: `${scenePrefix}width and height must be positive finite numbers.` });
  }
  if (!Number.isFinite(scene.viewportWidth) || !Number.isFinite(scene.viewportHeight) || scene.viewportWidth <= 0 || scene.viewportHeight <= 0) {
    findings.push({ level: "error", code: "invalid-viewport-size", message: `${scenePrefix}viewport dimensions must be positive finite numbers.` });
  }
  if ((scene.look === "lit3d" || scene.look === "toon3d") && scene.texture) {
    findings.push({ level: "warn", code: "unsupported-3d-texture", message: `${scenePrefix}texture "${scene.texture}" is ignored by the ${scene.look} renderer.` });
  }
  const labels = new Set<string>();
  const walk = (node: SerializedNode) => {
    const ref = node.label ? `node "${node.label}" (${node.id})` : `node ${node.id}`;
    if (node.label) {
      if (labels.has(node.label)) findings.push({ level: "warn", code: "duplicate-node-name", message: `${scenePrefix}${ref} duplicates a diagnostic name.`, nodeId: node.id, nodeLabel: node.label });
      labels.add(node.label);
    }
    for (const op of node.animations) {
      const at = op.kind === "springTo" ? op.at : op.at ?? 0;
      const duration = op.kind === "springTo" ? 0 : op.duration ?? 0;
      if (!Number.isFinite(at) || !Number.isFinite(duration) || at < 0 || duration < 0) {
        findings.push({ level: "error", code: "invalid-timing", message: `${scenePrefix}${ref} has a non-finite or negative animation time.`, nodeId: node.id, nodeLabel: node.label });
      }
    }
    if ((scene.look === "lit3d" || scene.look === "toon3d")) {
      if (node.type !== "mesh3d" && node.type !== "group") {
        findings.push({ level: "warn", code: "unsupported-3d-node", message: `${scenePrefix}${ref} does not render under ${scene.look}.`, nodeId: node.id, nodeLabel: node.label });
      }
      if (node.type === "mesh3d") {
        for (const op of node.animations) {
          if (["drawOn", "morphTo", "moveAlong", "springTo", "ikTo"].includes(op.kind)) {
            findings.push({ level: "warn", code: "unsupported-3d-animation", message: `${scenePrefix}${ref} uses ${op.kind}(), which ${scene.look} does not support.`, nodeId: node.id, nodeLabel: node.label });
          }
        }
      }
    }
    for (const child of node.children ?? []) walk(child);
  };
  for (const node of scene.children) walk(node);
}
