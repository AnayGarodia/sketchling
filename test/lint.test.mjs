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

test("a small shape nested in a much larger one demotes to an info-level containment note", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  // Container: 100x100. Nested detail: 10x10, fully inside — an eye-in-a-head shape, not
  // two things fighting for the same space.
  scene.add(sketch.loop([[50, 50], [150, 50], [150, 150], [50, 150]], { smooth: false }));
  scene.add(sketch.loop([[90, 90], [100, 90], [100, 100], [90, 100]], { smooth: false }));
  const findings = lint(scene);
  const overlapFindings = findings.filter((f) => f.message.includes("contained") || f.message.includes("overlap heavily"));
  assert.equal(overlapFindings.length, 1, messages(findings));
  assert.equal(overlapFindings[0].level, "info", messages(findings));
  assert.ok(overlapFindings[0].message.includes("contained"), messages(findings));
});

test(".lintIgnore('overlap') silences the overlap check on that node", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.add(sketch.loop([[60, 60], [140, 60], [140, 140], [60, 140]], { smooth: false }));
  scene.add(sketch.loop([[65, 65], [135, 65], [135, 135], [65, 135]], { smooth: false }).lintIgnore("overlap"));
  const findings = lint(scene);
  assert.ok(!findings.some((f) => f.message.includes("overlap")), messages(findings));
});

test("two overlapping rotateTo calls on the same node warn (the idle-sway + acting-gesture trap)", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box);
  box.rotateTo(5, { at: 0, duration: 2 });
  box.rotateTo(-10, { at: 1, duration: 1 });
  const findings = lint(scene);
  assert.ok(
    findings.some((f) => f.level === "warn" && f.message.includes('animate "rotation"')),
    messages(findings)
  );
});

test("overlapping moveBy calls on DIFFERENT axes (stride + bob) do not false-positive", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box);
  box.moveBy(20, 0, { at: 0, duration: 1 }); // stride: x only
  box.moveBy(0, -3, { at: 0, duration: 1 }); // bob: y only
  const findings = lint(scene);
  assert.ok(!findings.some((f) => f.message.includes("both animate")), messages(findings));
});

test("a back-to-back chained sequence at exact touching boundaries does not false-positive on float noise", () => {
  // 6.7 + 0.9 === 7.6000000000000005 in IEEE 754 — a real bug caught on
  // moonlit-lighthouse.ts's own deliberate three-call swing before this test existed.
  const scene = sketch.scene({ width: 200, height: 200 });
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box);
  box.rotateTo(-7, { at: 5.9, duration: 0.8 });
  box.rotateTo(5, { at: 6.7, duration: 0.9 });
  box.rotateTo(0, { at: 7.6, duration: 0.6 });
  const findings = lint(scene);
  assert.ok(!findings.some((f) => f.message.includes("both animate")), messages(findings));
});

test("an ikTo target beyond a limb's max reach warns", () => {
  const scene = sketch.scene({ width: 300, height: 300 });
  const arm = sketch.limb(150, 150, 30, 30, {}); // max reach 60
  scene.add(arm);
  arm.ikTo(150, 250); // 100px away
  const findings = lint(scene);
  assert.ok(
    findings.some((f) => f.level === "warn" && f.message.includes("max reach")),
    messages(findings)
  );
});

test("an ikTo target within reach stays clean", () => {
  const scene = sketch.scene({ width: 300, height: 300 });
  const arm = sketch.limb(150, 150, 30, 30, {});
  scene.add(arm);
  arm.ikTo(150, 200); // 50px, within 60px reach
  const findings = lint(scene);
  assert.ok(!findings.some((f) => f.message.includes("max reach")), messages(findings));
});

test("scene.duration(n) warns when an explicit-duration op runs past it", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.duration(5);
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box).moveBy(50, 0, { at: 4, duration: 3 });
  const findings = lint(scene);
  assert.ok(
    findings.some((f) => f.level === "warn" && f.message.includes("declared duration")),
    messages(findings)
  );
});

test("scene.duration(n) stays clean when nothing runs past it", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.duration(5);
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box).moveBy(50, 0, { at: 2, duration: 3 });
  const findings = lint(scene);
  assert.ok(!findings.some((f) => f.message.includes("declared duration")), messages(findings));
});

test("no scene.duration() call means the overrun check never fires", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box).moveBy(50, 0, { at: 100, duration: 300 });
  const findings = lint(scene);
  assert.ok(!findings.some((f) => f.message.includes("declared duration")), messages(findings));
});

test("an off-center composition is an info-level nudge, not an error", () => {
  const scene = sketch.scene({ width: 400, height: 400 });
  scene.add(sketch.loop([[10, 10], [60, 10], [60, 60], [10, 60]], { smooth: false }));
  const findings = lint(scene);
  const offCenter = findings.filter((f) => f.message.includes("off-center"));
  assert.equal(offCenter.length, 1, messages(findings));
  assert.equal(offCenter[0].level, "info");
});
