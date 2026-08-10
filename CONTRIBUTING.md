# Contributing to sketchling

Issues and PRs are welcome — new example scenes, renderer fixes, capability gaps found by
actually trying to draw something and hitting a wall. This file is the practical how-to;
[AGENTS.md](AGENTS.md) is the real reference for the vocabulary and the library's own
conventions and known gotchas. Read AGENTS.md before writing a scene — most "is this a bug"
questions are already answered there.

## Setup

```sh
git clone https://github.com/AnayGarodia/sketchling.git
cd sketchling
npm install
npx playwright install chromium   # one-time: the CLI renders through a real headless browser
npm run build                     # compiles TypeScript and bundles the render harness
```

`ffmpeg` needs to be on `PATH` for `--video` export and the `"pixel"` texture (a raster
post-process run through it) — install it however your platform normally does (`brew install
ffmpeg`, `apt install ffmpeg`, etc.), it's not an npm dependency.

Re-run `npm run build` after any change under `src/` — the CLI reads compiled `dist/`, not
`src/` directly, so a source-only change won't show up in a render until you rebuild.

## Making a change

**A new example scene**: pick the right directory — `examples/` for a single-concept
vocabulary demo, `examples/gallery/` for a slightly larger single-capability demo,
`examples/showcase/` for a longer scene composing several capabilities together,
`examples/story/` for a multi-scene narrative cut together with `sketch.film()`. Write it,
render it, actually look at the rendered image (see below) — a scene that builds without
error and a scene that looks right are different claims, and the CLI's exit code only tells
you the first one.

**A renderer/library change**: `src/core/` has no DOM dependency on purpose (it runs in
plain Node for the Tier 0 linter and scene construction) — don't introduce one there; DOM/
browser code belongs in `src/render/`. `src/render/renderer.ts` is the most load-bearing
file in the repo; changes there deserve a render check at a genuinely mid-motion timestamp,
not just a build check.

## Verifying your own work

There's no unit test suite — this is a visual/generative library, so verification means
actually rendering a scene and looking at the output, not asserting against expected pixel
values. Before opening a PR:

```sh
sketchling render your-scene.ts --out preview.png            # settled end state
sketchling render your-scene.ts --out mid.png --at 0.6        # a genuinely mid-motion moment
sketchling render your-scene.ts --video preview.mp4 --fps 24  # the whole timeline
node scripts/smoke-render.mjs                                 # every example in the repo still renders
```

Look at the rendered PNGs/MP4 yourself — a silent camera or placement bug (a character
floating above the ground, a camera pushed past the world's own bounds) won't throw an
error, it'll just look wrong. `smoke-render.mjs` (the same script CI runs) only catches loud
failures — a thrown error, a non-zero exit — across every example in the repo; it's the
regression check for "did this change break someone else's scene," not a substitute for
looking at your own.

Tier 0 lint (off-canvas content, degenerate shapes, heavy overlap, off-center composition)
runs automatically on every render. Nested detail (eyes on a face, a window on a wall)
routinely trips the overlap warning — that's expected for intentional nesting, not something
to fix; `--quiet-lint` suppresses the console output if it's in your way during iteration.

## What a good PR looks like

State what you built and what you actually verified (which timestamps you looked at, what
you saw), not just "it works." If you hit a real bug in the library while building an
example, fix it at the source rather than working around it in your own scene, and say what
the bug was and how you found it — that's more valuable than the example itself. If you're
adding a new primitive or capability, it needs its own small demo under `examples/gallery/`,
the same way every existing one does.
