import { sketch } from "../../src/index.js";

// Gallery demo for scene.label() + node.endAt — the fix for the single most convergent
// complaint across five independent stress tests of this library: past a handful of beats,
// a scene becomes a wall of hand-computed `at` literals that silently go stale the moment
// anything upstream is retimed. One real example (examples/story/wound-sun/04-the-snap.ts,
// built cold by an agent testing this library before this feature existed) wound a crank,
// captured the wind's own end time in a bare variable (`const SNAP = windCrank(...)`), then
// referenced `SNAP + 0.05`, `SNAP + 0.62`, `SNAP + 0.78`... across a dozen ops for the
// gear-tooth snap and the keeper's reaction — working, but unnamed and easy to miscount.
// Same shape here, with scene.label() naming the moment instead of a bare variable, and
// node.endAt chaining the wind-up itself without hand-summing its own steps.

const scene = sketch.scene({ width: 480, height: 320, background: "#eef1f6", seed: "scheduling-demo" });

const INK = "#22262e";
const cx = 240,
  cy: number = 180;

// The crank: three quarter-turns, each chained off the last via endAt — no running total
// kept by hand, no "0.5 * i" arithmetic to get the third turn's start time right.
const crank = sketch.stroke([[cx, cy], [cx + 46, cy]], { color: INK, weight: "bold" });
scene.add(crank).pivotAt(cx, cy).appear({ at: 0, duration: 0.2 });
crank.rotateBy(120, { at: 0.2, duration: 0.5, ease: "power1.inOut" });
crank.rotateBy(120, { at: crank.endAt, duration: 0.5, ease: "power1.inOut" });
crank.rotateBy(120, { at: crank.endAt, duration: 0.5, ease: "power1.inOut" });

// Name the moment the wind finishes — every downstream beat (the snap, the burst, the
// keeper's reaction) reads as "snap", "snap+0.1", "snap+0.4", not a re-derived literal.
const snapAt = crank.endAt;
scene.label("snap", snapAt);

const gearGlow = sketch.ellipse(cx, cy, 20, 20, { color: INK, weight: "confident", fill: { color: "#c9cfda", style: "solid" } });
scene.add(gearGlow).initial({ opacity: 0 });
gearGlow.fadeTo(1, { at: 0, duration: 0.3 });
gearGlow.fadeTo(0.4, { at: "snap", duration: 0.06 }); // the flash of release
gearGlow.fadeTo(1, { at: "snap+0.1", duration: 0.3 });

// Particles don't go through the animate-call pipeline labels resolve against (their own
// `at` is baked in at construction, not deferred like a node's .animations) — the plain
// number is still available locally even after the label's been declared from it.
scene.add(
  sketch.particles(cx, cy, { color: "#8a94a6" }, { count: 18, angle: -90, spread: 340, speedMin: 60, speedMax: 140, gravity: 200, lifetime: 0.6, at: snapAt })
);

const keeper = sketch.loop([[cx + 70, cy - 30], [cx + 90, cy - 30], [cx + 90, cy + 10], [cx + 70, cy + 10]], {
  color: INK,
  weight: "confident",
  fill: { color: "#5c6577", style: "solid" },
});
scene.add(keeper).pivotAt(cx + 80, cy - 30);
keeper.rotateTo(-8, { at: "snap", duration: 0.15, ease: "power2.out" }); // startled
keeper.rotateTo(0, { at: "snap+0.15", duration: 0.5, ease: "sine.inOut" }); // settles

export default scene;
