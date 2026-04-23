import { Circle, Group, Line, Arrow } from 'react-konva';
import { ControlPoint as ControlPointType } from '../types';
import { pointToCanvas } from '../utils/coordinates';
import { useCallback } from 'react';

interface ControlPointProps {
  point: ControlPointType;
  canvasSize: number;
  isSelected: boolean;
  onDragMove: (id: string, x: number, y: number) => void;
  onClick: (id: string, e?: any) => void;
  onHeadingChange?: (id: string, heading: number) => void;
  selectingPathEndpoint?: boolean;
  onPathEndpointSelect?: (waypointId: string) => void;
}

export const ControlPoint = ({
  point,
  canvasSize,
  isSelected,
  onDragMove,
  onClick,
  onHeadingChange,
  selectingPathEndpoint,
  onPathEndpointSelect,
}: ControlPointProps) => {
  const canvasPoint = pointToCanvas(point, canvasSize);

  // Use waypoint's assigned color, fallback to default blue
  const baseColor = point.color || '#3366cc';
  const colors = { fill: baseColor, strokeWidth: 0 };

  const handleHeadingDragMove = useCallback((e: any) => {
    if (!onHeadingChange) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Calculate angle between pose center and pointer
    const dx = pointerPos.x - canvasPoint.x;
    const dy = pointerPos.y - canvasPoint.y;
    
    // Konva/Canvas angle is in radians, 0 is right, goes clockwise
    // Our heading: 0 is right, goes counter-clockwise (or clockwise depending on FTC convention)
    // Actually, usually in FTC/Pedro: 0 is positive X (right), 90 is positive Y (up)
    // Canvas: 0 is positive X (right), 90 is positive Y (down)
    
    let angleRad = Math.atan2(-dy, dx); // Negative dy because canvas Y is inverted
    let angleDeg = (angleRad * 180) / Math.PI;
    
    // Normalize to 0-360
    angleDeg = (angleDeg + 360) % 360;
    
    onHeadingChange(point.id, angleDeg);
  }, [canvasPoint, onHeadingChange, point.id]);

  const heading = point.heading ?? 0;
  const headingRad = (heading * Math.PI) / 180;
  const arrowLength = 35; // Slightly longer for better control
  const arrowX = canvasPoint.x + Math.cos(headingRad) * arrowLength;
  const arrowY = canvasPoint.y - Math.sin(headingRad) * arrowLength;

  return (
    <Group>
      {/* Heading Arrow (only when selected) */}
      {isSelected && onHeadingChange && (
        <Group>
          {/* Arrow line and head */}
          <Arrow
            points={[canvasPoint.x, canvasPoint.y, arrowX, arrowY]}
            pointerLength={10}
            pointerWidth={10}
            fill="#ffffff"
            stroke="#ffffff"
            strokeWidth={2}
            opacity={0.9}
            listening={false} // Let the handle and hit area catch events
          />
          
          {/* Invisible Rotation Handle at the tip */}
          <Circle
            x={arrowX}
            y={arrowY}
            radius={12} // Slightly larger hit area since it's invisible
            fill="transparent"
            stroke="transparent"
            strokeWidth={0}
            draggable
            dragBoundFunc={(pos) => {
              const dx = pos.x - canvasPoint.x;
              const dy = pos.y - canvasPoint.y;
              const angle = Math.atan2(dy, dx);
              return {
                x: canvasPoint.x + Math.cos(angle) * arrowLength,
                y: canvasPoint.y + Math.sin(angle) * arrowLength,
              };
            }}
            onDragMove={(e) => {
              const dx = e.target.x() - canvasPoint.x;
              const dy = e.target.y() - canvasPoint.y;
              let angleRad = Math.atan2(-dy, dx);
              let angleDeg = (angleRad * 180) / Math.PI;
              angleDeg = (angleDeg + 360) % 360;
              onHeadingChange(point.id, angleDeg);
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'crosshair';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
          />
        </Group>
      )}

      {/* Control point circle */}
      <Circle
        x={canvasPoint.x}
        y={canvasPoint.y}
        radius={isSelected ? 8 : 6}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={colors.strokeWidth}
        draggable
        dragBoundFunc={(pos) => {
          // Clamp position to canvas bounds
          const min = 0;
          const max = canvasSize;
          return {
            x: Math.max(min, Math.min(max, pos.x)),
            y: Math.max(min, Math.min(max, pos.y)),
          };
        }}
        onDragMove={(e) => {
          onDragMove(point.id, e.target.x(), e.target.y());
        }}
        onClick={(e) => {
          e.cancelBubble = true;
          if (selectingPathEndpoint && onPathEndpointSelect) {
            onPathEndpointSelect(point.id);
          } else {
            onClick(point.id, e);
          }
        }}
        shadowColor="black"
        shadowBlur={5}
        shadowOpacity={0.3}
      />
    </Group>
  );
};
