import { Point, Path, Pose } from '../types';

/**
 * Calculates a point on a cubic Bezier curve at time t [0, 1].
 */
export const getBezierPoint = (p0: Point, cp1: Point, cp2: Point, p1: Point, t: number): Point => {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p1.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p1.y,
  };
};

/**
 * Calculates the derivative (tangent vector) of a cubic Bezier curve at time t.
 */
export const getBezierDerivative = (p0: Point, cp1: Point, cp2: Point, p1: Point, t: number): Point => {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (cp1.x - p0.x) + 6 * mt * t * (cp2.x - cp1.x) + 3 * t * t * (p1.x - cp2.x),
    y: 3 * mt * mt * (cp1.y - p0.y) + 6 * mt * t * (cp2.y - cp1.y) + 3 * t * t * (p1.y - cp2.y),
  };
};

/**
 * Calculates a point on a line at time t [0, 1].
 */
export const getLinePoint = (p0: Point, p1: Point, t: number): Point => {
  return {
    x: (1 - t) * p0.x + t * p1.x,
    y: (1 - t) * p0.y + t * p1.y,
  };
};

/**
 * Calculates the derivative of a line at time t (it's constant).
 */
export const getLineDerivative = (p0: Point, p1: Point): Point => {
  return {
    x: p1.x - p0.x,
    y: p1.y - p0.y,
  };
};

/**
 * Normalizes an angle to [0, 360).
 */
export const normalizeAngle = (angle: number): number => {
  return ((angle % 360) + 360) % 360;
};

/**
 * Interpolates between two angles in degrees.
 */
export const interpolateAngle = (start: number, end: number, t: number): number => {
  let diff = end - start;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return normalizeAngle(start + diff * t);
};

/**
 * Gets the robot's pose at a specific progress along a path segment.
 */
export const getRobotPoseAtProgress = (
  path: Path,
  startPose: Pose,
  endPose: Pose,
  t: number
): { x: number; y: number; heading: number } => {
  let pos: Point;
  let derivative: Point;

  if (path.type === 'curve' && path.controlPoint1 && path.controlPoint2) {
    pos = getBezierPoint(startPose, path.controlPoint1, path.controlPoint2, endPose, t);
    derivative = getBezierDerivative(startPose, path.controlPoint1, path.controlPoint2, endPose, t);
  } else {
    pos = getLinePoint(startPose, endPose, t);
    derivative = getLineDerivative(startPose, endPose);
  }

  let heading = 0;
  if (path.headingInterpolation === 'tangent') {
    // Math.atan2 returns radians, convert to degrees. 
    // In FTC, 0 degrees is often towards positive X, and positive is CCW.
    // However, Konva uses degrees where 0 is right and positive is CW.
    // We'll calculate degrees such that 0 is positive X.
    heading = (Math.atan2(derivative.y, derivative.x) * 180) / Math.PI;
  } else if (path.headingInterpolation === 'constant') {
    heading = path.constantHeading ?? endPose.heading ?? 0;
  } else if (path.headingInterpolation === 'linear') {
    const startH = path.startHeadingOverride ?? startPose.heading ?? 0;
    const endH = path.endHeadingOverride ?? endPose.heading ?? 0;
    heading = interpolateAngle(startH, endH, t);
  }

  return { ...pos, heading };
};
