import { useState, useCallback, useEffect, useRef } from 'react';
import { PathChain, Pose, Path } from './types';
import { Field } from './components/Field';
import { CodeGenerator } from './components/CodeGenerator';
import { canvasToPoint } from './utils/coordinates';
import { FieldOverlay } from './components/FieldOverlay';
import { useUndoRedo } from './hooks/useUndoRedo';
import decodeImg from './fields/decode.png';

const POSE_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#6366f1',
];

const initialChain: PathChain = {
  id: 'chain-0',
  name: 'New Path',
  startingPoseId: '',
  poses: [],
  paths: [],
};

const assignPoseColors = (poses: Pose[], paths: Path[], startingPoseId?: string): Pose[] => {
  if (!startingPoseId) return poses;
  const coloredPoses = poses.map(w => ({ ...w }));
  const startWp = coloredPoses.find(w => w.id === startingPoseId);
  if (startWp) startWp.color = '#8b5cf6';
  const poseOrder: Pose[] = [startWp!];
  let currentPoseId = startingPoseId;
  for (const path of paths) {
    if (path.startPoseId === currentPoseId) {
      const endWp = coloredPoses.find(w => w.id === (path.endPoseId || ''));
      if (endWp && !poseOrder.some(w => w.id === endWp.id)) poseOrder.push(endWp);
      currentPoseId = path.endPoseId || '';
    }
  }
  for (const wp of coloredPoses) if (!poseOrder.some(w => w.id === wp.id)) poseOrder.push(wp);
  poseOrder.forEach((wp, index) => { wp.color = POSE_COLORS[index % POSE_COLORS.length]; });
  return coloredPoses;
};

