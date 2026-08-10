import { mountRenderable } from "./renderer.js";
import { renderSceneAudio, arrayBufferToBase64 } from "./audio.js";
import type { Renderable } from "../core/types.js";

declare global {
  interface Window {
    __SKETCHLING_SCENE__: Renderable;
    __sketchling: {
      ready: boolean;
      seekTo: (t: number) => void;
      totalDuration: () => number;
      // Renders every sketch.sound() in the scene to a base64-encoded WAV, covering exactly
      // `targetDurationSeconds` (the caller — cli.ts's renderVideo — passes the same
      // duration its video frames cover, hold tail included, so the muxed audio and video
      // tracks end up the same length without needing ffmpeg's -shortest to paper over a
      // mismatch). Empty string if the scene has no sound nodes at all — cli.ts skips
      // muxing audio entirely in that case, so the ~30 existing silent example scenes
      // render byte-for-byte as before.
      renderAudio: (targetDurationSeconds: number) => Promise<string>;
    };
  }
}

const stage = document.getElementById("stage")!;
const result = mountRenderable(window.__SKETCHLING_SCENE__, stage);

window.__sketchling = {
  ready: true,
  seekTo: result.seekTo,
  totalDuration: result.totalDuration,
  renderAudio: async (targetDurationSeconds: number) => {
    if (result.soundEvents.length === 0) return "";
    const wav = await renderSceneAudio(result.soundEvents, targetDurationSeconds);
    return arrayBufferToBase64(wav);
  },
};
