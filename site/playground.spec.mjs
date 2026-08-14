// End-to-end checks for the playground: it has to actually transpile, evaluate, mount and
// draw a scene in a real browser, which is the one thing the library's Node-side unit tests
// can't cover. Run with `npm run test:site` (builds site/ first, needs Chromium installed:
// `npx playwright install chromium`).
//
// "Non-empty" is asserted on pixels, not on DOM node counts: a scene's SVG paths all exist
// from t=0 even though drawOn's mask hides them, so counting <path> elements would pass on a
// blank frame. Each check seeks the transport to mid-animation, screenshots the artwork
// itself, and measures how much of it differs from its own background.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { startServer } from "../scripts/serve-site.mjs";

const VIEWPORT = { width: 1280, height: 900 };
const RENDER_TIMEOUT_MS = 30_000;
// A scene mid-draw covers far more than this; the point of the threshold is to fail a frame
// that is uniformly one colour.
const MIN_INK_FRACTION = 0.01;

let server;
let baseUrl;
let browser;
let artifacts;

before(async () => {
  const started = await startServer();
  server = started.server;
  baseUrl = started.url;
  browser = await chromium.launch();
  artifacts = mkdtempSync(path.join(tmpdir(), "sketchling-playground-"));
  console.log(`playground screenshots: ${artifacts}`);
});

after(async () => {
  await browser?.close();
  server?.close();
});

function toBase64Url(text) {
  return Buffer.from(text, "utf-8").toString("base64url");
}

/** Opens the page and waits for its first render. Console errors and uncaught exceptions are
 * collected for the caller to assert on — a playground that renders but logs is still broken. */
async function open(hash = "") {
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));
  await page.goto(`${baseUrl}/${hash}`);
  await waitForRender(page, 0);
  return { page, errors };
}

async function renderCount(page) {
  return page.evaluate(() => Number(document.body.dataset.renders ?? 0));
}

async function waitForRender(page, previous) {
  await page.waitForFunction(
    (n) => Number(document.body.dataset.renders ?? 0) > n,
    previous,
    { timeout: RENDER_TIMEOUT_MS }
  );
  return page.evaluate(() => document.body.dataset.render);
}

/** Drives the real transport control rather than reaching into the player. */
async function seekFraction(page, fraction) {
  await page.evaluate((f) => {
    const scrub = document.getElementById("scrub");
    scrub.value = String(Math.round(f * Number(scrub.max)));
    scrub.dispatchEvent(new Event("input", { bubbles: true }));
  }, fraction);
}

/** Fraction of pixels that differ from the frame's own top-left pixel. Decoding happens back
 * inside the browser (an <img> plus a 2D canvas) to avoid a PNG-decoding dependency here. */
async function inkFraction(page, png) {
  return page.evaluate(async (dataUrl) => {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const [r0, g0, b0] = [data[0], data[1], data[2]];
    let different = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) > 24) different++;
    }
    return different / (data.length / 4);
  }, `data:image/png;base64,${png.toString("base64")}`);
}

/** Seeks to mid-animation, screenshots just the artwork, and reports how much of it is ink. */
async function captureArtwork(page, name) {
  await seekFraction(page, 0.7);
  const artwork = page.locator("#stage > svg, #stage > canvas");
  await artwork.waitFor({ state: "visible", timeout: RENDER_TIMEOUT_MS });
  const png = await artwork.screenshot();
  const file = path.join(artifacts, `${name}.png`);
  writeFileSync(file, png);
  return { file, ink: await inkFraction(page, png) };
}

