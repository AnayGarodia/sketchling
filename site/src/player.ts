// Playback for a mounted scene. The renderer hands back a paused GSAP timeline plus a
// seekTo that also drives the live systems (line boil, camera, springs, connectors,
// particles), exactly as the CLI's frame capture uses it — so "play" here is a rAF loop
// calling seekTo with wall-clock time, not a second animation engine.
import type { MountResult, Renderable } from "./lib-entry.js";
import type { Lib } from "./runtime.js";

// A beat on the settled end frame before looping, so a scene's last drawn moment registers
// instead of snapping straight back to a blank canvas. Same idea as the CLI's video hold.
const HOLD_SECONDS = 0.8;
const SCRUB_STEPS = 1000;

export interface PlayerElements {
  stage: HTMLElement;
  play: HTMLButtonElement;
  scrub: HTMLInputElement;
  clock: HTMLElement;
}

export class Player {
  private mounted: MountResult | null = null;
  private duration = 0;
  private t = 0;
  private playing = false;
  private frame = 0;
  private lastTick = 0;

  constructor(private readonly el: PlayerElements) {
    el.play.addEventListener("click", () => (this.playing ? this.pause() : this.play()));
    el.scrub.addEventListener("input", () => {
      this.pause();
      this.seek((Number(el.scrub.value) / SCRUB_STEPS) * this.duration);
    });
  }

  get sceneDuration(): number {
    return this.duration;
  }

  /** Mounts a fresh scene and starts it from the top. */
  show(lib: Lib, renderable: Renderable): void {
    this.pause();
    // Kill the previous timeline before dropping the DOM it drove: its tweens hold
    // references to elements that are about to be replaced.
    this.mounted?.timeline.kill();
    this.mounted = null;
    this.mounted = lib.mountRenderable(renderable, this.el.stage);
    this.duration = Math.max(0.001, this.mounted.totalDuration());
    this.el.play.disabled = false;
    this.el.scrub.disabled = false;
    this.seek(0);
    this.play();
  }

  play(): void {
    if (!this.mounted) return;
    if (this.t >= this.duration + HOLD_SECONDS) this.seek(0);
    this.playing = true;
    this.el.play.textContent = "Pause";
    this.lastTick = performance.now();
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.playing = false;
    this.el.play.textContent = "Play";
    cancelAnimationFrame(this.frame);
  }

  seek(t: number): void {
    this.t = Math.max(0, t);
    this.mounted?.seekTo(Math.min(this.t, this.duration));
    this.el.scrub.value = String(Math.round((Math.min(this.t, this.duration) / this.duration) * SCRUB_STEPS));
    this.el.clock.textContent = `${Math.min(this.t, this.duration).toFixed(2)} / ${this.duration.toFixed(2)}s`;
  }

  private readonly tick = (now: number): void => {
    if (!this.playing || !this.mounted) return;
    // Clamped so a backgrounded tab (or a slow re-render) resumes rather than jumping the
    // whole elapsed gap at once.
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;
    const next = this.t + dt;
    this.seek(next > this.duration + HOLD_SECONDS ? 0 : next);
    this.frame = requestAnimationFrame(this.tick);
  };
}
