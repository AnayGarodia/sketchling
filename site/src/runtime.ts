// Turns whatever is in the editor into a Renderable, the same way the CLI does: transpile
// the TypeScript, evaluate the module, take its default export, `serialize()` it, then run
// the agent validator and the Tier 0 linter over the result. The difference is only where
// each step happens — sucrase in place of esbuild, a blob module in place of a Node import.
import { transform } from "sucrase";
import type * as Sketchling from "./lib-entry.js";
import type { Renderable, SerializedNode, SerializedScene } from "./lib-entry.js";

export type Lib = typeof Sketchling;

export interface Diagnostic {
  level: "error" | "warn" | "info";
  message: string;
  /** 1-based line in the user's own source, when the failure can be attributed to one. */
  line?: number;
}

export interface BuildResult {
  renderable?: Renderable;
  diagnostics: Diagnostic[];
}

// The library is loaded as a separate module rather than bundled into this app so that user
// code and the playground share one instance of it (one gsap, one rough.js, one registry of
// node ids) — an `import "sketchling"` in the editor is rewritten to this exact URL, which
// the browser then serves from its module cache.
const LIB_URL = new URL("vendor/sketchling.mjs", document.baseURI).href;

let libPromise: Promise<Lib> | undefined;

export function loadLib(): Promise<Lib> {
  // Deliberately a variable, not a literal: esbuild leaves this dynamic import alone
  // instead of inlining the library into the app bundle.
  libPromise ??= import(LIB_URL) as Promise<Lib>;
  return libPromise;
}

// Both the published name and the repo-relative paths every file under examples/ uses, so
// an example can be pasted in unedited and still run.
const SKETCHLING_SPECIFIER = /^(sketchling|(?:\.{1,2}\/)+src\/index(?:\.js|\.ts)?)$/;
const IMPORT_SPECIFIER = /\b(from|import)\s*(["'])([^"'\n]+)\2/g;

function rewriteImports(code: string): { code: string; unknown: string[] } {
  const unknown: string[] = [];
  const rewritten = code.replace(IMPORT_SPECIFIER, (match, keyword: string, quote: string, specifier: string) => {
    if (SKETCHLING_SPECIFIER.test(specifier)) return `${keyword} ${quote}${LIB_URL}${quote}`;
    if (/^(https?:|blob:|data:)/.test(specifier)) return match;
    unknown.push(specifier);
    return match;
  });
  return { code: rewritten, unknown };
}

/** Evaluated as a real ES module (via a blob URL) rather than through `new Function`, so
 * `export default` means what it means everywhere else and thrown errors carry usable line
 * numbers — sucrase's TypeScript transform is line-preserving, so a frame's line number is
 * the line the user is looking at. */
async function evaluateModule(code: string): Promise<Record<string, unknown>> {
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  try {
    return (await import(url)) as Record<string, unknown>;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.name === "Error" ? err.message : `${err.name}: ${err.message}`;
  return String(err);
}

function lineOfStack(err: unknown): number | undefined {
  const stack = err instanceof Error ? err.stack ?? "" : "";
  const frame = stack.match(/blob:[^\s)]+?:(\d+):\d+/);
  return frame ? Number(frame[1]) : undefined;
}

// Sucrase reports positions in the message itself, e.g. `Unexpected token (12:4)`.
function lineOfSyntaxError(message: string): number | undefined {
  const at = message.match(/\((\d+):\d+\)/);
  return at ? Number(at[1]) : undefined;
}

function contractFindings(lib: Lib, renderable: Renderable): Diagnostic[] {
  const validation = lib.validateRenderable(renderable).map((f) => ({ level: f.level, message: withNode(f.message, f.nodeId) }));
  const lint =
    renderable.kind === "scene"
      ? lib.lintScene(renderable).map((f) => ({ level: f.level, message: withNode(f.message, f.nodeId) }))
      : renderable.entries.flatMap((entry, i) =>
          lib.lintScene(entry.scene).map((f) => ({ level: f.level, message: `[scene ${i}] ${withNode(f.message, f.nodeId)}` }))
        );
  return [...validation, ...lint, ...playgroundNotes(renderable)];
}

function withNode(message: string, nodeId?: string): string {
  return nodeId && !message.includes(nodeId) ? `${message} (${nodeId})` : message;
}

function someNode(nodes: SerializedNode[] | undefined, predicate: (node: SerializedNode) => boolean): boolean {
  return (nodes ?? []).some((node) => predicate(node) || someNode(node.children, predicate));
}

/** The two things a scene can ask for that this page genuinely cannot do, said out loud
 * rather than left as a silent difference from what the CLI would produce. */
function playgroundNotes(renderable: Renderable): Diagnostic[] {
  const scenes: SerializedScene[] = renderable.kind === "film" ? renderable.entries.map((entry) => entry.scene) : [renderable];
  const notes: Diagnostic[] = [];
  if (scenes.some((scene) => scene.texture === "pixel")) {
    notes.push({
      level: "info",
      message: 'texture: "pixel" is a raster post-process the CLI runs on the captured frame, not an SVG filter — this page shows the unpixelated render.',
    });
  }
  if (scenes.some((scene) => someNode(scene.children, (node) => node.type === "sound"))) {
    notes.push({
      level: "info",
      message: "sketch.sound() is silent here: audio is synthesized when the CLI muxes a video.",
    });
  }
  return notes;
}

export async function buildScene(source: string): Promise<BuildResult> {
  const lib = await loadLib();

  let transpiled: string;
  try {
    transpiled = transform(source, { transforms: ["typescript"], disableESTransforms: true, filePath: "scene.ts" }).code;
  } catch (err) {
    const message = messageOf(err);
    return { diagnostics: [{ level: "error", message, line: lineOfSyntaxError(message) }] };
  }

  const { code, unknown } = rewriteImports(transpiled);
  if (unknown.length > 0) {
    const names = unknown.map((s) => `"${s}"`).join(", ");
    return {
      diagnostics: [
        { level: "error", message: `Cannot import ${names} here — the playground only provides "sketchling".` },
      ],
    };
  }

  let module: Record<string, unknown>;
  try {
    module = await evaluateModule(code);
  } catch (err) {
    return { diagnostics: [{ level: "error", message: messageOf(err), line: lineOfStack(err) }] };
  }

  const exported = (module.default ?? module.scene) as { serialize?: () => Renderable } | undefined;
  if (!exported || typeof exported.serialize !== "function") {
    return {
      diagnostics: [
        { level: "error", message: "Nothing to render: `export default` a Scene (sketch.scene()) or a Film (sketch.film())." },
      ],
    };
  }

  let renderable: Renderable;
  try {
    renderable = exported.serialize();
  } catch (err) {
    return { diagnostics: [{ level: "error", message: messageOf(err), line: lineOfStack(err) }] };
  }

  return { renderable, diagnostics: contractFindings(lib, renderable) };
}
