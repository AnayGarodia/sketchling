// Bundles the browser-side render harness into dist/harness.js at build time. The CLI used
// to bundle this from src/render/harness-entry.ts on every render call — fine when working
// inside the repo (src/ is present), but the published npm package only ships dist/, so a
// fresh `npm install sketchling` had no src/ to bundle from and every render failed outright.
// Pre-building it here and shipping the output means the CLI only ever reads a file, whether
// running from a git clone or a published install.
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "..");

await esbuild.build({
  entryPoints: [path.join(pkgRoot, "src/render/harness-entry.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: path.join(pkgRoot, "dist/harness.js"),
});

console.log("Built dist/harness.js");
