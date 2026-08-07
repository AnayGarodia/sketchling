import { mount } from "./renderer.js";
import type { SerializedScene } from "../core/types.js";

declare global {
  interface Window {
    __SKETCHLING_SCENE__: SerializedScene;
    __sketchling: {
      ready: boolean;
      seekTo: (t: number) => void;
      totalDuration: () => number;
    };
  }
}

const stage = document.getElementById("stage")!;
const result = mount(window.__SKETCHLING_SCENE__, stage);

window.__sketchling = {
  ready: true,
  seekTo: result.seekTo,
  totalDuration: result.totalDuration,
};
