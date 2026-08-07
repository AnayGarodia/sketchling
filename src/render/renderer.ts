import rough from "roughjs";
import gsap from "gsap";
import { EasePack, RoughEase } from "gsap/EasePack";
import type { SerializedNode, SerializedScene } from "../core/types.js";
import { pathFromPoints } from "../core/geometry.js";
import { roughOptionsFor, strokeWidthOf } from "./style.js";

gsap.registerPlugin(EasePack);

const SVG_NS = "http://www.w3.org/2000/svg";
// A hand doesn't move at constant velocity — it's uneven, hesitates, quickens on straights.
// RoughEase adds bounded jitter to a tween's pace, which reads as a human tracing a line
// where a linear reveal reads as a plotter. Kept deliberately mild (low strength, few points):
// RoughEase is non-monotonic, and too much strength makes already-drawn ink flicker backward
// before continuing, which reads as a glitch rather than a hesitation.
const HAND_DRAWN_EASE = RoughEase.config({
  strength: 0.3,
  points: 12,
  template: "power1.inOut",
  taper: "both",
  randomize: true,
});

let maskIdCounter = 0;

export interface MountResult {
  svg: SVGSVGElement;
  timeline: gsap.core.Timeline;
  seekTo: (t: number) => void;
  totalDuration: () => number;
}

export function mount(scene: SerializedScene, container: HTMLElement): MountResult {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(scene.width));
  svg.setAttribute("height", String(scene.height));
  svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);

  const defs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(defs);

  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("width", String(scene.width));
  bg.setAttribute("height", String(scene.height));
  bg.setAttribute("fill", scene.background);
  svg.appendChild(bg);

  container.innerHTML = "";
  container.appendChild(svg);

  const rc = rough.svg(svg);
  const tl = gsap.timeline({ paused: true });

  for (const node of scene.children) {
    buildNode(node, svg, rc, tl, scene.seed);
  }

  return {
    svg,
    timeline: tl,
    // Block body deliberately: tl.seek() returns the Timeline itself, and callers invoke
    // this through Playwright's page.evaluate() — an implicit return would hand the whole
    // GSAP timeline object graph back for CDP serialization, which never completes.
    seekTo: (t: number) => {
      tl.seek(t, false);
    },
    totalDuration: () => tl.duration(),
  };
}

function buildNode(
  node: SerializedNode,
  parent: SVGElement,
  rc: ReturnType<typeof rough.svg>,
  tl: gsap.core.Timeline,
  sceneSeed: number
): void {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-id", node.id);
  applyInitialTransform(g, node);
  parent.appendChild(g);

  let cleanPathD: string | null = null;
  let strokeWidthPx = 3;
  let closed = false;

  if (node.type === "stroke" && node.points) {
    const smooth = node.style?.smooth ?? true;
    const d = pathFromPoints(node.points, !!node.closed, smooth);
    const opts = roughOptionsFor(node.style ?? {}, sceneSeed ^ node.seed, !!node.closed);
    const rendered = rc.path(d, opts);

    // Wrapped in its own group so drawOn can mask the whole rendered shape (stroke pass(es)
    // AND fill/hachure alike) as one unit, rather than needing to classify rough.js's
    // sub-elements by stroke vs. fill — which breaks for hachure/cross-hatch fills, since
    // rough.js renders those as *stroked* line segments too.
    const artGroup = document.createElementNS(SVG_NS, "g");
    artGroup.appendChild(rendered);
    g.appendChild(artGroup);

    cleanPathD = d;
    strokeWidthPx = strokeWidthOf(node.style?.weight);
    closed = !!node.closed;
  }

  if (node.children) {
    for (const child of node.children) {
      buildNode(child, g, rc, tl, sceneSeed);
    }
  }

  applyAnimations(g, node, tl, cleanPathD, strokeWidthPx, closed);
}

function applyInitialTransform(g: SVGGElement, node: SerializedNode): void {
  const t = node.transform;
  gsap.set(g, {
    x: t.x,
    y: t.y,
    scale: t.scale,
    rotation: t.rotation,
    opacity: t.opacity,
    transformOrigin: "50% 50%",
  });
}

function applyAnimations(
  g: SVGGElement,
  node: SerializedNode,
  tl: gsap.core.Timeline,
  cleanPathD: string | null,
  strokeWidthPx: number,
  closed: boolean
): void {
  for (const op of node.animations) {
    const at = op.at ?? 0;
    const duration = op.duration ?? 0.6;

    switch (op.kind) {
      case "drawOn":
        // Default to an organic, unevenly-paced draw (see HAND_DRAWN_EASE) rather than
        // linear or eased — both read as mechanical. Callers can still override via op.ease.
        applyDrawOn(g, tl, at, duration, op.ease ?? HAND_DRAWN_EASE, cleanPathD, strokeWidthPx, closed);
        break;
      case "appear": {
        const ease = op.ease ?? "power2.out";
        gsap.set(g, { opacity: 0 });
        tl.to(g, { opacity: 1, duration, ease }, at);
        break;
      }
      case "moveTo":
        tl.to(g, { x: op.x, y: op.y, duration, ease: op.ease ?? "power2.out" }, at);
        break;
      case "moveBy":
        tl.to(g, { x: `+=${op.dx}`, y: `+=${op.dy}`, duration, ease: op.ease ?? "power2.out" }, at);
        break;
      case "scaleTo":
        tl.to(g, { scale: op.scale, duration, ease: op.ease ?? "power2.out" }, at);
        break;
      case "rotateTo":
        tl.to(g, { rotation: op.degrees, duration, ease: op.ease ?? "power2.out" }, at);
        break;
      case "fadeTo":
        tl.to(g, { opacity: op.opacity, duration, ease: op.ease ?? "power2.out" }, at);
        break;
    }
  }
}

/**
 * Reveals the rendered shape through a mask driven by the *clean* geometric path (the one
 * `pathFromPoints` produced), not rough.js's own output path. rough.js's sketchy rendering
 * authors its `d` as multiple short overlapping passes for visual texture, not as one
 * sequential sweep — dash-revealing that path directly doesn't trace in visual order at all
 * (verified: a rectangle showed fully closed at 18% into its draw). The mask has two parts:
 * a stroked copy of the clean path (the pen trace, dash-revealed) and, for closed shapes, a
 * filled copy (the interior flood, opacity-revealed once the trace mostly catches up) —
 * together they reveal the actual rendered artwork, hachure fills included, in the order a
 * hand would actually draw it.
 */
function applyDrawOn(
  g: SVGGElement,
  tl: gsap.core.Timeline,
  at: number,
  duration: number,
  ease: string | ((progress: number) => number),
  cleanPathD: string | null,
  strokeWidthPx: number,
  closed: boolean
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

  let flood: SVGPathElement | null = null;
  if (closed) {
    flood = document.createElementNS(SVG_NS, "path");
    flood.setAttribute("d", cleanPathD);
    flood.setAttribute("fill", "#fff");
    flood.setAttribute("stroke", "none");
    gsap.set(flood, { opacity: 0 });
    mask.appendChild(flood);
  }

  defs.appendChild(mask);
  artGroup.setAttribute("mask", `url(#${maskId})`);

  const len = trace.getTotalLength();
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

  if (flood) {
    // Interior trails the trace like ink catching up to a pen, instead of appearing
    // concurrently with it — which would look like two unrelated motions layered together.
    const fillAt = at + duration * 0.55;
    const fillDuration = duration * 0.7;
    tl.to(flood, { opacity: 1, duration: fillDuration, ease: "sine.inOut" }, fillAt);
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
