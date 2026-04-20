import { PathChain } from '../types';

interface DecelerationControlsProps {
  pathChain: PathChain;
  onPathChainChange: (pathChain: PathChain) => void;
}

export const DecelerationControls = ({
  pathChain,
  onPathChainChange,
}: DecelerationControlsProps) => {
  const updatePathChain = (updates: Partial<PathChain>) => {
    onPathChainChange({
      ...pathChain,
      ...updates,
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-700">
      <h4 className="text-sm font-semibold text-white">DECELERATION SETTINGS</h4>

      {/* Deceleration Mode */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-mono">DECELERATION MODE</label>
        <div className="flex gap-2">
          <button
            onClick={() => updatePathChain({
              globalDeceleration: false,
              noDeceleration: false
            })}
            className={`flex-1 px-3 py-2 rounded text-sm font-mono transition-colors ${
              !pathChain.globalDeceleration && !pathChain.noDeceleration
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Default
          </button>
          <button
            onClick={() => updatePathChain({
              globalDeceleration: true,
              noDeceleration: false
            })}
            className={`flex-1 px-3 py-2 rounded text-sm font-mono transition-colors ${
              pathChain.globalDeceleration && !pathChain.noDeceleration
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => updatePathChain({
              globalDeceleration: false,
              noDeceleration: true
            })}
            className={`flex-1 px-3 py-2 rounded text-sm font-mono transition-colors ${
              pathChain.noDeceleration
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            None
          </button>
        </div>
      </div>

      {/* Global Braking Strength */}
      {(pathChain.globalDeceleration || (!pathChain.globalDeceleration && !pathChain.noDeceleration)) && (
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-mono">
            BRAKING STRENGTH {pathChain.globalBrakingStrength ? `: ${pathChain.globalBrakingStrength.toFixed(1)}` : '(default)'}
          </label>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={pathChain.globalBrakingStrength ?? 1.0}
            onChange={(e) => updatePathChain({ globalBrakingStrength: parseFloat(e.target.value) })}
            className="w-full accent-yellow-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1 (gentle)</span>
            <span>5.0 (aggressive)</span>
          </div>
        </div>
      )}

      {/* Braking Start (only for global deceleration) */}
      {pathChain.globalDeceleration && (
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-mono">
            BRAKING START {pathChain.brakingStart !== undefined ? `: ${pathChain.brakingStart.toFixed(2)}` : '(default)'}
          </label>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={pathChain.brakingStart ?? 0.8}
            onChange={(e) => updatePathChain({ brakingStart: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.0 (early)</span>
            <span>1.0 (late)</span>
          </div>
        </div>
      )}
    </div>
  );
};