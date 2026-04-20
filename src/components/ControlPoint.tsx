import { Circle, Group } from 'react-konva';
import { ControlPoint as ControlPointType } from '../types';
import { pointToCanvas } from '../utils/coordinates';

interface ControlPointProps {
  point: ControlPointType;
  canvasSize: number;
  isSelected: boolean;
  onDragMove: (id: string, x: number, y: number) => void;
  onClick: (id: string) => void;
  selectingPathEndpoint?: boolean;
  onPathEndpointSelect?: (waypointId: string) => void;
}

export const ControlPoint = ({
  point,
  canvasSize,
  isSelected,
  onDragMove,
  onClick,
  selectingPathEndpoint,
  onPathEndpointSelect,
}: ControlPointProps) => {
  const canvasPoint = pointToCanvas(point, canvasSize);

  // Use waypoint's assigned color, fallback to default blue
  const baseColor = point.color || '#3366cc';
  const colors = isSelected
    ? { fill: baseColor, stroke: '#fff', strokeWidth: 2 }
    : { fill: baseColor, stroke: 'rgba(255, 255, 255, 0.7)', strokeWidth: 1 };

  return (
    <Group>
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
            onClick(point.id);
          }
        }}
        shadowColor="black"
        shadowBlur={5}
        shadowOpacity={0.3}
      />

      {/* Point index label - hidden, shown in waypoint list instead */}

    </Group>
  );
};
