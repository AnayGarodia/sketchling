# The sketchling playground

A single static page that lets you write a sketchling scene and watch it draw itself, with no
install and no server. Deployed to GitHub Pages from `main` by
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml).

## Build and run

```
npm install
npm run build:site     # writes site/vendor/ (generated, gitignored)
npm run site           # builds, then serves site/ at http://127.0.0.1:5173
npm run test:site      # builds, then drives the page through headless Chromium
```

`site/` is static once built — any file server will do. It does need to be served over
`http://` rather than opened as a `file://` path, because the page loads the library as an ES
module and evaluates your scene as another one.

## How it works

The renderer already runs in a browser: `sketchling render` drives it through Playwright, and
the browser-side entry point is `src/render/harness-entry.ts`, which calls `mountRenderable`.
The playground reuses that same renderer rather than reimplementing anything, so a scene looks
here exactly as it does coming out of the CLI.

1. **Two bundles** (`scripts/build-site.mjs`, esbuild). `site/vendor/sketchling.mjs` is the
   library — the public API plus `mountRenderable` and the Tier 0 linter (see
   `site/src/lib-entry.ts`). `site/vendor/playground.js` is the app. The library stays a
   separate module, loaded at runtime, so that your code and the app share one instance of it
   (one gsap, one rough.js); bundling it into the app would give the page two.
2. **Your code is TypeScript**, transpiled by [sucrase](https://github.com/alangpierce/sucrase)
   in the page and evaluated as a real ES module through a blob URL. `import { sketch } from
   "sketchling"` is rewritten to that library URL — so is `../src/index.js`, which means any
   file from `examples/` can be pasted in unedited.
3. **The default export is serialized** exactly as the CLI does it (`scene.serialize()`), then
   run through `validateRenderable` and `lintScene` before mounting, so the page reports the
   same findings a `sketchling validate` would print.
4. **Playback** is a `requestAnimationFrame` loop calling the renderer's own `seekTo`, which is
   also what drives line boil, camera, springs, connectors and particles. Scrubbing is
   therefore exact: any timeline position is reachable directly, the same way `--at` is.
5. **Share links** hold the whole scene in the URL hash (deflate-raw + base64url, with a plain
   base64url fallback). No storage, nothing to expire.

Errors are never silent and never blank the pane: a transpile error, an unknown import, a
runtime throw, a validator finding or a lint finding all land in the strip under the panes, and
a failed run leaves the last good frame on screen.

## Adding a preset

Drop a `.ts` file in `site/presets/`:

- **Filename** — `NN-slug.ts`. The number orders the picker; `slug` is the id used in the
  picker's `<option>` and by the test.
- **First line** — a `// Label` comment. It becomes the picker label (keep it under ~35
  characters so it fits the control) and stays visible as the scene's own opening comment.
- **Imports** — from `"sketchling"`.
- **Export** — `export default` a Scene or a Film.

Then `npm run build:site`. The build regenerates `site/src/presets.generated.ts` from the
directory, so nothing else needs editing.

Because presets are ordinary scene files, the CLI can check them directly — worth doing before
committing one, since the playground has no lint pass of its own beyond what the page shows:

```
node bin/sketchling.js validate site/presets/07-walk-cycle.ts
node bin/sketchling.js render site/presets/07-walk-cycle.ts --at 4 --out /tmp/preset.png
```

`npm run test:site` then renders every preset in the picker and fails on any that comes out
blank or reports an error.

## Known limitations

- `texture: "pixel"` renders unpixelated. That texture is a post-process the CLI runs through
  ffmpeg on the captured frame (see AGENTS.md), not an SVG filter, so there is nothing for the
  page to apply. Every other look and texture is the real thing.
- `sketch.sound()` is silent here. Audio is synthesized at video-mux time by the CLI; the page
  only draws.
- Long scenes make long links. A share URL carries the source itself, so a 2,000-line film is a
  very long URL — fine for a browser, awkward in a chat message.
