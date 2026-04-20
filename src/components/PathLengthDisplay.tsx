import { useMemo } from 'react';
import { PathChain } from '../types';
import { distance } from '../utils/bezier';

interface PathLengthDisplayProps {
  pathChain: PathChain;
}

export const PathLengthDisplay = ({ pathChain }: PathLengthDisplayProps) => {
  const stats = useMemo(() => {
    const waypoints = pathChain.waypoints;
    const paths = pathChain.paths;
    
    if (waypoints.length < 2 || paths.length === 0) return null;

    let totalLength = 0;
    const segments: { length: number; from: string; to: string }[] = [];

    // Calculate length for each path
    paths.forEach((path) => {
      const startWp = waypoints.find(w => w.id === path.startWaypointId);
      const endWp = waypoints.find(w => w.id === path.endWaypointId);

      if (!startWp || !endWp) return;

      const segmentLength = distance(startWp, endWp);
      totalLength += segmentLength;
      segments.push({
        length: segmentLength,
        from: startWp.name || startWp.id.slice(0, 8),
        to: endWp.name || endWp.id.slice(0, 8),
      });
    });

    return { totalLength, segments };
  }, [pathChain]);

  if (!stats) {
    return (
      <div className="text-xs text-gray-500 font-mono">
        Add waypoints and paths to see distance
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-400 font-mono border-b border-gray-700 pb-1">
        PATH DISTANCE
      </div>
      <div className="text-sm text-white font-mono">
        Total: <span className="text-blue-400">{stats.totalLength.toFixed(1)}"</span>
      </div>
      {stats.segments.map((seg, idx) => (
        <div key={idx} className="text-xs text-gray-500 font-mono flex justify-between">
          <span>{seg.from}→{seg.to}</span>
          <span className="text-gray-400">{seg.length.toFixed(1)}"</span>
        </div>
      ))}
    </div>
  );
};
