import rough from "roughjs";
import gsap from "gsap";
import { EasePack, RoughEase } from "gsap/EasePack";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { CameraOp, RenderLook, Renderable, SerializedFilm, SerializedNode, SerializedScene } from "../core/types.js";
import { bboxOfPoints, pathFromPoints, unionBBox, type BBox } from "../core/geometry.js";
import { rotatePoint, project, faceNormal, normalize, subtract, dot, shadeHex, type Vec3 } from "../core/geometry3d.js";
import { solveTwoBoneIK } from "../core/ik.js";
import type { Point } from "../core/types.js";
import { roughOptionsFor, strokeWidthOf } from "./style.js";

gsap.registerPlugin(EasePack, MorphSVGPlugin, MotionPathPlugin);

const SVG_NS = "http://www.w3.org/2000/svg";
// A hand doesn't move at constant velocity — it's uneven, hesitates, quickens on straights.
// RoughEase adds bounded jitter to a tween's pace, which reads as a human tracing a line
// where a linear reveal reads as a plotter. RoughEase is non-monotonic — too much strength
// makes already-drawn ink flicker backward before continuing, which reads as a glitch — so
// this stays on the mild side of that line.
const HAND_DRAWN_EASE = RoughEase.config({
  strength: 0.45,
  points: 14,
  template: "power1.inOut",
  taper: "both",
  randomize: true,
});

// A hand doesn't draw an arbitrary shape in an arbitrary duration — longer paths take
// longer. When a scene doesn't specify drawOn's duration, derive it from the path length
// instead of a flat default, clamped so a tiny detail doesn't vanish in a blink and a huge
// outline doesn't drag.
const PEN_SPEED_PX_PER_S = 300;
const MIN_DRAW_DURATION = 0.45;
const MAX_DRAW_DURATION = 2.2;

// A line that stops moving the instant it's drawn reads as dead. Real sketched lines keep
// re-jittering after they land — the pen never traces the exact same wobble twice. Each
// stroke gets a few differently-seeded rough.js renderings stacked in the same spot, and
// visibility cycles between them a few times a second for as long as the shape is on screen.
const BOIL_VARIANTS = 3;
const BOIL_INTERVAL = 0.11;

let maskIdCounter = 0;

// The current scene's visual treatment, set once at the top of buildSceneInto — safe as a
// module-level variable because a scene builds fully synchronously within one
// buildSceneInto call (no interleaving with another scene's build, single vs. Film alike).
// Read wherever roughOptionsFor is called and to gate look-specific behaviors (boil, the
// drawOn pen tip) without threading a new parameter through every builder function.
let currentLook: RenderLook = "ink";

interface BoilTarget {
  variants: SVGGElement[];
}

export interface MountResult {
  svg: SVGSVGElement;
  timeline: gsap.core.Timeline;
  seekTo: (t: number) => void;
  totalDuration: () => number;
}

/** Dispatches on `renderable.kind` — the one entry point the browser harness calls. */
export function mountRenderable(renderable: Renderable, container: HTMLElement): MountResult {
  return renderable.kind === "film" ? mountFilm(renderable, container) : mount(renderable, container);
}

export function mount(scene: SerializedScene, container: HTMLElement): MountResult {
  const svg = document.createElementNS(SVG_NS, "svg");
  // The output frame — the whole world (scene.width/height) unless a smaller viewport
  // was set for the camera to pan/zoom within. buildSceneInto still sizes the background
  // and positions content against scene.width/height (the world); only the visible frame
  // changes here.
  svg.setAttribute("width", String(scene.viewportWidth));
  svg.setAttribute("height", String(scene.viewportHeight));
  svg.setAttribute("viewBox", `0 0 ${scene.viewportWidth} ${scene.viewportHeight}`);

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  container.innerHTML = "";
  container.appendChild(svg);

  const rc = rough.svg(svg);
  const tl = gsap.timeline({ paused: true });
  const boilTargets: BoilTarget[] = [];

  const postSeek = buildSceneInto(scene, svg, rc, tl, boilTargets);

  return {
    svg,
    timeline: tl,
    // Block body deliberately: tl.seek() returns the Timeline itself, and callers invoke
    // this through Playwright's page.evaluate() — an implicit return would hand the whole
    // GSAP timeline object graph back for CDP serialization, which never completes.
    seekTo: (t: number) => {
      tl.seek(t, false);
      applyBoilAt(boilTargets, t);
      // Runs strictly after the seek has fully resolved every other tween — see
      // postSeek's own comment for why camera.follow can't safely read a moving
      // target's live position from inside the same seek pass.
      postSeek(t);
    },
    totalDuration: () => tl.duration(),
  };
}

/**
 * A Film is several scenes cut together into one render — each scene keeps its own local
 * timeline (built exactly like a standalone `mount`), nested into one master timeline via
 * GSAP's timeline composition (`masterTl.add(childTl, offset)`) rather than by threading a
 * time offset through every animation call. Scenes render at whatever size they declare;
 * each gets scaled and centered into the film's own canvas (a static transform, not
 * animated) so mismatched scene sizes still cut together cleanly.
 */
