import { FIELD_SIZE_INCHES, Point } from '../types';

// Convert FTC field inches to canvas pixels
// FTC field: (0,0) is bottom-right, X ranges 0 to 144, Y ranges 0 to 144
// Canvas: (0,0) is top-left, range is 0 to width/height

export const inchesToPixels = (
  inches: number,
  canvasSize: number,
): number => {
  // Map from [0, 144] to [0, canvasSize] (X: left to right)
  return (inches / FIELD_SIZE_INCHES) * canvasSize;
};

export const pixelsToInches = (
  pixels: number,
  canvasSize: number,
): number => {
  // Map from [0, canvasSize] to [0, 144]
  return (pixels / canvasSize) * FIELD_SIZE_INCHES;
};

export const pointToCanvas = (
  point: Point,
  canvasSize: number,
): Point => ({
  x: inchesToPixels(point.x, canvasSize),
  // Y: 0 (bottom) -> canvas bottom, Y: 144 (top) -> canvas top
  y: canvasSize - ((point.y / FIELD_SIZE_INCHES) * canvasSize),
});

export const canvasToPoint = (
  canvasPoint: Point,
  canvasSize: number,
): Point => ({
  x: pixelsToInches(canvasPoint.x, canvasSize),
  // canvas bottom -> Y: 0, canvas top -> Y: 144
  y: ((canvasSize - canvasPoint.y) / canvasSize) * FIELD_SIZE_INCHES,
});

// Clamp value to field bounds (for X axis: 0 to 144)
export const clampToFieldX = (value: number): number => {
  return Math.max(0, Math.min(FIELD_SIZE_INCHES, value));
};

// Clamp value to field bounds (for Y axis: 0 to 144)
export const clampToFieldY = (value: number): number => {
  return Math.max(0, Math.min(FIELD_SIZE_INCHES, value));
};

// Legacy function for backward compatibility
export const clampToField = (value: number): number => {
  return clampToFieldX(value);
};
