import { useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Image as KonvaImage } from 'react-konva';
import { PathChain } from '../types';
import { canvasToPoint, pointToCanvas, clampToFieldX, clampToFieldY } from '../utils/coordinates';
import { PathChainComponent } from './PathChain';

interface FieldProps {
  pathChain: PathChain;
  onPathChainChange: (pathChain: PathChain) => void;
  selectedWaypointId: string | null;
  onSelectedWaypointChange: (id: string | null) => void;
  selectedPathId: string | null;
  onControlPointDragMove?: (pathId: string, cpIndex: 1 | 2, x: number, y: number) => void;
  mapImage: HTMLImageElement | null;
  selectingPathEndpoint?: boolean;
  onPathEndpointSelect?: (waypointId: string) => void;
  onCreateWaypoint?: (x: number, y: number) => void;
}

const CANVAS_SIZE = 650;

export const Field = ({
  pathChain,
  onPathChainChange,
  selectedWaypointId,
  onSelectedWaypointChange,
  selectedPathId,
  onControlPointDragMove,
  mapImage,
  selectingPathEndpoint,
  onPathEndpointSelect,
  onCreateWaypoint,
}: FieldProps) => {
  const stageRef = useRef<any>(null);

  // Check if click is near a waypoint
  const getWaypoints = useCallback(() => {
    return pathChain.waypoints;
  }, [pathChain.waypoints]);

  // Handle canvas click to select a waypoint
  const handleStageClick = useCallback(
    () => {
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Check if we clicked on a waypoint first
      const waypoints = getWaypoints();
      const clickedWaypoint = waypoints.find(w => {
        const canvasPt = pointToCanvas({ x: w.x, y: w.y }, CANVAS_SIZE);
        const dist = Math.sqrt((pos.x - canvasPt.x) ** 2 + (pos.y - canvasPt.y) ** 2);
        return dist < 14;
      });

      // Only handle waypoint selection
      if (clickedWaypoint) {
        onSelectedWaypointChange(clickedWaypoint.id);
      }
    },
    [pathChain, onPathChainChange, onSelectedWaypointChange, getWaypoints],
  );

  // Handle right-click to create waypoint
  const handleStageContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!onCreateWaypoint) return;

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const fieldPoint = canvasToPoint(pos, CANVAS_SIZE);
      onCreateWaypoint(
        clampToFieldX(fieldPoint.x),
        clampToFieldY(fieldPoint.y)
      );
    },
    [onCreateWaypoint],
  );

  // Handle waypoint drag
  const handleWaypointDragMove = useCallback(
    (id: string, x: number, y: number) => {
      const fieldPoint = canvasToPoint({ x, y }, CANVAS_SIZE);

      const updatedWaypoints = pathChain.waypoints.map((wp) =>
        wp.id === id
          ? {
              ...wp,
              x: clampToFieldX(fieldPoint.x),
              y: clampToFieldY(fieldPoint.y),
            }
          : wp,
      );

      onPathChainChange({
        ...pathChain,
        waypoints: updatedWaypoints,
      });
    },
    [pathChain, onPathChainChange],
  );

  // Draw grid lines
  const gridLines = [];
  const gridSpacing = CANVAS_SIZE / 12; // 12-inch grid

  // Vertical grid lines
  for (let i = 0; i <= 12; i++) {
    const x = i * gridSpacing;
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[x, 0, x, CANVAS_SIZE]}
        stroke="#374151"
        strokeWidth={i === 6 ? 2 : 1} // Thicker center line
        opacity={i === 6 ? 0.8 : 0.3}
      />,
    );
  }

  // Horizontal grid lines
  for (let i = 0; i <= 12; i++) {
    const y = i * gridSpacing;
    gridLines.push(
      <Line
        key={`h-${i}`}
        points={[0, y, CANVAS_SIZE, y]}
        stroke="#374151"
        strokeWidth={i === 6 ? 2 : 1} // Thicker center line
        opacity={i === 6 ? 0.8 : 0.3}
      />,
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: 'relative' }} onContextMenu={handleStageContextMenu}>
        <Stage
          ref={stageRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onClick={handleStageClick}
          className="border-2 border-gray-600 rounded-lg"
          style={{
            background: '#1f2937',
            cursor: 'default'
          }}
        >
          <Layer>
            {/* Field background */}
            <Rect
              x={0}
              y={0}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              fill="#111827"
            />

            {/* Map image overlay */}
            {mapImage && (
              <KonvaImage
                image={mapImage}
                x={0}
                y={0}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                opacity={0.8}
              />
            )}

            {/* Grid */}
            {gridLines}

            {/* Path chain */}
            <PathChainComponent
              pathChain={pathChain}
              canvasSize={CANVAS_SIZE}
              selectedWaypointId={selectedWaypointId}
              selectedPathId={selectedPathId}
              onWaypointDragMove={handleWaypointDragMove}
              onWaypointClick={onSelectedWaypointChange}
              onControlPointDragMove={onControlPointDragMove}
              selectingPathEndpoint={selectingPathEndpoint}
              onPathEndpointSelect={onPathEndpointSelect}
            />
          </Layer>
        </Stage>

        {/* Mode hint */}
        <div className="absolute top-2 left-2 text-xs text-gray-500 bg-gray-900/70 px-2 py-1 rounded border border-gray-700 font-mono">
          Select/drag waypoints to set positions
        </div>
      </div>

    </div>
  );
};
