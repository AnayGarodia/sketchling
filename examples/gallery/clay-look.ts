import { sketch } from "../../src/index.js";

// Gallery demo for the "clay" look: subtler hand-molded jitter than ink, solid
// fills, and — the thing that actually needs continuous motion to show off —
// time itself quantized to a ~10fps hold (genuine stop-motion stepping, not a
// smooth tween). A ball draws on, then bounces twice across the canvas with a
// squash-and-stretch impact at each landing, so the stepped motion is visible
// both mid-air and at the moment of contact.
const scene = sketch.scene({ width: 400, height: 400, background: "#f4ede4", seed: "clay-look", look: "clay" });

const ink = "#2b2118";
const clayRed = "#d1543f";

const groundY = 340;
const radius = 35;

const ground = sketch.stroke(
  [
    [30, groundY],
    [370, groundY],
  ],
  { color: ink, weight: "bold", looseness: 0.15, energy: "calm", smooth: false }
);
scene.add(ground).drawOn({ at: 0.0, duration: 0.5 });

const ball = sketch.blob(80, 100, radius, { color: ink, weight: "confident", looseness: 0.2, energy: "calm", fill: { color: clayRed, style: "solid" } }, 12);
scene.add(ball).drawOn({ at: 0.3, duration: 0.55 });

// Fall from the starting apex to the first bounce.
ball.moveTo(170, groundY - radius, { at: 0.9, duration: 0.5, ease: "power1.in" });
// Impact squash, then recover before rising.
ball
  .squashTo(1.45, 0.55, { at: 1.4, duration: 0.08, ease: "sine.out" })
  .squashTo(1, 1, { at: 1.48, duration: 0.1, ease: "sine.in" });
// Rise to a lower second apex.
ball.moveTo(260, 160, { at: 1.48, duration: 0.45, ease: "power1.out" });
// Fall to the second, final bounce.
ball.moveTo(340, groundY - radius, { at: 1.93, duration: 0.38, ease: "power1.in" });
// Final impact squash and settle.
ball
  .squashTo(1.35, 0.65, { at: 2.31, duration: 0.08, ease: "sine.out" })
  .squashTo(1, 1, { at: 2.39, duration: 0.15, ease: "sine.in" });

export default scene;
