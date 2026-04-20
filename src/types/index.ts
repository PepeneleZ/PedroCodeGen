export interface Point {
  x: number;
  y: number;
}

export interface Waypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  heading?: number; // degrees, robot heading at this waypoint
  color?: string; // hex color for waypoint and its outgoing path
}

export interface PathCallback {
  id: string;
  type: 'parametric' | 'temporal' | 'pose' | 'custom';
  // Parametric callback
  parametricPercent?: number; // 0.0-1.0 path completion
  // Temporal callback
  temporalMillis?: number; // milliseconds
  // Pose callback
  poseCallback?: Point & { heading: number };
  poseGuess?: number; // t-value guess for pose callback
  // Custom callback
  customCallbackCode?: string;
  // Common
  action: string;
  maxExecutions?: number; // default 1, -1 for unlimited
}

export interface Path {
  id: string;
  name?: string;
  startWaypointId: string;
  endWaypointId: string;
  // Bezier curve control points (intermediate points, not the endpoints)
  controlPoint1?: Point;
  controlPoint2?: Point;
  type: 'line' | 'curve';
  callbacks?: PathCallback[];
  // Heading interpolation mode
  headingInterpolation?: 'tangent' | 'constant' | 'linear';
  // Constant heading value for constant interpolation
  constantHeading?: number;
  // Override headings for start/end points (independent of waypoint headings)
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
  startingWaypointId?: string; // Required starting point
  waypoints: Waypoint[];
  paths: Path[];
  // Global deceleration settings
  globalDeceleration?: boolean;
  globalBrakingStrength?: number;
  brakingStart?: number; // when to start braking (0.0-1.0 of path chain)
  noDeceleration?: boolean;
}

// Keep ControlPoint as an alias for backwards compatibility during migration
export type ControlPoint = Waypoint;

export const FIELD_SIZE_INCHES = 144;
export const FIELD_HALF_SIZE = 72;

export const ACTIONS = [
  'none',
  'intake()',
  'outtake()',
  'raiseArm()',
  'lowerArm()',
  'openClaw()',
  'closeClaw()',
  'spinCarousel()',
  'customAction()',
];

export interface CanvasConfig {
  width: number;
  height: number;
  scale: number; // pixels per inch
}