export function mountFilm(film: SerializedFilm, container: HTMLElement): MountResult {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(film.width));
  svg.setAttribute("height", String(film.height));
  svg.setAttribute("viewBox", `0 0 ${film.width} ${film.height}`);

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  const filmBg = document.createElementNS(SVG_NS, "rect");
  filmBg.setAttribute("width", String(film.width));
  filmBg.setAttribute("height", String(film.height));
  filmBg.setAttribute("fill", film.background);
  svg.appendChild(filmBg);

  container.innerHTML = "";
  container.appendChild(svg);

  const rc = rough.svg(svg);
  const masterTl = gsap.timeline({ paused: true });
  const allBoilTargets: BoilTarget[] = [];
  const scenePostSeeks: Array<{ postSeek: (t: number) => void; enterAt: number }> = [];

  let cursor = 0;
  let prevWrapper: SVGGElement | null = null;

  film.entries.forEach((entry) => {
    const { scene, transition, transitionDuration, hold } = entry;
    const scale = Math.min(film.width / scene.width, film.height / scene.height);
    const offsetX = (film.width - scene.width * scale) / 2;
    const offsetY = (film.height - scene.height * scale) / 2;

    const wrapper = document.createElementNS(SVG_NS, "g");
    wrapper.setAttribute("transform", `translate(${offsetX}, ${offsetY}) scale(${scale})`);
    gsap.set(wrapper, { opacity: 0 });
    svg.appendChild(wrapper);

    // Deliberately NOT `{ paused: true }`: a child timeline created paused stays inert
    // even after being nested into masterTl via .add() below — its tweens never advance
    // when the (paused) master seeks, so every shape in every scene after the first stays
    // stuck at its initial state. The master alone being paused is what keeps this whole
    // film seek-driven rather than auto-playing.
    const sceneTl = gsap.timeline();
    const sceneBoilTargets: BoilTarget[] = [];
    const scenePostSeek = buildSceneInto(scene, wrapper, rc, sceneTl, sceneBoilTargets);
    allBoilTargets.push(...sceneBoilTargets);

    const contentDuration = sceneTl.duration();
    const isFade = transition === "fade";
    const fadeDur = isFade ? Math.min(transitionDuration, Math.max(0.05, contentDuration / 2)) : 0;

    // A fading scene starts slightly before the previous one's slot ends, so the two
    // overlap and genuinely crossfade rather than each animating opacity in isolation.
    const enterAt = Math.max(0, cursor - fadeDur);
    masterTl.add(sceneTl, enterAt);
    scenePostSeeks.push({ postSeek: scenePostSeek, enterAt });

    if (isFade) {
      masterTl.fromTo(wrapper, { opacity: 0 }, { opacity: 1, duration: fadeDur, ease: "sine.inOut" }, enterAt);
    } else {
      masterTl.set(wrapper, { opacity: 1 }, enterAt);
    }

    if (prevWrapper) {
      const hideAt = enterAt + fadeDur;
      masterTl.set(prevWrapper, { opacity: 0 }, hideAt);
    }

    cursor = enterAt + contentDuration + hold;
    prevWrapper = wrapper;
  });

  return {
    svg,
    timeline: masterTl,
    seekTo: (t: number) => {
      masterTl.seek(t, false);
      applyBoilAt(allBoilTargets, t);
      // Each scene's camera.follow reads happen after the FULL master seek resolves,
      // in the scene's own local time (its camera ops' `at` values are scene-relative,
      // not film-relative).
      for (const { postSeek, enterAt } of scenePostSeeks) postSeek(t - enterAt);
    },
    totalDuration: () => masterTl.duration(),
  };
}

// The world's backdrop sits at the farthest-back depth by convention — an "infinitely
// distant" plane that barely pans with the camera (see applyCameraLayers' parallax math),
// distinct from depth 1 (the default plane everything else without an explicit
// scene.layer() lives on).
const BACKDROP_DEPTH = 0;
const DEFAULT_LAYER_DEPTH = 1;

function buildSceneInto(
  scene: SerializedScene,
  container: SVGElement,
  rc: ReturnType<typeof rough.svg>,
  tl: gsap.core.Timeline,
  boilTargets: BoilTarget[]
): (t: number) => void {
  currentLook = scene.look ?? "ink";

  // Every depth in use gets its own group, appended in ascending depth order so farther
  // (smaller-depth) layers land behind nearer ones in the SVG paint order. A scene that
  // never calls scene.layer() ends up with exactly two groups (backdrop + the depth-1
  // default plane) — the same structure as before this existed, just named.
  const depths = new Set<number>([BACKDROP_DEPTH, DEFAULT_LAYER_DEPTH]);
  for (const node of scene.children) {
    depths.add(node.type === "group" && node.depth !== undefined ? node.depth : DEFAULT_LAYER_DEPTH);
  }
  const layerGroups = new Map<number, SVGGElement>();
  for (const depth of Array.from(depths).sort((a, b) => a - b)) {
    const g = document.createElementNS(SVG_NS, "g");
    container.appendChild(g);
    layerGroups.set(depth, g);
  }

  applyBackground(scene, layerGroups.get(BACKDROP_DEPTH)!);

  for (const node of scene.children) {
    const depth = node.type === "group" && node.depth !== undefined ? node.depth : DEFAULT_LAYER_DEPTH;
    buildNode(node, layerGroups.get(depth)!, rc, tl, scene.seed, boilTargets);
  }

  return applyCameraLayers(layerGroups, scene, tl, container);
}

/** A flat color renders exactly as before (a plain rect). A gradient spec renders as one
 * real SVG linearGradient — smooth, cheap, and clean, where a hand-authored sky previously
 * needed dozens of individually-sketched band rectangles to fake the same effect (and still
 * showed visible banding). A backdrop is painted, not pen-traced, so this deliberately
 * bypasses rough.js. */
