export type TimelineEventType = 'travel' | 'wait';

export interface TimelineEvent {
  type: TimelineEventType;
  duration: number;
  startTime: number;
  endTime: number;
  name?: string;
  waitPosition?: 'before' | 'after';

  // For 'travel' events
  pathIndex?: number;

  // For 'wait/rotate' events
  startHeading?: number;
  targetHeading?: number;
  atPoint?: Point;
}

export interface TimePrediction {
  totalTime: number;
  segmentTimes: number[];
  totalDistance: number;
  timeline: TimelineEvent[];
}

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

export interface Callback {
  id: string;
  action: string;
  parametricPercent?: number;
  temporalMillis?: number;
  poseCallback?: Point & { heading?: number };
  poseGuess?: number;
  customCallbackCode?: string;
}

export interface WaitSegment {
  name?: string;
  durationMs: number;
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
  translationalConstraint?: number;  
  headingConstraint?: number; // degrees // inches
  // Deceleration and braking
  deceleration?: 'default' | 'global' | 'none'; 
  brakingStrength?: number; // 0.1-5.0
  brakingStart?: number; // 0.0-1.0
  // Callbacks
  callbacks?: Callback[];
  // Wait durations
  waitBefore?: WaitSegment;
  waitAfter?: WaitSegment;
  waitBeforeMs?: number;
  waitAfterMs?: number;
}

export interface SimulationSettings {
  xVelocity: number; // in/s
  yVelocity: number; // in/s
  angularVelocity: number; // π rad/s
  maxVelocity: number; // in/s
  maxAcceleration: number; // in/s²
  maxDeceleration: number; // in/s²
  frictionCoefficient: number;
  robotWidth: number; // inches
  robotHeight: number; // inches
  robotImageUrl?: string; // Data URL or URL
  showGhostPaths?: boolean;
  showOnionLayers?: boolean;
  onionLayerSpacing?: number;
  onionColor?: string;
  showHeadingArrow?: boolean;
}

export interface PathChain {
  id: string;
  name: string;
  startingPoseId?: string;
  poses: Pose[];
  paths: Path[];
  simulationSettings?: SimulationSettings;
}

// Keep ControlPoint as an alias for compatibility in components
export type ControlPoint = Pose;

export const FIELD_SIZE_INCHES = 144;
export const FIELD_HALF_SIZE = 72;
