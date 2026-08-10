import assert from "node:assert/strict";
import test from "node:test";
import { sketch } from "../dist/index.js";
import { lintScene } from "../dist/lint/lint.js";

const lint = (scene) => lintScene(scene.serialize());
const messages = (findings) => findings.map((f) => `${f.level}: ${f.message}`).join("\n");

test("a sane centered composition lints clean", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false }));
  assert.deepEqual(lint(scene), []);
});

test("fully off-canvas shapes are errors", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.stroke([[300, 300], [340, 340]]));
  const findings = lint(scene);
  assert.ok(
    findings.some((f) => f.level === "error" && f.message.includes("fully off-canvas")),
    messages(findings)
  );
});

test("static transform offsets count toward off-canvas detection", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.stroke([[90, 90], [110, 110]]).initial({ x: 400, y: 0 }));
  const findings = lint(scene);
  assert.ok(findings.some((f) => f.level === "error" && f.message.includes("fully off-canvas")), messages(findings));
});

test("mostly off-canvas shapes warn with a visibility percentage", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.stroke([[150, 90], [350, 110]]));
  const findings = lint(scene);
  assert.ok(findings.some((f) => f.level === "warn" && f.message.includes("mostly off-canvas")), messages(findings));
});

test("a fully-visible axis-aligned line does not false-positive as off-canvas", () => {
  // Regression pin for the zero-area bbox case the visibility check special-cases:
  // a perfectly vertical stroke has w=0, so area-based visibility used to read as 0%.
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.stroke([[100, 40], [100, 160]]));
  const findings = lint(scene);
  assert.ok(!findings.some((f) => f.message.includes("off-canvas")), messages(findings));
});

test("degenerate near-zero-area shapes warn", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.stroke([[100, 100], [100.1, 100.1]]));
  const findings = lint(scene);
  assert.ok(findings.some((f) => f.level === "warn" && f.message.includes("degenerate")), messages(findings));
});

test("shapes with fewer than 2 points are errors", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.stroke([[100, 100]]));
  const findings = lint(scene);
  assert.ok(findings.some((f) => f.level === "error" && f.message.includes("fewer than 2 points")), messages(findings));
});

test("heavy overlap warns", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.loop([[60, 60], [140, 60], [140, 140], [60, 140]], { smooth: false }));
  scene.add(sketch.loop([[65, 65], [135, 65], [135, 135], [65, 135]], { smooth: false }));
  const findings = lint(scene);
  assert.ok(findings.some((f) => f.level === "warn" && f.message.includes("overlap heavily")), messages(findings));
});

test("an off-center composition is an info-level nudge, not an error", () => {
  const scene = sketch.scene({ width: 400, height: 400 });
  scene.add(sketch.loop([[10, 10], [60, 10], [60, 60], [10, 60]], { smooth: false }));
  const findings = lint(scene);
  const offCenter = findings.filter((f) => f.message.includes("off-center"));
  assert.equal(offCenter.length, 1, messages(findings));
  assert.equal(offCenter[0].level, "info");
});
