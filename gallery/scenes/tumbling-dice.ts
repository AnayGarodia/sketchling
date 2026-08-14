import { sketch } from "../../src/index.js";
import { LOOP_LEN, LOOP_START } from "../lib.js";

// Three real lit solids tumbling in place — a cel-shaded die between two spinning orbs.

// look: "toon3d" is a genuinely separate pipeline (WebGL, not SVG/rough.js): real directional
// light, cast shadows, a stepped/cel gradient map and an inverted-hull outline. It renders
// mesh3d nodes and NOTHING else, so this scene is deliberately all solids — a stroke or a blob
// added here would validate fine and then silently not appear.
const scene = sketch.scene({
  width: 480,
  height: 480,
  background: "#e9dfc8",
  seed: "tumbling-dice",
  look: "toon3d",
});

const INK = "#241d14";

// --- The die. Every face takes its own colour, so which face is toward camera stays legible
// through the tumble instead of reading as one shaded lump turning over.
const die = sketch.box3d(122, 122, 122, {
  color: INK,
  weight: "bold",
  fill: { color: "#e8794a", style: "solid" },
});
scene.add(die);
die.moveTo(238, 226, { at: 0, duration: 0.001 });
die.scaleTo(1, { at: 0, duration: 0.001 });

// --- Two orbs flanking it, one warm one cool, each turning on a different axis at a different
// rate. An icosahedron is the roundest solid available from flat faces, so it reads as a ball
// while still showing the facet shading that makes the lighting visible.
const left = sketch.icosahedron3d(48, { color: INK, weight: "confident", fill: { color: "#4f8a86", style: "solid" } });
scene.add(left);
left.moveTo(100, 296, { at: 0, duration: 0.001 });

const right = sketch.icosahedron3d(36, { color: INK, weight: "confident", fill: { color: "#e0b451", style: "solid" } });
scene.add(right);
right.moveTo(388, 278, { at: 0, duration: 0.001 });

// --- The loop. spin3d takes an ABSOLUTE target in degrees (matching rotateTo's convention),
// and whole multiples of 360 land back on the orientation the solid started in — so the last
// frame of the window is the first frame's pose exactly, with no wrap to hide.
die.spin3d(360, 720, 0, { at: LOOP_START, duration: LOOP_LEN, ease: "none" });
left.spin3d(-360, 360, 0, { at: LOOP_START, duration: LOOP_LEN, ease: "none" });
right.spin3d(720, 0, 360, { at: LOOP_START, duration: LOOP_LEN, ease: "none" });

export default scene;
