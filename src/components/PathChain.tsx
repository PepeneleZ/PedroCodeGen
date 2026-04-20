import { Line, Group, Circle } from 'react-konva';
import { PathChain as PathChainType } from '../types';
import { ControlPoint } from './ControlPoint';
import { pointToCanvas } from '../utils/coordinates';

interface PathChainProps {
  pathChain: PathChainType;
  canvasSize: number;
  selectedWaypointId: string | null;
  selectedPathId: string | null;
  onWaypointDragMove: (id: string, x: number, y: number) => void;
  onWaypointClick: (id: string) => void;
  onControlPointDragMove?: (pathId: string, cpIndex: 1 | 2, x: number, y: number) => void;
  selectingPathEndpoint?: boolean;
  onPathEndpointSelect?: (waypointId: string) => void;
}

export const PathChainComponent = ({
  pathChain,
  canvasSize,
  selectedWaypointId,
  selectedPathId,
  onWaypointDragMove,
  onWaypointClick,
  onControlPointDragMove,
  selectingPathEndpoint,
  onPathEndpointSelect,
}: PathChainProps) => {
  // Render path lines between waypoints
  const pathLines = pathChain.paths.map((path) => {
    const startWp = pathChain.waypoints.find(w => w.id === path.startWaypointId);
    const endWp = pathChain.waypoints.find(w => w.id === path.endWaypointId);

    if (!startWp || !endWp) return null;

    const startCanvas = pointToCanvas({ x: startWp.x, y: startWp.y }, canvasSize);
    const endCanvas = pointToCanvas({ x: endWp.x, y: endWp.y }, canvasSize);

    // Use the ending waypoint's color for the path
    const pathColor = endWp.color || '#8b5cf6';

    if (path.type === 'curve' && path.controlPoint1 && path.controlPoint2) {
      // Render bezier curve
      const cp1Canvas = pointToCanvas(path.controlPoint1, canvasSize);
      const cp2Canvas = pointToCanvas(path.controlPoint2, canvasSize);

      return (
        <Line
          key={`path-${path.id}`}
          points={[startCanvas.x, startCanvas.y, cp1Canvas.x, cp1Canvas.y, cp2Canvas.x, cp2Canvas.y, endCanvas.x, endCanvas.y]}
          stroke={pathColor}
          strokeWidth={2}
          opacity={0.8}
          bezier
        />
      );
    } else {
      // Render straight line
      return (
        <Line
          key={`path-${path.id}`}
          points={[startCanvas.x, startCanvas.y, endCanvas.x, endCanvas.y]}
          stroke={pathColor}
          strokeWidth={2}
          opacity={0.8}
        />
      );
    }
  });

  // Render control points only for the selected path
  const controlPoints = selectedPathId ? (() => {
    const path = pathChain.paths.find(p => p.id === selectedPathId);
    if (!path || path.type !== 'curve' || !path.controlPoint1 || !path.controlPoint2) return [];

    const cp1Canvas = pointToCanvas(path.controlPoint1, canvasSize);
    const cp2Canvas = pointToCanvas(path.controlPoint2, canvasSize);

    const startWp = pathChain.waypoints.find(w => w.id === path.startWaypointId);
    const endWp = pathChain.waypoints.find(w => w.id === path.endWaypointId);
    if (!startWp || !endWp) return [];

    const startCanvas = pointToCanvas({ x: startWp.x, y: startWp.y }, canvasSize);
    const endCanvas = pointToCanvas({ x: endWp.x, y: endWp.y }, canvasSize);

    return [
      // Control point 1
      <Group key={`cp1-${path.id}`}>
        <Line
          points={[startCanvas.x, startCanvas.y, cp1Canvas.x, cp1Canvas.y]}
          stroke="#ff6b6b"
          strokeWidth={1}
          dash={[4, 4]}
          opacity={0.6}
        />
        <Circle
          x={cp1Canvas.x}
          y={cp1Canvas.y}
          radius={6}
          fill="#ff6b6b"
          stroke="#ff8888"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            if (onControlPointDragMove) {
              onControlPointDragMove(path.id, 1, e.target.x(), e.target.y());
            }
          }}
          onMouseEnter={(e) => {
            e.target.getStage()!.container().style.cursor = 'grab';
          }}
          onMouseLeave={(e) => {
            e.target.getStage()!.container().style.cursor = 'default';
          }}
        />
      </Group>,
      // Control point 2
      <Group key={`cp2-${path.id}`}>
        <Line
          points={[endCanvas.x, endCanvas.y, cp2Canvas.x, cp2Canvas.y]}
          stroke="#ff6b6b"
          strokeWidth={1}
          dash={[4, 4]}
          opacity={0.6}
        />
        <Circle
          x={cp2Canvas.x}
          y={cp2Canvas.y}
          radius={6}
          fill="#ff6b6b"
          stroke="#ff8888"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            if (onControlPointDragMove) {
              onControlPointDragMove(path.id, 2, e.target.x(), e.target.y());
            }
          }}
          onMouseEnter={(e) => {
            e.target.getStage()!.container().style.cursor = 'grab';
          }}
          onMouseLeave={(e) => {
            e.target.getStage()!.container().style.cursor = 'default';
          }}
        />
      </Group>,
    ];
  })() : [];

  return (
    <Group>
      {/* Path lines */}
      {pathLines}

      {/* Control points for curves */}
      {controlPoints}

      {/* Waypoints */}
      {pathChain.waypoints.map((waypoint) => (
        <ControlPoint
          key={waypoint.id}
          point={waypoint}
          canvasSize={canvasSize}
          isSelected={selectedWaypointId === waypoint.id}
          onDragMove={onWaypointDragMove}
          onClick={onWaypointClick}
          selectingPathEndpoint={selectingPathEndpoint}
          onPathEndpointSelect={onPathEndpointSelect}
        />
      ))}
    </Group>
  );
};
