import * as THREE from "three";
import gsap from "gsap";
import type { Point3, SerializedNode, SerializedScene } from "../core/types.js";
import type { MountResult } from "./renderer.js";

/**
 * A second, genuinely separate rendering pipeline (WebGL/Three.js, not SVG/rough.js) for
 * scenes with `look: "lit3d"` — real directional + ambient lighting and cast shadows on
 * mesh3d nodes, driven by the exact same spin3d/moveTo/moveBy/scaleTo/squashTo ops as the
 * ink/flat/clay/watercolor pipeline. Scoped honestly: only mesh3d nodes have a 3D
 * representation, so this renders those and ignores every 2D-only node (stroke, blob,
 * limb, text) in the same scene — a scene mixing both still serializes and lints
 * normally, but its 2D content simply doesn't appear in a lit3d render. This is "lit 3D
 * rendering," not photorealism: one key light, one fill light, PCF soft shadows,
 * MeshStandardMaterial — real-time WebGL, not a path tracer.
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
    const mesh = buildMeshObject(node);
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

/** Non-indexed geometry with one uniform-colored vertex triple per triangle — flat per-face
 * shading and per-face color both need each face's vertices NOT shared with its neighbors
 * (shared vertices would Gouraud-blend colors and normals across the face boundary, which
 * reads as smooth-shaded plastic, not the crisp flat-shaded facets a die's faces need). */
function buildMeshObject(node: SerializedNode): THREE.Mesh {
  const vertices = node.mesh3dVertices ?? [];
  const faces = node.mesh3dFaces ?? [];
  const baseColorHex = node.style?.fill?.color ?? node.style?.color ?? "#8a8a8a";
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

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.75,
    metalness: 0.05,
  });

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
