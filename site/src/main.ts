// Wiring: editor -> transpile/evaluate/validate (runtime.ts) -> mount and play (player.ts).
import { createEditor, setEditorDoc } from "./editor.js";
import { Player } from "./player.js";
import { presets } from "./presets.generated.js";
import { buildScene, loadLib, type Diagnostic } from "./runtime.js";
import { decodeSource, encodeSource } from "./share.js";

const RUN_DEBOUNCE_MS = 700;
const MAX_DIAGNOSTICS = 12;
const THEME_KEY = "sketchling-playground-theme";
const SHARED_OPTION = "__shared";

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
}

const els = {
  preset: byId<HTMLSelectElement>("preset"),
  autorun: byId<HTMLInputElement>("autorun"),
  run: byId<HTMLButtonElement>("run"),
  share: byId<HTMLButtonElement>("share"),
  theme: byId<HTMLButtonElement>("theme"),
  copyInstall: byId<HTMLButtonElement>("copy-install"),
  stage: byId<HTMLElement>("stage"),
  play: byId<HTMLButtonElement>("play"),
  scrub: byId<HTMLInputElement>("scrub"),
  clock: byId<HTMLElement>("clock"),
  diagnostics: byId<HTMLElement>("diagnostics"),
  status: byId<HTMLElement>("status"),
  editor: byId<HTMLElement>("editor"),
};

const player = new Player({ stage: els.stage, play: els.play, scrub: els.scrub, clock: els.clock });

for (const preset of presets) {
  els.preset.append(new Option(preset.label, preset.id));
}

/* ---------- theme ---------- */

function systemTheme(): "light" | "dark" {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.dataset.theme = theme;
  els.theme.textContent = theme === "dark" ? "Light" : "Dark";
}

const storedTheme = localStorage.getItem(THEME_KEY);
applyTheme(storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme());

els.theme.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* ---------- diagnostics ---------- */

function setStatus(text: string): void {
  els.status.textContent = text;
}

const LEVEL_ORDER: Record<Diagnostic["level"], number> = { error: 0, warn: 1, info: 2 };

function showDiagnostics(diagnostics: Diagnostic[]): void {
  els.diagnostics.replaceChildren();
  els.diagnostics.hidden = diagnostics.length === 0;
  if (diagnostics.length === 0) return;

  const ordered = [...diagnostics].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  for (const diagnostic of ordered.slice(0, MAX_DIAGNOSTICS)) {
    const row = document.createElement("p");
    row.className = diagnostic.level;
    const level = document.createElement("span");
    level.className = "level";
    level.textContent = diagnostic.level;
    const message = document.createElement("span");
    message.textContent = diagnostic.line ? `line ${diagnostic.line}: ${diagnostic.message}` : diagnostic.message;
    row.append(level, message);
    els.diagnostics.append(row);
  }
  if (ordered.length > MAX_DIAGNOSTICS) {
    const more = document.createElement("p");
    more.className = "info";
    more.textContent = `… and ${ordered.length - MAX_DIAGNOSTICS} more`;
    els.diagnostics.append(more);
  }
}

/* ---------- run ---------- */

let runToken = 0;
let debounce = 0;

// Reflected on <body> so the page's own state is inspectable without reading status prose:
// data-render is where the current attempt got to, data-renders counts finished attempts
// (which is what a test — or a bookmarklet — can wait on to know a fresh render landed).
let renders = 0;

function finishRun(state: "ok" | "failed"): void {
  document.body.dataset.render = state;
  document.body.dataset.renders = String(++renders);
}

