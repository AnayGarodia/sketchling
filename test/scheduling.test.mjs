import assert from "node:assert/strict";
import test from "node:test";
import { sketch } from "../dist/index.js";

test("scene.label + a plain 'label' at resolves to the declared second", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.label("liftoff", 2.5);
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box).rotateTo(45, { at: "liftoff", duration: 0.5 });
  const serialized = scene.serialize();
  assert.equal(serialized.children[0].animations[0].at, 2.5);
});

test("'label+N' and 'label-N' resolve with the offset applied", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.label("mark", 2.5);
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box);
  box.rotateTo(1, { at: "mark+0.6" });
  box.rotateTo(2, { at: "mark-0.4" });
  box.rotateTo(3, { at: "mark + 1.1" }); // whitespace around the operator is tolerated
  const [a, b, c] = scene.serialize().children[0].animations;
  assert.ok(Math.abs(a.at - 3.1) < 1e-9);
  assert.ok(Math.abs(b.at - 2.1) < 1e-9);
  assert.ok(Math.abs(c.at - 3.6) < 1e-9);
});

test("a label can be declared after the op that references it — resolution happens once, at serialize()", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box).rotateTo(45, { at: "later" });
  scene.label("later", 4);
  assert.equal(scene.serialize().children[0].animations[0].at, 4);
});

test("an unknown label throws a clear error instead of resolving to NaN", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box).rotateTo(45, { at: "typo" });
  assert.throws(() => scene.serialize(), /Unknown label "typo"/);
});

test("a malformed 'at' string throws", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  scene.add(box).rotateTo(45, { at: "not valid!!" });
  assert.throws(() => scene.serialize(), /Invalid "at" value/);
});

test("camera ops resolve labels the same way node animations do", () => {
  const scene = sketch.scene({ width: 200, height: 200 });
  scene.label("pan-start", 3);
  scene.camera().panTo(100, 100, { at: "pan-start+0.2" });
  const cam = scene.serialize().camera;
  assert.ok(Math.abs(cam[0].at - 3.2) < 1e-9);
});

test("node.endAt is 0 before any animation is added", () => {
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  assert.equal(box.endAt, 0);
});

test("node.endAt uses the explicit duration when one is given", () => {
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  box.moveTo(50, 50, { at: 1, duration: 2 });
  assert.equal(box.endAt, 3);
});

test("node.endAt falls back to the same default duration the renderer actually uses", () => {
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  box.rotateTo(45, { at: 1 }); // no explicit duration -> renderer's own 0.6 default
  assert.equal(box.endAt, 1.6);
});

test("node.endAt chains correctly across multiple calls", () => {
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  box.moveTo(50, 50, { at: 0, duration: 1 });
  box.rotateTo(45, { at: box.endAt, duration: 0.5 });
  box.fadeTo(0.5, { at: box.endAt, duration: 0.25 });
  assert.equal(box.endAt, 1.75);
});

test("node.endAt estimates drawOn's auto-duration from path length when none is given", () => {
  const box = sketch.stroke([[0, 0], [300, 0]]); // 300px straight line
  box.drawOn({ at: 0 });
  // 300px / 300px-per-second pen speed = 1s, clamped to [0.45, 2.2] — see drawon.ts.
  assert.ok(Math.abs(box.endAt - 1) < 1e-9, `expected ~1, got ${box.endAt}`);
});

test("node.endAt throws when the last op's own 'at' is still an unresolved label", () => {
  const box = sketch.loop([[80, 80], [120, 80], [120, 120], [80, 120]], { smooth: false });
  box.rotateTo(45, { at: "someLabel" });
  assert.throws(() => box.endAt, /still the label reference "someLabel"/);
});
