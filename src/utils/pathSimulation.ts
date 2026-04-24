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

/**
 * Calculates the length of a path segment using integration.
 */
export const getPathLength = (
  path: Path,
  startPose: Pose,
  endPose: Pose,
  samples: number = 20
): number => {
  let length = 0;
  let prevPos = startPose;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    let currentPos: Point;
    if (path.type === 'curve' && path.controlPoint1 && path.controlPoint2) {
      currentPos = getBezierPoint(startPose, path.controlPoint1, path.controlPoint2, endPose, t);
    } else {
      currentPos = getLinePoint(startPose, endPose, t);
    }
    const dx = currentPos.x - prevPos.x;
    const dy = currentPos.y - prevPos.y;
    length += Math.sqrt(dx * dx + dy * dy);
    prevPos = { ...prevPos, ...currentPos };
  }

  return length;
};

export interface SimState {
  pathIndex: number;
  t: number;
  currentVelocity: number;
  distanceTravelledInPath: number;
  currentHeading: number;
  totalTime: number;
}

/**
 * Updates the simulation state based on time delta and physical constraints.
 */
export const updateSimState = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: {
    maxVelocity: number;
    maxAcceleration: number;
    maxDeceleration: number;
    angularVelocity: number;
    xVelocity: number;
    yVelocity: number;
    frictionCoefficient: number;
  },
  prevState: SimState,
  deltaTime: number
): SimState => {
  let { pathIndex, t, currentVelocity, distanceTravelledInPath, currentHeading } = prevState;

  if (pathIndex >= activeChain.paths.length) {
    return prevState;
  }

  const path = activeChain.paths[pathIndex];
  const startPose = activeChain.poses.find(p => p.id === path.startPoseId)!;
  const endPose = activeChain.poses.find(p => p.id === path.endPoseId)!;
  
  const pathLength = getPathLength(path, startPose, endPose);

  // 1. Pre-path rotation: If at the start (t=0), ensure we are at the correct start heading
  const startTargetHeading = getRobotPoseAtProgress(path, startPose, endPose, 0).heading;
  let startHeadingDiff = startTargetHeading - currentHeading;
  while (startHeadingDiff > 180) startHeadingDiff -= 360;
  while (startHeadingDiff < -180) startHeadingDiff += 360;

  const maxTurn = settings.angularVelocity * 180 * deltaTime;

  if (t === 0 && Math.abs(startHeadingDiff) > 1.0) {
    let nextHeading = currentHeading + Math.sign(startHeadingDiff) * Math.min(Math.abs(startHeadingDiff), maxTurn);
    return {
      ...prevState,
      currentHeading: normalizeAngle(nextHeading),
      currentVelocity: 0, // Stand still while rotating at start
      totalTime: prevState.totalTime + deltaTime
    };
  }
  
  // 2. Translational Movement
  const translationalMax = Math.min(settings.maxVelocity, Math.sqrt(settings.xVelocity * settings.xVelocity + settings.yVelocity * settings.yVelocity));
  
  let targetVelocity = translationalMax;
  if (path.velocityConstraint) {
    targetVelocity = Math.min(targetVelocity, path.velocityConstraint);
  }

  // Deceleration at the end of the chain
  const remainingDistanceInChain = (activeChain.paths.length - pathIndex - 1) * 10 + (pathLength - distanceTravelledInPath);
  const effectiveDecel = settings.maxDeceleration * (1 - settings.frictionCoefficient * 0.5);
  const stopDistance = (currentVelocity * currentVelocity) / (2 * effectiveDecel);
  
  if (remainingDistanceInChain < stopDistance) {
    targetVelocity = 0;
  }

  let newVelocity = currentVelocity;
  const effectiveAccel = settings.maxAcceleration * (1 - settings.frictionCoefficient * 0.2);
  
  if (currentVelocity < targetVelocity) {
    newVelocity = Math.min(targetVelocity, currentVelocity + effectiveAccel * deltaTime);
  } else if (currentVelocity > targetVelocity) {
    newVelocity = Math.max(targetVelocity, currentVelocity - effectiveDecel * deltaTime);
  }

  const distanceStep = newVelocity * deltaTime;
  const newDistanceTravelled = distanceTravelledInPath + distanceStep;
  let newT = newDistanceTravelled / pathLength;

  if (newT > 1) newT = 1;

  // 3. Update Heading during movement
  const targetPoseAtNewT = getRobotPoseAtProgress(path, startPose, endPose, newT);
  const targetHeading = targetPoseAtNewT.heading;
  
  let headingDiff = targetHeading - currentHeading;
  while (headingDiff > 180) headingDiff -= 360;
  while (headingDiff < -180) headingDiff += 360;
  
  let newHeading = currentHeading + Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), maxTurn);
  newHeading = normalizeAngle(newHeading);

  // 4. End-of-path transition
  let finalPathIndex = pathIndex;
  let finalT = newT;
  let finalDistanceTravelled = newDistanceTravelled;
  let finalVelocity = newVelocity;

  if (newT >= 1) {
    // We reached the end of the segment. Must finish rotation before moving to next.
    let finalHeadingDiff = targetHeading - newHeading;
    while (finalHeadingDiff > 180) finalHeadingDiff -= 360;
    while (finalHeadingDiff < -180) finalHeadingDiff += 360;

    if (Math.abs(finalHeadingDiff) < 1.0) {
      // Finished turn, move to next path
      finalPathIndex++;
      finalT = 0;
      finalDistanceTravelled = 0;
    } else {
      // Still turning at the end of the path
      finalT = 1;
      finalVelocity = 0;
      finalDistanceTravelled = pathLength;
    }
  }

  return {
    pathIndex: finalPathIndex,
    t: finalT,
    currentVelocity: finalVelocity,
    distanceTravelledInPath: finalDistanceTravelled,
    currentHeading: newHeading,
    totalTime: prevState.totalTime + deltaTime
  };
};