function applyBackground(scene: SerializedScene, layer: SVGGElement): void {
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("width", String(scene.width));
  bg.setAttribute("height", String(scene.height));

  if (typeof scene.background === "string") {
    bg.setAttribute("fill", scene.background);
  } else {
    const defs = layer.ownerSVGElement?.querySelector("defs");
    const gradId = `sk-bg-grad-${maskIdCounter++}`;
    const grad = document.createElementNS(SVG_NS, "linearGradient");
    grad.setAttribute("id", gradId);
    grad.setAttribute("gradientUnits", "userSpaceOnUse");
    if (scene.background.direction === "horizontal") {
      grad.setAttribute("x1", "0");
      grad.setAttribute("y1", "0");
      grad.setAttribute("x2", String(scene.width));
      grad.setAttribute("y2", "0");
    } else {
      grad.setAttribute("x1", "0");
      grad.setAttribute("y1", "0");
      grad.setAttribute("x2", "0");
      grad.setAttribute("y2", String(scene.height));
    }
    for (const stop of scene.background.stops) {
      const s = document.createElementNS(SVG_NS, "stop");
      s.setAttribute("offset", `${stop.offset * 100}%`);
      s.setAttribute("stop-color", stop.color);
      grad.appendChild(s);
    }
    defs?.appendChild(grad);
    bg.setAttribute("fill", `url(#${gradId})`);
  }

  layer.appendChild(bg);
}

function findSerializedNodeById(nodes: SerializedNode[], id: string): SerializedNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findSerializedNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Drives every depth layer's transform from ONE shared {cx, cy, zoom} state — scene-space
 * point (cx, cy) is what's centered in the viewport, at `zoom`x, for the depth-1 default
 * plane. Every other layer gets the same pan scaled by its own depth around the world's
 * center (worldCx + (cx - worldCx) * depth): depth 1 reproduces the plain single-layer
 * formula exactly (backward compatible), depth < 1 moves less than the camera (recedes —
 * distant), depth > 1 moves more (pops forward — near). Zoom applies uniformly to every
 * layer; only pan gets the parallax treatment.
 *
 * `panTo`/`zoomTo` tween camState directly inside the timeline (`onUpdate: apply` on each
 * tick is safe — they only depend on elapsed time, nothing they need to read from another
 * tween). `follow` is different: it needs the target's *live* x/y, and reading that via
 * `gsap.getProperty()` from *inside* the same `tl.seek()` pass that's also mid-flight
 * resolving the target's own chain of position tweens is unreliable — confirmed via a
 * minimal repro (a box with 2+ sequential moveTo/moveBy calls plus a follow) where the
 * read came back stale or wildly wrong, compounding worse the more prior tweens the target
 * had. A single one-shot tween on the target didn't show it; any target with a genuine
 * multi-step path (a walk cycle, any real character rig) reliably did. The returned
 * `postSeek(t)` callback is the fix: it's called by the caller (mount/mountFilm's seekTo)
 * strictly *after* `tl.seek()` has fully returned, so every other tween — including
 * whatever chain the followed node has — has already settled for this tick before the
 * read happens.
 */
function applyCameraLayers(
  layerGroups: Map<number, SVGGElement>,
  scene: SerializedScene,
  tl: gsap.core.Timeline,
  container: SVGElement
): (t: number) => void {
  const camOps = scene.camera;
  if (!camOps || camOps.length === 0) return () => {};

  const worldCx = scene.width / 2;
  const worldCy = scene.height / 2;
  const camState = { cx: worldCx, cy: worldCy, zoom: 1 };
  const apply = () => {
    const { cx, cy, zoom } = camState;
    for (const [depth, g] of layerGroups) {
      const layerCx = worldCx + (cx - worldCx) * depth;
      const layerCy = worldCy + (cy - worldCy) * depth;
      // Centers world-space (layerCx, layerCy) in the VIEWPORT (the output frame), not
      // the world — those differ whenever scene.camera() is actually doing something.
      const tx = scene.viewportWidth / 2 - layerCx * zoom;
      const ty = scene.viewportHeight / 2 - layerCy * zoom;
      g.setAttribute("transform", `translate(${tx} ${ty}) scale(${zoom})`);
    }
  };
  apply();

  interface FollowWindow {
    start: number;
    end: number;
    targetG: SVGGElement | null;
    anchorX: number;
    anchorY: number;
  }
  const followWindows: FollowWindow[] = [];

  for (const op of camOps) {
    const at = op.at ?? 0;
    const duration = op.duration ?? 1;

    if (op.kind === "panTo") {
      tl.to(camState, { cx: op.x, cy: op.y, duration, ease: op.ease ?? "sine.inOut", onUpdate: apply }, at);
    } else if (op.kind === "zoomTo") {
      tl.to(camState, { zoom: op.scale, duration, ease: op.ease ?? "sine.inOut", onUpdate: apply }, at);
    } else {
      const targetNode = findSerializedNodeById(scene.children, op.nodeId);
      const bbox = targetNode ? computeNodeBBox(targetNode) : null;
      const anchorX = bbox ? (bbox.minX + bbox.maxX) / 2 : camState.cx;
      const anchorY = bbox ? (bbox.minY + bbox.maxY) / 2 : camState.cy;
      // data-id is unique scene-wide, so searching the whole container (not just one
      // layer's group) finds the target regardless of which depth plane it lives on.
      const targetG = container.querySelector(`[data-id="${op.nodeId}"]`) as SVGGElement | null;
      followWindows.push({ start: at, end: at + duration, targetG, anchorX, anchorY });
    }
  }

  return (t: number) => {
    const active = followWindows.find((w) => t >= w.start && t <= w.end);
    if (!active) return;
    const gx = active.targetG ? (gsap.getProperty(active.targetG, "x") as number) : 0;
    const gy = active.targetG ? (gsap.getProperty(active.targetG, "y") as number) : 0;
    camState.cx = active.anchorX + (gx || 0);
    camState.cy = active.anchorY + (gy || 0);
    apply();
  };
}

