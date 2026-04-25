import { Point, Path, Pose, SimulationSettings, TimelineEvent, TimePrediction } from '../types';

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
  waitRemaining: number;
  waitingPosition: 'before' | 'after' | 'none';
}

/**
 * Updates the simulation state based on time delta and physical constraints.
 */
export const updateSimState = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: SimulationSettings,
  prevState: SimState,
  deltaTime: number
): SimState => {
  let { pathIndex, t, currentVelocity, distanceTravelledInPath, currentHeading, waitRemaining, waitingPosition } = prevState;

  if (pathIndex >= activeChain.paths.length) {
    return prevState;
  }

  const path = activeChain.paths[pathIndex];
  const startPose = activeChain.poses.find(p => p.id === path.startPoseId)!;
  const endPose = activeChain.poses.find(p => p.id === path.endPoseId)!;
  
  const pathLength = getPathLength(path, startPose, endPose);

  // 1. Handle Wait Segments
  if (waitRemaining > 0) {
    const waitStep = Math.min(waitRemaining, deltaTime);
    return {
      ...prevState,
      waitRemaining: waitRemaining - waitStep,
      totalTime: prevState.totalTime + deltaTime
    };
  }

  // If we just finished waiting 'before', we start moving.
  // If we just finished waiting 'after', we move to next path.
  if (waitingPosition === 'after') {
    return {
      ...prevState,
      pathIndex: pathIndex + 1,
      t: 0,
      currentVelocity: 0,
      distanceTravelledInPath: 0,
      waitingPosition: 'none',
      totalTime: prevState.totalTime + deltaTime
    };
  }

  // Initialize waitBefore if we are at start of path
  if (t === 0 && waitingPosition === 'none') {
    const waitBeforeMs = path.waitBeforeMs || path.waitBefore?.durationMs || 0;
    if (waitBeforeMs > 0) {
      return {
        ...prevState,
        waitRemaining: waitBeforeMs / 1000,
        waitingPosition: 'before'
      };
    }
  }

  // 2. Heading Alignment
  const targetPoseAtT = getRobotPoseAtProgress(path, startPose, endPose, t);
  const targetHeading = targetPoseAtT.heading;
  
  let headingDiff = targetHeading - currentHeading;
  while (headingDiff > 180) headingDiff -= 360;
  while (headingDiff < -180) headingDiff += 360;

  const maxTurn = (settings.angularVelocity || 1) * 180 * deltaTime;

  // 3. Translational Movement
  const translationalMax = Math.min(settings.maxVelocity, Math.sqrt(settings.xVelocity * settings.xVelocity + settings.yVelocity * settings.yVelocity));
  
  let targetVelocity = translationalMax;
  if (path.velocityConstraint) {
    targetVelocity = Math.min(targetVelocity, path.velocityConstraint);
  }

  // Deceleration logic
  const remainingDistanceInPath = pathLength - distanceTravelledInPath;
  const isLastPath = pathIndex === activeChain.paths.length - 1;
  const effectiveDecel = settings.maxDeceleration;
  
  // Pedro Pathing by default decelerates at the end of every path unless chained or specified
  if (isLastPath || path.deceleration === 'global' || path.deceleration === 'default' || path.deceleration === undefined) {
    const stopDistance = (currentVelocity * currentVelocity) / (2 * effectiveDecel);
    if (remainingDistanceInPath < stopDistance) {
      targetVelocity = 0;
    }
  }

  let newVelocity = currentVelocity;
  const effectiveAccel = settings.maxAcceleration;
  
  if (currentVelocity < targetVelocity) {
    newVelocity = Math.min(targetVelocity, currentVelocity + effectiveAccel * deltaTime);
  } else if (currentVelocity > targetVelocity) {
    newVelocity = Math.max(targetVelocity, currentVelocity - effectiveDecel * deltaTime);
  }

  const distanceStep = newVelocity * deltaTime;
  const newDistanceTravelled = distanceTravelledInPath + distanceStep;
  let newT = pathLength > 0 ? newDistanceTravelled / pathLength : 1;

  if (newT > 1) newT = 1;

  // Update heading
  let newHeading = currentHeading + Math.sign(headingDiff) * Math.min(Math.abs(headingDiff), maxTurn);
  newHeading = normalizeAngle(newHeading);

  // End of path transition
  let finalPathIndex = pathIndex;
  let finalT = newT;
  let finalDistanceTravelled = newDistanceTravelled;
  let finalVelocity = newVelocity;
  let finalWaitingPosition: 'before' | 'after' | 'none' = waitingPosition;
  let finalWaitRemaining = 0;

  if (newT >= 1) {
    // Check if we need to finish turning
    let finalHeadingDiff = targetHeading - newHeading;
    while (finalHeadingDiff > 180) finalHeadingDiff -= 360;
    while (finalHeadingDiff < -180) finalHeadingDiff += 360;

    if (Math.abs(finalHeadingDiff) < 1.0) {
      // Finished movement and rotation. Now check waitAfter.
      const waitAfterMs = path.waitAfterMs || path.waitAfter?.durationMs || 0;
      if (waitAfterMs > 0 && (finalWaitingPosition as string) !== 'after') {
        finalWaitingPosition = 'after';
        finalWaitRemaining = waitAfterMs / 1000;
        finalVelocity = 0;
      } else {
        finalPathIndex++;
        finalT = 0;
        finalDistanceTravelled = 0;
        finalWaitingPosition = 'none';
        finalVelocity = 0; // Reset velocity for next path segment usually
      }
    } else {
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
    totalTime: prevState.totalTime + deltaTime,
    waitRemaining: finalWaitRemaining,
    waitingPosition: finalWaitingPosition
  };
};

/**
 * Calculates the entire path timeline.
 */
export const calculatePathTime = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: SimulationSettings
): TimePrediction => {
  const timeline: TimelineEvent[] = [];
  let totalDistance = 0;
  const segmentTimes: number[] = [];

  if (activeChain.paths.length === 0) {
    return { totalTime: 0, segmentTimes: [], totalDistance: 0, timeline: [] };
  }

  let simState: SimState = {
    pathIndex: 0,
    t: 0,
    currentVelocity: 0,
    distanceTravelledInPath: 0,
    currentHeading: activeChain.poses.find(p => p.id === activeChain.paths[0].startPoseId)?.heading || 0,
    totalTime: 0,
    waitRemaining: 0,
    waitingPosition: 'none'
  };

  const dt = 0.01;
  let currentEvent: TimelineEvent | null = null;

  while (simState.pathIndex < activeChain.paths.length && simState.totalTime < 200) {
    simState = updateSimState(activeChain, settings, simState, dt);
    
    const currentIdx = Math.min(simState.pathIndex, activeChain.paths.length - 1);
    const currentWaitPos = simState.waitingPosition;

    // Detect event changes
    if (!currentEvent || currentEvent.pathIndex !== currentIdx || currentEvent.waitPosition !== (currentWaitPos === 'none' ? undefined : currentWaitPos)) {
      if (currentEvent) {
        currentEvent.endTime = simState.totalTime;
        currentEvent.duration = currentEvent.endTime - currentEvent.startTime;
        timeline.push(currentEvent);
        if (currentEvent.type === 'travel') segmentTimes.push(currentEvent.duration);
      }
      
      currentEvent = {
        type: currentWaitPos !== 'none' ? 'wait' : 'travel',
        startTime: simState.totalTime,
        endTime: simState.totalTime,
        duration: 0,
        pathIndex: currentIdx,
        waitPosition: currentWaitPos === 'none' ? undefined : currentWaitPos
      };
    }
  }

  if (currentEvent) {
    currentEvent.endTime = simState.totalTime;
    currentEvent.duration = currentEvent.endTime - currentEvent.startTime;
    timeline.push(currentEvent);
    if (currentEvent.type === 'travel') segmentTimes.push(currentEvent.duration);
  }

  // Calculate total distance
  activeChain.paths.forEach(p => {
    const s = activeChain.poses.find(pose => pose.id === p.startPoseId)!;
    const e = activeChain.poses.find(pose => pose.id === p.endPoseId)!;
    totalDistance += getPathLength(p, s, e);
  });

  return {
    totalTime: simState.totalTime,
    segmentTimes,
    totalDistance,
    timeline
  };
};

