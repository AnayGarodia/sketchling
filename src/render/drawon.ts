import gsap from "gsap";
import { EasePack, RoughEase } from "gsap/EasePack";
import type { RenderLook } from "../core/types.js";
import { bboxOfPoints } from "../core/geometry.js";
import { SVG_NS, nextUid, type DrawTarget } from "./internal.js";

gsap.registerPlugin(EasePack);

// A hand doesn't move at constant velocity — it's uneven, hesitates, quickens on straights.
// RoughEase adds bounded jitter to a tween's pace, which reads as a human tracing a line
// where a linear reveal reads as a plotter. RoughEase is non-monotonic — too much strength
// makes already-drawn ink flicker backward before continuing, which reads as a glitch — so
// this stays on the mild side of that line.
export const HAND_DRAWN_EASE = RoughEase.config({
  strength: 0.45,
  points: 14,
  template: "power1.inOut",
  taper: "both",
  // Keep timing deterministic across render processes. Visual line variation is already
  // seeded per node by rough.js; a Math.random()-backed ease breaks an agent's ability to
  // reproduce or compare a frame from the same scene source.
  randomize: false,
});

// A hand doesn't draw an arbitrary shape in an arbitrary duration — longer paths take
// longer. When a scene doesn't specify drawOn's duration, derive it from the path length
// instead of a flat default, clamped so a tiny detail doesn't vanish in a blink and a huge
// outline doesn't drag.
const PEN_SPEED_PX_PER_S = 300;
const MIN_DRAW_DURATION = 0.45;
const MAX_DRAW_DURATION = 2.2;

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
export function applyDrawOn(
  g: SVGGElement,
  tl: gsap.core.Timeline,
  at: number,
  requestedDuration: number | undefined,
  ease: string | ((progress: number) => number),
  draw: DrawTarget | null,
  look: RenderLook
): void {
  const artGroup = g.querySelector(":scope > g") as SVGGElement | null;
  if (!draw || !artGroup) return;
  const { cleanPathD, strokeWidthPx, closed, points } = draw;

  const svg = g.ownerSVGElement;
  const defs = svg?.querySelector("defs");
  if (!svg || !defs) return;

  const maskId = nextUid("sk-reveal");
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
  if (closed && points && points.length >= 3) {
    // Clipped to the shape's own silhouette so the zigzag (authored over the bbox, which is
    // bigger than the shape for anything non-rectangular) doesn't reveal square corners.
    const clipId = nextUid("sk-clip");
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

    const scribbleLen = scribble.getTotalLength();
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
  if (look === "ink") {
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
