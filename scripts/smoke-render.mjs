// CI's actual safety net: render every example to a still PNG and fail loud if any of them
// throw. Before this script existed, nothing automated caught a broken renderer or a bad
// example — `npm run build` only type-checks, it doesn't run a single scene through the
// browser. A silently-wrong render (a camera pushed past world bounds, a bbox-center
// placement bug) also won't show up here — this only catches the loud failures (a thrown
// error, a non-zero exit) — but loud failures are exactly what used to slip through
// entirely unnoticed until someone happened to render that one example by hand.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "..");

async function findScenes(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findScenes(full)));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.startsWith("_")) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const examplesDir = path.join(pkgRoot, "examples");
  const scenes = (await findScenes(examplesDir)).sort();
  console.log(`Smoke-rendering ${scenes.length} example(s)...`);

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "sketchling-smoke-"));
  const failures = [];

  for (const scene of scenes) {
    const rel = path.relative(pkgRoot, scene);
    const out = path.join(tmpDir, `${path.basename(scene, ".ts")}.png`);
    process.stdout.write(`  ${rel} ... `);
    try {
      await execFileAsync(
        process.execPath,
        [path.join(pkgRoot, "bin/sketchling.js"), "render", scene, "--out", out, "--quiet-lint"],
        { cwd: pkgRoot, timeout: 90_000 }
      );
      console.log("ok");
    } catch (err) {
      console.log("FAILED");
      failures.push({ rel, message: err.stderr || err.message });
    }
  }

  await rm(tmpDir, { recursive: true, force: true });

  if (failures.length > 0) {
    console.error(`\n${failures.length}/${scenes.length} example(s) failed to render:\n`);
    for (const f of failures) {
      console.error(`--- ${f.rel} ---`);
      console.error(f.message);
      console.error("");
    }
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${scenes.length} examples rendered cleanly.`);
  }
}

main();
