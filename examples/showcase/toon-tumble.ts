import { sketch } from "../../src/index.js";

// Showcase for "toon3d": a hero shape drops in with a cartoon squash-and-stretch landing,
// then two satellites orbit it on a hand-keyframed circular path (renderer3d.ts doesn't
// implement moveAlong — only moveTo/moveBy/scaleTo/squashTo/rotateTo/fadeTo/spin3d — so the
// orbit is eight moveTo waypoints around a circle, not a single moveAlong call). No
// scene.camera(): renderer3d.ts never reads a scene's camera ops at all, since lit3d/toon3d
// are a separate WebGL pipeline from the SVG one camera pan/zoom is built for — every beat
// of motion here comes from the objects' own transforms instead.

const scene = sketch.scene({
  width: 640,
  height: 420,
  background: "#1c2230",
  seed: "toon-tumble",
  look: "toon3d",
});

// --- Hero: drops in from above, squashes on landing, then spins in place. ---
const hero = sketch.icosahedron3d(70, {
  color: "#152a24",
  fill: { color: "#3f9b7a", style: "solid" },
});
scene.add(hero);
hero.moveTo(320, -80, { at: 0, duration: 0.001 });
hero.spin3d(0, 0, 0, { at: 0, duration: 0.001 });
hero.moveTo(320, 210, { at: 0.2, duration: 0.55, ease: "power2.in" });
// Squash on impact, then settle back to a round silhouette before the spin takes over.
hero.squashTo(1.4, 0.65, { at: 0.75, duration: 0.12, ease: "power1.out" });
hero.squashTo(1, 1, { at: 0.87, duration: 0.28, ease: "elastic.out(1, 0.5)" });
hero.spin3d(360, 180, 0, { at: 1.15, duration: 4.5, ease: "none" });

// --- Two satellites orbiting the hero on a hand-keyframed circle. ---
const ORBIT_CX = 320;
const ORBIT_CY = 210;
const ORBIT_R = 170;
const ORBIT_START = 1.3;
const ORBIT_LAP = 4.0;
const WAYPOINTS = 8;

function orbit(node: { moveTo: (x: number, y: number, opts: Record<string, unknown>) => unknown }, phase: number): void {
  for (let i = 0; i <= WAYPOINTS; i++) {
    const frac = i / WAYPOINTS;
    const angle = phase + frac * Math.PI * 2;
    const x = ORBIT_CX + Math.cos(angle) * ORBIT_R;
    const y = ORBIT_CY + Math.sin(angle) * ORBIT_R * 0.55; // flattened ellipse, reads as depth
    node.moveTo(x, y, { at: ORBIT_START + frac * ORBIT_LAP, duration: ORBIT_LAP / WAYPOINTS, ease: "none" });
  }
}

const boxA = sketch.box3d(46, 46, 46, { color: "#241a12", fill: { color: "#c97a3f", style: "solid" } });
scene.add(boxA);
boxA.fadeTo(0, { at: 0, duration: 0.001 });
boxA.spin3d(0, 0, 0, { at: 0, duration: 0.001 });
boxA.moveTo(ORBIT_CX + ORBIT_R, ORBIT_CY, { at: 0, duration: 0.001 });
boxA.fadeTo(1, { at: ORBIT_START - 0.2, duration: 0.3 });
boxA.spin3d(720, 0, 360, { at: ORBIT_START, duration: ORBIT_LAP, ease: "none" });
orbit(boxA, 0);

const boxB = sketch.box3d(34, 34, 34, { color: "#241a12", fill: { color: "#e8b978", style: "solid" } });
scene.add(boxB);
boxB.fadeTo(0, { at: 0, duration: 0.001 });
boxB.spin3d(0, 0, 0, { at: 0, duration: 0.001 });
boxB.moveTo(ORBIT_CX - ORBIT_R, ORBIT_CY, { at: 0, duration: 0.001 });
boxB.fadeTo(1, { at: ORBIT_START, duration: 0.3 });
boxB.spin3d(0, 720, 360, { at: ORBIT_START + 0.15, duration: ORBIT_LAP, ease: "none" });
orbit(boxB, Math.PI);

export default scene;
