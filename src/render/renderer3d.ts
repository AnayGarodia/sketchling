import * as THREE from "three";
import gsap from "gsap";
import type { Point3, SerializedNode, SerializedScene } from "../core/types.js";
import type { MountResult } from "./renderer.js";
import { flatColorOf } from "./style.js";

/**
 * A second, genuinely separate rendering pipeline (WebGL/Three.js, not SVG/rough.js) for
 * scenes with `look: "lit3d"` or `look: "toon3d"` — real directional + ambient lighting and
 * cast shadows on mesh3d nodes, driven by the exact same spin3d/moveTo/moveBy/scaleTo/squashTo
 * ops as the ink/flat/clay/watercolor pipeline. Scoped honestly: only mesh3d nodes have a 3D
 * representation, so this renders those and ignores every 2D-only node (stroke, blob,
 * limb, text) in the same scene — a scene mixing both still serializes and lints
 * normally, but its 2D content simply doesn't appear in a lit3d/toon3d render. This is "lit 3D
 * rendering," not photorealism: one key light, one fill light, PCF soft shadows,
 * MeshStandardMaterial — real-time WebGL, not a path tracer. "toon3d" is this same pipeline
 * with MeshToonMaterial and a 4-step gradient map instead — same camera, same lights, same
 * shadows, just a stepped instead of continuous response to them.
 *
 * Driven the same way the SVG pipeline drives GSAP: a paused timeline, seek to a time,
 * render exactly one frame, screenshot. Never a requestAnimationFrame loop — the CLI's
 * screenshot is taken from whatever the canvas last painted, and a WebGL canvas needs
 * `preserveDrawingBuffer: true` (set below) for a screenshot taken outside its own render
 * callback to see anything at all instead of a black frame.
 */
