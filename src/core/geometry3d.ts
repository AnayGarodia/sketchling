// Pure 3D math — no DOM dependency (this module runs in the renderer's per-frame rebuild
// AND could run in plain Node for Tier 0 checks later), mirroring core/geometry.ts's own
// no-DOM rule. Everything here is intentionally minimal: rotation, perspective projection,
// and flat-face lighting — enough to sketch a genuine rotating solid, not a facade.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Rotates a point around the origin, X axis then Y then Z (order matters — this is the
 * convention `rotate3D`'s rx/ry/rz apply in, consistently, every call). Angles in radians. */
export function rotatePoint(x: number, y: number, z: number, rx: number, ry: number, rz: number): Vec3 {
  let px = x, py = y, pz = z;

  // X axis
  let cosA = Math.cos(rx), sinA = Math.sin(rx);
  const y1 = py * cosA - pz * sinA;
  const z1 = py * sinA + pz * cosA;
  py = y1; pz = z1;

  // Y axis
  cosA = Math.cos(ry); sinA = Math.sin(ry);
  const x2 = px * cosA + pz * sinA;
  const z2 = -px * sinA + pz * cosA;
  px = x2; pz = z2;

  // Z axis
  cosA = Math.cos(rz); sinA = Math.sin(rz);
  const x3 = px * cosA - py * sinA;
  const y3 = px * sinA + py * cosA;
  px = x3; py = y3;

  return { x: px, y: py, z: pz };
}

/** Perspective projection onto the local XY plane — camera conceptually sits on the -z
 * axis looking toward +z, `focalLength` is its distance from the origin (smaller = more
 * dramatic perspective, larger = flatter/more orthographic-like). Returns local (unscaled,
 * unplaced) 2D coordinates — the caller's own transform.x/y placement composes on top,
 * same as every other node's authored-point convention. */
export function project(p: Vec3, focalLength: number): { x: number; y: number; scale: number } {
  const denom = focalLength + p.z;
  const scale = denom > 1 ? focalLength / denom : focalLength; // guard against the camera-plane singularity
  return { x: p.x * scale, y: p.y * scale, scale };
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Outward-facing normal of a planar polygon face from its first three vertices — every
 * mesh3d factory (box3d, icosahedron3d) winds face indices counter-clockwise as seen from
 * outside, so this consistently points away from the solid's interior. */
export function faceNormal(verts: Vec3[]): Vec3 {
  const edge1 = subtract(verts[1], verts[0]);
  const edge2 = subtract(verts[2], verts[0]);
  return normalize(cross(edge1, edge2));
}

/** Lightens (positive) or darkens (negative) a hex color toward white/black — flat-shading
 * a face's base fill by how directly it catches the key light, the same idea a hand-inked
 * comic uses spot-blacks/highlights for, just computed instead of hand-placed. */
export function shadeHex(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const mix = (channel: number) => {
    const target = amount >= 0 ? 255 : 0;
    return Math.round(channel + (target - channel) * Math.abs(amount));
  };
  r = mix(r); g = mix(g); b = mix(b);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
