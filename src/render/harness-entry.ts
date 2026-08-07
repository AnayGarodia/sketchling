import { mountRenderable } from "./renderer.js";
import type { Renderable } from "../core/types.js";

declare global {
  interface Window {
    __SKETCHLING_SCENE__: Renderable;
    __sketchling: {
      ready: boolean;
      seekTo: (t: number) => void;
      totalDuration: () => number;
    };
  }
}

const stage = document.getElementById("stage")!;
const result = mountRenderable(window.__SKETCHLING_SCENE__, stage);

window.__sketchling = {
  ready: true,
  seekTo: result.seekTo,
  totalDuration: result.totalDuration,
};
