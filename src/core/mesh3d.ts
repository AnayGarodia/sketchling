import { SketchNode } from "./node.js";
import type { NodeStyle, Point3, TimingOpts } from "./types.js";
import { hashSeed } from "./geometry.js";

export interface Mesh3DFace {
  indices: number[]; // into Mesh3D.vertices, wound counter-clockwise as seen from outside
  color?: string; // overrides the mesh's own style.fill.color for this one face
}

/**
 * A rotating solid, sketched as a set of flat-shaded rough.js faces rather than smooth
 * shaded triangles — this is the genre this library draws in (hand-inked, not photoreal),
 * so a 3D primitive still needs to look drawn: each face is its own loosely-sketched
 * outline with a flat fill, the same visual language as every 2D shape here, just placed
 * in 3D and reprojected every frame instead of authored once. Non-intersecting geometry
 * only — faces are painter's-algorithm sorted by depth, which has no way to resolve two
 * meshes (or a mesh's own faces) that interpenetrate.
 */
export class Mesh3D extends SketchNode {
  readonly type = "mesh3d" as const;
  vertices: Point3[];
  faces: Mesh3DFace[];
  focalLength: number;
  // Current-key light direction (unit-ish vector, normalized in the renderer) — where the
  // "sun" is, in the mesh's own local space, for per-face flat shading.
  lightDir: Point3;

  constructor(vertices: Point3[], faces: Mesh3DFace[], style: NodeStyle = {}, focalLength = 480) {
    super(style);
    this.vertices = vertices;
    this.faces = faces;
    this.focalLength = focalLength;
    this.lightDir = [-0.5, -0.7, -0.4];
  }

  /** Absolute-target rotation in degrees (matches rotateTo's convention) — animates the
   * mesh's actual 3D orientation, distinct from rotateTo, which still spins the mesh's
   * flat on-screen placement like any other node. */
  spin3d(rx: number, ry: number, rz: number, opts: TimingOpts = {}): this {
    this.animations.push({ kind: "spin3d", rx, ry, rz, ...opts });
    return this;
  }
}

function box(w: number, h: number, d: number): { vertices: Point3[]; faces: Mesh3DFace[] } {
  const x = w / 2, y = h / 2, z = d / 2;
  const vertices: Point3[] = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], // back face 0-3
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], // front face 4-7
  ];
  // Winding is CCW as seen from outside each face (verified against faceNormal + the
  // renderer's backface-cull convention: camera sits on the -z side per project(), so -z
  // is "near"/toward the viewer and +z is "far"/away).
  const faces: Mesh3DFace[] = [
    { indices: [4, 5, 6, 7] }, // far    (+z, away from the default camera position)
    { indices: [1, 0, 3, 2] }, // near   (-z, facing the default camera position)
    { indices: [0, 4, 7, 3] }, // left   (-x)
    { indices: [5, 1, 2, 6] }, // right  (+x)
    { indices: [0, 1, 5, 4] }, // top    (-y, screen-up)
    { indices: [7, 6, 2, 3] }, // bottom (+y, screen-down)
  ];
  return { vertices, faces };
}

/** A box mesh, centered on its own origin (place it via moveTo/moveBy like any node). */
export function box3d(w: number, h: number, d: number, style: NodeStyle = {}): Mesh3D {
  const { vertices, faces } = box(w, h, d);
  return new Mesh3D(vertices, faces, style);
}

const PHI = (1 + Math.sqrt(5)) / 2;

/** A 20-face icosahedron — the roundest-looking solid cheaply available from flat faces,
 * useful wherever a spinning "orb" reads better than a boxy solid. */
export function icosahedron3d(radius: number, style: NodeStyle = {}): Mesh3D {
  const raw: Point3[] = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ];
  const scale = radius / Math.sqrt(1 + PHI * PHI);
  const vertices: Point3[] = raw.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
  const faceIdx = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const faces: Mesh3DFace[] = faceIdx.map((indices) => ({ indices }));
  return new Mesh3D(vertices, faces, style);
}

let meshAutoId = 0;
export function nextMeshSeed(): number {
  return hashSeed(`mesh${meshAutoId++}`);
}
