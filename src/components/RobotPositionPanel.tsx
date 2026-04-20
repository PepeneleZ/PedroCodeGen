interface RobotPositionPanelProps {
  x: number;
  y: number;
  heading: number;
  onUpdate: (x: number, y: number, heading: number) => void;
}

export const RobotPositionPanel = ({ x, y, heading, onUpdate }: RobotPositionPanelProps) => {
  return (
    <div className="border border-gray-700 rounded-lg bg-gray-850 overflow-hidden">
      <div className="px-3 py-2 bg-gray-900">
        <span className="text-xs font-semibold text-white">Current Robot Position</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">X:</label>
            <input
              type="number"
              value={x.toFixed(3)}
              onChange={(e) => onUpdate(parseFloat(e.target.value) || x, y, heading)}
              className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Y:</label>
            <input
              type="number"
              value={y.toFixed(3)}
              onChange={(e) => onUpdate(x, parseFloat(e.target.value) || y, heading)}
              className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">Heading: {heading}°</label>
          <input
            type="number"
            value={heading}
            onChange={(e) => onUpdate(x, y, parseFloat(e.target.value) || heading)}
            className="w-full text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};