/**
 * Calculates the simulation state at a specific point in time.
 */
export const getSimStateAtTime = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: {
    maxVelocity: number;
    maxAcceleration: number;
    maxDeceleration: number;
    angularVelocity: number;
    xVelocity: number;
    yVelocity: number;
    frictionCoefficient: number;
  },
  targetTime: number
): SimState => {
  let simState: SimState = {
    pathIndex: 0,
    t: 0,
    currentVelocity: 0,
    distanceTravelledInPath: 0,
    currentHeading: activeChain.poses.find(p => p.id === activeChain.paths[0]?.startPoseId)?.heading || 0,
    totalTime: 0
  };

  if (activeChain.paths.length === 0 || targetTime <= 0) return simState;

  const dt = 0.01; // 10ms steps for precision
  while (simState.totalTime < targetTime && simState.pathIndex < activeChain.paths.length) {
    const remaining = targetTime - simState.totalTime;
    const step = Math.min(dt, remaining);
    simState = updateSimState(activeChain, settings, simState, step);
    if (step < dt) break; // Reached targetTime precisely
  }

  return simState;
};

/**
 * Estimates the total time of the simulation.
 */
export const calculateTotalSimTime = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: {
    maxVelocity: number;
    maxAcceleration: number;
    maxDeceleration: number;
    angularVelocity: number;
    xVelocity: number;
    yVelocity: number;
    frictionCoefficient: number;
  }
): number => {
  if (activeChain.paths.length === 0) return 0;
  
  // We run a high-fidelity dry-run simulation to get the total time
  let simState: SimState = {
    pathIndex: 0,
    t: 0,
    currentVelocity: 0,
    distanceTravelledInPath: 0,
    currentHeading: activeChain.poses.find(p => p.id === activeChain.paths[0].startPoseId)?.heading || 0,
    totalTime: 0
  };
  
  const dt = 0.01; // 10ms steps for high accuracy
  const maxSteps = 10000; // 100 seconds max
  let steps = 0;
  
  while (simState.pathIndex < activeChain.paths.length && steps < maxSteps) {
    simState = updateSimState(activeChain, settings, simState, dt);
    steps++;
  }
  
  return simState.totalTime;
};
