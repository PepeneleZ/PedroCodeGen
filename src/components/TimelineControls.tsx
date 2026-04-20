interface TimelineControlsProps {
  currentTime: number;
  maxTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onTimeChange: (time: number) => void;
  onReset: () => void;
}

export const TimelineControls = ({
  currentTime,
  maxTime,
  isPlaying,
  onPlayPause,
  onTimeChange,
  onReset,
}: TimelineControlsProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onPlayPause}
          className={`text-sm px-3 py-1 rounded transition-colors ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={onReset}
          className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          ⏮
        </button>
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={maxTime}
            value={currentTime}
            onChange={(e) => onTimeChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="text-xs text-gray-300 font-mono w-16 text-right">
          {formatTime(currentTime)} / {formatTime(maxTime)}
        </div>
      </div>
    </div>
  );
};
