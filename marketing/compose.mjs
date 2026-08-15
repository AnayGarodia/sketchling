#!/usr/bin/env node
// Frame compositor for the sketchling "magic moment" clip.
//
// Everything in the final video except the illustration itself is generated here: the typed
// prompt, the streaming code listing, the frame the illustration sits in, and the end card.
// One HTML page is laid out once, then driven frame by frame from Node — every frame's state
// (opacities, how many characters are typed, the scroll offset, which rendered scene frame to
// show) is computed here and applied with a single page.evaluate, so nothing depends on wall
// clock time inside the browser and the same inputs always produce the same frames.
//
// Usage:
//   node marketing/compose.mjs --format 16x9 --code marketing/morning-plant.ts \
//     --scene-frames <dir of NNNNNN.png> --out <dir>
//
// The code listing is read from the scene file that was actually rendered, so the code on
// screen cannot drift from the animation it produced.

import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------------------
// Script / copy
// ---------------------------------------------------------------------------------------

const PROMPT = "illustrate a potted plant waking up in the morning sun";
const FILENAME = "morning-plant.ts";
const COMMAND = `sketchling render ${FILENAME} --video ${FILENAME.replace(/\.ts$/, ".mp4")} --fps 30`;
const END = {
  wordmark: "sketchling",
  tagline: "a hand-drawn animation language for LLMs",
  install: "npm install -g sketchling",
  url: "github.com/AnayGarodia/sketchling",
};

const FPS = 30;
const TOTAL = 30; // seconds
const DISSOLVE = 0.4; // seconds of crossfade at each phase boundary
const CUTS = { promptToCode: 4.0, codeToArt: 14.0, artToEnd: 28.0 };
const TIMING = {
  promptIn: [0.2, 0.8],
  promptType: [1.0, 3.15],
  codeIn: [4.05, 4.5],
  codeType: [4.7, 13.1],
  cmdIn: [13.15, 13.6],
  // The illustration's own clock starts as its frame is dissolving in — its first frame is
  // bare sky, so there is nothing to miss, and the first pen stroke lands on a settled frame.
  artStart: 13.95,
  endIn: [28.05, 28.7],
};

// ---------------------------------------------------------------------------------------
// Layout per output format. Every number is in output pixels.
// ---------------------------------------------------------------------------------------

const LAYOUTS = {
  "16x9": {
    W: 1920,
    H: 1080,
    brandSize: 15,
    promptPanelW: 1180,
    promptPad: "48px 56px",
    promptSize: 30,
    code: { x: 236, y: 118, w: 1448, h: 872, headerSize: 19, headerY: 58, barH: 46, pad: 26, gutter: 56, cmdSize: 18, cmdY: 1016 },
    art: { x: 256, y: 74, w: 1408, h: 880, labelSize: 17, labelY: 986 },
    end: { rule: 64, wordmark: 76, tagline: 27, install: 22, url: 18 },
  },
  "1x1": {
    W: 1080,
    H: 1080,
    brandSize: 14,
    promptPanelW: 940,
    promptPad: "40px 44px",
    promptSize: 23,
    code: { x: 40, y: 190, w: 1000, h: 700, headerSize: 17, headerY: 134, barH: 42, pad: 22, gutter: 48, cmdSize: 16, cmdY: 918 },
    art: { x: 40, y: 200, w: 1000, h: 625, labelSize: 16, labelY: 862 },
    end: { rule: 56, wordmark: 58, tagline: 22, install: 19, url: 16 },
  },
};

// ---------------------------------------------------------------------------------------
// A small TypeScript tokenizer — enough for one scene file, and deliberately restrained:
// keywords carry the single accent color, strings and types sit in the warm off-white
// family, everything else is one of three greys. No rainbow.
// ---------------------------------------------------------------------------------------

const KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "type", "return", "new",
  "true", "false", "null", "undefined", "as", "function", "of", "in", "if", "else",
]);