function applyBoilAt(boilTargets: BoilTarget[], t: number): void {
  const active = Math.max(0, Math.floor(t / BOIL_INTERVAL));
  for (const { variants } of boilTargets) {
    const n = variants.length;
    const idx = active % n;
    for (let i = 0; i < n; i++) {
      variants[i].style.opacity = i === idx ? "1" : "0";
    }
  }
}

function buildNode(
  node: SerializedNode,
  parent: SVGElement,
  rc: ReturnType<typeof rough.svg>,
  tl: gsap.core.Timeline,
  sceneSeed: number,
  boilTargets: BoilTarget[]
): void {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-id", node.id);
  applyInitialTransform(g, node);
  parent.appendChild(g);

  if (node.type === "mesh3d") {
    buildMesh3D(node, g, rc, tl, sceneSeed);
    // Still runs moveTo/moveBy/rotateTo/scaleTo/fadeTo/squashTo — those animate `g`'s own
    // flat transform exactly like any other node; only spin3d (handled above, inside
    // buildMesh3D) is mesh-specific. applyAnimations' switch no-ops on "spin3d" so it's
    // safe to iterate the same animations array a second time here.
    applyAnimations(g, node, tl, null, 0, false, null, rc, sceneSeed);
    return; // mesh3d has no 2D points/children of its own kind — nothing else below applies
  }

  if (node.type === "limb") {
    buildLimb(node, g, rc, tl, sceneSeed);
    // Same reasoning as mesh3d above: moveTo/moveBy/rotateTo/scaleTo/fadeTo/squashTo still
    // animate `g`'s own flat transform (placing/orienting the whole chain); only ikTo
    // (handled inside buildLimb) is limb-specific, and applyAnimations no-ops on it.
    applyAnimations(g, node, tl, null, 0, false, null, rc, sceneSeed);
    return;
  }

  let cleanPathD: string | null = null;
  let strokeWidthPx = 3;
  let closed = false;
  let points: Point[] | null = null;

  if (node.type === "stroke" && node.points) {
    const smooth = node.style?.smooth ?? true;
    const d = pathFromPoints(node.points, !!node.closed, smooth);
    const baseSeed = sceneSeed ^ node.seed;

    // A node that will later morphTo() gets a single static rendering instead of the usual
    // boil variants — cycling to an un-morphed variant mid-boil would make the morphed
    // shape visibly snap back to its original geometry every ~0.1s. A non-"ink" look has
    // no jitter to re-roll in the first place (roughness/bowing are already 0), so it gets
    // a single static rendering too — extra boil variants of an identical path are wasted
    // DOM, not a visual difference.
    const hasMorph = node.animations.some((a) => a.kind === "morphTo");
    const variantCount = hasMorph || currentLook !== "ink" ? 1 : BOIL_VARIANTS;

    // Wrapped in its own group so drawOn can mask the whole rendered shape (stroke pass(es)
    // AND fill/hachure alike) as one unit, rather than needing to classify rough.js's
    // sub-elements by stroke vs. fill — which breaks for hachure/cross-hatch fills, since
    // rough.js renders those as *stroked* line segments too.
    const artGroup = document.createElementNS(SVG_NS, "g");
    const variants: SVGGElement[] = [];
    for (let i = 0; i < variantCount; i++) {
      const opts = roughOptionsFor(node.style ?? {}, baseSeed + i * 7919, !!node.closed, currentLook);
      const rendered = rc.path(d, opts);
      const variantWrap = document.createElementNS(SVG_NS, "g");
      variantWrap.appendChild(rendered);
      variantWrap.style.opacity = i === 0 ? "1" : "0";
      artGroup.appendChild(variantWrap);
      variants.push(variantWrap);
    }
    g.appendChild(artGroup);
    if (!hasMorph) boilTargets.push({ variants });

    cleanPathD = d;
    strokeWidthPx = strokeWidthOf(node.style?.weight);
    closed = !!node.closed;
    points = node.points;
  }

  if (node.children) {
    for (const child of node.children) {
      buildNode(child, g, rc, tl, sceneSeed, boilTargets);
    }
  }

  applyAnimations(g, node, tl, cleanPathD, strokeWidthPx, closed, points, rc, sceneSeed);
}

/**
 * Builds a mesh3d node's live re-sketching: unlike every other node (authored once, then
 * only its flat 2D transform animates), a rotating solid's on-screen SILHOUETTE changes
 * every frame — the projected 2D outline of each face, and which faces are even visible,
 * both depend on the current rotation. So this can't precompute paths once at build time
 * the way applyDrawOn's `cleanPathD` does; it registers an `onUpdate` on the mesh's own
 * spin3d tween (or renders the static pose once, if the mesh never spins) that clears and
 * redraws every face's rough.js path on each tick, in painter's-algorithm order (back to
 * front by average projected depth) so nearer faces correctly occlude farther ones.
 *
 * Faces whose outward normal points away from the camera (dot(normal, viewDir) >= 0, since
 * the camera looks down +z per project()'s convention) are skipped entirely — backface
 * culling, needed both for correctness (a solid's far faces shouldn't render as if
 * transparent) and so painter's-algorithm sorting never has to reconcile a front and back
 * face at roughly the same depth.
 */
