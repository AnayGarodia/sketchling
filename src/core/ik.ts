// Closed-form 2-bone IK — no DOM dependency, mirrors geometry.ts/geometry3d.ts's own rule.
// Used to solve a leg/arm's joint (knee/elbow) angle from a root position and an end-effector
// target, instead of hand-tuning rotateTo degrees per limb per pose.

export interface TwoBoneSolution {
  jointX: number;
  jointY: number;
  endX: number;
  endY: number;
}

/**
 * Solves the joint position that places a 2-segment chain's end at `targetX/targetY`,
 * given fixed segment lengths `len1` (root→joint) and `len2` (joint→end) from a fixed
 * `rootX/rootY`. `bend` picks which of the two valid elbow/knee solutions: 1 bends the
 * joint to the left of the root→target line, -1 to the right (screen-space: for a leg
 * hanging down with target below the hip, bend 1 knees forward/right, -1 forward/left —
 * pick whichever reads correctly for the limb's own orientation and check with a render).
 * A target beyond reach (or closer than the segments can fold to) is clamped onto the
 * chain's own reachable annulus rather than producing NaN — a swing arc that briefly
 * overshoots the chain's length still resolves to a fully-extended limb, not a crash.
 */
export function solveTwoBoneIK(
  rootX: number,
  rootY: number,
  targetX: number,
  targetY: number,
  len1: number,
  len2: number,
  bend: 1 | -1 = 1
): TwoBoneSolution {
  let dx = targetX - rootX;
  let dy = targetY - rootY;
  let d = Math.hypot(dx, dy);

  const maxReach = len1 + len2 - 1e-3;
  const minReach = Math.abs(len1 - len2) + 1e-3;
  if (d > maxReach) {
    const s = maxReach / d;
    dx *= s;
    dy *= s;
    d = maxReach;
  } else if (d < minReach) {
    const s = d > 1e-6 ? minReach / d : 1;
    dx *= s;
    dy *= s;
    d = minReach;
  }

  const endX = rootX + dx;
  const endY = rootY + dy;

  const baseAngle = Math.atan2(dy, dx);
  const cosA = (len1 * len1 + d * d - len2 * len2) / (2 * len1 * d);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const angle1 = baseAngle + bend * a;

  const jointX = rootX + len1 * Math.cos(angle1);
  const jointY = rootY + len1 * Math.sin(angle1);

  return { jointX, jointY, endX, endY };
}