function tokenizeLine(line) {
  const out = [];
  let i = 0;
  const push = (cls, text) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.c === cls) last.t += text;
    else out.push({ c: cls, t: text });
  };
  while (i < line.length) {
    const rest = line.slice(i);
    let m;
    if ((m = /^\/\/.*$/.exec(rest))) {
      push("cm", m[0]);
      i += m[0].length;
    } else if ((m = /^"(?:[^"\\]|\\.)*"?/.exec(rest))) {
      push("st", m[0]);
      i += m[0].length;
    } else if ((m = /^\s+/.exec(rest))) {
      push("ws", m[0]);
      i += m[0].length;
    } else if ((m = /^-?\d+(?:\.\d+)?/.exec(rest))) {
      push("nu", m[0]);
      i += m[0].length;
    } else if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
      const word = m[0];
      const after = rest.slice(word.length);
      let cls = "id";
      if (KEYWORDS.has(word)) cls = "kw";
      else if (/^\s*:/.test(after) && !/^\s*::/.test(after)) cls = "pr";
      else if (/^[A-Z]/.test(word)) cls = "ty";
      else if (/^\(/.test(after)) cls = "fn";
      push(cls, word);
      i += word.length;
    } else {
      push("pu", rest[0]);
      i += 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// Easing / timing helpers
// ---------------------------------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};
const ramp = (t, [a, b]) => smooth((t - a) / (b - a));
/** Symmetric crossfade centred on a cut: 0 before, 1 after. */
const dissolve = (t, cut) => smooth((t - (cut - DISSOLVE / 2)) / DISSOLVE);

/** Characters typed by time `t`, with the typing rate accelerating `rampFactor`x from start
 * to finish — the way generated code lands: a considered first few lines, then a flood. */
function typedChars(t, [t0, t1], total, rampFactor) {
  if (t <= t0) return 0;
  if (t >= t1) return total;
  const p = (t - t0) / (t1 - t0);
  const a = 2 / (1 + rampFactor);
  return Math.floor(total * (a * p + (1 - a) * p * p));
}

const blink = (t) => (t % 1.06) < 0.63;

// ---------------------------------------------------------------------------------------
// Page: markup, style, and the one function that applies a frame's state
// ---------------------------------------------------------------------------------------

function pageHtml(L) {
  const { code: C, art: A, end: E } = L;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  :root {
    --bg: #0d0e10;
    --panel: #14161a;
    --hair: rgba(255,255,255,0.07);
    --ink: #e9e6e0;
    --dim: #7b8188;
    --dimmer: #5d646c;
    --accent: #e0a45e;
    --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace;
    --sans: -apple-system, "Helvetica Neue", "Segoe UI", Arial, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${L.W}px; height: ${L.H}px; overflow: hidden; }
  body { background: var(--bg); font-family: var(--mono); -webkit-font-smoothing: antialiased; }
  /* A single very soft warm pool of light behind everything, so the dark never reads flat. */
  #wash { position: absolute; inset: 0; background:
    radial-gradient(120% 90% at 50% 0%, rgba(224,164,94,0.055), rgba(224,164,94,0) 62%); }
  .layer { position: absolute; inset: 0; }
  .brand { font-size: ${L.brandSize}px; letter-spacing: 0.34em; text-transform: uppercase;
    color: var(--dimmer); }
  .ac { color: var(--accent); }

  /* --- prompt ------------------------------------------------------------------------ */
  #prompt { display: flex; align-items: center; justify-content: center; }
  #prompt .stack { width: ${L.promptPanelW}px; }
  #prompt .brand { margin: 0 0 22px 4px; }
  #prompt .panel { background: var(--panel); border: 1px solid var(--hair); border-radius: 16px;
    padding: ${L.promptPad}; box-shadow: 0 30px 90px rgba(0,0,0,0.55); }
  #prompt .line { font-size: ${L.promptSize}px; color: var(--ink); white-space: pre;
    letter-spacing: 0.005em; }
  #prompt .line .ac { margin-right: 0.62em; }

  /* --- code -------------------------------------------------------------------------- */
  #chead { position: absolute; left: ${C.x + 2}px; top: ${C.headerY}px; font-size: ${C.headerSize}px;
    color: var(--dim); white-space: pre; }
  #chead .ac { margin-right: 0.62em; }
  #cpanel { position: absolute; left: ${C.x}px; top: ${C.y}px; width: ${C.w}px; height: ${C.h}px;
    background: var(--panel); border: 1px solid var(--hair); border-radius: 14px;
    box-shadow: 0 30px 90px rgba(0,0,0,0.5); overflow: hidden; }
  #cbar { height: ${C.barH}px; border-bottom: 1px solid var(--hair); display: flex;
    align-items: center; padding: 0 ${C.pad}px; color: var(--dimmer);
    font-size: ${Math.round(C.headerSize * 0.86)}px; letter-spacing: 0.04em; }
  /* Inset rather than padded: overflow clips at the padding edge, so a padded box would let
     scrolled lines creep right up under the title bar. */
  #cbody { position: absolute; left: ${C.pad}px; right: ${C.pad}px; top: ${C.barH + C.pad}px;
    bottom: ${C.pad}px; overflow: hidden; }
  #cscroll { will-change: transform; }
  .crow { display: flex; white-space: pre; }
  .cln { width: ${C.gutter}px; flex: none; text-align: right; padding-right: 22px;
    color: var(--dimmer); opacity: 0.5; }
  .cco { color: #c8ccd2; }
  .cco .kw { color: var(--accent); }
  .cco .st { color: #e6dcc8; }
  .cco .ty { color: #d5c6a4; }
  .cco .fn { color: #d3d8de; }
  .cco .pr { color: #9aa1a9; }
  .cco .nu { color: #aeb6be; }
  .cco .pu { color: #6d747c; }
  .cco .cm { color: #6b7178; font-style: italic; }
  .caret { display: inline-block; width: 0.52em; background: var(--accent); opacity: 0.9; }
  #ccmd { position: absolute; left: ${C.x + 2}px; top: ${C.cmdY}px; font-size: ${C.cmdSize}px;
    color: var(--dim); white-space: pre; opacity: 0; }
  #ccmd .ac { margin-right: 0.62em; }

  /* --- artwork ----------------------------------------------------------------------- */
  #artframe { position: absolute; left: ${A.x}px; top: ${A.y}px; width: ${A.w}px; height: ${A.h}px;
    border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.09);
    box-shadow: 0 40px 110px rgba(0,0,0,0.6); background: #cdd8dd; }
  #artframe img { display: block; width: 100%; height: 100%; }
  #artlabel { position: absolute; left: 0; right: 0; top: ${A.labelY}px; text-align: center;
    font-size: ${A.labelSize}px; color: #6f767e; letter-spacing: 0.05em; }

  /* --- end card ---------------------------------------------------------------------- */
  #end { display: flex; align-items: center; justify-content: center; }
  #end .stack { text-align: center; }
  #end .rule { width: ${E.rule}px; height: 1px; background: var(--accent); opacity: 0.55;
    margin: 0 auto ${Math.round(E.wordmark * 0.5)}px; }
  #end .wordmark { font-family: var(--sans); font-size: ${E.wordmark}px; font-weight: 500;
    letter-spacing: -0.012em; color: #f2efe9; }
  #end .tagline { font-family: var(--sans); font-size: ${E.tagline}px; color: var(--dim);
    margin-top: ${Math.round(E.tagline * 0.7)}px; letter-spacing: 0.005em; }
  #end .install { display: inline-block; font-size: ${E.install}px; color: var(--accent);
    border: 1px solid rgba(224,164,94,0.3); border-radius: 999px;
    padding: ${Math.round(E.install * 0.6)}px ${Math.round(E.install * 1.3)}px;
    margin-top: ${Math.round(E.wordmark * 0.62)}px; }
  #end .url { font-size: ${E.url}px; color: #7f868e; margin-top: ${Math.round(E.url * 1.6)}px;
    letter-spacing: 0.03em; }
</style></head>
<body>
<div id="wash"></div>

<div class="layer" id="prompt"><div class="stack">
  <div class="brand">sketchling</div>
  <div class="panel"><div class="line"><span class="ac">&gt;</span><span id="ptext"></span><span
    class="caret" id="pcaret">&nbsp;</span></div></div>
</div></div>

<div class="layer" id="code">
  <div id="chead"><span class="ac">&gt;</span><span id="cheadtext"></span></div>
  <div id="cpanel">
    <div id="cbar">${FILENAME}</div>
    <div id="cbody"><div id="cscroll"></div></div>
  </div>
  <div id="ccmd"><span class="ac">$</span><span>${COMMAND}</span></div>
</div>

<div class="layer" id="art">
  <div id="artframe"><img id="artimg" alt=""></div>
  <div id="artlabel">${FILENAME}</div>
</div>

<div class="layer" id="end"><div class="stack">
  <div class="rule"></div>
  <div class="wordmark">${END.wordmark}</div>
  <div class="tagline">${END.tagline}</div>
  <div><span class="install">${END.install}</span></div>
  <div class="url">${END.url}</div>
</div></div>
</body></html>`;
}

/** Runs in the page. Builds the code rows once, then only mutates what a frame changes. */
function pageRuntime() {
  const $ = (id) => document.getElementById(id);
  const state = { rows: null, lines: null };

  window.__setup = (lines, fontSize, lineHeight) => {
    state.lines = lines;
    const scroll = $("cscroll");
    scroll.style.fontSize = fontSize + "px";
    scroll.style.lineHeight = lineHeight + "px";
    scroll.innerHTML = "";
    state.rows = lines.map((line, i) => {
      const row = document.createElement("div");
      row.className = "crow";
      const ln = document.createElement("span");
      ln.className = "cln";
      ln.textContent = String(i + 1);
      const co = document.createElement("span");
      co.className = "cco";
      row.appendChild(ln);
      row.appendChild(co);
      scroll.appendChild(row);
      return { row, ln, co };
    });
  };

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function paintCode(line, col) {
    state.rows.forEach((r, i) => {
      if (i > line) {
        r.row.style.visibility = "hidden";
        return;
      }
      r.row.style.visibility = "visible";
      const tokens = state.lines[i];
      let budget = i === line ? col : Infinity;
      let html = "";
      for (const tok of tokens) {
        if (budget <= 0) break;
        const text = tok.t.length <= budget ? tok.t : tok.t.slice(0, budget);
        budget -= text.length;
        html += tok.c === "ws" ? esc(text) : `<span class="${tok.c}">${esc(text)}</span>`;
      }
      if (i === line) html += '<span class="caret" id="ccaret">&nbsp;</span>';
      r.co.innerHTML = html;
    });
  }

  window.__frame = async (s) => {
    $("prompt").style.opacity = s.op.prompt;
    $("code").style.opacity = s.op.code;
    $("art").style.opacity = s.op.art;
    $("end").style.opacity = s.op.end;

    if (s.op.prompt > 0) {
      $("ptext").textContent = s.promptText;
      $("pcaret").style.visibility = s.promptCaret ? "visible" : "hidden";
    }
    if (s.op.code > 0) {
      $("cheadtext").textContent = s.promptFull;
      $("ccmd").style.opacity = s.cmdOpacity;
      paintCode(s.codeLine, s.codeCol);
      $("cscroll").style.transform = `translateY(${-s.codeScroll}px)`;
      // Both edges of the window fade, so a line half-scrolled past the top or cut off at the
      // bottom reads as a window onto a longer file rather than a chopped glyph. The top fade
      // only exists once the listing has actually started to scroll.
      $("cbody").style.maskImage =
        `linear-gradient(to bottom, transparent 0px, #000 ${s.codeTopFade}px, ` +
        `#000 calc(100% - 34px), transparent 100%)`;
      const caret = document.getElementById("ccaret");
      if (caret) caret.style.visibility = s.codeCaret ? "visible" : "hidden";
    }
    if (s.op.art > 0) {
      const img = $("artimg");
      if (img.dataset.src !== s.artSrc) {
        img.dataset.src = s.artSrc;
        img.src = s.artSrc;
        await img.decode().catch(() => {});
      }
    }
  };
}