async function run(): Promise<void> {
  // Any explicit run supersedes a keystroke-scheduled one. Without this, loading a preset
  // (or a shared link) renders twice: setting the document counts as a change, so the
  // debounced run fires 700ms behind the immediate one and remounts the same scene.
  clearTimeout(debounce);
  const token = ++runToken;
  const source = editor.state.doc.toString();
  document.body.dataset.render = "pending";
  setStatus("rendering…");
  const started = performance.now();

  let result;
  try {
    result = await buildScene(source);
  } catch (err) {
    // Reaching here means the library bundle itself failed to load — the one failure the
    // per-step handling inside buildScene can't attribute to the user's code.
    showDiagnostics([{ level: "error", message: `Could not load the renderer: ${String(err)}` }]);
    setStatus("not rendered");
    finishRun("failed");
    return;
  }
  if (token !== runToken) return;

  if (!result.renderable) {
    showDiagnostics(result.diagnostics);
    setStatus("not rendered");
    finishRun("failed");
    return;
  }

  try {
    const lib = await loadLib();
    if (token !== runToken) return;
    player.show(lib, result.renderable);
  } catch (err) {
    showDiagnostics([
      ...result.diagnostics,
      { level: "error", message: `Render failed: ${err instanceof Error ? err.message : String(err)}` },
    ]);
    setStatus("not rendered");
    finishRun("failed");
    return;
  }

  showDiagnostics(result.diagnostics);
  setStatus(`rendered in ${Math.round(performance.now() - started)} ms · ${player.sceneDuration.toFixed(2)}s timeline`);
  finishRun("ok");
}

function scheduleRun(): void {
  if (!els.autorun.checked) return;
  clearTimeout(debounce);
  debounce = window.setTimeout(run, RUN_DEBOUNCE_MS);
}

/* ---------- share links ---------- */

// Set when the app writes the hash itself, so the resulting hashchange isn't mistaken for
// the user navigating to a different scene.
let ownHash = "";

async function share(): Promise<void> {
  const hash = await encodeSource(editor.state.doc.toString());
  ownHash = hash;
  history.replaceState(null, "", hash);
  try {
    await navigator.clipboard.writeText(location.href);
    setStatus("link copied to the clipboard");
  } catch {
    setStatus("link is in the address bar");
  }
}

function selectSharedOption(): void {
  if (!els.preset.querySelector(`option[value="${SHARED_OPTION}"]`)) {
    els.preset.prepend(new Option("shared scene", SHARED_OPTION));
  }
  els.preset.value = SHARED_OPTION;
}

/* ---------- boot ---------- */

const shared = await decodeSource(location.hash);
if (shared) {
  ownHash = location.hash;
  selectSharedOption();
} else if (location.hash) {
  showDiagnostics([{ level: "warn", message: "That share link could not be decoded — loaded the first example instead." }]);
}

const editor = createEditor(els.editor, {
  doc: shared ?? presets[0].source,
  onChange: scheduleRun,
  onRun: () => void run(),
});

els.run.addEventListener("click", () => void run());
els.share.addEventListener("click", () => void share());

els.preset.addEventListener("change", () => {
  const preset = presets.find((p) => p.id === els.preset.value);
  if (!preset) return;
  setEditorDoc(editor, preset.source);
  // A preset is a fresh starting point, not the shared scene that was linked to.
  ownHash = "";
  history.replaceState(null, "", location.pathname + location.search);
  void run();
});

window.addEventListener("hashchange", () => {
  if (location.hash === ownHash) return;
  void (async () => {
    const source = await decodeSource(location.hash);
    if (!source) return;
    ownHash = location.hash;
    selectSharedOption();
    setEditorDoc(editor, source);
    void run();
  })();
});

els.copyInstall.addEventListener("click", () => {
  void navigator.clipboard.writeText("npm install -g sketchling").then(
    () => {
      els.copyInstall.textContent = "copied";
      setTimeout(() => (els.copyInstall.textContent = "copy"), 1200);
    },
    () => setStatus("could not copy — select the command by hand")
  );
});

document.addEventListener("keydown", (event) => {
  // The same shortcut CodeMirror binds inside the editor, so it also works from the render
  // pane or the toolbar.
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    void run();
  }
});

void run();
