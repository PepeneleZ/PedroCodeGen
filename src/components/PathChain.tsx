import { Line, Group, Circle } from 'react-konva';
import { PathChain as PathChainType } from '../types';
import { ControlPoint } from './ControlPoint';
import { pointToCanvas } from '../utils/coordinates';

interface PathChainProps {
  pathChain: PathChainType;
  canvasSize: number;
  selectedPoseId: string | null;
  selectedPathId: string | null;
  onPoseDragMove: (id: string, x: number, y: number) => void;
  onPoseClick: (id: string, e?: any) => void;
  onPathClick?: (id: string) => void;
  onHeadingChange?: (id: string, heading: number) => void;
  onControlPointDragMove?: (pathId: string, cpIndex: 1 | 2, x: number, y: number) => void;
  selectingPathEndpoint?: boolean;
  onPathEndpointSelect?: (poseId: string) => void;
}

export const PathChainComponent = ({
  pathChain,
  canvasSize,
  selectedPoseId,
  selectedPathId,
  onPoseDragMove,
  onPoseClick,
  onPathClick,
  onHeadingChange,
  onControlPointDragMove,
  selectingPathEndpoint,
  onPathEndpointSelect,
}: PathChainProps) => {
  // Render path lines between poses
  const pathLines = pathChain.paths.map((path) => {
    const startPose = pathChain.poses.find(w => w.id === path.startPoseId);
    const endPose = pathChain.poses.find(w => w.id === path.endPoseId);

    if (!startPose || !endPose) return null;

    const startCanvas = pointToCanvas({ x: startPose.x, y: startPose.y }, canvasSize);
    const endCanvas = pointToCanvas({ x: endPose.x, y: endPose.y }, canvasSize);

    // Use the ending pose's color for the path
    const pathColor = endPose.color || '#8b5cf6';
    const isSelected = selectedPathId === path.id;

    const lineProps = {
      key: `path-${path.id}`,
      stroke: pathColor,
      strokeWidth: isSelected ? 4 : 2,
      opacity: isSelected ? 1 : 0.8,
      hitStrokeWidth: 20, // Make it easier to click
      onClick: (e: any) => {
        e.cancelBubble = true;
        if (onPathClick) onPathClick(path.id);
      },
    };

    if (path.type === 'curve' && path.controlPoint1 && path.controlPoint2) {
      // Render bezier curve
      const cp1Canvas = pointToCanvas(path.controlPoint1, canvasSize);
      const cp2Canvas = pointToCanvas(path.controlPoint2, canvasSize);

      return (
        <Line
          {...lineProps}
          points={[startCanvas.x, startCanvas.y, cp1Canvas.x, cp1Canvas.y, cp2Canvas.x, cp2Canvas.y, endCanvas.x, endCanvas.y]}
          bezier
        />
      );
    } else {
      // Render straight line
      return (
        <Line
          {...lineProps}
          points={[startCanvas.x, startCanvas.y, endCanvas.x, endCanvas.y]}
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

    const startPose = pathChain.poses.find(w => w.id === path.startPoseId);
    const endPose = pathChain.poses.find(w => w.id === path.endPoseId);
    if (!startPose || !endPose) return [];

    const startCanvas = pointToCanvas({ x: startPose.x, y: startPose.y }, canvasSize);
    const endCanvas = pointToCanvas({ x: endPose.x, y: endPose.y }, canvasSize);

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
          dragBoundFunc={(pos) => {
            return {
              x: Math.max(0, Math.min(canvasSize, pos.x)),
              y: Math.max(0, Math.min(canvasSize, pos.y)),
            };
          }}
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
          dragBoundFunc={(pos) => {
            return {
              x: Math.max(0, Math.min(canvasSize, pos.x)),
              y: Math.max(0, Math.min(canvasSize, pos.y)),
            };
          }}
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

      {/* Poses */}
      {pathChain.poses.map((pose) => (
        <ControlPoint
          key={pose.id}
          point={pose}
          canvasSize={canvasSize}
          isSelected={selectedPoseId === pose.id}
          onDragMove={onPoseDragMove}
          onClick={onPoseClick}
          onHeadingChange={onHeadingChange}
          selectingPathEndpoint={selectingPathEndpoint}
          onPathEndpointSelect={onPathEndpointSelect}
        />
      ))}
    </Group>
  );
};
