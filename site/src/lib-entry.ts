// The browser build of sketchling the playground loads at runtime (bundled to
// site/vendor/sketchling.mjs by scripts/build-site.mjs). It is the public API plus the two
// internals a host needs to render a scene itself: the renderer's own entry point — the same
// one the CLI's Playwright harness calls (src/render/harness-entry.ts) — and the Tier 0
// linter, so the playground reports the same findings a `sketchling render` would print.
//
// User code typed into the editor imports this same module URL, so the `sketch` it builds
// nodes with is the exact instance the playground then mounts (one gsap, one rough.js).
export * from "../../src/index.js";
export { mountRenderable } from "../../src/render/renderer.js";
export type { MountResult } from "../../src/render/renderer.js";
export { lintScene } from "../../src/lint/lint.js";
export type { LintFinding } from "../../src/lint/lint.js";
