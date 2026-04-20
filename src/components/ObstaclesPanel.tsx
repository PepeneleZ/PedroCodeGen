import { useState } from 'react';

interface Obstacle {
  id: string;
  name: string;
  color: string;
}

interface ObstaclesPanelProps {
  obstacles: Obstacle[];
  onObstacleAdd: (obstacle: Obstacle) => void;
  onObstacleRemove: (id: string) => void;
  onObstacleUpdate: (id: string, obstacle: Obstacle) => void;
}

export const ObstaclesPanel = ({ obstacles, onObstacleAdd, onObstacleRemove, onObstacleUpdate }: ObstaclesPanelProps) => {
  const [expanded, setExpanded] = useState(true);

  const addObstacle = () => {
    const newObstacle: Obstacle = {
      id: `obstacle-${Date.now()}`,
      name: `Obstacle ${obstacles.length + 1}`,
      color: '#ef4444',
    };
    onObstacleAdd(newObstacle);
  };

  const colorOptions = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
  ];

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-850 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-900 cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
          <span className="text-xs font-semibold text-white">Obstacles ({obstacles.length})</span>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          {obstacles.map((obstacle, index) => (
            <div key={obstacle.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Obstacle {index + 1}</span>
                <button
                  onClick={() => onObstacleRemove(obstacle.id)}
                  className="text-xs px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={obstacle.name}
                onChange={(e) => onObstacleUpdate(obstacle.id, { ...obstacle, name: e.target.value })}
                className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                placeholder="Obstacle name"
              />
              <select
                value={obstacle.color}
                onChange={(e) => onObstacleUpdate(obstacle.id, { ...obstacle, color: e.target.value })}
                className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
              >
                {colorOptions.map(color => (
                  <option key={color.value} value={color.value}>{color.name}</option>
                ))}
              </select>
            </div>
          ))}
          <button
            onClick={addObstacle}
            className="w-full text-xs px-2 py-2 text-red-400 border border-red-600/50 hover:bg-red-900/20 hover:border-red-500 rounded transition-colors"
          >
            + Add Obstacle
          </button>
        </div>
      )}
    </div>
  );
};
