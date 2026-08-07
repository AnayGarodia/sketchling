import type { Scene } from "./scene.js";
import type { FilmEntry, FilmTransition, SerializedFilm } from "./types.js";

export interface FilmOptions {
  width?: number;
  height?: number;
  background?: string;
}

export interface AddSceneOptions {
  transition?: FilmTransition;
  transitionDuration?: number;
  /** Extra time to sit on the scene's settled frame before the next one takes over. */
  hold?: number;
}

const DEFAULT_TRANSITION_DURATION = 0.5;
const DEFAULT_HOLD = 0.4;

/**
 * Several scenes cut together into one render. Scenes are built independently (each is a
 * normal `sketch.scene()`, drawn and animated exactly like a standalone one) — a Film just
 * sequences them, scaling each to fit its own canvas since scenes can (and often should)
 * declare whatever width/height suits their own composition.
 */
export class Film {
  width: number;
  height: number;
  background: string;
  entries: { scene: Scene; transition: FilmTransition; transitionDuration: number; hold: number }[] = [];

  constructor(opts: FilmOptions = {}) {
    this.width = opts.width ?? 640;
    this.height = opts.height ?? 480;
    this.background = opts.background ?? "#efe8d8";
  }

  /** `transition` defaults to a hard cut; pass `"fade"` for a crossfade into this scene. */
  addScene(scene: Scene, opts: AddSceneOptions = {}): this {
    this.entries.push({
      scene,
      transition: opts.transition ?? "cut",
      transitionDuration: opts.transitionDuration ?? DEFAULT_TRANSITION_DURATION,
      hold: opts.hold ?? DEFAULT_HOLD,
    });
    return this;
  }

  serialize(): SerializedFilm {
    const entries: FilmEntry[] = this.entries.map((e) => ({
      scene: e.scene.serialize(),
      transition: e.transition,
      transitionDuration: e.transitionDuration,
      hold: e.hold,
    }));
    return {
      kind: "film",
      width: this.width,
      height: this.height,
      background: this.background,
      entries,
    };
  }
}
