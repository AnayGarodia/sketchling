export type Point = [number, number];
export type Point3 = [number, number, number];

export type Weight = "light" | "confident" | "bold" | number;
export type Energy = "calm" | "quick" | "frantic";
export type FillStyle = "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots" | "none";

export interface StrokeStyle {
  color?: string;
  weight?: Weight;
  looseness?: number; // 0 (precise) .. 1 (wild) — feeds both shape irregularity and render jitter
  energy?: Energy;
  smooth?: boolean; // true: spline through points (organic). false: straight edges (boxes, wedges)
}

export interface FillDef {
  color: string;
  style?: FillStyle;
  density?: number; // 0..1, maps to hachure gap
  angle?: number; // degrees
}

export interface NodeStyle extends StrokeStyle {
  fill?: FillDef;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  pivot?: Point; // absolute canvas-space anchor for rotate/scale (default: the shape's own center)
}

export interface TimingOpts {
  at?: number;
  duration?: number;
  ease?: string;
  delay?: number;
}

export type AnimOp =
  | ({ kind: "drawOn" } & TimingOpts)
  | ({ kind: "appear" } & TimingOpts)
  | ({ kind: "moveTo"; x: number; y: number } & TimingOpts)
  | ({ kind: "moveBy"; dx: number; dy: number } & TimingOpts)
  | ({ kind: "scaleTo"; scale: number } & TimingOpts)
  | ({ kind: "rotateTo"; degrees: number } & TimingOpts)
  | ({ kind: "fadeTo"; opacity: number } & TimingOpts)
  | ({ kind: "morphTo"; points: Point[] } & TimingOpts)
  | ({ kind: "moveAlong"; points: Point[]; rotate?: boolean } & TimingOpts)
  | ({ kind: "squashTo"; scaleX: number; scaleY: number } & TimingOpts)
  // Absolute-target 3D rotation, in degrees (matching rotateTo's convention — converted
  // to radians in the renderer, not here). Independent of `rotateTo`, which still spins
  // the mesh's flat 2D placement (its screen-space transform) same as any other node.
  | ({ kind: "spin3d"; rx: number; ry: number; rz: number } & TimingOpts)
  // Absolute-target 2-bone IK: moves a Limb's end effector to (x, y) in the limb's own
  // local space — the renderer re-solves the joint angle from the target every frame.
  | ({ kind: "ikTo"; x: number; y: number } & TimingOpts)
  // Secondary motion: chases driverId's own live position (its authored anchor plus
  // whatever its own animations currently add, the same "local offset" space
  // gsap.getProperty reads for camera.follow — a driver nested in an animated parent
  // group contributes only its own local offset, not the parent's, same convention as
  // everywhere else in this renderer) plus (offsetX, offsetY), with damped-spring lag
  // and overshoot, from `at` through the rest of the timeline. Precomputed once per scene
  // build (see renderer.ts's buildSprings), not evaluated live, so seeking anywhere stays
  // exact and repeatable.
  | { kind: "springTo"; driverId: string; offsetX: number; offsetY: number; stiffness: number; damping: number; at: number };

// A scene's own viewport, animated independently of any node — pans/zooms the whole
// canvas, or tracks a node's live position. "follow" resolves to the target node's
// authored bbox center plus its current animated offset, read live off the DOM at
// render time (not a fixed keyframe), so it stays locked on even while the node is
// mid-tween.
export type CameraOp =
  | ({ kind: "panTo"; x: number; y: number } & TimingOpts)
  | ({ kind: "zoomTo"; scale: number } & TimingOpts)
  | ({ kind: "follow"; nodeId: string } & TimingOpts);

export interface Mesh3DFaceData {
  indices: number[];
  color?: string;
}

