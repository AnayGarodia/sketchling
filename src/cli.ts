#!/usr/bin/env node
import { Command } from "commander";
import * as esbuild from "esbuild";
import { chromium, type Page, type CDPSession } from "playwright";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { lintScene, type LintFinding } from "./lint/lint.js";
import type { SerializedScene } from "./core/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, "..");

const program = new Command();
program.name("sketchling").description("A hand-drawn illustration and animation language for LLMs.");

program
  .command("render <sceneFile>")
  .description("render a scene to a still PNG, an MP4, or serve it live")
  .option("--out <path>", "output PNG path", "preview.png")
  .option("--at <seconds>", "timeline time to capture (default: settled end state)")
  .option("--crop", "crop to the bounding box of drawn content instead of full canvas", false)
  .option("--video <path>", "render the full timeline to an MP4 instead of a single still")
  .option("--fps <n>", "frames per second for --video", "24")
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
  video?: string;
  fps: string;
  serve: boolean;
  quietLint: boolean;
}

const FRAME_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 4;

async function runRender(sceneFile: string, opts: RenderOpts): Promise<void> {
  const absScene = path.resolve(process.cwd(), sceneFile);
  const workdir = mkdtempSync(path.join(tmpdir(), "sketchling-"));

  const serialized = await buildScene(absScene, workdir);
  if (!opts.quietLint) printFindings(lintScene(serialized));

  const htmlPath = await buildHarness(serialized, workdir);

  if (opts.serve) {
    console.log(`Scene HTML: ${htmlPath}`);
    console.log("Open it in a real browser to see it live (this file is self-contained).");
    return;
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: serialized.width, height: serialized.height } });
      page.setDefaultTimeout(FRAME_TIMEOUT_MS);
      if (process.env.SKETCHLING_DEBUG) {
        page.on("console", (m) => console.error("[browser]", m.type(), m.text()));
        page.on("pageerror", (e) => console.error("[pageerror]", e));
      }
      await withTimeout(page.goto(pathToFileURL(htmlPath).href), FRAME_TIMEOUT_MS, "page load");
      await withTimeout(
        page.waitForFunction(() => (window as any).__sketchling?.ready === true),
        FRAME_TIMEOUT_MS,
        "ready check"
      );
      const cdp = await page.context().newCDPSession(page);

      if (opts.video) {
        await renderVideo(page, cdp, opts.video, Number(opts.fps), workdir);
      } else {
        const totalDuration: number = await withTimeout(
          page.evaluate(() => (window as any).__sketchling.totalDuration()),
          FRAME_TIMEOUT_MS,
          "read duration"
        );
        const at = opts.at !== undefined ? Number(opts.at) : totalDuration;
        await withTimeout(
          captureFrame(page, cdp, at, path.resolve(process.cwd(), opts.out), opts.crop),
          FRAME_TIMEOUT_MS,
          "capture frame"
        );
        console.log(`Rendered ${sceneFile} at t=${at.toFixed(2)}s -> ${opts.out}`);
      }
      await browser.close();
      return;
    } catch (err) {
      lastErr = err;
      // A stuck CDP evaluate can wedge the whole browser session (a known local
      // Chromium/Playwright flakiness, not scene-specific) — close() can hang in
      // that state too, so give it a short grace period and move on regardless.
      await withTimeout(browser.close(), 3_000, "browser close").catch(() => {});
      if (attempt < MAX_ATTEMPTS) {
        console.error(`render attempt ${attempt} failed (${(err as Error).message}), retrying...`);
      }
    }
  }
  throw lastErr;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

async function buildScene(absScene: string, workdir: string): Promise<SerializedScene> {
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
    throw new Error(`${absScene} must \`export default\` a Scene (from sketch.scene()).`);
  }
  return scene.serialize();
}

async function buildHarness(serialized: SerializedScene, workdir: string): Promise<string> {
  const runtimeBundlePath = path.join(workdir, "runtime.js");
  await esbuild.build({
    entryPoints: [path.join(pkgRoot, "src/render/harness-entry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    outfile: runtimeBundlePath,
  });
  const runtimeJs = readFileSync(runtimeBundlePath, "utf-8");
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0">
<div id="stage"></div>
<script>window.__SKETCHLING_SCENE__ = ${JSON.stringify(serialized)};</script>
<script>${runtimeJs}</script>
</body></html>`;
  const htmlPath = path.join(workdir, "scene.html");
  writeFileSync(htmlPath, html, "utf-8");
  return htmlPath;
}

/**
 * Captures via the raw CDP `Page.captureScreenshot` (session created once per page by the caller).
 * Uses `page.evaluate` with a block-bodied callback deliberately: `tl.seek()` returns the GSAP
 * Timeline itself, and an implicit-return arrow function hands that back to Playwright, which then
 * tries to serialize the whole timeline (tweens, DOM targets, ticker links) over CDP — that never
 * completes. Block body + no return avoids serializing anything back at all.
 */
async function captureFrame(page: Page, cdp: CDPSession, at: number, outPath: string, crop: boolean): Promise<void> {
  if (process.env.SKETCHLING_DEBUG) console.error(`[debug] seeking to ${at}`);
  await page.evaluate((t) => {
    (window as any).__sketchling.seekTo(t);
  }, at);
  if (process.env.SKETCHLING_DEBUG) console.error(`[debug] seeked, screenshotting`);

  const clip = crop
    ? await page.evaluate(() => {
        const el = document.querySelector("#stage svg") as SVGSVGElement;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
      })
    : undefined;
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip });
  writeFileSync(outPath, Buffer.from(data, "base64"));
  if (process.env.SKETCHLING_DEBUG) console.error(`[debug] screenshot done`);
}

async function renderVideo(page: Page, cdp: CDPSession, outPath: string, fps: number, workdir: string): Promise<void> {
  const totalDuration: number = await page.evaluate(() => (window as any).__sketchling.totalDuration());
  const framesDir = path.join(workdir, "frames");
  mkdirSync(framesDir, { recursive: true });

  const frameCount = Math.max(1, Math.ceil(totalDuration * fps));
  for (let i = 0; i < frameCount; i++) {
    const t = i / fps;
    const framePath = path.join(framesDir, `frame-${String(i).padStart(6, "0")}.png`);
    await withTimeout(captureFrame(page, cdp, t, framePath, false), FRAME_TIMEOUT_MS, `capture frame ${i}`);
    if (i % 10 === 0 || i === frameCount - 1) console.log(`frame ${i + 1}/${frameCount}`);
  }

  const resolvedOut = path.resolve(process.cwd(), outPath);
  await runFfmpeg([
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(framesDir, "frame-%06d.png"),
    "-pix_fmt",
    "yuv420p",
    resolvedOut,
  ]);
  console.log(`Rendered ${frameCount} frames (${totalDuration.toFixed(2)}s @ ${fps}fps) -> ${resolvedOut}`);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "inherit" });
    proc.on("error", (err) => {
      reject(new Error(`ffmpeg not found or failed to start: ${err.message}. Install it with \`brew install ffmpeg\`.`));
    });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
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
