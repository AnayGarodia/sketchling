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
  // A flat color renders exactly as before. A gradient spec ({stops, direction}, the same
  // shape scene.background already takes) renders as one real per-shape SVG
  // linearGradient, sized to the shape's own bounding box — a light-to-shadow gradient on
  // a single form (a landform lit from one side, a body with a shaded underside) instead
  // of a uniform flat fill, the volumetric cue a flat-shaded "ink"/"flat" shape otherwise
  // has none of. Only meaningful with fillStyle "solid" — hachure/cross-hatch/zigzag/dots
  // are procedural line strokes with no continuous area to gradient across, so a gradient
  // color on those fill styles just resolves to its first stop, same as before.
  color: SceneBackground;
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
  // exact and repeatable. Practical consequence: a driver whose only motion comes from an
  // animated ancestor group (e.g. a body inside a sketch.walk character) reads as
  // stationary — give the driver its own tween if it needs to spring-drive an accessory.
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
  /** Optional author-chosen diagnostic handle, set with node.named("..."). */
  label?: string;
  // No "blob" member: a Blob is a Stroke subclass whose outline is baked at construction,
  // so it serializes as a plain closed stroke (see node.ts's own type comment).
  type: "stroke" | "group" | "mesh3d" | "limb" | "connector" | "particles" | "sound";
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
  // connector only: a fixed anchor point (absolute canvas space, like limbRootX/Y) and the
  // id of the node whose live resolved position (its authored bbox center plus whatever its
  // own animations — including a springTo — currently add, the same "local offset" space
  // camera.follow and springTo both read) it draws a bending line toward, rebuilt fresh
  // every seek from those two live points — the 2D fields above (points/closed) are unused
  // on a connector node, same convention as mesh3d/limb.
  connectorAnchorX?: number;
  connectorAnchorY?: number;
  connectorTargetId?: string;
  // particles only: emitter configuration — each particle's spawn time, launch angle,
  // speed, and size are drawn ONCE from a seeded PRNG at build time (see renderer.ts's
  // buildParticles), so a particle's position at any t is a closed-form ballistic formula,
  // not an integrated simulation — no lookup table needed, unlike springTo, since nothing
  // about it depends on any other node's live state. The 2D fields above (points/closed)
  // are unused here, same convention as mesh3d/limb/connector.
  particlesSpawnX?: number;
  particlesSpawnY?: number;
  particlesCount?: number;
  particlesAngle?: number; // degrees, screen convention: 0 = +x (right), 90 = +y (down)
  particlesSpread?: number; // degrees, total cone width around particlesAngle
  particlesSpeedMin?: number; // px/sec
  particlesSpeedMax?: number;
  particlesGravity?: number; // px/sec^2, positive pulls toward +y (down)
  particlesLifetime?: number; // seconds each particle stays visible
  particlesDuration?: number; // seconds emission is spread across; 0 = one burst
  particlesEmitAt?: number;
  particlesSizeMin?: number;
  particlesSizeMax?: number;
  particlesFade?: boolean;
  // sound only: one scheduled note or hit — `soundAt` is this node's own absolute scene-
  // timeline position (in Scene-local seconds; a Film shifts it by that entry's own cut
  // offset when collecting audio, the same offset its visual timeline already applies via
  // masterTl.add — see renderer.ts's mountFilm). `soundPitch` is a MIDI note number, or
  // `null` for an unpitched hit. The 2D fields above (points/closed) are unused here, same
  // convention as mesh3d/limb/connector/particles.
  soundPitch?: number | null;
  soundAt?: number;
  soundDuration?: number;
  soundInstrument?: string;
  soundVelocity?: number;
  soundPan?: number;
}

export interface GradientStop {
  offset: number; // 0..1
  color: string;
}

export type SceneBackground = string | { stops: GradientStop[]; direction?: "horizontal" | "vertical" };