/**
 * Gets the robot state at a given time using the timeline.
 */
export const calculateRobotState = (
  percent: number,
  timeline: TimelineEvent[],
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: SimulationSettings
): { x: number; y: number; heading: number } => {
  const totalTime = timeline.length > 0 ? timeline[timeline.length - 1].endTime : 0;
  const targetTime = (percent / 100) * totalTime;

  const state = getSimStateAtTime(activeChain, settings, targetTime);
  
  if (state.pathIndex < activeChain.paths.length) {
    const path = activeChain.paths[state.pathIndex];
    const s = activeChain.poses.find(p => p.id === path.startPoseId)!;
    const e = activeChain.poses.find(p => p.id === path.endPoseId)!;
    const pose = getRobotPoseAtProgress(path, s, e, state.t);
    return { ...pose, heading: state.currentHeading };
  } else {
    // Last pose
    const lastPath = activeChain.paths[activeChain.paths.length - 1];
    const e = activeChain.poses.find(p => p.id === lastPath.endPoseId)!;
    return { x: e.x, y: e.y, heading: state.currentHeading };
  }
};

/**
 * Calculates the simulation state at a specific point in time.
 */
export const getSimStateAtTime = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: SimulationSettings,
  targetTime: number
): SimState => {
  let simState: SimState = {
    pathIndex: 0,
    t: 0,
    currentVelocity: 0,
    distanceTravelledInPath: 0,
    currentHeading: activeChain.poses.find(p => p.id === activeChain.paths[0]?.startPoseId)?.heading || 0,
    totalTime: 0,
    waitRemaining: 0,
    waitingPosition: 'none'
  };

  if (activeChain.paths.length === 0 || targetTime <= 0) return simState;

  const dt = 0.01;
  while (simState.totalTime < targetTime && simState.pathIndex < activeChain.paths.length) {
    const remaining = targetTime - simState.totalTime;
    const step = Math.min(dt, remaining);
    simState = updateSimState(activeChain, settings, simState, step);
    if (step < dt) break;
  }

  return simState;
};

