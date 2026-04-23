import { useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Image as KonvaImage } from 'react-konva';
import { PathChain } from '../types';
import { canvasToPoint, pointToCanvas, clampToFieldX, clampToFieldY } from '../utils/coordinates';
import { PathChainComponent } from './PathChain';

interface FieldProps {
  pathChain: PathChain;
  onPathChainChange: (pathChain: PathChain) => void;
  selectedPoseId: string | null;
  onSelectedPoseChange: (id: string | null, e?: any) => void;
  selectedPathId: string | null;
  onSelectedPathChange?: (id: string | null) => void;
  onControlPointDragMove?: (pathId: string, cpIndex: 1 | 2, x: number, y: number) => void;
  onPoseHeadingChange?: (id: string, heading: number) => void;
  mapImage: HTMLImageElement | null;
  selectingPathEndpoint?: boolean;
  onPathEndpointSelect?: (poseId: string) => void;
  onCreatePose?: (x: number, y: number, createPath: boolean) => void;
  onPathCreate?: (endPoseId: string) => void;
}

export const CANVAS_SIZE = 650;

export const Field = ({
  pathChain,
  onPathChainChange,
  selectedPoseId,
  onSelectedPoseChange,
  selectedPathId,
  onSelectedPathChange,
  onControlPointDragMove,
  onPoseHeadingChange,
  mapImage,
  selectingPathEndpoint,
  onPathEndpointSelect,
  onCreatePose,
  onPathCreate,
}: FieldProps) => {

  const stageRef = useRef<any>(null);

  // Check if click is near a pose
  const getPoses = useCallback(() => {
    return pathChain.poses;
  }, [pathChain.poses]);

  // Handle canvas click to select/create a pose
  const handleStageClick = useCallback(
    (e: any) => {
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Check if we clicked on a pose first
      const poses = getPoses();
      const clickedPose = poses.find(w => {
        const canvasPt = pointToCanvas({ x: w.x, y: w.y }, CANVAS_SIZE);
        const dist = Math.sqrt((pos.x - canvasPt.x) ** 2 + (pos.y - canvasPt.y) ** 2);
        return dist < 14;
      });

      // Handle Ctrl+Click or Shift+Click on empty space: Create new pose
      if ((e.evt.ctrlKey || (e.evt.shiftKey && !clickedPose)) && onCreatePose) {
        const fieldPoint = canvasToPoint(pos, CANVAS_SIZE);
        onCreatePose(
          clampToFieldX(fieldPoint.x),
          clampToFieldY(fieldPoint.y),
          e.evt.shiftKey
        );
        return;
      }

      // Handle Shift+Click: Create path
      if (e.evt.shiftKey && clickedPose && onPathCreate) {
        onPathCreate(clickedPose.id);
        return;
      }

      // Only handle pose selection
      if (clickedPose) {
        onSelectedPoseChange(clickedPose.id, e);
      } else {
        onSelectedPoseChange(null, e);
      }
    },
    [pathChain, onPathChainChange, onSelectedPoseChange, getPoses, onCreatePose, onPathCreate],
  );

  // Handle pose drag
  const handlePoseDragMove = useCallback(
    (id: string, x: number, y: number) => {
      const fieldPoint = canvasToPoint({ x, y }, CANVAS_SIZE);

      const updatedPoses = pathChain.poses.map((p) =>
        p.id === id
          ? {
              ...p,
              x: clampToFieldX(fieldPoint.x),
              y: clampToFieldY(fieldPoint.y),
            }
          : p,
      );

      onPathChainChange({
        ...pathChain,
        poses: updatedPoses,
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
      <div style={{ position: 'relative' }}>
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
              selectedPoseId={selectedPoseId}
              selectedPathId={selectedPathId}
              onPoseDragMove={handlePoseDragMove}
              onPoseClick={onSelectedPoseChange}
              onPathClick={onSelectedPathChange}
              onHeadingChange={onPoseHeadingChange}
              onControlPointDragMove={onControlPointDragMove}
              selectingPathEndpoint={selectingPathEndpoint}
              onPathEndpointSelect={onPathEndpointSelect}
            />
          </Layer>
        </Stage>
      </div>

    </div>
  );
};
