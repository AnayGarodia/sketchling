// Clay look — stop-motion bounce
import { sketch } from "sketchling";

// "clay" quantizes time itself to a ~10fps hold, so every tween steps instead of gliding.
const scene = sketch.scene({ width: 400, height: 400, background: "#f4ede4", seed: "clay-bounce", look: "clay" });

const ink = "#2b2118";
const groundY = 340;
const radius = 35;

const ground = sketch.stroke(
  [
    [30, groundY],
    [370, groundY],
  ],
  { color: ink, weight: "bold", looseness: 0.15, energy: "calm", smooth: false }
);
scene.add(ground).drawOn({ at: 0, duration: 0.5 });

const ball = sketch.blob(80, 100, radius, { color: ink, weight: "confident", looseness: 0.2, fill: { color: "#d1543f", style: "solid" } }, 12);
ball.pivotAt(80, 100);
scene.add(ball).drawOn({ at: 0.3, duration: 0.55 });

// Two bounces. squashTo is non-uniform scale — flatten on contact, then recover — which is
// what sells the weight of the landing.
ball.moveTo(170, groundY - radius, { at: 0.9, duration: 0.5, ease: "power1.in" });
ball
  .squashTo(1.45, 0.55, { at: 1.4, duration: 0.08, ease: "sine.out" })
  .squashTo(1, 1, { at: 1.48, duration: 0.1, ease: "sine.in" });

ball.moveTo(260, 160, { at: 1.48, duration: 0.45, ease: "power1.out" });
ball.moveTo(340, groundY - radius, { at: 1.93, duration: 0.38, ease: "power1.in" });
ball
  .squashTo(1.35, 0.65, { at: 2.31, duration: 0.08, ease: "sine.out" })
  .squashTo(1, 1, { at: 2.39, duration: 0.15, ease: "sine.in" });

export default scene;
