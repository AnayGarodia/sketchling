#!/usr/bin/env node
import { Command } from "commander";
import * as esbuild from "esbuild";
import { chromium } from "playwright";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { lintScene, type LintFinding } from "./lint/lint.js";
import type { SerializedScene } from "./core/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, "..");

const program = new Command();
program.name("sketchling").description("A hand-drawn illustration and animation language for LLMs.");

program
  .command("render <sceneFile>")
  .description("render a scene to a PNG (or serve it live)")
  .option("--out <path>", "output PNG path", "preview.png")
  .option("--at <seconds>", "timeline time to capture (default: settled end state)")
  .option("--crop", "crop to the bounding box of drawn content instead of full canvas", false)
  .option("--serve", "serve the animation live in a browser instead of capturing a still", false)
  .option("--quiet-lint", "suppress Tier 0 lint findings", false)
  .action(async (sceneFile: string, opts) => {
    await runRender(sceneFile, opts);
  });

program.parseAsync(process.argv);

interface RenderOpts {
  out: string;
  at?: string;
  crop: boolean;
  serve: boolean;
  quietLint: boolean;
}

async function runRender(sceneFile: string, opts: RenderOpts): Promise<void> {
  const absScene = path.resolve(process.cwd(), sceneFile);
  const workdir = mkdtempSync(path.join(tmpdir(), "sketchling-"));

  // 1. Bundle + run scene.ts in Node to get the Scene object (core is DOM-free, so this is cheap).
  const sceneBundlePath = path.join(workdir, "scene.mjs");
  await esbuild.build({
    entryPoints: [absScene],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: sceneBundlePath,
    alias: { sketchling: path.join(pkgRoot, "dist/index.js") },
  });
  const mod = await import(pathToFileURL(sceneBundlePath).href);
  const scene = mod.default ?? mod.scene;
  if (!scene || typeof scene.serialize !== "function") {
    throw new Error(`${sceneFile} must \`export default\` a Scene (from sketch.scene()).`);
  }
  const serialized: SerializedScene = scene.serialize();

  // 2. Tier 0 lint: free, deterministic, runs before any pixel is drawn.
  if (!opts.quietLint) {
    const findings = lintScene(serialized);
    printFindings(findings);
  }

  // 3. Bundle the browser render runtime (roughjs + gsap + our renderer).
  const runtimeBundlePath = path.join(workdir, "runtime.js");
  await esbuild.build({
    entryPoints: [path.join(pkgRoot, "src/render/harness-entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: runtimeBundlePath,
  });
  const runtimeJs = readFileSync(runtimeBundlePath, "utf-8");

  // 4. Assemble a self-contained HTML harness and hand it to a real browser.
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0">
<div id="stage"></div>
<script>window.__SKETCHLING_SCENE__ = ${JSON.stringify(serialized)};</script>
<script>${runtimeJs}</script>
</body></html>`;
  const htmlPath = path.join(workdir, "scene.html");
  writeFileSync(htmlPath, html, "utf-8");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: serialized.width, height: serialized.height } });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForFunction(() => (window as any).__sketchling?.ready === true);

  if (opts.serve) {
    console.log(`Scene HTML: ${htmlPath}`);
    console.log("Open it in a browser to see it live. Ctrl+C to exit.");
    await new Promise(() => {}); // keep alive; user Ctrl+C's out
    return;
  }

  const at = opts.at !== undefined ? Number(opts.at) : await page.evaluate(() => (window as any).__sketchling.totalDuration());
  await page.evaluate((t) => (window as any).__sketchling.seekTo(t), at);

  const stage = page.locator("#stage svg");
  const outPath = path.resolve(process.cwd(), opts.out);
  if (opts.crop) {
    const box = await stage.boundingBox();
    await page.screenshot({ path: outPath, clip: box ?? undefined });
  } else {
    await stage.screenshot({ path: outPath });
  }

  console.log(`Rendered ${sceneFile} at t=${at.toFixed(2)}s -> ${outPath}`);
  await browser.close();
}

function printFindings(findings: LintFinding[]): void {
  if (findings.length === 0) {
    console.log("lint: clean");
    return;
  }
  for (const f of findings) {
    console.log(`lint [${f.level}]: ${f.message}`);
  }
}