// The scene's GEOMETRY treatment — how paths/fills/timing themselves are computed. One of
// two independent axes (the other is SceneTexture, below); every combination of the two is
// valid and renders correctly, not just the ones with their own name.
// - "ink" (default): hand-drawn rough.js sketchiness, line boil, a visible pen tip during
//   drawOn.
// - "flat": the same shapes and timing rendered crisp and precise instead — no jitter, no
//   boil, solid fills, no pen tip — a flat vector motion-graphics look off the same
//   pipeline.
// - "clay": moderate, subtler jitter than ink (hand-molded, not hand-sketched), solid
//   fills, and time itself quantized to a ~10fps hold — a stop-motion cadence, not a
//   continuous tween, applied at the seek level rather than per-shape.
// - "lit3d": a genuinely separate rendering pipeline (WebGL/Three.js, not SVG/rough.js) —
//   real directional + ambient lighting and cast shadows on mesh3d nodes specifically.
//   Only mesh3d nodes have a 3D representation; every 2D-only node (stroke, blob, limb,
//   text) in the same scene simply doesn't appear in a lit3d render. See renderer3d.ts.
//   SceneTexture doesn't apply here — a separate pipeline, not wired to the 2D filter
//   system.
// - "toon3d": lit3d's exact pipeline (same camera, lights, shadows, mesh3d-only scope) with
//   a stepped/cel gradient map on each mesh's material instead of a continuous PBR one —
//   flat toon bands instead of a smooth roughness falloff — plus a black inverted-hull
//   silhouette outline (a second back-face-only mesh scaled up ~4%, parented so it inherits
//   the same animated transform for free). A shading variant of lit3d, not a separate
//   pipeline; see renderer3d.ts.
export type RenderLook = "ink" | "flat" | "clay" | "lit3d" | "toon3d";

// The scene's TEXTURE — an optional whole-frame post-process layered over whichever
// RenderLook was chosen, freely combinable with any of "ink"/"flat"/"clay" (meaningless
// under "lit3d"/"toon3d", a separate pipeline this doesn't reach). Independent of geometry
// on purpose: a watercolor wash over ink's own sketchy jitter, or grain over flat's crisp
// precision, are both real, useful, and equally valid — earlier revisions coupled specific
// textures to specific "crisp" geometry, which worked until grain (aged paper) needed to
// pair with ink's hachure fills for an old-book/engraving register and crisp-only broke
// that combination outright.
// - "watercolor": a whole-frame SVG filter (turbulence displacement + a soft blur) bleeding
//   every edge, like wet pigment — a post-process over whatever geometry look is active,
//   not a different stroke style underneath.
// - "grain": a different whole-frame SVG filter — feTurbulence noise converted to a
//   pure-black layer whose alpha (not color) varies with noise brightness, blended over the
//   source via feBlend "overlay" (darkens shadows/lightens highlights slightly, the way
//   real grain modulates an image, not a flat semi-transparent layer on top). Fine
//   aged-paper/film-grain texture instead of wet-media bleed.
// - "pixel": every captured frame additionally downsampled and nearest-neighbor upscaled
//   back to size (a raster post-process applied in cli.ts after the browser screenshot, not
//   a DOM/SVG-level change) — a blocky, low-res game-art look. Requires ffmpeg on PATH,
//   same as --video already does. Scene-only, same limitation as before the two-axis split:
//   it lives in the CLI's capture step, operating on the final composited frame, so a Film
//   entry using it doesn't get pixelated (there's no way to selectively pixelate one
//   entry's screen region after everything's already composited into one canvas) and it's
//   invisible under --serve (which skips the capture step entirely). "watercolor"/"grain"
//   don't share this limitation — they're SVG filters scoped to each Film entry's own
//   wrapper element, so they DO apply correctly inside a Film.
export type SceneTexture = "watercolor" | "grain" | "pixel";

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
  texture?: SceneTexture;
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
