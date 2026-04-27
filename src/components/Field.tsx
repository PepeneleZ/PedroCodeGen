import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Image as KonvaImage, Group, Circle, Arrow } from 'react-konva';
import { PathChain } from '../types';
import { canvasToPoint, pointToCanvas, clampToFieldX, clampToFieldY, inchesToPixels } from '../utils/coordinates';
import { PathChainComponent } from './PathChain';
import { generateGhostPathPoints, generateOnionLayers } from '../utils/pathSimulation';

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
  canvasSize: number;
  simPose?: { x: number; y: number; heading: number } | null;
}

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
  canvasSize,
  simPose,
}: FieldProps) => {

  const stageRef = useRef<any>(null);

  // Robot dimensions in inches
  const settings = pathChain.simulationSettings;
  const robotWidth = settings?.robotWidth ?? 18;
  const robotHeight = settings?.robotHeight ?? 18;

  const [robotImageObj, setRobotImageObj] = useState<HTMLImageElement | null>(null);

  // Load custom robot image
  useEffect(() => {
    if (settings?.robotImageUrl) {
      const img = new Image();
      img.src = settings.robotImageUrl;
      img.onload = () => {
        setRobotImageObj(img);
      };
    } else {
      setRobotImageObj(null);
    }
  }, [settings?.robotImageUrl]);

  const robotCanvasPos = simPose ? pointToCanvas(simPose, canvasSize) : null;
  const robotWidthPx = inchesToPixels(robotWidth, canvasSize);
  const robotHeightPx = inchesToPixels(robotHeight, canvasSize);

  // Ghost path points
  const ghostPathPoints = useMemo(() => {
    if (!settings || !settings.showGhostPaths || pathChain.paths.length === 0) return [];
    const pts = generateGhostPathPoints(pathChain, settings);
    return pts.flatMap(p => {
      const cp = pointToCanvas(p, canvasSize);
      return [cp.x, cp.y];
    });
  }, [pathChain, settings, canvasSize]);

  // Onion layers
  const onionLayers = useMemo(() => {
    if (!settings || !settings.showOnionLayers || pathChain.paths.length === 0) return [];
    return generateOnionLayers(pathChain, settings, settings.onionLayerSpacing || 10);
  }, [pathChain, settings]);

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
        const canvasPt = pointToCanvas({ x: w.x, y: w.y }, canvasSize);
        const dist = Math.sqrt((pos.x - canvasPt.x) ** 2 + (pos.y - canvasPt.y) ** 2);
        return dist < 14;
      });

      // Handle Ctrl+Click or Shift+Click on empty space: Create new pose
      if ((e.evt.ctrlKey || (e.evt.shiftKey && !clickedPose)) && onCreatePose) {
        const fieldPoint = canvasToPoint(pos, canvasSize);
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
    [pathChain, onPathChainChange, onSelectedPoseChange, getPoses, onCreatePose, onPathCreate, canvasSize],
  );

  // Handle pose drag
  const handlePoseDragMove = useCallback(
    (id: string, x: number, y: number) => {
      const fieldPoint = canvasToPoint({ x, y }, canvasSize);

      onPathChainChange({
        ...pathChain,
        poses: pathChain.poses.map((p) =>
          p.id === id
            ? { ...p, x: clampToFieldX(fieldPoint.x), y: clampToFieldY(fieldPoint.y) }
            : p
        ),
      });
    },
    [pathChain, onPathChainChange, canvasSize],
  );

  // Draw grid lines
  const gridLines = [];
  const gridSpacing = canvasSize / 12; // 12-inch grid

  // Vertical grid lines
  for (let i = 0; i <= 12; i++) {
    const x = i * gridSpacing;
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[x, 0, x, canvasSize]}
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
        points={[0, y, canvasSize, y]}
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
          width={canvasSize}
          height={canvasSize}
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
              width={canvasSize}
              height={canvasSize}
              fill="#111827"
            />

            {/* Map image overlay */}
            {mapImage && (
              <KonvaImage
                image={mapImage}
                x={0}
                y={0}
                width={canvasSize}
                height={canvasSize}
                opacity={0.8}
              />
            )}

            {/* Grid */}
            {gridLines}

            {/* Ghost path */}
            {settings?.showGhostPaths && ghostPathPoints.length > 0 && (
              <Line
                points={ghostPathPoints}
                stroke="#a78bfa"
                strokeWidth={2}
                opacity={0.3}
                dash={[5, 5]}
              />
            )}

            {/* Onion layers */}
            {settings?.showOnionLayers && onionLayers.map((layer, idx) => {
              const canvasCorners = layer.corners.flatMap(p => {
                const cp = pointToCanvas(p, canvasSize);
                return [cp.x, cp.y];
              });
              return (
                <Line
                  key={`onion-${idx}`}
                  points={[...canvasCorners, canvasCorners[0], canvasCorners[1]]}
                  stroke={settings.onionColor || "#dc2626"}
                  strokeWidth={1}
                  opacity={0.4}
                />
              );
            })}

            {/* Path chain */}
            <PathChainComponent
              pathChain={pathChain}
              canvasSize={canvasSize}
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

            {/* Robot simulation */}
            {robotCanvasPos && (
              <Group
                x={robotCanvasPos.x}
                y={robotCanvasPos.y}
                rotation={-simPose!.heading} // Convert CCW field heading to CW Konva rotation
              >
                {robotImageObj ? (
                  <KonvaImage
                    image={robotImageObj}
                    x={-robotHeightPx / 2}
                    y={-robotWidthPx / 2}
                    width={robotHeightPx}
                    height={robotWidthPx}
                  />
                ) : (
                  <Rect
                    x={-robotHeightPx / 2}
                    y={-robotWidthPx / 2}
                    width={robotHeightPx}
                    height={robotWidthPx}
                    fill="rgba(59, 130, 246, 0.4)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    cornerRadius={2}
                  />
                )}
                
                {/* Heading Arrow */}
                {settings?.showHeadingArrow ? (
                  <Arrow
                    points={[0, 0, Math.max(robotHeightPx, 40), 0]}
                    pointerLength={10}
                    pointerWidth={10}
                    fill="#ffffff"
                    stroke="#ffffff"
                    strokeWidth={2}
                    opacity={0.9}
                  />
                ) : (
                  <>
                    <Line
                      points={[0, 0, robotHeightPx / 2, 0]}
                      stroke="#ffffff"
                      strokeWidth={2}
                      opacity={0.8}
                    />
                    <Circle
                      x={robotHeightPx / 2}
                      y={0}
                      radius={3}
                      fill="#ffffff"
                    />
                  </>
                )}
              </Group>
            )}
          </Layer>
        </Stage>
      </div>

    </div>
  );
};
