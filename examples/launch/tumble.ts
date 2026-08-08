import { sketch } from "../../src/index.js";

// A hero demo for the new 3D engine: a wooden die tumbles across a desk and lands,
// combining a genuine rotating solid (box3d + spin3d) with the existing 2D vocabulary —
// squash-and-stretch on landing, hand-sketched desk/shadow. Proves 2D and 3D compose in
// one scene, not just that a cube can spin in isolation.

const WOOD = "#b5652f";
const WOOD_FILL = { color: "#c97a3f", style: "solid" as const };
const INK = "#241a12";
const DESK = "#e8d4b0";

const scene = sketch.scene({
  width: 900,
  height: 460,
  background: { stops: [
    { offset: 0, color: "#f3e6c8" },
    { offset: 1, color: "#e2c896" },
  ], direction: "vertical" },
  seed: "tumble",
});

// Desk surface.
const deskTop = sketch.loop(
  [[-40, 300], [940, 300], [940, 500], [-40, 500]],
  { color: "#a9895e", weight: "light", smooth: false, fill: { color: DESK, style: "solid" } }
);
scene.add(deskTop).appear({ at: 0, duration: 0.01 });
const deskEdge = sketch.stroke([[-40, 300], [200, 297], [500, 302], [940, 299]], { color: "#a9895e", weight: "light" });
scene.add(deskEdge).drawOn({ at: 0.1, duration: 1.0 });

// Wood-grain texture lines on the desk, purely decorative sketch detail.
for (const [gy, amp] of [[340, 6], [380, 8], [420, 5], [460, 7]] as const) {
  const grain = sketch.stroke(
    [[-20, gy], [220, gy + amp], [480, gy - amp * 0.6], [700, gy + amp * 0.8], [920, gy]],
    { color: "#c4a679", weight: "light" }
  );
  scene.add(grain).drawOn({ at: 0.2, duration: 1.0 });
}

// Ground contact shadow for the die — squashes wide on landing, same trick as the
// character pieces, just applied to a 3D object's flat 2D shadow companion.
const shadow = sketch.blob(150, 330, 45, { color: "transparent", weight: "light", fill: { color: "#00000030", style: "solid" } }, 10);
scene.add(shadow);
shadow.moveTo(150, 330, { at: 0, duration: 0.001 });

// The die itself. Distinct per-face colors (set below) make the six sides read as
// different faces even without pips — a pip-per-face overlay would need per-face 2D
// projection bookkeeping the mesh API doesn't expose yet; face-color variety is the
// honest 3D-native way to give it that read instead.
const die = sketch.box3d(85, 85, 85, { color: INK, weight: "confident", looseness: 0.22, fill: WOOD_FILL });
die.faces[0].color = "#c97a3f"; // far
die.faces[1].color = "#d68a4d"; // near
die.faces[2].color = "#b5652f"; // left
die.faces[3].color = "#cf7f42"; // right
die.faces[4].color = "#dc9257"; // top
die.faces[5].color = "#a8592a"; // bottom
scene.add(die);
die.moveTo(150, 100, { at: 0, duration: 0.001 });
die.scaleTo(0.001, { at: 0, duration: 0.001 });

// --- Entrance: die pops in with a small 2D scale-up, then starts tumbling. ---
die.scaleTo(1, { at: 0.3, duration: 0.4, ease: "back.out(2.5)" });
shadow.scaleTo(0.001, { at: 0, duration: 0.001 });
shadow.scaleTo(1, { at: 0.3, duration: 0.4, ease: "back.out(2.5)" });

// --- Tumble across the desk: a series of moveBy hops paired with continuous spin3d,
// each hop's squash/stretch on its own flat 2D transform (works on a mesh3d node exactly
// like any other — moveTo/scaleTo animate the node's screen placement, spin3d animates
// its actual 3D orientation, independently). ---
const HOPS = [
  { dx: 150, dy: -60, rx: 280, ry: 140, rz: 40 },
  { dx: 150, dy: -50, rx: 240, ry: 200, rz: -60 },
  { dx: 150, dy: -70, rx: 320, ry: 160, rz: 80 },
  { dx: 130, dy: -40, rx: 200, ry: 260, rz: -30 },
];
let t = 0.75;
let cumX = 0;
for (const hop of HOPS) {
  const upDur = 0.28;
  const downDur = 0.24;
  die.moveBy(hop.dx, hop.dy, { at: t, duration: upDur, ease: "power2.out" });
  die.moveBy(0, -hop.dy, { at: t + upDur, duration: downDur, ease: "power2.in" });
  shadow.moveBy(hop.dx, 0, { at: t, duration: upDur + downDur, ease: "sine.inOut" });
  shadow.scaleTo(0.6, { at: t, duration: upDur, ease: "power2.out" });
  shadow.scaleTo(1, { at: t + upDur, duration: downDur, ease: "power2.in" });
  die.spin3d(hop.rx, hop.ry, hop.rz, { at: t, duration: upDur + downDur, ease: "sine.inOut" });

  const landAt = t + upDur + downDur;
  die.squashTo(1.18, 0.82, { at: landAt, duration: 0.08, ease: "power1.out" });
  die.squashTo(1, 1, { at: landAt + 0.08, duration: 0.16, ease: "back.out(2.5)" });
  shadow.squashTo(1.15, 0.85, { at: landAt, duration: 0.08, ease: "power1.out" });
  shadow.squashTo(1, 1, { at: landAt + 0.08, duration: 0.16, ease: "back.out(2.5)" });

  cumX += hop.dx;
  t = landAt + 0.12;
}
const LAND_X = 150 + cumX;
const SETTLE_AT = t;

// --- Final settle spin: lands on whole-360 multiples on every axis so the die comes to
// rest square to the camera (a face flat-on) rather than balanced on an edge or corner. ---
die.spin3d(1080, 720, 0, { at: SETTLE_AT, duration: 0.5, ease: "power2.out" });
die.squashTo(1.1, 0.9, { at: SETTLE_AT + 0.5, duration: 0.1, ease: "power1.out" });
die.squashTo(1, 1, { at: SETTLE_AT + 0.6, duration: 0.25, ease: "back.out(3)" });
shadow.squashTo(1.1, 0.9, { at: SETTLE_AT + 0.5, duration: 0.1, ease: "power1.out" });
shadow.squashTo(1, 1, { at: SETTLE_AT + 0.6, duration: 0.25, ease: "back.out(3)" });

// A little idle wobble once settled, so the ending isn't a dead freeze.
const IDLE_AT = SETTLE_AT + 1.0;
die.spin3d(1080, 720, 15, { at: IDLE_AT, duration: 0.6, ease: "sine.inOut" });
die.spin3d(1080, 720, -10, { at: IDLE_AT + 0.6, duration: 0.6, ease: "sine.inOut" });
die.spin3d(1080, 720, 0, { at: IDLE_AT + 1.2, duration: 0.5, ease: "sine.inOut" });

// Title card, drawn in after the die settles.
const title = sketch.text("sketchling", 380, 70, { color: "#5b4530", weight: "bold" }, { size: 60 });
scene.add(title).stagger(0.045, { at: SETTLE_AT + 0.2, duration: 0.3 });
const subtitle = sketch.text("now with 3d", 400, 150, { color: "#8a6d4a", weight: "confident" }, { size: 32 });
scene.add(subtitle).stagger(0.03, { at: SETTLE_AT + 0.8, duration: 0.25 });

export default scene;
