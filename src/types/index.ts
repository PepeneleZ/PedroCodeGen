export interface Point {
  x: number;
  y: number;
}

export interface Pose {
  id: string;
  name: string;
  x: number;
  y: number;
  heading?: number; // degrees
  color?: string; // hex color
}

export interface Path {
  id: string;
  name?: string;
  startPoseId: string;
  endPoseId: string;
  // Bezier curve control points (intermediate points, not the endpoints)
  controlPoint1?: Point;
  controlPoint2?: Point;
  type: 'line' | 'curve';
  // Heading interpolation mode
  headingInterpolation?: 'tangent' | 'constant' | 'linear';
  // Constant heading value for constant interpolation
  constantHeading?: number;
  // Override headings for start/end points
  startHeadingOverride?: number;
  endHeadingOverride?: number;
  // Path constraints
  timeoutConstraint?: number; // milliseconds
  tValueConstraint?: number; // 0.0-1.0
  velocityConstraint?: number; // inches/second
  translationalConstraint?: number; // inches
  brakingStrength?: number; // 0.1-5.0
}

export interface PathChain {
  id: string;
  name: string;
  startingPoseId?: string;
  poses: Pose[];
  paths: Path[];
}

// Keep ControlPoint as an alias for compatibility in components
export type ControlPoint = Pose;

export const FIELD_SIZE_INCHES = 144;
export const FIELD_HALF_SIZE = 72;