export interface SerializedNode {
  id: string;
  type: "stroke" | "blob" | "group" | "mesh3d" | "limb";
  points?: Point[];
  closed?: boolean;
  style?: NodeStyle;
  transform: Transform;
  animations: AnimOp[];
  seed: number;
  children?: SerializedNode[];
  // Parallax depth for a top-level scene child (set via scene.layer()). 1 = moves 1:1
  // with the camera (the default, identical to a node with no depth at all). <1 recedes
  // (moves less as the camera pans — distant), >1 pops forward (moves more — near).
  // Meaningless below the top level: a nested child just moves with its parent group.
  depth?: number;
  // mesh3d only: local-space vertices/faces/lighting the renderer projects and re-sketches
  // every seek (the 2D fields above — points/closed — are unused on a mesh3d node).
  mesh3dVertices?: Point3[];
  mesh3dFaces?: Mesh3DFaceData[];
  mesh3dFocalLength?: number;
  mesh3dLightDir?: Point3;
  // limb only: the 2-bone chain's geometry and current (pre-animation) target — the
  // renderer solves the joint position from these every seek (the 2D fields above —
  // points/closed — are unused on a limb node).
  limbRootX?: number;
  limbRootY?: number;
  limbLen1?: number;
  limbLen2?: number;
  limbBend?: 1 | -1;
  limbCapRadius?: number;
  limbCapColor?: string;
  limbTargetX?: number;
  limbTargetY?: number;
}

export interface GradientStop {
  offset: number; // 0..1
  color: string;
}

export type SceneBackground = string | { stops: GradientStop[]; direction?: "horizontal" | "vertical" };

// The scene's visual treatment — what turns an authored shape into pixels, independent of
// what that shape IS (its geometry, physics, timing are the same regardless).
// - "ink" (default): hand-drawn rough.js sketchiness, line boil, a visible pen tip during
//   drawOn.
// - "flat": the same shapes and timing rendered crisp and precise instead — no jitter, no
//   boil, solid fills, no pen tip — a flat vector motion-graphics look off the same
//   pipeline.
// - "clay": moderate, subtler jitter than ink (hand-molded, not hand-sketched), solid
//   fills, and time itself quantized to a ~10fps hold — a stop-motion cadence, not a
//   continuous tween, applied at the seek level rather than per-shape.
// - "watercolor": the same crisp geometry as "flat", with a whole-frame SVG filter
//   (turbulence displacement + a soft blur) bleeding every edge — a post-process over the
//   same pipeline, not a different stroke style underneath.
// - "lit3d": a genuinely separate rendering pipeline (WebGL/Three.js, not SVG/rough.js) —
//   real directional + ambient lighting and cast shadows on mesh3d nodes specifically.
//   Only mesh3d nodes have a 3D representation; every 2D-only node (stroke, blob, limb,
//   text) in the same scene simply doesn't appear in a lit3d render. See renderer3d.ts.
// - "pixel": "flat"'s crisp geometry, with every captured frame additionally downsampled
//   and nearest-neighbor upscaled back to size (a raster post-process applied in cli.ts
//   after the browser screenshot, not a DOM/SVG-level change) — a blocky, low-res game-art
//   look. Requires ffmpeg on PATH, same as --video already does.
// - "toon3d": lit3d's exact pipeline (same camera, lights, shadows, mesh3d-only scope) with
//   a stepped/cel gradient map on each mesh's material instead of a continuous PBR one —
//   flat toon bands instead of a smooth roughness falloff. A shading variant of lit3d, not
//   a separate pipeline; see renderer3d.ts.
export type RenderLook = "ink" | "flat" | "clay" | "watercolor" | "lit3d" | "pixel" | "toon3d";

export interface SerializedScene {
  kind: "scene";
  // The world: everything is authored/positioned in this coordinate space, and the
  // background fills exactly this rect.
  width: number;
  height: number;
  // The output frame: what's actually rendered/exported. Equals width/height (the
  // whole world, no camera) unless the scene set a smaller viewport for the camera to
  // pan and zoom within.
  viewportWidth: number;
  viewportHeight: number;
  background: SceneBackground;
  seed: number;
  look: RenderLook;
  children: SerializedNode[];
  camera: CameraOp[];
}

export type FilmTransition = "cut" | "fade";

export interface FilmEntry {
  scene: SerializedScene;
  transition: FilmTransition;
  transitionDuration: number;
  hold: number;
}

export interface SerializedFilm {
  kind: "film";
  width: number;
  height: number;
  background: string;
  entries: FilmEntry[];
}

export type Renderable = SerializedScene | SerializedFilm;
