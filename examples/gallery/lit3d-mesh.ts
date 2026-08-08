import { sketch } from "../../src/index.js";

// Gallery demo for the "lit3d" look: a real WebGL/Three.js pipeline (not SVG/rough.js)
// with directional + ambient lighting and cast shadows, driven by the same spin3d/moveTo
// vocabulary as every other node. A wooden box and a stone icosahedron sit side by side,
// each spinning continuously on its own axes, so the lighting/shadow read is obvious on
// both a hard-edged solid and a rounded one.

const scene = sketch.scene({
  width: 640,
  height: 420,
  background: "#1c2230",
  seed: "lit3d-mesh",
  look: "lit3d",
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
