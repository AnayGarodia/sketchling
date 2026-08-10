import type { GradientStop, SceneBackground } from "./types.js";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Blends toward white (t > 0) or black (t < 0) — a plain RGB lerp toward white/black reads
// as literally "paler"/"darker" rather than "lit"/"shadowed", so the shadow direction also
// nudges hue toward blue-violet (cooler, the way a real cast shadow reads under most light)
// and the highlight direction nudges very slightly warm — the same "further back = cooler,
// closer/lit = warmer" instinct already used by hand in nightfall-hill.ts and
// quiet-crossing.ts's gradients, made automatic instead of eyeballed per shape.
function tint(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (t >= 0) {
    const warmR = r + (255 - r) * t;
    const warmG = g + (255 - g) * t * 0.94;
    const warmB = b + (255 - b) * t * 0.88;
    return rgbToHex(warmR, warmG, warmB);
  }
  const k = -t;
  const coolR = r * (1 - k) + 18 * k;
  const coolG = g * (1 - k) + 14 * k;
  const coolB = b * (1 - k) + 38 * k;
  return rgbToHex(coolR, coolG, coolB);
}

export interface ShadeOptions {
  // Which edge the light comes from — the LIGHT stop sits at that edge, the SHADOW stop at
  // the opposite one. Default "top", the most common single-light-source read (the sky).
  from?: "top" | "bottom" | "left" | "right";
  // 0..1, how strong the light/shadow spread is — 0.35 default is a real but not cartoonish
  // falloff; push toward 1 for a more graphic/dramatic light, down toward 0.15 for a subtle
  // volumetric hint on a small shape.
  amount?: number;
}

/**
 * Turns a single base color into a real light-direction gradient — the {stops, direction}
 * shape `fill.color`/`scene.background` already take, computed instead of hand-picked. Every
 * gradient-shaded example so far (gradient-shading.ts, nightfall-hill.ts, quiet-crossing.ts,
 * quiet-ride.ts) hand-authored 2-3 hex stops per shape by eye — workable once, but it means
 * getting real shading on a new shape requires picking plausible lighter/darker hex values
 * from scratch each time, with no guarantee of consistency across shapes lit from the same
 * direction. `shade(base, {from, amount})` derives a 3-stop highlight → base → shadow
 * gradient from one color and one direction instead, so every shape lit "from top" in a
 * scene shares the same light logic.
 *
 * Deliberately not a full BRDF or gradient-map system — one direction, one base color, three
 * stops. Real per-shape control (an unusual light color, a rim light) still wants a
 * hand-authored `{stops, direction}` literal; this is for the common case of "this shape
 * needs to look lit," not a replacement for the primitive.
 */
export function shade(base: string, opts: ShadeOptions = {}): SceneBackground {
  const { from = "top", amount = 0.35 } = opts;
  const lit = tint(base, amount);
  const shadow = tint(base, -amount * 0.85);
  const direction: "horizontal" | "vertical" = from === "left" || from === "right" ? "horizontal" : "vertical";
  const litFirst = from === "top" || from === "left";
  const stops: GradientStop[] = litFirst
    ? [{ offset: 0, color: lit }, { offset: 0.55, color: base }, { offset: 1, color: shadow }]
    : [{ offset: 0, color: shadow }, { offset: 0.45, color: base }, { offset: 1, color: lit }];
  return { stops, direction };
}
