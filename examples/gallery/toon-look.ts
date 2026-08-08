import { sketch } from "../../src/index.js";

// Gallery demo for the "toon3d" look: the same lit3d WebGL pipeline (same camera, same
// lights, same cast shadows), but each mesh's material swaps a continuous PBR response for
// a 4-step gradient map — flat cel bands instead of a smooth roughness falloff. Identical
// scene to lit3d-mesh.ts (same geometry, same spin) so the two are a direct side-by-side:
// this file's only real difference from that one is the `look` value.

const scene = sketch.scene({
  width: 640,
  height: 420,
  background: "#1c2230",
  seed: "toon-look",
  look: "toon3d",
});

const box = sketch.box3d(120, 120, 120, {
  color: "#241a12",
  fill: { color: "#c97a3f", style: "solid" },
});
scene.add(box);
box.moveTo(220, 210, { at: 0, duration: 0.001 });
box.spin3d(0, 0, 0, { at: 0, duration: 0.001 });
box.spin3d(360, 360, 0, { at: 0, duration: 4, ease: "none" });

const orb = sketch.icosahedron3d(75, {
  color: "#152a24",
  fill: { color: "#3f9b7a", style: "solid" },
});
scene.add(orb);
orb.moveTo(430, 210, { at: 0, duration: 0.001 });
orb.spin3d(0, 0, 0, { at: 0, duration: 0.001 });
orb.spin3d(0, 360, 360, { at: 0, duration: 4, ease: "none" });

export default scene;
