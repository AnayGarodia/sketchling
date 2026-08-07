export type Point = [number, number];

export type Weight = "light" | "confident" | "bold" | number;
export type Energy = "calm" | "quick" | "frantic";
export type FillStyle = "hachure" | "cross-hatch" | "solid" | "zigzag" | "dots" | "none";

export interface StrokeStyle {
  color?: string;
  weight?: Weight;
  looseness?: number; // 0 (precise) .. 1 (wild) — feeds both shape irregularity and render jitter
  energy?: Energy;
  smooth?: boolean; // true: spline through points (organic). false: straight edges (boxes, wedges)
}

export interface FillDef {
  color: string;
  style?: FillStyle;
  density?: number; // 0..1, maps to hachure gap
  angle?: number; // degrees
}

export interface NodeStyle extends StrokeStyle {
  fill?: FillDef;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  pivot?: Point; // absolute canvas-space anchor for rotate/scale (default: the shape's own center)
}

export interface TimingOpts {
  at?: number;
  duration?: number;
  ease?: string;
  delay?: number;
}

export type AnimOp =
  | ({ kind: "drawOn" } & TimingOpts)
  | ({ kind: "appear" } & TimingOpts)
  | ({ kind: "moveTo"; x: number; y: number } & TimingOpts)
  | ({ kind: "moveBy"; dx: number; dy: number } & TimingOpts)
  | ({ kind: "scaleTo"; scale: number } & TimingOpts)
  | ({ kind: "rotateTo"; degrees: number } & TimingOpts)
  | ({ kind: "fadeTo"; opacity: number } & TimingOpts);

export interface SerializedNode {
  id: string;
  type: "stroke" | "blob" | "group";
  points?: Point[];
  closed?: boolean;
  style?: NodeStyle;
  transform: Transform;
  animations: AnimOp[];
  seed: number;
  children?: SerializedNode[];
}

export interface SerializedScene {
  width: number;
  height: number;
  background: string;
  seed: number;
  children: SerializedNode[];
}