// ---------------------------------------------------------------------------------------
// Frame state
// ---------------------------------------------------------------------------------------

function frameState(t, ctx) {
  const { lines, totalChars, visibleLines, lineHeight, artFrames } = ctx;

  const d1 = dissolve(t, CUTS.promptToCode);
  const d2 = dissolve(t, CUTS.codeToArt);
  const d3 = dissolve(t, CUTS.artToEnd);

  const op = {
    prompt: +(ramp(t, TIMING.promptIn) * (1 - d1)).toFixed(4),
    code: +(ramp(t, TIMING.codeIn) * d1 * (1 - d2)).toFixed(4),
    art: +(d2 * (1 - d3)).toFixed(4),
    end: +(ramp(t, TIMING.endIn) * d3).toFixed(4),
  };

  const pTyped = typedChars(t, TIMING.promptType, PROMPT.length, 1.5);
  const typingPrompt = t >= TIMING.promptType[0] && t < TIMING.promptType[1];

  const cTyped = typedChars(t, TIMING.codeType, totalChars, 5);
  const typingCode = t >= TIMING.codeType[0] && t < TIMING.codeType[1];

  // Character offset -> (line, column), plus a fractional line for sub-pixel scrolling.
  let line = 0;
  let col = 0;
  let left = cTyped;
  for (let i = 0; i < lines.length; i++) {
    const len = lines[i].len + 1; // + newline
    if (left < len) {
      line = i;
      col = Math.min(left, lines[i].len);
      break;
    }
    left -= len;
    line = i;
    col = lines[i].len;
  }
  const fracLine = line + (lines[line].len ? col / lines[line].len : 0);
  // The listing fills the window top-down and only starts to travel once the caret is three
  // lines off the bottom — scrolling any earlier leaves dead space under the caret.
  // +2 lines of overscroll so the file's last line settles clear of the bottom fade instead
  // of ending the phase half-dissolved.
  const maxScroll = Math.max(0, lines.length - visibleLines + 2);
  const scrollLines = Math.min(maxScroll, Math.max(0, fracLine - (visibleLines - 3)));

  const artIndex = Math.min(artFrames - 1, Math.max(0, Math.round((t - TIMING.artStart) * FPS)));

  return {
    op,
    promptText: PROMPT.slice(0, pTyped),
    promptCaret: typingPrompt || blink(t),
    promptFull: PROMPT,
    codeLine: line,
    codeCol: col,
    codeScroll: +(scrollLines * lineHeight).toFixed(2),
    codeTopFade: +Math.min(18, scrollLines * lineHeight).toFixed(2),
    codeCaret: typingCode || blink(t),
    cmdOpacity: +ramp(t, TIMING.cmdIn).toFixed(4),
    // Pinned to the first frame whenever the artwork is not on screen, so an otherwise
    // identical frame (the held end card) still dedupes instead of churning on the src.
    artSrc: ctx.artUrls[op.art > 0 ? artIndex : 0],
  };
}