function buildMesh3D(
  node: SerializedNode,
  g: SVGGElement,
  rc: ReturnType<typeof rough.svg>,
  tl: gsap.core.Timeline,
  sceneSeed: number
): void {
  const vertices = node.mesh3dVertices ?? [];
  const faces = node.mesh3dFaces ?? [];
  const focalLength = node.mesh3dFocalLength ?? 480;
  const lightDirRaw = node.mesh3dLightDir ?? [-0.5, -0.7, -0.4];
  const lightDir = normalize({ x: lightDirRaw[0], y: lightDirRaw[1], z: lightDirRaw[2] });
  const baseSeed = sceneSeed ^ node.seed;
  const baseColor = node.style?.fill?.color ?? node.style?.color ?? "#8a8a8a";
  const strokeColor = node.style?.color ?? "#181511";
  const strokeWidthPx = strokeWidthOf(node.style?.weight);

  const meshGroup = document.createElementNS(SVG_NS, "g");
  g.appendChild(meshGroup);

  const rotState = { rx: 0, ry: 0, rz: 0 };

  const redraw = () => {
    while (meshGroup.firstChild) meshGroup.removeChild(meshGroup.firstChild);

    const rxr = (rotState.rx * Math.PI) / 180;
    const ryr = (rotState.ry * Math.PI) / 180;
    const rzr = (rotState.rz * Math.PI) / 180;

    const rotated: Vec3[] = vertices.map(([x, y, z]) => rotatePoint(x, y, z, rxr, ryr, rzr));

    interface Renderable3 {
      d: string;
      color: string;
      avgZ: number;
    }
    const renderables: Renderable3[] = [];

    for (let fi = 0; fi < faces.length; fi++) {
      const face = faces[fi];
      const faceVerts = face.indices.map((i) => rotated[i]);
      if (faceVerts.length < 3) continue;

      const normal = faceNormal(faceVerts);
      // Camera looks down +z (see project()) from the -z side, so the view direction from
      // any point on the face toward the camera is roughly -z; a face whose normal has a
      // non-negative z component faces away and is skipped (backface cull).
      if (normal.z >= 0) continue;

      const projected = faceVerts.map((v) => project(v, focalLength));
      const points2d: Point[] = projected.map((p) => [p.x, p.y]);
      const d = pathFromPoints(points2d, true, false);

      const avgZ = faceVerts.reduce((s, v) => s + v.z, 0) / faceVerts.length;

      // Flat shading: how directly the face's normal opposes the light direction. A face
      // normal pointing straight at the light (dot = -1) is brightest; away (dot = 1) is
      // darkest. Clamped to a visible range so no face goes fully black/white.
      const lightAmount = -dot(normal, lightDir); // -1..1
      const shadeAmount = Math.max(-0.55, Math.min(0.45, lightAmount * 0.5));
      const color = face.color ? shadeHex(face.color, shadeAmount) : shadeHex(baseColor, shadeAmount);

      renderables.push({ d, color, avgZ });
    }

    // Painter's algorithm: farther faces (larger avgZ, since the camera sits on -z) paint
    // first, nearer faces paint over them.
    renderables.sort((a, b) => b.avgZ - a.avgZ);

    for (let i = 0; i < renderables.length; i++) {
      const r = renderables[i];
      const opts = roughOptionsFor(
        { color: strokeColor, weight: node.style?.weight, looseness: node.style?.looseness, energy: node.style?.energy },
        baseSeed + i * 7919,
        true,
        currentLook
      );
      opts.fill = r.color;
      opts.fillStyle = "solid";
      const rendered = rc.path(r.d, opts);
      meshGroup.appendChild(rendered);
    }
  };

  redraw();

  // Every spin3d call gets its own tween on the SAME shared rotState — chaining several
  // (spin to A, then from wherever that lands, spin on to B) works the same way chained
  // moveBy/rotateTo calls do on any other node.
  for (const op of node.animations) {
    if (op.kind !== "spin3d") continue;
    const at = op.at ?? 0;
    const duration = op.duration ?? 1;
    tl.to(rotState, { rx: op.rx, ry: op.ry, rz: op.rz, duration, ease: op.ease ?? "sine.inOut", onUpdate: redraw }, at);
  }
}

/**
 * Builds a limb node's live re-solving: the joint (knee/elbow) position depends on the
 * current IK target, which can be animated, so — same reasoning as buildMesh3D above —
 * this can't precompute a path once at build time. It tweens a plain {x, y} state object
 * (the target, in the limb's own local space) and re-solves + redraws on every tick that
 * target is moving. Deliberately does NOT read the limb's own live transform (`g`'s x/y)
 * to compute anything: reading a moving node's own GSAP-driven transform from inside the
 * same tl.seek() pass that's still resolving it is exactly the trap documented above
 * applyCameraLayers's `follow` handling — a limb's IK target is authored in the same
 * local space as rootX/rootY from the start (callers needing a "planted foot" effect
 * while the body translates compute the local-space countershift themselves, at authoring
 * time, the same way every other point in this library is authored relative to a group's
 * own untransformed origin).
 */
