import { useState, useCallback, useEffect } from 'react';
import { PathChain, Waypoint, Path } from './types';
import { Field } from './components/Field';
import { CodeGenerator } from './components/CodeGenerator';
import { canvasToPoint } from './utils/coordinates';
import { PathLengthDisplay } from './components/PathLengthDisplay';
import { DecelerationControls } from './components/DecelerationControls';
import { FieldOverlay } from './components/FieldOverlay';
import { useUndoRedo } from './hooks/useUndoRedo';

// Color palette for sequential waypoint/path coloring
const WAYPOINT_COLORS = [
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

const initialChain: PathChain = {
  id: 'chain-1',
  name: 'myPathChain',
  waypoints: [],
  paths: [],
};

function App() {
  const [chains, setChains] = useState<PathChain[]>([initialChain]);
  const [activeChainIndex, setActiveChainIndex] = useState(0);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'waypoints' | 'paths' | 'code'>('waypoints');
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [selectingPathEndpoint, setSelectingPathEndpoint] = useState(false);

  const activeChain = chains[activeChainIndex] || chains[0];
  const startWaypoint = activeChain.startingWaypointId
    ? activeChain.waypoints.find(w => w.id === activeChain.startingWaypointId)
    : null;
  const additionalWaypoints = activeChain.waypoints.filter(w => w.id !== activeChain.startingWaypointId);
  const nextPathStartWaypoint = activeChain.paths.length === 0
    ? startWaypoint
    : activeChain.waypoints.find(w => w.id === activeChain.paths[activeChain.paths.length - 1]?.endWaypointId);
  // Filter available endpoints: exclude only the current path start point
  const availablePathEndpoints = activeChain.waypoints.filter(
    (w) => w.id !== nextPathStartWaypoint?.id
  );

  // Undo/Redo for active chain
  const { undo, redo, canUndo, canRedo } = useUndoRedo(activeChain);

  // Sync when switching chains
  useEffect(() => {
    // Reset history when switching chains
  }, [activeChainIndex]);

  // Function to assign colors to waypoints based on path sequence
  const assignWaypointColors = useCallback((waypoints: Waypoint[], paths: Path[], startingWaypointId?: string): Waypoint[] => {
    if (!startingWaypointId) return waypoints;

    const coloredWaypoints = waypoints.map(w => ({ ...w }));

    // Start with the starting waypoint
    const startWp = coloredWaypoints.find(w => w.id === startingWaypointId);
    if (startWp) {
      startWp.color = WAYPOINT_COLORS[0];
    }

    // Get waypoints in path sequence order
    const waypointOrder: Waypoint[] = [startWp!];
    let currentWaypointId = startingWaypointId;

    for (const path of paths) {
      if (path.startWaypointId === currentWaypointId) {
        const endWp = coloredWaypoints.find(w => w.id === path.endWaypointId);
        if (endWp && !waypointOrder.some(w => w.id === endWp.id)) {
          waypointOrder.push(endWp);
        }
        currentWaypointId = path.endWaypointId;
      }
    }

    // Add any remaining waypoints not in the path sequence
    for (const wp of coloredWaypoints) {
      if (!waypointOrder.some(w => w.id === wp.id)) {
        waypointOrder.push(wp);
      }
    }

    // Assign colors based on order
    waypointOrder.forEach((wp, index) => {
      wp.color = WAYPOINT_COLORS[index % WAYPOINT_COLORS.length];
    });

    return coloredWaypoints;
  }, []);

  const updateActiveChain = useCallback((updatedChain: PathChain) => {
    // Assign colors to waypoints based on path sequence
    const coloredWaypoints = assignWaypointColors(updatedChain.waypoints, updatedChain.paths, updatedChain.startingWaypointId);
    const chainWithColors = { ...updatedChain, waypoints: coloredWaypoints };

    setChains(prev => {
      const newChains = prev.map((c, i) => i === activeChainIndex ? chainWithColors : c);
      return newChains;
    });
  }, [activeChainIndex, assignWaypointColors]);

  const selectedWaypoint = activeChain.waypoints.find((w) => w.id === selectedWaypointId);



  // Add a new waypoint
  // Set the starting waypoint
  const setStartingWaypoint = useCallback(() => {
    const newWaypoint: Waypoint = {
      id: `waypoint-${Date.now()}`,
      name: 'Point 1',
      x: 72,
      y: 72,
    };

    updateActiveChain({
      ...activeChain,
      startingWaypointId: newWaypoint.id,
      waypoints: [...activeChain.waypoints, newWaypoint],
    });
    setSelectedWaypointId(newWaypoint.id);
  }, [activeChain, updateActiveChain]);

  // Add a new waypoint (after the starting waypoint exists)
  const addWaypoint = useCallback(() => {
    if (!activeChain.startingWaypointId) return; // Need starting waypoint first
    
    const newWaypoint: Waypoint = {
      id: `waypoint-${Date.now()}`,
      name: `Point ${activeChain.waypoints.length + 1}`,
      x: 72,
      y: 72,
      heading: 0,
    };

    updateActiveChain({
      ...activeChain,
      waypoints: [...activeChain.waypoints, newWaypoint],
    });
    setSelectedWaypointId(newWaypoint.id);
  }, [activeChain, updateActiveChain]);

  // Add waypoint at specific position (from map right-click)
  const addWaypointAtPosition = useCallback((x: number, y: number) => {
    if (!activeChain.startingWaypointId) {
      // Create starting waypoint if none exists
      const newStartingWaypoint: Waypoint = {
        id: `waypoint-${Date.now()}`,
        name: 'Point 1',
        x,
        y,
      };

      updateActiveChain({
        ...activeChain,
        startingWaypointId: newStartingWaypoint.id,
        waypoints: [...activeChain.waypoints, newStartingWaypoint],
      });
      setSelectedWaypointId(newStartingWaypoint.id);
    } else {
      // Add additional waypoint
      const newWaypoint: Waypoint = {
        id: `waypoint-${Date.now()}`,
        name: `Point ${activeChain.waypoints.length + 1}`,
        x,
        y,
        heading: 0,
      };

      updateActiveChain({
        ...activeChain,
        waypoints: [...activeChain.waypoints, newWaypoint],
      });
      setSelectedWaypointId(newWaypoint.id);
    }
  }, [activeChain, updateActiveChain]);

  // Update a waypoint
  const updateWaypoint = useCallback((waypointId: string, updates: Partial<Waypoint>) => {
    updateActiveChain({
      ...activeChain,
      waypoints: activeChain.waypoints.map(w =>
        w.id === waypointId ? { ...w, ...updates } : w
      ),
    });
  }, [activeChain, updateActiveChain]);

  // Delete a waypoint and its connected paths
  const deleteWaypoint = useCallback((waypointId: string) => {
    const isStartingWaypoint = waypointId === activeChain.startingWaypointId;
    updateActiveChain({
      ...activeChain,
      startingWaypointId: isStartingWaypoint ? undefined : activeChain.startingWaypointId,
      waypoints: activeChain.waypoints.filter(w => w.id !== waypointId),
      paths: activeChain.paths.filter(p => p.startWaypointId !== waypointId && p.endWaypointId !== waypointId),
    });
    setSelectedWaypointId(null);
  }, [activeChain, updateActiveChain]);

  const createPath = useCallback((endWaypointId: string) => {
    if (!activeChain.startingWaypointId) return;
    const startWaypointId = activeChain.paths.length === 0
      ? activeChain.startingWaypointId
      : activeChain.paths[activeChain.paths.length - 1].endWaypointId;

    if (startWaypointId === endWaypointId) return;

    const newPath: Path = {
      id: `path-${Date.now()}`,
      startWaypointId,
      endWaypointId,
      headingInterpolation: 'tangent',
      type: 'line',
    };

    updateActiveChain({
      ...activeChain,
      paths: [...activeChain.paths, newPath],
    });
    setSelectedPathId(newPath.id);
    setSelectingPathEndpoint(false);
  }, [activeChain, updateActiveChain]);

  // Delete a path
  const deletePath = useCallback((pathId: string) => {
    updateActiveChain({
      ...activeChain,
      paths: activeChain.paths.filter(p => p.id !== pathId),
    });
    setSelectedPathId(null);
  }, [activeChain, updateActiveChain]);

  // Update a path
  const updatePath = useCallback((pathId: string, updates: Partial<Path>) => {
    updateActiveChain({
      ...activeChain,
      paths: activeChain.paths.map(p =>
        p.id === pathId ? { ...p, ...updates } : p
      ),
    });
  }, [activeChain, updateActiveChain]);

  // Handle control point dragging for curve paths
  const handleControlPointDragMove = useCallback((pathId: string, cpIndex: 1 | 2, canvasX: number, canvasY: number) => {
    // Convert canvas coordinates back to field coordinates using proper conversion
    const CANVAS_SIZE = 650;
    const fieldPoint = canvasToPoint({ x: canvasX, y: canvasY }, CANVAS_SIZE);
    
    const updates: any = {};
    if (cpIndex === 1) {
      updates.controlPoint1 = fieldPoint;
    } else {
      updates.controlPoint2 = fieldPoint;
    }
    
    updatePath(pathId, updates);
  }, [updatePath]);

  // Load map image
  const handleMapUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setMapImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle preset image selection
  const handlePresetImageSelect = useCallback((imageUrl: string | null) => {
    if (!imageUrl) {
      setMapImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setMapImage(img);
    };
    img.src = imageUrl;
  }, []);

  // Save to JSON
  const saveJSON = useCallback(() => {
    const data = JSON.stringify({ chains }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pedro-paths.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [chains]);

  // Load from JSON
  const loadJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.chains && Array.isArray(data.chains)) {
          setChains(data.chains);
          setActiveChainIndex(0);
          setSelectedWaypointId(null);
          setSelectedPathId(null);
        }
      } catch (err) {
        console.error('Failed to load JSON:', err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // Clear current chain
  const clearChain = useCallback(() => {
    updateActiveChain({ ...activeChain, startingWaypointId: undefined, waypoints: [], paths: [] });
    setSelectedWaypointId(null);
    setSelectedPathId(null);
    setSelectingPathEndpoint(false);
  }, [activeChain, updateActiveChain]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="h-screen overflow-hidden bg-gray-950 text-white flex flex-col">
      {/* Header / Topbar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <h1 className="text-lg font-bold text-blue-400 font-mono">Pedro Planner</h1>
        <div className="w-px h-5 bg-gray-700" />
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
            canUndo ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
            canRedo ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
        <div className="w-px h-5 bg-gray-700" />
        <button
          onClick={() => document.getElementById('load-input')?.click()}
          className="text-[11px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Load
        </button>
        <input
          type="file"
          id="load-input"
          accept=".json"
          className="hidden"
          onChange={loadJSON}
        />
        <button
          onClick={saveJSON}
          className="text-[11px] px-2 py-0.5 bg-green-900 hover:bg-green-800 text-green-300 rounded transition-colors"
        >
          Save
        </button>
        <div className="w-px h-5 bg-gray-700" />
        <label className="text-[11px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors cursor-pointer">
          Map
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleMapUpload(file);
              e.target.value = '';
            }}
          />
        </label>
        {mapImage && (
          <button
            onClick={() => setMapImage(null)}
            className="text-[11px] px-2 py-0.5 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
          >
            ✕
          </button>
        )}
        <FieldOverlay onImageSelect={handlePresetImageSelect} />
        <button
          onClick={clearChain}
          className="text-[11px] px-2 py-0.5 bg-red-900 hover:bg-red-800 text-red-300 rounded transition-colors ml-auto"
        >
          Clear
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field */}
        <div className="flex-1 p-4 bg-gray-950 flex justify-center items-center overflow-hidden">
          <Field
            pathChain={activeChain}
            onPathChainChange={updateActiveChain}
            selectedWaypointId={selectedWaypointId}
            onSelectedWaypointChange={setSelectedWaypointId}
            selectedPathId={selectedPathId}
            onControlPointDragMove={handleControlPointDragMove}
            mapImage={mapImage}
            selectingPathEndpoint={selectingPathEndpoint}
            onPathEndpointSelect={createPath}
            onCreateWaypoint={addWaypointAtPosition}
          />
        </div>

        {/* Right Sidebar */}
        <div className="w-[680px] bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0 min-h-0">
          {/* View Tabs */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            <button
              onClick={() => setRightTab('waypoints')}
              className={`flex-1 px-3 py-2 text-sm font-mono transition-colors ${
                rightTab === 'waypoints'
                  ? 'bg-gray-850 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
              }`}
            >
              Waypoints
            </button>
            <button
              onClick={() => setRightTab('paths')}
              className={`flex-1 px-3 py-2 text-sm font-mono transition-colors ${
                rightTab === 'paths'
                  ? 'bg-gray-850 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
              }`}
            >
              Paths
            </button>
            <button
              onClick={() => setRightTab('code')}
              className={`flex-1 px-3 py-2 text-sm font-mono transition-colors ${
                rightTab === 'code'
                  ? 'bg-gray-850 text-white'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
              }`}
            >
              Code
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {rightTab === 'waypoints' ? (
              <div className="p-3 space-y-3">
                {/* Waypoints List */}
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                    Waypoints ({activeChain.waypoints.length})
                  </div>
                  <div className="max-h-[24rem] overflow-y-auto p-2">
                    {!activeChain.startingWaypointId ? (
                      <div className="text-xs text-gray-500 font-mono p-2">
                        Set the starting waypoint first. The first waypoint defines the beginning of your sequence.
                      </div>
                    ) : (
                      <ul className="space-y-2 list-none">
                        {startWaypoint && (
                          <li
                            onClick={() => setSelectedWaypointId(startWaypoint.id)}
                            className={`p-2 border rounded cursor-pointer transition-colors ${
                              selectedWaypointId === startWaypoint.id
                                ? 'bg-blue-900/30 border-blue-500'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: startWaypoint.color || '#3366cc' }}
                                  />
                                  <div>
                                    <div className="text-xs font-mono text-teal-300 font-semibold truncate">{startWaypoint.name} (Starting Point)</div>
                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                      ({startWaypoint.x.toFixed(1)}, {startWaypoint.y.toFixed(1)})
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteWaypoint(startWaypoint.id);
                                }}
                                className="text-xs px-1.5 py-0.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          </li>
                        )}

                        {additionalWaypoints.length === 0 ? (
                          <div className="text-xs text-gray-500 font-mono p-2">
                            Add additional waypoints to build your path sequence.
                          </div>
                        ) : (
                          additionalWaypoints.map((waypoint) => (
                            <li
                              key={waypoint.id}
                              onClick={() => setSelectedWaypointId(waypoint.id)}
                              className={`p-2 border rounded cursor-pointer transition-colors ${
                                selectedWaypointId === waypoint.id
                                  ? 'bg-blue-900/30 border-blue-500'
                                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: waypoint.color || '#3366cc' }}
                                    />
                                    <div>
                                      <div className="text-xs font-mono text-white font-semibold truncate">{waypoint.name}</div>
                                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                        ({startWaypoint!.x.toFixed(1)}, {startWaypoint!.y.toFixed(1)})
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteWaypoint(waypoint.id);
                                  }}
                                  className="text-xs px-1.5 py-0.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-gray-800 p-3 bg-gray-900">
                    {!activeChain.startingWaypointId ? (
                      <button
                        onClick={setStartingWaypoint}
                        className="w-full px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] transition-colors"
                      >
                        + Set Starting Waypoint
                      </button>
                    ) : (
                      <button
                        onClick={addWaypoint}
                        className="w-full px-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] transition-colors"
                      >
                        + Add Waypoint
                      </button>
                    )}
                  </div>
                </div>

                {/* Waypoint Properties */}
                {selectedWaypoint && (
                  <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                    <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                      Waypoint Properties
                    </div>
                    <div className="p-3 space-y-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Name:</label>
                        <input
                          type="text"
                          value={selectedWaypoint.name}
                          onChange={(e) => updateWaypoint(selectedWaypoint.id, { name: e.target.value })}
                          className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">X:</label>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedWaypoint.x.toFixed(2)}
                            onChange={(e) => updateWaypoint(selectedWaypoint.id, { x: parseFloat(e.target.value) || 0 })}
                            className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">Y:</label>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedWaypoint.y.toFixed(2)}
                            onChange={(e) => updateWaypoint(selectedWaypoint.id, { y: parseFloat(e.target.value) || 0 })}
                            className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Heading (deg):</label>
                        <input
                          type="number"
                          step="0.1"
                          value={(selectedWaypoint.heading ?? 0).toFixed(2)}
                          onChange={(e) => updateWaypoint(selectedWaypoint.id, { heading: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                        />
                      </div>

                    </div>
                  </div>
                )}
              </div>
            ) : rightTab === 'paths' ? (
              <div className="p-3 space-y-3">
                {/* Create Path Section */}
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                    Create Path
                  </div>
                  <div className="p-3 space-y-2">
                    {!activeChain.startingWaypointId ? (
                      <div className="text-xs text-gray-500 font-mono">
                        Create a starting waypoint in the Waypoints tab before creating paths.
                      </div>
                    ) : availablePathEndpoints.length === 0 ? (
                      <div className="text-xs text-gray-500 font-mono">
                        Add more waypoints in the Waypoints tab to create the next path.
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Path starts from</label>
                          <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-xs text-white">
                            {nextPathStartWaypoint?.name || 'Start'}
                          </div>
                        </div>

                        {selectingPathEndpoint ? (
                          <div className="px-3 py-2 bg-blue-900/30 border border-blue-500 rounded text-xs text-blue-200 font-mono">
                            Click on a waypoint on the map to select the end point
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectingPathEndpoint(true)}
                            className="w-full px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                          >
                            Select End Waypoint on Map
                          </button>
                        )}

                        {selectingPathEndpoint && (
                          <button
                            onClick={() => setSelectingPathEndpoint(false)}
                            className="w-full px-2 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Paths List */}
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                    Paths ({activeChain.paths.length})
                  </div>
                  <div className="max-h-[24rem] overflow-y-auto p-2">
                    {activeChain.paths.length === 0 ? (
                      <div className="text-xs text-gray-500 font-mono p-2">
                        No paths created yet.
                      </div>
                    ) : (
                      <ul className="space-y-2 list-none">
                        {activeChain.paths.map((path) => {
                          const startWp = activeChain.waypoints.find(w => w.id === path.startWaypointId);
                          const endWp = activeChain.waypoints.find(w => w.id === path.endWaypointId);
                          return (
                            <li
                              key={path.id}
                              onClick={() => setSelectedPathId(path.id)}
                              className={`p-2 border rounded cursor-pointer transition-colors ${
                                selectedPathId === path.id
                                  ? 'bg-blue-900/30 border-blue-500'
                                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  {path.name ? (
                                    <div className="text-xs font-mono text-purple-300 font-semibold truncate">{path.name}</div>
                                  ) : null}
                                  <div className="text-xs font-mono text-gray-300">
                                    {startWp?.name || '?'} → {endWp?.name || '?'}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePath(path.id);
                                  }}
                                  className="text-xs px-1.5 py-0.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Path Properties */}
                {selectedPathId && activeChain.paths.find(p => p.id === selectedPathId) && (() => {
                  const selectedPath = activeChain.paths.find(p => p.id === selectedPathId)!;
                  const startWp = activeChain.waypoints.find(w => w.id === selectedPath.startWaypointId);
                  const endWp = activeChain.waypoints.find(w => w.id === selectedPath.endWaypointId);
                  
                  return (
                    <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950 max-h-[28rem] flex flex-col">
                      <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                        Path Properties
                      </div>
                      <div className="p-3 space-y-3 overflow-y-auto flex-1">
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Path Name</label>
                          <input
                            type="text"
                            value={selectedPath.name || ''}
                            onChange={(e) => updatePath(selectedPathId, { name: e.target.value || undefined })}
                            placeholder={`path${activeChain.paths.indexOf(selectedPath)}`}
                            className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Path Type</label>
                          <select
                            value={selectedPath.type || 'line'}
                            onChange={(e) => {
                              const newType = e.target.value as any;
                              const updates: any = { type: newType };
                              
                              // Initialize control points for curves
                              if (newType === 'curve' && !selectedPath.controlPoint1) {
                                const mid1 = {
                                  x: startWp!.x * 0.7 + endWp!.x * 0.3,
                                  y: startWp!.y * 0.7 + endWp!.y * 0.3,
                                };
                                const mid2 = {
                                  x: startWp!.x * 0.3 + endWp!.x * 0.7,
                                  y: startWp!.y * 0.3 + endWp!.y * 0.7,
                                };
                                updates.controlPoint1 = mid1;
                                updates.controlPoint2 = mid2;
                              }
                              updatePath(selectedPathId, updates);
                            }}
                            className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                          >
                            <option value="line">Straight Line</option>
                            <option value="curve">Bezier Curve</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Heading Interpolation</label>
                          <select
                            value={selectedPath.headingInterpolation || 'tangent'}
                            onChange={(e) => updatePath(selectedPathId, { headingInterpolation: e.target.value as any })}
                            className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                          >
                            <option value="tangent">Tangent (follow path)</option>
                            <option value="constant">Constant (end heading)</option>
                            <option value="linear">Linear (start → end)</option>
                          </select>
                        </div>
                        {selectedPath.headingInterpolation === 'constant' && (
                          <div>
                            <label className="text-xs text-gray-400 font-mono block mb-1">Constant Heading (deg)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedPath.constantHeading ?? 0}
                              onChange={(e) => updatePath(selectedPathId, { constantHeading: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                            />
                          </div>
                        )}

                        {selectedPath.headingInterpolation === 'linear' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-400 font-mono block mb-1">Start Heading Override (deg)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedPath.startHeadingOverride ?? ''}
                                placeholder={`Auto (${activeChain.waypoints.find(w => w.id === selectedPath.startWaypointId)?.heading?.toFixed(1) ?? '0.0'})`}
                                onChange={(e) => updatePath(selectedPathId, { startHeadingOverride: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 font-mono block mb-1">End Heading Override (deg)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedPath.endHeadingOverride ?? ''}
                                placeholder={`Auto (${activeChain.waypoints.find(w => w.id === selectedPath.endWaypointId)?.heading?.toFixed(1) ?? '0.0'})`}
                                onChange={(e) => updatePath(selectedPathId, { endHeadingOverride: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        )}
                        <div className="border-t border-gray-700 pt-2">
                          <div className="text-xs text-gray-300 font-semibold mb-2">Constraints</div>
                          
                          <div className="mb-2">
                            <label className="text-xs text-gray-400 font-mono block mb-1">Timeout (ms)</label>
                            <input
                              type="number"
                              value={selectedPath.timeoutConstraint || ''}
                              onChange={(e) => updatePath(selectedPathId, { timeoutConstraint: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="Optional"
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div className="mb-2">
                            <label className="text-xs text-gray-400 font-mono block mb-1">T-Value (0.0-1.0)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              value={selectedPath.tValueConstraint !== undefined ? selectedPath.tValueConstraint : ''}
                              onChange={(e) => updatePath(selectedPathId, { tValueConstraint: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="Optional"
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div className="mb-2">
                            <label className="text-xs text-gray-400 font-mono block mb-1">Max Velocity (in/s)</label>
                            <input
                              type="number"
                              value={selectedPath.velocityConstraint || ''}
                              onChange={(e) => updatePath(selectedPathId, { velocityConstraint: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="Optional"
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div className="mb-2">
                            <label className="text-xs text-gray-400 font-mono block mb-1">Translational Error (in)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedPath.translationalConstraint || ''}
                              onChange={(e) => updatePath(selectedPathId, { translationalConstraint: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="Optional"
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-gray-400 font-mono block mb-1">Braking Strength (0.1-5.0)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="5.0"
                              value={selectedPath.brakingStrength || ''}
                              onChange={(e) => updatePath(selectedPathId, { brakingStrength: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="Optional"
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            ) : (
              <div className="p-3 space-y-3">
                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                    Path Summary
                  </div>
                  <div className="p-3">
                    <PathLengthDisplay pathChain={activeChain} />
                  </div>
                </div>

                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                    Deceleration
                  </div>
                  <div className="p-3">
                    <DecelerationControls
                      pathChain={activeChain}
                      onPathChainChange={updateActiveChain}
                    />
                  </div>
                </div>

                <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                  <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">
                    Generated Code
                  </div>
                  <div className="p-3">
                    <CodeGenerator pathChain={activeChain} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