// ---------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) out[argv[i].replace(/^--/, "")] = argv[i + 1];
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const format = args.format ?? "16x9";
  const L = LAYOUTS[format];
  if (!L) throw new Error(`unknown --format ${format} (expected 16x9 or 1x1)`);
  const codePath = path.resolve(args.code ?? path.join(HERE, "morning-plant.ts"));
  const sceneDir = path.resolve(args["scene-frames"]);
  const outDir = path.resolve(args.out);

  const source = readFileSync(codePath, "utf-8").replace(/\n+$/, "");
  const rawLines = source.split("\n");
  const lines = rawLines.map((l) => {
    const tokens = tokenizeLine(l);
    return { tokens, len: l.length };
  });
  const totalChars = lines.reduce((n, l) => n + l.len + 1, 0);
  const longest = Math.max(...rawLines.map((l) => l.length));

  // Type size is derived from the panel, not hand-picked: fill the height with ~27 lines of
  // context, then back off if the longest line would not fit the width.
  const C = L.code;
  const areaH = C.h - C.barH - C.pad * 2;
  const areaW = C.w - C.pad * 2 - C.gutter;
  const byHeight = areaH / 27 / 1.4;
  const byWidth = areaW / (longest + 3) / 0.601; // 0.601em per glyph in SF Mono/Menlo
  const fontSize = Math.floor(Math.min(byHeight, byWidth) * 10) / 10;
  const lineHeight = Math.round(fontSize * 1.4 * 10) / 10;
  const visibleLines = Math.floor(areaH / lineHeight);

  const sceneFiles = readdirSync(sceneDir).filter((f) => f.endsWith(".png")).sort();
  if (!sceneFiles.length) throw new Error(`no scene frames in ${sceneDir}`);
  const artUrls = sceneFiles.map((f) => pathToFileURL(path.join(sceneDir, f)).href);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const htmlPath = path.join(outDir, `_stage-${format}.html`);
  writeFileSync(htmlPath, pageHtml(L), "utf-8");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: L.W, height: L.H }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.addScriptTag({ content: `(${pageRuntime.toString()})()` });
  await page.evaluate(
    ([ls, fs, lh]) => window.__setup(ls, fs, lh),
    [lines.map((l) => l.tokens), fontSize, lineHeight]
  );

  const ctx = { lines, totalChars, visibleLines, lineHeight, artFrames: sceneFiles.length, artUrls };

  // --probe 1.8,6,12.5 renders just those timestamps, for looking at a layout without
  // sitting through 900 frames.
  if (args.probe) {
    for (const raw of args.probe.split(",")) {
      const t = Number(raw);
      await page.evaluate((s) => window.__frame(s), frameState(t, ctx));
      await page.screenshot({ path: path.join(outDir, `probe-${raw}.png`), type: "png" });
    }
    await browser.close();
    console.log(`  ${format}: probes -> ${outDir} (code ${lines.length} lines @ ${fontSize}px, ${visibleLines} visible)`);
    return;
  }

  const frameCount = Math.round(TOTAL * FPS);
  let reused = 0;
  let lastKey = null;
  let lastPath = null;

  for (let i = 0; i < frameCount; i++) {
    const t = i / FPS;
    const state = frameState(t, ctx);
    const key = JSON.stringify(state);
    const outPath = path.join(outDir, `${String(i).padStart(6, "0")}.png`);
    if (key === lastKey) {
      // Nothing on screen changed — reuse the previous frame instead of re-screenshotting.
      copyFileSync(lastPath, outPath);
      reused++;
    } else {
      await page.evaluate((s) => window.__frame(s), state);
      await page.screenshot({ path: outPath, type: "png" });
      lastKey = key;
      lastPath = outPath;
    }
    if (i % 60 === 0 || i === frameCount - 1) {
      process.stdout.write(`  ${format}: frame ${i + 1}/${frameCount}\r`);
    }
  }
  process.stdout.write("\n");
  await browser.close();
  console.log(
    `  ${format}: ${frameCount} frames (${reused} reused), code ${lines.length} lines @ ${fontSize}px, ` +
      `${visibleLines} visible, ${sceneFiles.length} scene frames`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