function buildLimb(
  node: SerializedNode,
  g: SVGGElement,
  rc: ReturnType<typeof rough.svg>,
  tl: gsap.core.Timeline,
  sceneSeed: number
): void {
  const rootX = node.limbRootX ?? 0;
  const rootY = node.limbRootY ?? 0;
  const len1 = node.limbLen1 ?? 40;
  const len2 = node.limbLen2 ?? 40;
  const bend = node.limbBend ?? 1;
  const capRadius = node.limbCapRadius ?? 0;
  const capColor = node.limbCapColor ?? node.style?.fill?.color ?? node.style?.color ?? "#181511";
  const baseSeed = sceneSeed ^ node.seed;
  // A joint should read as an actual bend, not a spline blend erasing it — smooth defaults
  // false here regardless of the general stroke default (true), unless a scene explicitly
  // wants a softer limb silhouette.
  const smooth = node.style?.smooth ?? false;

  const limbGroup = document.createElementNS(SVG_NS, "g");
  g.appendChild(limbGroup);

  const ikState = { x: node.limbTargetX ?? rootX, y: node.limbTargetY ?? rootY + len1 + len2 };

  const redraw = () => {
    while (limbGroup.firstChild) limbGroup.removeChild(limbGroup.firstChild);

    const { jointX, jointY, endX, endY } = solveTwoBoneIK(rootX, rootY, ikState.x, ikState.y, len1, len2, bend);

    const d = pathFromPoints(
      [
        [rootX, rootY],
        [jointX, jointY],
        [endX, endY],
      ],
      false,
      smooth
    );
    const opts = roughOptionsFor(node.style ?? {}, baseSeed, false, currentLook);
    limbGroup.appendChild(rc.path(d, opts));

    if (capRadius > 0) {
      const capOpts = roughOptionsFor(
        { color: capColor, weight: node.style?.weight, looseness: node.style?.looseness, energy: node.style?.energy },
        baseSeed + 7919,
        true,
        currentLook
      );
      capOpts.fill = capColor;
      capOpts.fillStyle = "solid";
      limbGroup.appendChild(rc.circle(endX, endY, capRadius * 2, capOpts));
    }
  };

  redraw();

  // Every ikTo call gets its own tween on the SAME shared ikState — chaining several
  // composes the same way chained moveBy/rotateTo calls do on any other node.
  for (const op of node.animations) {
    if (op.kind !== "ikTo") continue;
    const at = op.at ?? 0;
    const duration = op.duration ?? 0.5;
    tl.to(ikState, { x: op.x, y: op.y, duration, ease: op.ease ?? "power2.inOut", onUpdate: redraw }, at);
  }
}

function applyInitialTransform(g: SVGGElement, node: SerializedNode): void {
  const t = node.transform;
  const props: Record<string, string | number> = {
    x: t.x,
    y: t.y,
    scale: t.scale,
    rotation: t.rotation,
    opacity: t.opacity,
  };
  // svgOrigin (not transformOrigin) takes a point in the SVG's own coordinate system rather
  // than a percentage of the element's bbox — what a pivot away from the shape's own center
  // needs (e.g. a limb rotating from a shoulder point outside its own bounds).
  if (t.pivot) props.svgOrigin = `${t.pivot[0]} ${t.pivot[1]}`;
  else props.transformOrigin = "50% 50%";
  gsap.set(g, props);
}

/**
 * A node's own authored points/children are already in absolute canvas coordinates (every
 * example draws a shape directly where it should appear) — `transform.x/y` is a translate
 * layered on top of that. So "absolute position" for moveTo means: find where this node's
 * own geometry is centered, and set the transform so that center lands on (x, y) — not a
 * bare assignment of transform.x/y, which just offsets from wherever the shape was drawn
 * and reads exactly like moveBy the first time it's called (confirmed via a cold-agent
 * scene that visibly moved a shape relative to itself while expecting an absolute landing
 * spot).
 */
function computeNodeBBox(node: SerializedNode): BBox | null {
  const boxes: BBox[] = [];
  if (node.points && node.points.length) boxes.push(bboxOfPoints(node.points));
  if (node.children) {
    for (const child of node.children) {
      const b = computeNodeBBox(child);
      if (b) boxes.push(b);
    }
  }
  return boxes.length ? unionBBox(boxes) : null;
}

