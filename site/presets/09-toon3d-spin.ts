// Toon 3D — real lit geometry
import { sketch } from "sketchling";

// "toon3d" (and "lit3d") swap the SVG/rough.js pipeline for a real WebGL one — directional
// light, cast shadows, a 4-step gradient map instead of a smooth falloff — driven by the
// same moveTo/spin3d calls as every other node.
const scene = sketch.scene({ width: 560, height: 380, background: "#1c2230", seed: "toon3d-spin", look: "toon3d" });

const box = sketch.box3d(120, 120, 120, { color: "#241a12", fill: { color: "#c97a3f", style: "solid" } });
scene.add(box);
box.moveTo(190, 190, { at: 0, duration: 0 });
box.spin3d(0, 0, 0, { at: 0, duration: 0 });
box.spin3d(360, 360, 0, { at: 0, duration: 4, ease: "none" });

const orb = sketch.icosahedron3d(75, { color: "#152a24", fill: { color: "#3f9b7a", style: "solid" } });
scene.add(orb);
orb.moveTo(390, 190, { at: 0, duration: 0 });
orb.spin3d(0, 0, 0, { at: 0, duration: 0 });
orb.spin3d(0, 360, 360, { at: 0, duration: 4, ease: "none" });

export default scene;