export function mountLit3D(scene: SerializedScene, container: HTMLElement): MountResult {
  const width = scene.viewportWidth;
  const height = scene.viewportHeight;
  const isToon = scene.look === "toon3d";
  const toonGradientMap = isToon ? buildToonGradientMap() : null;

  const canvas = document.createElement("canvas");
  container.innerHTML = "";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color(backgroundColorOf(scene));

  // World coordinates: worldY = height - screenY, so "screen down" (larger screenY) is
  // "world down" (smaller worldY) — Three.js's default Y-up camera needs no extra flip
  // once every placement below goes through this same convention.
  //
  // A scene authored for the flat 2D pipeline routinely moves an object well outside its
  // own on-screen silhouette's static bbox (a jump's arc, a tumble's hop) without ever
  // clipping there, because the 2D canvas has no "camera" at all — every world coordinate
  // is always in frame. A 3D perspective camera needs real headroom for that same motion,
  // so it's framed against a taller virtual height than the scene's own, not height
  // itself (verified: framing at literal height clipped the die mid-hop in tumble.ts).
  const fovDeg = 32;
  const framedHeight = height * 1.6;
  const distance = framedHeight / 2 / Math.tan((fovDeg * Math.PI) / 180 / 2);
  const camera = new THREE.PerspectiveCamera(fovDeg, width / height, distance * 0.05, distance * 20);
  camera.position.set(width / 2, height / 2, distance);
  camera.lookAt(width / 2, height / 2, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  threeScene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(width / 2 - distance * 0.4, height / 2 + distance * 0.5, distance * 0.7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = distance * 0.1;
  key.shadow.camera.far = distance * 3;
  const shadowSpan = Math.max(width, height);
  key.shadow.camera.left = -shadowSpan;
  key.shadow.camera.right = shadowSpan;
  key.shadow.camera.top = shadowSpan;
  key.shadow.camera.bottom = -shadowSpan;
  key.target.position.set(width / 2, height / 2, 0);
  threeScene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbcd3ff, 0.35);
  fill.position.set(width / 2 + distance * 0.5, height / 2 - distance * 0.2, distance * 0.3);
  threeScene.add(fill);

  const tl = gsap.timeline({ paused: true });
  const meshEntries = collectMesh3DNodes(scene.children);

  // Ground plane rests just below the lowest mesh's own bounding radius at its starting
  // pose — scene-agnostic (no hardcoded "desk height"), rather than a guessed constant.
  let groundWorldY = height * 0.22; // scene-agnostic fallback if no mesh3d node exists at all
  const objects: THREE.Object3D[] = [];
  for (const { node } of meshEntries) {
    const radius = boundingRadius(node.mesh3dVertices ?? []);
    const startScreenX = node.transform.x;
    const startScreenY = node.transform.y;
    const startWorldY = height - startScreenY;
    groundWorldY = Math.min(groundWorldY, startWorldY - radius);
  }

  for (const { node } of meshEntries) {
    const mesh = buildMeshObject(node, toonGradientMap);
    if (isToon) mesh.add(buildToonOutline(mesh.geometry));
    threeScene.add(mesh);
    objects.push(mesh);
    driveNodeAnimations(mesh, node, tl, height);
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(width, height) * 4, Math.max(width, height) * 4),
    new THREE.ShadowMaterial({ opacity: 0.32 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(width / 2, groundWorldY, 0);
  ground.receiveShadow = true;
  threeScene.add(ground);

  const render = () => renderer.render(threeScene, camera);
  render();

  return {
    svg: canvas as unknown as SVGSVGElement, // MountResult's field name predates this backend; unused outside harness-entry.ts
    timeline: tl,
    seekTo: (t: number) => {
      tl.seek(t, false);
      render();
    },
    totalDuration: () => tl.duration(),
    // lit3d/toon3d doesn't collect sketch.sound() nodes yet — a genuinely separate pipeline
    // from buildSceneInto (see this file's own doc comment), not wired up to audio in this
    // first pass. Empty, not an error: a mesh3d-only scene with sound in it renders silently
    // rather than failing, same as any other "not on this pipeline yet" gap.
    soundEvents: [],
  };
}

function backgroundColorOf(scene: SerializedScene): string {
  const bg = scene.background;
  if (typeof bg === "string") return bg;
  return bg.stops[0]?.color ?? "#dfe3e8";
}

interface MeshEntry {
  node: SerializedNode;
}

function collectMesh3DNodes(nodes: SerializedNode[]): MeshEntry[] {
  const out: MeshEntry[] = [];
  for (const node of nodes) {
    if (node.type === "mesh3d") out.push({ node });
    if (node.children) out.push(...collectMesh3DNodes(node.children));
  }
  return out;
}

function boundingRadius(vertices: Point3[]): number {
  let max = 0;
  for (const [x, y, z] of vertices) max = Math.max(max, Math.hypot(x, y, z));
  return max || 1;
}

/** A 4-step grayscale ramp, NearestFilter so MeshToonMaterial samples hard bands instead of
 * blending between them — the actual "cel" in cel shading. Built once per lit3d/toon3d mount
 * and shared across every mesh in the scene (stateless, cheap, no reason to rebuild per-mesh). */
function buildToonGradientMap(): THREE.DataTexture {
  const steps = 4;
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) data[i] = Math.round((i / (steps - 1)) * 255);
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/** The standard inverted-hull outline trick: a second mesh sharing the same geometry,
 * rendered back-face-only and scaled up a few percent, so what shows through is a thin black
 * silhouette rim around the real (front-face) mesh — the ink outline a cel-shaded illustration
 * needs, which the gradient-map banding alone doesn't produce. Added as a *child* of the toon
 * mesh specifically (not a sibling in threeScene) so it inherits every animated transform
 * (spin3d, moveTo, scaleTo, squashTo — whatever driveNodeAnimations tweens on the parent) for
 * free through Three.js's own scene graph, with no separate GSAP tween to keep in sync. Shares
 * the parent's BufferGeometry by reference (no clone) since it only reads position data. */
function buildToonOutline(geometry: THREE.BufferGeometry): THREE.Mesh {
  const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0d0d0d, side: THREE.BackSide }));
  outline.scale.setScalar(1.04);
  outline.castShadow = false;
  outline.receiveShadow = false;
  return outline;
}

