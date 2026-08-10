import type { BoilTarget } from "./internal.js";

// A line that stops moving the instant it's drawn reads as dead. Real sketched lines keep
// re-jittering after they land — the pen never traces the exact same wobble twice. Each
// stroke gets a few differently-seeded rough.js renderings stacked in the same spot, and
// visibility cycles between them a few times a second for as long as the shape is on screen.
export const BOIL_VARIANTS = 3;
export const BOIL_INTERVAL = 0.11;

export function applyBoilAt(boilTargets: BoilTarget[], t: number): void {
  const active = Math.max(0, Math.floor(t / BOIL_INTERVAL));
  for (const { variants } of boilTargets) {
    const n = variants.length;
    const idx = active % n;
    for (let i = 0; i < n; i++) {
      variants[i].style.opacity = i === idx ? "1" : "0";
    }
  }
}
