import assert from "node:assert/strict";
import test from "node:test";
import { inspectRenderable, sketch, validateRenderable } from "../dist/index.js";

test("named nodes survive serialization and inspection", () => {
  const scene = sketch.scene({ width: 320, height: 180, seed: "agent-contract" });
  scene.add(sketch.loop([[10, 20], [110, 20], [110, 80]], { smooth: false }).named("main-card"));

  const manifest = inspectRenderable(scene.serialize());
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.scenes[0].nodes[0].label, "main-card");
  assert.deepEqual(manifest.scenes[0].nodes[0].bounds, { minX: 10, minY: 20, maxX: 110, maxY: 80 });
});

test("validation reports unsupported 3D behavior rather than silently dropping it", () => {
  const scene = sketch.scene({ width: 320, height: 180, look: "toon3d", texture: "grain" });
  scene.add(sketch.stroke([[10, 10], [30, 30]]).named("caption-stroke"));
  scene.add(sketch.box3d(30, 30, 30).moveAlong([[20, 20], [50, 50]]).named("hero-mesh"));

  const findings = validateRenderable(scene.serialize());
  assert.ok(findings.some((finding) => finding.code === "unsupported-3d-texture"));
  assert.ok(findings.some((finding) => finding.code === "unsupported-3d-node" && finding.nodeLabel === "caption-stroke"));
  assert.ok(findings.some((finding) => finding.code === "unsupported-3d-animation" && finding.nodeLabel === "hero-mesh"));
});

test("validation makes invalid animation timing actionable", () => {
  const scene = sketch.scene();
  scene.add(sketch.stroke([[0, 0], [10, 10]]).named("bad-timing").drawOn({ at: -0.2 }));
  const findings = validateRenderable(scene.serialize());
  assert.ok(findings.some((finding) => finding.code === "invalid-timing" && finding.nodeLabel === "bad-timing"));
});
