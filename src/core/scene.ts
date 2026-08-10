import { SketchNode } from "./node.js";
import { Stroke } from "./stroke.js";
import { Group } from "./group.js";
import { Camera } from "./camera.js";
import { Mesh3D } from "./mesh3d.js";
import { Limb } from "./limb.js";
import { Connector } from "./connector.js";
import { Particles } from "./particles.js";
import { Sound } from "./sound.js";
import type { RenderLook, SceneBackground, SceneTexture, SerializedNode, SerializedScene } from "./types.js";
import { hashSeed } from "./geometry.js";

export interface SceneOptions {
  width?: number;
  height?: number;
  // The output frame the camera pans/zooms within. Omit it and the scene renders exactly
  // as before — the whole width/height, camera or not. Set it smaller than width/height
  // for a world bigger than one screen's worth (what a scene.camera() is for).
  viewport?: { width: number; height: number };
  // A flat color, or a gradient: { stops: [{offset, color}, ...], direction }. Rendered as
  // one SVG linearGradient, not hand-sketched — a backdrop is painted, not pen-traced.
  background?: SceneBackground;
  seed?: number | string;
  // The scene's geometry treatment — see RenderLook. Default "ink" renders exactly as
  // before; every other look is the same authored scene (geometry, physics, timing)
  // painted differently.
  look?: RenderLook;
  // An optional whole-frame texture layered over `look` — see SceneTexture. Independent
  // axis: any texture combines with any of "ink"/"flat"/"clay" (meaningless under
  // "lit3d"/"toon3d"). Omit for exactly today's behavior with no texture at all.
  texture?: SceneTexture;
}

export class Scene {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  background: SceneBackground;
  seed: number;
  look: RenderLook;
  texture?: SceneTexture;
  children: SketchNode[] = [];
  private _camera?: Camera;
  private _declaredDuration?: number;

  constructor(opts: SceneOptions = {}) {
    this.width = opts.width ?? 480;
    this.height = opts.height ?? 480;
    this.viewportWidth = opts.viewport?.width ?? this.width;
    this.viewportHeight = opts.viewport?.height ?? this.height;
    this.background = opts.background ?? "#faf7f0";
    this.seed = typeof opts.seed === "string" ? hashSeed(opts.seed) : opts.seed ?? 1;
    this.look = opts.look ?? "ink";
    this.texture = opts.texture;
  }

  /** Declares the scene's intended length in seconds — purely a lint-time assertion, not a
   * hard cap: the renderer still derives the actual length from whatever the last-ending op
   * resolves to, the same as a scene with no declared duration at all. What it buys you is a
   * warning the moment something (an extrapolated off-screen element, a chain of `moveBy`s
   * that runs longer than intended) is scheduled past the length the scene itself claims to
   * be — instead of finding out by noticing the rendered video is mysteriously long. */
  duration(seconds: number): this {
    this._declaredDuration = seconds;
    return this;
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

  /** A depth plane for parallax: layers pan at a fraction of the camera's own motion, the
   * classic 2D depth cue (distant hills drift slowly, a foreground branch whips past fast).
   * `depth` 1 = moves exactly with the camera (identical to a plain scene.group()); <1
   * recedes into the background, >1 pops into the foreground. Only meaningful alongside
   * scene.camera() — with no camera motion, every layer sits at its authored position with
   * no offset, camera or not. */
  layer(depth: number, children: SketchNode[] = []): Group {
    const g = new Group(children);
    g.depth = depth;
    this.children.push(g);
    return g;
  }

  /** The scene's viewport — pan/zoom it, or have it follow a node. Lazily created: a
   * scene that never touches its camera renders exactly as before (identity viewport). */
  camera(): Camera {
    if (!this._camera) this._camera = new Camera();
    return this._camera;
  }

  serialize(): SerializedScene {
    return {
      kind: "scene",
      width: this.width,
      height: this.height,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      background: this.background,
      seed: this.seed,
      look: this.look,
      texture: this.texture,
      children: this.children.map(serializeNode),
      camera: this._camera?.ops ?? [],
      declaredDuration: this._declaredDuration,
    };
  }
}

function serializeNode(node: SketchNode): SerializedNode {
  if (node instanceof Group) {
    return {
      id: node.id,
      label: node.label,
      lintSuppress: node.lintSuppress,
      type: "group",
      style: node.style,
      transform: node.transform,
      animations: node.animations,
      seed: node.seed,
      children: node.children.map(serializeNode),
      depth: node.depth,
    };
  }
  if (node instanceof Mesh3D) {
    return {
      id: node.id,
      label: node.label,
      lintSuppress: node.lintSuppress,
      type: "mesh3d",
      style: node.style,
      transform: node.transform,
      animations: node.animations,
      seed: node.seed,
      mesh3dVertices: node.vertices,
      mesh3dFaces: node.faces,
      mesh3dFocalLength: node.focalLength,
      mesh3dLightDir: node.lightDir,
    };
  }
  if (node instanceof Limb) {
    return {
      id: node.id, label: node.label, lintSuppress: node.lintSuppress, type: "limb", style: node.style, transform: node.transform,
      animations: node.animations, seed: node.seed,
      limbRootX: node.rootX, limbRootY: node.rootY, limbLen1: node.len1, limbLen2: node.len2,
      limbBend: node.bend, limbCapRadius: node.capRadius, limbCapColor: node.capColor,
      limbTargetX: node.targetX, limbTargetY: node.targetY,
    };
  }
  if (node instanceof Connector) {
    return {
      id: node.id, label: node.label, lintSuppress: node.lintSuppress, type: "connector", style: node.style, transform: node.transform,
      animations: node.animations, seed: node.seed,
      connectorAnchorX: node.anchorX, connectorAnchorY: node.anchorY, connectorTargetId: node.targetId,
    };
  }
  if (node instanceof Particles) {
    return {
      id: node.id, label: node.label, lintSuppress: node.lintSuppress, type: "particles", style: node.style, transform: node.transform,
      animations: node.animations, seed: node.seed,
      particlesSpawnX: node.spawnX, particlesSpawnY: node.spawnY, particlesCount: node.count,
      particlesAngle: node.angle, particlesSpread: node.spread,
      particlesSpeedMin: node.speedMin, particlesSpeedMax: node.speedMax,
      particlesGravity: node.gravity, particlesLifetime: node.lifetime,
      particlesDuration: node.duration, particlesEmitAt: node.emitAt,
      particlesSizeMin: node.sizeMin, particlesSizeMax: node.sizeMax, particlesFade: node.fade,
    };
  }
  if (node instanceof Sound) {
    return {
      id: node.id, label: node.label, lintSuppress: node.lintSuppress, type: "sound", style: node.style, transform: node.transform,
      animations: node.animations, seed: node.seed,
      soundPitch: node.pitch, soundAt: node.at, soundDuration: node.duration,
      soundInstrument: node.instrument, soundVelocity: node.velocity, soundPan: node.pan,
    };
  }
  if (node instanceof Stroke) {
    return {
      id: node.id,
      label: node.label,
      lintSuppress: node.lintSuppress,
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