/**
 * Estimates the total time of the simulation.
 */
export const calculateTotalSimTime = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: SimulationSettings
): number => {
  return calculatePathTime(activeChain, settings).totalTime;
};

/**
 * Generates points for a "ghost path" showing the robot's footprint.
 */
export const generateGhostPathPoints = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: SimulationSettings,
  samples: number = 100
): Point[] => {
  const points: Point[] = [];
  const timeline = calculatePathTime(activeChain, settings).timeline;
  
  if (timeline.length === 0) return [];

  for (let i = 0; i <= samples; i++) {
    const state = calculateRobotState((i / samples) * 100, timeline, activeChain, settings);
    points.push({ x: state.x, y: state.y });
  }
  
  return points;
};

/**
 * Generates robot footprints at intervals.
 */
export const generateOnionLayers = (
  activeChain: { paths: Path[]; poses: Pose[] },
  settings: SimulationSettings,
  spacingInches: number = 10
): { corners: Point[], pathIndex: number }[] => {
  const layers: { corners: Point[], pathIndex: number }[] = [];
  const timePrediction = calculatePathTime(activeChain, settings);
  const totalTime = timePrediction.totalTime;
  
  if (totalTime === 0 || timePrediction.totalDistance === 0) return [];

  const totalDistance = timePrediction.totalDistance;
  const numLayers = Math.max(1, Math.floor(totalDistance / spacingInches));
  
  for (let i = 0; i <= numLayers; i++) {
    const dist = i * (totalDistance / numLayers);
    const percent = (dist / totalDistance) * 100;
    const state = calculateRobotState(percent, timePrediction.timeline, activeChain, settings);
    
    // Calculate corners
    const w = settings.robotWidth / 2;
    const h = settings.robotHeight / 2;
    const angle = (state.heading * Math.PI) / 180;
    
    const corners = [
      { x: -h, y: -w },
      { x: h, y: -w },
      { x: h, y: w },
      { x: -h, y: w }
    ].map(p => {
      // Note: Pedro Pathing coordinates: X front, Y left
      // Konva coordinates: X right, Y down
      // Field: CCW heading
      return {
        x: state.x + p.x * Math.cos(angle) - p.y * Math.sin(angle),
        y: state.y + p.x * Math.sin(angle) + p.y * Math.cos(angle)
      };
    });
    
    layers.push({ corners, pathIndex: 0 });
  }
  
  return layers;
};