/** Non-indexed geometry with one uniform-colored vertex triple per triangle — flat per-face
 * shading and per-face color both need each face's vertices NOT shared with its neighbors
 * (shared vertices would Gouraud-blend colors and normals across the face boundary, which
 * reads as smooth-shaded plastic, not the crisp flat-shaded facets a die's faces need). */
function buildMeshObject(node: SerializedNode, toonGradientMap: THREE.DataTexture | null): THREE.Mesh {
  const vertices = node.mesh3dVertices ?? [];
  const faces = node.mesh3dFaces ?? [];
  const baseColorHex = flatColorOf(node.style?.fill?.color, node.style?.color ?? "#8a8a8a");
  const baseColor = new THREE.Color(baseColorHex);

  const positions: number[] = [];
  const colors: number[] = [];

  for (const face of faces) {
    const faceColor = face.color ? new THREE.Color(face.color) : baseColor;
    const idx = face.indices;
    // Fan triangulation — valid for the planar convex faces box3d/icosahedron3d/a
    // well-formed custom mesh3d produce.
    for (let i = 1; i < idx.length - 1; i++) {
      for (const vi of [idx[0], idx[i], idx[i + 1]]) {
        const [x, y, z] = vertices[vi];
        positions.push(x, y, z);
        colors.push(faceColor.r, faceColor.g, faceColor.b);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = toonGradientMap
    ? new THREE.MeshToonMaterial({
        vertexColors: true,
        gradientMap: toonGradientMap,
      })
    : new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.75,
        metalness: 0.05,
      });
  // flatShading isn't in MeshToonMaterialParameters' TS type (Material's own field, applied
  // generically by the shader builder regardless of material class), so set it post-construction
  // for the toon branch — same flat-per-face reasoning as the standard-material branch above.
  if (toonGradientMap) (material as unknown as { flatShading: boolean }).flatShading = true;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Drives an Object3D's transform from a serialized node's animation ops with the same
 * {at, duration, ease} semantics as the SVG pipeline, mapped onto Three.js's coordinate
 * convention (see mountLit3D's own worldY comment). spin3d maps directly onto
 * object.rotation.x/y/z — Three.js's default Euler order is "XYZ", matching
 * geometry3d.ts's rotatePoint exactly, so a given spin3d call produces the same visual
 * orientation in both backends. */
function driveNodeAnimations(obj: THREE.Object3D, node: SerializedNode, tl: gsap.core.Timeline, viewportHeight: number): void {
  obj.position.set(node.transform.x, viewportHeight - node.transform.y, 0);
  obj.scale.set(node.transform.scale, node.transform.scale, node.transform.scale);

  for (const op of node.animations) {
    const at = op.at ?? 0;
    switch (op.kind) {
      case "moveTo":
        tl.to(obj.position, { x: op.x, y: viewportHeight - op.y, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "moveBy":
        tl.to(obj.position, { x: `+=${op.dx}`, y: `-=${op.dy}`, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "scaleTo":
        tl.to(obj.scale, { x: op.scale, y: op.scale, z: op.scale, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "squashTo":
        tl.to(obj.scale, { x: op.scaleX, y: op.scaleY, duration: op.duration ?? 0.3, ease: op.ease ?? "power2.out" }, at);
        break;
      case "rotateTo":
        // The node's flat on-screen rotation — the viewing (Z) axis, independent of
        // spin3d's own 3D orientation, same relationship as the SVG pipeline.
        tl.to(obj.rotation, { z: -(op.degrees * Math.PI) / 180, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "fadeTo":
        tl.to(obj as unknown as { opacity: number }, { opacity: op.opacity, duration: op.duration ?? 0.6, ease: op.ease ?? "power2.out" }, at);
        break;
      case "spin3d":
        tl.to(
          obj.rotation,
          {
            x: (op.rx * Math.PI) / 180,
            y: (op.ry * Math.PI) / 180,
            z: (op.rz * Math.PI) / 180,
            duration: op.duration ?? 1,
            ease: op.ease ?? "sine.inOut",
          },
          at
        );
        break;
      default:
        break; // drawOn, appear, morphTo, moveAlong: 2D-only, no 3D meaning here
    }
  }
}
