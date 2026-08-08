import scene from "./tumble.js";

// The exact same authored scene as tumble.ts — same die, same tumble, same timing —
// rendered through the WebGL/Three.js pipeline instead of SVG/rough.js. Only the mesh3d
// die has a 3D representation, so the desk, shadow blob, and title card (all 2D nodes)
// simply don't appear here; what's left is real directional lighting, real cast shadows,
// and true perspective on the same spin3d/moveBy choreography. Proof that a look isn't a
// cosmetic filter — it's a different renderer entirely, off the same authored file.
scene.look = "lit3d";

export default scene;
