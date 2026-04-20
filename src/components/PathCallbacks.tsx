import { useState } from 'react';
import { PathCallback, PathChain, Path, ACTIONS } from '../types';

interface PathCallbacksProps {
  path: Path;
  pathChain: PathChain;
  onPathChainChange: (pathChain: PathChain) => void;
}

export const PathCallbacks = ({
  path,
  pathChain,
  onPathChainChange,
}: PathCallbacksProps) => {
  const [showAddCallback, setShowAddCallback] = useState(false);
  const [newCallbackType, setNewCallbackType] = useState<PathCallback['type']>('parametric');

  const updatePath = (updatedPath: Path) => {
    const updatedPaths = pathChain.paths.map((p) =>
      p.id === path.id ? updatedPath : p
    );
    onPathChainChange({
      ...pathChain,
      paths: updatedPaths,
    });
  };

  const addCallback = () => {
    const newCallback: PathCallback = {
      id: `callback-${Date.now()}`,
      type: newCallbackType,
      action: 'none',
      maxExecutions: 1,
    };

    // Set defaults based on type
    switch (newCallbackType) {
      case 'parametric':
        newCallback.parametricPercent = 0.5;
        break;
      case 'temporal':
        newCallback.temporalMillis = 1000;
        break;
      case 'pose':
        newCallback.poseCallback = { x: 0, y: 0, heading: 0 };
        newCallback.poseGuess = 0.5;
        break;
    }

    const updatedPath = {
      ...path,
      callbacks: [...(path.callbacks || []), newCallback],
    };

    updatePath(updatedPath);
    setShowAddCallback(false);
  };

  const updateCallback = (callbackId: string, updates: Partial<PathCallback>) => {
    const updatedCallbacks = (path.callbacks || []).map((cb) =>
      cb.id === callbackId ? { ...cb, ...updates } : cb
    );

    updatePath({
      ...path,
      callbacks: updatedCallbacks,
    });
  };

  const deleteCallback = (callbackId: string) => {
    const updatedCallbacks = (path.callbacks || []).filter((cb) => cb.id !== callbackId);
    updatePath({
      ...path,
      callbacks: updatedCallbacks,
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-700">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-white">PATH CALLBACKS</h4>
        <button
          onClick={() => setShowAddCallback(!showAddCallback)}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-mono"
        >
          + Add
        </button>
      </div>

      {/* Add Callback Form */}
      {showAddCallback && (
        <div className="space-y-2 p-3 bg-gray-800 rounded border border-gray-600">
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-400 font-mono">TYPE:</label>
            <select
              value={newCallbackType}
              onChange={(e) => setNewCallbackType(e.target.value as PathCallback['type'])}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
            >
              <option value="parametric">Parametric</option>
              <option value="temporal">Temporal</option>
              <option value="pose">Pose</option>
              <option value="custom">Custom</option>
            </select>
            <button
              onClick={addCallback}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddCallback(false)}
              className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Existing Callbacks */}
      <div className="space-y-2">
        {(path.callbacks || []).map((callback) => (
          <div key={callback.id} className="p-3 bg-gray-800 rounded border border-gray-600">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-mono text-blue-400 uppercase">{callback.type} Callback</span>
              <button
                onClick={() => deleteCallback(callback.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Callback-specific fields */}
            {callback.type === 'parametric' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Path Completion %:</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={callback.parametricPercent || 0.5}
                  onChange={(e) => updateCallback(callback.id, { parametricPercent: parseFloat(e.target.value) })}
                  className="w-full accent-green-500"
                />
                <div className="text-xs text-gray-500 text-center">
                  {(callback.parametricPercent || 0.5) * 100}%
                </div>
              </div>
            )}

            {callback.type === 'temporal' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Delay (ms):</label>
                <input
                  type="number"
                  value={callback.temporalMillis || 1000}
                  onChange={(e) => updateCallback(callback.id, { temporalMillis: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  min="0"
                  step="100"
                />
              </div>
            )}

            {callback.type === 'pose' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Trigger Pose:</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">X:</label>
                    <input
                      type="number"
                      value={callback.poseCallback?.x || 0}
                      onChange={(e) => updateCallback(callback.id, {
                        poseCallback: { ...(callback.poseCallback || { x: 0, y: 0, heading: 0 }), x: parseFloat(e.target.value) }
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Y:</label>
                    <input
                      type="number"
                      value={callback.poseCallback?.y || 0}
                      onChange={(e) => updateCallback(callback.id, {
                        poseCallback: { ...(callback.poseCallback || { x: 0, y: 0, heading: 0 }), y: parseFloat(e.target.value) }
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Heading:</label>
                    <input
                      type="number"
                      value={callback.poseCallback?.heading || 0}
                      onChange={(e) => updateCallback(callback.id, {
                        poseCallback: { ...(callback.poseCallback || { x: 0, y: 0, heading: 0 }), heading: parseFloat(e.target.value) }
                      })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      step="5"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-xs text-gray-400">T-Value Guess:</label>
                  <input
                    type="number"
                    value={callback.poseGuess || 0.5}
                    onChange={(e) => updateCallback(callback.id, { poseGuess: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              </div>
            )}

            {callback.type === 'custom' && (
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Custom Code:</label>
                <textarea
                  value={callback.customCallbackCode || ''}
                  onChange={(e) => updateCallback(callback.id, { customCallbackCode: e.target.value })}
                  placeholder="() -> { /* custom callback code */ }"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm font-mono"
                  rows={3}
                />
              </div>
            )}

            {/* Common fields */}
            <div className="space-y-2 mt-3 pt-2 border-t border-gray-600">
              <label className="text-xs text-gray-400">Action:</label>
              <select
                value={callback.action}
                onChange={(e) => updateCallback(callback.id, { action: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
              >
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>

              {callback.action === 'none' && (
                <input
                  type="text"
                  value={callback.customCallbackCode || ''}
                  onChange={(e) => updateCallback(callback.id, { customCallbackCode: e.target.value })}
                  placeholder="customAction()"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm font-mono"
                />
              )}

              <div>
                <label className="text-xs text-gray-400">Max Executions:</label>
                <input
                  type="number"
                  value={callback.maxExecutions || 1}
                  onChange={(e) => updateCallback(callback.id, { maxExecutions: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  min="-1"
                  placeholder="-1 for unlimited"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};