function applyAnimations(
  g: SVGGElement,
  node: SerializedNode,
  tl: gsap.core.Timeline,
  cleanPathD: string | null,
  strokeWidthPx: number,
  closed: boolean,
  points: Point[] | null,
  rc: ReturnType<typeof rough.svg>,
  sceneSeed: number
): void {
  for (const op of node.animations) {
    const at = op.at ?? 0;

    switch (op.kind) {
      case "drawOn":
        // Duration is intentionally NOT defaulted here — applyDrawOn derives it from the
        // path's actual length when omitted, rather than every shape sharing one flat pace.
        applyDrawOn(g, tl, at, op.duration, op.ease ?? HAND_DRAWN_EASE, cleanPathD, strokeWidthPx, closed, points);
        break;
      case "appear": {
        const duration = op.duration ?? 0.6;
        const ease = op.ease ?? "power2.out";
        gsap.set(g, { opacity: 0 });
        tl.to(g, { opacity: 1, duration, ease }, at);
        break;
      }
      case "moveTo": {
        const bbox = computeNodeBBox(node);
        const refX = bbox ? (bbox.minX + bbox.maxX) / 2 : 0;
        const refY = bbox ? (bbox.minY + bbox.maxY) / 2 : 0;
        tl.to(g, { x: op.x - refX, y: op.y - refY, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      }
      case "moveBy":
        tl.to(g, { x: `+=${op.dx}`, y: `+=${op.dy}`, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "scaleTo":
        tl.to(g, { scale: op.scale, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "rotateTo":
        tl.to(g, { rotation: op.degrees, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "fadeTo":
        tl.to(g, { opacity: op.opacity, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "morphTo":
        applyMorphTo(g, tl, at, op.duration ?? 0.8, op.ease ?? "power2.inOut", op.points, node, rc, sceneSeed);
        break;
      case "squashTo":
        tl.to(
          g,
          { scaleX: op.scaleX, scaleY: op.scaleY, duration: op.duration ?? 0.3, ease: op.ease ?? "power2.out" },
          at
        );
        break;
      case "moveAlong": {
        // op.points are authored in absolute canvas coordinates like every other point
        // in this library — MotionPathPlugin animates the same x/y transform moveTo
        // does, which is an *offset* from the node's own authored position, not an
        // absolute one. Re-anchor each point the same way moveTo re-anchors its target.
        const bbox = computeNodeBBox(node);
        const refX = bbox ? (bbox.minX + bbox.maxX) / 2 : 0;
        const refY = bbox ? (bbox.minY + bbox.maxY) / 2 : 0;
        const path = op.points.map(([x, y]) => ({ x: x - refX, y: y - refY }));
        tl.to(
          g,
          {
            motionPath: { path, autoRotate: !!op.rotate, curviness: 1.25 },
            duration: op.duration ?? 1.2,
            ease: op.ease ?? "power1.inOut",
          },
          at
        );
        break;
      }
    }
  }
}

/**
 * Morphs the currently-visible rendering into a fresh rough.js rendering of `targetPoints`,
 * path by path (stroke pass(es) first, then fill, matched by index — safe since both
 * renderings use the same style/seed, so rough.js produces the same *number* of paths for
 * either geometry). The target is rendered once into a hidden holder purely so MorphSVGPlugin
 * has real path elements to read `d` from; it's never itself shown.
 */
function applyMorphTo(
  g: SVGGElement,
  tl: gsap.core.Timeline,
  at: number,
  duration: number,
  ease: string,
  targetPoints: Point[],
  node: SerializedNode,
  rc: ReturnType<typeof rough.svg>,
  sceneSeed: number
): void {
  const artGroup = g.querySelector(":scope > g") as SVGGElement | null;
  const variantWrap = artGroup?.querySelector(":scope > g") as SVGGElement | null;
  if (!artGroup || !variantWrap) return;

  const smooth = node.style?.smooth ?? true;
  const closed = !!node.closed;
  const targetD = pathFromPoints(targetPoints, closed, smooth);
  const baseSeed = sceneSeed ^ node.seed;
  const opts = roughOptionsFor(node.style ?? {}, baseSeed, closed, currentLook);
  const targetRendered = rc.path(targetD, opts);

  const hiddenHolder = document.createElementNS(SVG_NS, "g");
  hiddenHolder.setAttribute("display", "none");
  hiddenHolder.appendChild(targetRendered);
  g.appendChild(hiddenHolder);

  const sourcePaths = Array.from(variantWrap.querySelectorAll("path")) as SVGPathElement[];
  const targetPaths = Array.from(hiddenHolder.querySelectorAll("path")) as SVGPathElement[];
  const count = Math.min(sourcePaths.length, targetPaths.length);

  for (let i = 0; i < count; i++) {
    tl.to(sourcePaths[i], { morphSVG: targetPaths[i], duration, ease }, at);
  }
}

/**
 * Builds a boustrophedon ("mowing the lawn") zigzag spanning a bbox — one continuous path
 * so it can be dash-revealed as a single sweep, like a hand coloring in an area row by row
 * rather than a flat wash appearing all at once.
 */
function buildScribbleD(bbox: { minX: number; minY: number; maxX: number; maxY: number }, rows: number): string {
  const rowHeight = (bbox.maxY - bbox.minY) / rows;
  let d = "";
  for (let i = 0; i <= rows; i++) {
    const y = bbox.minY + i * rowHeight;
    const leftToRight = i % 2 === 0;
    const x1 = leftToRight ? bbox.minX : bbox.maxX;
    const x2 = leftToRight ? bbox.maxX : bbox.minX;
    d += i === 0 ? `M ${x1} ${y} L ${x2} ${y} ` : `L ${x1} ${y} L ${x2} ${y} `;
  }
  return d.trim();
}

/**
 * Reveals the rendered shape through a mask driven by the *clean* geometric path (the one
 * `pathFromPoints` produced), not rough.js's own output path. rough.js's sketchy rendering
 * authors its `d` as multiple short overlapping passes for visual texture, not as one
 * sequential sweep — dash-revealing that path directly doesn't trace in visual order at all
 * (verified: a rectangle showed fully closed at 18% into its draw). The mask has two parts:
 * a stroked copy of the clean path (the pen trace, dash-revealed) and, for closed shapes, a
 * clipped zigzag scribble that dash-reveals the interior row by row once the trace mostly
 * catches up (like a hand coloring it in, rather than the fill fading in as a flat block) —
 * together they reveal the actual rendered artwork, hachure fills included, in the order a
 * hand would actually draw it.
 */
function applyDrawOn(
  g: SVGGElement,
  tl: gsap.core.Timeline,
  at: number,
  requestedDuration: number | undefined,
  ease: string | ((progress: number) => number),
  cleanPathD: string | null,
  strokeWidthPx: number,
  closed: boolean,
  points: Point[] | null
): void {
  const artGroup = g.querySelector(":scope > g") as SVGGElement | null;
  if (!cleanPathD || !artGroup) return;

  const svg = g.ownerSVGElement;
  const defs = svg?.querySelector("defs");
  if (!svg || !defs) return;

  const maskId = `sk-reveal-${maskIdCounter++}`;
  const mask = document.createElementNS(SVG_NS, "mask");
  mask.setAttribute("id", maskId);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  // Generous enough to cover a wide one-continuous-scene world (a camera pans across a
  // canvas much bigger than one screen's worth), not just a single ~640px diorama.
  mask.setAttribute("x", "-6000");
  mask.setAttribute("y", "-6000");
  mask.setAttribute("width", "15000");
  mask.setAttribute("height", "15000");

  const traceStrokeWidth = strokeWidthPx * 3 + 10;
  const trace = document.createElementNS(SVG_NS, "path");
  trace.setAttribute("d", cleanPathD);
  trace.setAttribute("fill", "none");
  trace.setAttribute("stroke", "#fff");
  trace.setAttribute("stroke-width", String(traceStrokeWidth));
  trace.setAttribute("stroke-linecap", "round");
  trace.setAttribute("stroke-linejoin", "round");
  mask.appendChild(trace);

  let scribble: SVGPathElement | null = null;
  let scribbleLen = 0;
  if (closed && points && points.length >= 3) {
    // Clipped to the shape's own silhouette so the zigzag (authored over the bbox, which is
    // bigger than the shape for anything non-rectangular) doesn't reveal square corners.
    const clipId = `sk-clip-${maskIdCounter}`;
    const clipPath = document.createElementNS(SVG_NS, "clipPath");
    clipPath.setAttribute("id", clipId);
    clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
    const clipShape = document.createElementNS(SVG_NS, "path");
    clipShape.setAttribute("d", cleanPathD);
    clipPath.appendChild(clipShape);
    defs.appendChild(clipPath);

    const bbox = bboxOfPoints(points);
    const rowSpacing = Math.max(6, strokeWidthPx * 1.5);
    const rows = Math.max(3, Math.min(16, Math.round((bbox.maxY - bbox.minY) / rowSpacing)));

    const scribbleWrap = document.createElementNS(SVG_NS, "g");
    scribbleWrap.setAttribute("clip-path", `url(#${clipId})`);
    scribble = document.createElementNS(SVG_NS, "path");
    scribble.setAttribute("d", buildScribbleD(bbox, rows));
    scribble.setAttribute("fill", "none");
    scribble.setAttribute("stroke", "#fff");
    scribble.setAttribute("stroke-width", String(rowSpacing * 1.7));
    scribble.setAttribute("stroke-linecap", "round");
    scribble.setAttribute("stroke-linejoin", "round");
    scribbleWrap.appendChild(scribble);
    mask.appendChild(scribbleWrap);

    scribbleLen = scribble.getTotalLength();
    // Same rounding-margin reasoning as the trace pad below.
    const scribblePad = rowSpacing * 1.7 / 2 + 2;
    scribble.style.strokeDasharray = `${scribbleLen + scribblePad}`;
    scribble.style.strokeDashoffset = `${scribbleLen + scribblePad}`;
  }

  defs.appendChild(mask);
  artGroup.setAttribute("mask", `url(#${maskId})`);

  const len = trace.getTotalLength();
  const duration =
    requestedDuration ?? Math.min(MAX_DRAW_DURATION, Math.max(MIN_DRAW_DURATION, len / PEN_SPEED_PX_PER_S));
  // getTotalLength() is a JS-measured arc length that can disagree by a few px from the
  // browser's own paint-time length for a sketchy, many-segment rough.js curve — with
  // dasharray/dashoffset sized to exactly `len`, that mismatch let a sliver of the round
  // line-cap render even while "fully hidden" (verified: a text scene showed a stray
  // fragment of a not-yet-drawn letter minutes before its drawOn). Padding both by half
  // the trace's own stroke width absorbs the discrepancy; the reveal still ends at
  // dashoffset 0, so the drawn-on look is unaffected.
  const tracePad = traceStrokeWidth / 2 + 2;
  trace.style.strokeDasharray = `${len + tracePad}`;
  trace.style.strokeDashoffset = `${len + tracePad}`;

  const tipColor = artGroup.querySelector("path[stroke]")?.getAttribute("stroke") || "#111";
  // Sized to clearly poke past the line's own width — at parity with the stroke it just
  // reads as a rounded line-cap, not a distinct pen tip.
  const tip = makePenTip(g, tipColor, strokeWidthPx * 0.9 + 2);

  tl.to(
    trace,
    {
      strokeDashoffset: 0,
      duration,
      ease,
      onUpdate: () => {
        const drawn = len - parseFloat(trace.style.strokeDashoffset || `${len}`);
        const pt = trace.getPointAtLength(Math.max(0, Math.min(len, drawn)));
        tip.setAttribute("cx", String(pt.x));
        tip.setAttribute("cy", String(pt.y));
      },
    },
    at
  );

  // A visible pen tip is an "ink" affordance — a flat/precise look traces the same mask
  // reveal with no hand implied, so the tip stays at its default (hidden) opacity, set
  // inside makePenTip, rather than being created differently per look.
  if (currentLook === "ink") {
    const fade = Math.min(0.08, duration * 0.2);
    tl.fromTo(tip, { opacity: 0 }, { opacity: 1, duration: fade }, at);
    tl.to(tip, { opacity: 0, duration: fade }, at + duration - fade);
  }

  if (scribble) {
    // Interior colors in row by row, trailing the trace like a hand catching up to its own
    // outline, instead of the old flat opacity fade — which read as a block appearing, not
    // as something being filled in.
    const fillAt = at + duration * 0.55;
    const fillDuration = duration * 0.7;
    const scribbleEl = scribble;
    tl.to(scribbleEl, { strokeDashoffset: 0, duration: fillDuration, ease: "sine.inOut" }, fillAt);
  }
}

function makePenTip(g: SVGGElement, color: string, radius: number): SVGCircleElement {
  const tip = document.createElementNS(SVG_NS, "circle");
  tip.setAttribute("r", String(radius));
  tip.setAttribute("fill", color);
  gsap.set(tip, { opacity: 0 });
  g.appendChild(tip);
  return tip;
}
