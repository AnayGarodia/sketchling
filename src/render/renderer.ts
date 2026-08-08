import rough from "roughjs";
import gsap from "gsap";
import { EasePack, RoughEase } from "gsap/EasePack";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import type { Renderable, SerializedFilm, SerializedNode, SerializedScene } from "../core/types.js";
import { bboxOfPoints, pathFromPoints, unionBBox, type BBox } from "../core/geometry.js";
import type { Point } from "../core/types.js";
import { roughOptionsFor, strokeWidthOf } from "./style.js";

gsap.registerPlugin(EasePack, MorphSVGPlugin);

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
  svg.setAttribute("width", String(scene.width));
  svg.setAttribute("height", String(scene.height));
  svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  container.innerHTML = "";
  container.appendChild(svg);

  const rc = rough.svg(svg);
  const tl = gsap.timeline({ paused: true });
  const boilTargets: BoilTarget[] = [];

  buildSceneInto(scene, svg, rc, tl, boilTargets);

  return {
    svg,
    timeline: tl,
    // Block body deliberately: tl.seek() returns the Timeline itself, and callers invoke
    // this through Playwright's page.evaluate() — an implicit return would hand the whole
    // GSAP timeline object graph back for CDP serialization, which never completes.
    seekTo: (t: number) => {
      tl.seek(t, false);
      applyBoilAt(boilTargets, t);
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
    buildSceneInto(scene, wrapper, rc, sceneTl, sceneBoilTargets);
    allBoilTargets.push(...sceneBoilTargets);

    const contentDuration = sceneTl.duration();
    const isFade = transition === "fade";
    const fadeDur = isFade ? Math.min(transitionDuration, Math.max(0.05, contentDuration / 2)) : 0;

    // A fading scene starts slightly before the previous one's slot ends, so the two
    // overlap and genuinely crossfade rather than each animating opacity in isolation.
    const enterAt = Math.max(0, cursor - fadeDur);
    masterTl.add(sceneTl, enterAt);

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
    },
    totalDuration: () => masterTl.duration(),
  };
}

function buildSceneInto(
  scene: SerializedScene,
  container: SVGElement,
  rc: ReturnType<typeof rough.svg>,
  tl: gsap.core.Timeline,
  boilTargets: BoilTarget[]
): void {
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("width", String(scene.width));
  bg.setAttribute("height", String(scene.height));
  bg.setAttribute("fill", scene.background);
  container.appendChild(bg);

  for (const node of scene.children) {
    buildNode(node, container, rc, tl, scene.seed, boilTargets);
  }
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
    // shape visibly snap back to its original geometry every ~0.1s.
    const hasMorph = node.animations.some((a) => a.kind === "morphTo");
    const variantCount = hasMorph ? 1 : BOIL_VARIANTS;

    // Wrapped in its own group so drawOn can mask the whole rendered shape (stroke pass(es)
    // AND fill/hachure alike) as one unit, rather than needing to classify rough.js's
    // sub-elements by stroke vs. fill — which breaks for hachure/cross-hatch fills, since
    // rough.js renders those as *stroked* line segments too.
    const artGroup = document.createElementNS(SVG_NS, "g");
    const variants: SVGGElement[] = [];
    for (let i = 0; i < variantCount; i++) {
      const opts = roughOptionsFor(node.style ?? {}, baseSeed + i * 7919, !!node.closed);
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
  const opts = roughOptionsFor(node.style ?? {}, baseSeed, closed);
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
  mask.setAttribute("x", "-2000");
  mask.setAttribute("y", "-2000");
  mask.setAttribute("width", "5000");
  mask.setAttribute("height", "5000");

  const trace = document.createElementNS(SVG_NS, "path");
  trace.setAttribute("d", cleanPathD);
  trace.setAttribute("fill", "none");
  trace.setAttribute("stroke", "#fff");
  trace.setAttribute("stroke-width", String(strokeWidthPx * 3 + 10));
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
    scribble.style.strokeDasharray = `${scribbleLen}`;
    scribble.style.strokeDashoffset = `${scribbleLen}`;
  }

  defs.appendChild(mask);
  artGroup.setAttribute("mask", `url(#${maskId})`);

  const len = trace.getTotalLength();
  const duration =
    requestedDuration ?? Math.min(MAX_DRAW_DURATION, Math.max(MIN_DRAW_DURATION, len / PEN_SPEED_PX_PER_S));
  trace.style.strokeDasharray = `${len}`;
  trace.style.strokeDashoffset = `${len}`;

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

  const fade = Math.min(0.08, duration * 0.2);
  tl.fromTo(tip, { opacity: 0 }, { opacity: 1, duration: fade }, at);
  tl.to(tip, { opacity: 0, duration: fade }, at + duration - fade);

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
