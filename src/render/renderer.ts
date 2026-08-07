import rough from "roughjs";
import gsap from "gsap";
import type { SerializedNode, SerializedScene } from "../core/types.js";
import { pathFromPoints } from "../core/geometry.js";
import { roughOptionsFor } from "./style.js";

const SVG_NS = "http://www.w3.org/2000/svg";

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

  if (node.type === "stroke" && node.points) {
    const smooth = node.style?.smooth ?? true;
    const d = pathFromPoints(node.points, !!node.closed, smooth);
    const opts = roughOptionsFor(node.style ?? {}, sceneSeed ^ node.seed, !!node.closed);
    const rendered = rc.path(d, opts);
    g.appendChild(rendered);
  }

  if (node.children) {
    for (const child of node.children) {
      buildNode(child, g, rc, tl, sceneSeed);
    }
  }

  applyAnimations(g, node, tl);
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

function applyAnimations(g: SVGGElement, node: SerializedNode, tl: gsap.core.Timeline): void {
  for (const op of node.animations) {
    const at = op.at ?? 0;
    const duration = op.duration ?? 0.6;
    const ease = op.ease ?? "power2.out";

    switch (op.kind) {
      case "drawOn":
        applyDrawOn(g, tl, at, duration, ease);
        break;
      case "appear":
        gsap.set(g, { opacity: 0 });
        tl.to(g, { opacity: 1, duration, ease }, at);
        break;
      case "moveTo":
        tl.to(g, { x: op.x, y: op.y, duration, ease }, at);
        break;
      case "moveBy":
        tl.to(g, { x: `+=${op.dx}`, y: `+=${op.dy}`, duration, ease }, at);
        break;
      case "scaleTo":
        tl.to(g, { scale: op.scale, duration, ease }, at);
        break;
      case "rotateTo":
        tl.to(g, { rotation: op.degrees, duration, ease }, at);
        break;
      case "fadeTo":
        tl.to(g, { opacity: op.opacity, duration, ease }, at);
        break;
    }
  }
}

function applyDrawOn(g: SVGGElement, tl: gsap.core.Timeline, at: number, duration: number, ease: string): void {
  const paths = Array.from(g.querySelectorAll("path"));
  for (const p of paths) {
    const stroke = p.getAttribute("stroke");
    const hasStroke = stroke && stroke !== "none";
    if (hasStroke) {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
      tl.to(p, { strokeDashoffset: 0, duration, ease }, at);
    } else {
      gsap.set(p, { opacity: 0 });
      tl.to(p, { opacity: 1, duration, ease }, at);
    }
  }
}
