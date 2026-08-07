import { SketchNode } from "./node.js";
import { Stroke } from "./stroke.js";
import { Group } from "./group.js";
import type { SerializedNode, SerializedScene } from "./types.js";
import { hashSeed } from "./geometry.js";

export interface SceneOptions {
  width?: number;
  height?: number;
  background?: string;
  seed?: number | string;
}

export class Scene {
  width: number;
  height: number;
  background: string;
  seed: number;
  children: SketchNode[] = [];

  constructor(opts: SceneOptions = {}) {
    this.width = opts.width ?? 480;
    this.height = opts.height ?? 480;
    this.background = opts.background ?? "#faf7f0";
    this.seed = typeof opts.seed === "string" ? hashSeed(opts.seed) : opts.seed ?? 1;
  }

  add(node: SketchNode): SketchNode {
    this.children.push(node);
    return node;
  }

  group(children: SketchNode[] = []): Group {
    const g = new Group(children);
    this.children.push(g);
    return g;
  }

  serialize(): SerializedScene {
    return {
      kind: "scene",
      width: this.width,
      height: this.height,
      background: this.background,
      seed: this.seed,
      children: this.children.map(serializeNode),
    };
  }
}

function serializeNode(node: SketchNode): SerializedNode {
  if (node instanceof Group) {
    return {
      id: node.id,
      type: "group",
      style: node.style,
      transform: node.transform,
      animations: node.animations,
      seed: node.seed,
      children: node.children.map(serializeNode),
    };
  }
  if (node instanceof Stroke) {
    return {
      id: node.id,
      type: "stroke",
      points: node.points,
      closed: node.closed,
      style: node.style,
      transform: node.transform,
      animations: node.animations,
      seed: node.seed,
    };
  }
  throw new Error(`Unknown node type for id ${node.id}`);
}
