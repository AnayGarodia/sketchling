import type { Point, SerializedNode } from "../core/types.js";
import { pathFromPoints } from "../core/geometry.js";
import { rotatePoint, project, faceNormal, normalize, dot, shadeHex, type Vec3 } from "../core/geometry3d.js";
import { roughOptionsFor, flatColorOf } from "./style.js";
import { SVG_NS, type BuildContext } from "./internal.js";

/**
 * Builds a mesh3d node's live re-sketching: unlike every other node (authored once, then
 * only its flat 2D transform animates), a rotating solid's on-screen SILHOUETTE changes
 * every frame — the projected 2D outline of each face, and which faces are even visible,
 * both depend on the current rotation. So this can't precompute paths once at build time
 * the way applyDrawOn's `cleanPathD` does; it registers an `onUpdate` on the mesh's own
 * spin3d tween (or renders the static pose once, if the mesh never spins) that clears and
 * redraws every face's rough.js path on each tick, in painter's-algorithm order (back to
 * front by average projected depth) so nearer faces correctly occlude farther ones.
 *
 * Faces whose outward normal points away from the camera (dot(normal, viewDir) >= 0, since
 * the camera looks down +z per project()'s convention) are skipped entirely — backface
 * culling, needed both for correctness (a solid's far faces shouldn't render as if
 * transparent) and so painter's-algorithm sorting never has to reconcile a front and back
 * face at roughly the same depth.
 */
export function buildMesh3D(node: SerializedNode, g: SVGGElement, ctx: BuildContext): void {
  const { rc, tl, sceneSeed, look } = ctx;
  const vertices = node.mesh3dVertices ?? [];
  const faces = node.mesh3dFaces ?? [];
  const focalLength = node.mesh3dFocalLength ?? 480;
  const lightDirRaw = node.mesh3dLightDir ?? [-0.5, -0.7, -0.4];
  const lightDir = normalize({ x: lightDirRaw[0], y: lightDirRaw[1], z: lightDirRaw[2] });
  const baseSeed = sceneSeed ^ node.seed;
  const baseColor = flatColorOf(node.style?.fill?.color, node.style?.color ?? "#8a8a8a");
  const strokeColor = node.style?.color ?? "#181511";

  const meshGroup = document.createElementNS(SVG_NS, "g");
  g.appendChild(meshGroup);

  const rotState = { rx: 0, ry: 0, rz: 0 };

  const redraw = () => {
    while (meshGroup.firstChild) meshGroup.removeChild(meshGroup.firstChild);

    const rxr = (rotState.rx * Math.PI) / 180;
    const ryr = (rotState.ry * Math.PI) / 180;
    const rzr = (rotState.rz * Math.PI) / 180;

    const rotated: Vec3[] = vertices.map(([x, y, z]) => rotatePoint(x, y, z, rxr, ryr, rzr));

    interface Renderable3 {
      d: string;
      color: string;
      avgZ: number;
    }
    const renderables: Renderable3[] = [];

    for (let fi = 0; fi < faces.length; fi++) {
      const face = faces[fi];
      const faceVerts = face.indices.map((i) => rotated[i]);
      if (faceVerts.length < 3) continue;

      const normal = faceNormal(faceVerts);
      // Camera looks down +z (see project()) from the -z side, so the view direction from
      // any point on the face toward the camera is roughly -z; a face whose normal has a
      // non-negative z component faces away and is skipped (backface cull).
      if (normal.z >= 0) continue;

      const projected = faceVerts.map((v) => project(v, focalLength));
      const points2d: Point[] = projected.map((p) => [p.x, p.y]);
      const d = pathFromPoints(points2d, true, false);

      const avgZ = faceVerts.reduce((s, v) => s + v.z, 0) / faceVerts.length;

      // Flat shading: how directly the face's normal opposes the light direction. A face
      // normal pointing straight at the light (dot = -1) is brightest; away (dot = 1) is
      // darkest. Clamped to a visible range so no face goes fully black/white.
      const lightAmount = -dot(normal, lightDir); // -1..1
      const shadeAmount = Math.max(-0.55, Math.min(0.45, lightAmount * 0.5));
      const color = face.color ? shadeHex(face.color, shadeAmount) : shadeHex(baseColor, shadeAmount);

      renderables.push({ d, color, avgZ });
    }

    // Painter's algorithm: farther faces (larger avgZ, since the camera sits on -z) paint
    // first, nearer faces paint over them.
    renderables.sort((a, b) => b.avgZ - a.avgZ);

    for (let i = 0; i < renderables.length; i++) {
      const r = renderables[i];
      const opts = roughOptionsFor(
        { color: strokeColor, weight: node.style?.weight, looseness: node.style?.looseness, energy: node.style?.energy },
        baseSeed + i * 7919,
        true,
        look
      );
      opts.fill = r.color;
      opts.fillStyle = "solid";
      const rendered = rc.path(r.d, opts);
      meshGroup.appendChild(rendered);
    }
  };

  redraw();

  // Every spin3d call gets its own tween on the SAME shared rotState — chaining several
  // (spin to A, then from wherever that lands, spin on to B) works the same way chained
  // moveBy/rotateTo calls do on any other node.
  for (const op of node.animations) {
    if (op.kind !== "spin3d") continue;
    const at = op.at ?? 0;
    const duration = op.duration ?? 1;
    tl.to(rotState, { rx: op.rx, ry: op.ry, rz: op.rz, duration, ease: op.ease ?? "sine.inOut", onUpdate: redraw }, at);
  }
}