function App() {
  const [showCode, setShowCode] = useState(false);
  const [canvasSize, setCanvasSize] = useState(650);
  const containerRef = useRef<HTMLDivElement>(null);

  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(() => {
    const img = new Image();
    img.src = decodeImg;
    return img;
  });

  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const size = Math.min(width, height) - 32;
      setCanvasSize(Math.max(300, size));
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  const { state: editorState, set: setEditorState, undo, redo, canUndo, canRedo } = useUndoRedo({
    chains: [initialChain],
    activeChainIndex: 0,
    selectedPoseId: null as string | null,
    selectedPathId: null as string | null,
  });

  const { chains, activeChainIndex, selectedPoseId, selectedPathId } = editorState;
  const activeChain = chains[activeChainIndex];

  const updateActiveChain = useCallback((updatedChain: PathChain, selectionUpdates?: { selectedPoseId?: string | null, selectedPathId?: string | null }) => {
    const coloredPoses = assignPoseColors(updatedChain.poses, updatedChain.paths, updatedChain.startingPoseId);
    setEditorState(prev => ({
      ...prev,
      chains: prev.chains.map((c, i) => i === prev.activeChainIndex ? { ...updatedChain, poses: coloredPoses } : c),
      ...selectionUpdates
    }));
  }, [setEditorState]);

  const getLastPoseId = useCallback(() => {
    if (activeChain.paths.length === 0) return activeChain.startingPoseId;
    return activeChain.paths[activeChain.paths.length - 1].endPoseId;
  }, [activeChain]);

  const selectedPose = activeChain.poses.find((w) => w.id === selectedPoseId);
  const selectedPath = activeChain.paths.find(p => p.id === selectedPathId);
  const startPose = activeChain.startingPoseId ? activeChain.poses.find(w => w.id === activeChain.startingPoseId) : null;
  const additionalPoses = activeChain.poses.filter(w => w.id !== activeChain.startingPoseId);

  const createPath = useCallback((endPoseId: string) => {
    const startPoseId = getLastPoseId();
    if (!startPoseId || startPoseId === endPoseId) return;

    const existingPath = activeChain.paths.find(p => p.startPoseId === startPoseId && p.endPoseId === endPoseId);
    if (existingPath) {
      setEditorState(prev => ({ ...prev, selectedPathId: existingPath.id, selectedPoseId: null }));
      return;
    }

    const newPath: Path = { 
      id: `path-${Date.now()}`, 
      startPoseId, 
      endPoseId, 
      headingInterpolation: 'tangent', 
      type: 'line',
      deceleration: 'default' 
    };
    updateActiveChain(
      { ...activeChain, paths: [...activeChain.paths, newPath] },
      { selectedPathId: newPath.id, selectedPoseId: null }
    );
  }, [activeChain, updateActiveChain, setEditorState, getLastPoseId]);

  const handlePoseClick = useCallback((id: string | null, e?: any) => {
    if (e?.evt?.shiftKey && id) {
      createPath(id);
      return;
    }
    setEditorState(prev => ({ ...prev, selectedPoseId: id, selectedPathId: null }));
  }, [createPath, setEditorState]);

  const handlePathClick = useCallback((id: string | null) => {
    setEditorState(prev => ({ ...prev, selectedPathId: id, selectedPoseId: null }));
  }, [setEditorState]);

  const addPoseAtPosition = useCallback((x: number, y: number, createPathToNew: boolean = false) => {
    const newPoseId = `pose-${Date.now()}`;
    const newPose: Pose = { id: newPoseId, name: `Pose ${activeChain.poses.length + 1}`, x, y, heading: 0 };
    
    if (!activeChain.startingPoseId) {
      updateActiveChain(
        { ...activeChain, startingPoseId: newPoseId, poses: [...activeChain.poses, { ...newPose, name: 'Pose 1' }] },
        { selectedPoseId: newPoseId }
      );
    } else {
      let newPaths = [...activeChain.paths];
      let newSelectedPathId: string | null = null;

      if (createPathToNew) {
        const startPoseId = getLastPoseId();
        if (startPoseId && startPoseId !== newPoseId) {
          const newPath: Path = { 
            id: `path-${Date.now()}`, 
            startPoseId, 
            endPoseId: newPoseId, 
            headingInterpolation: 'tangent', 
            type: 'line', 
            deceleration: 'default'
          };
          newPaths.push(newPath);
          newSelectedPathId = newPath.id;
        }
      }

      updateActiveChain(
        { ...activeChain, poses: [...activeChain.poses, newPose], paths: newPaths },
        createPathToNew 
          ? { selectedPathId: newSelectedPathId, selectedPoseId: null }
          : { selectedPoseId: newPoseId, selectedPathId: null }
      );
    }
  }, [activeChain, updateActiveChain, getLastPoseId]);

  const updatePose = useCallback((poseId: string, updates: Partial<Pose>) => {
    updateActiveChain({ ...activeChain, poses: activeChain.poses.map(w => w.id === poseId ? { ...w, ...updates } : w) });
  }, [activeChain, updateActiveChain]);

  const deletePose = useCallback((poseId: string) => {
    updateActiveChain(
      {
        ...activeChain,
        startingPoseId: poseId === activeChain.startingPoseId ? undefined : activeChain.startingPoseId,
        poses: activeChain.poses.filter(w => w.id !== poseId),
        paths: activeChain.paths.filter(p => p.startPoseId !== poseId && p.endPoseId !== poseId),
      },
      { selectedPoseId: null }
    );
  }, [activeChain, updateActiveChain]);

  const deletePath = useCallback((pathId: string) => {
    updateActiveChain(
      { ...activeChain, paths: activeChain.paths.filter(p => p.id !== pathId) },
      { selectedPathId: null }
    );
  }, [activeChain, updateActiveChain]);

  const updatePath = useCallback((pathId: string, updates: Partial<Path>) => {
    updateActiveChain({ ...activeChain, paths: activeChain.paths.map(p => p.id === pathId ? { ...p, ...updates } : p) });
  }, [activeChain, updateActiveChain]);

  const handleControlPointDragMove = useCallback((pathId: string, cpIndex: 1 | 2, canvasX: number, canvasY: number) => {
    const fieldPoint = canvasToPoint({ x: canvasX, y: canvasY }, canvasSize);
    updatePath(pathId, cpIndex === 1 ? { controlPoint1: fieldPoint } : { controlPoint2: fieldPoint });
  }, [updatePath, canvasSize]);

  const handlePoseHeadingChange = useCallback((id: string, heading: number) => {
    updatePose(id, { heading });
  }, [updatePose]);

  const handlePresetImageSelect = useCallback((imageUrl: string | null) => {
    if (!imageUrl) { setMapImage(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setMapImage(img);
    img.src = imageUrl;
  }, []);

  const saveJSON = useCallback(() => {
    const data = JSON.stringify({ chains }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pedro-paths.json'; a.click();
    URL.revokeObjectURL(url);
  }, [chains]);

  const loadJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.chains?.length > 0) {
          setEditorState({
            chains: data.chains,
            activeChainIndex: 0,
            selectedPoseId: null,
            selectedPathId: null
          });
        }
      } catch (err) { console.error('Failed to load JSON:', err); }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [setEditorState]);

  const clearChain = useCallback(() => {
    updateActiveChain(
      { ...activeChain, startingPoseId: undefined, poses: [], paths: [] },
      { selectedPoseId: null, selectedPathId: null }
    );
  }, [activeChain, updateActiveChain]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="h-screen overflow-hidden bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <h1 className="text-lg font-bold text-blue-400 font-mono">Pedro Code Gen</h1>
        <div className="w-px h-5 bg-gray-700" />
        <button onClick={undo} disabled={!canUndo} className={`text-[11px] px-2 py-0.5 rounded transition-colors ${canUndo ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`} title="Undo (Ctrl+Z)">↶</button>
        <button onClick={redo} disabled={!canRedo} className={`text-[11px] px-2 py-0.5 rounded transition-colors ${canRedo ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`} title="Redo (Ctrl+Y)">↷</button>
        <div className="w-px h-5 bg-gray-700" />
        <button onClick={() => document.getElementById('load-input')?.click()} className="text-[11px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors">Load</button>
        <input type="file" id="load-input" accept=".json" className="hidden" onChange={loadJSON} />
        <button onClick={saveJSON} className="text-[11px] px-2 py-0.5 bg-green-900 hover:bg-green-800 text-green-300 rounded transition-colors">Save</button>
        <div className="w-px h-5 bg-gray-700" />
        <button onClick={() => setShowCode(true)} className="text-[11px] px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors">Code</button>
        <div className="w-px h-5 bg-gray-700" />
        <FieldOverlay onImageSelect={handlePresetImageSelect} />
        <button onClick={clearChain} className="text-[11px] px-2 py-0.5 bg-red-900 hover:bg-red-800 text-red-300 rounded transition-colors ml-auto">Clear</button>
      </header>

      <div className="flex-1 grid grid-cols-[260px,1fr,260px] lg:grid-cols-[300px,1fr,300px] overflow-hidden">
        <div className="bg-gray-900 border-r border-gray-800 flex flex-col min-h-0">
          <div className="flex flex-col flex-1 min-h-0 border-b border-gray-800">
            <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">Poses ({activeChain.poses.length})</div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {!activeChain.startingPoseId ? <div className="text-xs text-gray-500 font-mono p-2">Set the starting pose first.</div> : (
                      <ul className="space-y-2 list-none">
                  {startPose && (
                    <li key={startPose.id} onClick={(e) => handlePoseClick(startPose.id, e)} className={`p-2 border rounded cursor-pointer transition-colors ${selectedPoseId === startPose.id ? 'bg-blue-900/30 border-blue-500' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                            <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: startPose.color || '#3366cc' }} /><div className="text-xs font-mono text-teal-300 font-semibold truncate">{startPose.name} (Starting Pose)</div></div></div>
                        <button onClick={(e) => { e.stopPropagation(); deletePose(startPose.id); }} className="text-xs text-red-400">✕</button>
                            </div>
                          </li>
                        )}
                  {additionalPoses.map((pose) => (
                    <li key={pose.id} onClick={(e) => handlePoseClick(pose.id, e)} className={`p-2 border rounded cursor-pointer transition-colors ${selectedPoseId === pose.id ? 'bg-blue-900/30 border-blue-500' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                              <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pose.color || '#3366cc' }} /><div className="text-xs font-mono text-white font-semibold truncate">{pose.name}</div></div></div>
                        <button onClick={(e) => { e.stopPropagation(); deletePose(pose.id); }} className="text-xs text-red-400">✕</button>
                              </div>
                            </li>
                  ))}
                      </ul>
                    )}
                  </div>
            <div className="p-3 border-t border-gray-800 bg-gray-900/50">
              <div className="flex gap-2 items-center">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[9px] text-blue-400 font-mono flex-shrink-0">Ctrl+Click</kbd>
                <span className="text-[10px] text-gray-400 leading-tight">Create a new independent pose</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col flex-1 min-h-0">
             <div className="p-3 border-b border-gray-800 text-xs font-semibold text-white bg-gray-900">Paths ({activeChain.paths.length})</div>
             <div className="flex-1 overflow-y-auto p-2">
               <ul className="space-y-2 list-none">
                {activeChain.paths.map((path) => {
                  const startPose = activeChain.poses.find(w => w.id === path.startPoseId);
                  const endPose = activeChain.poses.find(w => w.id === path.endPoseId);
                  return (
                    <li key={path.id} onClick={() => handlePathClick(path.id)} className={`p-2 border rounded cursor-pointer transition-colors ${selectedPathId === path.id ? 'bg-blue-900/30 border-blue-500' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0"><div className="text-xs font-mono text-gray-300">{startPose?.name || '?'} → {endPose?.name || '?'}</div></div>
                        <button onClick={(e) => { e.stopPropagation(); deletePath(path.id); }} className="text-xs text-red-400">✕</button>
                      </div>
                    </li>
                  );
                })}
               </ul>
             </div>
             <div className="p-3 border-t border-gray-800 bg-gray-900/50">
               <div className="flex gap-2 items-center">
                 <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[9px] text-teal-400 font-mono flex-shrink-0">Shift+Click</kbd>
                 <span className="text-[10px] text-gray-400 leading-tight">Create path to an existing pose or create a new pose with a path to it</span>
               </div>
             </div>
          </div>
        </div>

        <div ref={containerRef} className="bg-gray-950 flex justify-center items-center overflow-hidden p-4">
          <Field 
            pathChain={activeChain} 
            onPathChainChange={updateActiveChain} 
            onSelectedPoseChange={handlePoseClick}
            selectedPoseId={selectedPoseId} 
            selectedPathId={selectedPathId} 
            onSelectedPathChange={handlePathClick}
            onControlPointDragMove={handleControlPointDragMove}
            onPoseHeadingChange={handlePoseHeadingChange}
            mapImage={mapImage}
            onCreatePose={(x: number, y: number, createPath: boolean) => addPoseAtPosition(x, y, createPath)}
            onPathCreate={(endPoseId: string) => createPath(endPoseId)}
            canvasSize={canvasSize}
            />
                    </div>
        <div className="bg-gray-900 border-l border-gray-800 overflow-y-auto">
          {selectedPose && (
            <div className="p-4 space-y-4">
              <div className="text-xs font-semibold text-white uppercase tracking-wider">Pose Properties</div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Name:</label>
                <input type="text" value={selectedPose.name} onChange={(e) => updatePose(selectedPose.id, { name: e.target.value })} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">X:</label>
                  <input type="text" value={selectedPose.x} onChange={(e) => { const val = e.target.value; if (val === '' || val === '-' || !isNaN(parseFloat(val))) updatePose(selectedPose.id, { x: val === '' ? 0 : val === '-' ? 0 : parseFloat(val) }); }} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">Y:</label>
                  <input type="text" value={selectedPose.y} onChange={(e) => { const val = e.target.value; if (val === '' || val === '-' || !isNaN(parseFloat(val))) updatePose(selectedPose.id, { y: val === '' ? 0 : val === '-' ? 0 : parseFloat(val) }); }} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Heading (deg):</label>
                <input type="text" value={selectedPose.heading ?? 0} onChange={(e) => { const val = e.target.value; if (val === '' || val === '-' || !isNaN(parseFloat(val))) { let num = val === '' ? 0 : val === '-' ? 0 : parseFloat(val); if (!isNaN(num) && val !== '-') num = (num % 360 + 360) % 360; updatePose(selectedPose.id, { heading: num }); } }} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                )}
          {selectedPath && (
            <div className="p-4 space-y-4">
              <div className="text-xs font-semibold text-white uppercase tracking-wider">Path Properties</div>
              <div>
                <label className="text-xs text-gray-400 font-mono block mb-1">Path Name</label>
                <input type="text" value={selectedPath.name || ''} onChange={(e) => updatePath(selectedPathId!, { name: e.target.value || undefined })} placeholder={`path${activeChain.paths.indexOf(selectedPath) + 1}`} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
              </div>
              <div className="border-t border-gray-800" />
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Path Type</label>
                <select value={selectedPath.type || 'line'} onChange={(e) => { const newType = e.target.value as any; const updates: any = { type: newType }; if (newType === 'curve' && !selectedPath.controlPoint1) { const startPose = activeChain.poses.find(w => w.id === selectedPath.startPoseId); const endPose = activeChain.poses.find(w => w.id === selectedPath.endPoseId); const mid1 = { x: startPose!.x * 0.7 + endPose!.x * 0.3, y: startPose!.y * 0.7 + endPose!.y * 0.3 }; const mid2 = { x: startPose!.x * 0.3 + endPose!.x * 0.7, y: startPose!.y * 0.3 + endPose!.y * 0.7 }; updates.controlPoint1 = mid1; updates.controlPoint2 = mid2; } updatePath(selectedPathId!, updates); }} className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"><option value="line">Bezier Line</option><option value="curve">Bezier Curve</option></select>
                        </div>
              {selectedPath.type === 'curve' && selectedPath.controlPoint1 && selectedPath.controlPoint2 && (
                <div className="space-y-3 pt-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Control Points</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase">P1 X</label>
                      <input type="number" step="0.1" value={selectedPath.controlPoint1.x.toFixed(1)} onChange={(e) => updatePath(selectedPathId!, { controlPoint1: { ...selectedPath.controlPoint1!, x: parseFloat(e.target.value) || 0 } })} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase">P1 Y</label>
                      <input type="number" step="0.1" value={selectedPath.controlPoint1.y.toFixed(1)} onChange={(e) => updatePath(selectedPathId!, { controlPoint1: { ...selectedPath.controlPoint1!, y: parseFloat(e.target.value) || 0 } })} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase">P2 X</label>
                      <input type="number" step="0.1" value={selectedPath.controlPoint2.x.toFixed(1)} onChange={(e) => updatePath(selectedPathId!, { controlPoint2: { ...selectedPath.controlPoint2!, x: parseFloat(e.target.value) || 0 } })} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 uppercase">P2 Y</label>
                      <input type="number" step="0.1" value={selectedPath.controlPoint2.y.toFixed(1)} onChange={(e) => updatePath(selectedPathId!, { controlPoint2: { ...selectedPath.controlPoint2!, y: parseFloat(e.target.value) || 0 } })} className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                </div>
              )}
              <div className="border-t border-gray-800" />
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Heading Interpolation</label>
                <select value={selectedPath.headingInterpolation || 'tangent'} onChange={(e) => updatePath(selectedPathId!, { headingInterpolation: e.target.value as any })} className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none"><option value="tangent">Tangent</option><option value="constant">Constant</option><option value="linear">Linear</option></select>
                        </div>
                        {selectedPath.headingInterpolation === 'constant' && (
                          <div>
                            <label className="text-xs text-gray-400 font-mono block mb-1">Constant Heading (deg)</label>
                  <input type="text" value={selectedPath.constantHeading ?? 0} onChange={(e) => { const val = e.target.value; if (val === '' || val === '-' || !isNaN(parseFloat(val))) { let num = val === '' ? 0 : val === '-' ? 0 : parseFloat(val); if (!isNaN(num) && val !== '-') num = (num % 360 + 360) % 360; updatePath(selectedPathId!, { constantHeading: num }); } }} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" />
                          </div>
                        )}
                        {selectedPath.headingInterpolation === 'linear' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Start Heading (deg)</label>
                    <input type="text" value={selectedPath.startHeadingOverride ?? ''} placeholder={`Auto (${activeChain.poses.find(w => w.id === selectedPath.startPoseId)?.heading?.toFixed(1) ?? '0.0'})`} onChange={(e) => { const val = e.target.value; if (val === '' || val === '-' || !isNaN(parseFloat(val))) { if (val === '') updatePath(selectedPathId!, { startHeadingOverride: undefined }); else { let num = val === '-' ? 0 : parseFloat(val); if (!isNaN(num) && val !== '-') num = (num % 360 + 360) % 360; updatePath(selectedPathId!, { startHeadingOverride: num }); } } }} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">End Heading (deg)</label>
                    <input type="text" value={selectedPath.endHeadingOverride ?? ''} placeholder={`Auto (${activeChain.poses.find(w => w.id === selectedPath.endPoseId)?.heading?.toFixed(1) ?? '0.0'})`} onChange={(e) => { const val = e.target.value; if (val === '' || val === '-' || !isNaN(parseFloat(val))) { if (val === '') updatePath(selectedPathId!, { endHeadingOverride: undefined }); else { let num = val === '-' ? 0 : parseFloat(val); if (!isNaN(num) && val !== '-') num = (num % 360 + 360) % 360; updatePath(selectedPathId!, { endHeadingOverride: num }); } } }} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" />
                  </div>
                </div>
              )}
              <div className="border-t border-gray-700" />
              <div>
                <label className="text-xs text-gray-400 font-mono block mb-1">Deceleration</label>
                <select value={selectedPath.deceleration || 'default'} onChange={(e) => updatePath(selectedPathId!, { deceleration: e.target.value as any })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none">
                  <option value="default">Default Deceleration</option>
                  <option value="global">Global Deceleration</option>
                  <option value="none">No Deceleration</option>
                </select>
              </div>
              {selectedPath.deceleration !== 'none' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-400 font-mono block mb-1">Braking Strength (0.1-5.0)</label>
                    <input type="number" step="0.1" min="0.1" max="5.0" value={selectedPath.brakingStrength || ''} onChange={(e) => updatePath(selectedPathId!, { brakingStrength: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" />
                  </div>
                  {selectedPath.deceleration === 'global' && (
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Braking Start (0.0-1.0)</label>
                      <input type="number" step="0.01" min="0" max="1" value={selectedPath.brakingStart !== undefined ? selectedPath.brakingStart : ''} onChange={(e) => updatePath(selectedPathId!, { brakingStart: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" />
                    </div>
                  )}
                </div>
              )}
              <div className="border-t border-gray-700 pt-4">
                <div className="text-xs text-gray-300 font-semibold mb-3 uppercase tracking-wider">Constraints</div>
                <div className="space-y-3">
                  <div><label className="text-xs text-gray-400 font-mono block mb-1">Timeout (ms)</label><input type="number" value={selectedPath.timeoutConstraint || ''} onChange={(e) => updatePath(selectedPathId!, { timeoutConstraint: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="Optional" className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-mono block mb-1">T-Value (0.0-1.0)</label><input type="number" step="0.01" min="0" max="1" value={selectedPath.tValueConstraint !== undefined ? selectedPath.tValueConstraint : ''} onChange={(e) => updatePath(selectedPathId!, { tValueConstraint: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="Optional" className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-mono block mb-1">Velocity (in/s)</label><input type="number" value={selectedPath.velocityConstraint || ''} onChange={(e) => updatePath(selectedPathId!, { velocityConstraint: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="Optional" className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-mono block mb-1">Translational (in)</label><input type="number" step="0.1" value={selectedPath.translationalConstraint || ''} onChange={(e) => updatePath(selectedPathId!, { translationalConstraint: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="Optional" className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-mono block mb-1">Heading Constraint (deg)</label><input type="number" step="0.1" value={selectedPath.headingConstraint || ''} onChange={(e) => updatePath(selectedPathId!, { headingConstraint: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="Optional" className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:border-blue-500 outline-none" /></div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Callbacks</div>
                  <button 
                    onClick={() => {
                      const newCallback = { id: `cb-${Date.now()}`, action: 'Action', parametricPercent: 0.5 };
                      updatePath(selectedPathId!, { callbacks: [...(selectedPath.callbacks || []), newCallback] });
                    }}
                    className="text-[10px] px-2 py-0.5 bg-blue-900/50 hover:bg-blue-800 text-blue-300 rounded border border-blue-800/50 transition-colors"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-4">
                  {(selectedPath.callbacks || []).map((cb, idx) => (
                    <div key={cb.id} className="p-2 bg-gray-800/50 border border-gray-700 rounded space-y-2 relative group">
                      <button 
                        onClick={() => updatePath(selectedPathId!, { callbacks: selectedPath.callbacks?.filter(c => c.id !== cb.id) })}
                        className="absolute top-1 right-1 text-gray-500 hover:text-red-400 text-[10px] p-1"
                      >
                        ✕
                      </button>
                      <div className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                        Callback #{idx + 1}
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 uppercase block mb-1">Action Description</label>
                        <input 
                          type="text" 
                          value={cb.action} 
                          onChange={(e) => {
                            const newCallbacks = [...(selectedPath.callbacks || [])];
                            newCallbacks[idx] = { ...cb, action: e.target.value };
                            updatePath(selectedPathId!, { callbacks: newCallbacks });
                          }} 
                          className="w-full text-[11px] px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                          placeholder="e.g. lift up"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-400 uppercase block mb-1">Type</label>
                          <select 
                            value={cb.parametricPercent !== undefined ? 'parametric' : cb.temporalMillis !== undefined ? 'temporal' : 'pose'} 
                            onChange={(e) => {
                              const type = e.target.value;
                              const newCallbacks = [...(selectedPath.callbacks || [])];
                              const base = { id: cb.id, action: cb.action, customCallbackCode: cb.customCallbackCode };
                              if (type === 'parametric') newCallbacks[idx] = { ...base, parametricPercent: 0.5 };
                              else if (type === 'temporal') newCallbacks[idx] = { ...base, temporalMillis: 500 };
                              else newCallbacks[idx] = { ...base, poseCallback: { x: 0, y: 0 } };
                              updatePath(selectedPathId!, { callbacks: newCallbacks });
                            }}
                            className="w-full text-[11px] px-1 py-1 bg-gray-900 border border-gray-700 rounded text-white outline-none"
                          >
                            <option value="parametric">Parametric</option>
                            <option value="temporal">Temporal</option>
                            <option value="pose">Pose-based</option>
                          </select>
                        </div>
                        <div>
                          {cb.parametricPercent !== undefined && (
                            <>
                              <label className="text-[9px] text-gray-400 uppercase block mb-1">Percent (0-1)</label>
                              <input 
                                type="number" step="0.05" min="0" max="1" 
                                value={cb.parametricPercent} 
                                onChange={(e) => {
                                  const newCallbacks = [...(selectedPath.callbacks || [])];
                                  newCallbacks[idx] = { ...cb, parametricPercent: parseFloat(e.target.value) || 0 };
                                  updatePath(selectedPathId!, { callbacks: newCallbacks });
                                }}
                                className="w-full text-[11px] px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                              />
                            </>
                          )}
                          {cb.temporalMillis !== undefined && (
                            <>
                              <label className="text-[9px] text-gray-400 uppercase block mb-1">Delay (ms)</label>
                              <input 
                                type="number" 
                                value={cb.temporalMillis} 
                                onChange={(e) => {
                                  const newCallbacks = [...(selectedPath.callbacks || [])];
                                  newCallbacks[idx] = { ...cb, temporalMillis: parseInt(e.target.value) || 0 };
                                  updatePath(selectedPathId!, { callbacks: newCallbacks });
                                }}
                                className="w-full text-[11px] px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                              />
                            </>
                          )}
                          {cb.poseCallback && (
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                <div className="flex-1">
                                  <label className="text-[9px] text-gray-400 uppercase block mb-1">X</label>
                                  <input 
                                    type="number" 
                                    value={cb.poseCallback.x} 
                                    onChange={(e) => {
                                      const newCallbacks = [...(selectedPath.callbacks || [])];
                                      newCallbacks[idx] = { ...cb, poseCallback: { ...cb.poseCallback!, x: parseFloat(e.target.value) || 0 } };
                                      updatePath(selectedPathId!, { callbacks: newCallbacks });
                                    }}
                                    className="w-full text-[11px] px-1 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[9px] text-gray-400 uppercase block mb-1">Y</label>
                                  <input 
                                    type="number" 
                                    value={cb.poseCallback.y} 
                                    onChange={(e) => {
                                      const newCallbacks = [...(selectedPath.callbacks || [])];
                                      newCallbacks[idx] = { ...cb, poseCallback: { ...cb.poseCallback!, y: parseFloat(e.target.value) || 0 } };
                                      updatePath(selectedPathId!, { callbacks: newCallbacks });
                                    }}
                                    className="w-full text-[11px] px-1 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <div className="flex-1">
                                  <label className="text-[9px] text-gray-400 uppercase block mb-1">Heading</label>
                                  <input 
                                    type="number" 
                                    value={cb.poseCallback.heading || 0} 
                                    onChange={(e) => {
                                      const newCallbacks = [...(selectedPath.callbacks || [])];
                                      newCallbacks[idx] = { ...cb, poseCallback: { ...cb.poseCallback!, heading: parseFloat(e.target.value) || 0 } };
                                      updatePath(selectedPathId!, { callbacks: newCallbacks });
                                    }}
                                    className="w-full text-[11px] px-1 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[9px] text-gray-400 uppercase block mb-1">t-Guess</label>
                                  <input 
                                    type="number" step="0.1" min="0" max="1"
                                    value={cb.poseGuess || ''} 
                                    placeholder="Opt"
                                    onChange={(e) => {
                                      const newCallbacks = [...(selectedPath.callbacks || [])];
                                      newCallbacks[idx] = { ...cb, poseGuess: e.target.value ? parseFloat(e.target.value) : undefined };
                                      updatePath(selectedPathId!, { callbacks: newCallbacks });
                                    }}
                                    className="w-full text-[11px] px-1 py-1 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 uppercase block mb-1">Custom Action Java Code (Optional)</label>
                        <textarea 
                          value={cb.customCallbackCode || ''} 
                          onChange={(e) => {
                            const newCallbacks = [...(selectedPath.callbacks || [])];
                            newCallbacks[idx] = { ...cb, customCallbackCode: e.target.value };
                            updatePath(selectedPathId!, { callbacks: newCallbacks });
                          }} 
                          className="w-full text-[10px] h-12 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-300 focus:border-blue-500 outline-none font-mono"
                          placeholder="() -> { ... }"
                        />
                      </div>
                    </div>
                  ))}
                  {(!selectedPath.callbacks || selectedPath.callbacks.length === 0) && (
                    <div className="text-[10px] text-gray-500 italic text-center py-2">No callbacks defined for this path.</div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
        
        {showCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-lg">
                <h3 className="text-sm font-semibold text-white">Generated Java Code</h3>
                <button onClick={() => setShowCode(false)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors">Close</button>
              </div>
              <div className="p-4 overflow-y-auto"><CodeGenerator pathChain={activeChain} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