describe("playground", () => {
  test("loads, renders the first example, and logs nothing", async () => {
    const { page, errors } = await open();
    assert.equal(await page.evaluate(() => document.body.dataset.render), "ok");

    const { file, ink } = await captureArtwork(page, "first-load");
    assert.ok(ink > MIN_INK_FRACTION, `first load looks blank (ink ${ink.toFixed(4)}, see ${file})`);

    assert.match(await page.textContent("#status"), /rendered in \d+ ms/);
    assert.equal(await page.isHidden("#diagnostics"), true, "a clean example should show no diagnostics");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("picking an example renders it exactly once", async () => {
    const { page, errors } = await open();
    const before = await renderCount(page);
    await page.selectOption("#preset", "clay-bounce");
    await waitForRender(page, before);
    // Longer than the keystroke debounce: setting the document programmatically is a change
    // like any other, so a second render would land here if run() didn't cancel it.
    await page.waitForTimeout(1200);
    assert.equal(await renderCount(page), before + 1);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("with auto-run off, only the Run button renders", async () => {
    const { page, errors } = await open();
    await page.uncheck("#autorun");
    const before = await renderCount(page);
    await page.click(".cm-content");
    await page.keyboard.type("\n// edited\n");
    await page.waitForTimeout(1200);
    assert.equal(await renderCount(page), before, "a keystroke should not render with auto-run off");

    await page.click("#run");
    await waitForRender(page, before);
    assert.equal(await page.evaluate(() => document.body.dataset.render), "ok");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("every example in the picker renders non-empty artwork", async () => {
    const { page, errors } = await open();
    const ids = await page.$$eval("#preset option", (options) => options.map((o) => o.value));
    assert.ok(ids.length >= 6, `expected at least 6 presets, got ${ids.length}`);

    for (const id of ids) {
      const before = await renderCount(page);
      await page.selectOption("#preset", id);
      const state = await waitForRender(page, before);
      assert.equal(state, "ok", `${id} did not render`);

      const { file, ink } = await captureArtwork(page, id);
      assert.ok(ink > MIN_INK_FRACTION, `${id} looks blank (ink ${ink.toFixed(4)}, see ${file})`);

      const errorRows = await page.$$eval("#diagnostics p.error", (rows) => rows.map((r) => r.textContent));
      assert.deepEqual(errorRows, [], `${id} reported errors`);
    }

    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a share link restores the scene it was made from", async () => {
    const { page } = await open();
    const before = await renderCount(page);
    await page.selectOption("#preset", "coffee-steam");
    await waitForRender(page, before);
    await page.click("#share");
    await page.waitForFunction(() => location.hash.length > 1);
    const hash = await page.evaluate(() => location.hash);
    await page.close();

    const restored = await open(hash);
    const source = await restored.page.textContent(".cm-content");
    assert.match(source, /Coffee — motion after the pen stops/);
    assert.equal(await restored.page.inputValue("#preset"), "__shared");
    assert.equal(await restored.page.evaluate(() => document.body.dataset.render), "ok");
    assert.deepEqual(restored.errors, []);
    await restored.page.close();
  });

  test("a broken edit reports an error and keeps the last good frame", async () => {
    const { page, errors } = await open();
    const before = await captureArtwork(page, "before-break");
    assert.ok(before.ink > MIN_INK_FRACTION);

    const renders = await renderCount(page);
    await page.click(".cm-content");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
    await page.keyboard.type('import { sketch } from "sketchling";\nsketch.scene({ width: 200 });\nnotDefinedAnywhere;\n');
    assert.equal(await waitForRender(page, renders), "failed");

    assert.equal(await page.isHidden("#diagnostics"), false);
    const errorRows = await page.$$eval("#diagnostics p.error", (rows) => rows.map((r) => r.textContent));
    assert.equal(errorRows.length, 1);
    assert.match(errorRows[0], /notDefinedAnywhere/);

    // The previous render is still on screen — a failing edit must never blank the pane.
    const after = await captureArtwork(page, "after-break");
    assert.ok(after.ink > MIN_INK_FRACTION, `pane went blank after a failed run (see ${after.file})`);

    // Uncaught page errors would mean the failure escaped the app's own handling; the run
    // itself is expected to fail.
    assert.deepEqual(errors.filter((message) => message.startsWith("uncaught:")), []);
    await page.close();
  });

  test("a scene the linter dislikes still renders, with the finding shown", async () => {
    const source = `import { sketch } from "sketchling";
const scene = sketch.scene({ width: 300, height: 300, background: "#f0ead8", seed: "off-canvas" });
const stray = sketch.blob(900, 150, 40, { color: "#222", fill: { color: "#c1673f", style: "solid" } });
scene.add(stray).drawOn({ at: 0, duration: 0.5 });
const inside = sketch.blob(150, 150, 60, { color: "#222", fill: { color: "#4c7a4f", style: "solid" } });
scene.add(inside).drawOn({ at: 0.6, duration: 0.5 });
export default scene;
`;
    const { page, errors } = await open(`#src=${toBase64Url(source)}`);
    assert.equal(await page.evaluate(() => document.body.dataset.render), "ok");
    const rows = await page.$$eval("#diagnostics p", (items) => items.map((item) => item.textContent));
    assert.ok(
      rows.some((row) => /canvas/i.test(row)),
      `expected an off-canvas finding, got ${JSON.stringify(rows)}`
    );
    const { file, ink } = await captureArtwork(page, "lint-warning");
    assert.ok(ink > MIN_INK_FRACTION, `expected a render despite the finding (see ${file})`);
    assert.deepEqual(errors, []);
    await page.close();
  });
});
