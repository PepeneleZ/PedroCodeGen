interface StartingPointPanelProps {
  x: number;
  y: number;
  onUpdate: (x: number, y: number) => void;
  onSync?: () => void;
}

export const StartingPointPanel = ({ x, y, onUpdate, onSync }: StartingPointPanelProps) => {
  return (
    <div className="border border-gray-700 rounded-lg bg-gray-850 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
        <span className="text-xs font-semibold text-white">Starting Point</span>
        <button
          onClick={onSync}
          title="Sync with current robot position"
          className="text-xs px-2 py-0.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors"
        >
          ⇄
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">X:</label>
            <input
              type="number"
              value={x}
              onChange={(e) => onUpdate(parseFloat(e.target.value) || x, y)}
              className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Y:</label>
            <input
              type="number"
              value={y}
              onChange={(e) => onUpdate(x, parseFloat(e.target.value) || y)}
              className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
