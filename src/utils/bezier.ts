import { Point } from '../types';

// Cubic Bezier curve calculation
// B(t) = (1-t)^3 * P0 + 3(1-t)^2*t * P1 + 3(1-t)*t^2 * P2 + t^3 * P3
export const cubicBezier = (
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
};

// Generate points along a Bezier curve
export const generateBezierCurve = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number = 100,
): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(cubicBezier(t, p0, p1, p2, p3));
  }
  return points;
};

// Calculate tangent vector at a point on the Bezier curve
export const bezierTangent = (
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point => {
  const mt = 1 - t;

  // Derivative of cubic Bezier
  const dx =
    3 * mt * mt * (p1.x - p0.x) +
    6 * mt * t * (p2.x - p1.x) +
    3 * t * t * (p3.x - p2.x);

  const dy =
    3 * mt * mt * (p1.y - p0.y) +
    6 * mt * t * (p2.y - p1.y) +
    3 * t * t * (p3.y - p2.y);

  // Normalize
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { x: 0, y: 0 };

  return { x: dx / length, y: dy / length };
};

// Calculate heading at a specific point on the curve
export const calculateTangentHeading = (
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): number => {
  const tangent = bezierTangent(t, p0, p1, p2, p3);
  return Math.atan2(tangent.y, tangent.x);
};

// Calculate distance between two points
export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

// Calculate path length for a Bezier curve
export const calculateCurveLength = (
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number = 100,
): number => {
  const points = generateBezierCurve(p0, p1, p2, p3, segments);
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
};
